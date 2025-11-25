import { create } from 'zustand';
import { DashboardState, SessionData, FilterState, ViewMode, GroupBy, AdditionalView, ColumnWidthSettings, RankingMetric, CheckinData } from '../types';
import DataProcessorWorker from '../workers/dataProcessor.worker?worker';

// Initialize worker
const worker = new DataProcessorWorker();

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
    
    // Calculate average check-ins for similar classes
    getAverageCheckIns: (className: string, day: string, time: string, location: string) => {
      const { rawData } = get();
      
      // Find similar classes (same class, day, time, location)
      const similarClasses = rawData.filter(session => {
        return session.Class === className &&
               session.Day === day &&
               session.Time === time &&
               session.Location === location;
      });
      
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
  };
});
