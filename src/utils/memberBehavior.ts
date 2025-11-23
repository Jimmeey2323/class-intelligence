import { CheckinData, MemberAttendancePattern, BookingBehavior, MemberCohort } from '../types';

/**
 * Analyzes member attendance patterns to determine consistency
 * Returns a score from 0-100 indicating how consistently they attend the same classes
 */
export function calculateConsistencyScore(classLoyalty: { [className: string]: number }): number {
  const classes = Object.values(classLoyalty);
  if (classes.length === 0) return 0;
  
  const totalVisits = classes.reduce((sum, count) => sum + count, 0);
  const maxVisits = Math.max(...classes);
  
  // If they only go to 1-2 classes, they're highly consistent
  if (classes.length <= 2) return 90 + (classes.length === 1 ? 10 : 0);
  
  // Calculate concentration: how much they favor their top class
  const concentration = maxVisits / totalVisits;
  
  // High concentration = consistent, low = random
  return Math.round(concentration * 100);
}

/**
 * Determines booking pattern based on consistency score and class diversity
 */
export function determineBookingPattern(
  consistencyScore: number,
  uniqueClasses: number
): 'consistent' | 'random' | 'mixed' {
  if (consistencyScore >= 70) return 'consistent';
  if (consistencyScore <= 40 && uniqueClasses >= 5) return 'random';
  return 'mixed';
}

/**
 * Analyzes all members' attendance patterns from checkin data
 */
export function analyzeMemberPatterns(checkins: CheckinData[]): MemberAttendancePattern[] {
  const memberMap = new Map<string, CheckinData[]>();
  
  // Group checkins by member
  checkins.forEach(checkin => {
    const existing = memberMap.get(checkin.MemberID) || [];
    existing.push(checkin);
    memberMap.set(checkin.MemberID, existing);
  });
  
  const patterns: MemberAttendancePattern[] = [];
  
  memberMap.forEach((memberCheckins, memberId) => {
    const sortedCheckins = [...memberCheckins].sort((a, b) => 
      new Date(a.Date).getTime() - new Date(b.Date).getTime()
    );
    
    const checkedInVisits = memberCheckins.filter(c => c.CheckedIn && !c.IsLateCancelled);
    const cancelled = memberCheckins.filter(c => c.IsLateCancelled);
    const lateCancelled = memberCheckins.filter(c => c.IsLateCancelled);
    
    // Build loyalty maps
    const classLoyalty: { [key: string]: number } = {};
    const locationLoyalty: { [key: string]: number } = {};
    const dayPreference: { [key: string]: number } = {};
    const timePreference: { [key: string]: number } = {};
    
    checkedInVisits.forEach(c => {
      classLoyalty[c.CleanedClass] = (classLoyalty[c.CleanedClass] || 0) + 1;
      locationLoyalty[c.Location] = (locationLoyalty[c.Location] || 0) + 1;
      dayPreference[c.DayOfWeek] = (dayPreference[c.DayOfWeek] || 0) + 1;
      timePreference[c.Time] = (timePreference[c.Time] || 0) + 1;
    });
    
    const consistencyScore = calculateConsistencyScore(classLoyalty);
    const uniqueClassNames = Object.keys(classLoyalty);
    const bookingPattern = determineBookingPattern(consistencyScore, uniqueClassNames.length);
    
    const totalRevenue = memberCheckins.reduce((sum, c) => sum + c.Paid, 0);
    const avgClassNo = checkedInVisits.length > 0
      ? checkedInVisits.reduce((sum, c) => sum + c.ClassNo, 0) / checkedInVisits.length
      : 0;
    
    const latestCheckin = sortedCheckins[sortedCheckins.length - 1];
    
    patterns.push({
      memberId,
      memberName: `${latestCheckin.FirstName} ${latestCheckin.LastName}`,
      email: latestCheckin.Email,
      totalClasses: checkedInVisits.length,
      lifetimeClassNo: Math.round(avgClassNo),
      paymentCategory: latestCheckin.CleanedCategory,
      isNew: latestCheckin.IsNew.toLowerCase().includes('new'),
      attendedClasses: [...new Set(checkedInVisits.map(c => c.SessionID))],
      attendedClassNames: uniqueClassNames,
      attendedLocations: Object.keys(locationLoyalty),
      attendedDays: Object.keys(dayPreference),
      cancelledCount: cancelled.length,
      lateCancelledCount: lateCancelled.length,
      consistencyScore,
      classLoyalty,
      locationLoyalty,
      dayPreference,
      timePreference,
      firstVisit: sortedCheckins[0].Date,
      lastVisit: latestCheckin.Date,
      bookingPattern,
      cancellationRate: memberCheckins.length > 0 
        ? (cancelled.length / memberCheckins.length) * 100 
        : 0,
      averageRevenue: totalRevenue / Math.max(checkedInVisits.length, 1),
    });
  });
  
  return patterns;
}

/**
 * Analyzes booking and cancellation behavior by segment
 */
