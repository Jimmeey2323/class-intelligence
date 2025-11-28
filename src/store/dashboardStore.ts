import { create } from 'zustand';
import { DashboardState, SessionData, FilterState, ViewMode, GroupBy, AdditionalView, ColumnWidthSettings, RankingMetric, CheckinData } from '../types';
import DataProcessorWorker from '../workers/dataProcessor.worker?worker';

// Initialize worker
const worker = new DataProcessorWorker();

// ============ PERFORMANCE: Pre-computed lookup tables ============
interface DataIndices {
  sessionsByTrainer: Map<string, SessionData[]>;
  sessionsByLocation: Map<string, SessionData[]>;
  sessionsByClass: Map<string, SessionData[]>;
  sessionsByDayTimeLocation: Map<string, SessionData[]>;
  uniqueTrainers: string[];
  uniqueLocations: string[];
  uniqueClasses: string[];
  uniqueClassTypes: string[];
}

let cachedIndices: DataIndices | null = null;
let lastRawDataLength = 0;

// Build lookup indices for O(1) access instead of O(n) filtering
const buildDataIndices = (rawData: SessionData[]): DataIndices => {
  // Return cached if data hasn't changed
  if (cachedIndices && rawData.length === lastRawDataLength) {
    return cachedIndices;
  }
  
  const sessionsByTrainer = new Map<string, SessionData[]>();
  const sessionsByLocation = new Map<string, SessionData[]>();
  const sessionsByClass = new Map<string, SessionData[]>();
  const sessionsByDayTimeLocation = new Map<string, SessionData[]>();
  const trainersSet = new Set<string>();
  const locationsSet = new Set<string>();
  const classesSet = new Set<string>();
  const classTypesSet = new Set<string>();
  
  // Single pass through data to build all indices
  for (const session of rawData) {
    // Trainer index
    if (session.Trainer) {
      trainersSet.add(session.Trainer);
      if (!sessionsByTrainer.has(session.Trainer)) {
        sessionsByTrainer.set(session.Trainer, []);
      }
      sessionsByTrainer.get(session.Trainer)!.push(session);
    }
    
    // Location index
    if (session.Location) {
      locationsSet.add(session.Location);
      if (!sessionsByLocation.has(session.Location)) {
        sessionsByLocation.set(session.Location, []);
      }
      sessionsByLocation.get(session.Location)!.push(session);
    }
    
    // Class index
    if (session.Class) {
      classesSet.add(session.Class);
      if (!sessionsByClass.has(session.Class)) {
        sessionsByClass.set(session.Class, []);
      }
      sessionsByClass.get(session.Class)!.push(session);
    }
    
    // Class type index
    if (session.Type) {
      classTypesSet.add(session.Type);
    }
    
    // Composite key for day+time+location lookups
    const key = `${session.Day}|${session.Time}|${session.Location}`;
    if (!sessionsByDayTimeLocation.has(key)) {
      sessionsByDayTimeLocation.set(key, []);
    }
    sessionsByDayTimeLocation.get(key)!.push(session);
  }
  
  cachedIndices = {
    sessionsByTrainer,
    sessionsByLocation,
    sessionsByClass,
    sessionsByDayTimeLocation,
    uniqueTrainers: Array.from(trainersSet).sort(),
    uniqueLocations: Array.from(locationsSet).sort(),
    uniqueClasses: Array.from(classesSet).sort(),
    uniqueClassTypes: Array.from(classTypesSet).sort(),
  };
  lastRawDataLength = rawData.length;
  
  return cachedIndices;
};

// Invalidate cache when data changes
const invalidateIndicesCache = () => {
  cachedIndices = null;
  lastRawDataLength = 0;
};

// Export function to get indices (for use in components)
export const getDataIndices = (): DataIndices | null => cachedIndices;

// ============ END PERFORMANCE SECTION ============

