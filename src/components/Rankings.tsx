import { useState, useMemo } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { SessionData } from '../types';
import { formatNumber, formatCurrency, formatPercentage, calculateMetrics } from '../utils/calculations';
import { TrendingUp, TrendingDown, Award, BarChart3, Search } from 'lucide-react';
import { generateCompositeKey, parseCompositeKey } from '../utils/cleaners';
import { motion } from 'framer-motion';
import EnhancedDrilldownModal from './EnhancedDrilldownModal';

type RankingMetric = 'classAvg' | 'fillRate' | 'totalRevenue' | 'consistencyScore' | 'totalCancellations' | 'totalBooked' | 'classes' | 'compositeScore';

interface RankingGroup {
  key: string;
  className: string;
  day: string;
  time: string;
  location: string;
  trainer?: string;
  sessions: SessionData[];
  metrics: ReturnType<typeof calculateMetrics>;
}

export default function Rankings() {
  const { 
    rawData: allRawData,
    filteredData, 
    includeTrainerInRankings, 
    setIncludeTrainerInRankings,
    excludeHostedClasses,
    setExcludeHostedClasses,
    filters,
    setFilters
  } = useDashboardStore();
  const [topMetric, setTopMetric] = useState<RankingMetric>('classAvg');
  const [bottomMetric, setBottomMetric] = useState<RankingMetric>('classAvg');
  const [topCount, setTopCount] = useState(10);
  const [bottomCount, setBottomCount] = useState(10);
  
  // Modal state
  const [drilldownData, setDrilldownData] = useState<SessionData[]>([]);
  const [drilldownTitle, setDrilldownTitle] = useState('');
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

  // Use filtered data directly
  const rawData = filteredData;

  const handleCardClick = (group: RankingGroup) => {
    setDrilldownData(group.sessions);
    setDrilldownTitle(`${group.className} - ${group.day} at ${group.time} (${group.location})`);
    setIsDrilldownOpen(true);
  };

  if (rawData.length === 0) return null;

  // Group sessions by composite key
  const rankedGroups = useMemo(() => {
    const groups = new Map<string, SessionData[]>();

    rawData.forEach((session) => {
      const key = generateCompositeKey(
        session.SessionName || session.Class,
        session.Day,
        session.Time,
        session.Location,
        includeTrainerInRankings ? session.Trainer : undefined
      );

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(session);
    });

    const rankingGroups: RankingGroup[] = [];
    groups.forEach((sessions, key) => {
      const parsed = parseCompositeKey(key);
      const metrics = calculateMetrics(sessions);

      // Apply minCheckins and minClasses filters
      if (metrics.totalCheckIns < filters.minCheckins) {
        return;
      }
      if (sessions.length < (filters.minClasses || 0)) {
        return;
      }
      
      // Note: Status filter is applied visually (graying out) rather than removing items
      // This allows inactive classes to remain visible but grayed out

      rankingGroups.push({
        key,
        className: parsed.className,
        day: parsed.day,
        time: parsed.time,
        location: parsed.location,
        trainer: parsed.trainer,
        sessions,
        metrics,
      });
    });

    return rankingGroups;
  }, [rawData, includeTrainerInRankings, filters.minCheckins, filters.minClasses, filters.statusFilter, allRawData]);

  const getMetricLabel = (metric: RankingMetric): string => {
    switch (metric) {
      case 'classAvg':
        return 'Class Avg';
      case 'fillRate':
        return 'Fill Rate';
      case 'totalRevenue':
        return 'Revenue';
      case 'consistencyScore':
        return 'Consistency';
      case 'totalCancellations':
        return 'Late Cancellations';
      case 'totalBooked':
        return 'Total Booked';
      case 'classes':
        return 'Classes';
      case 'compositeScore':
        return 'Composite Score';
    }
  };

  const formatMetricValue = (metric: RankingMetric, value: number): string => {
    switch (metric) {
      case 'classAvg':
        return formatNumber(value, 1);
      case 'fillRate':
        return formatPercentage(value);
      case 'totalRevenue':
        return formatCurrency(value, true);
      case 'totalCancellations':
      case 'totalBooked':
      case 'classes':
        return formatNumber(value);
      case 'consistencyScore':
        return formatPercentage(value);
      case 'compositeScore':
        return formatNumber(value, 1);
    }
  };

  const getTooltipContent = (metric: RankingMetric, group: RankingGroup): string => {
    if (metric === 'compositeScore') {
      const attendanceScore = Math.min(group.metrics.classAvg * 5, 100);
      const fillRateScore = Math.min(group.metrics.fillRate, 100);
      const sessionScore = Math.min(group.metrics.classes * 2, 100);
      
      return `Composite Score Calculation:
• Attendance Score: ${formatNumber(attendanceScore, 1)} (${formatNumber(group.metrics.classAvg, 1)} avg × 5, capped at 100) × 40% = ${formatNumber(attendanceScore * 0.4, 1)}
• Fill Rate Score: ${formatNumber(fillRateScore, 1)} (${formatPercentage(group.metrics.fillRate)}) × 35% = ${formatNumber(fillRateScore * 0.35, 1)}
• Session Score: ${formatNumber(sessionScore, 1)} (${group.metrics.classes} sessions × 2, capped at 100) × 25% = ${formatNumber(sessionScore * 0.25, 1)}

Total: ${formatNumber(group.metrics.compositeScore, 1)}`;
    }
    return '';
  };

  const getTopPerformers = (metric: RankingMetric, count: number): RankingGroup[] => {
    return [...rankedGroups]
      .sort((a, b) => b.metrics[metric] - a.metrics[metric])
      .slice(0, count);
  };

  const getBottomPerformers = (metric: RankingMetric, count: number): RankingGroup[] => {
    return [...rankedGroups]
      .sort((a, b) => a.metrics[metric] - b.metrics[metric])
      .slice(0, count);
  };

  const topPerformers = getTopPerformers(topMetric, topCount);
  const bottomPerformers = getBottomPerformers(bottomMetric, bottomCount);

  const metricOptions: RankingMetric[] = ['classAvg', 'fillRate', 'totalRevenue', 'consistencyScore', 'compositeScore'];

  return (
    <>
    <div className="space-y-6">
      {/* Filter Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-5"
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* Exclude Hosted Classes Toggle */}
          <label className="flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white shadow-sm cursor-pointer hover:border-blue-400 transition-all">
            <input
              type="checkbox"
              checked={excludeHostedClasses}
              onChange={(e) => setExcludeHostedClasses(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-semibold text-gray-800">
              Exclude Hosted Classes
            </span>
          </label>

          {/* Min Checkins */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              Min Check-ins:
            </label>
            <input
              type="number"
              min="0"
              value={filters.minCheckins}
              onChange={(e) => setFilters({ minCheckins: parseInt(e.target.value) || 0 })}
              className="w-24 px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm font-semibold"
            />
          </div>

          {/* Min Classes */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              Min Classes:
            </label>
            <input
              type="number"
              min="0"
              value={filters.minClasses || 0}
              onChange={(e) => setFilters({ minClasses: parseInt(e.target.value) || 0 })}
              className="w-24 px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm font-semibold"
            />
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-600" />
            <input
              type="text"
              placeholder="Search classes, trainers, locations..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
            />
          </div>

          {/* Include Trainer Toggle */}
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm font-semibold text-gray-700">Include Trainer</span>
            <button
              onClick={() => setIncludeTrainerInRankings(!includeTrainerInRankings)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                includeTrainerInRankings ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  includeTrainerInRankings ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-3xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-600 to-green-800 shadow-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Top Performers</h3>
                <p className="text-sm text-gray-500">Best performing classes</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3 mb-4">
            <select
              value={topMetric}
              onChange={(e) => setTopMetric(e.target.value as RankingMetric)}
              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-sm font-medium transition-all"
            >
              {metricOptions.map((metric) => (
                <option key={metric} value={metric}>
                  {getMetricLabel(metric)}
                </option>
              ))}
            </select>
            <select
              value={topCount}
              onChange={(e) => setTopCount(parseInt(e.target.value))}
              className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-sm font-medium transition-all"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
            </select>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {topPerformers.map((group, index) => {
              return (
              <motion.div
                key={group.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleCardClick(group)}
                className={`flex items-center gap-3 p-4 rounded-xl bg-white border-2 border-gray-100 hover:border-green-700 hover:shadow-md transition-all cursor-pointer`}
              >
                <div className="flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-gradient-to-br from-green-700 to-green-800 text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate text-sm text-gray-900`}>
                    {group.className}
                  </p>
                  <p className={`text-xs truncate text-gray-600`}>
                    {group.day} • {group.time} • {group.location}
                  </p>
                  {group.trainer && (
                    <p className={`text-xs truncate text-blue-600`}>
                      {group.trainer}
                    </p>
                  )}
                  <div className={`flex items-center gap-3 mt-1 text-xs text-gray-500`}>
                    <span>{group.metrics.classes} classes</span>
                    <span>•</span>
                    <span>{formatNumber(group.metrics.totalCheckIns)} check-ins</span>
                    <span>•</span>
                    <span>{group.metrics.emptyClasses} empty</span>
                    <span>•</span>
                    <span className={group.metrics.status === 'Active' ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                      {group.metrics.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-4 h-4 text-green-700`} />
                  <div className="relative group">
                    <span className={`font-bold text-sm cursor-help text-gray-900`}>
                      {formatMetricValue(topMetric, group.metrics[topMetric])}
                    </span>
                    {topMetric === 'compositeScore' && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-pre-line shadow-lg max-w-sm">
                          {getTooltipContent(topMetric, group)}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Bottom Performers */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-3xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-600 to-orange-800 shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Needs Improvement</h3>
                <p className="text-sm text-gray-500">Classes requiring attention</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3 mb-4">
            <select
              value={bottomMetric}
              onChange={(e) => setBottomMetric(e.target.value as RankingMetric)}
              className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm font-medium transition-all"
            >
              {metricOptions.map((metric) => (
                <option key={metric} value={metric}>
                  {getMetricLabel(metric)}
                </option>
              ))}
            </select>
            <select
              value={bottomCount}
              onChange={(e) => setBottomCount(parseInt(e.target.value))}
              className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm font-medium transition-all"
            >
              <option value={5}>Bottom 5</option>
              <option value={10}>Bottom 10</option>
              <option value={20}>Bottom 20</option>
            </select>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {bottomPerformers.map((group, index) => {
              return (
              <motion.div
                key={group.key}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleCardClick(group)}
                className={`flex items-center gap-3 p-4 rounded-xl bg-white border-2 border-gray-100 hover:border-red-700 hover:shadow-md transition-all cursor-pointer`}
              >
                <div className="flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-gradient-to-br from-red-700 to-red-800 text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate text-sm text-gray-900`}>
                    {group.className}
                  </p>
                  <p className={`text-xs truncate text-gray-600`}>
                    {group.day} • {group.time} • {group.location}
                  </p>
                  {group.trainer && (
                    <p className={`text-xs truncate text-blue-600`}>
                      {group.trainer}
                    </p>
                  )}
                  <div className={`flex items-center gap-3 mt-1 text-xs text-gray-500`}>
                    <span>{group.metrics.classes} classes</span>
                    <span>•</span>
                    <span>{formatNumber(group.metrics.totalCheckIns)} check-ins</span>
                    <span>•</span>
                    <span>{group.metrics.emptyClasses} empty</span>
                    <span>•</span>
                    <span className={group.metrics.status === 'Active' ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                      {group.metrics.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-700" />
                  <div className="relative group">
                    <span className="font-bold text-gray-900 text-sm cursor-help">
                      {formatMetricValue(bottomMetric, group.metrics[bottomMetric])}
                    </span>
                    {bottomMetric === 'compositeScore' && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-pre-line shadow-lg max-w-sm">
                          {getTooltipContent(bottomMetric, group)}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>

    {/* Enhanced Drilldown Modal */}
    <EnhancedDrilldownModal
      isOpen={isDrilldownOpen}
      onClose={() => setIsDrilldownOpen(false)}
      sessions={drilldownData}
      title={drilldownTitle}
    />
  </>);
}
