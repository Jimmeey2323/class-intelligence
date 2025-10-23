import { useMemo, useState, useEffect } from 'react';
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
import { SessionData, GroupedRow, GroupBy, TableView } from '../types';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  } = useDashboardStore();

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});
  
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
    
    return Math.min(Math.max(maxWidth, 80), 400); // Min 80px, max 400px
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

  // Table view configurations
  const tableViews: { value: TableView; label: string; columns: string[] }[] = [
    {
      value: 'default',
      label: '✨ All Metrics (Default)',
      columns: ['expand', 'rank', 'groupValue', 'Trainer', 'Location', 'Class', 'Type', 'Date', 'Day', 'Time', 'classes', 'totalCheckIns', 'classAvg', 'fillRate', 'cancellationRate', 'totalRevenue', 'revPerCheckin', 'consistencyScore', 'emptyClasses', 'capacity', 'booked', 'actions'],
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
                onClick={() => toggleGroup(data.groupValue)}
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
          return null;
        },
      },
      {
        accessorKey: 'rank',
        header: 'Rank',
        size: columnSizing['rank'] || 60,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <span className="font-bold text-blue-600">#{data.rank}</span>;
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
        cell: ({ getValue }) => <div className="truncate">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Location',
        header: 'Location',
        size: columnSizing['Location'] || 180,
        cell: ({ getValue }) => <div className="truncate">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Class',
        header: 'Class',
        size: columnSizing['Class'] || 150,
        cell: ({ getValue }) => <div className="truncate">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Type',
        header: 'Type',
        size: columnSizing['Type'] || 120,
        cell: ({ getValue }) => <div className="truncate">{String(getValue() || '')}</div>,
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
        size: columnSizing['classAvg'] || 100,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="text-center font-bold text-blue-600">
                {formatNumber(data.classAvg, 1)}
              </div>
            );
          }
          return null;
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

    const expandedData: (SessionData | GroupedRow)[] = [];
    processedData.forEach((row) => {
      if ('isGroupRow' in row && row.isGroupRow) {
        expandedData.push(row);
        if (expandedGroups.has(row.groupValue) && row.children) {
          expandedData.push(...row.children);
        }
      } else {
        expandedData.push(row);
      }
    });

    return expandedData;
  }, [processedData, viewMode, expandedGroups]);

  const [sorting, setSortingState] = useState<SortingState>([]);

  // Create visibility state based on table view
  const visibility = useMemo(() => {
    const visibleCols = getVisibleColumnsForView();
    const visibilityState: VisibilityState = {};
    
    columns.forEach((col) => {
      const colId = col.id || (col as any).accessorKey;
      if (colId) {
        visibilityState[colId] = visibleCols.includes(colId);
      }
    });
    
    return visibilityState;
  }, [tableView, columns]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      pagination,
      columnVisibility: visibility,
      columnSizing,
    },
    onSortingChange: setSortingState,
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

  return (
    <div className="space-y-4">
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

          {/* Column Visibility Button */}
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="ml-auto px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-blue-500 font-medium transition-all bg-white flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Columns
          </button>

          {/* Export Button */}
          <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-medium hover:shadow-lg transition-all flex items-center gap-2">
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
                        // This is controlled by table view, but we can add custom overrides later
                        console.log('Column toggle:', colId, e.target.checked);
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider relative group"
                    >
                      <div className="flex items-center justify-between">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <button
                            onClick={header.column.getToggleSortingHandler()}
                            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {header.column.getIsSorted() === 'asc' && <ArrowUp className="w-4 h-4" />}
                            {header.column.getIsSorted() === 'desc' && <ArrowDown className="w-4 h-4" />}
                            {!header.column.getIsSorted() && <ArrowUp className="w-4 h-4 opacity-30" />}
                          </button>
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
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map((row, index) => {
                const isGroupRow = 'isGroupRow' in row.original && row.original.isGroupRow;
                return (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.01 }}
                    className={`hover:bg-blue-50 transition-colors ${
                      isGroupRow ? 'bg-gray-50 font-semibold' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className="px-4 py-3 text-sm text-gray-900"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                );
              })}
            </tbody>
            {/* Totals Footer */}
            <tfoot className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
                <td colSpan={3} className="px-4 py-4 text-sm font-bold text-gray-800">
                  TOTALS
                </td>
                <td className="px-4 py-4 text-center text-sm font-bold">{formatNumber(totals.classes)}</td>
                <td className="px-4 py-4 text-center text-sm font-bold">{formatNumber(totals.totalCheckIns)}</td>
                <td className="px-4 py-4 text-center text-sm font-bold text-blue-600">
                  {formatNumber(totals.classAvg, 1)}
                </td>
                <td className="px-4 py-4 text-center text-sm font-bold">{formatPercentage(totals.fillRate)}</td>
                <td className="px-4 py-4 text-right text-sm font-bold text-green-600">
                  {formatCurrency(totals.totalRevenue, true)}
                </td>
                <td colSpan={table.getVisibleLeafColumns().length - 8}></td>
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
      </motion.div>
    </div>
  );
}