// Load column widths from localStorage
const loadColumnWidths = (): ColumnWidthSettings => {
  try {
    const saved = localStorage.getItem('columnWidths');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

// Save column widths to localStorage
const saveColumnWidths = (widths: ColumnWidthSettings) => {
  try {
    localStorage.setItem('columnWidths', JSON.stringify(widths));
  } catch {
    console.error('Failed to save column widths');
  }
};

const getDefaultFilters = (): FilterState => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Default from 01 July 2025 to yesterday (dynamically calculated)
  const fromDate = new Date('2025-07-01');

  return {
    dateFrom: fromDate,
    dateTo: yesterday,
    trainers: [],
    locations: ['Kwality House, Kemps Corner', 'Supreme HQ, Lower Parel'],
    classTypes: [],
    classes: [],
    minCheckins: 0,
    minClasses: 0,
    searchQuery: '',
    statusFilter: 'all',
    excludeHostedClasses: true,
    includeTrainer: true,
  };
};

export const useDashboardStore = create<DashboardState>((set, get) => {
  // Listen for worker messages
  worker.onmessage = (e) => {
    const { type, payload } = e.data;
    if (type === 'DATA_PROCESSED') {
      // Build indices for fast lookups ONCE when data loads
      buildDataIndices(payload);
      set({ rawData: payload });
      // Auto-adjust date filter if needed
      const { rawData, filters } = get();
      try {
        const minDate = rawData.reduce((min, s) => {
          const d = new Date(s.Date);
          return d < min ? d : min;
        }, new Date(8640000000000000));
        const maxDate = rawData.reduce((max, s) => {
          const d = new Date(s.Date);
          return d > max ? d : max;
        }, new Date(0));
        
        if (rawData.length > 0) {
          const currentlyInRange = rawData.some(s => {
            const d = new Date(s.Date);
            return d >= filters.dateFrom && d <= filters.dateTo;
          });
          if (!currentlyInRange) {
            set({ filters: { ...filters, dateFrom: minDate, dateTo: maxDate } });
          }
        }
      } catch (e) {
        console.warn('Auto date range adjustment failed', e);
      }
      get().applyFilters();
    } else if (type === 'FILTERS_APPLIED') {
      set({ 
        filteredData: payload.filteredData, 
        processedData: payload.processedData 
      });
    }
  };

  return {
    // Initial data state
    rawData: [],
    checkinsData: [],
    filteredData: [],
    processedData: [],
    scheduleData: {},
    activeClassesData: {},
    
    // Initial filters - default to previous month
    filters: getDefaultFilters(),
    
    // Initial view configuration
    viewMode: 'grouped',
    groupBy: 'ClassDayTimeLocation',
    additionalView: null,
    includeTrainerInRankings: false,
    
    // Initial UI state
    expandedGroups: new Set(),
    selectedRows: new Set(),
    isFilterCollapsed: true,
    columnWidths: loadColumnWidths(),
    columnVisibility: {},
    excludeHostedClasses: false,
    tableView: 'default',
    
    // Initial sorting
    sortColumn: 'rank',
    sortDirection: 'asc',
    rankingMetric: 'classAvg',
    
    // Actions
    setRankingMetric: (metric: RankingMetric) => {
      set({ rankingMetric: metric });
      get().applyFilters();
    },
    
    // Calculate average check-ins for similar classes - OPTIMIZED with indices
    getAverageCheckIns: (className: string, day: string, time: string, location: string) => {
      const { rawData } = get();
      const indices = getDataIndices();
      
      let similarClasses: SessionData[];
      
      // Use indexed lookup if available (O(1) vs O(n))
      if (indices) {
        const key = `${day}|${time}|${location}`;
        const dayTimeLoc = indices.sessionsByDayTimeLocation.get(key) || [];
        similarClasses = dayTimeLoc.filter(s => s.Class === className);
      } else {
        // Fallback to full scan
        similarClasses = rawData.filter(session => {
          return session.Class === className &&
                 session.Day === day &&
                 session.Time === time &&
                 session.Location === location;
        });
      }
      
      if (similarClasses.length === 0) {
        return null;
      }
      
      const totalCheckIns = similarClasses.reduce((sum, session) => sum + (session.CheckedIn || 0), 0);
      const avgCheckIns = totalCheckIns / similarClasses.length;
      
      return {
        avgCheckIns: Math.round(avgCheckIns * 10) / 10,
        totalSessions: similarClasses.length,
        lastSessionDate: similarClasses
          .map(s => s.Date)
          .filter(Boolean)
          .sort()
          .pop() || '',
      };
    },

    setCheckinsData: (data: CheckinData[]) => {
      console.log(`[STORE] Setting ${data.length} checkin records`);
      set({ checkinsData: data });
    },

    setRawData: (data: SessionData[]) => {
      const { activeClassesData } = get();
      // Invalidate indices cache when new data comes in
      invalidateIndicesCache();
      // Offload processing to worker
      worker.postMessage({ 
        type: 'PROCESS_DATA', 
        payload: { rawData: data, activeClassesData } 
      });
    },
    
    setScheduleData: (scheduleData: { [day: string]: any[] }) => {
      set({ scheduleData });
    },
    
    setFilters: (newFilters: Partial<FilterState>) => {
      set((state) => ({
        filters: { ...state.filters, ...newFilters },
      }));
      get().applyFilters();
    },
    
    setViewMode: (mode: ViewMode) => {
      set({ viewMode: mode });
      get().applyFilters();
    },
    
    setGroupBy: (groupBy: GroupBy) => {
      set({ groupBy, expandedGroups: new Set() });
      get().applyFilters();
    },
    
    setAdditionalView: (view: AdditionalView | null) => {
      set({ additionalView: view });
    },
    
    toggleGroup: (groupKey: string) => {
      set((state) => {
        const newExpanded = new Set(state.expandedGroups);
        if (newExpanded.has(groupKey)) {
          newExpanded.delete(groupKey);
        } else {
          newExpanded.add(groupKey);
        }
        return { expandedGroups: newExpanded };
      });
    },
    
    toggleFilterCollapse: () => {
      set((state) => ({ isFilterCollapsed: !state.isFilterCollapsed }));
    },
    
    setSorting: (column: string, direction: 'asc' | 'desc') => {
      set({ sortColumn: column, sortDirection: direction });
      get().applyFilters();
    },
    
    setColumnWidth: (columnId: string, width: number) => {
      set((state) => {
        const newWidths = { ...state.columnWidths, [columnId]: width };
        saveColumnWidths(newWidths);
        return { columnWidths: newWidths };
      });
    },
    
    setIncludeTrainerInRankings: (include: boolean) => {
      set({ includeTrainerInRankings: include });
    },
    
    setColumnVisibility: (columnId: string, visible: boolean) => {
      set((state) => ({
        columnVisibility: { ...state.columnVisibility, [columnId]: visible },
      }));
    },
    
    setExcludeHostedClasses: (exclude: boolean) => {
      set({ excludeHostedClasses: exclude });
      get().applyFilters();
    },
    
    setTableView: (view) => {
      set({ tableView: view });
    },
    
    applyFilters: () => {
      const { rawData, filters, viewMode, groupBy, sortColumn, sortDirection, excludeHostedClasses, rankingMetric } = get();
      
      if (rawData.length === 0) {
        set({ processedData: [] });
        return;
      }

      worker.postMessage({
        type: 'APPLY_FILTERS',
        payload: {
          filters,
          viewMode,
          groupBy,
          sortColumn,
          sortDirection,
          excludeHostedClasses,
          rankingMetric
        }
      });
    },
    
    exportData: (format: 'csv' | 'xlsx') => {
      const { processedData } = get();
      console.log(`Exporting ${processedData.length} rows as ${format}`);
    },
    
    updateClassSchedule: (classId: string, newDay: string, newTime: string) => {
      set((state) => {
        // Update in activeClassesData - it's structured as { [day]: classes[] }
        const updatedActiveClasses = { ...state.activeClassesData };
        let updatedClass: any = null;
        let oldDay: string = '';
        let oldTime: string = '';
        
        // Find and update the class across all days
        Object.keys(updatedActiveClasses).forEach(day => {
          const dayClasses = updatedActiveClasses[day];
          if (Array.isArray(dayClasses)) {
            const classIndex = dayClasses.findIndex((cls: any) => cls.id === classId);
            if (classIndex !== -1) {
              // Found the class - save old values and update
              const originalClass = dayClasses[classIndex];
              oldDay = originalClass.day;
              oldTime = originalClass.time;
              
              // Update class with new day/time AND new ID
              const newId = classId.replace(`active-${oldDay}-${oldTime}`, `active-${newDay}-${newTime}`);
              const cls = { 
                ...originalClass, 
                day: newDay, 
                time: newTime,
                id: newId
              };
              updatedClass = cls;
              
              // Remove from current day
              updatedActiveClasses[day] = dayClasses.filter((c: any) => c.id !== classId);
              
              // Add to new day
              if (!updatedActiveClasses[newDay]) {
                updatedActiveClasses[newDay] = [];
              }
              updatedActiveClasses[newDay] = [...updatedActiveClasses[newDay], cls];
            }
          }
        });
        
        // Also update in rawData if the class exists there - use OLD day/time for matching
        const updatedRawData = state.rawData.map(session => {
          if (updatedClass && 
              session.Class === updatedClass.className &&
              session.Location === updatedClass.location &&
              session.Trainer === updatedClass.trainer &&
              session.Day === oldDay &&
              session.Time === oldTime) {
            return {
              ...session,
              Day: newDay,
              Time: newTime
            };
          }
          return session;
        });
        
        console.log('📝 Store update:', { 
          classId, 
          oldDay, 
          oldTime, 
          newDay, 
          newTime,
          updatedClass: updatedClass?.className
        });
        
        return {
          activeClassesData: updatedActiveClasses,
          rawData: updatedRawData
        };
      });
      
      // Invalidate ProScheduler cache to force refresh
      if (typeof window !== 'undefined') {
        (window as any).__proSchedulerCacheInvalidate = Date.now();
      }
      
      // Reapply filters to update the view
      get().applyFilters();
    },
  };
});
