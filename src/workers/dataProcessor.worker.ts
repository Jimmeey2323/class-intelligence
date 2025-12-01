import { SessionData, GroupBy, GroupedRow, CalculatedMetrics } from '../types';
import { getCleanedClass, getCleanedDay, getCleanedTime, getCleanedLocation, generateCompositeKey } from '../utils/cleaners';

// Define the message types
type WorkerMessage = 
  | { type: 'PROCESS_DATA'; payload: { rawData: SessionData[]; activeClassesData: any } }
  | { type: 'GROUP_DATA'; payload: { sessions: SessionData[]; groupBy: GroupBy; minCheckins: number; minClasses: number } };

// Helper to calculate metrics (copied from calculations.ts to avoid circular deps or complex imports)
function calculateMetrics(sessions: SessionData[]): CalculatedMetrics {
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
  const waitlistRate = totalCapacity > 0 ? (totalWaitlisted / totalCapacity) * 100 : 0;
  
  const fillRate = totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0;
  const cancellationRate = totalBookings > 0 ? (totalCancellations / totalBookings) * 100 : 0;
  const classAvg = totalClasses > 0 ? totalCheckIns / totalClasses : 0;
  const classAvgNonEmpty = nonEmptyClasses > 0 ? totalCheckIns / nonEmptyClasses : 0;
  const revPerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  const revPerCheckin = totalCheckIns > 0 ? totalRevenue / totalCheckIns : 0;
  const revLostPerCancellation = totalCancellations > 0 ? revPerBooking * totalCancellations : 0;
  
  const weightedSum = sessions.reduce((sum, s) => sum + (s.CheckedIn / s.Capacity) * s.Capacity, 0);
  const weightedAverage = totalCapacity > 0 ? (weightedSum / totalCapacity) * 100 : 0;
  
  const avgAttendance = classAvg;
  const variance = sessions.reduce((sum, s) => {
    const diff = s.CheckedIn - avgAttendance;
    return sum + diff * diff;
  }, 0) / totalClasses;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = avgAttendance > 0 ? Math.max(0, 100 - (stdDev / avgAttendance) * 100) : 0;
  
  const status: 'Active' | 'Inactive' = sessions.some(s => s.Status === 'Active') ? 'Active' : 'Inactive';
  
  const mostRecentDate = sessions.reduce((latest, s) => {
    const sessionDate = new Date(s.Date);
    return sessionDate > latest ? sessionDate : latest;
  }, new Date(0));
  
  // Composite score calculation
  const attendanceScore = Math.min(classAvg * 5, 100);
  const fillRateScore = Math.min(fillRate, 100);
  const sessionScore = Math.min(totalClasses * 2, 100);
  const compositeScore = (attendanceScore * 0.4) + (fillRateScore * 0.35) + (sessionScore * 0.25);

  return {
    classes: totalClasses,
    emptyClasses,
    nonEmptyClasses,
    complimentaryVisits,
    fillRate,
    cancellationRate,
    waitlistRate,
    rank: 0,
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
    compositeScore: Math.round(compositeScore * 100) / 100,
  };
}

// Helper to normalize time
const normalizeTime = (timeStr: string): string => {
  if (!timeStr) return '';
  const time12Match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (time12Match) {
    let [, hours, minutes, period] = time12Match;
    let hour24 = parseInt(hours, 10);
    if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
    if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
    return `${hour24.toString().padStart(2, '0')}:${minutes}`;
  }
  const time24Match = timeStr.match(/^(\d{1,2}):(\d{2})(:\d{2})?/);
  if (time24Match) {
    return `${time24Match[1].padStart(2, '0')}:${time24Match[2]}`;
  }
  return timeStr.toLowerCase().trim();
};

// State to hold data in the worker
let processedRawData: SessionData[] = [];

