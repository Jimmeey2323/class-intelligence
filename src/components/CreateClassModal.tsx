import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Plus, Users, MapPin, Clock } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { SessionData } from '../types';
import { format } from 'date-fns';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedTime: string;
}

export default function CreateClassModal({ isOpen, onClose, selectedDate, selectedTime }: CreateClassModalProps) {
  const { rawData, setRawData } = useDashboardStore();
  const [formData, setFormData] = useState({
    className: '',
    trainer: '',
    location: '',
    capacity: 20,
    type: 'Group Class',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Get unique values from existing data for suggestions
  const uniqueClasses = [...new Set(rawData.map((s: SessionData) => s.Class))].sort();
  const uniqueTrainers = [...new Set(rawData.map((s: SessionData) => s.Trainer))].sort();
  const uniqueLocations = [...new Set(rawData.map((s: SessionData) => s.Location))].sort();
  const uniqueTypes = [...new Set(rawData.map((s: SessionData) => s.Type))].sort();

  // Calculate analytics for each option
  const classAnalytics = uniqueClasses.map(className => {
    const classSessions = rawData.filter((s: SessionData) => s.Class === className);
    const avgFillRate = classSessions.length > 0 
      ? classSessions.reduce((sum, s) => sum + ((s.CheckedIn || 0) / (s.Capacity || 1)), 0) / classSessions.length * 100
      : 0;
    const avgRevenue = classSessions.length > 0
      ? classSessions.reduce((sum, s) => sum + (s.Revenue || 0), 0) / classSessions.length
      : 0;
    return { name: className, avgFillRate, avgRevenue, sessionCount: classSessions.length };
  });

  const trainerAnalytics = uniqueTrainers.map(trainer => {
    const trainerSessions = rawData.filter((s: SessionData) => s.Trainer === trainer);
    const avgFillRate = trainerSessions.length > 0
      ? trainerSessions.reduce((sum, s) => sum + ((s.CheckedIn || 0) / (s.Capacity || 1)), 0) / trainerSessions.length * 100
      : 0;
    const totalClasses = trainerSessions.length;
    const workload = totalClasses >= 25 ? 'Overloaded' : totalClasses >= 20 ? 'Heavy' : totalClasses >= 15 ? 'Medium' : 'Light';
    return { name: trainer, avgFillRate, sessionCount: totalClasses, workload };
  });

  const locationAnalytics = uniqueLocations.map(location => {
    const locationSessions = rawData.filter((s: SessionData) => s.Location === location);
    const avgCapacity = locationSessions.length > 0
      ? locationSessions.reduce((sum, s) => sum + (s.Capacity || 0), 0) / locationSessions.length
      : 0;
    return { name: location, avgCapacity, sessionCount: locationSessions.length };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.className.trim()) newErrors.className = 'Class name is required';
    if (!formData.trainer.trim()) newErrors.trainer = 'Trainer is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (formData.capacity < 1) newErrors.capacity = 'Capacity must be at least 1';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Get day of week from selected date
    const dayOfWeek = format(selectedDate, 'EEEE'); // Monday, Tuesday, etc.

    // Generate unique IDs
    const sessionId = `NEW-${Date.now()}`;
    const uniqueId = `${sessionId}-${formData.className}`;

    // Create new session with all required SessionData fields
    const newSession: SessionData = {
      TrainerID: sessionId,
      FirstName: formData.trainer.split(' ')[0] || formData.trainer,
      LastName: formData.trainer.split(' ').slice(1).join(' ') || '',
      Trainer: formData.trainer,
      SessionID: sessionId,
      SessionName: formData.className,
      Capacity: formData.capacity,
      CheckedIn: 0,
      LateCancelled: 0,
      Booked: 0,
      Complimentary: 0,
      Location: formData.location,
      Date: format(selectedDate, 'yyyy-MM-dd'),
      Day: dayOfWeek,
      Time: selectedTime,
      Revenue: 0,
      NonPaid: 0,
      UniqueID1: uniqueId,
      UniqueID2: uniqueId,
      Memberships: 0,
      Packages: 0,
      IntroOffers: 0,
      SingleClasses: 0,
      Type: formData.type,
      Class: formData.className,
      Classes: 1,
      Waitlisted: 0,
      Status: 'Active',
      FillRate: 0,
    };

    // Add to rawData
    const updatedData = [...rawData, newSession];
    setRawData(updatedData);

    // Reset form and close
    setFormData({
      className: '',
      trainer: '',
      location: '',
      capacity: 20,
      type: 'Group Class',
    });
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setFormData({
      className: '',
      trainer: '',
      location: '',
      capacity: 20,
      type: 'Group Class',
    });
    setErrors({});
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl p-8 shadow-2xl border border-white/50 transition-all">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <Dialog.Title className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      Create New Class
                    </Dialog.Title>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        📅 {format(selectedDate, 'EEEE, MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {selectedTime}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Class Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Class Name *
                    </label>
                    <select
                      value={formData.className}
                      onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        errors.className ? 'border-red-300' : 'border-gray-200'
                      } focus:border-blue-500 focus:ring-0 transition-colors`}
                    >
                      <option value="">Select a class type...</option>
                      {classAnalytics
                        .sort((a, b) => b.avgFillRate - a.avgFillRate)
                        .map(({ name, avgFillRate, avgRevenue, sessionCount }) => (
                          <option key={name} value={name}>
                            {name} ({avgFillRate.toFixed(0)}% fill • ₹{(avgRevenue/100).toFixed(0)} avg • {sessionCount} sessions)
                          </option>
                        ))}
                    </select>
                    {errors.className && (
                      <p className="mt-1 text-sm text-red-600">{errors.className}</p>
                    )}
                    {formData.className && (
                      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <p className="text-xs text-blue-800">
                          💡 This class type has {classAnalytics.find(c => c.name === formData.className)?.avgFillRate.toFixed(0)}% average fill rate
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Trainer */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Trainer *
                    </label>
                    <select
                      value={formData.trainer}
                      onChange={(e) => setFormData({ ...formData, trainer: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        errors.trainer ? 'border-red-300' : 'border-gray-200'
                      } focus:border-blue-500 focus:ring-0 transition-colors`}
                    >
                      <option value="">Select a trainer...</option>
                      {trainerAnalytics
                        .sort((a, b) => b.avgFillRate - a.avgFillRate)
                        .map(({ name, avgFillRate, sessionCount, workload }) => (
                          <option key={name} value={name}>
                            {name} ({avgFillRate.toFixed(0)}% fill • {sessionCount} classes • {workload})
                          </option>
                        ))}
                    </select>
                    {errors.trainer && (
                      <p className="mt-1 text-sm text-red-600">{errors.trainer}</p>
                    )}
                    {formData.trainer && (
                      <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
                        <p className="text-xs text-green-800">
                          👤 {formData.trainer} has {trainerAnalytics.find(t => t.name === formData.trainer)?.workload} workload
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Location and Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Location *
                      </label>
                      <select
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl border-2 ${
                          errors.location ? 'border-red-300' : 'border-gray-200'
                        } focus:border-blue-500 focus:ring-0 transition-colors`}
                      >
                        <option value="">Select location...</option>
                        {locationAnalytics.map(({ name, avgCapacity, sessionCount }) => (
                          <option key={name} value={name}>
                            {name} (Avg cap: {avgCapacity.toFixed(0)} • {sessionCount} classes)
                          </option>
                        ))}
                      </select>
                      {errors.location && (
                        <p className="mt-1 text-sm text-red-600">{errors.location}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Type
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 transition-colors"
                      >
                        {uniqueTypes.map((type: string) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Users className="w-4 h-4 inline mr-1" />
                      Capacity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        errors.capacity ? 'border-red-300' : 'border-gray-200'
                      } focus:border-blue-500 focus:ring-0 transition-colors`}
                    />
                    {errors.capacity && (
                      <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>
                    )}
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-sm text-blue-800">
                      💡 This class will be created for <strong>{format(selectedDate, 'EEEE, MMM d')}</strong> at <strong>{selectedTime}</strong>.
                      You can edit or delete it later if needed.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Create Class
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
