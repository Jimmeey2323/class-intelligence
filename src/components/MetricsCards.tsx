import { useDashboardStore } from '../store/dashboardStore';
import { calculateTotalsRow } from '../utils/calculations';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/calculations';
import { TrendingUp, Users, DollarSign, Calendar, AlertTriangle, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MetricsCards() {
  const { processedData } = useDashboardStore();

  if (processedData.length === 0) return null;

  const totals = calculateTotalsRow(processedData);

  const metrics = [
    {
      label: 'Total Classes',
      value: formatNumber(totals.classes),
      icon: Calendar,
      gradient: 'from-blue-700 via-blue-800 to-blue-900',
      subValue: `${totals.emptyClasses} empty`,
    },
    {
      label: 'Total Check-ins',
      value: formatNumber(totals.totalCheckIns),
      icon: Users,
      gradient: 'from-green-600 via-green-700 to-green-800',
      subValue: `Avg: ${totals.classAvg.toFixed(1)}`,
    },
    {
      label: 'Fill Rate',
      value: formatPercentage(totals.fillRate),
      icon: TrendingUp,
      gradient: 'from-purple-600 via-purple-700 to-purple-800',
      subValue: `${formatNumber(totals.totalCapacity)} capacity`,
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(totals.totalRevenue, true),
      icon: DollarSign,
      gradient: 'from-amber-600 via-amber-700 to-amber-800',
      subValue: `${formatCurrency(totals.revPerCheckin)} per check-in`,
    },
    {
      label: 'Cancellation Rate',
      value: formatPercentage(totals.cancellationRate),
      icon: AlertTriangle,
      gradient: 'from-red-600 via-red-700 to-red-800',
      subValue: `${formatNumber(totals.totalCancellations)} cancellations`,
    },
    {
      label: 'Consistency Score',
      value: formatPercentage(totals.consistencyScore),
      icon: Award,
      gradient: 'from-indigo-600 via-indigo-700 to-indigo-800',
      subValue: 'Based on attendance variance',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="glass-card rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 relative overflow-hidden"
          >
            {/* Top border gradient */}
            <div 
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{
                background: `linear-gradient(90deg, rgb(29 78 216), rgb(30 64 175), rgb(30 58 138))`,
              }}
            />
            
            <div className="flex items-start justify-between mb-4 mt-2">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${metric.gradient} shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{metric.label}</p>
              <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-xs text-gray-500">{metric.subValue}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
