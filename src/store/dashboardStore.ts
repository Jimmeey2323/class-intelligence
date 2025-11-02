import { create } from 'zustand';
import { DashboardState, SessionData, FilterState, ViewMode, GroupBy, AdditionalView, ColumnWidthSettings } from '../types';
import { subMonths, startOfMonth } from 'date-fns';
import { groupData } from '../utils/calculations';
import { loadActiveClasses, ActiveClassesByDay } from '../utils/activeClassesLoader';

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
  const previousMonth = subMonths(today, 1);
  return {
    dateFrom: startOfMonth(previousMonth),
    dateTo: today, // Set to today as the latest available date
    trainers: [],
    locations: [],
    classTypes: [],
    classes: [],
    minCheckins: 1, // Set to 1 as default
    minClasses: 2, // Set to 2 as default
    searchQuery: '',
    statusFilter: 'all',
    excludeHostedClasses: true, // Default to exclude hosted classes
    includeTrainer: true, // Default to include trainer
  };
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial data state
  rawData: [],
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
  sortColumn: 'classAvg',
  sortDirection: 'desc',
  
  // Actions
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

  setRawData: (data: SessionData[]) => {
    const { activeClassesData } = get();
    
    let debugLogged = false; // Flag to log only once
    
    // Calculate Status and FillRate for each session
    const enrichedData = data.map((session, index) => {
      const fillRate = session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0;
      
      // Determine status based on Active.csv data
      let status: 'Active' | 'Inactive' = 'Inactive';
      
      if (activeClassesData && Object.keys(activeClassesData).length > 0) {
        // Use Active.csv data to determine status
        const sessionDay = session.Day;
        if (sessionDay && activeClassesData[sessionDay]) {
          const normalizeString = (str: string) => 
            str.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          const normalizedSessionClass = normalizeString(session.Class);
          const normalizedSessionLocation = normalizeString(session.Location);
          const normalizedSessionTime = session.Time.toLowerCase().trim();
          
          const dayClasses = activeClassesData[sessionDay] || [];
          
          const isActive = dayClasses.some((activeClass: any) => {
            const normalizedActiveClass = normalizeString(activeClass.className);
            const normalizedActiveLocation = normalizeString(activeClass.location);
            const normalizedActiveTime = activeClass.time.toLowerCase().trim();
            
            // More flexible class name matching - remove common prefixes
            const cleanClassName = (name: string) => {
              return normalizeString(name)
                .replace(/^studio/i, '')
                .replace(/^the/i, '')
                .trim();
            };
            
            const cleanedSessionClass = cleanClassName(session.Class);
            const cleanedActiveClass = cleanClassName(activeClass.className);
            
            // Class match: check if cleaned names match or contain each other
            const classMatch = cleanedActiveClass.includes(cleanedSessionClass) ||
                               cleanedSessionClass.includes(cleanedActiveClass) ||
                               normalizedActiveClass.includes(normalizedSessionClass) ||
                               normalizedSessionClass.includes(normalizedActiveClass);
            
            // Location match: flexible matching for location names
            const locationMatch = normalizedActiveLocation.includes(normalizedSessionLocation) ||
                                  normalizedSessionLocation.includes(normalizedActiveLocation);
            
            // Time match: compare first 5 characters (HH:MM)
            const timeMatch = normalizedActiveTime.startsWith(normalizedSessionTime.substring(0, 5)) ||
                              normalizedSessionTime.startsWith(normalizedActiveTime.substring(0, 5));
            
            // Log matching attempts for debugging (first session only)
            if (!debugLogged && index === 0 && (classMatch || locationMatch || timeMatch)) {
              console.log('🔍 Matching attempt:', {
                session: { 
                  class: session.Class, 
                  cleanClass: cleanedSessionClass,
                  location: session.Location, 
                  time: session.Time, 
                  day: session.Day 
                },
                active: { 
                  class: activeClass.className, 
                  cleanClass: cleanedActiveClass,
                  location: activeClass.location, 
                  time: activeClass.time 
                },
                matches: { classMatch, locationMatch, timeMatch, overall: classMatch && locationMatch && timeMatch }
              });
              debugLogged = true;
            }
            
            return classMatch && locationMatch && timeMatch;
          });
          
          status = isActive ? 'Active' : 'Inactive';
        }
      } else {
        // Fallback: Determine status based on date (sessions in last 30 days are Active)
        if (session.Date) {
          try {
            const sessionDate = new Date(session.Date);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            status = sessionDate >= thirtyDaysAgo ? 'Active' : 'Inactive';
          } catch (e) {
            // If date parsing fails, keep as Inactive
          }
        }
      }
      
      return {
        ...session,
        FillRate: fillRate,
        Status: status,
      };
    });
    
    // Log status distribution
    const activeCount = enrichedData.filter(s => s.Status === 'Active').length;
    const inactiveCount = enrichedData.filter(s => s.Status === 'Inactive').length;
    console.log(`📈 Session status: ${activeCount} Active, ${inactiveCount} Inactive (${enrichedData.length} total)`);
    
    set({ rawData: enrichedData });
    get().applyFilters();
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
    const { rawData, filters, viewMode, groupBy, sortColumn, sortDirection, excludeHostedClasses } = get();
    
    if (rawData.length === 0) {
      set({ processedData: [] });
      return;
    }
    
    // Hosted class pattern (same as in cleaners.ts)
    const hostedPattern = /hosted|bridal|lrs|x p57|rugby|wework|olympics|birthday|host|raheja|pop|workshop|community|physique|soundrise|outdoor|p57 x|x/i;
    
    // Filter data
    let filtered = rawData.filter((row) => {
      const rowDate = new Date(row.Date);
      
      // Exclude hosted classes if enabled
      if (excludeHostedClasses) {
        const className = (row.SessionName || row.Class || '').toLowerCase();
        if (hostedPattern.test(className)) {
          return false;
        }
      }
      
      // Date filter
      if (rowDate < filters.dateFrom || rowDate > filters.dateTo) {
        return false;
      }
      
      // Trainer filter
      if (filters.trainers.length > 0 && !filters.trainers.includes(row.Trainer)) {
        return false;
      }
      
      // Location filter
      if (filters.locations.length > 0 && !filters.locations.includes(row.Location)) {
        return false;
      }
      
      // Class type filter
      if (filters.classTypes.length > 0 && !filters.classTypes.includes(row.Type)) {
        return false;
      }
      
      // Class filter
      if (filters.classes.length > 0 && !filters.classes.includes(row.Class)) {
        return false;
      }
      
      // Status filter - IMPORTANT: Filter by Active/Inactive status from Active.csv
      if (filters.statusFilter && filters.statusFilter !== 'all') {
        const rowStatus = row.Status || 'Inactive'; // Default to Inactive if not set
        if (filters.statusFilter === 'active' && rowStatus !== 'Active') {
          return false;
        }
        if (filters.statusFilter === 'inactive' && rowStatus !== 'Inactive') {
          return false;
        }
      }
      
      // Search query (fuzzy search will be applied in component)
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          row.Class.toLowerCase().includes(query) ||
          row.Trainer.toLowerCase().includes(query) ||
          row.Location.toLowerCase().includes(query) ||
          row.Type.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
    
    // Store filtered data for metrics
    set({ filteredData: filtered });
    
    // Group or flat view
    if (viewMode === 'grouped') {
      const grouped = groupData(
        filtered, 
        groupBy, 
        filters.minCheckins, 
        filters.minClasses || 0
      );
      
      // Sort grouped data
      if (sortColumn) {
        grouped.sort((a, b) => {
          const aVal = (a as any)[sortColumn];
          const bVal = (b as any)[sortColumn];
          const multiplier = sortDirection === 'asc' ? 1 : -1;
          
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return (aVal - bVal) * multiplier;
          }
          
          return String(aVal).localeCompare(String(bVal)) * multiplier;
        });
      }
      
      set({ processedData: grouped });
    } else {
      // Flat view with sorting
      if (sortColumn) {
        filtered.sort((a, b) => {
          const aVal = (a as any)[sortColumn];
          const bVal = (b as any)[sortColumn];
          const multiplier = sortDirection === 'asc' ? 1 : -1;
          
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return (aVal - bVal) * multiplier;
          }
          
          return String(aVal).localeCompare(String(bVal)) * multiplier;
        });
      }
      
      set({ processedData: filtered });
    }
  },
  
  exportData: (format: 'csv' | 'xlsx') => {
    const { processedData } = get();
    // Export functionality will be implemented in utils
    console.log(`Exporting ${processedData.length} rows as ${format}`);
  },
}));

// Load Active.csv on store initialization
loadActiveClasses().then((activeClasses: ActiveClassesByDay) => {
  useDashboardStore.setState({ activeClassesData: activeClasses });
  const totalClasses = Object.values(activeClasses).reduce((sum, classes) => sum + classes.length, 0);
  console.log('✅ Active classes loaded:', Object.keys(activeClasses).length, 'days,', totalClasses, 'total classes');
  console.log('📊 Active classes by day:', Object.fromEntries(
    Object.entries(activeClasses).map(([day, classes]) => [day, classes.length])
  ));
  
  // Re-process raw data to apply active status
  const currentRawData = useDashboardStore.getState().rawData;
  if (currentRawData.length > 0) {
    console.log('🔄 Re-processing', currentRawData.length, 'sessions with Active.csv data');
    useDashboardStore.getState().setRawData(currentRawData);
  }
}).catch(error => {
  console.error('❌ Failed to load active classes:', error);
});
