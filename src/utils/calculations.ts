import { SessionData, CalculatedMetrics, GroupedRow, GroupBy } from '../types';
import { 
  getCleanedClass, 
  getCleanedDay, 
  getCleanedTime, 
  getCleanedLocation,
  generateCompositeKey 
} from './cleaners';

/**
 * Calculate metrics for a group of sessions
 * @param sessions - The filtered sessions to calculate metrics from
 * @param allRawSessions - Optional: All raw sessions to calculate status accurately (ignores date filters)
 */
export function calculateMetrics(sessions: SessionData[], allRawSessions?: SessionData[]): CalculatedMetrics {
  const totalClasses = sessions.length;
  const emptyClasses = sessions.filter((s) => s.CheckedIn === 0).length;
  const nonEmptyClasses = totalClasses - emptyClasses;
  
  const totalCheckIns = sessions.reduce((sum, s) => sum + s.CheckedIn, 0);
  const totalBookings = sessions.reduce((sum, s) => sum + s.Booked, 0);
  const totalBooked = totalBookings;
  const totalCancellations = sessions.reduce((sum, s) => sum + s.LateCancelled, 0);
  const totalCapacity = sessions.reduce((sum, s) => sum + s.Capacity, 0);
  const totalRevenue = sessions.reduce((sum, s) => sum + s.Revenue, 0);
  const complimentaryVisits = sessions.reduce((sum, s) => sum + s.NonPaid, 0);
  const totalWaitlisted = sessions.reduce((sum, s) => sum + (s.Waitlisted || 0), 0);
  
  // Fill rate: total check-ins / total capacity
  const fillRate = totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0;
  
  // Cancellation rate: total cancellations / total bookings
  const cancellationRate = totalBookings > 0 ? (totalCancellations / totalBookings) * 100 : 0;
  
  // Class avg (all classes): total check-ins / total classes
  const classAvg = totalClasses > 0 ? totalCheckIns / totalClasses : 0;
  
  // Class avg (non-empty classes only)
  const classAvgNonEmpty = nonEmptyClasses > 0 ? totalCheckIns / nonEmptyClasses : 0;
  
  // Revenue per booking
  const revPerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  
  // Revenue per check-in
  const revPerCheckin = totalCheckIns > 0 ? totalRevenue / totalCheckIns : 0;
  
  // Revenue lost per cancellation (avg revenue per booking * cancellations)
  const revLostPerCancellation = totalCancellations > 0 ? revPerBooking * totalCancellations : 0;
  
  // Weighted average (capacity-weighted average attendance)
  const weightedSum = sessions.reduce((sum, s) => sum + (s.CheckedIn / s.Capacity) * s.Capacity, 0);
  const weightedAverage = totalCapacity > 0 ? (weightedSum / totalCapacity) * 100 : 0;
  
  // Consistency score: standard deviation of attendance (lower is more consistent)
  const avgAttendance = classAvg;
  const variance = sessions.reduce((sum, s) => {
    const diff = s.CheckedIn - avgAttendance;
    return sum + diff * diff;
  }, 0) / totalClasses;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = avgAttendance > 0 ? Math.max(0, 100 - (stdDev / avgAttendance) * 100) : 0;
  
  // Status: Active if most recent class is within 8 days (use allRawSessions to ignore date filters)
  const sessionsForStatus = allRawSessions || sessions;
  
  // Get the unique identifier for this group (class + day + time + location)
  const groupIdentifier = sessions[0] ? 
    `${sessions[0].SessionName || sessions[0].Class}|${sessions[0].Day}|${sessions[0].Time}|${sessions[0].Location}` : '';
  
  // Find all sessions matching this group from raw data
  const matchingSessions = groupIdentifier ? 
    sessionsForStatus.filter(s => 
      `${s.SessionName || s.Class}|${s.Day}|${s.Time}|${s.Location}` === groupIdentifier
    ) : sessions;
  
  const mostRecentDate = matchingSessions.reduce((latest, s) => {
    const sessionDate = new Date(s.Date);
    return sessionDate > latest ? sessionDate : latest;
  }, new Date(0));
  
  const daysSinceLastClass = (new Date().getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24);
  const status = daysSinceLastClass <= 8 ? 'Active' : 'Inactive';
  
  return {
    classes: totalClasses,
    emptyClasses,
    nonEmptyClasses,
    complimentaryVisits,
    fillRate,
    cancellationRate,
    rank: 0, // Will be set after sorting
    classAvg,
    classAvgNonEmpty,
    revPerBooking,
    revPerCheckin,
    revLostPerCancellation,
    weightedAverage,
    consistencyScore,
    totalRevenue,
    totalCheckIns,
    totalBookings,
    totalBooked,
    totalCancellations,
    totalCapacity,
    totalWaitlisted,
    status,
    mostRecentDate,
  };
}

