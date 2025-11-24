import { Fragment, useMemo, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { SessionData } from '../types';
import { formatCurrency, formatPercentage } from '../utils/calculations';
import { format, parseISO } from 'date-fns';

interface EnhancedDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionData[];
  title: string;
}

export default function EnhancedDrilldownModal({ isOpen, onClose, sessions, title }: EnhancedDrilldownModalProps) {
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
  }, [sessions]);

  const [search, setSearch] = useState('');
  const [filterTrainer, setFilterTrainer] = useState('All Trainers');
  const [filterLocation, setFilterLocation] = useState('All Locations');
  const [filterDay, setFilterDay] = useState('All Days');

  const trainers = useMemo(() => Array.from(new Set(sessions.map(s => s.Trainer).filter(Boolean))).sort(), [sessions]);
  const locations = useMemo(() => Array.from(new Set(sessions.map(s => s.Location).filter(Boolean))).sort(), [sessions]);
  const days = useMemo(() => Array.from(new Set(sessions.map(s => format(parseISO(s.Date), 'EEEE')).filter(Boolean))), [sessions]);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedSessions.filter(s => {
      if (filterTrainer !== 'All Trainers' && s.Trainer !== filterTrainer) return false;
      if (filterLocation !== 'All Locations' && s.Location !== filterLocation) return false;
      if (filterDay !== 'All Days' && format(parseISO(s.Date), 'EEEE') !== filterDay) return false;
      if (!q) return true;
      const hay = `${s.SessionName || s.Class || ''} ${s.Trainer || ''} ${s.Location || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [sortedSessions, search, filterTrainer, filterLocation, filterDay]);

  const metrics = useMemo(() => {
    const totalSessions = sessions.length;
    const emptySessions = sessions.filter(s => (s.CheckedIn || 0) === 0).length;
    const nonEmptySessions = totalSessions - emptySessions;
    
    const totalCheckIns = sessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0);
    const totalCapacity = sessions.reduce((sum, s) => sum + (s.Capacity || 0), 0);
    const totalRevenue = sessions.reduce((sum, s) => sum + (s.Revenue || 0), 0);
    const totalCancellations = sessions.reduce((sum, s) => sum + (s.LateCancelled || 0), 0);
    const totalBooked = sessions.reduce((sum, s) => sum + (s.Booked || 0), 0);
    const totalWaitlisted = sessions.reduce((sum, s) => sum + (s.Waitlisted || 0), 0);

    const avgFillRate = totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0;
    const avgCheckIns = totalSessions > 0 ? totalCheckIns / totalSessions : 0;
    const avgCheckInsWithoutEmpty = nonEmptySessions > 0 ? totalCheckIns / nonEmptySessions : 0;
    const avgRevenue = totalSessions > 0 ? totalRevenue / totalSessions : 0;
    const cancellationRate = totalBooked > 0 ? (totalCancellations / totalBooked) * 100 : 0;
    const waitlistRate = totalCapacity > 0 ? (totalWaitlisted / totalCapacity) * 100 : 0;
    const revenuePerSeat = totalCheckIns > 0 ? totalRevenue / totalCheckIns : 0;
    const revenueLostToCancellation = totalCancellations * revenuePerSeat;

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

    const bestSession = sessions.length > 0 ? sessions.reduce((best, s) => (s.CheckedIn || 0) > (best.CheckedIn || 0) ? s : best, sessions[0]) : ({} as SessionData);
    const worstSession = sessions.length > 0 ? sessions.reduce((worst, s) => (s.CheckedIn || 0) < (worst.CheckedIn || 0) ? s : worst, sessions[0]) : ({} as SessionData);

    // Generate data-driven recommendations
    const recommendations: Array<{ title: string; description: string; data: string; priority: 'high' | 'medium' | 'low' }> = [];
    
    if (emptySessions > totalSessions * 0.2) {
      recommendations.push({
        title: 'High Empty Session Rate',
        description: `${emptySessions} out of ${totalSessions} sessions (${((emptySessions/totalSessions)*100).toFixed(1)}%) had zero attendance. Consider canceling unpopular time slots or improving marketing.`,
        data: `Empty sessions: ${emptySessions} | Total: ${totalSessions}`,
        priority: 'high'
      });
    }
    
    if (avgFillRate < 50) {
      recommendations.push({
        title: 'Low Fill Rate',
        description: `Average fill rate is ${avgFillRate.toFixed(1)}%, significantly below the 70% benchmark. Consider reducing capacity, adjusting pricing, or improving promotion.`,
        data: `Avg fill rate: ${avgFillRate.toFixed(1)}% | Check-ins: ${totalCheckIns} | Capacity: ${totalCapacity}`,
        priority: 'high'
      });
    } else if (avgFillRate > 90) {
      recommendations.push({
        title: 'High Demand - Capacity Expansion Opportunity',
        description: `Classes are ${avgFillRate.toFixed(1)}% full on average. Consider adding another session or increasing capacity to capture more revenue.`,
        data: `Avg fill rate: ${avgFillRate.toFixed(1)}% | Waitlisted: ${totalWaitlisted}`,
        priority: 'medium'
      });
    }
    
    if (cancellationRate > 15) {
      recommendations.push({
        title: 'High Cancellation Rate',
        description: `${cancellationRate.toFixed(1)}% of bookings result in late cancellations. Review cancellation policies and send better reminders.`,
        data: `Cancellations: ${totalCancellations} | Bookings: ${totalBooked} | Revenue Lost: ${formatCurrency(revenueLostToCancellation)}`,
        priority: 'high'
      });
    }
    
    if (trend === 'declining' && Math.abs(trendPercentage) > 10) {
      recommendations.push({
        title: 'Declining Attendance Trend',
        description: `Attendance has declined by ${Math.abs(trendPercentage).toFixed(1)}% between the first and second half of the period. Investigate causes and take corrective action.`,
        data: `First half avg: ${firstHalfAvg.toFixed(1)} | Second half avg: ${secondHalfAvg.toFixed(1)}`,
        priority: 'high'
      });
    } else if (trend === 'growing' && trendPercentage > 10) {
      recommendations.push({
        title: 'Growing Attendance',
        description: `Attendance has increased by ${trendPercentage.toFixed(1)}%. Great job! Consider replicating this success in other classes.`,
        data: `First half avg: ${firstHalfAvg.toFixed(1)} | Second half avg: ${secondHalfAvg.toFixed(1)}`,
        priority: 'low'
      });
    }
    
    if (waitlistRate > 10) {
      recommendations.push({
        title: 'Consistent Waitlists',
        description: `${waitlistRate.toFixed(1)}% of capacity is waitlisted on average. Strong indicator for capacity expansion or additional time slots.`,
        data: `Total waitlisted: ${totalWaitlisted} | Capacity: ${totalCapacity}`,
        priority: 'medium'
      });
    }
    
    if (revenuePerSeat < 2000) {
      recommendations.push({
        title: 'Low Revenue Per Seat',
        description: `Revenue per seat is ${formatCurrency(revenuePerSeat)}, which is below optimal. Review pricing strategy or reduce discounts.`,
        data: `Total revenue: ${formatCurrency(totalRevenue)} | Check-ins: ${totalCheckIns}`,
        priority: 'medium'
      });
    }

    return {
      totalSessions,
      emptySessions,
      nonEmptySessions,
      totalCheckIns,
      totalCapacity,
      totalRevenue,
      totalCancellations,
      totalBooked,
      totalWaitlisted,
      avgFillRate,
      avgCheckIns,
      avgCheckInsWithoutEmpty,
      avgRevenue,
      cancellationRate,
      waitlistRate,
      revenuePerSeat,
      revenueLostToCancellation,
      trend,
      trendPercentage,
      bestSession,
      worstSession,
      recommendations
    };
  }, [sessions]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose} open={isOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 text-center md:items-center md:p-6 lg:p-8">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-7xl transform rounded-3xl bg-white/80 glass-card text-left align-middle shadow-2xl transition-all max-h-[90vh] overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Left Profile Pane */}
                  {(() => {
                    const uniqueTrainers = Array.from(new Set(sessions.map(s => s.Trainer).filter(Boolean)));
                    const trainerName = uniqueTrainers.length === 1 ? uniqueTrainers[0] : 'Multiple Trainers';
                    const primaryLocation = Array.from(new Set(sessions.map(s => s.Location).filter(Boolean)))[0] || 'Multiple Locations';
                    const primaryClass = Array.from(new Set(sessions.map(s => s.Class).filter(Boolean)))[0] || 'Multiple Classes';
                    const activeDays = Array.from(new Set(sessions.map(s => s.Day).filter(Boolean))).length;
                    const avgRevenuePerSession = metrics.totalSessions > 0 ? metrics.totalRevenue / metrics.totalSessions : 0;
                    const avgCapacityUtilized = metrics.totalCapacity > 0 ? (metrics.totalCheckIns / metrics.totalCapacity) * 100 : 0;
                    const avgCancellationImpact = metrics.totalCancellations > 0 ? metrics.revenueLostToCancellation / metrics.totalCancellations : 0;
                    return (
                      <div className="md:w-1/3 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white p-8 flex flex-col gap-6 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-start justify-between">
                          <h2 className="text-2xl font-bold tracking-tight">{primaryClass}</h2>
                          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" aria-label="Close profile">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        {/* Top 5 Trainers */}
                        <div className="relative w-full rounded-2xl shadow-xl border border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs uppercase tracking-wider opacity-80">Top Performers</span>
                              <span className="text-lg font-semibold">{primaryClass}</span>
                            </div>
                            
                            {(() => {
                              // Calculate trainer statistics
                              const trainerStats = sessions.reduce((acc, session) => {
                                const trainer = session.Trainer || 'Unknown';
                                if (!acc[trainer]) {
                                  acc[trainer] = {
                                    name: trainer,
                                    sessions: 0,
                                    totalCheckIns: 0,
                                    totalCapacity: 0,
                                    totalRevenue: 0,
                                    totalCancellations: 0,
                                  };
                                }
                                acc[trainer].sessions += 1;
                                acc[trainer].totalCheckIns += session.CheckedIn || 0;
                                acc[trainer].totalCapacity += session.Capacity || 0;
                                acc[trainer].totalRevenue += session.Revenue || 0;
                                acc[trainer].totalCancellations += session.LateCancelled || 0;
                                return acc;
                              }, {} as Record<string, { name: string; sessions: number; totalCheckIns: number; totalCapacity: number; totalRevenue: number; totalCancellations: number }>);
                              
                              // Calculate metrics and sort
                              const trainersWithMetrics = Object.values(trainerStats).map(t => ({
                                ...t,
                                avgAttendance: t.sessions > 0 ? t.totalCheckIns / t.sessions : 0,
                                fillRate: t.totalCapacity > 0 ? (t.totalCheckIns / t.totalCapacity) * 100 : 0,
                                avgRevenue: t.sessions > 0 ? t.totalRevenue / t.sessions : 0,
                              })).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
                              
                              return trainersWithMetrics.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                  {trainersWithMetrics.map((trainer, index) => (
                                    <div 
                                      key={trainer.name} 
                                      className="flex flex-col gap-2 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                                      style={{ animation: `slideIn 0.3s ease-out ${index * 0.1}s both` }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg font-bold text-blue-400">#{index + 1}</span>
                                          <span className="font-semibold text-white">{trainer.name}</span>
                                        </div>
                                        <span className="text-xs text-white/60">{trainer.sessions} sessions</span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="flex flex-col">
                                          <span className="text-white/60">Avg Attendance</span>
                                          <span className="font-bold text-green-400">{trainer.avgAttendance.toFixed(1)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-white/60">Fill Rate</span>
                                          <span className="font-bold text-blue-400">{trainer.fillRate.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-white/60">Avg Revenue</span>
                                          <span className="font-bold text-amber-400">{formatCurrency(trainer.avgRevenue)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center text-white/60 py-8">
                                  No trainer data available
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        
                        <style>{`
                          @keyframes slideIn {
                            from {
                              transform: translateX(-20px);
                              opacity: 0;
                            }
                            to {
                              transform: translateX(0);
                              opacity: 1;
                            }
                          }
                        `}</style>
                        <div className="grid grid-cols-2 gap-2" aria-label="Core trainer stats">
                          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all duration-300">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-white/50 mb-1">Sessions</div>
                            <div className="text-2xl font-bold">{metrics.totalSessions}</div>
                          </div>
                          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all duration-300">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-white/50 mb-1">Avg Attend</div>
                            <div className="text-2xl font-bold">{metrics.avgCheckIns.toFixed(1)}</div>
                          </div>
                          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all duration-300">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-white/50 mb-1">Fill Rate</div>
                            <div className="text-2xl font-bold">{formatPercentage(metrics.avgFillRate)}</div>
                          </div>
                          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all duration-300">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-white/50 mb-1">Cancel</div>
                            <div className="text-2xl font-bold">{formatPercentage(metrics.cancellationRate)}</div>
                          </div>
                          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all duration-300 col-span-2">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-white/50 mb-1">Total Revenue</div>
                            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-white/10 rounded-xl p-4" aria-label="Class profile summary">
                            <div className="text-xs font-semibold uppercase tracking-wide mb-2 opacity-80">Class Details</div>
                            <ul className="space-y-1 text-sm">
                              <li><span className="opacity-70">Class Name:</span> <span className="font-medium">{primaryClass}</span></li>
                              <li><span className="opacity-70">Primary Trainer:</span> <span className="font-medium">{trainerName}</span></li>
                              <li><span className="opacity-70">Primary Location:</span> <span className="font-medium">{primaryLocation}</span></li>
                              <li><span className="opacity-70">Active Days:</span> <span className="font-medium">{activeDays}</span></li>
                              <li><span className="opacity-70">Waitlist Rate:</span> <span className="font-medium">{formatPercentage(metrics.waitlistRate)}</span></li>
                              <li><span className="opacity-70">Revenue / Session:</span> <span className="font-medium">{formatCurrency(avgRevenuePerSession)}</span></li>
                              <li><span className="opacity-70">Revenue / Seat:</span> <span className="font-medium">{formatCurrency(metrics.revenuePerSeat)}</span></li>
                              <li><span className="opacity-70">Avg Capacity Utilized:</span> <span className="font-medium">{formatPercentage(avgCapacityUtilized)}</span></li>
                              <li><span className="opacity-70">Rev Lost / Cancellation:</span> <span className="font-medium">{formatCurrency(avgCancellationImpact)}</span></li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  {/* Right analytics pane */}
                  <div className="md:w-2/3 p-6 md:p-8 overflow-y-auto max-h-[90vh]">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
                        <div className="text-sm text-slate-500">Advanced profile & performance analytics</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-8">
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sessions</div>
                        <div className="text-xl font-bold text-slate-900">{metrics.totalSessions}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Empty</div>
                        <div className="text-xl font-bold text-slate-900">{metrics.emptySessions}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Non-Empty</div>
                        <div className="text-xl font-bold text-slate-900">{metrics.nonEmptySessions}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Capacity</div>
                        <div className="text-xl font-bold text-slate-900">{metrics.totalCapacity}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Booked</div>
                        <div className="text-xl font-bold text-slate-900">{metrics.totalBooked}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Checked In</div>
                        <div className="text-xl font-bold text-slate-900">{metrics.totalCheckIns}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Late Cancel</div>
                        <div className="text-xl font-bold text-slate-900">{metrics.totalCancellations}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Avg (All)</div>
                        <div className="text-xl font-bold text-slate-900">{metrics.avgCheckIns.toFixed(1)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Avg (No Empty)</div>
                        <div className="text-xl font-bold text-slate-900">{metrics.avgCheckInsWithoutEmpty.toFixed(1)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fill Rate</div>
                        <div className="text-xl font-bold text-slate-900">{formatPercentage(metrics.avgFillRate)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Waitlist Rate</div>
                        <div className="text-xl font-bold text-slate-900">{formatPercentage(metrics.waitlistRate)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cancel Rate</div>
                        <div className="text-xl font-bold text-slate-900">{formatPercentage(metrics.cancellationRate)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Revenue</div>
                        <div className="text-xl font-bold text-slate-900">{formatCurrency(metrics.totalRevenue)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rev / Seat</div>
                        <div className="text-xl font-bold text-slate-900">{formatCurrency(metrics.revenuePerSeat)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all duration-300">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rev Lost</div>
                        <div className="text-xl font-bold text-slate-900">{formatCurrency(metrics.revenueLostToCancellation)}</div>
                      </div>
                    </div>
                    {metrics.recommendations.length > 0 && (
                      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200 shadow-sm mb-8">
                        <h4 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">🤖 AI-Powered Recommendations</h4>
                        <div className="space-y-4">
                          {metrics.recommendations.map((rec, idx) => (
                            <div key={idx} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${rec.priority === 'high' ? 'border-red-500' : rec.priority === 'medium' ? 'border-yellow-500' : 'border-green-500'}`}>\n+                              <div className="flex items-start justify-between mb-2"><h5 className="font-bold text-gray-900 text-sm">{rec.title}</h5><span className={`text-xs font-bold px-2 py-1 rounded-full ${rec.priority === 'high' ? 'bg-red-100 text-red-700' : rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{rec.priority.toUpperCase()}</span></div>
                              <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                              <div className="bg-gray-50 rounded-lg p-2 border border-gray-200"><p className="text-xs text-gray-600 font-mono">📊 {rec.data}</p></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      <div className="bg-white rounded-2xl p-6 border shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4">BOOKING & CANCELLATION</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><div className="text-xs text-gray-500">Total Bookings</div><div className="text-lg font-bold text-slate-800">{metrics.totalBooked}</div></div>
                          <div><div className="text-xs text-gray-500">Late Cancellations</div><div className="text-lg font-bold text-slate-800">{metrics.totalCancellations}</div></div>
                          <div><div className="text-xs text-gray-500">Cancellation Rate</div><div className="text-lg font-bold text-red-700">{formatPercentage(metrics.cancellationRate)}</div></div>
                          <div><div className="text-xs text-gray-500">Revenue Lost (Est.)</div><div className="text-lg font-bold text-red-700">{formatCurrency(metrics.revenueLostToCancellation)}</div></div>
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl p-6 border shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4">CAPACITY & UTILIZATION</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><div className="text-xs text-gray-500">Total Capacity</div><div className="text-lg font-bold text-slate-800">{metrics.totalCapacity}</div></div>
                          <div><div className="text-xs text-gray-500">Capacity Used</div><div className="text-lg font-bold text-green-700">{metrics.totalCheckIns}</div></div>
                          <div><div className="text-xs text-gray-500">Unutilized</div><div className="text-lg font-bold text-slate-800">{metrics.totalCapacity - metrics.totalCheckIns}</div></div>
                          <div><div className="text-xs text-gray-500">Weighted Avg Utilization</div><div className="text-lg font-bold text-slate-800">{formatPercentage(metrics.avgFillRate)}</div></div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border shadow-sm">
                      <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-slate-800">Individual Sessions</h3><div className="text-sm text-slate-500">{filteredSessions.length} sessions</div></div>
                      <div className="flex flex-wrap gap-3 items-center mb-4">
                        <div className="flex items-center gap-2 flex-1 max-w-md"><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by class, trainer, or location..." className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm" /></div>
                        <select value={filterTrainer} onChange={(e) => setFilterTrainer(e.target.value)} className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"><option>All Trainers</option>{trainers.map(t => <option key={t}>{t}</option>)}</select>
                        <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"><option>All Locations</option>{locations.map(l => <option key={l}>{l}</option>)}</select>
                        <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)} className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"><option>All Days</option>{days.map(d => <option key={d}>{d}</option>)}</select>
                      </div>
                      <div className="space-y-3">
                        {filteredSessions.map((session, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border hover:shadow-md transition-shadow">
                            <div>
                              <div className="flex items-center gap-3">
                                <div className="px-2 py-1 rounded-full bg-blue-700 text-white text-xs font-semibold">{session.SessionName || session.Class}</div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-800">{format(parseISO(session.Date), 'dd-MMM-yyyy')}</div>
                                  <div className="text-xs text-slate-500">{session.Trainer} • {session.Location}</div>
                                </div>
                              </div>
                              <div className="mt-2 text-xs text-slate-600 flex gap-6 flex-wrap">
                                <div>Revenue <span className="font-semibold text-slate-800">{formatCurrency(session.Revenue)}</span></div>
                                <div>Booked <span className="font-semibold text-slate-800">{session.Booked}</span></div>
                                <div>Cancelled <span className="font-semibold text-slate-800">{session.LateCancelled}</span></div>
                                <div>Non-Paid <span className="font-semibold text-slate-800">{session.NonPaid || 0}</span></div>
                                <div>Waitlisted <span className="font-semibold text-slate-800">{session.Waitlisted || 0}</span></div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-green-700">{session.CheckedIn}/{session.Capacity}</div>
                              <div className="text-xs text-slate-500">{session.Capacity ? Math.round((session.CheckedIn / session.Capacity) * 100) : 0}% full</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="px-6 py-3 bg-gradient-to-r from-blue-700 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">Close</button></div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
