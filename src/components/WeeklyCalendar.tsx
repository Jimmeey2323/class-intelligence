import { useState, useMemo } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { SessionData } from '../types';
import { format, startOfWeek, addDays, parseISO, isWithinInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Filter, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EnhancedDrilldownModal from './EnhancedDrilldownModal';
import CreateClassModal from './CreateClassModal';

interface CalendarClass {
  session: SessionData;
  dayIndex: number; // 0-6 (Sun-Sat)
  startTime: number; // minutes from midnight
  duration: number; // minutes
  position: number; // for overlapping classes
  totalOverlaps: number;
}

export default function WeeklyCalendar() {
  const { rawData, setRawData } = useDashboardStore();
  
  console.log('📊 WeeklyCalendar rawData count:', rawData.length);
  
  // State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedWeekStart, setSelectedWeekStart] = useState(startOfWeek(new Date()));
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['Active', 'Inactive']);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hoveredClass, setHoveredClass] = useState<SessionData | null>(null);
  const [drilldownData, setDrilldownData] = useState<SessionData[]>([]);
  const [drilldownTitle, setDrilldownTitle] = useState('');
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: Date; time: string } | null>(null);
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);

  // Time configuration: 7am - 10pm
  const startHour = 7;
  const endHour = 22;
  const timeSlots = Array.from({ length: (endHour - startHour) * 2 }, (_, i) => {
    const hour = Math.floor(i / 2) + startHour;
    const minute = (i % 2) * 30;
    return { hour, minute, label: `${hour % 12 || 12}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}` };
  });

  // Get unique values for filters
  const { locations, types, statuses } = useMemo(() => {
    const locs = new Set<string>();
    const typs = new Set<string>();
    const stats = new Set<string>();
    
    rawData.forEach(session => {
      if (session.Location) locs.add(session.Location);
      if (session.Type) typs.add(session.Type);
      if (session.Status) stats.add(session.Status);
    });
    
    return {
      locations: Array.from(locs).sort(),
      types: Array.from(typs).sort(),
      statuses: Array.from(stats).sort(),
    };
  }, [rawData]);

  // Week days for current selection
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i));
  }, [selectedWeekStart]);

  // Filter and organize classes
  const calendarClasses = useMemo(() => {
    console.log('🔍 Calendar Debug:', {
      totalSessions: rawData.length,
      weekDays: weekDays.map(d => format(d, 'yyyy-MM-dd')),
      sampleSessionDate: rawData[0]?.Date,
      sampleSessionTime: rawData[0]?.Time,
    });
    
    // Apply filters
    let filtered = rawData.filter(session => {
      // Date filter
      if (!session.Date) return false;
      
      let sessionDate;
      try {
        sessionDate = parseISO(session.Date);
      } catch (e) {
        console.warn('Failed to parse date:', session.Date);
        return false;
      }
      
      // Check if in current week
      const inWeek = weekDays.some(day => isSameDay(day, sessionDate));
      if (!inWeek) return false;
      
      // Date range filter
      if (startDate && endDate) {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        if (!isWithinInterval(sessionDate, { start, end })) return false;
      }
      
      // Location filter
      if (selectedLocations.length > 0 && !selectedLocations.includes(session.Location || '')) {
        return false;
      }
      
      // Status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(session.Status || '')) {
        return false;
      }
      
      // Type filter
      if (selectedTypes.length > 0 && !selectedTypes.includes(session.Type || '')) {
        return false;
      }
      
      return true;
    });

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
      if (hour < startHour || hour >= endHour) {
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
  }, [rawData, weekDays, selectedLocations, selectedStatuses, selectedTypes, startDate, endDate]);

  // Navigation
  const goToPreviousWeek = () => {
    setSelectedWeekStart(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setSelectedWeekStart(prev => addDays(prev, 7));
  };

  const goToToday = () => {
    setSelectedWeekStart(startOfWeek(new Date()));
  };

  const goToPreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    setSelectedWeekStart(startOfWeek(newMonth));
  };

  const goToNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    setSelectedWeekStart(startOfWeek(newMonth));
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

  // Quick filters
  const clearFilters = () => {
    setSelectedLocations([]);
    setSelectedTypes([]);
    setSelectedStatuses(['Active', 'Inactive']);
    setStartDate('');
    setEndDate('');
  };

  const showActiveOnly = () => {
    setSelectedStatuses(['Active']);
  };

  const toggleLocation = (location: string) => {
    setSelectedLocations(prev =>
      prev.includes(location)
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Replace the renderClassBlock function with this improved version:
const renderClassBlock = (calClass: CalendarClass) => {
  const { session, startTime, duration, position, totalOverlaps } = calClass;
  
  console.log('🎯 Rendering class:', {
    class: session.Class,
    dayIndex: calClass.dayIndex,
    startTime,
    duration,
    position,
    totalOverlaps
  });
  
  // Calculate position - ensure proper positioning
  const timeSlotHeight = 100; // px per 30min slot
  const top = ((startTime - (startHour * 60)) / 30) * timeSlotHeight;
  const height = Math.max((duration / 30) * timeSlotHeight, 120); // Minimum 120px height
  
  // FIXED: Better width calculation for overlapping classes
  let width: string;
  let left: string;
  
  if (totalOverlaps > 1) {
    const overlapWidth = 100 / totalOverlaps;
    // INCREASED: Cards are now wider when collapsed
    width = `calc(${overlapWidth}% - 6px)`;
    left = `calc(${position * overlapWidth}% + 3px)`;
  } else {
    width = 'calc(100% - 12px)';
    left = '6px';
  }
  
  // Color based on status and fill rate
  const isActive = session.Status === 'Active';
  const fillRate = session.FillRate || (session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0);
  
  let bgColor = 'bg-gray-400';
  let borderColor = 'border-gray-700';
  let textColor = 'text-white';
  
  if (isActive) {
    if (fillRate >= 80) {
      bgColor = 'bg-gradient-to-br from-emerald-500 to-green-600';
      borderColor = 'border-emerald-700';
    } else if (fillRate >= 50) {
      bgColor = 'bg-gradient-to-br from-blue-500 to-indigo-600';
      borderColor = 'border-blue-700';
    } else {
      bgColor = 'bg-gradient-to-br from-amber-500 to-orange-600';
      borderColor = 'border-amber-700';
    }
  }
  
  return (
    <motion.div
      key={`${session.Date}-${session.Time}-${session.Class}-${session.Trainer}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ 
        scale: 1.08,
        width: totalOverlaps > 1 ? 'calc(100% - 12px)' : undefined,
        left: totalOverlaps > 1 ? '6px' : undefined,
        zIndex: 50,
        transition: { duration: 0.2 }
      }}
      style={{
        position: 'absolute',
        top: `${top}px`,
        height: `${height}px`,
        width,
        left,
        zIndex: 10 + position,
      }}
      className={`${bgColor} ${borderColor} ${textColor} border-l-[5px] rounded-xl shadow-xl p-4 cursor-pointer hover:shadow-2xl transition-shadow duration-200`}
      onMouseEnter={() => setHoveredClass(session)}
      onMouseLeave={() => setHoveredClass(null)}
      onClick={() => {
        const relatedSessions = rawData.filter(s => 
          s.Class === session.Class && 
          s.Day === session.Day && 
          s.Time === session.Time && 
          s.Location === session.Location
        );
        setDrilldownData(relatedSessions);
        setDrilldownTitle(`${session.Class} - ${session.Day} at ${session.Time} (${session.Location})`);
        setShowDrilldown(true);
      }}
    >
      {/* SIMPLIFIED content to ensure it's visible */}
      <div className="flex flex-col h-full justify-between">
        <div className="flex-1">
          <div className="font-bold text-sm leading-tight mb-1 line-clamp-2 break-words">
            {session.Class || 'Unnamed Class'}
          </div>
          <div className="text-xs opacity-90 truncate">
            {session.Trainer || 'No Trainer'}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-white/30">
          <span className="font-semibold opacity-90">
            {session.Time ? session.Time.substring(0, 5) : 'No Time'}
          </span>
          {session.CheckedIn !== undefined && session.Capacity !== undefined && (
            <span className="font-bold px-1.5 py-0.5 bg-white/20 rounded text-xs">
              {session.CheckedIn}/{session.Capacity}
            </span>
          )}
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

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
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
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl transition-all ${showFilters ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              title="Toggle Filters"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 space-y-4 border-t border-gray-200 pt-6"
            >
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={showActiveOnly}
                  className="px-4 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded-xl transition-colors"
                >
                  Active Only
                </button>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded-xl transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              </div>

              {/* Location Filters */}
              {locations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Locations</label>
                  <div className="flex flex-wrap gap-2">
                    {locations.map(location => (
                      <button
                        key={location}
                        onClick={() => toggleLocation(location)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                          selectedLocations.includes(location)
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {location}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Type Filters */}
              {types.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class Types</label>
                  <div className="flex flex-wrap gap-2">
                    {types.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                          selectedTypes.includes(type)
                            ? 'bg-purple-500 text-white shadow-md'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Filters */}
              {statuses.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {statuses.map(status => (
                      <button
                        key={status}
                        onClick={() => toggleStatus(status)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                          selectedStatuses.includes(status)
                            ? 'bg-green-500 text-white shadow-md'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results Count */}
              <div className="text-sm text-gray-600 bg-blue-50 rounded-xl p-3">
                Showing <span className="font-semibold text-blue-600">{calendarClasses.length}</span> classes
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {rawData.length === 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-12 text-center">
          <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Data Loaded</h3>
          <p className="text-gray-500">Please upload your CSV file to view the weekly calendar.</p>
        </div>
      )}

      {/* No Classes This Week */}
      {rawData.length > 0 && calendarClasses.length === 0 && (
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
      )}

      {/* Calendar Grid */}
      {calendarClasses.length > 0 && (
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
                      className="h-[100px] border-b border-slate-100 cursor-pointer hover:bg-blue-50/30 transition-colors group"
                      onClick={() => {
                        setSelectedSlot({ day, time: slot.label });
                        setShowCreateClass(true);
                      }}
                    >
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
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Legend</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-l-4 border-green-400 rounded-r"></div>
            <span className="text-gray-600">High Fill Rate (80%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-l-4 border-blue-400 rounded-r"></div>
            <span className="text-gray-600">Medium Fill Rate (50-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-l-4 border-yellow-400 rounded-r"></div>
            <span className="text-gray-600">Low Fill Rate (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 border-l-4 border-gray-400 rounded-r"></div>
            <span className="text-gray-600">Inactive</span>
          </div>
        </div>
      </div>
    </div>
  );
}
