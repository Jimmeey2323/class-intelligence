import { useMemo, useState, useEffect } from 'react';
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
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Table as TableIcon,
  List,
  Download,
  Eye,
  Maximize2,
  Search,
  Award,
} from 'lucide-react';
import { motion } from 'framer-motion';

type RankingMetric = 'classAvg' | 'fillRate' | 'totalRevenue' | 'consistencyScore' | 'totalCancellations' | 'totalBooked' | 'classes' | 'compositeScore';

interface DrilldownModalProps {
  row: GroupedRow;
  onClose: () => void;
}

function DrilldownModal({ row, onClose }: DrilldownModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'dd-MMM-yyyy');
    } catch {
      return dateStr;
    }
  };

  // Get unique values for filters
  const uniqueTrainers = useMemo(() => {
    const trainers = new Set(row.children?.map(s => s.Trainer) || []);
    return Array.from(trainers).sort();
  }, [row.children]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set(row.children?.map(s => s.Location) || []);
    return Array.from(locations).sort();
  }, [row.children]);

  const uniqueDays = useMemo(() => {
    const days = new Set(row.children?.map(s => s.Day) || []);
    return Array.from(days).sort((a, b) => {
      const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [row.children]);

  // Filter sessions based on search and filters
  const filteredSessions = useMemo(() => {
    if (!row.children) return [];
    
    return row.children.filter(session => {
      const matchesSearch = searchTerm === '' || 
        session.Class.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.Trainer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.Location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTrainer = selectedTrainer === 'all' || session.Trainer === selectedTrainer;
      const matchesLocation = selectedLocation === 'all' || session.Location === selectedLocation;
      const matchesDay = selectedDay === 'all' || session.Day === selectedDay;
      
      return matchesSearch && matchesTrainer && matchesLocation && matchesDay;
    });
  }, [row.children, searchTerm, selectedTrainer, selectedLocation, selectedDay]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="glass-card rounded-3xl p-8 max-w-7xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent mb-2">
              {row.groupValue}
            </h2>
            <p className="text-sm text-gray-600">
              Detailed analytics and performance metrics
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-xl hover:bg-red-100 transition-colors group"
          >
            <Maximize2 className="w-6 h-6 text-gray-600 group-hover:text-red-600" />
          </button>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="glass-card rounded-xl p-4 border-l-4 border-blue-600">
            <p className="text-xs text-gray-600 mb-1 uppercase font-semibold">Total Classes</p>
            <p className="text-2xl font-bold text-blue-700">{formatNumber(row.classes)}</p>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-4 border-green-600">
            <p className="text-xs text-gray-600 mb-1 uppercase font-semibold">Check-ins</p>
            <p className="text-2xl font-bold text-green-700">{formatNumber(row.totalCheckIns)}</p>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-4 border-purple-600">
            <p className="text-xs text-gray-600 mb-1 uppercase font-semibold">Class Avg</p>
            <p className="text-2xl font-bold text-purple-700">{formatNumber(row.classAvg, 1)}</p>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-4 border-orange-600">
            <p className="text-xs text-gray-600 mb-1 uppercase font-semibold">Fill Rate</p>
            <p className="text-2xl font-bold text-orange-700">{formatPercentage(row.fillRate)}</p>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-4 border-red-600">
            <p className="text-xs text-gray-600 mb-1 uppercase font-semibold">Cancel Rate</p>
            <p className="text-2xl font-bold text-red-700">{formatPercentage(row.cancellationRate)}</p>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-4 border-emerald-600">
            <p className="text-xs text-gray-600 mb-1 uppercase font-semibold">Revenue</p>
            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(row.totalRevenue, true)}</p>
          </div>
        </div>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="glass-card rounded-xl p-3 bg-gradient-to-br from-blue-50 to-blue-100">
            <p className="text-xs text-gray-700 mb-1 font-medium">Empty Classes</p>
            <p className="text-xl font-bold text-blue-800">{formatNumber(row.emptyClasses)}</p>
            <p className="text-xs text-gray-600 mt-1">{formatPercentage((row.emptyClasses / row.classes) * 100)} of total</p>
          </div>
          <div className="glass-card rounded-xl p-3 bg-gradient-to-br from-green-50 to-green-100">
            <p className="text-xs text-gray-700 mb-1 font-medium">Non-Empty Avg</p>
            <p className="text-xl font-bold text-green-800">{formatNumber(row.classAvgNonEmpty, 1)}</p>
            <p className="text-xs text-gray-600 mt-1">Excludes empty</p>
          </div>
          <div className="glass-card rounded-xl p-3 bg-gradient-to-br from-purple-50 to-purple-100">
            <p className="text-xs text-gray-700 mb-1 font-medium">Consistency</p>
            <p className="text-xl font-bold text-purple-800">{formatPercentage(row.consistencyScore)}</p>
            <p className="text-xs text-gray-600 mt-1">Attendance stability</p>
          </div>
          <div className="glass-card rounded-xl p-3 bg-gradient-to-br from-orange-50 to-orange-100">
            <p className="text-xs text-gray-700 mb-1 font-medium">Total Capacity</p>
            <p className="text-xl font-bold text-orange-800">{formatNumber(row.totalCapacity)}</p>
            <p className="text-xs text-gray-600 mt-1">Max attendees</p>
          </div>
          <div className="glass-card rounded-xl p-3 bg-gradient-to-br from-cyan-50 to-cyan-100">
            <p className="text-xs text-gray-700 mb-1 font-medium">Rev/Check-in</p>
            <p className="text-xl font-bold text-cyan-800">{formatCurrency(row.revPerCheckin, true)}</p>
            <p className="text-xs text-gray-600 mt-1">Per attendee</p>
          </div>
          <div className="glass-card rounded-xl p-3 bg-gradient-to-br from-pink-50 to-pink-100">
            <p className="text-xs text-gray-700 mb-1 font-medium">Rev/Booking</p>
            <p className="text-xl font-bold text-pink-800">{formatCurrency(row.revPerBooking, true)}</p>
            <p className="text-xs text-gray-600 mt-1">Per booking</p>
          </div>
        </div>

        {/* Advanced Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="glass-card rounded-2xl p-5">
            <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">Booking & Cancellation</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 font-medium">Total Bookings:</span>
                <span className="text-lg font-bold text-gray-900">{formatNumber(row.totalBookings)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 font-medium">Late Cancellations:</span>
                <span className="text-lg font-bold text-red-700">{formatNumber(row.totalCancellations)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 font-medium">Cancellation Rate:</span>
                <span className="text-lg font-bold text-orange-700">{formatPercentage(row.cancellationRate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 font-medium">Rev Lost (Est.):</span>
                <span className="text-lg font-bold text-red-600">{formatCurrency(row.revLostPerCancellation, true)}</span>
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-2xl p-5">
            <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">Capacity & Utilization</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 font-medium">Total Capacity:</span>
                <span className="text-lg font-bold text-gray-900">{formatNumber(row.totalCapacity)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 font-medium">Capacity Used:</span>
                <span className="text-lg font-bold text-green-700">{formatNumber(row.totalCheckIns)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 font-medium">Unutilized:</span>
                <span className="text-lg font-bold text-gray-600">{formatNumber(row.totalCapacity - row.totalCheckIns)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700 font-medium">Weighted Avg:</span>
                <span className="text-lg font-bold text-blue-700">{formatPercentage(row.weightedAverage)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Session Details */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Individual Sessions</h3>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
              {filteredSessions.length} of {row.children?.length || 0} sessions
            </span>
          </div>

          {/* Search and Filter Controls */}
          <div className="mb-4 space-y-3">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by class, trainer, or location..."
                className="w-full px-4 py-3 pl-10 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={selectedTrainer}
                onChange={(e) => setSelectedTrainer(e.target.value)}
                className="px-4 py-2 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white"
              >
                <option value="all">All Trainers</option>
                {uniqueTrainers.map(trainer => (
                  <option key={trainer} value={trainer}>{trainer}</option>
                ))}
              </select>

              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-4 py-2 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white"
              >
                <option value="all">All Locations</option>
                {uniqueLocations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>

              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="px-4 py-2 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white"
              >
                <option value="all">All Days</option>
                {uniqueDays.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {filteredSessions.map((session, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold">
                        {session.Class}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <p className="font-bold text-gray-900">{formatDate(session.Date)}</p>
                    </div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold">
                        {session.Day}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-xs font-semibold">
                        {session.Time}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{session.Trainer} • {session.Location}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-green-700">{session.CheckedIn}/{session.Capacity}</p>
                    <p className="text-xs text-gray-600">{formatPercentage((session.CheckedIn / session.Capacity) * 100)} full</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-600">Revenue</p>
                    <p className="font-bold text-sm text-emerald-700">{formatCurrency(session.Revenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Booked</p>
                    <p className="font-bold text-sm text-blue-700">{session.Booked}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Cancelled</p>
                    <p className="font-bold text-sm text-red-700">{session.LateCancelled}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Non-Paid</p>
                    <p className="font-bold text-sm text-orange-700">{session.NonPaid}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function DataTable() {
  const {
    processedData,
    viewMode,
    setViewMode,
    groupBy,
    setGroupBy,
    expandedGroups,
    toggleGroup,
    columnWidths,
    setColumnWidth,
    setSorting,
  } = useDashboardStore();

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [drilldownRow, setDrilldownRow] = useState<GroupedRow | null>(null);
  const [sorting, setSortingState] = useState<SortingState>([]);
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('compositeScore');

  // Helper function to get metric label
  const getMetricLabel = (metric: RankingMetric): string => {
    switch (metric) {
      case 'classAvg':
        return 'Class Avg';
      case 'fillRate':
        return 'Fill Rate';
      case 'totalRevenue':
        return 'Total Revenue';
      case 'consistencyScore':
        return 'Consistency';
      case 'totalCancellations':
        return 'Cancellations';
      case 'totalBooked':
        return 'Total Booked';
      case 'classes':
        return 'Classes';
      case 'compositeScore':
        return 'Composite Score';
    }
  };

  const rankingOptions: RankingMetric[] = ['compositeScore', 'classAvg', 'fillRate', 'totalRevenue', 'consistencyScore'];

  // Update store sorting when ranking metric changes
  useEffect(() => {
    if (viewMode === 'grouped') {
      // Update the store's sorting instead of table sorting to preserve group structure
      setSorting(rankingMetric, 'desc');
    }
  }, [rankingMetric, viewMode, setSorting]);

  // Column definitions with proper sizing
  const columns = useMemo<ColumnDef<SessionData | GroupedRow>[]>(() => {
    const baseColumns: ColumnDef<SessionData | GroupedRow>[] = [
      {
        id: 'expand',
        header: '',
        size: 50,
        minSize: 50,
        maxSize: 50,
        enableResizing: false,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            const isExpanded = expandedGroups.has(data.groupValue);
            return (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent row click
                  toggleGroup(data.groupValue);
                }}
                className="p-2 hover:bg-blue-100 rounded-lg transition-all"
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-700" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                )}
              </button>
            );
          }
          return null;
        },
      },
      {
        accessorKey: 'rank',
        header: '#',
        size: columnWidths['rank'] || 70,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="text-center">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                  {data.rank}
                </span>
              </div>
            );
          }
          return null;
        },
      },
      {
        id: 'groupValue',
        header: 'Group',
        size: columnWidths['groupValue'] || 300,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="font-bold text-gray-900 text-base">
                {data.groupValue}
              </div>
            );
          }
          return (
            <div className="pl-8 text-gray-700 text-sm">
              {(data as SessionData).SessionName || (data as SessionData).Class}
            </div>
          );
        },
      },
      {
        accessorKey: 'Trainer',
        header: 'Trainer',
        size: columnWidths['Trainer'] || 200,
        enableResizing: true,
        cell: ({ getValue }) => (
          <div className="text-gray-800 font-medium">{String(getValue() || '')}</div>
        ),
      },
      {
        accessorKey: 'Location',
        header: 'Location',
        size: columnWidths['Location'] || 220,
        enableResizing: true,
        cell: ({ getValue }) => (
          <div className="text-gray-800 font-medium">{String(getValue() || '')}</div>
        ),
      },
      {
        accessorKey: 'Class',
        header: 'Class',
        size: columnWidths['Class'] || 200,
        enableResizing: true,
        cell: ({ getValue }) => (
          <div className="text-gray-800">{String(getValue() || '')}</div>
        ),
      },
      {
        accessorKey: 'Type',
        header: 'Type',
        size: columnWidths['Type'] || 140,
        enableResizing: true,
        cell: ({ getValue }) => (
          <div className="text-gray-700">{String(getValue() || '')}</div>
        ),
      },
      {
        accessorKey: 'Date',
        header: 'Date',
        size: columnWidths['Date'] || 120,
        enableResizing: true,
        cell: ({ getValue }) => (
          <div className="text-gray-700 text-sm">{String(getValue() || '')}</div>
        ),
      },
      {
        accessorKey: 'Day',
        header: 'Day',
        size: columnWidths['Day'] || 110,
        enableResizing: true,
        cell: ({ getValue }) => (
          <div className="text-gray-700 font-medium">{String(getValue() || '')}</div>
        ),
      },
      {
        accessorKey: 'Time',
        header: 'Time',
        size: columnWidths['Time'] || 100,
        enableResizing: true,
        cell: ({ getValue }) => (
          <div className="text-gray-700 font-medium">{String(getValue() || '')}</div>
        ),
      },
      {
        accessorKey: 'classes',
        header: 'Classes',
        size: columnWidths['classes'] || 95,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="text-center font-bold text-gray-900">
                {formatNumber(data.classes)}
              </div>
            );
          }
          return <div className="text-center text-gray-600">1</div>;
        },
      },
      {
        accessorKey: 'totalCheckIns',
        header: 'Check-ins',
        size: columnWidths['totalCheckIns'] || 120,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="text-center font-bold text-green-700">
                {formatNumber(data.totalCheckIns)}
              </div>
            );
          }
          return (
            <div className="text-center text-gray-700">
              {(data as SessionData).CheckedIn}
            </div>
          );
        },
      },
      {
        accessorKey: 'classAvg',
        header: 'Class Avg',
        size: columnWidths['classAvg'] || 110,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="text-center font-bold text-blue-700 text-base">
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
        size: columnWidths['fillRate'] || 105,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            const color = data.fillRate >= 80 ? 'text-green-700' : data.fillRate >= 60 ? 'text-yellow-700' : 'text-orange-700';
            return (
              <div className={`text-center font-semibold ${color}`}>
                {formatPercentage(data.fillRate)}
              </div>
            );
          }
          const session = data as SessionData;
          const rate = session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0;
          return (
            <div className="text-center text-gray-700">
              {formatPercentage(rate)}
            </div>
          );
        },
      },
      {
        accessorKey: 'cancellationRate',
        header: 'Cancel Rate',
        size: columnWidths['cancellationRate'] || 130,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="text-center font-semibold text-orange-700">
                {formatPercentage(data.cancellationRate)}
              </div>
            );
          }
          const session = data as SessionData;
          const rate = session.Booked > 0 ? (session.LateCancelled / session.Booked) * 100 : 0;
          return (
            <div className="text-center text-gray-700">
              {formatPercentage(rate)}
            </div>
          );
        },
      },
      {
        accessorKey: 'totalRevenue',
        header: 'Revenue',
        size: columnWidths['totalRevenue'] || 120,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="text-right font-bold text-green-700 text-base">
                {formatCurrency(data.totalRevenue, true)}
              </div>
            );
          }
          return (
            <div className="text-right text-gray-700">
              {formatCurrency((data as SessionData).Revenue, true)}
            </div>
          );
        },
      },
      {
        accessorKey: 'revPerCheckin',
        header: 'Rev/Check-in',
        size: columnWidths['revPerCheckin'] || 140,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="text-right font-semibold text-green-600">
                {formatCurrency(data.revPerCheckin, true)}
              </div>
            );
          }
          const session = data as SessionData;
          const rev = session.CheckedIn > 0 ? session.Revenue / session.CheckedIn : 0;
          return (
            <div className="text-right text-gray-700">
              {formatCurrency(rev, true)}
            </div>
          );
        },
      },
      {
        accessorKey: 'consistencyScore',
        header: 'Consistency',
        size: columnWidths['consistencyScore'] || 140,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            const color = data.consistencyScore >= 80 ? 'text-green-700' : data.consistencyScore >= 60 ? 'text-yellow-700' : 'text-orange-700';
            return (
              <div className={`text-center font-semibold ${color}`}>
                {formatPercentage(data.consistencyScore)}
              </div>
            );
          }
          return null;
        },
      },
      {
        accessorKey: 'compositeScore',
        header: 'Composite Score',
        size: columnWidths['compositeScore'] || 140,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            const score = data.compositeScore || 0;
            const color = score >= 70 ? 'text-green-700' : score >= 50 ? 'text-yellow-700' : 'text-orange-700';
            return (
              <div className={`text-center font-bold ${color} relative group cursor-help`}>
                {formatNumber(score, 1)}
                {/* Tooltip for composite score calculation */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-pre-line shadow-lg max-w-sm">
                    {`Composite Score Calculation:
• Attendance Score: ${formatNumber(Math.min(data.classAvg * 5, 100), 1)} (${formatNumber(data.classAvg, 1)} avg × 5, capped at 100) × 40% = ${formatNumber(Math.min(data.classAvg * 5, 100) * 0.4, 1)}
• Fill Rate Score: ${formatNumber(Math.min(data.fillRate, 100), 1)} (${formatPercentage(data.fillRate)}) × 35% = ${formatNumber(Math.min(data.fillRate, 100) * 0.35, 1)}
• Session Score: ${formatNumber(Math.min(data.classes * 2, 100), 1)} (${data.classes} sessions × 2, capped at 100) × 25% = ${formatNumber(Math.min(data.classes * 2, 100) * 0.25, 1)}

Total: ${formatNumber(score, 1)}`}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: columnWidths['status'] || 95,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            const isActive = data.status === 'Active';
            return (
              <div className={`text-center font-semibold ${isActive ? 'text-green-700' : 'text-gray-500'}`}>
                {data.status}
              </div>
            );
          }
          return null;
        },
      },
      {
        accessorKey: 'mostRecentDate',
        header: 'Last Class',
        size: columnWidths['mostRecentDate'] || 120,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow && data.mostRecentDate) {
            return (
              <div className="text-center text-gray-700 text-sm">
                {format(new Date(data.mostRecentDate), 'dd-MMM-yyyy')}
              </div>
            );
          }
          return null;
        },
      },
      {
        accessorKey: 'emptyClasses',
        header: 'Empty',
        size: columnWidths['emptyClasses'] || 95,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="text-center font-semibold text-orange-700">
                {formatNumber(data.emptyClasses)}
              </div>
            );
          }
          return null;
        },
      },
      {
        accessorKey: 'totalCapacity',
        header: 'Cap',
        size: columnWidths['capacity'] || 90,
        enableResizing: true,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="text-center font-semibold text-gray-800">
                {formatNumber(data.totalCapacity)}
              </div>
            );
          }
          return (
            <div className="text-center text-gray-700">
              {(data as SessionData).Capacity}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 90,
        minSize: 90,
        maxSize: 90,
        enableResizing: false,
        cell: ({ row }) => {
          const data = row.original;
          if ('isGroupRow' in data && data.isGroupRow) {
            return (
              <div className="text-center">
                <button
                  onClick={() => setDrilldownRow(data)}
                  className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-all inline-flex items-center justify-center"
                  title="View details"
                >
                  <Eye className="w-5 h-5 text-blue-700" />
                </button>
              </div>
            );
          }
          return null;
        },
      },
    ];

    return baseColumns;
  }, [viewMode, expandedGroups, toggleGroup, columnWidths]);

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

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting: viewMode === 'grouped' ? [] : sorting, // Disable table sorting for grouped mode
      pagination,
    },
    onSortingChange: viewMode === 'grouped' ? undefined : setSortingState, // Disable sorting handler for grouped mode
    onPaginationChange: setPagination,
    onColumnSizingChange: (updater) => {
      if (typeof updater === 'function') {
        const newSizing = updater(table.getState().columnSizing);
        Object.entries(newSizing).forEach(([columnId, width]) => {
          setColumnWidth(columnId, width as number);
        });
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: viewMode === 'grouped',
    manualSorting: viewMode === 'grouped', // Use manual sorting for grouped mode
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
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
    <div className="space-y-6">
      {/* Control Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-5 shadow-xl"
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 border-2 border-gray-300 shadow-sm">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                viewMode === 'grouped'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <List className="w-5 h-5" />
              Grouped
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                viewMode === 'flat'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <TableIcon className="w-5 h-5" />
              Flat
            </button>
          </div>

          {/* Group By Selector */}
          {viewMode === 'grouped' && (
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="px-5 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none font-semibold transition-all bg-white shadow-sm"
            >
              {groupByOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {/* Ranking Criteria Selector */}
          {viewMode === 'grouped' && (
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600" />
              <select
                value={rankingMetric}
                onChange={(e) => setRankingMetric(e.target.value as RankingMetric)}
                className="px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-200 outline-none font-semibold transition-all bg-white shadow-sm"
              >
                {rankingOptions.map((metric) => (
                  <option key={metric} value={metric}>
                    Rank by {getMetricLabel(metric)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Export Button */}
          <button className="ml-auto px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold hover:shadow-xl transition-all flex items-center gap-2 shadow-lg">
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-gradient-to-r from-blue-800 via-blue-900 to-blue-800">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: `${header.getSize()}px`, minWidth: `${header.getSize()}px` }}
                      className="px-3 py-3 text-left text-xs font-bold text-white uppercase tracking-wider relative group border-r border-blue-700 last:border-r-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="whitespace-nowrap min-w-0 flex-1">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {header.column.getCanSort() && (
                          <button
                            onClick={header.column.getToggleSortingHandler()}
                            className="opacity-70 hover:opacity-100 transition-opacity"
                          >
                            {header.column.getIsSorted() === 'asc' && <ArrowUp className="w-4 h-4" />}
                            {header.column.getIsSorted() === 'desc' && <ArrowDown className="w-4 h-4" />}
                            {!header.column.getIsSorted() && <ArrowUp className="w-4 h-4 opacity-40" />}
                          </button>
                        )}
                      </div>
                      {/* Resize Handle */}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`absolute right-0 top-0 h-full w-2 bg-blue-400 opacity-0 hover:opacity-100 cursor-col-resize transition-opacity ${
                            header.column.getIsResizing() ? 'opacity-100 bg-blue-300' : ''
                          }`}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map((row) => {
                const isGroupRow = 'isGroupRow' in row.original && row.original.isGroupRow;
                return (
                  <tr
                    key={row.id}
                    style={{ height: '35px', maxHeight: '35px' }}
                    className={`transition-all ${
                      isGroupRow
                        ? 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 font-semibold cursor-pointer'
                        : 'hover:bg-blue-50'
                    }`}
                    onClick={() => {
                      if (isGroupRow) {
                        setDrilldownRow(row.original as GroupedRow);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{ width: `${cell.column.getSize()}px`, height: '35px', maxHeight: '35px' }}
                        className="px-3 py-2 text-sm border-r border-gray-100 last:border-r-0 overflow-hidden"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            {/* Totals Footer */}
            <tfoot className="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200">
              <tr style={{ height: '40px', maxHeight: '40px' }}>
                {table.getHeaderGroups()[0].headers.map((header, idx) => {
                  const colId = header.id;
                  let content = null;

                  if (idx === 0) content = null;
                  else if (idx === 1) content = null;
                  else if (idx === 2) content = <span className="font-bold text-gray-900 text-base">TOTALS</span>;
                  else if (colId === 'classes') content = <div className="text-center font-bold text-gray-900">{formatNumber(totals.classes)}</div>;
                  else if (colId === 'totalCheckIns') content = <div className="text-center font-bold text-green-700">{formatNumber(totals.totalCheckIns)}</div>;
                  else if (colId === 'classAvg') content = <div className="text-center font-bold text-blue-700 text-base">{formatNumber(totals.classAvg, 1)}</div>;
                  else if (colId === 'fillRate') content = <div className="text-center font-bold text-gray-900">{formatPercentage(totals.fillRate)}</div>;
                  else if (colId === 'totalRevenue') content = <div className="text-right font-bold text-green-700 text-base">{formatCurrency(totals.totalRevenue, true)}</div>;
                  
                  return (
                    <td
                      key={header.id}
                      style={{ width: `${header.getSize()}px`, height: '40px', maxHeight: '40px' }}
                      className="px-3 py-2 text-sm border-r border-gray-400 last:border-r-0 overflow-hidden"
                    >
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
          <div className="flex items-center justify-between px-6 py-5 bg-gray-50 border-t-2 border-gray-300">
            <div className="text-sm font-medium text-gray-700">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                tableData.length
              )}{' '}
              of {tableData.length} results
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-5 py-2.5 rounded-lg border-2 border-gray-400 font-semibold hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Previous
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-5 py-2.5 rounded-lg border-2 border-gray-400 font-semibold hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Drilldown Modal */}
      {drilldownRow && <DrilldownModal row={drilldownRow} onClose={() => setDrilldownRow(null)} />}
    </div>
  );
}
