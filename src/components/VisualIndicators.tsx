import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  value: number;
  previousValue?: number;
  format?: 'number' | 'percentage' | 'currency';
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  value,
  previousValue,
  format = 'number',
  showValue = true,
  size = 'md',
}) => {
  if (previousValue === undefined || previousValue === 0) {
    return null;
  }

  const change = value - previousValue;
  const percentChange = (change / previousValue) * 100;
  const isPositive = change > 0;
  const isNeutral = Math.abs(percentChange) < 1;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const colorClass = isNeutral
    ? 'text-gray-500 bg-gray-100'
    : isPositive
    ? 'text-green-600 bg-green-100'
    : 'text-red-600 bg-red-100';

  const formatValue = (val: number) => {
    switch (format) {
      case 'percentage':
        return `${Math.abs(val).toFixed(1)}%`;
      case 'currency':
        return `₹${Math.abs(val).toLocaleString()}`;
      default:
        return Math.abs(val).toFixed(0);
    }
  };

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${colorClass} ${sizeClasses[size]} font-semibold`}>
      <Icon className={iconSizes[size]} />
      {showValue && (
        <span>
          {isPositive && '+'}
          {formatValue(percentChange)}%
        </span>
      )}
    </div>
  );
};

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  showLabel?: boolean;
  height?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'blue',
  showLabel = true,
  height = 'md',
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  };

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600 font-medium">{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${heightClasses[height]}`}>
        <div
          className={`${heightClasses[height]} bg-gradient-to-r ${colorClasses[color]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface MetricBadgeProps {
  value: number | string;
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
}

export const MetricBadge: React.FC<MetricBadgeProps> = ({
  value,
  label,
  variant = 'neutral',
  size = 'md',
}) => {
  const variantClasses = {
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-orange-100 text-orange-700 border-orange-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div className={`inline-flex flex-col items-center border rounded-lg ${variantClasses[variant]} ${sizeClasses[size]}`}>
      <span className="font-bold">{value}</span>
      <span className="text-xs opacity-75">{label}</span>
    </div>
  );
};

export default { TrendIndicator, ProgressBar, MetricBadge };
