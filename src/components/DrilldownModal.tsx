import { Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Calendar, MapPin, TrendingUp, Users } from 'lucide-react';
import { SessionData } from '../types';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/calculations';
import { motion } from 'framer-motion';

interface DrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionData[];
  title: string;
}

export default function DrilldownModal({ isOpen, onClose, sessions, title }: DrilldownModalProps) {
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

  if (sessions.length === 0) return null;

  // Calculate aggregate metrics
  const totalSessions = sessions.length;
  const totalCheckIns = sessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0);
  const totalRevenue = sessions.reduce((sum, s) => sum + (s.Revenue || 0), 0);
  const totalCapacity = sessions.reduce((sum, s) => sum + (s.Capacity || 0), 0);
  const avgFillRate = totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0;

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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl p-8 text-left align-middle shadow-2xl border border-white/50 transition-all">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <Dialog.Title className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {title}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">Sessions</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{totalSessions}</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-green-600">Check-ins</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">{formatNumber(totalCheckIns)}</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-600">Avg Fill Rate</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">{formatPercentage(avgFillRate)}</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border border-orange-200"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">💰</span>
                      <span className="text-xs font-medium text-orange-600">Total Revenue</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-900">{formatCurrency(totalRevenue)}</div>
                  </motion.div>
                </div>

                {/* Sessions Table */}
                <div className="overflow-auto max-h-96 rounded-2xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Trainer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Location</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Check-ins</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Capacity</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Fill Rate</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {sessions.map((session, idx) => {
                        const fillRate = session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0;
                        return (
                          <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-900">{session.Date}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{session.Time}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{session.Trainer}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {session.Location}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                              {session.CheckedIn}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700">{session.Capacity}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={`font-semibold ${
                                fillRate >= 80 ? 'text-green-600' :
                                fillRate >= 50 ? 'text-blue-600' :
                                'text-yellow-600'
                              }`}>
                                {formatPercentage(fillRate)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                              {formatCurrency(session.Revenue)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Actions */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