/**
 * Group sessions by a specific field and calculate metrics
 */
export function groupData(
  sessions: SessionData[],
  groupBy: GroupBy,
  minCheckins: number = 0,
  minClasses: number = 0,
  allRawSessions?: SessionData[],
  statusFilter?: 'all' | 'active' | 'inactive'
): GroupedRow[] {
  // Group sessions
  const groups = new Map<string, SessionData[]>();
  
  sessions.forEach((session) => {
    let key = '';
    
    // Generate grouping key based on groupBy type
    switch (groupBy) {
      case 'ClassDayTimeLocation':
        key = generateCompositeKey(
          session.SessionName || session.Class,
          session.Day,
          session.Time,
          session.Location
        );
        break;
      case 'ClassDayTimeLocationTrainer':
        key = generateCompositeKey(
          session.SessionName || session.Class,
          session.Day,
          session.Time,
          session.Location,
          session.Trainer
        );
        break;
      case 'LocationClass':
        key = `${getCleanedLocation(session.Location)}|${getCleanedClass(session.SessionName || session.Class)}`;
        break;
      case 'ClassDay':
        key = `${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}`;
        break;
      case 'ClassDayTrainer':
        key = `${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${session.Trainer}`;
        break;
      case 'DayTimeLocation':
        key = `${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}`;
        break;
      case 'ClassTime':
        key = `${getCleanedClass(session.SessionName || session.Class)}|${getCleanedTime(session.Time)}`;
        break;
      case 'TrainerLocation':
        key = `${session.Trainer}|${getCleanedLocation(session.Location)}`;
        break;
      case 'DayLocation':
        key = `${getCleanedDay(session.Day)}|${getCleanedLocation(session.Location)}`;
        break;
      case 'TimeLocation':
        key = `${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}`;
        break;
      case 'ClassType':
        key = `${getCleanedClass(session.SessionName || session.Class)}|${session.Type}`;
        break;
      case 'TypeLocation':
        key = `${session.Type}|${getCleanedLocation(session.Location)}`;
        break;
      case 'TrainerDay':
        key = `${session.Trainer}|${getCleanedDay(session.Day)}`;
        break;
      case 'ClassTrainer':
        key = `${getCleanedClass(session.SessionName || session.Class)}|${session.Trainer}`;
        break;
      case 'DayTime':
        key = `${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}`;
        break;
      case 'ClassLocation':
        key = `${getCleanedClass(session.SessionName || session.Class)}|${getCleanedLocation(session.Location)}`;
        break;
      case 'TrainerTime':
        key = `${session.Trainer}|${getCleanedTime(session.Time)}`;
        break;
      case 'Class':
        key = getCleanedClass(session.SessionName || session.Class);
        break;
      case 'Day':
        key = getCleanedDay(session.Day);
        break;
      case 'Time':
        key = getCleanedTime(session.Time);
        break;
      case 'Location':
        key = getCleanedLocation(session.Location);
        break;
      default:
        key = String((session as any)[groupBy] || '');
    }
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(session);
  });
  
  // Calculate metrics for each group
  const groupedRows: GroupedRow[] = [];
  
  groups.forEach((groupSessions, key) => {
    const metrics = calculateMetrics(groupSessions, allRawSessions);
    
    // Filter by minimum check-ins
    if (metrics.totalCheckIns < minCheckins) {
      return;
    }
    
    // Filter by minimum classes
    if (groupSessions.length < minClasses) {
      return;
    }
    
    // Filter by status if specified
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'active' && metrics.status !== 'Active') {
        return;
      }
      if (statusFilter === 'inactive' && metrics.status !== 'Inactive') {
        return;
      }
    }
    
    // Get representative values or "Multiple Values"
    const firstSession = groupSessions[0];
    const hasMultipleValues = (field: keyof SessionData): boolean => {
      return groupSessions.some((s) => s[field] !== firstSession[field]);
    };
    
    const groupedRow: GroupedRow = {
      groupKey: groupBy,
      groupValue: key,
      isGroupRow: true,
      children: groupSessions,
      ...metrics,
      
      // Store cleaned values for display
      cleanedClass: getCleanedClass(firstSession.SessionName || firstSession.Class),
      cleanedDay: getCleanedDay(firstSession.Day),
      cleanedTime: getCleanedTime(firstSession.Time),
      cleanedLocation: getCleanedLocation(firstSession.Location),
      
      // Include single values or "Multiple Values"
      TrainerID: hasMultipleValues('TrainerID') ? 'Multiple Values' : firstSession.TrainerID,
      FirstName: hasMultipleValues('FirstName') ? 'Multiple' : firstSession.FirstName,
      LastName: hasMultipleValues('LastName') ? 'Multiple' : firstSession.LastName,
      Trainer: hasMultipleValues('Trainer') ? 'Multiple Values' : firstSession.Trainer,
      Location: hasMultipleValues('Location') ? 'Multiple Values' : getCleanedLocation(firstSession.Location),
      Date: hasMultipleValues('Date') ? 'Multiple Values' : firstSession.Date,
      Day: hasMultipleValues('Day') ? 'Multiple Values' : getCleanedDay(firstSession.Day),
      Time: hasMultipleValues('Time') ? 'Multiple Values' : getCleanedTime(firstSession.Time),
      Class: hasMultipleValues('Class') ? 'Multiple Values' : getCleanedClass(firstSession.SessionName || firstSession.Class),
      Type: hasMultipleValues('Type') ? 'Multiple Values' : firstSession.Type,
      SessionName: hasMultipleValues('SessionName') ? 'Multiple Values' : firstSession.SessionName,
    };
    
    groupedRows.push(groupedRow);
  });
  
  // Assign ranks based on classAvg
  groupedRows.sort((a, b) => b.classAvg - a.classAvg);
  groupedRows.forEach((row, index) => {
    row.rank = index + 1;
  });
  
  return groupedRows;
}

/**
 * Format currency for Indian locale
 */
export function formatCurrency(value: number, compact: boolean = false): string {
  if (compact) {
    if (value >= 10000000) {
      // Crores
      return `₹${(value / 10000000).toFixed(1)}Cr`;
    } else if (value >= 100000) {
      // Lakhs
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) {
      // Thousands
      return `₹${(value / 1000).toFixed(1)}K`;
    }
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with Indian locale
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Get unique values from a field
 */
export function getUniqueValues(sessions: SessionData[], field: keyof SessionData): string[] {
  const values = new Set<string>();
  sessions.forEach((session) => {
    const value = String(session[field]);
    if (value) values.add(value);
  });
  return Array.from(values).sort();
}

/**
 * Calculate totals row for current view
 */
export function calculateTotalsRow(data: (SessionData | GroupedRow)[]): CalculatedMetrics {
  const sessions: SessionData[] = [];
  
  data.forEach((row) => {
    if ('isGroupRow' in row && row.isGroupRow && row.children) {
      sessions.push(...row.children);
    } else {
      sessions.push(row as SessionData);
    }
  });
  
  return calculateMetrics(sessions);
}