export function analyzeBookingBehaviorBySegment(
  checkins: CheckinData[],
  segmentBy: 'paymentCategory' | 'classType' | 'location' | 'trainer'
): BookingBehavior[] {
  const segmentMap = new Map<string, CheckinData[]>();
  
  // Group checkins by segment
  checkins.forEach(checkin => {
    let segmentKey: string;
    switch (segmentBy) {
      case 'paymentCategory':
        segmentKey = checkin.CleanedCategory;
        break;
      case 'classType':
        segmentKey = checkin.CleanedClass;
        break;
      case 'location':
        segmentKey = checkin.Location;
        break;
      case 'trainer':
        segmentKey = checkin.TeacherName;
        break;
    }
    
    const existing = segmentMap.get(segmentKey) || [];
    existing.push(checkin);
    segmentMap.set(segmentKey, existing);
  });
  
  const behaviors: BookingBehavior[] = [];
  
  segmentMap.forEach((segmentCheckins, segment) => {
    const uniqueMembers = new Set(segmentCheckins.map(c => c.MemberID));
    const checkedIn = segmentCheckins.filter(c => c.CheckedIn && !c.IsLateCancelled);
    const cancelled = segmentCheckins.filter(c => !c.CheckedIn || c.IsLateCancelled);
    const lateCancelled = segmentCheckins.filter(c => c.IsLateCancelled);
    
    const newMembers = segmentCheckins.filter(c => c.IsNew.toLowerCase().includes('new'));
    const returning = segmentCheckins.filter(c => !c.IsNew.toLowerCase().includes('new'));
    
    // Analyze member patterns for this segment
    const memberPatterns = analyzeMemberPatterns(segmentCheckins);
    const consistent = memberPatterns.filter(m => m.bookingPattern === 'consistent').length;
    const random = memberPatterns.filter(m => m.bookingPattern === 'random').length;
    
    const totalRevenue = segmentCheckins.reduce((sum, c) => sum + c.Paid, 0);
    const avgClassNo = checkedIn.length > 0
      ? checkedIn.reduce((sum, c) => sum + c.ClassNo, 0) / checkedIn.length
      : 0;
    
    behaviors.push({
      segment,
      segmentType: segmentBy,
      totalMembers: uniqueMembers.size,
      totalBookings: segmentCheckins.length,
      totalCheckIns: checkedIn.length,
      totalCancellations: cancelled.length,
      lateCancellations: lateCancelled.length,
      cancellationRate: (cancelled.length / segmentCheckins.length) * 100,
      lateCancellationRate: (lateCancelled.length / segmentCheckins.length) * 100,
      showUpRate: (checkedIn.length / segmentCheckins.length) * 100,
      averageBookingsPerMember: segmentCheckins.length / uniqueMembers.size,
      consistentMembers: consistent,
      randomMembers: random,
      newMembers: new Set(newMembers.map(c => c.MemberID)).size,
      returningMembers: new Set(returning.map(c => c.MemberID)).size,
      averageClassNo: avgClassNo,
      totalRevenue,
      averageRevenuePerMember: totalRevenue / uniqueMembers.size,
    });
  });
  
  return behaviors.sort((a, b) => b.totalMembers - a.totalMembers);
}

/**
 * Analyzes member cohorts (new, returning, loyal, at-risk, churned)
 */
export function analyzeMemberCohorts(checkins: CheckinData[]): MemberCohort[] {
  const memberPatterns = analyzeMemberPatterns(checkins);
  
  const cohorts: { [key: string]: MemberAttendancePattern[] } = {
    new: [],
    returning: [],
    loyal: [],
    'at-risk': [],
    churned: [],
  };
  
  const now = new Date();
  
  memberPatterns.forEach(member => {
    const daysSinceLastVisit = Math.floor(
      (now.getTime() - new Date(member.lastVisit).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Categorize member
    if (member.isNew || member.lifetimeClassNo <= 3) {
      cohorts.new.push(member);
    } else if (member.totalClasses >= 20 && member.consistencyScore >= 60) {
      cohorts.loyal.push(member);
    } else if (daysSinceLastVisit > 60) {
      cohorts.churned.push(member);
    } else if (daysSinceLastVisit > 30 || member.cancellationRate > 30) {
      cohorts['at-risk'].push(member);
    } else {
      cohorts.returning.push(member);
    }
  });
  
  const result: MemberCohort[] = [];
  
  Object.entries(cohorts).forEach(([cohortType, members]) => {
    if (members.length === 0) return;
    
    const totalClasses = members.reduce((sum, m) => sum + m.totalClasses, 0);
    const totalRevenue = members.reduce((sum, m) => sum + m.averageRevenue * m.totalClasses, 0);
    const totalCancellations = members.reduce((sum, m) => sum + m.cancelledCount, 0);
    const totalBookings = members.reduce((sum, m) => sum + m.totalClasses + m.cancelledCount, 0);
    
    // Build payment mix
    const paymentCounts = {
      memberships: 0,
      packages: 0,
      introOffers: 0,
      singleClasses: 0,
    };
    
    members.forEach(m => {
      const cat = m.paymentCategory.toLowerCase();
      if (cat.includes('membership')) paymentCounts.memberships++;
      else if (cat.includes('package')) paymentCounts.packages++;
      else if (cat.includes('intro')) paymentCounts.introOffers++;
      else paymentCounts.singleClasses++;
    });
    
    // Find preferred classes
    const classCount: { [key: string]: number } = {};
    const locationCount: { [key: string]: number } = {};
    
    members.forEach(m => {
      Object.entries(m.classLoyalty).forEach(([className, count]) => {
        classCount[className] = (classCount[className] || 0) + count;
      });
      Object.entries(m.locationLoyalty).forEach(([location, count]) => {
        locationCount[location] = (locationCount[location] || 0) + count;
      });
    });
    
    const preferredClasses = Object.entries(classCount)
      .map(([className, count]) => ({ className, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    const preferredLocations = Object.entries(locationCount)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    result.push({
      cohortType: cohortType as 'new' | 'returning' | 'loyal' | 'at-risk' | 'churned',
      memberCount: members.length,
      totalClasses,
      averageClassesPerMember: totalClasses / members.length,
      totalRevenue,
      averageRevenuePerMember: totalRevenue / members.length,
      cancellationRate: (totalCancellations / totalBookings) * 100,
      retentionRate: ((members.length - cohorts.churned.length) / members.length) * 100,
      paymentMix: paymentCounts,
      preferredClasses,
      preferredLocations,
    });
  });
  
  return result;
}
