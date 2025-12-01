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
        // Normalize time format from AM/PM to 24h (e.g., "7:15 AM" -> "07:15")
        const normalizeTime = (time: string): string => {
          if (!time) return '08:00';
          // If already in 24h format, return as-is
          if (/^\d{2}:\d{2}$/.test(time)) return time;
          
          const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (match) {
            let hours = parseInt(match[1]);
            const minutes = match[2];
            const period = match[3].toUpperCase();
            
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            
            return `${hours.toString().padStart(2, '0')}:${minutes}`;
          }
          return time;
        };

        // Deep clone to ensure React detects state change
        const updatedActiveClasses: Record<string, any[]> = {};
        Object.keys(state.activeClassesData).forEach(day => {
          updatedActiveClasses[day] = state.activeClassesData[day].map((cls: any) => ({ ...cls }));
        });
        
        let updatedClass: any = null;
        let oldDay: string = '';
        let oldTime: string = '';
        let foundInDay: string = '';
        let foundAtIndex: number = -1;
        
        // Find the class across all days - match by stored ID first, then by constructed ID
        Object.keys(updatedActiveClasses).forEach(day => {
          const dayClasses = updatedActiveClasses[day];
          if (Array.isArray(dayClasses)) {
            dayClasses.forEach((cls: any, index: number) => {
              // If the class already has an ID stored, use that
              if (cls.id === classId) {
                foundInDay = day;
                foundAtIndex = index;
                oldDay = cls.day || day;
                oldTime = normalizeTime(cls.time);
                updatedClass = { ...cls };
                return;
              }
              
              // Otherwise try constructing ID with normalized time and location (matching ProScheduler format)
              const normalizedClsTime = normalizeTime(cls.time);
              const clsDay = cls.day || day;
              const clsLocation = cls.location || 'Unknown';
              // Match the stable ID format used in ProScheduler
              const constructedId = `active-${clsDay}-${normalizedClsTime}-${cls.className}-${clsLocation}`.replace(/\s+/g, '_');
              if (constructedId === classId) {
                foundInDay = day;
                foundAtIndex = index;
                oldDay = clsDay;
                oldTime = normalizedClsTime;
                updatedClass = { ...cls };
              }
            });
          }
        });
        
        if (foundAtIndex !== -1 && updatedClass) {
          // Store original day/time on first move (for permanent reference)
          const originalDay = updatedClass.originalDay || oldDay;
          const originalTime = updatedClass.originalTime || oldTime;
          
          // Generate a stable unique ID based on class name, location, and original position
          // This ID won't change even after multiple drag-drops
          const className = updatedClass.className || updatedClass.class || 'Unknown';
          const location = updatedClass.location || 'Unknown';
          const stableId = `active-${originalDay}-${originalTime}-${className}-${location}`.replace(/\s+/g, '_');
          
          // Update the class with new values but keep stable ID
          updatedClass = {
            ...updatedClass,
            day: newDay,
            time: newTime,
            id: stableId, // Use stable ID based on original position
            originalDay,  // Store original day for reference
            originalTime, // Store original time for reference
            movedFrom: updatedClass.movedFrom || { day: oldDay, time: oldTime }, // Track last position
            lastMoved: new Date().toISOString()
          };
          
          // Remove from original day by matching the class object directly
          updatedActiveClasses[foundInDay] = updatedActiveClasses[foundInDay].filter(
            (_, idx) => idx !== foundAtIndex
          );
          
          // Ensure target day array exists
          if (!updatedActiveClasses[newDay]) {
            updatedActiveClasses[newDay] = [];
          }
          
          // Add to new day
          updatedActiveClasses[newDay] = [...updatedActiveClasses[newDay], updatedClass];
          
          console.log('📝 Store update SUCCESS:', { 
            classId, 
            stableId,
            oldDay, 
            oldTime, 
            newDay, 
            newTime,
            originalDay,
            originalTime,
            className: updatedClass.className
          });
        } else {
          console.warn('⚠️ Class not found for drag-drop:', classId);
          console.log('Available classes:', Object.entries(updatedActiveClasses).map(([day, classes]) => 
            classes.map((c: any, i: number) => ({ day, id: c.id, className: c.className, time: c.time, index: i }))
          ).flat());
        }
        
        // Also update in rawData if the class exists there - use OLD day/time for matching
        const updatedRawData = state.rawData.map(session => {
          if (updatedClass && 
              session.Class === (updatedClass.className || updatedClass.class) &&
              session.Location === updatedClass.location &&
              session.Trainer === updatedClass.trainer &&
              session.Day === oldDay &&
              session.Time?.startsWith(oldTime)) {
            return {
              ...session,
              Day: newDay,
              Time: newTime
            };
          }
          return session;
        });
        
        // Also update filteredData to reflect the changes
        const updatedFilteredData = state.filteredData.map(session => {
          if (updatedClass && 
              session.Class === (updatedClass.className || updatedClass.class) &&
              session.Location === updatedClass.location &&
              session.Trainer === updatedClass.trainer &&
              session.Day === oldDay &&
              session.Time?.startsWith(oldTime)) {
            return {
              ...session,
              Day: newDay,
              Time: newTime
            };
          }
          return session;
        });
        
        // Also update processedData (the cleaned sheet data) to reflect the changes
        const updatedProcessedData = state.processedData.map((row: any) => {
          if (updatedClass && 
              row.Class === (updatedClass.className || updatedClass.class) &&
              row.Location === updatedClass.location &&
              row.Trainer === updatedClass.trainer &&
              row.Day === oldDay &&
              (row.Time?.startsWith(oldTime) || row.time?.startsWith(oldTime))) {
            return {
              ...row,
              Day: newDay,
              day: newDay,
              Time: newTime,
              time: newTime
            };
          }
          return row;
        });
        
        return {
          activeClassesData: updatedActiveClasses,
          rawData: updatedRawData,
          filteredData: updatedFilteredData,
          processedData: updatedProcessedData
        };
      });
      
      // Invalidate ProScheduler cache to force refresh
      if (typeof window !== 'undefined') {
        (window as any).__proSchedulerCacheInvalidate = Date.now();
        // Also trigger a re-render by updating a timestamp
        (window as any).__proSchedulerLastUpdate = Date.now();
      }
      
      // Send updated data to worker for reprocessing
      const { rawData, activeClassesData } = get();
      worker.postMessage({ 
        type: 'PROCESS_DATA', 
        payload: { rawData, activeClassesData } 
      });
    },

    applyOptimization: (replacements: any[], newClasses: any[]) => {
      set((state) => {
        const updatedActiveClasses = { ...state.activeClassesData };
        let updatedRawData = [...state.rawData];

        // Process replacements
        replacements.forEach(rep => {
          const { original, replacement } = rep;
          
          // Find and update in activeClassesData
          Object.keys(updatedActiveClasses).forEach(day => {
             updatedActiveClasses[day] = updatedActiveClasses[day].map((cls: any) => {
                // Match logic (similar to updateClassSchedule)
                if (cls.className === original.className && 
                    cls.trainer === original.trainer &&
                    cls.day === original.day &&
                    cls.time === original.time &&
                    cls.location === original.location) {
                    
                    return {
                        ...cls,
                        className: replacement.className,
                        trainer: replacement.trainer,
                        // Keep other props
                        isAIOptimized: true,
                        optimizationReason: replacement.reason
                    };
                }
                return cls;
             });
          });

          // Update rawData
          updatedRawData = updatedRawData.map(session => {
             if (session.Class === original.className &&
                 session.Trainer === original.trainer &&
                 session.Day === original.day &&
                 session.Time === original.time &&
                 session.Location === original.location) {
                 return {
                     ...session,
                     Class: replacement.className,
                     Trainer: replacement.trainer
                 };
             }
             return session;
          });
        });

        // Process new classes (add to activeClassesData)
        newClasses.forEach(cls => {
            if (!updatedActiveClasses[cls.day]) {
                updatedActiveClasses[cls.day] = [];
            }
            updatedActiveClasses[cls.day].push({
                ...cls,
                isAIOptimized: true,
                optimizationReason: cls.reason
            });
        });

        return {
            activeClassesData: updatedActiveClasses,
            rawData: updatedRawData
        };
      });
      
      // Invalidate ProScheduler cache to force refresh
      if (typeof window !== 'undefined') {
        (window as any).__proSchedulerCacheInvalidate = Date.now();
        (window as any).__proSchedulerLastUpdate = Date.now();
      }

      // Trigger worker update
      const { rawData, activeClassesData } = get();
      worker.postMessage({ 
        type: 'PROCESS_DATA', 
        payload: { rawData, activeClassesData } 
      });
    },
  };
});
