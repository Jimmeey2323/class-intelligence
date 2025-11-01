import { Fragment, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, TrendingUp, TrendingDown, Calendar, Users, DollarSign, AlertCircle, Award, MapPin } from 'lucide-react';
import { SessionData } from '../types';
import { formatCurrency, formatPercentage } from '../utils/calculations';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface EnhancedDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionData[];
  title: string;
}

export default function EnhancedDrilldownModal({ isOpen, onClose, sessions, title }: EnhancedDrilldownModalProps) {

  // Sort sessions by date
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
  }, [sessions]);

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    const totalSessions = sessions.length;
    const totalCheckIns = sessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0);
    const totalCapacity = sessions.reduce((sum, s) => sum + (s.Capacity || 0), 0);
    const totalRevenue = sessions.reduce((sum, s) => sum + (s.Revenue || 0), 0);
    const totalCancellations = sessions.reduce((sum, s) => sum + (s.LateCancelled || 0), 0);
    const totalBooked = sessions.reduce((sum, s) => sum + (s.Booked || 0), 0);
    const totalWaitlisted = sessions.reduce((sum, s) => sum + (s.Waitlisted || 0), 0);
    
    const avgFillRate = totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0;
    const avgCheckIns = totalSessions > 0 ? totalCheckIns / totalSessions : 0;
    const avgRevenue = totalSessions > 0 ? totalRevenue / totalSessions : 0;
    const cancellationRate = totalBooked > 0 ? (totalCancellations / totalBooked) * 100 : 0;
    const waitlistRate = totalCapacity > 0 ? (totalWaitlisted / totalCapacity) * 100 : 0;
    
    // Trend analysis - compare first half vs second half
    const midPoint = Math.floor(totalSessions / 2);
    const firstHalf = sessions.slice(0, midPoint);
    const secondHalf = sessions.slice(midPoint);
    
    const firstHalfAvg = firstHalf.length > 0 
      ? firstHalf.reduce((sum, s) => sum + (s.CheckedIn || 0), 0) / firstHalf.length 
      : 0;
    const secondHalfAvg = secondHalf.length > 0 
      ? secondHalf.reduce((sum, s) => sum + (s.CheckedIn || 0), 0) / secondHalf.length 
      : 0;
    
    const trend = secondHalfAvg > firstHalfAvg ? 'growing' : secondHalfAvg < firstHalfAvg ? 'declining' : 'stable';
    const trendPercentage = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
    
    // Get unique trainers
    const trainers = [...new Set(sessions.map(s => s.Trainer))];
    const locations = [...new Set(sessions.map(s => s.Location))];
    
    // Best and worst performing sessions
    const bestSession = sessions.reduce((best, curr) => 
      (curr.CheckedIn || 0) > (best.CheckedIn || 0) ? curr : best
    , sessions[0]);
    
    const worstSession = sessions.reduce((worst, curr) => 
      (curr.CheckedIn || 0) < (worst.CheckedIn || 0) ? curr : worst
    , sessions[0]);
    
    return {
      totalSessions,
      totalCheckIns,
      totalCapacity,
      totalRevenue,
      totalCancellations,
      totalWaitlisted,
      avgFillRate,
      avgCheckIns,
      avgRevenue,
      cancellationRate,
      waitlistRate,
      trend,
      trendPercentage,
      trainers,
      locations,
      bestSession,
      worstSession,
    };
  }, [sessions]);

  // Chart data
  const chartData = useMemo(() => {
    return sortedSessions.map(session => ({
      date: format(parseISO(session.Date), 'MMM d'),
      checkIns: session.CheckedIn || 0,
      capacity: session.Capacity || 0,
      fillRate: session.Capacity > 0 ? ((session.CheckedIn || 0) / session.Capacity) * 100 : 0,
      revenue: session.Revenue || 0,
      cancellations: session.LateCancelled || 0,
    }));
  }, [sortedSessions]);

  // Trainer performance breakdown
  const trainerStats = useMemo(() => {
    const stats = new Map<string, { sessions: number; checkIns: number; revenue: number }>();
    
    sessions.forEach(session => {
      const current = stats.get(session.Trainer) || { sessions: 0, checkIns: 0, revenue: 0 };
      stats.set(session.Trainer, {
        sessions: current.sessions + 1,
        checkIns: current.checkIns + (session.CheckedIn || 0),
        revenue: current.revenue + (session.Revenue || 0),
      });
    });
    
    return Array.from(stats.entries())
      .map(([trainer, data]) => ({
        trainer,
        ...data,
        avgCheckIns: data.sessions > 0 ? data.checkIns / data.sessions : 0,
      }))
      .sort((a, b) => b.avgCheckIns - a.avgCheckIns);
  }, [sessions]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl p-8 shadow-2xl border border-white/50 transition-all">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <Dialog.Title className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      {title}
                    </Dialog.Title>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {sessions.length} sessions analyzed
                      </span>
                      {sessions.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {[...new Set(sessions.map(s => s.Location))].join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                {/* Empty State */}
                {sessions.length === 0 && (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Sessions Found</h3>
                    <p className="text-gray-500 mb-6">
                      No matching sessions were found for the selected class. This could be because:
                    </p>
                    <div className="text-left max-w-md mx-auto space-y-2 text-sm text-gray-600">
                      <p>• The class format, time, or location doesn't match exactly</p>
                      <p>• The selected filters are too restrictive</p>
                      <p>• This is a new class with no historical data</p>
                    </div>
                    <button
                      onClick={onClose}
                      className="mt-6 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                      Close
                    </button>
                  </div>
                )}

                {/* Content - only show if we have sessions */}
                {sessions.length > 0 && (
                  <div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">Avg Check-ins</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-900">{metrics.avgCheckIns.toFixed(1)}</div>
                    <div className="text-xs text-blue-700 mt-1">per session</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="text-xs font-medium text-green-600">Fill Rate</span>
                    </div>
                    <div className="text-3xl font-bold text-green-900">{formatPercentage(metrics.avgFillRate)}</div>
                    <div className="text-xs text-green-700 mt-1">average capacity</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-purple-600" />
                      <span className="text-xs font-medium text-purple-600">Revenue</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-900">{formatCurrency(metrics.totalRevenue)}</div>
                    <div className="text-xs text-purple-700 mt-1">{formatCurrency(metrics.avgRevenue)} avg</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`bg-gradient-to-br rounded-2xl p-4 border ${
                      metrics.trend === 'growing' 
                        ? 'from-emerald-50 to-emerald-100 border-emerald-200' 
                        : metrics.trend === 'declining'
                        ? 'from-red-50 to-red-100 border-red-200'
                        : 'from-gray-50 to-gray-100 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {metrics.trend === 'growing' ? (
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      ) : metrics.trend === 'declining' ? (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-600" />
                      )}
                      <span className={`text-xs font-medium ${
                        metrics.trend === 'growing' ? 'text-emerald-600' : 
                        metrics.trend === 'declining' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        Trend
                      </span>
                    </div>
                    <div className={`text-3xl font-bold ${
                      metrics.trend === 'growing' ? 'text-emerald-900' : 
                      metrics.trend === 'declining' ? 'text-red-900' : 'text-gray-900'
                    }`}>
                      {metrics.trend === 'stable' ? '→' : metrics.trendPercentage > 0 ? '+' : ''}{metrics.trend === 'stable' ? 'Stable' : `${metrics.trendPercentage.toFixed(1)}%`}
                    </div>
                    <div className={`text-xs mt-1 ${
                      metrics.trend === 'growing' ? 'text-emerald-700' : 
                      metrics.trend === 'declining' ? 'text-red-700' : 'text-gray-700'
                    }`}>
                      {metrics.trend} attendance
                    </div>
                  </motion.div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Attendance Trend */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Attendance Trend</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorCheckIns" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="checkIns" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCheckIns)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Fill Rate Over Time */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Fill Rate %</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="fillRate" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Trainer Performance */}
                {trainerStats.length > 1 && (
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6 border border-indigo-200 mb-8">
                    <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Trainer Performance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {trainerStats.map((stat, idx) => (
                        <div key={stat.trainer} className="bg-white rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-800">{stat.trainer}</span>
                            {idx === 0 && <Award className="w-4 h-4 text-yellow-500" />}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Sessions: <span className="font-semibold">{stat.sessions}</span></div>
                            <div>Avg Check-ins: <span className="font-semibold">{stat.avgCheckIns.toFixed(1)}</span></div>
                            <div>Revenue: <span className="font-semibold">{formatCurrency(stat.revenue)}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Best & Worst Sessions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
                    <h4 className="font-bold text-green-900 mb-2">🏆 Best Session</h4>
                    <div className="text-sm text-green-800 space-y-1">
                      <div>{format(parseISO(metrics.bestSession.Date), 'MMM d, yyyy')}</div>
                      <div>{metrics.bestSession.Trainer}</div>
                      <div className="font-semibold">{metrics.bestSession.CheckedIn}/{metrics.bestSession.Capacity} ({formatPercentage((metrics.bestSession.CheckedIn / metrics.bestSession.Capacity) * 100)})</div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-4 border border-amber-200">
                    <h4 className="font-bold text-amber-900 mb-2">📉 Lowest Session</h4>
                    <div className="text-sm text-amber-800 space-y-1">
                      <div>{format(parseISO(metrics.worstSession.Date), 'MMM d, yyyy')}</div>
                      <div>{metrics.worstSession.Trainer}</div>
                      <div className="font-semibold">{metrics.worstSession.CheckedIn}/{metrics.worstSession.Capacity} ({formatPercentage((metrics.worstSession.CheckedIn / metrics.worstSession.Capacity) * 100)})</div>
                    </div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-2xl font-bold text-gray-900">{metrics.totalCancellations}</div>
                    <div className="text-xs text-gray-600">Cancellations ({formatPercentage(metrics.cancellationRate)})</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-2xl font-bold text-gray-900">{metrics.totalWaitlisted}</div>
                    <div className="text-xs text-gray-600">Waitlisted ({formatPercentage(metrics.waitlistRate)})</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-2xl font-bold text-gray-900">{metrics.totalCheckIns}</div>
                    <div className="text-xs text-gray-600">Total Check-ins</div>
                  </div>
                </div>

                {/* Sessions Table */}
                <div className="overflow-auto max-h-64 rounded-2xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Trainer</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Check-ins</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Fill Rate</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Cancellations</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {sortedSessions.map((session, idx) => {
                        const fillRate = session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0;
                        const isInactive = session.Status === 'Inactive';
                        return (
                          <tr 
                            key={idx} 
                            className={`hover:bg-blue-50/50 transition-colors ${isInactive ? 'opacity-40 bg-gray-50/50' : ''}`}
                          >
                            <td className={`px-4 py-3 text-sm ${isInactive ? 'text-gray-400' : 'text-gray-900'}`}>
                              {format(parseISO(session.Date), 'MMM d, yyyy')}
                            </td>
                            <td className={`px-4 py-3 text-sm ${isInactive ? 'text-gray-400' : 'text-gray-700'}`}>
                              {session.Trainer}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${isInactive ? 'text-gray-400' : 'text-gray-900'}`}>
                              {session.CheckedIn}/{session.Capacity}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={`font-semibold ${isInactive ? 'text-gray-400' :
                                fillRate >= 80 ? 'text-green-600' :
                                fillRate >= 50 ? 'text-blue-600' :
                                'text-amber-600'
                              }`}>
                                {formatPercentage(fillRate)}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${isInactive ? 'text-gray-400' : 'text-gray-900'}`}>
                              {formatCurrency(session.Revenue)}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right ${isInactive ? 'text-gray-400' : 'text-gray-700'}`}>
                              {session.LateCancelled}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Actions */}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Close
                  </button>
                </div>
                </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
