import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { useDashboardStore } from '../store/dashboardStore';
import { SessionData, GroupedRow, GroupBy } from '../types';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DataTable() {
  const {
    processedData,
    viewMode,
    setViewMode,
    groupBy,
    setGroupBy,
    expandedGroups,
    toggleGroup,
  } = useDashboardStore();

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [drilldownRow, setDrilldownRow] = useState<GroupedRow | null>(null);

  // Column definitions
  const columns = useMemo<ColumnDef<SessionData | GroupedRow>[]>(() => {
    const baseColumns: ColumnDef<SessionData | GroupedRow>[] = [
      {
        id: 'expand',
        header: '',
        size: 40,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            const isExpanded = expandedGroups.has(data.groupValue);
            return (
              <button
                onClick={() => toggleGroup(data.groupValue)}
                className="p-1 hover:bg-gray-100 rounded"
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
        size: 60,
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
        size: 200,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="font-semibold text-gray-800">
                {data.groupValue}
              </div>
            );
          }
          return <div className="pl-8 text-gray-600">{(data as SessionData).UniqueID1}</div>;
        },
      },
      {
        accessorKey: 'Trainer',
        header: 'Trainer',
        size: 150,
        cell: ({ getValue }) => <div className="table-cell">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Location',
        header: 'Location',
        size: 200,
        cell: ({ getValue }) => <div className="table-cell">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Class',
        header: 'Class',
        size: 150,
        cell: ({ getValue }) => <div className="table-cell">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Type',
        header: 'Type',
        size: 150,
        cell: ({ getValue }) => <div className="table-cell">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Date',
        header: 'Date',
        size: 120,
        cell: ({ getValue }) => <div className="table-cell">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Day',
        header: 'Day',
        size: 100,
        cell: ({ getValue }) => <div className="table-cell">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'Time',
        header: 'Time',
        size: 100,
        cell: ({ getValue }) => <div className="table-cell">{String(getValue() || '')}</div>,
      },
      {
        accessorKey: 'classes',
        header: 'Classes',
        size: 80,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center font-semibold">{formatNumber(data.classes)}</div>;
          }
          return <div className="text-center">1</div>;
        },
      },
      {
        accessorKey: 'totalCheckIns',
        header: 'Check-ins',
        size: 100,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center font-semibold">{formatNumber(data.totalCheckIns)}</div>;
          }
          return <div className="text-center">{(data as SessionData).CheckedIn}</div>;
        },
      },
      {
        accessorKey: 'classAvg',
        header: 'Class Avg',
        size: 100,
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
        size: 100,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center">{formatPercentage(data.fillRate)}</div>;
          }
          const session = data as SessionData;
          const rate = session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0;
          return <div className="text-center">{formatPercentage(rate)}</div>;
        },
      },
      {
        accessorKey: 'cancellationRate',
        header: 'Cancel Rate',
        size: 110,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center">{formatPercentage(data.cancellationRate)}</div>;
          }
          const session = data as SessionData;
          const rate = session.Booked > 0 ? (session.LateCancelled / session.Booked) * 100 : 0;
          return <div className="text-center">{formatPercentage(rate)}</div>;
        },
      },
      {
        accessorKey: 'totalRevenue',
        header: 'Revenue',
        size: 120,
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
            <div className="text-right">{formatCurrency((data as SessionData).Revenue, true)}</div>
          );
        },
      },
      {
        accessorKey: 'revPerCheckin',
        header: 'Rev/Check-in',
        size: 120,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-right">{formatCurrency(data.revPerCheckin, true)}</div>;
          }
          const session = data as SessionData;
          const rev = session.CheckedIn > 0 ? session.Revenue / session.CheckedIn : 0;
          return <div className="text-right">{formatCurrency(rev, true)}</div>;
        },
      },
      {
        accessorKey: 'consistencyScore',
        header: 'Consistency',
        size: 110,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return <div className="text-center">{formatPercentage(data.consistencyScore)}</div>;
          }
          return null;
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 80,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <button
                onClick={() => setDrilldownRow(data)}
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
  }, [viewMode, expandedGroups, toggleGroup]);

  // Prepare table data
  const tableData = useMemo(() => {
    if (viewMode === 'flat') {
      return processedData as SessionData[];
    }

    // For grouped view, expand groups that are in expandedGroups
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

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSortingState,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: viewMode === 'grouped',
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
    <div className="glass-card rounded-3xl p-6 space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl gradient-blue">
            <TableIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Class Data</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-gray-200">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'grouped'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <List className="w-4 h-4 inline-block mr-2" />
              Grouped
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'flat'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <TableIcon className="w-4 h-4 inline-block mr-2" />
              Flat
            </button>
          </div>

          {/* Group By Selector */}
          {viewMode === 'grouped' && (
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none font-medium"
            >
              {groupByOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  Group by: {option.label}
                </option>
              ))}
            </select>
          )}

          {/* Export Button */}
          <button
            onClick={() => alert('Export functionality coming soon!')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full">
          {/* Header */}
          <thead className="gradient-blue sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-blue-800/50 transition-colors"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <span>
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* Body */}
          <tbody className="bg-white">
            <AnimatePresence>
              {table.getRowModel().rows.map((row) => {
                const isGroupRow = 'isGroupRow' in row.original && (row.original as GroupedRow).isGroupRow;
                return (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`table-row border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${
                      isGroupRow ? 'bg-gray-50 font-semibold' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-2 text-sm text-gray-700"
                        style={{ maxWidth: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>

          {/* Totals Row */}
          {viewMode === 'grouped' && (
            <tfoot className="bg-gray-50 border-t-4 border-double border-gray-300">
              <tr className="font-bold">
                <td className="px-4 py-3" colSpan={2}></td>
                <td className="px-4 py-3 text-sm">TOTALS</td>
                <td className="px-4 py-3" colSpan={7}></td>
                <td className="px-4 py-3 text-center text-sm">{formatNumber(totals.classes)}</td>
                <td className="px-4 py-3 text-center text-sm">{formatNumber(totals.totalCheckIns)}</td>
                <td className="px-4 py-3 text-center text-sm text-blue-600">
                  {formatNumber(totals.classAvg, 1)}
                </td>
                <td className="px-4 py-3 text-center text-sm">{formatPercentage(totals.fillRate)}</td>
                <td className="px-4 py-3 text-center text-sm">{formatPercentage(totals.cancellationRate)}</td>
                <td className="px-4 py-3 text-right text-sm text-green-600">
                  {formatCurrency(totals.totalRevenue, true)}
                </td>
                <td className="px-4 py-3 text-right text-sm">{formatCurrency(totals.revPerCheckin, true)}</td>
                <td className="px-4 py-3 text-center text-sm">{formatPercentage(totals.consistencyScore)}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {viewMode === 'flat' && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-600">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              tableData.length
            )}{' '}
            of {tableData.length} rows
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-4 py-2 rounded-xl border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-4 py-2 rounded-xl border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Drilldown Modal (placeholder) */}
      {drilldownRow && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setDrilldownRow(null)}
        >
          <div
            className="glass-card rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-4">Details: {drilldownRow.groupValue}</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Total Classes</p>
                <p className="text-2xl font-bold">{formatNumber(drilldownRow.classes)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Check-ins</p>
                <p className="text-2xl font-bold">{formatNumber(drilldownRow.totalCheckIns)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Class Average</p>
                <p className="text-2xl font-bold text-blue-600">{formatNumber(drilldownRow.classAvg, 1)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(drilldownRow.totalRevenue)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDrilldownRow(null)}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:shadow-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
