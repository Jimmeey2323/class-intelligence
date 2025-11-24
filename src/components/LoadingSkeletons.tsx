import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 10 }) => {
  return (
    <div className="space-y-3 p-4">
      {/* Header skeleton */}
      <div className="flex gap-4 mb-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-10 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg flex-1 animate-pulse"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      
      {/* Row skeletons */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4">
          {[...Array(6)].map((_, j) => (
            <div
              key={j}
              className="h-12 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg flex-1 animate-pulse"
              style={{ animationDelay: `${(i * 6 + j) * 0.05}s` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl p-6 shadow-lg border border-slate-200"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="h-4 w-24 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded mb-3 animate-pulse" />
          <div className="h-8 w-32 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded mb-2 animate-pulse" />
          <div className="h-3 w-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
};

export const ScheduleSkeleton: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
      {/* Controls skeleton */}
      <div className="flex gap-4 mb-6">
        <div className="h-10 w-48 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg animate-pulse" />
      </div>
      
      {/* Weekly grid skeleton */}
      <div className="grid grid-cols-7 gap-4">
        {[...Array(7)].map((_, day) => (
          <div key={day} className="space-y-3">
            <div className="h-8 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg animate-pulse" />
            {[...Array(6)].map((_, slot) => (
              <div
                key={slot}
                className="h-24 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg animate-pulse"
                style={{ animationDelay: `${(day * 6 + slot) * 0.05}s` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      <CardSkeleton count={4} />
      <TableSkeleton rows={8} />
    </div>
  );
};
