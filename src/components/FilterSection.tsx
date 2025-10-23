import { ChevronDown, ChevronUp, Calendar, Users, MapPin, Layers, Activity } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { getUniqueValues } from '../utils/calculations';
import { format } from 'date-fns';

export default function FilterSection() {
  const { filters, setFilters, isFilterCollapsed, toggleFilterCollapse, rawData } = useDashboardStore();

  const trainers = getUniqueValues(rawData, 'Trainer');
  const locations = getUniqueValues(rawData, 'Location');
  const classTypes = getUniqueValues(rawData, 'Type');
  const classes = getUniqueValues(rawData, 'Class');

  return (
    <div className="glass-card rounded-3xl overflow-hidden">
      {/* Header */}
      <button
        onClick={toggleFilterCollapse}
        className="w-full flex items-center justify-between p-6 hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl gradient-blue">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Filters</h2>
          <span className="text-sm text-gray-500">
            ({Object.values(filters).filter((v) => v && (Array.isArray(v) ? v.length > 0 : true)).length} active)
          </span>
        </div>
        {isFilterCollapsed ? (
          <ChevronDown className="w-6 h-6 text-gray-600" />
        ) : (
          <ChevronUp className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {/* Filter Content */}
      {!isFilterCollapsed && (
        <div className="p-6 pt-0 space-y-6">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                From Date
              </label>
              <input
                type="date"
                value={format(filters.dateFrom, 'yyyy-MM-dd')}
                onChange={(e) => setFilters({ dateFrom: new Date(e.target.value) })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                To Date
              </label>
              <input
                type="date"
                value={format(filters.dateTo, 'yyyy-MM-dd')}
                onChange={(e) => setFilters({ dateTo: new Date(e.target.value) })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>
          </div>

          {/* Multi-select Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Trainers */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                Trainers
              </label>
              <select
                multiple
                value={filters.trainers}
                onChange={(e) =>
                  setFilters({
                    trainers: Array.from(e.target.selectedOptions, (option) => option.value),
                  })
                }
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all min-h-[100px]"
              >
                {trainers.map((trainer) => (
                  <option key={trainer} value={trainer}>
                    {trainer}
                  </option>
                ))}
              </select>
            </div>

            {/* Locations */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Locations
              </label>
              <select
                multiple
                value={filters.locations}
                onChange={(e) =>
                  setFilters({
                    locations: Array.from(e.target.selectedOptions, (option) => option.value),
                  })
                }
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all min-h-[100px]"
              >
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Types */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Class Types
              </label>
              <select
                multiple
                value={filters.classTypes}
                onChange={(e) =>
                  setFilters({
                    classTypes: Array.from(e.target.selectedOptions, (option) => option.value),
                  })
                }
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all min-h-[100px]"
              >
                {classTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Classes */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Classes
              </label>
              <select
                multiple
                value={filters.classes}
                onChange={(e) =>
                  setFilters({
                    classes: Array.from(e.target.selectedOptions, (option) => option.value),
                  })
                }
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all min-h-[100px]"
              >
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter and Min Checkins */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Status Filter
              </label>
              <select
                value={filters.statusFilter || 'all'}
                onChange={(e) => setFilters({ statusFilter: e.target.value as 'all' | 'active' | 'inactive' })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              >
                <option value="all">All Classes</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Minimum Check-ins (for grouped view)
              </label>
              <input
                type="number"
                min="0"
                value={filters.minCheckins}
                onChange={(e) => setFilters({ minCheckins: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end">
            <button
              onClick={() =>
                setFilters({
                  trainers: [],
                  locations: [],
                  classTypes: [],
                  classes: [],
                  searchQuery: '',
                  minCheckins: 0,
                  statusFilter: 'all',
                })
              }
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold transition-all hover:shadow-md"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
