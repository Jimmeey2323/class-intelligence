import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Target, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { loadMemberBehaviorAnalytics } from '../services/googleSheetsService';
import { MemberAttendancePattern, BookingBehavior, MemberCohort } from '../types';

const COLORS = {
  consistent: '#10b981',
  random: '#f59e0b',
  mixed: '#3b82f6',
  new: '#8b5cf6',
  returning: '#06b6d4',
  loyal: '#10b981',
  'at-risk': '#f59e0b',
  churned: '#ef4444',
};

// Cache for analytics data
let cachedAnalytics: any = null;

export const MemberBehaviorAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(!cachedAnalytics);
  const [memberPatterns, setMemberPatterns] = useState<MemberAttendancePattern[]>([]);
  const [bookingByPayment, setBookingByPayment] = useState<BookingBehavior[]>([]);
  const [bookingByClass, setBookingByClass] = useState<BookingBehavior[]>([]);
  const [cohorts, setCohorts] = useState<MemberCohort[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'booking' | 'cohorts'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Use cached data if available
      if (cachedAnalytics) {
        setMemberPatterns(cachedAnalytics.memberPatterns);
        setBookingByPayment(cachedAnalytics.bookingByPaymentCategory);
        setBookingByClass(cachedAnalytics.bookingByClass);
        setCohorts(cachedAnalytics.cohortAnalysis);
        setLoading(false);
        return;
      }

      setLoading(true);
      const analytics = await loadMemberBehaviorAnalytics();
      
      // Cache the results
      cachedAnalytics = analytics;
      
      setMemberPatterns(analytics.memberPatterns);
      setBookingByPayment(analytics.bookingByPaymentCategory);
      setBookingByClass(analytics.bookingByClass);
      setCohorts(analytics.cohortAnalysis);
    } catch (error) {
      console.error('Failed to load member behavior analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Memoize expensive calculations
  const overviewMetrics = useMemo(() => {
    const totalMembers = memberPatterns.length;
    const consistentMembers = memberPatterns.filter(m => m.bookingPattern === 'consistent').length;
    const randomMembers = memberPatterns.filter(m => m.bookingPattern === 'random').length;
    const newMembersCount = memberPatterns.filter(m => m.isNew).length;
    const avgCancellationRate = totalMembers > 0 
      ? memberPatterns.reduce((sum, m) => sum + m.cancellationRate, 0) / totalMembers 
      : 0;
    const avgConsistencyScore = totalMembers > 0
      ? memberPatterns.reduce((sum, m) => sum + m.consistencyScore, 0) / totalMembers
      : 0;

    return {
      totalMembers,
      consistentMembers,
      randomMembers,
      newMembersCount,
      avgCancellationRate,
      avgConsistencyScore,
    };
  }, [memberPatterns]);

  // Memoize chart data
  const chartData = useMemo(() => {
    const { totalMembers, consistentMembers, randomMembers, newMembersCount } = overviewMetrics;
    
    return {
      bookingPatternData: [
        { name: 'Consistent', value: consistentMembers, color: COLORS.consistent },
        { name: 'Random', value: randomMembers, color: COLORS.random },
        { name: 'Mixed', value: totalMembers - consistentMembers - randomMembers, color: COLORS.mixed },
      ],
      memberTypeData: [
        { name: 'New', value: newMembersCount, color: COLORS.new },
        { name: 'Returning', value: totalMembers - newMembersCount, color: COLORS.returning },
      ],
      cohortData: cohorts.map(c => ({
        name: c.cohortType.charAt(0).toUpperCase() + c.cohortType.slice(1),
        members: c.memberCount,
        revenue: c.totalRevenue,
        classes: c.totalClasses,
        cancellationRate: c.cancellationRate,
      })),
    };
  }, [overviewMetrics, cohorts]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <div className="text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Analyzing member behavior...
        </div>
      </div>
    );
  }

  const { totalMembers, consistentMembers, avgCancellationRate, avgConsistencyScore } = overviewMetrics;
  const { bookingPatternData, memberTypeData, cohortData } = chartData;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="glass-card rounded-2xl p-2 inline-flex gap-2">
        {['overview', 'patterns', 'booking', 'cohorts'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === tab
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : 'text-gray-700 hover:bg-white/50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Members</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    {totalMembers}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                  <Users className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Consistent Attendees</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                    {consistentMembers}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {totalMembers > 0 ? ((consistentMembers / totalMembers) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                  <Target className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Consistency</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                    {avgConsistencyScore.toFixed(0)}/100
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Cancellation Rate</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
                    {avgCancellationRate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Pattern Distribution */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
                Booking Patterns
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={bookingPatternData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bookingPatternData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* New vs Returning */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
                Member Mix
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={memberTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {memberTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cohort Overview */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
              Member Cohorts
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cohortData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend />
                <Bar dataKey="members" fill="#3b82f6" name="Members" />
                <Bar dataKey="classes" fill="#10b981" name="Total Classes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Patterns Tab */}
      {activeTab === 'patterns' && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
              Member Attendance Patterns
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Member</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Pattern</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">Classes</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">Consistency</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">Cancel Rate</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Top Class</th>
                  </tr>
                </thead>
                <tbody>
                  {memberPatterns.slice(0, 50).map((member, idx) => {
                    const topClass = Object.entries(member.classLoyalty).sort((a, b) => b[1] - a[1])[0];
                    return (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                        <td className="py-3 px-4 text-gray-900 font-medium">{member.memberName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              member.bookingPattern === 'consistent'
                                ? 'bg-green-100 text-green-700'
                                : member.bookingPattern === 'random'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {member.bookingPattern}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900 font-medium">{member.totalClasses}</td>
                        <td className="py-3 px-4 text-right text-gray-900 font-medium">{member.consistencyScore}/100</td>
                        <td className="py-3 px-4 text-right text-gray-900 font-medium">{member.cancellationRate.toFixed(1)}%</td>
                        <td className="py-3 px-4 text-gray-700">{topClass ? `${topClass[0]} (${topClass[1]}x)` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Booking Behavior Tab */}
      {activeTab === 'booking' && (
        <div className="space-y-6">
          {/* By Payment Category */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
              Booking Behavior by Payment Type
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Payment Type</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">Members</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">Bookings</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">Cancel Rate</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">Show Up</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingByPayment.map((behavior, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="py-3 px-4 text-gray-900 font-semibold">{behavior.segment}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{behavior.totalMembers}</td>
                      <td className="py-3 px-4 text-right text-gray-900">{behavior.totalBookings}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={behavior.cancellationRate > 20 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                          {behavior.cancellationRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 font-semibold">{behavior.showUpRate.toFixed(1)}%</td>
                      <td className="py-3 px-4 text-right text-gray-900 font-semibold">₹{behavior.totalRevenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* By Class Type */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
              Booking Behavior by Class
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={bookingByClass.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="segment" stroke="#6b7280" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend />
                <Bar dataKey="totalMembers" fill="#3b82f6" name="Members" />
                <Bar dataKey="consistentMembers" fill="#10b981" name="Consistent" />
                <Bar dataKey="randomMembers" fill="#f59e0b" name="Random" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Cohorts Tab */}
      {activeTab === 'cohorts' && (
        <div className="space-y-6">
          {cohorts.map((cohort, idx) => (
            <div key={idx} className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent capitalize">
                  {cohort.cohortType} Members
                </h3>
                <span className="text-3xl font-bold text-blue-600">{cohort.memberCount}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Avg Classes</p>
                  <p className="text-2xl font-bold text-gray-900">{cohort.averageClassesPerMember.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Avg Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{cohort.averageRevenuePerMember.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Cancel Rate</p>
                  <p className="text-2xl font-bold text-orange-600">{cohort.cancellationRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Retention</p>
                  <p className="text-2xl font-bold text-green-600">{cohort.retentionRate.toFixed(1)}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment Mix</h4>
                  <div className="space-y-2">
                    {Object.entries(cohort.paymentMix).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 capitalize">{key}</span>
                        <span className="text-sm font-semibold text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Top Classes</h4>
                  <div className="space-y-2">
                    {cohort.preferredClasses.slice(0, 5).map((cls, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{cls.className}</span>
                        <span className="text-sm font-semibold text-gray-900">{cls.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
