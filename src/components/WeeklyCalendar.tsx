import { useState, useMemo } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { SessionData } from '../types';
import { format, startOfWeek, addDays, parseISO, isWithinInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Calendar as CalendarIcon, MapPin, Filter, Sparkles, Grid, List, BarChart3, Building, AlertTriangle, Users, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EnhancedDrilldownModal from './EnhancedDrilldownModal2';
import CreateClassModal from './CreateClassModal';
import { getUniqueValues } from '../utils/calculations';

// Calendar-specific filter interface
interface CalendarFilters {
  trainers: string[];
  locations: string[];
  classTypes: string[];
  classes: string[];
  activeOnly: boolean;
}

interface CalendarClass {
  session: SessionData;
  dayIndex: number; // 0-6 (Sun-Sat)
  startTime: number; // minutes from midnight
  duration: number; // minutes
  position: number; // for overlapping classes
  totalOverlaps: number;
}

type ViewMode = 'grid' | 'horizontal' | 'analysis' | 'multiLocation';

// Color mapping for different class types and names
export const getClassTypeColor = (className: string, classType?: string): string => {
  // Get cleaned class name for consistent coloring
  const cleanedName = cleanClassName(className);
  
  // Class name specific colors (takes precedence)
  const classNameColors: Record<string, string> = {
    'barre': 'from-indigo-400 to-purple-500',
    'mat': 'from-pink-400 to-rose-500',
    'pilates': 'from-pink-400 to-rose-500',
    'yoga': 'from-purple-400 to-purple-600',
    'power yoga': 'from-purple-500 to-purple-700',
    'vinyasa': 'from-purple-300 to-purple-500',
    'hatha': 'from-purple-600 to-indigo-600',
    'hot yoga': 'from-red-400 to-orange-500',
    'hiit': 'from-red-500 to-orange-500',
    'cardio': 'from-orange-400 to-red-500',
    'spin': 'from-blue-500 to-cyan-500',
    'cycling': 'from-blue-500 to-cyan-500',
    'strength': 'from-gray-600 to-gray-800',
    'core': 'from-gray-500 to-gray-700',
    'functional': 'from-green-500 to-emerald-600',
    'circuit': 'from-green-400 to-green-600',
    'boot camp': 'from-green-600 to-green-800',
    'trx': 'from-emerald-400 to-emerald-600',
    'dance': 'from-yellow-400 to-amber-500',
    'zumba': 'from-yellow-500 to-orange-400',
    'boxing': 'from-red-600 to-red-800',
    'kickboxing': 'from-red-700 to-red-900',
  };
  
  // Check for class name match first
  for (const [key, color] of Object.entries(classNameColors)) {
    if (cleanedName.includes(key)) {
      return color;
    }
  }
  
  // Fallback to class type colors
  const typeColors: Record<string, string> = {
    'Yoga': 'from-purple-400 to-purple-600',
    'Pilates': 'from-pink-400 to-rose-500',
    'HIIT': 'from-red-500 to-orange-500',
    'Cycling': 'from-blue-500 to-cyan-500',
    'Strength': 'from-gray-600 to-gray-800',
    'Functional': 'from-green-500 to-emerald-600',
    'Dance': 'from-yellow-400 to-amber-500',
    'Boxing': 'from-red-600 to-red-800',
    'Barre 57': 'from-indigo-400 to-purple-500',
    'Cardio': 'from-orange-400 to-red-500',
    // Default fallback
    'default': 'from-blue-400 to-blue-500'
  };
  
  return typeColors[classType || ''] || typeColors['default'];
};

// Function to clean class name for comparison (removes variations)
const cleanClassName = (className: string): string => {
  return className
    .toLowerCase()
    .replace(/\s+(express|flow|basics?|elite|advanced?|beginner|intense?|cardio|blast|training|fitness|class)/gi, '')
    .trim();
};

// Function to determine if a class is active based on Active.csv data from public folder
const isClassActiveSimple = (session: SessionData, activeClassesData: { [day: string]: any[] }): boolean => {
  // If no active classes data is loaded, fall back to date-based logic
  if (!activeClassesData || Object.keys(activeClassesData).length === 0) {
    try {
      const sessionDate = parseISO(session.Date);
      const now = new Date();
      const daysDifference = Math.abs((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Consider active if the session is within the last 30 days
      return daysDifference <= 30;
    } catch {
      return false; // If date parsing fails, consider inactive
    }
  }
  
  // Use Active.csv data to determine active status
  const sessionDay = session.Day;
  if (!sessionDay || !activeClassesData[sessionDay]) {
    return false;
  }
  
  // Normalize strings for comparison
  const normalizeString = (str: string) => 
    str.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const normalizedSessionClass = normalizeString(session.Class);
  const normalizedSessionLocation = normalizeString(session.Location);
  const normalizedSessionTime = session.Time.toLowerCase().trim();
  
  // Look for matching class in Active.csv data
  const dayClasses = activeClassesData[sessionDay] || [];
  
  return dayClasses.some((activeClass: any) => {
    const normalizedActiveClass = normalizeString(activeClass.className);
    const normalizedActiveLocation = normalizeString(activeClass.location);
    const normalizedActiveTime = activeClass.time.toLowerCase().trim();
    
    // More flexible class name matching - remove common prefixes
    const cleanClassName = (name: string) => {
      return normalizeString(name)
        .replace(/^studio/i, '')
        .replace(/^the/i, '')
        .trim();
    };
    
    const cleanedSessionClass = cleanClassName(session.Class);
    const cleanedActiveClass = cleanClassName(activeClass.className);
    
    // Class match: check if cleaned names match or contain each other
    const classMatch = cleanedActiveClass.includes(cleanedSessionClass) ||
                       cleanedSessionClass.includes(cleanedActiveClass) ||
                       normalizedActiveClass.includes(normalizedSessionClass) ||
                       normalizedSessionClass.includes(normalizedActiveClass);
    
    // Match by location
    const locationMatch = normalizedActiveLocation.includes(normalizedSessionLocation) ||
                          normalizedSessionLocation.includes(normalizedActiveLocation);
    
    // Match by time - handle different formats (HH:MM:SS vs HH:MM)
    const timeMatch = normalizedActiveTime.startsWith(normalizedSessionTime.substring(0, 5)) ||
                      normalizedSessionTime.startsWith(normalizedActiveTime.substring(0, 5));
    
    // A class is considered active if it matches class name AND location AND time
    // All trainers in Active.csv already have trainers assigned (non-empty)
    return classMatch && locationMatch && timeMatch;
  });
};

// Function to detect trainer conflicts (same trainer at same time across locations)
const detectTrainerConflicts = (calendarClasses: CalendarClass[], selectedDay: Date): Set<string> => {
  const conflicts = new Set<string>();
  const trainerTimeMap = new Map<string, Set<string>>();
  
  calendarClasses.forEach(calClass => {
    const session = calClass.session;
    try {
      const sessionDate = parseISO(session.Date);
      if (!isSameDay(sessionDate, selectedDay)) return;
    } catch {
      return;
    }
    
    const timeKey = `${session.Day}-${session.Time}`;
    const trainerKey = session.Trainer;
    
    if (!trainerTimeMap.has(trainerKey)) {
      trainerTimeMap.set(trainerKey, new Set());
    }
    
    const trainerTimes = trainerTimeMap.get(trainerKey)!;
    if (trainerTimes.has(timeKey)) {
      // Conflict detected - same trainer at same time
      conflicts.add(`${trainerKey}-${timeKey}`);
    } else {
      trainerTimes.add(timeKey);
    }
  });
  
  return conflicts;
};

// Time configuration constants - defined outside component to ensure stability
const CALENDAR_START_HOUR = 7;
const CALENDAR_END_HOUR = 22; // Display up to 21:00 (9 PM) - allows slots until 21:30
const TIME_SLOT_HEIGHT = 100; // px per 30min slot

export default function WeeklyCalendar() {
  // Safe destructuring with fallback values
  const store = useDashboardStore();
  const { 
    rawData = [], 
    activeClassesData = {}, 
    getAverageCheckIns = () => null, 
    setRawData = () => {} 
  } = store || {};
  
  // Early return if no data to prevent crashes
  if (!rawData || rawData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Calendar Data Available</h3>
          <p className="text-gray-500">Please upload session data to view the weekly calendar.</p>
        </div>
      </div>
    );
  }
  
  // Calendar-specific filter state - independent of global filters
  const [calendarFilters, setCalendarFilters] = useState<CalendarFilters>(() => {
    try {
      return {
        trainers: [],
        locations: [],
        classTypes: [],
        classes: [],
        activeOnly: false
      };
    } catch (error) {
      console.error('Error initializing calendar filters:', error);
      return {
        trainers: [],
        locations: [],
        classTypes: [],
        classes: [],
        activeOnly: false
      };
    }
  });
  
  const [showCalendarFilters, setShowCalendarFilters] = useState(false);
  
  console.log('📊 WeeklyCalendar rawData count:', rawData?.length || 0);
  console.log('🎯 Calendar filters:', calendarFilters);
  
  // Consolidated date state - single source of truth
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredClass, setHoveredClass] = useState<SessionData | null>(null);
  const [drilldownData, setDrilldownData] = useState<SessionData[]>([]);
  const [drilldownTitle, setDrilldownTitle] = useState('');
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: Date; time: string } | null>(null);
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  // Remove the old activeOnly state as it's now part of calendarFilters

  // Derived date values from single source of truth
  const selectedWeekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const selectedDay = currentDate;
  const currentMonth = currentDate;

  // Multi-location data - ONLY actual uploaded data, no mock/dummy data
  const multiLocationDataProcessed = useMemo(() => {
    // Return empty if no real uploaded data
    if (!rawData || rawData.length === 0) {
      console.log('📊 Multi-location: No uploaded data available');
      return [];
    }
    
    const allowedLocations = [
      'Supreme HQ, Bandra',
      'Pop-up',
      'Kwality House, Kemps Corner',
      'Kenkere House'
    ];
    
    // Validate that we have actual session data (not mock data)
    const validSessions = rawData.filter(session => {
      // Ensure we have essential fields for a real session
      return session && 
             session.Date && 
             session.Time && 
             session.Class && 
             session.Location &&
             allowedLocations.includes(session.Location) &&
             // Ensure numeric fields exist (even if 0)
             typeof session.CheckedIn === 'number' &&
             typeof session.Capacity === 'number';
    });
    
    console.log('📊 Multi-location data validation:', {
      totalRawSessions: rawData.length,
      validSessions: validSessions.length,
      filteredLocations: Array.from(new Set(validSessions.map(s => s.Location))).sort(),
      sampleSession: validSessions[0] ? {
        Date: validSessions[0].Date,
        Time: validSessions[0].Time,
        Class: validSessions[0].Class,
        Location: validSessions[0].Location
      } : null
    });
    
    if (validSessions.length === 0) {
      console.warn('⚠️ No valid sessions found for multi-location view');
      return [];
    }
    
    // Process validated sessions only
    return validSessions.map(session => {
      const status: 'Active' | 'Inactive' = isClassActiveSimple(session, activeClassesData) ? 'Active' : 'Inactive';
      return {
        ...session,
        Status: status,
        FillRate: session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0
      };
    });
  }, [rawData]);

  // Create time slots every 30 minutes (2 slots per hour) - memoized to prevent recalculation  
  const timeSlots = useMemo(() => {
    // Calculate total slots needed to reach exactly 21:00 (not 21:30)
    const totalSlots = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 2 - 1; // Subtract 1 to end at 21:00 not 21:30
    return Array.from({ length: totalSlots }, (_, i) => {
      const hour = Math.floor(i / 2) + CALENDAR_START_HOUR;
      const minute = (i % 2) * 30;
      return { hour, minute, label: `${hour % 12 || 12}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}` };
    });
  }, []);

  // Week days for current selection (Monday to Sunday)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i));
  }, [selectedWeekStart]);

  // Calendar-specific filtered data - independent of global filters
  const locallyFilteredData = useMemo(() => {
    try {
      if (!rawData || rawData.length === 0) {
        return [];
      }

      // Validate that we're working with real session data
      const validData = rawData.filter(session => {
        return session && 
               session.Date && 
               session.Time && 
               session.Class && 
               session.Location &&
               typeof session.CheckedIn === 'number' &&
               typeof session.Capacity === 'number';
      });

      if (validData.length === 0) {
        return [];
      }
      
      return validData.filter(session => {
        try {
          // Date filter - ensure valid date
          let sessionDate;
          try {
            sessionDate = parseISO(session.Date);
          } catch (e) {
            return false;
          }
          
          // Check if in current week
          const inWeek = weekDays?.some(day => isSameDay(day, sessionDate)) || false;
          if (!inWeek) return false;
          
          // Apply calendar-specific filters
          
          // Trainer filter
          if (calendarFilters.trainers.length > 0 && !calendarFilters.trainers.includes(session.Trainer)) {
            return false;
          }
          
          // Location filter
          if (calendarFilters.locations.length > 0 && !calendarFilters.locations.includes(session.Location)) {
            return false;
          }
          
          // Class type filter
          if (calendarFilters.classTypes.length > 0 && !calendarFilters.classTypes.includes(session.Type)) {
            return false;
          }
          
          // Class name filter
          if (calendarFilters.classes.length > 0 && !calendarFilters.classes.includes(session.Class)) {
            return false;
          }
          
          // Active only filter
          if (calendarFilters.activeOnly) {
            return isClassActiveSimple(session, activeClassesData);
          }
          
          return true;
        } catch (sessionError) {
          console.error('Error filtering session:', sessionError, session);
          return false;
        }
      });
    } catch (error) {
      console.error('Error in locallyFilteredData:', error);
      return [];
    }
  }, [rawData, weekDays, calendarFilters, activeClassesData]);

  // Get unique locations for multi-location view (filtered to specific locations only)
  const multiLocationUniqueLocations = useMemo(() => {
    const allowedLocations = [
      'Supreme HQ, Bandra',
      'Pop-up',
      'Kwality House, Kemps Corner',
      'Kenkere House'
    ];
    
    const allLocations = Array.from(new Set(multiLocationDataProcessed.map(session => session.Location).filter(Boolean)));
    const filteredLocations = allowedLocations.filter(location => allLocations.includes(location)).sort();
    
    console.log('🏢 Multi-location allowed locations:', allowedLocations);
    console.log('🏢 Multi-location filtered locations:', filteredLocations);
    
    return filteredLocations;
  }, [multiLocationDataProcessed]);

  // Filter and organize classes
  const calendarClasses = useMemo(() => {
    try {
      console.log('🔍 Calendar Debug:', {
        totalSessions: rawData?.length || 0,
        weekDays: weekDays?.map(d => format(d, 'yyyy-MM-dd')) || [],
        sampleSessionDate: rawData?.[0]?.Date,
        sampleSessionTime: rawData?.[0]?.Time,
      });
      
      // Use the locally filtered data
      const filtered = locallyFilteredData;

    console.log('✅ Filtered sessions:', filtered.length);
    if (filtered.length > 0) {
      console.log('Sample filtered session:', {
        Date: filtered[0].Date,
        Time: filtered[0].Time,
        Class: filtered[0].Class,
        Trainer: filtered[0].Trainer,
      });
    }

    // Convert to calendar format
    const classes: CalendarClass[] = [];
    
    let skipReasons = {
      noTime: 0,
      noDate: 0,
      dayIndexNotFound: 0,
      timeParseFailure: 0,
      outsideTimeRange: 0,
      success: 0,
    };
    
    filtered.forEach((session, idx) => {
      if (!session.Time) {
        skipReasons.noTime++;
        if (idx === 0) console.log('❌ No Time:', session);
        return;
      }
      if (!session.Date) {
        skipReasons.noDate++;
        return;
      }
      
      const sessionDate = parseISO(session.Date);
      const dayIndex = weekDays.findIndex(day => isSameDay(day, sessionDate));
      if (dayIndex === -1) {
        skipReasons.dayIndexNotFound++;
        if (idx === 0) {
          console.log('❌ Day not in week:', {
            sessionDate: format(sessionDate, 'yyyy-MM-dd'),
            weekDays: weekDays.map(d => format(d, 'yyyy-MM-dd'))
          });
        }
        return;
      }
      
      // Parse time - handle both 12-hour (9:30 AM) and 24-hour (19:15:00) formats
      let hour: number;
      let minute: number;
      
      // Try 12-hour format first: "9:30 AM"
      let timeParts = session.Time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      
      if (timeParts) {
        // 12-hour format
        hour = parseInt(timeParts[1]);
        minute = parseInt(timeParts[2]);
        const period = timeParts[3].toUpperCase();
        
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
      } else {
        // Try 24-hour format: "19:15:00" or "19:15"
        timeParts = session.Time.match(/(\d+):(\d+)/);
        if (!timeParts) {
          skipReasons.timeParseFailure++;
          if (skipReasons.timeParseFailure === 1) {
            console.log('❌ Time parse failed:', session.Time, 'Full session:', session);
          }
          return;
        }
        
        hour = parseInt(timeParts[1]);
        minute = parseInt(timeParts[2]);
      }
      
      // Skip if outside our display range
      if (hour < CALENDAR_START_HOUR || hour >= CALENDAR_END_HOUR) {
        skipReasons.outsideTimeRange++;
        return;
      }
      
      const startTime = hour * 60 + minute;
      const duration = 60; // Assume 60 min classes
      
      skipReasons.success++;
      classes.push({
        session,
        dayIndex,
        startTime,
        duration,
        position: 0,
        totalOverlaps: 1,
      });
    });
    
    console.log('🔍 Skip reasons:', skipReasons);

    // Calculate overlaps for each day - FIXED ALGORITHM
    for (let day = 0; day < 7; day++) {
      const dayClasses = classes.filter(c => c.dayIndex === day).sort((a, b) => a.startTime - b.startTime);
      
      // Create overlap groups
      const overlapGroups: CalendarClass[][] = [];
      
      for (let i = 0; i < dayClasses.length; i++) {
        const current = dayClasses[i];
        let addedToGroup = false;
        
        // Check if this class overlaps with any existing group
        for (const group of overlapGroups) {
          const overlapsWithGroup = group.some(cls => {
            const clsEnd = cls.startTime + cls.duration;
            const currentEnd = current.startTime + current.duration;
            // Check if they overlap: current starts before cls ends AND cls starts before current ends
            return current.startTime < clsEnd && cls.startTime < currentEnd;
          });
          
          if (overlapsWithGroup) {
            group.push(current);
            addedToGroup = true;
            break;
          }
        }
        
        // If not added to any group, create new group
        if (!addedToGroup) {
          overlapGroups.push([current]);
        }
      }
      
      // Now assign positions within each overlap group
      overlapGroups.forEach(group => {
        const totalOverlaps = group.length;
        group.forEach((cls, idx) => {
          cls.position = idx;
          cls.totalOverlaps = totalOverlaps;
        });
      });
    }

    console.log('📅 Calendar classes created:', classes.length);
    if (classes.length > 0) {
      console.log('Sample calendar class:', {
        dayIndex: classes[0].dayIndex,
        startTime: classes[0].startTime,
        duration: classes[0].duration,
        class: classes[0].session.Class,
      });
    }

    return classes;
    } catch (error) {
      console.error('Error computing calendar classes:', error);
      return [];
    }
  }, [locallyFilteredData, weekDays]);

  // Multi-location calendar classes - filters all sessions for the selected 7-day range
  const multiLocationCalendarClasses = useMemo(() => {
    if (!multiLocationDataProcessed || multiLocationDataProcessed.length === 0) {
      return [];
    }
    
    try {
      // Use calendarFilters.activeOnly state instead of multiLocationActiveOnly
      const dataToUse = calendarFilters.activeOnly 
        ? multiLocationDataProcessed.filter(session => session.Status === 'Active')
        : multiLocationDataProcessed;
      
      return dataToUse.map(session => {
        if (!session || !session.Date || !session.Time) return null;
      
        try {
          const sessionDate = parseISO(session.Date);
          
          // For multi-location view, include sessions from a 7-day range around selectedDay
          const startRange = addDays(selectedDay, -3);
          const endRange = addDays(selectedDay, 3);
          
          if (!isWithinInterval(sessionDate, { start: startRange, end: endRange })) {
            return null;
          }

          // Calculate dayIndex relative to the selected day
          const dayIndex = Math.floor((sessionDate.getTime() - selectedDay.getTime()) / (1000 * 60 * 60 * 24)) + 3;
          
          // Parse time
          let hour: number;
          let minute: number;
          
          let timeParts = session.Time.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (timeParts) {
            hour = parseInt(timeParts[1]);
            minute = parseInt(timeParts[2]);
            const period = timeParts[3].toUpperCase();
            if (period === 'PM' && hour !== 12) hour += 12;
            if (period === 'AM' && hour === 12) hour = 0;
          } else {
            // 24-hour format
            timeParts = session.Time.match(/(\d+):(\d+)(?::(\d+))?/);
            if (!timeParts) return null;
            hour = parseInt(timeParts[1]);
            minute = parseInt(timeParts[2]);
          }

          const startTime = hour * 60 + minute;
          
          return {
            session,
            dayIndex,
            startTime,
            duration: 60,
            position: 0,
            totalOverlaps: 1,
          };
        } catch {
          return null;
        }
      }).filter(Boolean) as CalendarClass[];
    } catch (error) {
      console.error('Error processing multi-location calendar classes:', error);
      return [];
    }
  }, [multiLocationDataProcessed, selectedDay, calendarFilters.activeOnly]);

  // Calculate class format distribution for each day
  const dailyFormatDistribution = useMemo(() => {
    const distribution: Record<number, Record<string, number>> = {};
    
    // Initialize all days
    for (let day = 0; day < 7; day++) {
      distribution[day] = {};
    }
    
    calendarClasses.forEach(calClass => {
      const { session, dayIndex } = calClass;
      const format = session.Class || 'Unknown';
      
      if (!distribution[dayIndex][format]) {
        distribution[dayIndex][format] = 0;
      }
      distribution[dayIndex][format]++;
    });
    
    return distribution;
  }, [calendarClasses]);

  // Consolidated navigation functions
  const goToPreviousWeek = () => {
    setCurrentDate(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentDate(prev => addDays(prev, 7));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToPreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  // Day navigation for multi-location view
  const goToPreviousDay = () => {
    setCurrentDate(prev => addDays(prev, -1));
  };

  const goToNextDay = () => {
    setCurrentDate(prev => addDays(prev, 1));
  };

  // Auto-populate schedule with optimal classes and trainers
  const handleAutoPopulate = async () => {
    try {
      // 1. Analyze top-performing classes
      const classPerformance = new Map<string, { score: number; avgFillRate: number; revenue: number; sessions: number }>();
      
      rawData.forEach(session => {
        const key = session.Class;
        const current = classPerformance.get(key) || { score: 0, avgFillRate: 0, revenue: 0, sessions: 0 };
        const fillRate = session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0;
        
        classPerformance.set(key, {
          score: current.score + (fillRate * 0.6 + (session.Revenue / 100) * 0.4),
          avgFillRate: current.avgFillRate + fillRate,
          revenue: current.revenue + session.Revenue,
          sessions: current.sessions + 1,
        });
      });

      // Get top 10 classes
      const topClasses = Array.from(classPerformance.entries())
        .map(([className, data]) => ({
          className,
          avgScore: data.score / data.sessions,
          avgFillRate: data.avgFillRate / data.sessions,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 10);

      // 2. Analyze trainer performance by class
      const trainerPerformance = new Map<string, Map<string, { score: number; sessions: number }>>();
      
      rawData.forEach(session => {
        if (!trainerPerformance.has(session.Trainer)) {
          trainerPerformance.set(session.Trainer, new Map());
        }
        const trainerClasses = trainerPerformance.get(session.Trainer)!;
        const current = trainerClasses.get(session.Class) || { score: 0, sessions: 0 };
        const fillRate = session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0;
        
        trainerClasses.set(session.Class, {
          score: current.score + fillRate,
          sessions: current.sessions + 1,
        });
      });

      // 3. Generate optimal weekly schedule
      const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i));
      const optimalTimeSlots = [
        { time: '6:00 AM', priority: 3 },
        { time: '7:00 AM', priority: 5 },
        { time: '8:00 AM', priority: 4 },
        { time: '9:00 AM', priority: 4 },
        { time: '10:00 AM', priority: 3 },
        { time: '12:00 PM', priority: 3 },
        { time: '5:00 PM', priority: 5 },
        { time: '6:00 PM', priority: 5 },
        { time: '7:00 PM', priority: 4 },
      ];

      // Track trainer hours (max 15 hours per week)
      const trainerHours = new Map<string, number>();
      const newSessions: SessionData[] = [];

      // Get unique locations from existing data
      const locations = [...new Set(rawData.map(s => s.Location))];
      const primaryLocation = locations[0] || 'Main Studio';

      // Distribute classes across the week
      weekDays.forEach((day, dayIdx) => {
        // Skip if Sunday (dayIdx === 0), lighter schedule
        const slotsForDay = dayIdx === 0 || dayIdx === 6 ? 3 : 5;
        const daySlots = optimalTimeSlots
          .sort((a, b) => b.priority - a.priority)
          .slice(0, slotsForDay);

        daySlots.forEach((slot, slotIdx) => {
          if (slotIdx >= topClasses.length) return;
          
          const classToSchedule = topClasses[slotIdx % topClasses.length];
          
          // Find best trainer for this class
          let bestTrainer = '';
          let bestScore = 0;
          
          trainerPerformance.forEach((classes, trainer) => {
            const classData = classes.get(classToSchedule.className);
            if (classData) {
              const avgScore = classData.score / classData.sessions;
              const currentHours = trainerHours.get(trainer) || 0;
              
              // Only assign if trainer has capacity (< 15 hours)
              if (currentHours < 15 && avgScore > bestScore) {
                bestScore = avgScore;
                bestTrainer = trainer;
              }
            }
          });

          // Fallback to any trainer with capacity
          if (!bestTrainer) {
            const availableTrainer = Array.from(trainerHours.entries())
              .find(([_, hours]) => hours < 15);
            if (availableTrainer) {
              bestTrainer = availableTrainer[0];
            } else {
              // Get any trainer from data
              bestTrainer = rawData.find(s => s.Class === classToSchedule.className)?.Trainer || 'TBD';
            }
          }

          // Update trainer hours (assume 1 hour per class)
          trainerHours.set(bestTrainer, (trainerHours.get(bestTrainer) || 0) + 1);

          // Create session
          const sessionId = `AUTO-${Date.now()}-${newSessions.length}`;
          const dayOfWeek = format(day, 'EEEE');
          
          // Find typical capacity for this class
          const typicalCapacity = rawData
            .filter(s => s.Class === classToSchedule.className)
            .reduce((sum, s) => sum + s.Capacity, 0) / 
            rawData.filter(s => s.Class === classToSchedule.className).length || 20;

          newSessions.push({
            TrainerID: sessionId,
            FirstName: bestTrainer.split(' ')[0] || bestTrainer,
            LastName: bestTrainer.split(' ').slice(1).join(' ') || '',
            Trainer: bestTrainer,
            SessionID: sessionId,
            SessionName: classToSchedule.className,
            Capacity: Math.round(typicalCapacity),
            CheckedIn: 0,
            LateCancelled: 0,
            Booked: 0,
            Complimentary: 0,
            Location: primaryLocation,
            Date: format(day, 'yyyy-MM-dd'),
            Day: dayOfWeek,
            Time: slot.time,
            Revenue: 0,
            NonPaid: 0,
            UniqueID1: sessionId,
            UniqueID2: sessionId,
            Memberships: 0,
            Packages: 0,
            IntroOffers: 0,
            SingleClasses: 0,
            Type: rawData.find(s => s.Class === classToSchedule.className)?.Type || 'Group Class',
            Class: classToSchedule.className,
            Classes: 1,
            Waitlisted: 0,
            Status: 'Active',
            FillRate: 0,
          });
        });
      });

      // Add new sessions to data
      setRawData([...rawData, ...newSessions]);
      setIsAutoPopulating(false);
      
      // Show success message (you could add a toast notification here)
      alert(`✅ Successfully populated ${newSessions.length} classes for the week!\n\nSchedule optimized based on:\n• Top-performing classes\n• Best trainer-class combinations\n• Peak time slots\n• 15-hour trainer limit`);
      
    } catch (error) {
      console.error('Error auto-populating schedule:', error);
      setIsAutoPopulating(false);
      alert('❌ Error generating schedule. Please try again.');
    }
  };

  // Trigger auto-populate when state changes
  if (isAutoPopulating) {
    handleAutoPopulate();
  }

  const renderClassBlock = (calClass: CalendarClass) => {
  const { session, startTime, position } = calClass;
  
  // Get average check-ins for similar classes
  const avgData = getAverageCheckIns(
    session.Class || '',
    session.Day || '',
    session.Time || '',
    session.Location || ''
  );
  
  // Calculate position using consistent constants
  const top = ((startTime - (CALENDAR_START_HOUR * 60)) / 30) * TIME_SLOT_HEIGHT;
  
  // UNIFORM CARD SIZING - All cards same size regardless of overlaps
  // Cards with same start time stack on top of each other using z-index
  const cardHeight = 120; // Fixed uniform height for all cards
  const cardTop = top; // Always use the calculated top position - no offset for overlaps
  
  const width = '100%'; // Full column width
  const left = '0'; // No offset, occupy full width
  
  // Generate unique color for each class format using hash
  const getClassColor = (className: string) => {
    let hash = 0;
    for (let i = 0; i < className.length; i++) {
      hash = className.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      { bg: 'bg-rose-500', border: 'border-t-rose-600', text: 'text-white' },
      { bg: 'bg-pink-500', border: 'border-t-pink-600', text: 'text-white' },
      { bg: 'bg-fuchsia-500', border: 'border-t-fuchsia-600', text: 'text-white' },
      { bg: 'bg-purple-500', border: 'border-t-purple-600', text: 'text-white' },
      { bg: 'bg-violet-500', border: 'border-t-violet-600', text: 'text-white' },
      { bg: 'bg-indigo-500', border: 'border-t-indigo-600', text: 'text-white' },
      { bg: 'bg-blue-500', border: 'border-t-blue-600', text: 'text-white' },
      { bg: 'bg-sky-500', border: 'border-t-sky-600', text: 'text-white' },
      { bg: 'bg-cyan-500', border: 'border-t-cyan-600', text: 'text-white' },
      { bg: 'bg-teal-500', border: 'border-t-teal-600', text: 'text-white' },
      { bg: 'bg-emerald-500', border: 'border-t-emerald-600', text: 'text-white' },
      { bg: 'bg-green-500', border: 'border-t-green-600', text: 'text-white' },
      { bg: 'bg-lime-500', border: 'border-t-lime-600', text: 'text-white' },
      { bg: 'bg-yellow-500', border: 'border-t-yellow-600', text: 'text-gray-900' },
      { bg: 'bg-amber-500', border: 'border-t-amber-600', text: 'text-white' },
      { bg: 'bg-orange-500', border: 'border-t-orange-600', text: 'text-white' },
      { bg: 'bg-red-500', border: 'border-t-red-600', text: 'text-white' },
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };
  
  const isActive = session.Status === 'Active';
  const classColor = getClassColor(session.Class);
  
  // When calendarFilters.activeOnly is true: highlight active classes normally, gray out inactive classes
  // When calendarFilters.activeOnly is false: show all classes with their normal colors
  let bgColor, borderColor, textColor, additionalClasses = '';
  
  if (calendarFilters.activeOnly && !isActive) {
    // Gray out inactive classes when calendarFilters.activeOnly is enabled
    bgColor = 'bg-gray-400';
    borderColor = 'border-t-gray-500';
    textColor = 'text-gray-100';
    additionalClasses = 'opacity-60';
  } else {
    // Normal coloring for active classes or when calendarFilters.activeOnly is disabled
    bgColor = isActive ? classColor.bg : 'bg-gray-400';
    borderColor = isActive ? classColor.border : 'border-t-gray-600';
    textColor = isActive ? classColor.text : 'text-white';
  }
  
  return (
    <motion.div
      key={`${session.Date}-${session.Time}-${session.Class}-${session.Trainer}`}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      whileHover={{ 
        scale: 1.02,
        zIndex: 100, // Bring to front on hover
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        transition: { 
          type: "spring",
          stiffness: 400,
          damping: 25
        }
      }}
      style={{
        position: 'absolute',
        top: `${cardTop}px`,
        height: `${cardHeight}px`,
        width,
        left,
        zIndex: 10 + position, // Stack overlapping cards by position
      }}
      className={`${bgColor} ${borderColor} ${textColor} ${additionalClasses} border-2 border-white border-t-4 rounded-lg shadow-lg p-2 cursor-pointer backdrop-blur-sm overflow-hidden`}
      onMouseEnter={() => setHoveredClass(session)}
      onMouseLeave={() => setHoveredClass(null)}
      onClick={() => {
        console.log('🔍 Drilldown Debug - Grid View:', {
          clickedSession: {
            Class: session.Class,
            Day: session.Day,
            Time: session.Time,
            Location: session.Location
          },
          locallyFilteredDataCount: locallyFilteredData.length,
          sampleLocalData: locallyFilteredData.slice(0, 2).map(s => ({
            Class: s.Class,
            Day: s.Day,
            Time: s.Time,
            Location: s.Location
          }))
        });

        const relatedSessions = locallyFilteredData.filter(s => 
          s.Class === session.Class && 
          s.Day === session.Day && 
          s.Time === session.Time && 
          s.Location === session.Location
        );
        
        console.log('🎯 Found related sessions:', relatedSessions.length, relatedSessions);
        
        setDrilldownData(relatedSessions);
        setDrilldownTitle(`${session.Class} - ${session.Day} at ${session.Time} (${session.Location})`);
        setShowDrilldown(true);
      }}
    >
      {/* Wide and short layout - optimized for horizontal space, full width/height */}
      <div className="flex flex-col h-full justify-between">
        <div className="flex items-center justify-between gap-1.5 min-h-0">
          <div className="font-bold text-sm leading-tight truncate flex-1">
            {session.Class || 'Unnamed Class'}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <div className="text-xs font-semibold whitespace-nowrap opacity-90 bg-white/20 px-1.5 py-0.5 rounded">
              {session.CheckedIn || 0}/{session.Capacity || 0}
            </div>
            {avgData && (
              <div className="text-xs whitespace-nowrap opacity-80 bg-black/10 px-1 py-0.5 rounded text-center">
                Avg: {avgData.avgCheckIns}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-1.5">
          <div className="text-xs truncate flex-1">
            👤 {session.Trainer || 'No Trainer'}
          </div>
          <div className="text-xs whitespace-nowrap font-medium">
            🕐 {session.Time ? session.Time.substring(0, 5) : 'No Time'}
          </div>
        </div>
      </div>
    </motion.div>
  );
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation and Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Month/Week Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-blue-50 rounded-xl transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <p className="text-sm text-gray-500">
                Week of {format(selectedWeekStart, 'MMM d')} - {format(addDays(selectedWeekStart, 6), 'MMM d, yyyy')}
              </p>
            </div>
            
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-blue-50 rounded-xl transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* View Mode and Quick Actions */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* View Mode Selector */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${
                  viewMode === 'grid' 
                    ? 'bg-white shadow-md text-blue-600 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
                Grid
              </button>
              <button
                onClick={() => setViewMode('horizontal')}
                className={`px-3 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${
                  viewMode === 'horizontal' 
                    ? 'bg-white shadow-md text-blue-600 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
                title="Horizontal Time Slots"
              >
                <List className="w-4 h-4" />
                Horizontal
              </button>
              <button
                onClick={() => setViewMode('analysis')}
                className={`px-3 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${
                  viewMode === 'analysis' 
                    ? 'bg-white shadow-md text-blue-600 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
                title="Format Analysis"
              >
                <BarChart3 className="w-4 h-4" />
                Analysis
              </button>
              <button
                onClick={() => setViewMode('multiLocation')}
                className={`px-3 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${
                  viewMode === 'multiLocation' 
                    ? 'bg-white shadow-md text-blue-600 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
                title="Multi-Location View"
              >
                <Building className="w-4 h-4" />
                Multi-Location
              </button>
            </div>

            <div className="h-6 w-px bg-gray-300"></div>

            <button
              onClick={goToPreviousWeek}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              ← Week
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all"
            >
              Today
            </button>
            <button
              onClick={goToNextWeek}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Week →
            </button>
            
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
            
            <button
              onClick={() => setIsAutoPopulating(true)}
              disabled={isAutoPopulating}
              className="px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Auto-populate week with optimized schedule"
            >
              <Sparkles className="w-4 h-4" />
              {isAutoPopulating ? 'Optimizing...' : 'Auto-Populate'}
            </button>
            
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
            
            {/* Calendar Filters Toggle */}
            <button
              onClick={() => setShowCalendarFilters(!showCalendarFilters)}
              className={`px-4 py-2 text-sm rounded-xl transition-all flex items-center gap-2 ${
                showCalendarFilters 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="Toggle Calendar Filters"
            >
              <Filter className="w-4 h-4" />
              Filters
              {Object.values(calendarFilters).some(v => Array.isArray(v) ? v.length > 0 : v) && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                  {calendarFilters.trainers.length + calendarFilters.locations.length + calendarFilters.classTypes.length + calendarFilters.classes.length + (calendarFilters.activeOnly ? 1 : 0)}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setCalendarFilters(prev => ({ ...prev, activeOnly: !prev.activeOnly }))}
              className={`px-4 py-2 text-sm rounded-xl transition-all flex items-center gap-2 ${
                calendarFilters.activeOnly
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="Show only active classes from Active.csv"
            >
              <Filter className="w-4 h-4" />
              Active Only
            </button>
          </div>
        </div>
      </div>

      {/* Private Calendar Filter Section */}
      {showCalendarFilters && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl gradient-blue">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Calendar Filters</h3>
            <span className="text-sm text-gray-500">
              (Independent of global filters • applies only to calendar view)
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Trainers */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                Trainers ({calendarFilters.trainers.length} selected)
              </label>
              <div className="border border-gray-300 rounded-xl max-h-[120px] overflow-y-auto bg-white">
                {(rawData ? getUniqueValues(rawData, 'Trainer') : []).map((trainer) => (
                  <div
                    key={trainer}
                    onClick={() => {
                      const isSelected = calendarFilters.trainers.includes(trainer);
                      setCalendarFilters((prev: CalendarFilters) => ({
                        ...prev,
                        trainers: isSelected
                          ? prev.trainers.filter((t: string) => t !== trainer)
                          : [...prev.trainers, trainer]
                      }));
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between ${
                      calendarFilters.trainers.includes(trainer) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <span className="truncate">{trainer || 'No Trainer'}</span>
                    {calendarFilters.trainers.includes(trainer) && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Locations */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Locations ({calendarFilters.locations.length} selected)
              </label>
              <div className="border border-gray-300 rounded-xl max-h-[120px] overflow-y-auto bg-white">
                {(rawData ? getUniqueValues(rawData, 'Location') : []).map((location) => (
                  <div
                    key={location}
                    onClick={() => {
                      const isSelected = calendarFilters.locations.includes(location);
                      setCalendarFilters((prev: CalendarFilters) => ({
                        ...prev,
                        locations: isSelected
                          ? prev.locations.filter((l: string) => l !== location)
                          : [...prev.locations, location]
                      }));
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between ${
                      calendarFilters.locations.includes(location) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <span className="truncate">{location}</span>
                    {calendarFilters.locations.includes(location) && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Class Types */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Class Types ({calendarFilters.classTypes.length} selected)
              </label>
              <div className="border border-gray-300 rounded-xl max-h-[120px] overflow-y-auto bg-white">
                {(rawData ? getUniqueValues(rawData, 'Type') : []).map((classType) => (
                  <div
                    key={classType}
                    onClick={() => {
                      const isSelected = calendarFilters.classTypes.includes(classType);
                      setCalendarFilters((prev: CalendarFilters) => ({
                        ...prev,
                        classTypes: isSelected
                          ? prev.classTypes.filter((ct: string) => ct !== classType)
                          : [...prev.classTypes, classType]
                      }));
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between ${
                      calendarFilters.classTypes.includes(classType) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <span className="truncate">{classType || 'No Type'}</span>
                    {calendarFilters.classTypes.includes(classType) && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Classes */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Classes ({calendarFilters.classes.length} selected)
              </label>
              <div className="border border-gray-300 rounded-xl max-h-[120px] overflow-y-auto bg-white">
                {(rawData ? getUniqueValues(rawData, 'Class') : []).map((className) => (
                  <div
                    key={className}
                    onClick={() => {
                      const isSelected = calendarFilters.classes.includes(className);
                      setCalendarFilters((prev: CalendarFilters) => ({
                        ...prev,
                        classes: isSelected
                          ? prev.classes.filter((c: string) => c !== className)
                          : [...prev.classes, className]
                      }));
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between ${
                      calendarFilters.classes.includes(className) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <span className="truncate">{className}</span>
                    {calendarFilters.classes.includes(className) && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setCalendarFilters({
                trainers: [],
                locations: [],
                classTypes: [],
                classes: [],
                activeOnly: false
              })}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={() => setCalendarFilters((prev: CalendarFilters) => ({ ...prev, activeOnly: true }))}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                calendarFilters.activeOnly
                  ? 'bg-green-100 text-green-700 font-medium'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Show Active Only
            </button>
            <div className="text-sm text-gray-500">
              Showing {locallyFilteredData.length} classes this week
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!rawData || rawData.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-12 text-center">
          <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Data Loaded</h3>
          <p className="text-gray-500">Please upload your CSV file to view the weekly calendar.</p>
        </div>
      ) : locallyFilteredData.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-12 text-center">
          <CalendarIcon className="w-16 h-16 text-yellow-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Classes Found</h3>
          <p className="text-gray-500 mb-4">
            No classes found for the week of {format(selectedWeekStart, 'MMM d')} - {format(addDays(selectedWeekStart, 6), 'MMM d, yyyy')}
          </p>
          <p className="text-sm text-gray-400">
            Try adjusting your filters or selecting a different week.
          </p>
        </div>
      ) : null}

      {/* Calendar Views */}
      {calendarClasses.length > 0 && (
        <>
          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
              <div className="flex">
                {/* Time Column */}
                <div className="w-24 bg-gradient-to-b from-slate-50 to-white border-r-2 border-slate-200 flex-shrink-0">
                  <div className="h-20 border-b-2 border-slate-200 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-600">TIME</span>
                  </div>
                  {timeSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      className="h-[100px] border-b border-slate-100 flex items-center justify-center"
                    >
                      <span className="text-sm text-slate-700 font-bold">
                        {idx % 2 === 0 ? slot.label : ''}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="flex-1 overflow-x-auto">
                  <div className="grid grid-cols-7 min-w-[1800px]">
                    {/* Day Headers */}
                    {weekDays.map((day, idx) => {
                      const isToday = isSameDay(day, new Date());
                      const dayClasses = calendarClasses.filter(c => c.dayIndex === idx);
                      
                      return (
                        <div
                          key={idx}
                          className={`h-20 border-b-2 border-r border-slate-200 flex flex-col items-center justify-center transition-colors ${
                            isToday 
                              ? 'bg-gradient-to-b from-blue-100 via-blue-50 to-white shadow-inner' 
                              : 'bg-gradient-to-b from-slate-50 to-white hover:from-slate-100'
                          }`}
                        >
                          <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${
                            isToday ? 'text-blue-600' : 'text-slate-600'
                          }`}>
                            {format(day, 'EEE')}
                          </div>
                          <div className={`text-2xl font-bold mb-0.5 ${
                            isToday ? 'text-blue-700' : 'text-slate-800'
                          }`}>
                            {format(day, 'd')}
                          </div>
                          <div className={`text-xs px-2 py-0.5 rounded-full ${
                            isToday 
                              ? 'bg-blue-200 text-blue-800 font-semibold' 
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                          </div>
                        </div>
                      );
                    })}

                    {/* Day Columns with Time Slots */}
                    {weekDays.map((day, dayIdx) => (
                      <div key={dayIdx} className="border-r border-slate-200 relative bg-white hover:bg-slate-50/30 transition-colors">
                        {timeSlots.map((slot, slotIdx) => (
                          <div
                            key={slotIdx}
                            className="h-[100px] border-b border-slate-100 cursor-pointer hover:bg-blue-50/30 transition-colors group relative"
                            onClick={() => {
                              setSelectedSlot({ day, time: slot.label });
                              setShowCreateClass(true);
                            }}
                          >
                            {/* Visual marker for debugging - show time at each slot */}
                            <div className="absolute top-0 left-0 text-[8px] text-gray-400 px-1 pointer-events-none">
                              {slot.label} ({slotIdx * 100}px)
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center h-full">
                              <span className="text-sm text-blue-600 font-semibold">+ Add Class</span>
                            </div>
                          </div>
                        ))}
                        
                        {/* Classes for this day */}
                        <AnimatePresence>
                          {calendarClasses
                            .filter(c => c.dayIndex === dayIdx)
                            .map(calClass => renderClassBlock(calClass))}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Horizontal View */}
          {viewMode === 'horizontal' && (
            <div className="space-y-4">
              {timeSlots.map((slot, slotIdx) => {
                const slotMinutes = slot.hour * 60 + slot.minute;
                const slotClasses = calendarClasses.filter(c => c.startTime === slotMinutes);
                
                if (slotClasses.length === 0 && slotIdx % 2 !== 0) return null; // Skip empty half-hour slots
                
                return (
                  <motion.div
                    key={slotIdx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-white/50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {slot.label}
                        </h3>
                        <div className="text-sm text-gray-500">
                          {slotClasses.length} {slotClasses.length === 1 ? 'class' : 'classes'}
                        </div>
                      </div>
                    </div>
                    
                    {slotClasses.length > 0 ? (
                      <div className="p-4">
                        <div className="grid grid-cols-7 gap-3">
                          {weekDays.map((day, dayIdx) => {
                            const dayClass = slotClasses.find(c => c.dayIndex === dayIdx);
                            const isToday = isSameDay(day, new Date());
                            
                            return (
                              <div
                                key={dayIdx}
                                className={`min-h-[120px] rounded-xl border-2 transition-all ${
                                  isToday 
                                    ? 'border-blue-200 bg-blue-50/50' 
                                    : 'border-gray-200 bg-gray-50/30'
                                }`}
                              >
                                <div className={`text-center p-2 border-b ${
                                  isToday ? 'border-blue-200 bg-blue-100/50' : 'border-gray-200'
                                }`}>
                                  <div className={`text-xs font-semibold uppercase tracking-wide ${
                                    isToday ? 'text-blue-700' : 'text-gray-600'
                                  }`}>
                                    {format(day, 'EEE')}
                                  </div>
                                  <div className={`text-lg font-bold ${
                                    isToday ? 'text-blue-800' : 'text-gray-800'
                                  }`}>
                                    {format(day, 'd')}
                                  </div>
                                </div>
                                
                                {dayClass ? (
                                  <div 
                                    className="p-3 cursor-pointer hover:bg-white/80 transition-all h-full"
                                    onClick={() => {
                                      console.log('🔍 Drilldown Debug - Horizontal View:', {
                                        clickedSession: {
                                          Class: dayClass.session.Class,
                                          Day: dayClass.session.Day,
                                          Time: dayClass.session.Time,
                                          Location: dayClass.session.Location
                                        },
                                        locallyFilteredDataCount: locallyFilteredData.length,
                                        sampleLocalData: locallyFilteredData.slice(0, 2).map(s => ({
                                          Class: s.Class,
                                          Day: s.Day,
                                          Time: s.Time,
                                          Location: s.Location
                                        }))
                                      });

                                      const relatedSessions = locallyFilteredData.filter(s => 
                                        s.Class === dayClass.session.Class && 
                                        s.Day === dayClass.session.Day && 
                                        s.Time === dayClass.session.Time && 
                                        s.Location === dayClass.session.Location
                                      );
                                      
                                      console.log('🎯 Found related sessions (horizontal):', relatedSessions.length, relatedSessions);
                                      
                                      setDrilldownData(relatedSessions);
                                      setDrilldownTitle(`${dayClass.session.Class} - ${dayClass.session.Day} at ${dayClass.session.Time} (${dayClass.session.Location})`);
                                      setShowDrilldown(true);
                                    }}
                                  >
                                    {(() => {
                                      const avgData = getAverageCheckIns(
                                        dayClass.session.Class || '',
                                        dayClass.session.Day || '',
                                        dayClass.session.Time || '',
                                        dayClass.session.Location || ''
                                      );
                                      
                                      return (
                                        <div className="space-y-2">
                                          <div className="font-bold text-sm text-purple-700 truncate">
                                            {dayClass.session.Class}
                                          </div>
                                          <div className="text-xs text-gray-600 truncate">
                                            👤 {dayClass.session.Trainer}
                                          </div>
                                          <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                              <div className="text-xs font-semibold text-green-600">
                                                Current: {dayClass.session.CheckedIn || 0}/{dayClass.session.Capacity || 0}
                                              </div>
                                              <div className={`text-xs px-2 py-1 rounded-full ${
                                                dayClass.session.Status === 'Active'
                                                  ? 'bg-green-100 text-green-700'
                                                  : 'bg-gray-100 text-gray-600'
                                              }`}>
                                                {dayClass.session.Status}
                                              </div>
                                            </div>
                                            {avgData && (
                                              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                Avg: {avgData.avgCheckIns} ({avgData.totalSessions} sessions)
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <div 
                                    className="p-3 h-full flex items-center justify-center cursor-pointer hover:bg-blue-50/50 transition-all group"
                                    onClick={() => {
                                      setSelectedSlot({ day, time: slot.label });
                                      setShowCreateClass(true);
                                    }}
                                  >
                                    <div className="text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="text-blue-500 text-2xl mb-1">+</div>
                                      <div className="text-xs text-blue-600 font-medium">Add Class</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <div className="text-gray-300 text-4xl mb-2">⏰</div>
                        <div className="text-sm">No classes scheduled for this time slot</div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Format Analysis View */}
          {viewMode === 'analysis' && (
            <div className="space-y-6">
              {/* Daily Format Distribution */}
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
                  Class Format Distribution by Day
                </h3>
                
                <div className="grid grid-cols-7 gap-4">
                  {weekDays.map((day, dayIdx) => {
                    const isToday = isSameDay(day, new Date());
                    const dayFormats = dailyFormatDistribution[dayIdx] || {};
                    const totalClasses = Object.values(dayFormats).reduce((sum: number, count) => sum + (count as number), 0);
                    
                    return (
                      <div
                        key={dayIdx}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isToday 
                            ? 'border-blue-200 bg-gradient-to-b from-blue-50 to-blue-25' 
                            : 'border-gray-200 bg-gradient-to-b from-gray-50 to-white'
                        }`}
                      >
                        <div className="text-center mb-4">
                          <div className={`text-xs font-bold uppercase tracking-wide ${
                            isToday ? 'text-blue-600' : 'text-gray-600'
                          }`}>
                            {format(day, 'EEE')}
                          </div>
                          <div className={`text-2xl font-bold ${
                            isToday ? 'text-blue-700' : 'text-gray-800'
                          }`}>
                            {format(day, 'd')}
                          </div>
                          <div className={`text-sm font-semibold mt-1 ${
                            isToday ? 'text-blue-600' : 'text-gray-600'
                          }`}>
                            {totalClasses} classes
                          </div>
                        </div>
                        
                        {totalClasses > 0 ? (
                          <div className="space-y-2">
                            {Object.entries(dayFormats)
                              .sort(([,a], [,b]) => (b as number) - (a as number))
                              .map(([format, count], idx) => {
                                const percentage = ((count as number) / totalClasses) * 100;
                                
                                // Generate consistent colors for each format
                                const colors = [
                                  'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
                                  'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
                                ];
                                const colorClass = colors[idx % colors.length];
                                
                                return (
                                  <div key={format} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-medium text-gray-700 truncate" title={format}>
                                        {format.length > 12 ? format.substring(0, 12) + '...' : format}
                                      </span>
                                      <span className="text-gray-600 font-semibold">{count}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${colorClass} transition-all duration-500`}
                                        style={{ width: `${percentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <div className="text-gray-300 text-xl">📅</div>
                            <div className="text-xs text-gray-500 mt-1">No classes</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Format Summary */}
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
                  Weekly Format Summary
                </h3>
                
                {(() => {
                  const weeklyFormats: Record<string, number> = {};
                  Object.values(dailyFormatDistribution).forEach(dayFormats => {
                    Object.entries(dayFormats).forEach(([format, count]) => {
                      weeklyFormats[format] = (weeklyFormats[format] || 0) + (count as number);
                    });
                  });

                  const totalWeeklyClasses = Object.values(weeklyFormats).reduce((sum, count) => sum + count, 0);

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(weeklyFormats)
                        .sort(([,a], [,b]) => b - a)
                        .map(([format, count], idx) => {
                          const percentage = (count / totalWeeklyClasses) * 100;
                          
                          const colors = [
                            { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50' },
                            { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50' },
                            { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50' },
                            { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-50' },
                            { bg: 'bg-pink-500', text: 'text-pink-700', light: 'bg-pink-50' },
                            { bg: 'bg-indigo-500', text: 'text-indigo-700', light: 'bg-indigo-50' },
                            { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50' },
                            { bg: 'bg-teal-500', text: 'text-teal-700', light: 'bg-teal-50' },
                          ];
                          const color = colors[idx % colors.length];
                          
                          return (
                            <motion.div
                              key={format}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.1 }}
                              className={`${color.light} rounded-2xl p-6 border border-white/50`}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <h4 className={`font-bold text-lg ${color.text}`}>{format}</h4>
                                <div className={`px-3 py-1 rounded-full ${color.bg} text-white text-sm font-semibold`}>
                                  {count}
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Weekly Share</span>
                                  <span className={`font-semibold ${color.text}`}>{percentage.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div 
                                    className={`h-3 rounded-full ${color.bg} transition-all duration-1000 ease-out`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Multi-Location View */}
          {viewMode === 'multiLocation' && (
            <div className="space-y-6">
              {/* Multi-Location Header with Day Selector */}
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    All Locations - {format(selectedDay, 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <div className="flex items-center gap-4">
                    {/* Active Only Toggle */}
                    <button
                      onClick={() => setCalendarFilters((prev: CalendarFilters) => ({ ...prev, activeOnly: !prev.activeOnly }))}
                      className={`px-4 py-2 rounded-xl transition-all font-semibold text-sm ${
                        calendarFilters.activeOnly
                          ? 'bg-green-500 text-white shadow-lg'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title={calendarFilters.activeOnly ? 'Show all classes' : 'Show active classes only'}
                    >
                      {calendarFilters.activeOnly ? '✓ Active Only' : 'Active Only'}
                    </button>
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-semibold text-blue-600">{multiLocationUniqueLocations.length}</span> locations
                    </div>
                  </div>
                </div>

                {/* Day Navigation - synchronized with main navigation */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={goToPreviousDay}
                    className="p-2 hover:bg-blue-50 rounded-xl transition-colors"
                    title="Previous Day"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  
                  <div className="flex gap-2">
                    {/* Generate 7 days around selected day for easy navigation */}
                    {Array.from({ length: 7 }, (_, i) => {
                      const day = addDays(selectedDay, i - 3); // 3 days before, selected day, 3 days after
                      const isSelected = isSameDay(day, selectedDay);
                      const isToday = isSameDay(day, new Date());
                      const dayClasses = multiLocationCalendarClasses.filter(calClass => {
                        try {
                          const sessionDate = parseISO(calClass.session.Date);
                          return isSameDay(sessionDate, day);
                        } catch {
                          return false;
                        }
                      });
                      
                      return (
                        <button
                          key={i}
                          onClick={() => setCurrentDate(day)}
                          className={`px-4 py-2 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                              : isToday
                              ? 'bg-blue-100 text-blue-600 border border-blue-300'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-xs font-bold uppercase tracking-wide">
                              {format(day, 'EEE')}
                            </div>
                            <div className="text-lg font-bold">
                              {format(day, 'd')}
                            </div>
                            <div className="text-xs opacity-75">
                              {dayClasses.length} classes
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={goToNextDay}
                    className="p-2 hover:bg-blue-50 rounded-xl transition-colors"
                    title="Next Day"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* All Time Slots and Locations Grid - With Sticky Header */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Sticky Header Row */}
                  <div className="sticky top-0 z-20 flex bg-gradient-to-r from-gray-100 to-gray-200 shadow-sm border-b border-gray-300">
                    <div className="flex-shrink-0 w-24 border-r border-gray-200 p-3 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-700">Time</span>
                    </div>
                    {multiLocationUniqueLocations.map((location) => (
                      <div key={location} className="flex-1 min-w-0 border-r border-gray-200 last:border-r-0 p-3 text-center">
                        <div className="font-bold text-gray-800 text-sm truncate" title={location}>
                          {location}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {multiLocationCalendarClasses.filter(calClass => {
                            try {
                              const sessionDate = parseISO(calClass.session.Date);
                              return calClass.session.Location === location && isSameDay(sessionDate, selectedDay);
                            } catch {
                              return false;
                            }
                          }).length} classes today
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Scrollable Time Slots Container */}
                  <div className="overflow-y-auto max-h-[70vh] bg-white">
                    {timeSlots.map((slot) => {
                      // Detect trainer conflicts for the selected day using multi-location data
                      const conflicts = detectTrainerConflicts(multiLocationCalendarClasses, selectedDay);
                      const slotMinutes = slot.hour * 60 + slot.minute;
                    
                    // Check if any location has classes at this time slot for the selected day
                    const hasClassesAtThisTime = multiLocationUniqueLocations.some(location => {
                      return multiLocationCalendarClasses.some(calClass => {
                        const session = calClass.session;
                        if (session.Location !== location) return false;
                        
                        try {
                          const sessionDate = parseISO(session.Date);
                          if (!isSameDay(sessionDate, selectedDay)) return false;
                        } catch {
                          return false;
                        }
                        
                        // Exact time match
                        return calClass.startTime === slotMinutes;
                      });
                    });
                    
                    return (
                      <div key={`slot-${slot.hour}-${slot.minute}`} className={`flex border-b border-gray-100 ${hasClassesAtThisTime ? 'bg-white' : 'bg-gray-25'}`}>
                        {/* Time Label */}
                        <div className={`flex-shrink-0 w-20 border-r-2 border-gray-200 p-2 flex items-center justify-center ${hasClassesAtThisTime ? 'bg-gradient-to-r from-blue-50 to-blue-100' : 'bg-gray-50'}`}>
                          <div className="text-xs font-bold text-gray-700 text-center">
                            {slot.label}
                          </div>
                        </div>

                        {/* Location Columns */}
                        {multiLocationUniqueLocations.map((location) => {
                          // Get classes for this time slot, location, and selected day
                          const slotClasses = multiLocationCalendarClasses.filter(calClass => {
                            const session = calClass.session;
                            if (session.Location !== location) return false;
                            
                            try {
                              const sessionDate = parseISO(session.Date);
                              if (!isSameDay(sessionDate, selectedDay)) return false;
                            } catch {
                              return false;
                            }
                            
                            // Exact time match for the slot
                            return calClass.startTime === slotMinutes;
                          });

                          return (
                            <div key={`${location}-${slot.hour}-${slot.minute}`} className="flex-1 min-w-[180px] max-w-[280px] border-r border-gray-200 last:border-r-0 p-2 min-h-[90px] relative bg-white hover:bg-gray-50/50 transition-colors">
                              <div className="space-y-2">
                              {slotClasses.map((calClass, sessionIdx) => {
                                const session = calClass.session;
                                const avgResult = getAverageCheckIns(session.Class, session.Day, session.Time, session.Location);
                                const avgCheckIns = avgResult?.avgCheckIns || 0;
                                
                                const historicalCount = rawData.filter(s => 
                                  s.Class === session.Class && 
                                  s.Day === session.Day && 
                                  s.Time === session.Time && 
                                  s.Location === session.Location
                                ).length;

                                // Class type color intentionally unused here (kept for future styling)
                                
                                // Check for trainer conflicts
                                const conflictKey = `${session.Trainer}-${session.Day}-${session.Time}`;
                                const hasConflict = conflicts.has(conflictKey);
                                
                                // Determine styling based on active filter and status
                                const isActive = session.Status === 'Active';
                                const shouldGrayOut = calendarFilters.activeOnly && !isActive;
                                const fillRate = session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0;

                                return (
                                  <motion.div
                                    key={`${session.Date}-${session.Time}-${sessionIdx}`}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ scale: 1.03, zIndex: 20 }}
                                    className={`w-full rounded-xl p-3 cursor-pointer transition-all relative border-l-4 ${
                                      hasConflict 
                                        ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-600 ring-2 ring-red-300 shadow-lg' 
                                        : shouldGrayOut
                                          ? 'bg-gray-100 border-gray-400 opacity-50 shadow-sm'
                                          : isActive
                                            ? `bg-gradient-to-br from-white via-blue-50 to-indigo-50 border-blue-500 shadow-md hover:shadow-xl ${calendarFilters.activeOnly ? 'ring-2 ring-green-400' : ''}`
                                            : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-400 shadow-sm'
                                    }`}
                                    onClick={() => {
                                      console.log('🔍 Multi-Location Drilldown Debug - Class clicked:', session.Class);
                                      
                                      // Get all sessions for this class/time/location combination (historical data)
                                      const relatedSessions = rawData.filter(s => 
                                        s.Class === session.Class && 
                                        s.Day === session.Day && 
                                        s.Time === session.Time && 
                                        s.Location === session.Location
                                      );
                                      
                                      console.log('📊 Multi-Location historical sessions for drilldown:', relatedSessions.length);
                                      console.log('💡 Sample sessions:', relatedSessions.slice(0, 3));
                                      
                                      if (relatedSessions.length > 0) {
                                        setDrilldownData(relatedSessions);
                                        setDrilldownTitle(`${session.Class} - ${session.Day} ${session.Time} at ${session.Location}`);
                                        setShowDrilldown(true);
                                      } else {
                                        // Fallback to current session if no historical data
                                        setDrilldownData([session]);
                                        setDrilldownTitle(`${session.Class} - ${session.Day} ${session.Time} at ${session.Location}`);
                                        setShowDrilldown(true);
                                      }
                                    }}
                                  >
                                    {/* Status Badge */}
                                    {calendarFilters.activeOnly && isActive && (
                                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                                        <span className="text-white text-xs font-bold">✓</span>
                                      </div>
                                    )}
                                    
                                    {/* Conflict indicator */}
                                    {hasConflict && (
                                      <div className="absolute top-1 left-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md" title="Trainer Conflict!">
                                        <AlertTriangle className="w-4 h-4 text-white" />
                                      </div>
                                    )}
                                    
                                    {/* Historical data indicator */}
                                    {historicalCount > 1 && !hasConflict && (
                                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-600 rounded-full">
                                        <span className="text-xs font-bold text-white">{historicalCount}x</span>
                                      </div>
                                    )}
                                    
                                    {/* Class Name - Prominent */}
                                    <div className={`text-sm font-bold mb-2 ${shouldGrayOut ? 'text-gray-600' : hasConflict ? 'text-red-800' : 'text-gray-900'}`}>
                                      {session.Class.replace('Studio ', '')}
                                    </div>
                                    
                                    {/* Trainer */}
                                    <div className={`text-xs mb-2 flex items-center gap-1 ${shouldGrayOut ? 'text-gray-500' : hasConflict ? 'text-red-700' : 'text-gray-700'}`}>
                                      <span className="font-medium">👤</span>
                                      <span className="truncate">{session.Trainer}</span>
                                    </div>
                                    
                                    {/* Stats Row */}
                                    <div className="flex items-center justify-between gap-2">
                                      {/* Attendance */}
                                      <div className={`flex items-center gap-1 text-xs ${shouldGrayOut ? 'text-gray-500' : hasConflict ? 'text-red-700' : 'text-gray-700'}`}>
                                        <span className="font-semibold">{session.CheckedIn}/{session.Capacity}</span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                                          fillRate >= 80 ? 'bg-green-100 text-green-700' : 
                                          fillRate >= 50 ? 'bg-yellow-100 text-yellow-700' : 
                                          'bg-red-100 text-red-700'
                                        }`}>
                                          {fillRate.toFixed(0)}%
                                        </span>
                                      </div>
                                      
                                      {/* Average Check-ins */}
                                      {avgCheckIns > 0 && (
                                        <div className={`text-xs ${shouldGrayOut ? 'text-gray-500' : 'text-blue-600'}`}>
                                          <span className="font-medium">Avg: {avgCheckIns.toFixed(1)}</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Revenue if available */}
                                    {session.Revenue > 0 && (
                                      <div className={`text-xs mt-1 ${shouldGrayOut ? 'text-gray-500' : 'text-green-600'}`}>
                                        <span className="font-semibold">₹{session.Revenue.toLocaleString()}</span>
                                      </div>
                                    )}
                                  </motion.div>
                                );
                              })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  </div>
                </div>

                {multiLocationUniqueLocations.length === 0 && (
                  <div className="text-center py-12">
                    <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-gray-600 mb-2">No Locations Found</p>
                    <p className="text-gray-500">No class data available for multi-location view</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </>
      )}

      {/* Hover Tooltip */}
      <AnimatePresence>
        {hoveredClass && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 max-w-sm"
          >
            <div className="space-y-2">
              <h3 className="font-bold text-lg text-gray-800">{hoveredClass.Class}</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-medium">Trainer:</span>
                  <span>{hoveredClass.Trainer}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{hoveredClass.Location}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{hoveredClass.Date} at {hoveredClass.Time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    hoveredClass.Status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {hoveredClass.Status}
                  </span>
                </div>
                {hoveredClass.CheckedIn !== undefined && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">Check-ins:</span>
                    <span>{hoveredClass.CheckedIn} / {hoveredClass.Capacity || 'N/A'}</span>
                  </div>
                )}
                {hoveredClass.FillRate !== undefined && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">Fill Rate:</span>
                    <span className="font-semibold text-blue-600">{hoveredClass.FillRate.toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">Click for detailed analysis</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Drilldown Modal */}
      <EnhancedDrilldownModal
        isOpen={showDrilldown}
        onClose={() => setShowDrilldown(false)}
        sessions={drilldownData}
        title={drilldownTitle}
      />

      {/* Create Class Modal */}
      {selectedSlot && (
        <CreateClassModal
          isOpen={showCreateClass}
          onClose={() => {
            setShowCreateClass(false);
            setSelectedSlot(null);
          }}
          selectedDate={selectedSlot.day}
          selectedTime={selectedSlot.time}
        />
      )}

      {/* Legend */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Legend</h3>
        
        {/* Class Type Colors */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Class Types</h4>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-purple-600 rounded"></div>
              <span className="text-gray-600">Yoga</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-pink-400 to-rose-500 rounded"></div>
              <span className="text-gray-600">Pilates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-orange-500 rounded"></div>
              <span className="text-gray-600">HIIT</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded"></div>
              <span className="text-gray-600">Cycling</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-gray-600 to-gray-800 rounded"></div>
              <span className="text-gray-600">Strength</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded"></div>
              <span className="text-gray-600">Functional</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-amber-500 rounded"></div>
              <span className="text-gray-600">Dance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-red-600 to-red-800 rounded"></div>
              <span className="text-gray-600">Boxing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-indigo-400 to-purple-500 rounded"></div>
              <span className="text-gray-600">Barre 57</span>
            </div>
          </div>
        </div>
        
        {/* Special Indicators */}
        <div>
          <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Special Indicators</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 rounded border-2 border-red-700 relative">
                <div className="absolute top-0 left-0 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center border border-red-300">
                  <AlertTriangle className="w-2 h-2 text-red-700" />
                </div>
              </div>
              <span className="text-gray-600">Trainer Conflict</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gradient-to-r from-blue-400 to-blue-500 rounded relative">
                <div className="absolute top-0 right-0 w-3 h-3 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">5</span>
                </div>
              </div>
              <span className="text-gray-600">Historical Data Count</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 border-l-4 border-gray-400 rounded-r"></div>
              <span className="text-gray-600">Inactive</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
