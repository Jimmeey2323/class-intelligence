import { useState, useMemo } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/calculations';
import { TrendingUp, Users, DollarSign, Calendar, AlertCircle, Target, X, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

interface MetricModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function MetricModal({ title, onClose, children }: MetricModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="glass-card rounded-3xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function MetricsCards() {
  const { filteredData } = useDashboardStore();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // Use filtered session data directly
  const sessions = filteredData;

  const metrics = useMemo(() => {
    if (sessions.length === 0) {
      return {
        totalClasses: 0,
        totalCheckIns: 0,
        fillRate: 0,
        totalRevenue: 0,
        cancellationRate: 0,
        consistencyScore: 0,
        avgClassSize: 0,
      };
    }

    const totalClasses = sessions.length;
    const totalCheckIns = sessions.reduce((sum: number, s: any) => sum + s.CheckedIn, 0);
    const totalCapacity = sessions.reduce((sum: number, s: any) => sum + s.Capacity, 0);
    const totalRevenue = sessions.reduce((sum: number, s: any) => sum + s.Revenue, 0);
    const totalBooked = sessions.reduce((sum: number, s: any) => sum + s.Booked, 0);
    const totalCancellations = sessions.reduce((sum: number, s: any) => sum + s.LateCancelled, 0);

    const fillRate = totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0;
    const cancellationRate = totalBooked > 0 ? (totalCancellations / totalBooked) * 100 : 0;
    const avgClassSize = totalClasses > 0 ? totalCheckIns / totalClasses : 0;

    // Consistency: variance of attendance
    const variance = sessions.reduce((sum: number, s: any) => {
      const diff = s.CheckedIn - avgClassSize;
      return sum + diff * diff;
    }, 0) / totalClasses;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = avgClassSize > 0 ? Math.max(0, 100 - (stdDev / avgClassSize) * 100) : 0;

    return {
      totalClasses,
      totalCheckIns,
      fillRate,
      totalRevenue,
      cancellationRate,
      consistencyScore,
      avgClassSize,
    };
  }, [sessions]);

  // Generate time series data for charts
  const timeSeriesData = useMemo(() => {
    if (sessions.length === 0) return [];

    const dateMap = new Map<string, { checkIns: number, revenue: number, classes: number }>();
    
    sessions.forEach((session: any) => {
      const dateKey = session.Date;
      const existing = dateMap.get(dateKey) || { checkIns: 0, revenue: 0, classes: 0 };
      dateMap.set(dateKey, {
        checkIns: existing.checkIns + session.CheckedIn,
        revenue: existing.revenue + session.Revenue,
        classes: existing.classes + 1,
      });
    });

    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        checkIns: data.checkIns,
        revenue: data.revenue,
        classes: data.classes,
        avgClass: data.classes > 0 ? data.checkIns / data.classes : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [sessions]);

  const cards = [
    {
      id: 'classes',
      title: 'Total Classes',
      value: formatNumber(metrics.totalClasses),
      icon: Calendar,
      gradient: 'from-blue-600 to-blue-800',
      bgGradient: 'from-blue-50 to-blue-100',
      chartData: timeSeriesData.map(d => ({ value: d.classes })),
      chartColor: '#2563eb',
    },
    {
      id: 'checkIns',
      title: 'Check-ins',
      value: formatNumber(metrics.totalCheckIns),
      icon: Users,
      gradient: 'from-green-600 to-green-800',
      bgGradient: 'from-green-50 to-green-100',
      chartData: timeSeriesData.map(d => ({ value: d.checkIns })),
      chartColor: '#16a34a',
    },
    {
      id: 'fillRate',
      title: 'Fill Rate',
      value: formatPercentage(metrics.fillRate),
      icon: Target,
      gradient: 'from-purple-600 to-purple-800',
      bgGradient: 'from-purple-50 to-purple-100',
      chartData: timeSeriesData.map(d => ({ value: d.avgClass })),
      chartColor: '#9333ea',
    },
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: formatCurrency(metrics.totalRevenue, true),
      icon: DollarSign,
      gradient: 'from-emerald-600 to-emerald-800',
      bgGradient: 'from-emerald-50 to-emerald-100',
      chartData: timeSeriesData.map(d => ({ value: d.revenue })),
      chartColor: '#059669',
    },
    {
      id: 'cancellations',
      title: 'Cancellation Rate',
      value: formatPercentage(metrics.cancellationRate),
      icon: AlertCircle,
      gradient: 'from-orange-600 to-orange-800',
      bgGradient: 'from-orange-50 to-orange-100',
      chartData: timeSeriesData.map(d => ({ value: d.classes })),
      chartColor: '#ea580c',
    },
    {
      id: 'consistency',
      title: 'Consistency',
      value: formatPercentage(metrics.consistencyScore),
      icon: TrendingUp,
      gradient: 'from-cyan-600 to-cyan-800',
      bgGradient: 'from-cyan-50 to-cyan-100',
      chartData: timeSeriesData.map(d => ({ value: d.avgClass })),
      chartColor: '#0891b2',
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const isHovered = hoveredCard === card.id;

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => setSelectedMetric(card.id)}
              className="relative glass-card rounded-2xl p-5 sm:p-4 cursor-pointer overflow-hidden group hover:shadow-2xl transition-all duration-300 active:scale-95 touch-manipulation min-h-[120px] sm:min-h-[140px]"
              whileHover={{ y: -6, scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Gradient Top Border */}
              <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${card.gradient}`} />

              {/* Background Pattern */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />

              <div className="relative z-10">
                <div className="flex flex-col items-center mb-3">
                  <div className={`p-3 sm:p-2.5 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                    <Icon className="w-6 h-6 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider text-center mb-2">
                    {card.title}
                  </p>
                  <p className="text-3xl sm:text-2xl font-bold text-gray-900 text-center transition-colors duration-300 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent">{card.value}</p>
                </div>

                {/* Hover Chart */}
                <AnimatePresence>
                  {isHovered && card.chartData.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 80 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4"
                    >
                      <ResponsiveContainer width="100%" height={80}>
                        <AreaChart data={card.chartData}>
                          <defs>
                            <linearGradient id={`gradient-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={card.chartColor} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={card.chartColor} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="glass-card rounded-lg p-2 shadow-xl">
                                    <p className="text-sm font-bold">{formatNumber(payload[0].value as number, 1)}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke={card.chartColor}
                            strokeWidth={2}
                            fill={`url(#gradient-${card.id})`}
                            isAnimationActive={true}
                            animationDuration={500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Click indicator */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isHovered ? 1 : 0 }}
                  className="absolute bottom-3 right-3 flex items-center gap-1 text-xs font-semibold text-gray-500"
                >
                  <BarChart2 className="w-3 h-3" />
                  Click for details
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Drilldown Modals */}
      <AnimatePresence>
        {selectedMetric && (
          <MetricModal
            title={cards.find(c => c.id === selectedMetric)?.title || ''}
            onClose={() => setSelectedMetric(null)}
          >
            <div className="space-y-6">
              {/* Large Chart */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Trend Analysis</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="mainGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="glass-card rounded-lg p-3 shadow-xl">
                              <p className="text-sm font-bold text-gray-800">
                                {formatNumber(payload[0].value as number, 1)}
                              </p>
                              <p className="text-xs text-gray-600">
                                {payload[0].payload.date}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={selectedMetric === 'revenue' ? 'revenue' : selectedMetric === 'checkIns' ? 'checkIns' : 'avgClass'}
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Average</p>
                  <p className="text-xl font-bold text-blue-600">
                    {selectedMetric === 'revenue' 
                      ? formatCurrency(metrics.totalRevenue / metrics.totalClasses, true)
                      : selectedMetric === 'checkIns'
                      ? formatNumber(metrics.avgClassSize, 1)
                      : formatNumber(metrics.totalClasses / timeSeriesData.length, 1)}
                  </p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Days</p>
                  <p className="text-xl font-bold text-green-600">{timeSeriesData.length}</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Peak Day</p>
                  <p className="text-xl font-bold text-purple-600">
                    {timeSeriesData.length > 0 
                      ? Math.max(...timeSeriesData.map(d => selectedMetric === 'revenue' ? d.revenue : d.checkIns))
                      : 0}
                  </p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Low Day</p>
                  <p className="text-xl font-bold text-orange-600">
                    {timeSeriesData.length > 0 
                      ? Math.min(...timeSeriesData.map(d => selectedMetric === 'revenue' ? d.revenue : d.checkIns))
                      : 0}
                  </p>
                </div>
              </div>
            </div>
          </MetricModal>
        )}
      </AnimatePresence>
    </>
  );
}
