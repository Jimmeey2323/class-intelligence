import { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import { useDashboardStore } from '../store/dashboardStore';
import { SessionData, GroupedRow, GroupBy, TableView, RankingMetric } from '../types';
import { formatCurrency, formatNumber, formatPercentage, calculateTotalsRow } from '../utils/calculations';
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Table as TableIcon,
  List,
  Download,
  Eye,
  Settings,
  X,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EnhancedDrilldownModal from './EnhancedDrilldownModal2';
import EmptyState from './EmptyState';

// (Sparkline removed per design requirements)

export default function DataTableEnhanced() {
  const {
    processedData,
    viewMode,
    setViewMode,
    groupBy,
    setGroupBy,
    expandedGroups,
    toggleGroup,
    excludeHostedClasses,
    setExcludeHostedClasses,
    tableView,
    setTableView,
    columnWidths: storedColumnWidths,
    setColumnWidth,
    sortColumn,
    sortDirection,
    setSorting,
    rankingMetric,
    setRankingMetric,
  } = useDashboardStore();

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('tableDensity') : null;
    return (saved === 'compact' || saved === 'comfortable') ? saved : 'comfortable';
  });
  const [columnOverrides, setColumnOverrides] = useState<Record<string, boolean>>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('tableVisibilityOverrides') : null;
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('tableDensity', density);
  }, [density]);
  useEffect(() => {
    try {
      localStorage.setItem('tableVisibilityOverrides', JSON.stringify(columnOverrides));
    } catch {}
  }, [columnOverrides]);
  
  // Auto-calculate column widths based on content
  const calculateColumnWidth = (columnId: string, data: any[]) => {
    const header = columnId.replace(/([A-Z])/g, ' $1').trim();
    let maxWidth = header.length * 10 + 40; // Header width
    
    // Sample first 100 rows for performance
    const sample = data.slice(0, 100);
    sample.forEach((row) => {
      const value = String(row[columnId] || '');
      const valueWidth = value.length * 8 + 20; // Approximate width
      maxWidth = Math.max(maxWidth, valueWidth);
    });
    
    return Math.min(Math.max(maxWidth, 120), 500); // Min 120px, max 500px
  };

  // Initialize column widths from store or auto-calculate
  useEffect(() => {
    if (processedData.length > 0 && Object.keys(columnSizing).length === 0) {
      // Use stored widths if available, otherwise calculate
      if (Object.keys(storedColumnWidths).length > 0) {
        setColumnSizing(storedColumnWidths);
      } else {
        const widths: Record<string, number> = {};
        const dataArray = processedData.filter((row) => !('isGroupRow' in row && row.isGroupRow));
        
        Object.keys(dataArray[0] || {}).forEach((key) => {
          widths[key] = calculateColumnWidth(key, dataArray);
        });
        
        setColumnSizing(widths);
        // Save initial calculated widths to store
        Object.entries(widths).forEach(([columnId, width]) => {
          setColumnWidth(columnId, width);
        });
      }
    }
  }, [processedData, storedColumnWidths]);

  // Sync key view settings to URL query params and initialize from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlViewMode = params.get('viewMode');
    const urlGroupBy = params.get('groupBy');
    const urlTableView = params.get('tableView');
    const urlRankingMetric = params.get('rankingMetric');
    const urlExcludeHosted = params.get('excludeHosted');

    if (urlViewMode === 'grouped' || urlViewMode === 'flat') setViewMode(urlViewMode as any);
    if (urlGroupBy) setGroupBy(urlGroupBy as any);
    if (urlTableView) setTableView(urlTableView as any);
    if (urlRankingMetric) setRankingMetric(urlRankingMetric as any);
    if (urlExcludeHosted === 'true' || urlExcludeHosted === 'false') setExcludeHostedClasses(urlExcludeHosted === 'true');
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('viewMode', viewMode);
    params.set('groupBy', groupBy);
    params.set('tableView', tableView);
    params.set('rankingMetric', rankingMetric);
    params.set('excludeHosted', String(excludeHostedClasses));
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [viewMode, groupBy, tableView, rankingMetric, excludeHostedClasses]);

  // Drilldown modal state
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
  const [drilldownSessions, setDrilldownSessions] = useState<SessionData[]>([]);
  const [drilldownTitle, setDrilldownTitle] = useState('');

  const openDrilldownFromGroup = (group: GroupedRow) => {
    setDrilldownSessions(group.children || []);
    setDrilldownTitle(group.groupValue);
    setIsDrilldownOpen(true);
  };
  const openDrilldownFromSession = (session: SessionData) => {
    setDrilldownSessions([session]);
    const title = `${session.SessionName || session.Class} - ${session.Day} ${session.Time} (${session.Location})`;
    setDrilldownTitle(title);
    setIsDrilldownOpen(true);
  };

  // Table view configurations
  const tableViews: { value: TableView; label: string; columns: string[] }[] = [
    {
      value: 'default',
      label: '✨ All Metrics (Default)',
      columns: ['expand', 'rank', 'groupValue', 'Trainer', 'Location', 'Class', 'Type', 'Date', 'Day', 'Time', 'classes', 'totalCheckIns', 'classAvg', 'classAvgNonEmpty', 'fillRate', 'waitlistRate', 'cancellationRate', 'totalRevenue', 'revPerCheckin', 'revPerBooking', 'revLostPerCancellation', 'weightedAverage', 'consistencyScore', 'emptyClasses', 'capacity', 'booked', 'actions'],
    },
    {
      value: 'performance',
      label: '🎯 Performance Focus',
      columns: ['expand', 'rank', 'groupValue', 'classes', 'totalCheckIns', 'classAvg', 'fillRate', 'consistencyScore', 'actions'],
    },
    {
      value: 'revenue',
      label: '💰 Revenue Analysis',
      columns: ['expand', 'rank', 'groupValue', 'Trainer', 'Location', 'classes', 'totalCheckIns', 'totalRevenue', 'revPerCheckin', 'actions'],
    },
    {
      value: 'attendance',
      label: '👥 Attendance Overview',
      columns: ['expand', 'rank', 'groupValue', 'Day', 'Time', 'classes', 'totalCheckIns', 'classAvg', 'capacity', 'fillRate', 'emptyClasses', 'actions'],
    },
    {
      value: 'capacity',
      label: '📊 Capacity Planning',
      columns: ['expand', 'rank', 'groupValue', 'Class', 'Location', 'Day', 'Time', 'capacity', 'totalCheckIns', 'fillRate', 'waitlisted', 'actions'],
    },
    {
      value: 'cancellations',
      label: '❌ Cancellation Analysis',
      columns: ['expand', 'rank', 'groupValue', 'Class', 'Trainer', 'classes', 'booked', 'lateCancelled', 'cancellationRate', 'actions'],
    },
    {
      value: 'consistency',
      label: '📈 Consistency Tracking',
      columns: ['expand', 'rank', 'groupValue', 'Class', 'Day', 'Time', 'classes', 'classAvg', 'consistencyScore', 'emptyClasses', 'actions'],
    },
  ];

  // Get visible columns for current table view
  const getVisibleColumnsForView = () => {
    const currentView = tableViews.find((v) => v.value === tableView);
    if (!currentView) return [];
    return currentView.columns;
  };

  // Column definitions
  const columns = useMemo<ColumnDef<SessionData | GroupedRow>[]>(() => {
    const baseColumns: ColumnDef<SessionData | GroupedRow>[] = [
      {
        id: 'expand',
        header: '',
        size: columnSizing['expand'] || 40,
        enableResizing: false,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            const isExpanded = expandedGroups.has(data.groupValue);
            return (
              <button
                onClick={(e) => { e.stopPropagation(); toggleGroup(data.groupValue); }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}
              </button>
            );
          }
          // For individual rows show a numeric value so column alignment matches grouped rows
          const session = data as SessionData;
          const val = (session as any).classAvg ?? session.CheckedIn ?? 0;
          return <div className="text-center text-sm">{formatNumber(val, 1)}</div>;
        },
      },
      {
        accessorKey: 'rank',
        header: 'Rank',
        size: columnSizing['rank'] || 96,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            const rank = data.rank;
            return (
              <div className="inline-flex items-center justify-center w-20 h-8 rounded-full font-semibold text-xs bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-sm select-none">
                <span className="tabular-nums whitespace-nowrap">#{rank}</span>
              </div>
            );
          }
          return null;
        },
      },
      {
        id: 'groupValue',
        header: 'Group',
        size: columnSizing['groupValue'] || 250,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="font-semibold text-gray-800 truncate">
                {data.groupValue}
              </div>
            );
          }
          return <div className="pl-8 text-gray-600 text-sm">{(data as SessionData).SessionName || (data as SessionData).Class}</div>;
        },
      },
      {
        accessorKey: 'Trainer',
        header: 'Trainer',
        size: columnSizing['Trainer'] || 150,
        cell: ({ getValue }) => <div className="whitespace-nowrap">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Location',
        header: 'Location',
        size: columnSizing['Location'] || 180,
        cell: ({ getValue }) => <div className="whitespace-nowrap">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Class',
        header: 'Class',
        size: columnSizing['Class'] || 150,
        cell: ({ getValue }) => <div className="whitespace-nowrap">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Type',
        header: 'Type',
        size: columnSizing['Type'] || 120,
        cell: ({ getValue }) => <div className="whitespace-nowrap">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Date',
        header: 'Date',
        size: columnSizing['Date'] || 110,
        cell: ({ getValue }) => <div className="text-sm">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Day',
        header: 'Day',
        size: columnSizing['Day'] || 90,
        cell: ({ getValue }) => <div className="text-sm">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Time',
        header: 'Time',
        size: columnSizing['Time'] || 90,
        cell: ({ getValue }) => <div className="text-sm">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'classes',
        header: 'Classes',
        size: columnSizing['classes'] || 80,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center font-semibold">{formatNumber(data.classes)}</div>;
          }
          return <div className="text-center text-sm">1</div>;
        },
      },
      {
        accessorKey: 'totalCheckIns',
        header: 'Check-ins',
        size: columnSizing['totalCheckIns'] || 100,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center font-semibold">{formatNumber(data.totalCheckIns)}</div>;
          }
          return <div className="text-center text-sm">{(data as SessionData).CheckedIn}</div>;
        },
      },
      {
        accessorKey: 'classAvg',
        header: 'Class Avg',
        size: columnSizing['classAvg'] || 140,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="text-right font-semibold text-blue-700">
                {formatNumber(data.classAvg, 1)}
              </div>
            );
          }
          return <div className="text-right text-gray-400">-</div>;
        },
      },
      {
        accessorKey: 'fillRate',
        header: 'Fill Rate',
        size: columnSizing['fillRate'] || 100,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center">{formatPercentage(data.fillRate)}</div>;
          }
          const session = data as SessionData;
          const rate = session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0;
          return <div className="text-center text-sm">{formatPercentage(rate)}</div>;
        },
      },
      {
        accessorKey: 'cancellationRate',
        header: 'Cancel Rate',
        size: columnSizing['cancellationRate'] || 110,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center">{formatPercentage(data.cancellationRate)}</div>;
          }
          const session = data as SessionData;
          const rate = session.Booked > 0 ? (session.LateCancelled / session.Booked) * 100 : 0;
          return <div className="text-center text-sm">{formatPercentage(rate)}</div>;
        },
      },
      {
        accessorKey: 'totalRevenue',
        header: 'Revenue',
        size: columnSizing['totalRevenue'] || 120,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="text-right font-semibold text-green-600">
                {formatCurrency(data.totalRevenue, true)}
              </div>
            );
          }
          return (
            <div className="text-right text-sm">{formatCurrency((data as SessionData).Revenue, true)}</div>
          );
        },
      },
      {
        accessorKey: 'revPerCheckin',
        header: 'Rev/Check-in',
        size: columnSizing['revPerCheckin'] || 120,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-right">{formatCurrency(data.revPerCheckin, true)}</div>;
          }
          const session = data as SessionData;
          const rev = session.CheckedIn > 0 ? session.Revenue / session.CheckedIn : 0;
          return <div className="text-right text-sm">{formatCurrency(rev, true)}</div>;
        },
      },
      {
        accessorKey: 'revPerBooking',
        header: 'Rev/Booking',
        size: columnSizing['revPerBooking'] || 120,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-right">{formatCurrency(data.revPerBooking, true)}</div>;
          }
          const session = data as SessionData;
          const value = session.Booked > 0 ? session.Revenue / session.Booked : 0;
          return <div className="text-right text-sm">{formatCurrency(value, true)}</div>;
        },
      },
      {
        accessorKey: 'revLostPerCancellation',
        header: 'Rev Lost',
        size: columnSizing['revLostPerCancellation'] || 120,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-right text-red-600">{formatCurrency(data.revLostPerCancellation, true)}</div>;
          }
          const session = data as SessionData;
            const revPerBooking = session.Booked > 0 ? session.Revenue / session.Booked : 0;
            const lost = session.LateCancelled * revPerBooking;
            return <div className="text-right text-sm text-red-600">{formatCurrency(lost, true)}</div>;
        },
      },
      {
        accessorKey: 'classAvgNonEmpty',
        header: 'Avg (No Empty)',
        size: columnSizing['classAvgNonEmpty'] || 140,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-right font-semibold text-indigo-700">{formatNumber(data.classAvgNonEmpty, 1)}</div>;
          }
          return <div className="text-right text-gray-400">-</div>;
        },
      },
      {
        accessorKey: 'waitlistRate',
        header: 'Waitlist %',
        size: columnSizing['waitlistRate'] || 110,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center">{formatPercentage(data.waitlistRate)}</div>;
          }
          const session = data as SessionData;
          const rate = session.Capacity > 0 ? ((session.Waitlisted || 0) / session.Capacity) * 100 : 0;
          return <div className="text-center text-sm">{formatPercentage(rate)}</div>;
        },
      },
      {
        accessorKey: 'weightedAverage',
        header: 'Weighted Util%',
        size: columnSizing['weightedAverage'] || 130,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center">{formatPercentage(data.weightedAverage)}</div>;
          }
          // For individual session weighted util == fill rate
          const session = data as SessionData;
          const rate = session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0;
          return <div className="text-center text-sm">{formatPercentage(rate)}</div>;
        },
      },
      {
        accessorKey: 'consistencyScore',
        header: 'Consistency',
        size: columnSizing['consistencyScore'] || 110,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center">{formatPercentage(data.consistencyScore)}</div>;
          }
          return null;
        },
      },
      {
        accessorKey: 'emptyClasses',
        header: 'Empty',
        size: columnSizing['emptyClasses'] || 80,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center text-orange-600 font-semibold">{formatNumber(data.emptyClasses)}</div>;
          }
          return null;
        },
      },
      {
        accessorKey: 'capacity',
        header: 'Capacity',
        size: columnSizing['capacity'] || 90,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center">{formatNumber(data.totalCapacity)}</div>;
          }
          return <div className="text-center text-sm">{(data as SessionData).Capacity}</div>;
        },
      },
      {
        accessorKey: 'booked',
        header: 'Booked',
        size: columnSizing['booked'] || 90,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center">{formatNumber(data.totalBooked)}</div>;
          }
          return <div className="text-center text-sm">{(data as SessionData).Booked}</div>;
        },
      },
      {
        accessorKey: 'lateCancelled',
        header: 'Late Cancel',
        size: columnSizing['lateCancelled'] || 110,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center">{formatNumber(data.totalCancellations)}</div>;
          }
          return <div className="text-center text-sm">{(data as SessionData).LateCancelled}</div>;
        },
      },
      {
        accessorKey: 'waitlisted',
        header: 'Waitlist',
        size: columnSizing['waitlisted'] || 90,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center">{formatNumber(data.totalWaitlisted || 0)}</div>;
          }
          return <div className="text-center text-sm">{(data as SessionData).Waitlisted || 0}</div>;
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        size: columnSizing['actions'] || 80,
        enableResizing: false,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <button
                onClick={() => console.log('View details:', data)}
                className="p-2 rounded-lg hover:bg-blue-100 transition-colors"
                title="View details"
              >
                <Eye className="w-4 h-4 text-blue-600" />
              </button>
            );
          }
          return null;
        },
      },
    ];

    return baseColumns;
  }, [viewMode, expandedGroups, toggleGroup, columnSizing]);

  // Prepare table data
  const tableData = useMemo(() => {
    if (viewMode === 'flat') {
      return processedData as SessionData[];
    }

    // In grouped view, ensure group rows appear sorted by rank by default,
    // while keeping children directly beneath their parent when expanded.
    const groupRows = (processedData.filter((r) => 'isGroupRow' in r && (r as GroupedRow).isGroupRow) as GroupedRow[])
      .slice()
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

    const expandedData: (SessionData | GroupedRow)[] = [];
    groupRows.forEach((row) => {
      expandedData.push(row);
      if (expandedGroups.has(row.groupValue) && row.children) {
        expandedData.push(...row.children);
      }
    });

    // If any stray non-group rows exist, append them at the end to avoid data loss.
    const nonGroup = processedData.filter((r) => !('isGroupRow' in r && (r as any).isGroupRow));
    if (nonGroup.length) expandedData.push(...(nonGroup as SessionData[]));

    return expandedData;
  }, [processedData, viewMode, expandedGroups]);

  const [sorting, setSortingState] = useState<SortingState>([
    { id: sortColumn || 'rank', desc: sortDirection === 'desc' },
  ]);

  // Keep local sorting in sync with global store when criteria/grouping/filters change
  useEffect(() => {
    // In grouped view, disable TanStack sorting so children stay under their group.
    if (viewMode === 'grouped') {
      if (sorting.length) setSortingState([]);
      return;
    }
    // In flat view, default to sorting by rank ascending unless user changed it.
    if (!sorting.length || sorting[0].id === 'rank' || !sorting.find((s) => s.id !== 'rank')) {
      setSortingState([{ id: 'rank', desc: false }]);
    }
  }, [viewMode, groupBy, tableView, processedData, rankingMetric]);

  // Create visibility state based on table view
  const visibility = useMemo(() => {
    const visibleCols = getVisibleColumnsForView();
    const visibilityState: VisibilityState = {};
    columns.forEach((col) => {
      const colId = col.id || (col as any).accessorKey;
      if (!colId) return;
      const baseVisible = visibleCols.includes(colId);
      const override = columnOverrides[colId];
      visibilityState[colId] = typeof override === 'boolean' ? override : baseVisible;
    });
    return visibilityState;
  }, [tableView, columns, columnOverrides]);

  const tdPaddingClass = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3.5';
  const thPaddingClass = density === 'compact' ? 'px-3 py-2' : 'px-4 py-4';

  const handleExport = () => {
    try {
      const visibleCols = table
        .getVisibleLeafColumns()
        .filter((c) => {
          const id = c.id || (c.columnDef as any).accessorKey;
          return id && id !== 'expand' && id !== 'actions';
        });

      const headers = visibleCols.map((c) => {
        const id = c.id || (c.columnDef as any).accessorKey;
        const headerLabel = typeof c.columnDef.header === 'string' ? (c.columnDef.header as string) : String(id);
        return { id: String(id), label: headerLabel };
      });

      const rows = table.getRowModel().rows.map((r) => {
        const data: Record<string, any> = {};
        const original = r.original as any;
        headers.forEach(({ id, label }) => {
          let value: any = '';
          if ('isGroupRow' in original && original.isGroupRow) {
            switch (id) {
              case 'groupValue': value = original.groupValue; break;
              case 'rank': value = original.rank; break;
              case 'classes': value = original.classes; break;
              case 'totalCheckIns': value = original.totalCheckIns; break;
              case 'classAvg': value = original.classAvg; break;
              case 'fillRate': value = original.fillRate; break;
              case 'waitlistRate': value = original.waitlistRate; break;
              case 'cancellationRate': value = original.cancellationRate; break;
              case 'totalRevenue': value = original.totalRevenue; break;
              case 'revPerCheckin': value = original.revPerCheckin; break;
              case 'revPerBooking': value = original.revPerBooking; break;
              case 'revLostPerCancellation': value = original.revLostPerCancellation; break;
              case 'classAvgNonEmpty': value = original.classAvgNonEmpty; break;
              case 'weightedAverage': value = original.weightedAverage; break;
              case 'consistencyScore': value = original.consistencyScore; break;
              case 'emptyClasses': value = original.emptyClasses; break;
              case 'capacity': value = original.totalCapacity; break;
              case 'booked': value = original.totalBooked; break;
              case 'lateCancelled': value = original.totalCancellations; break;
              case 'waitlisted': value = original.totalWaitlisted ?? 0; break;
              default:
                value = original[id] ?? '';
            }
          } else {
            const s = original as any;
            switch (id) {
              case 'classes': value = 1; break;
              case 'totalCheckIns': value = s.CheckedIn; break;
              case 'classAvg': value = s.CheckedIn; break;
              case 'fillRate': value = s.Capacity > 0 ? (s.CheckedIn / s.Capacity) * 100 : 0; break;
              case 'waitlistRate': value = s.Capacity > 0 ? ((s.Waitlisted || 0) / s.Capacity) * 100 : 0; break;
              case 'cancellationRate': value = s.Booked > 0 ? (s.LateCancelled / s.Booked) * 100 : 0; break;
              case 'totalRevenue': value = s.Revenue; break;
              case 'revPerCheckin': value = s.CheckedIn > 0 ? s.Revenue / s.CheckedIn : 0; break;
              case 'revPerBooking': value = s.Booked > 0 ? s.Revenue / s.Booked : 0; break;
              case 'revLostPerCancellation': {
                const revPerBooking = s.Booked > 0 ? s.Revenue / s.Booked : 0;
                value = s.LateCancelled * revPerBooking;
                break;
              }
              case 'classAvgNonEmpty': value = s.CheckedIn; break;
              case 'weightedAverage': value = s.Capacity > 0 ? (s.CheckedIn / s.Capacity) * 100 : 0; break;
              case 'capacity': value = s.Capacity; break;
              case 'booked': value = s.Booked; break;
              case 'lateCancelled': value = s.LateCancelled; break;
              case 'waitlisted': value = s.Waitlisted ?? 0; break;
              default:
                value = s[id] ?? '';
            }
          }
          data[label] = value;
        });
        return data;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, 'table-view.xlsx');
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      pagination,
      columnVisibility: visibility,
      columnSizing,
    },
    onSortingChange: (updater) => {
      const nextSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSortingState(nextSorting);
      if (nextSorting && nextSorting[0]) {
        const colId = nextSorting[0].id as string;
        const desc = !!nextSorting[0].desc;
        setSorting(colId, desc ? 'desc' : 'asc');
      }
    },
    onPaginationChange: setPagination,
    onColumnSizingChange: (updater) => {
      setColumnSizing(updater);
      // Save to store
      if (typeof updater === 'function') {
        const newSizing = updater(columnSizing);
        Object.entries(newSizing).forEach(([columnId, width]) => {
          if (width !== columnSizing[columnId]) {
            setColumnWidth(columnId, width);
          }
        });
      } else {
        Object.entries(updater).forEach(([columnId, width]) => {
          setColumnWidth(columnId, width);
        });
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: viewMode === 'grouped',
    columnResizeMode: 'onChange',
    enableSorting: viewMode === 'flat',
  });

  const totals = calculateTotalsRow(processedData);

  const groupByOptions: { value: GroupBy; label: string }[] = [
    { value: 'ClassDayTimeLocation', label: '✨ Class + Day + Time + Location (Recommended)' },
    { value: 'ClassDayTimeLocationTrainer', label: '👤 Class + Day + Time + Location + Trainer' },
    { value: 'LocationClass', label: '📍 Location → Class' },
    { value: 'ClassDay', label: '📅 Class → Day' },
    { value: 'ClassTime', label: '⏰ Class → Time' },
    { value: 'ClassDayTrainer', label: '🏋️ Class + Day + Trainer' },
    { value: 'ClassTrainer', label: '👥 Class + Trainer' },
    { value: 'DayTimeLocation', label: '🗓️ Day + Time + Location' },
    { value: 'DayTime', label: '📆 Day + Time' },
    { value: 'TrainerLocation', label: '🎯 Trainer + Location' },
    { value: 'DayLocation', label: '📌 Day + Location' },
    { value: 'TimeLocation', label: '⏱️ Time + Location' },
    { value: 'ClassType', label: '🎨 Class + Type' },
    { value: 'TypeLocation', label: '🏷️ Type + Location' },
    { value: 'TrainerDay', label: '👤📅 Trainer + Day' },
    { value: 'ClassLocation', label: '🏢 Class + Location' },
    { value: 'TrainerTime', label: '👤⏰ Trainer + Time' },
    { value: 'Class', label: '📚 Class Only' },
    { value: 'Type', label: '🎯 Class Type' },
    { value: 'Trainer', label: '👤 Trainer Only' },
    { value: 'Location', label: '📍 Location Only' },
    { value: 'Day', label: '📅 Day of Week Only' },
    { value: 'Date', label: '📆 Date Only' },
    { value: 'Time', label: '⏰ Time Only' },
    { value: 'SessionName', label: '🎫 Session Name' },
  ];

  const rankingOptions: { value: RankingMetric; label: string; icon: string }[] = [
    { value: 'classAvg', label: 'Class Average', icon: '📊' },
    { value: 'fillRate', label: 'Fill Rate', icon: '📈' },
    { value: 'totalCheckIns', label: 'Total Check-ins', icon: '👥' },
    { value: 'totalRevenue', label: 'Total Revenue', icon: '💰' },
    { value: 'revPerCheckin', label: 'Revenue per Check-in', icon: '💵' },
    { value: 'consistencyScore', label: 'Consistency Score', icon: '🎯' },
    { value: 'cancellationRate', label: 'Cancellation Rate (Lower is Better)', icon: '❌' },
    { value: 'classes', label: 'Number of Classes', icon: '📚' },
    { value: 'emptyClasses', label: 'Empty Classes (Lower is Better)', icon: '⚠️' },
    { value: 'compositeScore', label: 'Composite Score', icon: '⭐' },
  ];

  return (
    <div className="space-y-4">
      {processedData.length === 0 && (
        <div className="glass-card rounded-2xl p-6 border border-yellow-300 bg-yellow-50/70 text-yellow-800 text-sm">
          <p className="font-semibold mb-1">No data within current filters.</p>
          <p>
            Your dataset dates may lie outside the default range. Date filters were auto-expanded if possible.
            If still empty, upload a CSV or adjust filters manually.
          </p>
        </div>
      )}
      {/* Control Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-4"
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-white rounded-xl p-1 border-2 border-gray-200">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'grouped'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List className="w-4 h-4 inline mr-2" />
              Grouped
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'flat'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <TableIcon className="w-4 h-4 inline mr-2" />
              Flat
            </button>
          </div>

          {/* Ranking Metric Selector */}
          {viewMode === 'grouped' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
              <Award className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-semibold text-purple-900">Rank By:</span>
              <select
                value={rankingMetric}
                onChange={(e) => setRankingMetric(e.target.value as RankingMetric)}
                className="px-3 py-1.5 rounded-lg border-2 border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none font-medium transition-all bg-white text-sm"
              >
                {rankingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Group By Selector */}
          {viewMode === 'grouped' && (
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none font-medium transition-all bg-white"
            >
              {groupByOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {/* Table View Selector */}
          <select
            value={tableView}
            onChange={(e) => setTableView(e.target.value as TableView)}
            className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none font-medium transition-all bg-white"
          >
            {tableViews.map((view) => (
              <option key={view.value} value={view.value}>
                {view.label}
              </option>
            ))}
          </select>

          {/* Exclude Hosted Classes Toggle */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white">
            <input
              type="checkbox"
              id="excludeHosted"
              checked={excludeHostedClasses}
              onChange={(e) => setExcludeHostedClasses(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="excludeHosted" className="text-sm font-medium text-gray-700 cursor-pointer">
              Exclude Hosted Classes
            </label>
          </div>

          {/* Density Toggle */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 border-2 border-gray-200">
            <button
              onClick={() => setDensity('comfortable')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                density === 'comfortable' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Comfortable density"
            >
              Cozy
            </button>
            <button
              onClick={() => setDensity('compact')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                density === 'compact' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Compact density"
            >
              Compact
            </button>
          </div>

          {/* Column Visibility Button */}
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="ml-auto px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-blue-500 font-medium transition-all bg-white flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Columns
          </button>

          {/* Export Button */}
          <button onClick={handleExport} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-medium hover:shadow-lg transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </motion.div>

      {/* Column Settings Panel */}
      <AnimatePresence>
        {showColumnSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card rounded-2xl p-6 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Column Visibility</h3>
              <button
                onClick={() => setShowColumnSettings(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {columns.map((col) => {
                const colId = col.id || (col as any).accessorKey;
                if (!colId || colId === 'expand' || colId === 'actions') return null;
                
                const isVisible = visibility[colId];
                
                return (
                  <label
                    key={colId}
                    className="flex items-center gap-2 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 cursor-pointer transition-all bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(e) => {
                        setColumnOverrides((prev) => ({ ...prev, [colId]: e.target.checked }));
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {typeof col.header === 'string' ? col.header : colId}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-end">
              <button
                onClick={() => setColumnOverrides({})}
                className="px-3 py-2 text-sm rounded-lg border-2 border-gray-200 hover:border-blue-400 bg-white text-gray-700"
                title="Reset custom column visibility"
              >
                Reset Columns
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-gradient-to-r from-black via-purple-950 to-purple-900">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const isSorted = header.column.getIsSorted();
                    const ariaSort = isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : 'none';
                    
                    return (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className={`${thPaddingClass} sticky top-0 z-10 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap relative group ${
                          canSort ? 'cursor-pointer hover:bg-blue-600 transition-colors' : ''
                        }`}
                        role="columnheader"
                        scope="col"
                        aria-sort={ariaSort as any}
                        tabIndex={canSort ? 0 : -1}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        onKeyDown={(e) => {
                          if (!canSort) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            header.column.toggleSorting(undefined, e.shiftKey);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={canSort ? 'select-none' : ''}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {canSort && (
                            <div className="flex items-center">
                              {isSorted === 'asc' && <ArrowUp className="w-4 h-4 text-green-300" />}
                              {isSorted === 'desc' && <ArrowDown className="w-4 h-4 text-red-300" />}
                              {!isSorted && (
                                <div className="opacity-40 group-hover:opacity-70 transition-opacity">
                                  <ArrowUp className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Resize Handle */}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className="absolute right-0 top-0 h-full w-1 bg-white opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-col-resize"
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
              {/* Animated bottom border under header row */}
              <tr>
                <th colSpan={table.getVisibleLeafColumns().length} className="p-0">
                  <div className="h-0.5 w-full bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 animate-pulse" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={table.getVisibleLeafColumns().length} className="p-0">
                    <EmptyState
                      type="no-results"
                      action={
                        <button
                          onClick={() => {
                            setGroupBy('Class');
                            setExcludeHostedClasses(false);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Reset Filters
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, index) => {
                const isGroupRow = 'isGroupRow' in row.original && row.original.isGroupRow;
                // Do not gray out rows—show all with standard emphasis
                return (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.01 }}
                    onClick={() => {
                      const original = row.original as any;
                      if ('isGroupRow' in original && original.isGroupRow) {
                        openDrilldownFromGroup(original as GroupedRow);
                      } else {
                        openDrilldownFromSession(original as SessionData);
                      }
                    }}
                    className={`cursor-pointer transition-all duration-200 h-[35px] max-h-[35px] ${
                      isGroupRow
                        ? 'bg-gray-100 text-black border-b border-gray-300'
                        : index % 2 === 0
                        ? 'bg-white hover:bg-blue-50'
                        : 'bg-gray-50 hover:bg-blue-50'
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className={`${tdPaddingClass} text-sm align-middle whitespace-nowrap ${isGroupRow ? 'text-black font-medium' : 'text-gray-700'}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                );
              })
              )}
            </tbody>
            {/* Totals Footer (aligned to visible columns) */}
            <tfoot className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                {table.getVisibleLeafColumns().map((col, i) => {
                  const id = col.id || (col.columnDef as any).accessorKey;
                  let content: any = '';
                  let className = 'px-4 py-3 text-sm font-bold text-gray-800 text-center';
                  const isFirst = i === 0;
                  if (id === 'totalRevenue' || id === 'revPerCheckin') className += ' text-right';

                  switch (id) {
                    case 'groupValue':
                    case 'Trainer':
                    case 'Location':
                    case 'Class':
                    case 'Type':
                    case 'Date':
                    case 'Day':
                    case 'Time':
                    case 'rank':
                    case 'expand':
                      if (isFirst) content = 'TOTALS';
                      break;
                    case 'classes':
                      content = formatNumber(totals.classes); break;
                    case 'totalCheckIns':
                      content = formatNumber(totals.totalCheckIns); break;
                    case 'classAvg':
                      content = formatNumber(totals.classAvg, 1); className += ' text-blue-600'; break;
                    case 'classAvgNonEmpty':
                      content = formatNumber(totals.classAvgNonEmpty, 1); break;
                    case 'fillRate':
                      content = formatPercentage(totals.fillRate); break;
                    case 'waitlistRate':
                      content = formatPercentage(totals.waitlistRate); break;
                    case 'cancellationRate':
                      content = formatPercentage(totals.cancellationRate); break;
                    case 'totalRevenue':
                      content = formatCurrency(totals.totalRevenue, true); className += ' text-green-600'; break;
                    case 'revPerCheckin':
                      content = formatCurrency(totals.revPerCheckin, true); break;
                    case 'revPerBooking':
                      content = formatCurrency(totals.revPerBooking, true); break;
                    case 'revLostPerCancellation':
                      content = formatCurrency(totals.revLostPerCancellation, true); break;
                    case 'weightedAverage':
                      content = formatPercentage(totals.weightedAverage); break;
                    case 'consistencyScore':
                      content = formatPercentage(totals.consistencyScore); break;
                    case 'emptyClasses':
                      content = formatNumber(totals.emptyClasses); break;
                    case 'capacity':
                      content = formatNumber(totals.totalCapacity); break;
                    case 'booked':
                      content = formatNumber(totals.totalBooked); break;
                    case 'lateCancelled':
                      content = formatNumber(totals.totalCancellations); break;
                    case 'waitlisted':
                      content = formatNumber(totals.totalWaitlisted || 0); break;
                    default:
                      content = '';
                  }
                  return (
                    <td key={String(id)} className={className}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination */}
        {viewMode === 'flat' && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t-2 border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                tableData.length
              )}{' '}
              of {tableData.length} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-4 py-2 rounded-lg border-2 border-gray-300 font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-4 py-2 rounded-lg border-2 border-gray-300 font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
        {/* Drilldown Modal */}
        <EnhancedDrilldownModal
          isOpen={isDrilldownOpen}
          onClose={() => setIsDrilldownOpen(false)}
          sessions={drilldownSessions}
          title={drilldownTitle}
        />
      </motion.div>
    </div>
  );
}
