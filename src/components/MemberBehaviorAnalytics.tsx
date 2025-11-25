import React, { useState, useMemo } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Users, TrendingDown, UserX, AlertTriangle, Calendar, X, Award, Activity, UserCheck, Clock } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { formatCurrency } from '../utils/calculations';

interface MemberStats {
  memberID: string;
  memberName: string;
  email: string;
  totalBookings: number;
  totalCheckIns: number;
  cancellations: number;
  noShows: number;
  cancellationRate: number;
  showUpRate: number;
  totalRevenue: number;
  firstVisit: string;
  lastVisit: string;
  daysSinceLastVisit: number;
  visitFrequency: number;
  preferredLocation: string;
  preferredDay: string;
  preferredTime: string;
  trainersAttended: string[];
}

interface ChurnedMember extends MemberStats {
  previousFrequency: number;
  daysSinceLastClass: number;
  wasRegular: boolean;
}

interface TrainerChange {
  className: string;
  oldTrainer: string;
  newTrainer: string;
  changeDate: string;
  attendanceBeforeChange: number;
  attendanceAfterChange: number;
  dropPercentage: number;
  droppedMembers: {
    memberName: string;
    email: string;
    lastVisitBeforeChange: string;
    totalVisitsWithOldTrainer: number;
  }[];
}

