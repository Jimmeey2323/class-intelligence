import { Fragment, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
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

    return {
      totalSessions,
      totalCheckIns,
      totalCapacity,
      totalRevenue,
      totalCancellations,
      totalBooked,
      totalWaitlisted,
      avgFillRate,
      avgCheckIns,
      avgRevenue,
      cancellationRate,
      waitlistRate,
      trend,
      trendPercentage,
      bestSession,
      worstSession
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
              <Dialog.Panel className="w-full max-w-6xl transform rounded-3xl bg-white/70 glass-card p-4 md:p-6 text-left align-middle shadow-2xl transition-all max-h-[90vh] overflow-hidden">
                <div className="flex items-start justify-between mb-4 px-2">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                    <div className="text-sm text-slate-500">Detailed analytics and performance metrics</div>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-md text-slate-600 hover:bg-slate-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {/* Scrollable body */}
                <div className="overflow-y-auto max-h-[76vh] pr-2">

                {/* Top KPI Tiles */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 px-2">
                  <div className="col-span-1 md:col-span-1 bg-white rounded-lg p-3 shadow-sm border">
                    <div className="text-xs font-semibold text-gray-500">TOTAL CLASSES</div>
                    <div className="text-xl font-bold text-slate-800">{metrics.totalSessions}</div>
                  </div>
                  <div className="col-span-1 md:col-span-1 bg-white rounded-lg p-3 shadow-sm border">
                    <div className="text-xs font-semibold text-gray-500">CHECK-INS</div>
                    <div className="text-xl font-bold text-slate-800">{metrics.totalCheckIns}</div>
                  </div>
                  <div className="col-span-1 md:col-span-1 bg-white rounded-lg p-3 shadow-sm border">
                    <div className="text-xs font-semibold text-gray-500">CLASS AVG</div>
                    <div className="text-xl font-bold text-slate-800">{metrics.avgCheckIns.toFixed(1)} <span className="inline-block ml-2">{metrics.trend === 'growing' ? <TrendingUp className="w-4 h-4 text-green-700 inline" /> : metrics.trend === 'declining' ? <TrendingDown className="w-4 h-4 text-red-700 inline" /> : null}</span></div>
                  </div>
                  <div className="col-span-1 md:col-span-1 bg-white rounded-lg p-3 shadow-sm border">
                    <div className="text-xs font-semibold text-gray-500">FILL RATE</div>
                    <div className="text-xl font-bold text-slate-800">{formatPercentage(metrics.avgFillRate)}</div>
                  </div>
                  <div className="col-span-1 md:col-span-1 bg-white rounded-lg p-3 shadow-sm border">
                    <div className="text-xs font-semibold text-gray-500">CANCEL RATE</div>
                    <div className="text-xl font-bold text-slate-800">{formatPercentage(metrics.cancellationRate)}</div>
                  </div>
                  <div className="col-span-2 md:col-span-1 bg-white rounded-lg p-3 shadow-sm border">
                    <div className="text-xs font-semibold text-gray-500">REVENUE</div>
                    <div className="text-xl font-bold text-slate-800">{formatCurrency(metrics.totalRevenue)}</div>
                  </div>
                </div>

                {/* Large Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 px-2">
                  <div className="bg-white rounded-2xl p-6 border shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">BOOKING & CANCELLATION</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">Total Bookings</div>
                        <div className="text-lg font-bold text-slate-800">{metrics.totalBooked}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Late Cancellations</div>
                        <div className="text-lg font-bold text-slate-800">{metrics.totalCancellations}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Cancellation Rate</div>
                        <div className="text-lg font-bold text-red-700">{formatPercentage(metrics.cancellationRate)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Rev Lost (Est.)</div>
                        <div className="text-lg font-bold text-red-700">₹{Math.round(metrics.cancellationRate * 100)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">CAPACITY & UTILIZATION</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">Total Capacity</div>
                        <div className="text-lg font-bold text-slate-800">{metrics.totalCapacity}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Capacity Used</div>
                        <div className="text-lg font-bold text-green-700">{metrics.totalCheckIns}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Unutilized</div>
                        <div className="text-lg font-bold text-slate-800">{metrics.totalCapacity - metrics.totalCheckIns}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Weighted Avg</div>
                        <div className="text-lg font-bold text-slate-800">{formatPercentage(metrics.avgFillRate)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Sessions + Filters */}
                <div className="bg-white rounded-2xl p-6 border shadow-sm px-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Individual Sessions</h3>
                    <div className="text-sm text-slate-500">{filteredSessions.length} sessions</div>
                  </div>

                  <div className="flex flex-wrap gap-3 items-center mb-4">
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by class, trainer, or location..."
                        className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                      />
                    </div>
                    <select value={filterTrainer} onChange={(e) => setFilterTrainer(e.target.value)} className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm">
                      <option>All Trainers</option>
                      {trainers.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm">
                      <option>All Locations</option>
                      {locations.map(l => <option key={l}>{l}</option>)}
                    </select>
                    <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)} className="px-3 py-2 rounded-xl border-2 border-gray-200 text-sm">
                      <option>All Days</option>
                      {days.map(d => <option key={d}>{d}</option>)}
                    </select>
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
                          <div className="mt-2 text-xs text-slate-600 flex gap-6">
                            <div>Revenue <span className="font-semibold text-slate-800">{formatCurrency(session.Revenue)}</span></div>
                            <div>Booked <span className="font-semibold text-slate-800">{session.Booked}</span></div>
                            <div>Cancelled <span className="font-semibold text-slate-800">{session.LateCancelled}</span></div>
                            <div>Non-Paid <span className="font-semibold text-slate-800">{session.NonPaid || 0}</span></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-green-700">{session.CheckedIn}/{session.Capacity}</div>
                          <div className="text-xs text-slate-500">{session.Capacity ? Math.round((session.CheckedIn / session.Capacity) * 100) : 0}% full</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={onClose}
                      className="px-6 py-3 bg-gradient-to-r from-blue-700 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                      Close
                    </button>
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