self.onmessage = (e: MessageEvent<WorkerMessage | { type: 'APPLY_FILTERS'; payload: any }>) => {
  const { type, payload } = e.data;

  if (type === 'PROCESS_DATA') {
    const { rawData, activeClassesData } = payload;
    
    const enrichedData = rawData.map((session: any) => {
      const fillRate = session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0;
      let status: 'Active' | 'Inactive' = 'Inactive';
      
      if (activeClassesData && Object.keys(activeClassesData).length > 0) {
        const sessionDay = session.Day;
        if (sessionDay && activeClassesData[sessionDay]) {
          const normalizeString = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normalizedSessionClass = normalizeString(session.Class);
          const normalizedSessionLocation = normalizeString(session.Location);
          const normalizedSessionTime = normalizeTime(session.Time);
          
          const dayClasses = activeClassesData[sessionDay] || [];
          
          const isActive = dayClasses.some((activeClass: any) => {
            const normalizedActiveClass = normalizeString(activeClass.className);
            const normalizedActiveLocation = normalizeString(activeClass.location);
            const normalizedActiveTime = normalizeTime(activeClass.time);
            
            const cleanClassName = (name: string) => normalizeString(name).replace(/^studio/i, '').replace(/^the/i, '').trim();
            const cleanedSessionClass = cleanClassName(session.Class);
            const cleanedActiveClass = cleanClassName(activeClass.className);
            
            const classMatch = cleanedActiveClass.includes(cleanedSessionClass) || cleanedSessionClass.includes(cleanedActiveClass) || normalizedActiveClass.includes(normalizedSessionClass) || normalizedSessionClass.includes(normalizedActiveClass);
            const locationMatch = normalizedActiveLocation.includes(normalizedSessionLocation) || normalizedSessionLocation.includes(normalizedActiveLocation);
            const timeMatch = normalizedActiveTime === normalizedSessionTime;
            
            return classMatch && locationMatch && timeMatch;
          });
          status = isActive ? 'Active' : 'Inactive';
        }
      } else {
        if (session.Date) {
          try {
            const sessionDate = new Date(session.Date);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            status = sessionDate >= thirtyDaysAgo ? 'Active' : 'Inactive';
          } catch (e) {}
        }
      }
      
      return { ...session, FillRate: fillRate, Status: status };
    });

    processedRawData = enrichedData;
    self.postMessage({ type: 'DATA_PROCESSED', payload: enrichedData });
  }

  if (type === 'APPLY_FILTERS') {
    const { filters, viewMode, groupBy, sortColumn, sortDirection, excludeHostedClasses, rankingMetric } = payload;
    
    if (processedRawData.length === 0) {
      self.postMessage({ type: 'FILTERS_APPLIED', payload: { filteredData: [], processedData: [] } });
      return;
    }

    const dataToFilter = processedRawData; 
    const hostedPattern = /hosted|bridal|lrs|x p57|rugby|wework|olympics|birthday|host|raheja|pop|workshop|community|physique|soundrise|outdoor|p57 x|x/i;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const filtered = dataToFilter.filter((row) => {
      const rowDate = new Date(row.Date);
      if (rowDate >= today) return false;
      if (excludeHostedClasses) {
        const className = (row.SessionName || row.Class || '').toLowerCase();
        if (hostedPattern.test(className)) return false;
      }
      if (new Date(rowDate) < new Date(filters.dateFrom) || new Date(rowDate) > new Date(filters.dateTo)) return false;
      if (filters.trainers.length > 0 && !filters.trainers.includes(row.Trainer)) return false;
      if (filters.locations.length > 0 && !filters.locations.includes(row.Location)) return false;
      if (filters.classTypes.length > 0 && !filters.classTypes.includes(row.Type)) return false;
      if (filters.classes.length > 0 && !filters.classes.includes(row.Class)) return false;
      
      if (filters.statusFilter && filters.statusFilter !== 'all') {
        const rowStatus = row.Status || 'Inactive';
        if (filters.statusFilter === 'active' && rowStatus !== 'Active') return false;
        if (filters.statusFilter === 'inactive' && rowStatus !== 'Inactive') return false;
      }
      
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          row.Class.toLowerCase().includes(query) ||
          row.Trainer.toLowerCase().includes(query) ||
          row.Location.toLowerCase().includes(query) ||
          row.Type.toLowerCase().includes(query)
        );
      }
      return true;
    });

    let resultData: any[] = [];

    if (viewMode === 'grouped') {
      const groups = new Map<string, SessionData[]>();
      filtered.forEach((session) => {
        let key = '';
        const normalizedTime = normalizeTime(session.Time);
        const hour = parseInt(normalizedTime.split(':')[0] || '0');
        
        switch (groupBy) {
          case 'ClassDayTimeLocation': key = generateCompositeKey(session.SessionName || session.Class, session.Day, session.Time, session.Location); break;
          case 'ClassDayTimeLocationTrainer': key = generateCompositeKey(session.SessionName || session.Class, session.Day, session.Time, session.Location, session.Trainer); break;
          case 'LocationClass': key = `${getCleanedLocation(session.Location)}|${getCleanedClass(session.SessionName || session.Class)}`; break;
          case 'ClassDay': key = `${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}`; break;
          case 'ClassDayTrainer': key = `${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${session.Trainer}`; break;
          case 'DayTimeLocation': key = `${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}`; break;
          case 'ClassTime': key = `${getCleanedClass(session.SessionName || session.Class)}|${getCleanedTime(session.Time)}`; break;
          case 'TrainerLocation': key = `${session.Trainer}|${getCleanedLocation(session.Location)}`; break;
          case 'DayLocation': key = `${getCleanedDay(session.Day)}|${getCleanedLocation(session.Location)}`; break;
          case 'TimeLocation': key = `${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}`; break;
          case 'ClassType': key = `${getCleanedClass(session.SessionName || session.Class)}|${session.Type}`; break;
          case 'TypeLocation': key = `${session.Type}|${getCleanedLocation(session.Location)}`; break;
          case 'TrainerDay': key = `${session.Trainer}|${getCleanedDay(session.Day)}`; break;
          case 'ClassTrainer': key = `${getCleanedClass(session.SessionName || session.Class)}|${session.Trainer}`; break;
          case 'DayTime': key = `${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}`; break;
          case 'ClassLocation': key = `${getCleanedClass(session.SessionName || session.Class)}|${getCleanedLocation(session.Location)}`; break;
          case 'TrainerTime': key = `${session.Trainer}|${getCleanedTime(session.Time)}`; break;
          case 'AMSessions': key = hour < 12 ? `AM - ${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}` : ''; break;
          case 'PMSessions': key = hour >= 12 ? `PM - ${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}` : ''; break;
          case 'MorningClasses': key = (hour >= 6 && hour < 12) ? `Morning (6am-12pm) - ${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}` : ''; break;
          case 'EveningClasses': key = (hour >= 17 && hour < 21) ? `Evening (5pm-9pm) - ${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}` : ''; break;
          case 'Weekday': {
            const day = session.Day.toLowerCase();
            const isWeekday = !['saturday', 'sunday', 'sat', 'sun'].includes(day);
            key = isWeekday ? `Weekday - ${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}` : '';
            break;
          }
          case 'Weekend': {
            const day = session.Day.toLowerCase();
            const isWeekend = ['saturday', 'sunday', 'sat', 'sun'].includes(day);
            key = isWeekend ? `Weekend - ${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}` : '';
            break;
          }
          case 'Class': key = getCleanedClass(session.SessionName || session.Class); break;
          case 'Day': key = getCleanedDay(session.Day); break;
          case 'Time': key = getCleanedTime(session.Time); break;
          case 'Location': key = getCleanedLocation(session.Location); break;
          default: key = String((session as any)[groupBy] || '');
        }
        if (key && !groups.has(key)) groups.set(key, []);
        if (key) groups.get(key)!.push(session);
      });

      const groupedRows: GroupedRow[] = [];
      groups.forEach((groupSessions, key) => {
        const metrics = calculateMetrics(groupSessions);
        if (metrics.totalCheckIns < filters.minCheckins || groupSessions.length < (filters.minClasses || 0)) return;
        
        const firstSession = groupSessions[0];
        const hasMultipleValues = (field: keyof SessionData) => groupSessions.some((s) => s[field] !== firstSession[field]);
        
        groupedRows.push({
          groupKey: groupBy,
          groupValue: key,
          isGroupRow: true,
          children: groupSessions,
          ...metrics,
          cleanedClass: getCleanedClass(firstSession.SessionName || firstSession.Class),
          cleanedDay: getCleanedDay(firstSession.Day),
          cleanedTime: getCleanedTime(firstSession.Time),
          cleanedLocation: getCleanedLocation(firstSession.Location),
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
        });
      });

      groupedRows.sort((a, b) => {
        const aVal = (a as any)[rankingMetric] || 0;
        const bVal = (b as any)[rankingMetric] || 0;
        const multiplier = (rankingMetric === 'cancellationRate' || rankingMetric === 'emptyClasses') ? 1 : -1;
        return (aVal - bVal) * multiplier;
      });
      groupedRows.forEach((row, index) => { row.rank = index + 1; });
      
      resultData = groupedRows;
    } else {
      resultData = filtered;
    }

    if (sortColumn) {
      resultData.sort((a, b) => {
        const aVal = (a as any)[sortColumn];
        const bVal = (b as any)[sortColumn];
        const multiplier = sortDirection === 'asc' ? 1 : -1;
        if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * multiplier;
        return String(aVal).localeCompare(String(bVal)) * multiplier;
      });
    }

    self.postMessage({ type: 'FILTERS_APPLIED', payload: { filteredData: filtered, processedData: resultData } });
  }

  if (type === 'GROUP_DATA') {
    const { sessions, groupBy, minCheckins, minClasses } = payload;
    const groups = new Map<string, SessionData[]>();
    
    sessions.forEach((session) => {
      let key = '';
      const normalizedTime = normalizeTime(session.Time);
      const hour = parseInt(normalizedTime.split(':')[0] || '0');
      
      switch (groupBy) {
        case 'ClassDayTimeLocation':
          key = generateCompositeKey(session.SessionName || session.Class, session.Day, session.Time, session.Location);
          break;
        case 'ClassDayTimeLocationTrainer':
          key = generateCompositeKey(session.SessionName || session.Class, session.Day, session.Time, session.Location, session.Trainer);
          break;
        case 'LocationClass': key = `${getCleanedLocation(session.Location)}|${getCleanedClass(session.SessionName || session.Class)}`; break;
        case 'ClassDay': key = `${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}`; break;
        case 'ClassDayTrainer': key = `${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${session.Trainer}`; break;
        case 'DayTimeLocation': key = `${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}`; break;
        case 'ClassTime': key = `${getCleanedClass(session.SessionName || session.Class)}|${getCleanedTime(session.Time)}`; break;
        case 'TrainerLocation': key = `${session.Trainer}|${getCleanedLocation(session.Location)}`; break;
        case 'DayLocation': key = `${getCleanedDay(session.Day)}|${getCleanedLocation(session.Location)}`; break;
        case 'TimeLocation': key = `${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}`; break;
        case 'ClassType': key = `${getCleanedClass(session.SessionName || session.Class)}|${session.Type}`; break;
        case 'TypeLocation': key = `${session.Type}|${getCleanedLocation(session.Location)}`; break;
        case 'TrainerDay': key = `${session.Trainer}|${getCleanedDay(session.Day)}`; break;
        case 'ClassTrainer': key = `${getCleanedClass(session.SessionName || session.Class)}|${session.Trainer}`; break;
        case 'DayTime': key = `${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}`; break;
        case 'ClassLocation': key = `${getCleanedClass(session.SessionName || session.Class)}|${getCleanedLocation(session.Location)}`; break;
        case 'TrainerTime': key = `${session.Trainer}|${getCleanedTime(session.Time)}`; break;
        case 'AMSessions': key = hour < 12 ? `AM - ${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}` : ''; break;
        case 'PMSessions': key = hour >= 12 ? `PM - ${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}` : ''; break;
        case 'MorningClasses': key = (hour >= 6 && hour < 12) ? `Morning (6am-12pm) - ${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}` : ''; break;
        case 'EveningClasses': key = (hour >= 17 && hour < 21) ? `Evening (5pm-9pm) - ${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}` : ''; break;
        case 'Weekday': {
          const day = session.Day.toLowerCase();
          const isWeekday = !['saturday', 'sunday', 'sat', 'sun'].includes(day);
          key = isWeekday ? `Weekday - ${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}` : '';
          break;
        }
        case 'Weekend': {
          const day = session.Day.toLowerCase();
          const isWeekend = ['saturday', 'sunday', 'sat', 'sun'].includes(day);
          key = isWeekend ? `Weekend - ${getCleanedClass(session.SessionName || session.Class)}|${getCleanedDay(session.Day)}|${getCleanedTime(session.Time)}|${getCleanedLocation(session.Location)}` : '';
          break;
        }
        case 'Class': key = getCleanedClass(session.SessionName || session.Class); break;
        case 'Day': key = getCleanedDay(session.Day); break;
        case 'Time': key = getCleanedTime(session.Time); break;
        case 'Location': key = getCleanedLocation(session.Location); break;
        default: key = String((session as any)[groupBy] || '');
      }
      if (key && !groups.has(key)) groups.set(key, []);
      if (key) groups.get(key)!.push(session);
    });

    const groupedRows: GroupedRow[] = [];
    groups.forEach((groupSessions, key) => {
      const metrics = calculateMetrics(groupSessions);
      if (metrics.totalCheckIns < minCheckins || groupSessions.length < minClasses) return;
      
      const firstSession = groupSessions[0];
      const hasMultipleValues = (field: keyof SessionData) => groupSessions.some((s) => s[field] !== firstSession[field]);
      
      groupedRows.push({
        groupKey: groupBy,
        groupValue: key,
        isGroupRow: true,
        children: groupSessions,
        ...metrics,
        cleanedClass: getCleanedClass(firstSession.SessionName || firstSession.Class),
        cleanedDay: getCleanedDay(firstSession.Day),
        cleanedTime: getCleanedTime(firstSession.Time),
        cleanedLocation: getCleanedLocation(firstSession.Location),
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
      });
    });

    groupedRows.sort((a, b) => b.classAvg - a.classAvg);
    groupedRows.forEach((row, index) => { row.rank = index + 1; });

    self.postMessage({ type: 'DATA_GROUPED', payload: groupedRows });
  }
};