export const MemberBehaviorAnalytics: React.FC = () => {
  const { filteredData, checkinsData } = useDashboardStore();
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);

  const normalizeClassName = (name: string): string => {
    return name.replace(/\s*express\s*/gi, '').trim();
  };

  const classFormats = useMemo(() => {
    const formats = new Set<string>();
    checkinsData.forEach(checkin => {
      if (checkin.CleanedClass) {
        formats.add(normalizeClassName(checkin.CleanedClass));
      }
    });
    return Array.from(formats).sort();
  }, [checkinsData]);

  const filteredCheckins = useMemo(() => {
    if (selectedFormats.length === 0) return [];
    const validSessionIds = new Set(filteredData.map(s => s.SessionID));
    return checkinsData.filter(checkin => {
      const normalizedClass = normalizeClassName(checkin.CleanedClass);
      return selectedFormats.includes(normalizedClass) && validSessionIds.has(checkin.SessionID);
    });
  }, [checkinsData, filteredData, selectedFormats]);

  const memberStats = useMemo((): MemberStats[] => {
    if (filteredCheckins.length === 0) return [];

    const memberMap = new Map<string, {
      checkins: typeof filteredCheckins;
      bookings: number;
      checkIns: number;
      cancellations: number;
      noShows: number;
      revenue: number;
    }>();

    filteredCheckins.forEach(checkin => {
      const memberId = checkin.MemberID || checkin.Email;
      if (!memberMap.has(memberId)) {
        memberMap.set(memberId, {
          checkins: [],
          bookings: 0,
          checkIns: 0,
          cancellations: 0,
          noShows: 0,
          revenue: 0
        });
      }

      const memberData = memberMap.get(memberId)!;
      memberData.checkins.push(checkin);
      memberData.bookings++;
      if (checkin.CheckedIn) memberData.checkIns++;
      if (checkin.IsLateCancelled) memberData.cancellations++;
      if (!checkin.CheckedIn && !checkin.IsLateCancelled) memberData.noShows++;
      memberData.revenue += checkin.Paid || 0;
    });

    const today = new Date();
    
    return Array.from(memberMap.entries())
      .map(([memberId, data]) => {
        const dates = data.checkins.map(c => new Date(c.Date)).sort((a, b) => a.getTime() - b.getTime());
        const firstVisit = dates[0];
        const lastVisit = dates[dates.length - 1];
        const daysSinceLastVisit = differenceInDays(today, lastVisit);

        let visitFrequency = 0;
        if (dates.length > 1) {
          const daysBetweenVisits = dates.slice(1).map((date, i) => 
            differenceInDays(date, dates[i])
          );
          visitFrequency = daysBetweenVisits.reduce((sum, days) => sum + days, 0) / daysBetweenVisits.length;
        }

        const locationCounts = new Map<string, number>();
        const dayCounts = new Map<string, number>();
        const timeCounts = new Map<string, number>();
        const trainers = new Set<string>();

        data.checkins.forEach(c => {
          if (c.Location) locationCounts.set(c.Location, (locationCounts.get(c.Location) || 0) + 1);
          if (c.DayOfWeek) dayCounts.set(c.DayOfWeek, (dayCounts.get(c.DayOfWeek) || 0) + 1);
          if (c.Time) timeCounts.set(c.Time.substring(0, 5), (timeCounts.get(c.Time.substring(0, 5)) || 0) + 1);
          if (c.TeacherName) trainers.add(c.TeacherName);
        });

        const preferredLocation = Array.from(locationCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
        const preferredDay = Array.from(dayCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
        const preferredTime = Array.from(timeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

        const firstCheckin = data.checkins[0];
        
        return {
          memberID: memberId,
          memberName: `${firstCheckin.FirstName} ${firstCheckin.LastName}`,
          email: firstCheckin.Email,
          totalBookings: data.bookings,
          totalCheckIns: data.checkIns,
          cancellations: data.cancellations,
          noShows: data.noShows,
          cancellationRate: data.bookings > 0 ? (data.cancellations / data.bookings) * 100 : 0,
          showUpRate: data.bookings > 0 ? (data.checkIns / data.bookings) * 100 : 0,
          totalRevenue: data.revenue,
          firstVisit: format(firstVisit, 'yyyy-MM-dd'),
          lastVisit: format(lastVisit, 'yyyy-MM-dd'),
          daysSinceLastVisit,
          visitFrequency,
          preferredLocation,
          preferredDay,
          preferredTime,
          trainersAttended: Array.from(trainers)
        };
      })
      .sort((a, b) => b.totalCheckIns - a.totalCheckIns);
  }, [filteredCheckins]);

  const churnedMembers = useMemo((): ChurnedMember[] => {
    return memberStats
      .filter(member => {
        const wasRegular = member.totalCheckIns >= 3 && member.visitFrequency > 0 && member.visitFrequency <= 14;
        const hasChurned = member.daysSinceLastVisit > member.visitFrequency * 3;
        return wasRegular && hasChurned;
      })
      .map(member => ({
        ...member,
        previousFrequency: member.visitFrequency,
        daysSinceLastClass: member.daysSinceLastVisit,
        wasRegular: true
      }))
      .sort((a, b) => b.totalCheckIns - a.totalCheckIns)
      .slice(0, 20);
  }, [memberStats]);

  const trainerChanges = useMemo((): TrainerChange[] => {
    if (selectedFormats.length === 0) return [];

    const changes: TrainerChange[] = [];

    selectedFormats.forEach(className => {
      const classSessions = filteredData
        .filter(s => normalizeClassName(s.Class) === className)
        .sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());

      if (classSessions.length < 5) return;

      let currentTrainer = classSessions[0].Trainer;
      let changeIndex = -1;

      for (let i = 1; i < classSessions.length; i++) {
        if (classSessions[i].Trainer !== currentTrainer) {
          changeIndex = i;
          break;
        }
      }

      if (changeIndex === -1 || changeIndex < 3 || changeIndex >= classSessions.length - 2) return;

      const oldTrainer = currentTrainer;
      const newTrainer = classSessions[changeIndex].Trainer;
      const changeDate = classSessions[changeIndex].Date;

      const beforeSessions = classSessions.slice(Math.max(0, changeIndex - 5), changeIndex);
      const afterSessions = classSessions.slice(changeIndex, Math.min(classSessions.length, changeIndex + 5));

      const avgBefore = beforeSessions.reduce((sum, s) => sum + s.CheckedIn, 0) / beforeSessions.length;
      const avgAfter = afterSessions.reduce((sum, s) => sum + s.CheckedIn, 0) / afterSessions.length;
      const dropPercentage = avgBefore > 0 ? ((avgBefore - avgAfter) / avgBefore) * 100 : 0;

      if (dropPercentage > 15) {
        const beforeSessionIds = new Set(beforeSessions.map(s => s.SessionID));
        const afterSessionIds = new Set(afterSessions.map(s => s.SessionID));

        const membersBeforeChange = new Set(
          checkinsData
            .filter(c => beforeSessionIds.has(c.SessionID) && c.CheckedIn)
            .map(c => c.MemberID || c.Email)
        );

        const membersAfterChange = new Set(
          checkinsData
            .filter(c => afterSessionIds.has(c.SessionID) && c.CheckedIn)
            .map(c => c.MemberID || c.Email)
        );

        const droppedMemberIds = Array.from(membersBeforeChange).filter(id => !membersAfterChange.has(id));

        const droppedMembers = droppedMemberIds.map(memberId => {
          const memberCheckins = checkinsData.filter(c => 
            (c.MemberID || c.Email) === memberId && 
            beforeSessionIds.has(c.SessionID) &&
            c.CheckedIn
          );

          if (memberCheckins.length === 0) return null;

          const sortedCheckins = memberCheckins.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
          const firstCheckin = memberCheckins[0];

          return {
            memberName: `${firstCheckin.FirstName} ${firstCheckin.LastName}`,
            email: firstCheckin.Email,
            lastVisitBeforeChange: sortedCheckins[0].Date,
            totalVisitsWithOldTrainer: memberCheckins.length
          };
        }).filter((m): m is NonNullable<typeof m> => m !== null);

        if (droppedMembers.length >= 2) {
          changes.push({
            className,
            oldTrainer,
            newTrainer,
            changeDate,
            attendanceBeforeChange: Math.round(avgBefore),
            attendanceAfterChange: Math.round(avgAfter),
            dropPercentage: Math.round(dropPercentage),
            droppedMembers: droppedMembers.slice(0, 10)
          });
        }
      }
    });

    return changes.sort((a, b) => b.dropPercentage - a.dropPercentage);
  }, [selectedFormats, filteredData, checkinsData]);

  const handleFormatToggle = (className: string) => {
    setSelectedFormats(prev => 
      prev.includes(className)
        ? prev.filter(c => c !== className)
        : [...prev, className]
    );
  };

  const handleClearAll = () => {
    setSelectedFormats([]);
  };

  const topAttendees = memberStats.slice(0, 15);
  const totalMembers = memberStats.length;
  const activeMembers = memberStats.filter(m => m.daysSinceLastVisit <= 30).length;
  const atRiskMembers = memberStats.filter(m => m.daysSinceLastVisit > 30 && m.daysSinceLastVisit <= 60).length;
  const totalRevenue = memberStats.reduce((sum, m) => sum + m.totalRevenue, 0);
  const avgVisitsPerMember = totalMembers > 0 ? memberStats.reduce((sum, m) => sum + m.totalCheckIns, 0) / totalMembers : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Class Format Selector */}
      <div className="bg-white/80 glass-card rounded-3xl p-6 border border-white/20 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-gradient-to-br from-indigo-700 to-blue-900 p-2.5 rounded-xl">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Member Behavior Analytics</h2>
            <p className="text-xs text-slate-600">Select class formats to analyze member attendance, churn, and trainer impact</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Class Formats
            </label>
            <select
              onChange={(e) => {
                const value = e.target.value;
                if (value && !selectedFormats.includes(value)) {
                  setSelectedFormats(prev => [...prev, value]);
                }
              }}
              value=""
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 font-medium cursor-pointer"
            >
              <option value="">+ Add class format</option>
              {classFormats.filter(c => !selectedFormats.includes(c)).map(format => (
                <option key={format} value={format}>{format}</option>
              ))}
            </select>
          </div>

          {selectedFormats.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Selected: {selectedFormats.length}
                </span>
                <button
                  onClick={handleClearAll}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedFormats.map(className => (
                  <div
                    key={className}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-100 border border-indigo-200 text-indigo-800 text-sm font-semibold"
                  >
                    <span>{className}</span>
                    <button
                      onClick={() => handleFormatToggle(className)}
                      className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {memberStats.length > 0 && (
        <div className="space-y-6">
          {/* Overview Metrics */}
          <div className="bg-white/80 glass-card rounded-3xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-2.5 rounded-xl">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Member Overview</h3>
                <p className="text-xs text-slate-600">Key member metrics for selected formats</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Total Members</div>
                <div className="text-2xl font-bold text-slate-900">{totalMembers}</div>
              </div>

              <div className="text-center">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Active</div>
                <div className="flex items-center justify-center">
                  <span className="inline-flex px-2.5 py-1 rounded-lg text-sm font-bold border border-green-200 text-green-800 min-w-[3rem] justify-center">
                    {activeMembers}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">At Risk</div>
                <div className="flex items-center justify-center">
                  <span className="inline-flex px-2.5 py-1 rounded-lg text-sm font-bold border border-yellow-200 text-yellow-800 min-w-[3rem] justify-center">
                    {atRiskMembers}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Churned</div>
                <div className="flex items-center justify-center">
                  <span className="inline-flex px-2.5 py-1 rounded-lg text-sm font-bold border border-red-200 text-red-800 min-w-[3rem] justify-center">
                    {churnedMembers.length}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Avg Visits</div>
                <div className="text-2xl font-bold text-slate-900">{avgVisitsPerMember.toFixed(1)}</div>
              </div>

              <div className="text-center">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Revenue</div>
                <div className="text-xl font-bold text-slate-900">{formatCurrency(totalRevenue, true)}</div>
              </div>
            </div>
          </div>

          {/* Top Attendees */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-green-700 to-green-900 p-2.5 rounded-xl">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Top Attendees</h3>
                  <p className="text-xs text-slate-600">Most frequent visitors for selected classes</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider">Member</th>
                    <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider">Email</th>
                    <th className="px-3 py-2 text-right font-bold text-[10px] uppercase tracking-wider">Visits</th>
                    <th className="px-3 py-2 text-right font-bold text-[10px] uppercase tracking-wider">Frequency</th>
                    <th className="px-3 py-2 text-right font-bold text-[10px] uppercase tracking-wider">Cancel %</th>
                    <th className="px-3 py-2 text-right font-bold text-[10px] uppercase tracking-wider">Show Up</th>
                    <th className="px-3 py-2 text-right font-bold text-[10px] uppercase tracking-wider">Revenue</th>
                    <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider">Pref. Day</th>
                    <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider">Pref. Time</th>
                    <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider">Last Visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topAttendees.map((member, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors max-h-[35px] h-[35px]">
                      <td className="px-3 py-2 font-semibold text-slate-900 text-xs whitespace-nowrap truncate max-w-[150px]">
                        {member.memberName}
                      </td>
                      <td className="px-3 py-2 text-slate-700 text-xs whitespace-nowrap truncate max-w-[150px]">
                        {member.email}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-900 font-bold text-xs whitespace-nowrap">
                        {member.totalCheckIns}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700 text-xs whitespace-nowrap">
                        {member.visitFrequency > 0 ? `${member.visitFrequency.toFixed(0)}d` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold border min-w-[2.5rem] justify-center ${
                          member.cancellationRate > 20 ? 'border-red-200 text-red-800' : 'border-green-200 text-green-800'
                        }`}>
                          {member.cancellationRate.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold border min-w-[2.5rem] justify-center ${
                          member.showUpRate >= 80 ? 'border-green-200 text-green-800' :
                          member.showUpRate >= 60 ? 'border-yellow-200 text-yellow-800' :
                          'border-red-200 text-red-800'
                        }`}>
                          {member.showUpRate.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-900 font-bold text-xs whitespace-nowrap">
                        {formatCurrency(member.totalRevenue)}
                      </td>
                      <td className="px-3 py-2 text-slate-700 text-xs whitespace-nowrap">
                        {member.preferredDay}
                      </td>
                      <td className="px-3 py-2 text-slate-700 text-xs whitespace-nowrap">
                        {member.preferredTime}
                      </td>
                      <td className="px-3 py-2 text-slate-700 text-xs whitespace-nowrap">
                        {format(parseISO(member.lastVisit), 'MMM dd, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Churned Members */}
          {churnedMembers.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-red-700 to-red-900 p-2.5 rounded-xl">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Churned Members</h3>
                    <p className="text-xs text-slate-600">Regular visitors who stopped attending</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider">Member</th>
                      <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider">Email</th>
                      <th className="px-3 py-2 text-right font-bold text-[10px] uppercase tracking-wider">Total Visits</th>
                      <th className="px-3 py-2 text-right font-bold text-[10px] uppercase tracking-wider">Was Visiting Every</th>
                      <th className="px-3 py-2 text-right font-bold text-[10px] uppercase tracking-wider">Days Since Last</th>
                      <th className="px-3 py-2 text-right font-bold text-[10px] uppercase tracking-wider">Revenue Lost</th>
                      <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider">Last Visit</th>
                      <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider">Pref. Day</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {churnedMembers.map((member, index) => (
                      <tr key={index} className="hover:bg-red-50 transition-colors max-h-[35px] h-[35px]">
                        <td className="px-3 py-2 font-semibold text-slate-900 text-xs whitespace-nowrap truncate max-w-[150px]">
                          {member.memberName}
                        </td>
                        <td className="px-3 py-2 text-slate-700 text-xs whitespace-nowrap truncate max-w-[150px]">
                          {member.email}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-900 font-bold text-xs whitespace-nowrap">
                          {member.totalCheckIns}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700 text-xs whitespace-nowrap">
                          ~{member.previousFrequency.toFixed(0)} days
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <span className="inline-flex px-2.5 py-1 rounded text-xs font-bold border border-red-200 text-red-800 min-w-[2.5rem] justify-center">
                            {member.daysSinceLastClass}d
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-red-700 font-bold text-xs whitespace-nowrap">
                          {formatCurrency(member.totalRevenue)}
                        </td>
                        <td className="px-3 py-2 text-slate-700 text-xs whitespace-nowrap">
                          {format(parseISO(member.lastVisit), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-3 py-2 text-slate-700 text-xs whitespace-nowrap">
                          {member.preferredDay}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trainer Change Impact */}
          {trainerChanges.length > 0 && (
            <div className="space-y-6">
              {trainerChanges.map((change, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-200 bg-orange-50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-gradient-to-br from-orange-700 to-orange-900 p-2.5 rounded-xl">
                        <AlertTriangle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Trainer Change Impact: {change.className}</h3>
                        <p className="text-xs text-slate-600">Attendance dropped {change.dropPercentage}% after trainer change</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-white rounded-xl p-3 border border-slate-200">
                        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Old Trainer</div>
                        <div className="text-sm font-bold text-slate-900">{change.oldTrainer}</div>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-slate-200">
                        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">New Trainer</div>
                        <div className="text-sm font-bold text-slate-900">{change.newTrainer}</div>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-slate-200">
                        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Avg Before</div>
                        <div className="text-sm font-bold text-green-700">{change.attendanceBeforeChange}</div>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-slate-200">
                        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Avg After</div>
                        <div className="text-sm font-bold text-red-700">{change.attendanceAfterChange}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <h4 className="text-sm font-bold text-slate-900 mb-3">Members Who Stopped Attending ({change.droppedMembers.length})</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-700">Member</th>
                            <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-700">Email</th>
                            <th className="px-3 py-2 text-right font-bold text-[10px] uppercase tracking-wider text-slate-700">Classes w/ Old Trainer</th>
                            <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-700">Last Visit Before Change</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {change.droppedMembers.map((member, mIdx) => (
                            <tr key={mIdx} className="hover:bg-slate-50 max-h-[35px] h-[35px]">
                              <td className="px-3 py-2 font-semibold text-slate-900 text-xs whitespace-nowrap truncate max-w-[150px]">
                                {member.memberName}
                              </td>
                              <td className="px-3 py-2 text-slate-700 text-xs whitespace-nowrap truncate max-w-[150px]">
                                {member.email}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-900 font-bold text-xs whitespace-nowrap">
                                {member.totalVisitsWithOldTrainer}
                              </td>
                              <td className="px-3 py-2 text-slate-700 text-xs whitespace-nowrap">
                                {format(parseISO(member.lastVisitBeforeChange), 'MMM dd, yyyy')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {selectedFormats.length === 0 && (
        <div className="bg-white/80 glass-card rounded-3xl p-16 border border-white/20 shadow-2xl text-center">
          <div className="bg-slate-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-700 mb-3">Select Class Formats to Begin</h3>
          <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
            Choose one or more class formats to analyze member behavior, identify churned members, and detect trainer change impacts
          </p>
        </div>
      )}
    </div>
  );
};
