import { useState, useMemo, useEffect, Fragment, useRef } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { SessionData } from '../types';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { 
  Plus, 
  Edit3, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  MapPin, 
  Clock, 
  Star,
  Eye,
  X,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Available trainer images (from `/images` folder)
const IMAGE_FILES = [
  '001-1_Anisha-1-e1590837044475.jpg',
  '002-Atulan-Image-1.jpg',
  '003-Cauveri-1.jpg',
  '004-Kajol-Kanchan-1.jpg',
  '005-Karan-Bhatia-1-1.jpeg',
  '007-Mrigakshi-Image-2.jpg',
  '008-Pranjali-Image-1.jpg',
  '009-Pushyank-Nahar-1.jpeg',
  '010-Reshma-Image-3.jpg',
  '011-Richard-Image-3.jpg',
  '012-Rohan-Image-3.jpg',
  '013-Saniya-Image-1.jpg',
  '014-Shruti-Kulkarni.jpeg',
  '015-Vivaran-Image-4.jpg',
  'Karanveer.jpg',
  'Logo.png',
  'Shruti-Kulkarni.jpeg',
  'Veena.jpeg',
  'Anmol.jpeg',
  'Bret.jpeg',
  'Raunak.jpeg',
  'Simonelle.jpeg',
  'Sovena.jpeg',
  'Simran.jpeg'
];

// Normalize strings for matching (remove non-alphanumeric and lowercase)
const normalizeKey = (s: string | undefined) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function findTrainerImage(trainer: string | undefined) {
  if (!trainer) return null;
  const raw = trainer.trim();
  const norm = normalizeKey(raw);

  // Prefer normalized explicit map lookup (handles punctuation/spacing variations)
  const explicitDirect = TRAINER_IMAGE_MAP[raw.toLowerCase()];
  if (explicitDirect) return `/images/${explicitDirect}`;

  // Build a normalized explicit map once
  const TRAINER_IMAGE_MAP_NORM: Record<string, string> = {};
  Object.entries(TRAINER_IMAGE_MAP).forEach(([k, v]) => {
    TRAINER_IMAGE_MAP_NORM[normalizeKey(k)] = v;
  });

  if (TRAINER_IMAGE_MAP_NORM[norm]) return `/images/${TRAINER_IMAGE_MAP_NORM[norm]}`;

  // Try exact filename match (without extension)
  for (const f of IMAGE_FILES) {
    const nameOnly = f.replace(/\.[^/.]+$/, '');
    if (normalizeKey(nameOnly) === norm) return `/images/${f}`;
  }

  // Try partial token matches (match any token of trainer name to filename)
  const tokens = raw.split(/\s+/).map(t => normalizeKey(t)).filter(Boolean);
  for (const f of IMAGE_FILES) {
    const nf = normalizeKey(f.replace(/\.[^/.]+$/, ''));
    // if any token is inside filename or filename tokens inside trainer name
    if (tokens.some(tok => nf.includes(tok)) || tokens.some(tok => tok.includes(nf))) {
      return `/images/${f}`;
    }
  }

  // Try matching by last name or first name specifically
  if (tokens.length > 0) {
    const first = tokens[0];
    const last = tokens[tokens.length - 1];
    for (const f of IMAGE_FILES) {
      const nf = normalizeKey(f.replace(/\.[^/.]+$/, ''));
      if (nf.includes(last) || nf.includes(first)) return `/images/${f}`;
    }
  }

  // Not found
  return null;
}

// Circular avatar with animated progress ring using SVG
import React from 'react';

const CircularAvatar: React.FC<{
  percent: number;
  color?: string;
  size?: number;
  stroke?: number;
  imgSrc?: string | null;
  initials?: string;
}> = ({ percent, color = '#16a34a', size = 56, stroke = 6, imgSrc, initials }) => {
  const pct = Math.max(0, Math.min(100, percent));
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'visible' }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        <circle cx={cx} cy={cy} r={radius} stroke="#e6e6e6" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div style={{ position: 'absolute', left: '50%', top: '0%', transform: 'translate(-50%,6%)', width: size - stroke * 2 - 2, height: size - stroke * 2 - 2, borderRadius: '50%', overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        {imgSrc ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img src={imgSrc} alt={`avatar`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{initials}</span>
        )}
      </div>
    </div>
  );
};

// Workload colour helper per new thresholds:
// - <=5  => red
// - 6-9  => orange
// - 10-14 => green
// - >=15 => red
const getWorkloadColor = (hours: number) => {
  if (hours <= 5) return '#ef4444';        // red for very low
  if (hours >= 15) return '#ef4444';       // red for overloaded
  if (hours >= 10 && hours <= 14) return '#16a34a'; // green for healthy 10-14
  // remaining (6-9) => orange
  return '#f97316';
};

// Explicit mapping from trainer full name (lowercased) to image filename
const TRAINER_IMAGE_MAP: Record<string, string> = {
  'anisha shah': '001-1_Anisha-1-e1590837044475.jpg',
  'atulan purohit': '002-Atulan-Image-1.jpg',
  'cauveri vikrant': '003-Cauveri-1.jpg',
  'kajol kanchan': '004-Kajol-Kanchan-1.jpg',
  'karan bhatia': '005-Karan-Bhatia-1-1.jpeg',
  'mrigakshi jaiswal': '007-Mrigakshi-Image-2.jpg',
  'pranjali jain': '008-Pranjali-Image-1.jpg',
  'pushyank nahar': '009-Pushyank-Nahar-1.jpeg',
  'reshma sharma': '010-Reshma-Image-3.jpg',
  "richard d'costa": '011-Richard-Image-3.jpg',
  'rohan dahima': '012-Rohan-Image-3.jpg',
  'saniya jaiswal': '013-Saniya-Image-1.jpg',
  'shruti kulkarni': '014-Shruti-Kulkarni.jpeg',
  'vivaran dhasmana': '015-Vivaran-Image-4.jpg',
  'karanvir bhatia': 'Karanveer.jpg',
  'veena narasimhan': 'Veena.jpeg'
};

// Types
interface ScheduleClass {
  id: string;
  day: string;
  time: string;
  class: string;
  trainer: string;
  location: string;
  capacity: number;
  avgCheckIns: number;
  fillRate: number;
  sessionCount: number;
  revenue: number;
  status: string;
  conflicts: string[];
  recommendations: string[];
  
  // Extended metrics (15+ total)
  totalRevenue: number;
  avgBooked: number;
  avgLateCancelled: number;
  cancellationRate: number;
  avgWaitlisted: number;
  waitlistRate: number;
  avgComplimentary: number;
  complimentaryRate: number;
  avgMemberships: number;
  avgPackages: number;
  avgIntroOffers: number;
  avgSingleClasses: number;
  revenuePerCheckIn: number;
  bookingToCheckInRate: number;
  consistency: number;
  topTrainers: Array<{ 
    name: string; 
    sessions: number; 
    totalCheckIns: number;
    classAvg: number;
    avgFill: number; 
    avgRevenue: number;
    score: number;
  }>;
}

interface ProSchedulerFilters {
  dateFrom: Date;
  dateTo: Date;
  locations: string[];
  trainers: string[];
  classes: string[];
  activeOnly: boolean;
}

type ViewMode = 'calendar' | 'analytics' | 'optimization' | 'conflicts';
type CalendarViewMode = 'standard' | 'multi-location' | 'horizontal' | 'analytical' | 'compact' | 'timeline';

// Cache for schedule classes
let cachedScheduleClasses: ScheduleClass[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

function ProScheduler() {
  const { rawData = [], activeClassesData = {} } = useDashboardStore();
  
  // State management
  const [filters, setFilters] = useState<ProSchedulerFilters>({
    dateFrom: new Date('2025-08-01'), // August 1, 2025
    dateTo: new Date(), // Current date (no future dates)
    locations: [],
    trainers: [],
    classes: [],
    activeOnly: true
  });

  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('standard');
  const [selectedClass, setSelectedClass] = useState<ScheduleClass | null>(null);
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ScheduleClass | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ day: string; time: string } | null>(null);
  const [showTrainerAnalytics, setShowTrainerAnalytics] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  const [showOptimizationPanel, setShowOptimizationPanel] = useState(false);
  const [hoveredClassId, setHoveredClassId] = useState<string | null>(null);
  const [showNonFunctionalHours, setShowNonFunctionalHours] = useState(false);
  const drilldownModalRef = useRef<HTMLDivElement>(null);
  
  // Format currency helper - always max 1 decimal
  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}`;
  };
  
  const [addModalData, setAddModalData] = useState({
    className: '',
    trainer: '',
    location: '',
    capacity: 20
  });

  // Force reload active classes if they're not loaded
  useEffect(() => {
    if (Object.keys(activeClassesData).length === 0 || rawData.length === 0) {
      // Always try to reload active classes when Pro Scheduler mounts
      import('../utils/activeClassesLoader').then(({ loadActiveClasses }) => {
        loadActiveClasses().then((activeClasses) => {
          // Update the store directly
          import('../store/dashboardStore').then(({ useDashboardStore }) => {
            useDashboardStore.setState({ activeClassesData: activeClasses });
          });
        }).catch(error => {
          console.error('ProScheduler: Failed to reload active classes:', error);
        });
      });
    }
  }, []); // Only run on mount

  // Process active classes data into schedule format with caching
  const scheduleClasses = useMemo(() => {
    const now = Date.now();
    
    // Return cached data if still valid
    if (cachedScheduleClasses && (now - cacheTimestamp) < CACHE_DURATION) {
      return cachedScheduleClasses;
    }
    
    const classes: ScheduleClass[] = [];
    
    // Process active classes data as PRIMARY source - always show these
    if (activeClassesData && Object.keys(activeClassesData).length > 0) {
      Object.entries(activeClassesData).forEach(([day, dayClasses]) => {
        dayClasses.forEach((activeClass: any, index: number) => {
          // FILTER: Skip classes without trainer or containing 'hosted'
          if (!activeClass.trainer || activeClass.trainer.trim() === '' || 
              activeClass.className?.toLowerCase().includes('hosted')) {
            return;
          }
          // Normalize time format from Active.csv (e.g., "7:15 AM" -> "07:15")
          const normalizeTime = (time: string): string => {
            if (!time) return '08:00';
            
            // Parse AM/PM format
            const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (match) {
              let hours = parseInt(match[1]);
              const minutes = match[2];
              const period = match[3].toUpperCase();
              
              if (period === 'PM' && hours !== 12) hours += 12;
              if (period === 'AM' && hours === 12) hours = 0;
              
              return `${hours.toString().padStart(2, '0')}:${minutes}`;
            }
            
            return time;
          };

          const normalizedTime = normalizeTime(activeClass.time);
          
          // Calculate metrics from historical data (if available) - EXCLUDE FUTURE SESSIONS
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Start of today
          
          const historicalSessions = rawData.filter((session: SessionData) => {
            // CRITICAL: Only include past sessions, exclude future ones
            const sessionDate = parseISO(session.Date);
            if (sessionDate >= today) return false; // Skip future sessions
            
            // Apply date range filter from ProScheduler filters
            const inDateRange = isWithinInterval(sessionDate, { start: filters.dateFrom, end: filters.dateTo });
            if (!inDateRange) return false;
            
            // Exact matching for consistency with drilldown table
            const sessionTime24 = session.Time?.substring(0, 5) || '';
            const matchesTime = sessionTime24 === normalizedTime || 
                               session.Time?.startsWith(normalizedTime);
            const matchesDay = session.Day === day;
            const matchesClass = session.Class?.toLowerCase() === activeClass.className?.toLowerCase();
            const matchesLocation = session.Location?.toLowerCase() === activeClass.location?.toLowerCase();
            
            return matchesDay && matchesTime && matchesClass && matchesLocation;
          });

          const sessionCount = historicalSessions.length;
          
          // Calculate comprehensive metrics (15+ metrics)
          const totalCheckIns = historicalSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0);
          const totalCapacity = historicalSessions.reduce((sum, s) => sum + (s.Capacity || 0), 0);
          const totalBooked = historicalSessions.reduce((sum, s) => sum + (s.Booked || 0), 0);
          const totalLateCancelled = historicalSessions.reduce((sum, s) => sum + (s.LateCancelled || 0), 0);
          const totalWaitlisted = historicalSessions.reduce((sum, s) => sum + (s.Waitlisted || 0), 0);
          const totalComplimentary = historicalSessions.reduce((sum, s) => sum + (s.Complimentary || 0), 0);
          const totalMemberships = historicalSessions.reduce((sum, s) => sum + (s.Memberships || 0), 0);
          const totalPackages = historicalSessions.reduce((sum, s) => sum + (s.Packages || 0), 0);
          const totalIntroOffers = historicalSessions.reduce((sum, s) => sum + (s.IntroOffers || 0), 0);
          const totalSingleClasses = historicalSessions.reduce((sum, s) => sum + (s.SingleClasses || 0), 0);
          const totalRevenue = historicalSessions.reduce((sum, s) => sum + (s.Revenue || 0), 0);
          
          const avgCheckIns = sessionCount > 0 ? totalCheckIns / sessionCount : 20;
          const avgBooked = sessionCount > 0 ? totalBooked / sessionCount : 22;
          const avgLateCancelled = sessionCount > 0 ? totalLateCancelled / sessionCount : 0;
          const avgWaitlisted = sessionCount > 0 ? totalWaitlisted / sessionCount : 0;
          const avgComplimentary = sessionCount > 0 ? totalComplimentary / sessionCount : 0;
          const avgMemberships = sessionCount > 0 ? totalMemberships / sessionCount : 0;
          const avgPackages = sessionCount > 0 ? totalPackages / sessionCount : 0;
          const avgIntroOffers = sessionCount > 0 ? totalIntroOffers / sessionCount : 0;
          const avgSingleClasses = sessionCount > 0 ? totalSingleClasses / sessionCount : 0;
          
          const fillRate = sessionCount > 0 && totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 75;
          const cancellationRate = totalBooked > 0 ? (totalLateCancelled / totalBooked) * 100 : 0;
          const waitlistRate = sessionCount > 0 && totalCapacity > 0 ? (totalWaitlisted / totalCapacity) * 100 : 0;
          const complimentaryRate = totalCheckIns > 0 ? (totalComplimentary / totalCheckIns) * 100 : 0;
          const bookingToCheckInRate = totalBooked > 0 ? (totalCheckIns / totalBooked) * 100 : 90;
          const revenuePerCheckIn = totalCheckIns > 0 ? totalRevenue / totalCheckIns : 2500;
          
          // Calculate consistency score (standard deviation of fill rates)
          const fillRates = historicalSessions.map(s => s.Capacity > 0 ? (s.CheckedIn / s.Capacity) * 100 : 0);
          const avgFillRate = fillRates.length > 0 ? fillRates.reduce((sum, fr) => sum + fr, 0) / fillRates.length : 0;
          const variance = fillRates.length > 0 ? fillRates.reduce((sum, fr) => sum + Math.pow(fr - avgFillRate, 2), 0) / fillRates.length : 0;
          const stdDev = Math.sqrt(variance);
          const consistency = 100 - Math.min(stdDev, 100); // Higher is more consistent
          
          // Top 3 trainers for this class
          const trainerStats = new Map<string, { sessions: number; checkIns: number; revenue: number; capacity: number }>();
          historicalSessions.forEach(s => {
            if (!s.Trainer) return;
            const stats = trainerStats.get(s.Trainer) || { sessions: 0, checkIns: 0, revenue: 0, capacity: 0 };
            stats.sessions++;
            stats.checkIns += s.CheckedIn || 0;
            stats.revenue += s.Revenue || 0;
            stats.capacity += s.Capacity || 0;
            trainerStats.set(s.Trainer, stats);
          });
          
          const topTrainers = Array.from(trainerStats.entries())
            .map(([name, stats]) => {
              const classAvg = stats.sessions > 0 ? stats.checkIns / stats.sessions : 0;
              const avgFill = stats.capacity > 0 ? (stats.checkIns / stats.capacity) * 100 : 0;
              const avgRevenue = stats.sessions > 0 ? stats.revenue / stats.sessions : 0;
              // Score: weighted combination of class avg (60%), fill rate (30%), sessions (10%)
              const score = (classAvg * 0.6) + (avgFill * 0.3) + (stats.sessions * 0.1);
              return {
                name,
                sessions: stats.sessions,
                totalCheckIns: stats.checkIns,
                classAvg: Math.round(classAvg * 10) / 10,
                avgFill: Math.round(avgFill * 10) / 10,
                avgRevenue: Math.round(avgRevenue),
                score: Math.round(score * 10) / 10
              };
            })
            .sort((a, b) => b.classAvg - a.classAvg) // Rank by class average
            .slice(0, 3);
          
          const revenue = avgCheckIns * 2500; // ₹25 per person

          // Detect conflicts and recommendations
          const conflicts: string[] = [];
          const recommendations: string[] = [];
          
          if (sessionCount === 0) {
            recommendations.push('🆕 New class with no historical data - Monitor first 4 weeks for attendance patterns');
          } else {
            // Fill rate based recommendations
            if (fillRate < 40) {
              recommendations.push(`⚠️ Very low fill rate (${Math.round(fillRate)}%) - Consider: (1) Moving to a more popular time slot, (2) Targeted social media campaigns, (3) Intro offer pricing`);
            } else if (fillRate < 60) {
              recommendations.push(`📊 Below target fill rate (${Math.round(fillRate)}%) - Try: (1) Partner promotions with local businesses, (2) Member referral incentives, (3) Trial class passes`);
            } else if (fillRate > 90) {
              recommendations.push(`🔥 Excellent demand (${Math.round(fillRate)}% fill) - Action: (1) Add ${day} ${normalizedTime} duplicate session, (2) Increase capacity by 20%, (3) Premium pricing opportunity`);
            } else if (fillRate > 75) {
              recommendations.push(`✅ Strong performance (${Math.round(fillRate)}% fill) - Maintain current strategy and monitor for growth opportunities`);
            }
            
            // Cancellation rate insights
            if (cancellationRate > 25) {
              recommendations.push(`❌ High cancellation rate (${Math.round(cancellationRate)}%) - Implement: (1) 2-hour cancellation policy, (2) Waitlist auto-fill, (3) Cancellation fee structure`);
            } else if (cancellationRate > 15) {
              recommendations.push(`⚡ Elevated cancellations (${Math.round(cancellationRate)}%) - Consider: (1) Reminder emails 4 hours before, (2) SMS confirmations, (3) Streak rewards for attendance`);
            }
            
            // Waitlist opportunities
            if (waitlistRate > 15) {
              recommendations.push(`🎯 Consistent waitlists (${Math.round(waitlistRate)}%) - Urgent: (1) Add parallel ${normalizedTime} class immediately, (2) Expand to ${sessionCount > 0 ? Math.round(totalCapacity / sessionCount) + 5 : 30} capacity, (3) Create VIP access tier`);
            } else if (waitlistRate > 8) {
              recommendations.push(`📈 Growing waitlist (${Math.round(waitlistRate)}%) - Plan: (1) Trial capacity expansion to ${sessionCount > 0 ? Math.round(totalCapacity / sessionCount) + 3 : 28}, (2) Survey waitlisted members for time preferences`);
            }
            
            // Consistency insights
            if (consistency < 60) {
              recommendations.push(`📉 Inconsistent attendance (${Math.round(consistency)}% consistency) - Stabilize with: (1) Regular class time/trainer, (2) Build community through social groups, (3) Loyalty programs`);
            }
            
            // Revenue optimization
            const avgRevPerSession = totalRevenue / sessionCount;
            if (avgRevPerSession < 15000) {
              recommendations.push(`💰 Revenue optimization opportunity - Current ₹${Math.round(avgRevPerSession/100)}/session - Tactics: (1) Upsell packages at check-in, (2) Premium time slot pricing, (3) Private training add-ons`);
            }
            
            // Trainer performance
            if (topTrainers.length > 0 && topTrainers[0].classAvg > avgCheckIns * 1.3) {
              recommendations.push(`⭐ Trainer ${topTrainers[0].name} excels (${topTrainers[0].classAvg} avg) - Strategy: (1) Feature in marketing, (2) Train other instructors, (3) Signature class series`);
            }
          }
          
          // Time slot recommendations
          const hourNum = parseInt(normalizedTime.split(':')[0]);
          if (hourNum >= 6 && hourNum < 9 && fillRate < 70) {
            recommendations.push(`🌅 Early morning slot underperforming - Test: (1) Sunrise outdoor sessions in good weather, (2) Coffee + class packages, (3) Early bird membership discounts`);
          } else if (hourNum >= 18 && hourNum < 21 && fillRate > 85) {
            recommendations.push(`🌆 Peak evening time - Maximize: (1) Dynamic pricing (+20%), (2) Express format options, (3) Corporate partnerships for bulk bookings`);
          }

          classes.push({
            id: `active-${day}-${normalizedTime}-${activeClass.className}-${index}`,
            day,
            time: normalizedTime,
            class: activeClass.className || 'Unknown Class',
            trainer: activeClass.trainer || 'TBD',
            location: activeClass.location || 'Unknown Location',
            capacity: sessionCount > 0 ? Math.round(totalCapacity / sessionCount) || 25 : 25,
            avgCheckIns: Math.round(avgCheckIns * 10) / 10,
            fillRate: Math.round(fillRate),
            sessionCount: sessionCount,
            revenue: Math.round(revenue),
            status: 'Active',
            conflicts,
            recommendations,
            // Extended metrics
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            avgBooked: Math.round(avgBooked * 10) / 10,
            avgLateCancelled: Math.round(avgLateCancelled * 10) / 10,
            cancellationRate: Math.round(cancellationRate * 10) / 10,
            avgWaitlisted: Math.round(avgWaitlisted * 10) / 10,
            waitlistRate: Math.round(waitlistRate * 10) / 10,
            avgComplimentary: Math.round(avgComplimentary * 10) / 10,
            complimentaryRate: Math.round(complimentaryRate * 10) / 10,
            avgMemberships: Math.round(avgMemberships * 10) / 10,
            avgPackages: Math.round(avgPackages * 10) / 10,
            avgIntroOffers: Math.round(avgIntroOffers * 10) / 10,
            avgSingleClasses: Math.round(avgSingleClasses * 10) / 10,
            revenuePerCheckIn: Math.round(revenuePerCheckIn),
            bookingToCheckInRate: Math.round(bookingToCheckInRate * 10) / 10,
            consistency: Math.round(consistency * 10) / 10,
            topTrainers
          });
        });
      });
    }
    
    // Only process historical data if activeOnly is false
    // This prevents adding 228 historical classes when user only wants to see 151 active ones
    if (!filters.activeOnly) {
      // Process historical data for additional insights
      const uniqueClasses = new Map<string, ScheduleClass>();
      
      rawData.forEach((session: SessionData, index: number) => {
      if (!session.Day || !session.Time || !session.Class) return;
      
      const sessionDate = parseISO(session.Date);
      
      // CRITICAL: Exclude future sessions from historical metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (sessionDate >= today) return; // Skip future sessions
      
      const inDateRange = isWithinInterval(sessionDate, { start: filters.dateFrom, end: filters.dateTo });
      
      if (!inDateRange) return;
      
      const key = `${session.Day}-${session.Time}-${session.Class}-${session.Location}`;
      
      // Skip if we already have this class from active data
      const existingClass = classes.find(cls => 
        cls.day === session.Day && 
        cls.time === session.Time && 
        cls.class === session.Class && 
        cls.location === session.Location
      );
      
      if (!existingClass && !uniqueClasses.has(key)) {
        const similarSessions = rawData.filter((s: SessionData) => {
          // Only include sessions within date range and exclude future
          const sDate = parseISO(s.Date);
          if (sDate >= today) return false;
          const sInDateRange = isWithinInterval(sDate, { start: filters.dateFrom, end: filters.dateTo });
          if (!sInDateRange) return false;
          
          return s.Day === session.Day &&
            s.Time === session.Time &&
            s.Class === session.Class &&
            s.Location === session.Location;
        });
        
        const sessionCount = similarSessions.length;
        const totalCheckIns = similarSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0);
        const totalCapacity = similarSessions.reduce((sum, s) => sum + (s.Capacity || 0), 0);
        const totalBooked = similarSessions.reduce((sum, s) => sum + (s.Booked || 0), 0);
        const totalLateCancelled = similarSessions.reduce((sum, s) => sum + (s.LateCancelled || 0), 0);
        const totalWaitlisted = similarSessions.reduce((sum, s) => sum + (s.Waitlisted || 0), 0);
        const totalComplimentary = similarSessions.reduce((sum, s) => sum + (s.Complimentary || 0), 0);
        const totalMemberships = similarSessions.reduce((sum, s) => sum + (s.Memberships || 0), 0);
        const totalPackages = similarSessions.reduce((sum, s) => sum + (s.Packages || 0), 0);
        const totalIntroOffers = similarSessions.reduce((sum, s) => sum + (s.IntroOffers || 0), 0);
        const totalSingleClasses = similarSessions.reduce((sum, s) => sum + (s.SingleClasses || 0), 0);
        const totalRevenue = similarSessions.reduce((sum, s) => sum + (s.Revenue || 0), 0);
        
        // Skip classes with no historical data
        if (sessionCount === 0 || totalCheckIns === 0) return;
        
        const avgCheckIns = sessionCount > 0 ? totalCheckIns / sessionCount : 0;
        const avgBooked = sessionCount > 0 ? totalBooked / sessionCount : 0;
        const avgLateCancelled = sessionCount > 0 ? totalLateCancelled / sessionCount : 0;
        const avgWaitlisted = sessionCount > 0 ? totalWaitlisted / sessionCount : 0;
        const avgComplimentary = sessionCount > 0 ? totalComplimentary / sessionCount : 0;
        const avgMemberships = sessionCount > 0 ? totalMemberships / sessionCount : 0;
        const avgPackages = sessionCount > 0 ? totalPackages / sessionCount : 0;
        const avgIntroOffers = sessionCount > 0 ? totalIntroOffers / sessionCount : 0;
        const avgSingleClasses = sessionCount > 0 ? totalSingleClasses / sessionCount : 0;
        
        const fillRate = totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0;
        const cancellationRate = totalBooked > 0 ? (totalLateCancelled / totalBooked) * 100 : 0;
        const waitlistRate = sessionCount > 0 && totalCapacity > 0 ? (totalWaitlisted / totalCapacity) * 100 : 0;
        const complimentaryRate = totalCheckIns > 0 ? (totalComplimentary / totalCheckIns) * 100 : 0;
        const bookingToCheckInRate = totalBooked > 0 ? (totalCheckIns / totalBooked) * 100 : 90;
        const revenuePerCheckIn = totalCheckIns > 0 ? totalRevenue / totalCheckIns : 2500;
        
        const fillRates = similarSessions.map(s => s.Capacity > 0 ? (s.CheckedIn / s.Capacity) * 100 : 0);
        const avgFillRate = fillRates.length > 0 ? fillRates.reduce((sum, fr) => sum + fr, 0) / fillRates.length : 0;
        const variance = fillRates.length > 0 ? fillRates.reduce((sum, fr) => sum + Math.pow(fr - avgFillRate, 2), 0) / fillRates.length : 0;
        const stdDev = Math.sqrt(variance);
        const consistency = 100 - Math.min(stdDev, 100);
        
        const trainerStats = new Map<string, { sessions: number; checkIns: number; revenue: number; capacity: number }>();
        similarSessions.forEach(s => {
          if (!s.Trainer) return;
          const stats = trainerStats.get(s.Trainer) || { sessions: 0, checkIns: 0, revenue: 0, capacity: 0 };
          stats.sessions++;
          stats.checkIns += s.CheckedIn || 0;
          stats.revenue += s.Revenue || 0;
          stats.capacity += s.Capacity || 0;
          trainerStats.set(s.Trainer, stats);
        });
        
        const topTrainers = Array.from(trainerStats.entries())
          .map(([name, stats]) => {
            const avgFill = stats.capacity > 0 ? (stats.checkIns / stats.capacity) * 100 : 0;
            const classAvg = stats.sessions > 0 ? stats.checkIns / stats.sessions : 0;
            const score = (classAvg * 0.6) + (avgFill * 0.3) + (stats.sessions * 0.1);
            return {
              name,
              sessions: stats.sessions,
              totalCheckIns: stats.checkIns,
              avgFill,
              classAvg,
              avgRevenue: stats.sessions > 0 ? stats.revenue / stats.sessions : 0,
              score
            };
          })
          .sort((a, b) => b.classAvg - a.classAvg)
          .slice(0, 3);
        
        const revenue = avgCheckIns * 2500;

        uniqueClasses.set(key, {
          id: `hist-${session.Day}-${session.Time}-${session.Class}-${index}`,
          day: session.Day,
          time: session.Time,
          class: session.Class,
          trainer: session.Trainer || 'TBD',
          location: session.Location,
          capacity: session.Capacity || 25,
          avgCheckIns: Math.round(avgCheckIns * 10) / 10,
          fillRate: Math.round(fillRate),
          totalRevenue: Math.round(totalRevenue),
          avgBooked: Math.round(avgBooked * 10) / 10,
          avgLateCancelled: Math.round(avgLateCancelled * 10) / 10,
          cancellationRate: Math.round(cancellationRate * 10) / 10,
          avgWaitlisted: Math.round(avgWaitlisted * 10) / 10,
          waitlistRate: Math.round(waitlistRate * 10) / 10,
          avgComplimentary: Math.round(avgComplimentary * 10) / 10,
          complimentaryRate: Math.round(complimentaryRate * 10) / 10,
          avgMemberships: Math.round(avgMemberships * 10) / 10,
          avgPackages: Math.round(avgPackages * 10) / 10,
          avgIntroOffers: Math.round(avgIntroOffers * 10) / 10,
          avgSingleClasses: Math.round(avgSingleClasses * 10) / 10,
          revenuePerCheckIn: Math.round(revenuePerCheckIn),
          bookingToCheckInRate: Math.round(bookingToCheckInRate * 10) / 10,
          consistency: Math.round(consistency * 10) / 10,
          topTrainers,
          sessionCount,
          revenue: Math.round(revenue),
          status: 'Historical',
          conflicts: [],
          recommendations: fillRate < 50 ? ['Consider discontinuing or improving marketing'] : 
                           fillRate > 85 ? ['Consider adding more sessions'] : []
        });
      }
    });
    
      // Add historical classes to the main array only when showing historical data
      classes.push(...Array.from(uniqueClasses.values()));
    }

    // Cache the results
    cachedScheduleClasses = classes;
    cacheTimestamp = Date.now();

    return classes;
  }, [activeClassesData, rawData, filters.dateFrom, filters.dateTo, filters.activeOnly]);

  // Revenue formatter utility (K/L/Cr with 1 decimal)
  const formatRevenue = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  // Advanced analytics and insights
  const trainerAnalytics = useMemo(() => {
    const analytics: Record<string, {
      totalClasses: number;
      totalHours: number;
      avgFillRate: number;
      totalRevenue: number;
      locations: string[];
      classTypes: string[];
      peakTimes: string[];
      workload: 'Light' | 'Medium' | 'Heavy' | 'Overloaded';
    }> = {};

    scheduleClasses.forEach(cls => {
      if (!analytics[cls.trainer]) {
        analytics[cls.trainer] = {
          totalClasses: 0,
          totalHours: 0,
          avgFillRate: 0,
          totalRevenue: 0,
          locations: [],
          classTypes: [],
          peakTimes: [],
          workload: 'Light'
        };
      }

      const trainer = analytics[cls.trainer];
      trainer.totalClasses += 1;
      trainer.totalHours += 1; // Assuming 1 hour per class
      trainer.totalRevenue += cls.revenue;
      
      if (!trainer.locations.includes(cls.location)) {
        trainer.locations.push(cls.location);
      }
      if (!trainer.classTypes.includes(cls.class)) {
        trainer.classTypes.push(cls.class);
      }
      if (!trainer.peakTimes.includes(cls.time)) {
        trainer.peakTimes.push(cls.time);
      }
    });

    // Calculate averages and workload
    Object.keys(analytics).forEach(trainerName => {
      const trainer = analytics[trainerName];
      trainer.avgFillRate = scheduleClasses
        .filter(cls => cls.trainer === trainerName)
        .reduce((sum, cls) => sum + cls.fillRate, 0) / trainer.totalClasses;
      
      // Determine workload based on hours per week
      if (trainer.totalHours >= 25) trainer.workload = 'Overloaded';
      else if (trainer.totalHours >= 20) trainer.workload = 'Heavy';
      else if (trainer.totalHours >= 15) trainer.workload = 'Medium';
      else trainer.workload = 'Light';
    });

    return analytics;
  }, [scheduleClasses]);

  // Apply Pro Scheduler filters independently (do not use global filters)
  const filteredClasses = useMemo(() => {
    return scheduleClasses.filter(cls => {
      // Location filter
      if (filters.locations.length > 0 && !filters.locations.includes(cls.location)) return false;
      // Trainer filter
      if (filters.trainers.length > 0 && !filters.trainers.includes(cls.trainer)) return false;
      // Class filter
      if (filters.classes.length > 0 && !filters.classes.includes(cls.class)) return false;
      // Active only filter
      if (filters.activeOnly && cls.status !== 'Active') return false;
      return true;
    });
  }, [scheduleClasses, filters]);

  // Get unique values for dropdowns
  const uniqueTrainers = useMemo(() => {
    const trainers = rawData.map(session => session.Trainer).filter(Boolean);
    return Array.from(new Set(trainers)).sort();
  }, [rawData]);

  const uniqueLocations = useMemo(() => {
    const locations = rawData.map(session => session.Location).filter(Boolean);
    return Array.from(new Set(locations)).sort();
  }, [rawData]);

  const uniqueClasses = useMemo(() => {
    const classes = rawData.map(session => session.Class).filter(Boolean);
    return Array.from(new Set(classes)).sort();
  }, [rawData]);

  const popularTimeSlots = useMemo(() => {
    const timeCount: Record<string, number> = {};
    rawData.forEach(session => {
      if (session.Time) {
        timeCount[session.Time] = (timeCount[session.Time] || 0) + (session.CheckedIn || 0);
      }
    });
    return Object.entries(timeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([time]) => time);
  }, [rawData]);

  // Create schedule grid
  const scheduleGrid = useMemo(() => {
    const grid: Record<string, Record<string, ScheduleClass[]>> = {};
    
    filteredClasses.forEach(cls => {
      if (!grid[cls.day]) {
        grid[cls.day] = {};
      }
      if (!grid[cls.day][cls.time]) {
        grid[cls.day][cls.time] = [];
      }
      grid[cls.day][cls.time].push(cls);
    });
    
    return grid;
  }, [filteredClasses]);

  // Time slots and days
  const DAYS_OF_WEEK = [
    { key: 'Monday', short: 'Mon', full: 'Monday' },
    { key: 'Tuesday', short: 'Tue', full: 'Tuesday' },
    { key: 'Wednesday', short: 'Wed', full: 'Wednesday' },
    { key: 'Thursday', short: 'Thu', full: 'Thursday' },
    { key: 'Friday', short: 'Fri', full: 'Friday' },
    { key: 'Saturday', short: 'Sat', full: 'Saturday' },
    { key: 'Sunday', short: 'Sun', full: 'Sunday' }
  ];

  const TIME_SLOTS = Array.from({ length: 56 }, (_, i) => {
    const hour = Math.floor(i / 4) + 6;
    const minute = (i % 4) * 15;
    const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const time12 = format(new Date(2023, 0, 1, hour, minute), 'h:mm a');
    return { time24, time12 };
  });

  // Event handlers
  const handleClassClick = (cls: ScheduleClass) => {
    setSelectedClass(cls);
    setShowDrilldown(true);
  };

  // Handle ESC key for drilldown modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDrilldown) {
        setShowDrilldown(false);
        setSelectedClass(null);
      }
    };

    if (showDrilldown) {
      document.addEventListener('keydown', handleEscape);
      // Focus the modal for keyboard events
      drilldownModalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showDrilldown]);

  // Get all historical sessions for the selected class (with date filter applied)
  const getClassSessions = (cls: ScheduleClass): SessionData[] => {
    if (!cls) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return rawData.filter((session: SessionData) => {
      const sessionDate = parseISO(session.Date);
      
      // Only include past sessions within the date filter range
      if (sessionDate >= today) return false;
      const inDateRange = isWithinInterval(sessionDate, { start: filters.dateFrom, end: filters.dateTo });
      if (!inDateRange) return false;
      
      const matchesDay = session.Day === cls.day;
      const matchesTime = session.Time?.startsWith(cls.time);
      const matchesClass = session.Class?.toLowerCase() === cls.class.toLowerCase();
      const matchesLocation = session.Location?.toLowerCase() === cls.location.toLowerCase();
      
      return matchesDay && matchesTime && matchesClass && matchesLocation;
    }).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
  };

  // Render class card with enhanced styling
  const renderClassCard = (cls: ScheduleClass) => {
    const fillRateColor = cls.fillRate >= 80 
      ? 'from-green-500 to-emerald-500' 
      : cls.fillRate >= 60 
      ? 'from-yellow-500 to-amber-500' 
      : 'from-red-500 to-rose-500';

    // Format-specific subtle colors
    const formatColors: Record<string, string> = {
      'Yoga': 'from-purple-50/80 to-purple-100/80 border-purple-200',
      'Pilates': 'from-pink-50/80 to-pink-100/80 border-pink-200',
      'Spin': 'from-orange-50/80 to-orange-100/80 border-orange-200',
      'HIIT': 'from-red-50/80 to-red-100/80 border-red-200',
      'Strength': 'from-blue-50/80 to-blue-100/80 border-blue-200',
      'Boxing': 'from-gray-50/80 to-gray-100/80 border-gray-200',
      'Dance': 'from-fuchsia-50/80 to-fuchsia-100/80 border-fuchsia-200',
      'Barre': 'from-rose-50/80 to-rose-100/80 border-rose-200',
      'Cardio': 'from-amber-50/80 to-amber-100/80 border-amber-200',
      'Functional': 'from-teal-50/80 to-teal-100/80 border-teal-200'
    };

    // Find matching format color
    const getFormatColor = () => {
      for (const [format, color] of Object.entries(formatColors)) {
        if (cls.class.toLowerCase().includes(format.toLowerCase())) {
          return color;
        }
      }
      return 'from-slate-50/80 to-blue-50/80 border-slate-200'; // Default
    };

    const cardColor = getFormatColor();
    
    const hasConflicts = cls.conflicts.length > 0;
    const isHighPerformance = cls.fillRate > 85;
    const isHovered = hoveredClassId === cls.id;

    return (
      <motion.div
        key={cls.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02, y: -2 }}
        onClick={() => handleClassClick(cls)}
        onMouseEnter={() => setHoveredClassId(cls.id)}
        onMouseLeave={() => setHoveredClassId(null)}
        className={`bg-gradient-to-br ${cardColor} backdrop-blur-sm border rounded-xl shadow-sm hover:shadow-lg cursor-pointer transition-all duration-300 overflow-hidden group`}
      >
        {/* Collapsed View - Beautiful & Clean with Key Metrics */}
        <div className="p-2.5">
          {/* Header with Class Name and Icons */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="font-bold text-sm text-slate-900 truncate flex-1 mr-2">
              {cls.class}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {hasConflicts && (
                <div className="bg-red-500 text-white rounded-full p-0.5" title="Conflicts">
                  <AlertTriangle className="w-2.5 h-2.5" />
                </div>
              )}
              {isHighPerformance && (
                <div className="bg-emerald-500 text-white rounded-full p-0.5" title="High performance">
                  <Star className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
          </div>

          {/* Trainer Name */}
          <div className="flex items-center gap-2 text-[10px] text-slate-600 mb-2">
            {findTrainerImage(cls.trainer) ? (
              // eslint-disable-next-line jsx-a11y/img-redundant-alt
              <img src={findTrainerImage(cls.trainer) as string} alt={`${cls.trainer} avatar`} className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <Users className="w-2.5 h-2.5" />
            )}
            <span className="truncate">{cls.trainer}</span>
          </div>

          {/* Metrics - Compact Display */}
          <div className="flex items-center justify-between gap-3">
            {/* Fill Rate */}
            <div className="flex items-center gap-1.5 flex-1">
              <div className={`text-sm font-bold ${
                cls.fillRate >= 80 ? 'text-green-600' : 
                cls.fillRate >= 60 ? 'text-amber-600' : 
                'text-red-600'
              }`}>
                {cls.fillRate}%
              </div>
              <div className="flex-1 max-w-[50px]">
                <div className="bg-slate-200 rounded-full h-1">
                  <div 
                    className={`bg-gradient-to-r ${fillRateColor} h-1 rounded-full transition-all`}
                    style={{ width: `${Math.min(cls.fillRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Average Attendance */}
            <div className="text-right">
              <div className="text-sm font-bold text-emerald-600">
                {cls.avgCheckIns}
              </div>
              <div className="text-[9px] text-slate-500">
                avg
              </div>
            </div>
          </div>
        </div>

        {/* Expanded View on Hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-white/50 bg-white/80 backdrop-blur-sm"
            >
              <div className="p-3 space-y-2">
                {/* Trainer & Location */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <div className="bg-blue-100 rounded-full p-1">
                      {findTrainerImage(cls.trainer) ? (
                        // eslint-disable-next-line jsx-a11y/img-redundant-alt
                        <img src={findTrainerImage(cls.trainer) as string} alt={`${cls.trainer} avatar`} className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <Users className="w-2.5 h-2.5 text-blue-600" />
                      )}
                    </div>
                    <span className="font-medium truncate">{cls.trainer}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <div className="bg-purple-100 rounded-full p-1">
                      <MapPin className="w-2.5 h-2.5 text-purple-600" />
                    </div>
                    <span className="font-medium truncate">{cls.location}</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-white/70 rounded-lg p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-gray-600">Fill Rate</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 bg-gray-200 rounded-full h-1">
                        <div 
                          className={`bg-gradient-to-r ${fillRateColor} h-1 rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(cls.fillRate, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-800">{cls.fillRate}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium text-gray-600">Attendance</span>
                    <span className="font-bold text-gray-800">{cls.avgCheckIns}/{cls.capacity}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium text-gray-600">Revenue</span>
                    <span className="font-bold text-emerald-600">₹{(cls.revenue/100).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Hover Hint */}
                <div className="text-center pt-1 border-t border-gray-200">
                  <div className="text-[9px] text-blue-600 font-medium flex items-center justify-center gap-1">
                    <Eye className="w-2.5 h-2.5" />
                    Click for detailed analytics
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pro Scheduler</h1>
            <p className="text-gray-600">
              Advanced scheduling optimization and analytics platform
              {Object.keys(activeClassesData).length === 0 && rawData.length > 0 && (
                <span className="text-amber-600"> - Loading active classes...</span>
              )}
              {Object.keys(activeClassesData).length === 0 && rawData.length === 0 && (
                <span className="text-red-600"> - No data loaded</span>
              )}
            </p>
            {/* Manual reload button if active classes not loaded */}
            {Object.keys(activeClassesData).length === 0 && (
              <button
                onClick={() => {
                  import('../utils/activeClassesLoader').then(({ loadActiveClasses }) => {
                    loadActiveClasses().then((activeClasses) => {
                      import('../store/dashboardStore').then(({ useDashboardStore }) => {
                        useDashboardStore.setState({ activeClassesData: activeClasses });
                      });
                    }).catch(error => {
                      console.error('Manual reload failed:', error);
                    });
                  });
                }}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Load Active Classes
              </button>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Classes</div>
            <div className="text-2xl font-bold text-blue-600">
              {scheduleClasses.length}
              {Object.keys(activeClassesData).length > 0 && (
                <span className="text-xs text-green-600 block">From Active.csv</span>
              )}
              {Object.keys(activeClassesData).length === 0 && scheduleClasses.length > 0 && (
                <span className="text-xs text-orange-600 block">From Historical Data</span>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* Advanced Control Panel */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <button
          onClick={() => setViewMode('calendar')}
          className={`p-3 rounded-xl border transition-all ${viewMode === 'calendar' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}
        >
          <Calendar className="w-4 h-4 mx-auto mb-1" />
          <div className="text-xs font-medium">Calendar</div>
        </button>
        <button
          onClick={() => setViewMode('analytics')}
          className={`p-3 rounded-xl border transition-all ${viewMode === 'analytics' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}
        >
          <TrendingUp className="w-4 h-4 mx-auto mb-1" />
          <div className="text-xs font-medium">Analytics</div>
        </button>
        <button
          onClick={() => setShowTrainerAnalytics(!showTrainerAnalytics)}
          className={`p-3 rounded-xl border transition-all ${showTrainerAnalytics ? 'bg-green-500 text-white border-green-500' : 'bg-white border-gray-200 hover:border-green-300'}`}
        >
          <Users className="w-4 h-4 mx-auto mb-1" />
          <div className="text-xs font-medium">Trainers</div>
        </button>
        <button
          onClick={() => setShowConflictResolver(!showConflictResolver)}
          className={`p-3 rounded-xl border transition-all ${showConflictResolver ? 'bg-red-500 text-white border-red-500' : 'bg-white border-gray-200 hover:border-red-300'}`}
        >
          <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
          <div className="text-xs font-medium">Conflicts</div>
        </button>
        <button
          onClick={() => setShowOptimizationPanel(!showOptimizationPanel)}
          className={`p-3 rounded-xl border transition-all ${showOptimizationPanel ? 'bg-purple-500 text-white border-purple-500' : 'bg-white border-gray-200 hover:border-purple-300'}`}
        >
          <Star className="w-4 h-4 mx-auto mb-1" />
          <div className="text-xs font-medium">Optimize</div>
        </button>
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`p-3 rounded-xl border transition-all ${showAdvancedFilters ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-gray-200 hover:border-amber-300'}`}
        >
          <Edit3 className="w-4 h-4 mx-auto mb-1" />
          <div className="text-xs font-medium">Filters</div>
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Advanced Filters</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">From</label>
                    <input
                      type="date"
                      value={filters.dateFrom.toISOString().split('T')[0]}
                      onChange={(e) => setFilters({ ...filters, dateFrom: new Date(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">To</label>
                    <input
                      type="date"
                      value={filters.dateTo.toISOString().split('T')[0]}
                      onChange={(e) => setFilters({ ...filters, dateTo: new Date(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Locations</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uniqueLocations.map(location => (
                    <label key={location} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.locations.includes(location)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({ ...filters, locations: [...filters.locations, location] });
                          } else {
                            setFilters({ ...filters, locations: filters.locations.filter(l => l !== location) });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{location}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Trainer Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trainers</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uniqueTrainers.map(trainer => (
                    <label key={trainer} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.trainers.includes(trainer)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({ ...filters, trainers: [...filters.trainers, trainer] });
                          } else {
                            setFilters({ ...filters, trainers: filters.trainers.filter(t => t !== trainer) });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{trainer}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Classes</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uniqueClasses.map(className => (
                    <label key={className} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.classes.includes(className)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({ ...filters, classes: [...filters.classes, className] });
                          } else {
                            setFilters({ ...filters, classes: filters.classes.filter(c => c !== className) });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{className}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Type Filter - NEW */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class Types</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(() => {
                    const uniqueTypes = Array.from(new Set(rawData.map((s: SessionData) => s.Type).filter(Boolean))).sort();
                    return uniqueTypes.map(type => (
                      <label key={type} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.classes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({ ...filters, classes: [...filters.classes, type] });
                            } else {
                              setFilters({ ...filters, classes: filters.classes.filter(c => c !== type) });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{type}</span>
                      </label>
                    ));
                  })()}
                </div>
              </div>

              {/* Period Filter - NEW */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const today = new Date();
                      setFilters({ ...filters, dateFrom: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), dateTo: today });
                    }}
                    className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-left transition-colors"
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      setFilters({ ...filters, dateFrom: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), dateTo: today });
                    }}
                    className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-left transition-colors"
                  >
                    Last 30 Days
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      setFilters({ ...filters, dateFrom: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000), dateTo: today });
                    }}
                    className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-left transition-colors"
                  >
                    Last 90 Days
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      setFilters({ ...filters, dateFrom: today, dateTo: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) });
                    }}
                    className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-left transition-colors"
                  >
                    Next 30 Days
                  </button>
                </div>
              </div>
            </div>

            {/* Active Only Toggle */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.activeOnly}
                  onChange={(e) => setFilters({ ...filters, activeOnly: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Active Classes Only</div>
                  <div className="text-sm text-gray-600">Show only classes from Active.csv schedule</div>
                </div>
              </label>
            </div>

            {/* Clear Filters Button */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setFilters({
                  dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  dateTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                  locations: [],
                  trainers: [],
                  classes: [],
                  activeOnly: true
                })}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Clear All Filters
              </button>
              <div className="text-sm text-gray-600 flex items-center">
                Showing {filteredClasses.length} of {scheduleClasses.length} classes
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trainer Analytics Panel */}
      {showTrainerAnalytics && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Trainer Analytics</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Object.entries(trainerAnalytics).map(([trainerName, analytics]) => {
                const workloadColors = {
                  Light: 'bg-green-100 text-green-800',
                  Medium: 'bg-yellow-100 text-yellow-800',
                  Heavy: 'bg-orange-100 text-orange-800',
                  Overloaded: 'bg-red-100 text-red-800'
                };
                return (
                  <div key={trainerName} className="bg-gray-50 rounded-xl p-4 border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const img = findTrainerImage(trainerName);
                            const pct = Math.min((analytics.totalHours / 15) * 100, 100);
                            const color = getWorkloadColor(analytics.totalHours);
                            return (
                              <div className="flex items-center gap-3">
                                <div className="self-start -mt-1">
                                  <CircularAvatar percent={pct} color={color} size={48} stroke={4} imgSrc={img} initials={trainerName.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()} />
                                </div>
                                <div className="font-semibold text-gray-900">{trainerName}</div>
                              </div>
                            );
                          })()}
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${workloadColors[analytics.workload]}`}>
                          {analytics.workload}
                        </span>
                      </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Classes:</span>
                        <span className="font-medium">{analytics.totalClasses}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hours/Week:</span>
                        <span className="font-medium">{analytics.totalHours}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Fill:</span>
                        <span className="font-medium">{Math.round(analytics.avgFillRate)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Revenue:</span>
                        <span className="font-medium text-green-600">₹{Math.round(analytics.totalRevenue/100).toLocaleString()}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="text-xs text-gray-500 mb-1">Locations: {analytics.locations.length}</div>
                        <div className="text-xs text-gray-500">Class Types: {analytics.classTypes.length}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Trainer Hours Overview - Modern Professional Design */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-white/80">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Trainer Workload Overview
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {(() => {
                  const trainerHours = new Map<string, { classes: number; hours: number }>();
                  filteredClasses.forEach(cls => {
                    if (!trainerHours.has(cls.trainer)) {
                      trainerHours.set(cls.trainer, { classes: 0, hours: 0 });
                    }
                    const data = trainerHours.get(cls.trainer)!;
                    data.classes += 1;
                    data.hours += 1;
                  });
                  return trainerHours.size;
                })()} Trainers
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {(() => {
                const trainerHours = new Map<string, { classes: number; hours: number }>();
                filteredClasses.forEach(cls => {
                  if (!trainerHours.has(cls.trainer)) {
                    trainerHours.set(cls.trainer, { classes: 0, hours: 0 });
                  }
                  const data = trainerHours.get(cls.trainer)!;
                  data.classes += 1;
                  data.hours += 1;
                });
                
                
                
                return Array.from(trainerHours.entries())
                  .sort((a, b) => b[1].hours - a[1].hours)
                  .map(([trainer, data], idx) => {
                    
                    
                    const isSelected = filters.trainers.includes(trainer);
                    
                    // Generate initials for avatar
                    const initials = trainer.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    
                    return (
                      <motion.div
                        key={trainer}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.25 }}
                        onClick={() => {
                          if (isSelected) {
                            setFilters({ ...filters, trainers: filters.trainers.filter(t => t !== trainer) });
                          } else {
                            setFilters({ ...filters, trainers: [...filters.trainers, trainer] });
                          }
                        }}
                        className={`group relative bg-white rounded-lg p-2 hover:shadow-md transition-all cursor-pointer border ${isSelected ? 'ring-2 ring-blue-200' : 'hover:shadow-lg'}`}
                        style={{ minWidth: 140 }}
                      >
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow z-20">
                            <span className="text-[10px] font-bold">✓</span>
                          </div>
                        )}

                        <div className="flex flex-col items-center text-center gap-1">
                          {/* Circular ring that fills to show % of 15h target */}
                          <div className="relative">
                            {(() => {
                              const pctOfTarget = Math.min((data.hours / 15) * 100, 100);
                              const color = getWorkloadColor(data.hours);
                              const imgSrc = findTrainerImage(trainer);

                              return (
                                <div className="self-start -mt-1">
                                  <CircularAvatar percent={pctOfTarget} color={color} size={56} stroke={4} imgSrc={imgSrc} initials={initials} />
                                </div>
                              );
                            })()}
                          </div>

                          <div className="text-[12px] font-semibold text-slate-800 truncate w-full" title={trainer}>{trainer}</div>

                          <div className="text-[11px] text-slate-500">
                            <span className={`font-bold mr-1 ${data.hours > 15 ? 'text-red-600' : data.hours >= 12 ? 'text-yellow-600' : 'text-green-600'}`}>{data.hours}</span>
                            <span className="text-xs text-slate-400">hrs</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{data.classes} classes</div>
                        </div>
                      </motion.div>
                    );
                  });
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid with View Mode Selector */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Weekly Schedule</h2>
            
            {/* Calendar View Mode Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 mr-2">View:</span>
              <button
                onClick={() => setCalendarViewMode('standard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  calendarViewMode === 'standard' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                }`}
                title="Standard grid view"
              >
                Standard
              </button>
              <button
                onClick={() => setCalendarViewMode('multi-location')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  calendarViewMode === 'multi-location' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                }`}
                title="View multiple locations side by side"
              >
                Multi-Location
              </button>
              <button
                onClick={() => setCalendarViewMode('horizontal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  calendarViewMode === 'horizontal' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                }`}
                title="Horizontal timeline view"
              >
                Horizontal
              </button>
              <button
                onClick={() => setCalendarViewMode('analytical')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  calendarViewMode === 'analytical' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                }`}
                title="View with analytics overlay"
              >
                Analytical
              </button>
              <button
                onClick={() => setCalendarViewMode('compact')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  calendarViewMode === 'compact' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                }`}
                title="Compact list view"
              >
                Compact
              </button>
              <button
                onClick={() => setCalendarViewMode('timeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  calendarViewMode === 'timeline' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                }`}
                title="Timeline view with continuous schedule"
              >
                Timeline
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Standard Grid View */}
          {calendarViewMode === 'standard' && (
            <div>
              {/* Timeline with collapsible hours */}
              <div className="mb-4 flex items-center gap-2 text-xs">
                <span className="text-slate-600 font-medium">Timeline:</span>
                <button
                  onClick={() => setShowNonFunctionalHours(!showNonFunctionalHours)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                >
                  {showNonFunctionalHours ? 'Hide' : 'Show'} Non-Peak Hours
                </button>
              </div>
              
              <div className="grid grid-cols-8 gap-4">
              {/* Time column header */}
              <div className="font-medium text-slate-700 text-sm">Time</div>
              
              {/* Day headers with class count */}
              {DAYS_OF_WEEK.map(day => {
                const dayClasses = filteredClasses.filter(cls => cls.day === day.key);
                return (
                  <motion.div 
                    key={day.key} 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-medium text-slate-800 text-sm text-center bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg p-2 border border-slate-200"
                  >
                    <div>{day.short}</div>
                    <div className="text-xs text-blue-600 font-bold mt-1">{dayClasses.length}</div>
                  </motion.div>
                );
              })}

              {/* Time slots and classes */}
              {TIME_SLOTS.map(slot => {
                const slotHour = parseInt(slot.time24.split(':')[0]);
                const isNonFunctional = slotHour < 7 || slotHour > 20;
                if (!showNonFunctionalHours && isNonFunctional) return null;
                
                const slotClasses = filteredClasses.filter(cls => cls.time === slot.time24);
                
                return (
                  <Fragment key={slot.time24}>
                  {/* Time label with class count */}
                  <div className="text-xs text-slate-600 py-2 font-medium flex items-center gap-2">
                    <span>{slot.time12}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                      {slotClasses.length}
                    </span>
                  </div>
                  
                  {/* Classes for each day */}
                  {DAYS_OF_WEEK.map(day => (
                    <div key={`${day.key}-${slot.time24}`} className="min-h-[80px] relative">
                      {scheduleGrid[day.key]?.[slot.time24]?.map(cls => renderClassCard(cls))}
                      
                      {/* Empty slot - add class button */}
                      {(!scheduleGrid[day.key]?.[slot.time24] || scheduleGrid[day.key][slot.time24].length === 0) && (
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          onClick={() => {
                            setSelectedTimeSlot({ day: day.key, time: slot.time24 });
                            setShowAddModal(true);
                          }}
                          className="h-full border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center opacity-50 hover:opacity-100 cursor-pointer group transition-all duration-200 hover:bg-gradient-to-br hover:from-blue-50 hover:to-slate-50 hover:border-blue-300"
                        >
                          <div className="text-center">
                            <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-500 mx-auto mb-1" />
                            <span className="text-[10px] text-slate-400 group-hover:text-blue-600 font-medium">Add</span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </Fragment>
              );
            })}
            </div>
            </div>
          )}

          {/* Multi-Location View - Day-based columns with location sub-columns */}
          {calendarViewMode === 'multi-location' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-slate-100 to-blue-100 px-6 py-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Multi-Location View - Day-Based Grid
                  <span className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full font-bold">
                    {uniqueLocations.filter(location => filteredClasses.filter(cls => cls.location === location).length > 0).length} locations
                  </span>
                </h3>
              </div>

              {/* Sticky Header Row - Days with Location Sub-columns */}
              <div className="sticky top-0 z-20 bg-gradient-to-r from-gray-100 to-gray-200 shadow-sm border-b-2 border-gray-300">
                <div className="flex">
                  <div className="flex-shrink-0 w-24 border-r-2 border-gray-300 p-3 flex items-center justify-center bg-gray-100">
                    <span className="text-sm font-bold text-gray-700">Time</span>
                  </div>
                  {DAYS_OF_WEEK.map((day) => {
                    const dayClasses = filteredClasses.filter(cls => cls.day === day.key);
                    const activeLocations = uniqueLocations.filter(location => 
                      dayClasses.some(cls => cls.location === location)
                    );
                    
                    if (activeLocations.length === 0) return null;
                    
                    return (
                      <div key={day.key} className="flex-1 min-w-[280px] border-r-2 border-gray-300 last:border-r-0">
                        {/* Day Header */}
                        <div className="bg-gradient-to-br from-blue-100 to-indigo-100 border-b border-gray-300 p-2 text-center">
                          <div className="font-bold text-gray-900 text-sm">{day.short}</div>
                          <div className="text-xs text-gray-600 mt-0.5">{dayClasses.length} classes</div>
                        </div>
                        {/* Location Sub-headers */}
                        <div className="flex">
                          {activeLocations.map((location, idx) => {
                            const locationDayClasses = dayClasses.filter(cls => cls.location === location);
                            return (
                              <div 
                                key={`${day.key}-${location}`} 
                                className={`flex-1 min-w-[130px] p-2 text-center bg-white border-r border-gray-200 ${idx === activeLocations.length - 1 ? 'border-r-0' : ''}`}
                              >
                                <div className="text-xs font-semibold text-gray-700 truncate flex items-center justify-center gap-1" title={location}>
                                  <MapPin className="w-2.5 h-2.5 text-blue-500" />
                                  <span>{location.split(' ')[0]}</span>
                                </div>
                                <div className="text-[10px] text-gray-500">{locationDayClasses.length}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable Time Slots Container */}
              <div className="overflow-auto max-h-[70vh] bg-white">
                {TIME_SLOTS.map((slot) => {
                  const slotHour = parseInt(slot.time24.split(':')[0]);
                  const isNonFunctional = slotHour < 7 || slotHour > 20;
                  if (!showNonFunctionalHours && isNonFunctional) return null;

                  const slotClasses = filteredClasses.filter(cls => cls.time === slot.time24);
                  const hasClassesAtThisTime = slotClasses.length > 0;

                  return (
                    <div key={slot.time24} className={`flex border-b border-gray-100 ${hasClassesAtThisTime ? 'bg-white' : 'bg-gray-25'}`}>
                      {/* Time Label */}
                      <div className={`flex-shrink-0 w-24 border-r-2 border-gray-200 p-2 flex items-center justify-center ${hasClassesAtThisTime ? 'bg-gradient-to-r from-blue-50 to-blue-100' : 'bg-gray-50'}`}>
                        <div className="text-xs font-bold text-gray-700 text-center">
                          {slot.time12}
                          {slotClasses.length > 0 && (
                            <div className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold mt-1">
                              {slotClasses.length}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Day Columns with Location Sub-columns */}
                      {DAYS_OF_WEEK.map((day) => {
                        const dayClasses = filteredClasses.filter(cls => cls.day === day.key);
                        const activeLocations = uniqueLocations.filter(location => 
                          dayClasses.some(cls => cls.location === location)
                        );
                        
                        if (activeLocations.length === 0) return null;
                        
                        return (
                          <div key={`${day.key}-${slot.time24}`} className="flex-1 min-w-[280px] border-r-2 border-gray-200 last:border-r-0">
                            <div className="flex h-full">
                              {activeLocations.map((location, idx) => {
                                // Get classes for this specific time, day, and location
                                const locationSlotClasses = scheduleGrid[day.key]?.[slot.time24]?.filter(cls => 
                                  cls.location === location
                                ) || [];

                                return (
                                  <div 
                                    key={`${day.key}-${location}-${slot.time24}`} 
                                    className={`flex-1 min-w-[130px] p-2 min-h-[90px] relative bg-white hover:bg-gray-50/50 transition-colors border-r border-gray-100 ${idx === activeLocations.length - 1 ? 'border-r-0' : ''} overflow-hidden`}
                                  >
                                    <div className="space-y-1">
                                      {locationSlotClasses.map((cls) => {
                                        const fillRate = cls.fillRate;
                                        const hasConflicts = cls.conflicts.length > 0;

                                        return (
                                          <motion.div
                                            key={cls.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            whileHover={{ scale: 1.05, zIndex: 20 }}
                                            onClick={() => handleClassClick(cls)}
                                            className={`w-full rounded-lg p-2 cursor-pointer transition-all relative border-l-4 ${
                                              hasConflicts
                                                ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-600 ring-2 ring-red-300 shadow-md'
                                                : cls.status === 'Active'
                                                  ? 'bg-gradient-to-br from-white via-blue-50 to-indigo-50 border-blue-500 shadow-sm hover:shadow-md'
                                                  : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-400 shadow-sm'
                                            }`}
                                          >
                                            {/* Status Badge */}
                                            {cls.status === 'Active' && (
                                              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                                                <span className="text-white text-[10px] font-bold">✓</span>
                                              </div>
                                            )}

                                            {/* Conflict indicator */}
                                            {hasConflicts && (
                                              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-sm" title="Has Conflicts!">
                                                <AlertTriangle className="w-3 h-3 text-white" />
                                              </div>
                                            )}

                                            {/* Class Name */}
                                            <div className={`text-xs font-bold mb-1 truncate ${hasConflicts ? 'text-red-800' : 'text-gray-900'}`} title={cls.class}>
                                              {cls.class.replace('Studio ', '')}
                                            </div>

                                            {/* Trainer */}
                                            <div className={`text-[10px] mb-1 flex items-center gap-0.5 truncate ${hasConflicts ? 'text-red-700' : 'text-gray-700'}`} title={cls.trainer}>
                                              <span className="font-medium">👤</span>
                                              <span className="truncate">{cls.trainer.split(' ')[0]}</span>
                                            </div>

                                            {/* Stats Row */}
                                            <div className="flex items-center justify-between gap-1">
                                              <div className={`flex items-center gap-1 text-[10px] ${hasConflicts ? 'text-red-700' : 'text-gray-700'}`}>
                                                <span className="font-semibold">{cls.avgCheckIns.toFixed(0)}/{cls.capacity}</span>
                                              </div>
                                              <span className={`text-[10px] px-1 py-0.5 rounded ${
                                                fillRate >= 80 ? 'bg-green-100 text-green-700' :
                                                fillRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                              }`}>
                                                {fillRate.toFixed(0)}%
                                              </span>
                                            </div>
                                          </motion.div>
                                        );
                                      })}
                                    </div>
                                  </div>
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

              {uniqueLocations.length === 0 && (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-gray-600 mb-2">No Locations Found</p>
                  <p className="text-gray-500">No class data available for multi-location view</p>
                </div>
              )}
            </div>
          )}

          {/* Horizontal Timeline View - All timeslots across week */}
          {calendarViewMode === 'horizontal' && (
            <div className="space-y-4">
              {TIME_SLOTS.map((slot, idx) => {
                const slotClasses = filteredClasses.filter(cls => cls.time === slot.time24);
                const slotHour = parseInt(slot.time24.split(':')[0]);
                const isNonFunctional = slotHour < 7 || slotHour > 20;
                if (!showNonFunctionalHours && isNonFunctional && slotClasses.length === 0) return null;
                
                return (
                  <motion.div 
                    key={slot.time24}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="relative"
                  >
                    {/* Timeline connector */}
                    <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 to-slate-200"></div>
                    
                    <div className="flex gap-4 items-start">
                      {/* Time marker */}
                      <div className="flex-shrink-0 w-20">
                        <div className="relative">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                            slotClasses.length > 0 
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg' 
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {slot.time12.split(' ')[0]}
                          </div>
                          {slotClasses.length > 0 && (
                            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                              {slotClasses.length}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Classes for this timeslot across all days */}
                      <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        {slotClasses.length > 0 ? (
                          <div>
                            <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-blue-600" />
                              {slot.time12} - {slotClasses.length} classes scheduled
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                              {DAYS_OF_WEEK.map(day => {
                                const daySlotClass = slotClasses.find(cls => cls.day === day.key);
                                return (
                                  <div key={day.key}>
                                    <div className="text-[10px] font-semibold text-slate-600 mb-1">{day.short}</div>
                                    {daySlotClass ? (
                                      renderClassCard(daySlotClass)
                                    ) : (
                                      <div className="border border-dashed border-slate-200 rounded-lg p-2 text-center text-[10px] text-slate-400">
                                        No class
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400 italic py-2 text-center">
                            No classes scheduled at this time
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Analytical View - Like Weekly Calendar with Metrics */}
          {calendarViewMode === 'analytical' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-slate-100 to-blue-100 px-6 py-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Analytical View - Performance Metrics
                </h3>
              </div>

              {/* Sticky Header Row */}
              <div className="sticky top-0 z-20 flex bg-gradient-to-r from-gray-100 to-gray-200 shadow-sm border-b border-gray-300">
                <div className="flex-shrink-0 w-24 border-r border-gray-200 p-3 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-700">Time</span>
                </div>
                {DAYS_OF_WEEK.map((day) => {
                  const dayClasses = filteredClasses.filter(cls => cls.day === day.key);
                  const avgFillRate = dayClasses.length > 0 
                    ? Math.round(dayClasses.reduce((sum, cls) => sum + cls.fillRate, 0) / dayClasses.length)
                    : 0;
                  const totalRevenue = dayClasses.reduce((sum, cls) => sum + cls.revenue, 0);
                  
                  return (
                    <div key={day.key} className="flex-1 min-w-[140px] border-r border-gray-200 last:border-r-0 p-3 text-center">
                      <div className="font-bold text-gray-800 text-sm">{day.short}</div>
                      <div className="text-xs text-gray-600 mt-1">{dayClasses.length} classes</div>
                      <div className="text-xs text-blue-600 font-bold mt-1">{avgFillRate}% fill</div>
                      <div className="text-xs text-emerald-600 font-semibold mt-1">{formatRevenue(totalRevenue)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Scrollable Time Slots Container */}
              <div className="overflow-y-auto max-h-[70vh] bg-white">
                {TIME_SLOTS.map((slot) => {
                  const slotHour = parseInt(slot.time24.split(':')[0]);
                  const isNonFunctional = slotHour < 7 || slotHour > 20;
                  if (!showNonFunctionalHours && isNonFunctional) return null;

                  const slotClasses = filteredClasses.filter(cls => cls.time === slot.time24);
                  const hasClassesAtThisTime = slotClasses.length > 0;

                  return (
                    <div key={slot.time24} className={`flex border-b border-gray-100 ${hasClassesAtThisTime ? 'bg-white' : 'bg-gray-25'}`}>
                      {/* Time Label */}
                      <div className={`flex-shrink-0 w-24 border-r-2 border-gray-200 p-2 flex items-center justify-center ${hasClassesAtThisTime ? 'bg-gradient-to-r from-blue-50 to-blue-100' : 'bg-gray-50'}`}>
                        <div className="text-xs font-bold text-gray-700 text-center">
                          {slot.time12}
                          {slotClasses.length > 0 && (
                            <div className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold mt-1">
                              {slotClasses.length}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Day Columns with Metrics */}
                      {DAYS_OF_WEEK.map((day) => {
                        const daySlotClasses = scheduleGrid[day.key]?.[slot.time24] || [];

                        return (
                          <div key={`${day.key}-${slot.time24}`} className="flex-1 min-w-[140px] border-r border-gray-200 last:border-r-0 p-2 min-h-[90px] relative bg-white hover:bg-gray-50/50 transition-colors">
                            {daySlotClasses.length > 0 ? (
                              <div className="space-y-2">
                                {daySlotClasses.map(cls => (
                                  <div key={cls.id}>
                                    {renderClassCard(cls)}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-[10px] text-slate-300">-</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compact List View */}
          {calendarViewMode === 'compact' && (
            <div className="space-y-2">
              {filteredClasses.map((cls, idx) => (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => handleClassClick(cls)}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 cursor-pointer transition-all shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-center bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                      <div className="text-xs text-slate-600 font-medium">{cls.day}</div>
                      <div className="font-bold text-slate-900">{cls.time}</div>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">{cls.class}</div>
                      <div className="text-sm text-slate-600">{cls.trainer} • {cls.location}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-xs text-slate-500">Fill Rate</div>
                        <div className={`font-bold text-lg ${cls.fillRate >= 80 ? 'text-green-600' : cls.fillRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          {cls.fillRate}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-500">Avg</div>
                        <div className="font-bold text-lg text-slate-900">{cls.avgCheckIns}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-500">Sessions</div>
                        <div className="font-bold text-lg text-blue-600">{cls.sessionCount}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Timeline View */}
          {calendarViewMode === 'timeline' && (
            <div className="relative">
              {TIME_SLOTS.map((slot, idx) => {
                const slotClasses = filteredClasses.filter(cls => cls.time === slot.time24);
                return (
                  <motion.div 
                    key={slot.time24} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="flex gap-4 mb-6 relative"
                  >
                    {/* Timeline */}
                    <div className="flex flex-col items-center">
                      <motion.div 
                        whileHover={{ scale: 1.1 }}
                        className={`w-4 h-4 rounded-full shadow-md ${slotClasses.length > 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600 ring-4 ring-blue-100' : 'bg-slate-300'}`}
                      ></motion.div>
                      {idx < TIME_SLOTS.length - 1 && (
                        <div className={`w-0.5 h-full ${slotClasses.length > 0 ? 'bg-gradient-to-b from-blue-300 to-slate-200' : 'bg-slate-200'}`}></div>
                      )}
                    </div>
                    {/* Time and Classes */}
                    <div className="flex-1 pb-4">
                      <div className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        {slot.time12}
                        {slotClasses.length > 0 && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-bold">
                            {slotClasses.length}
                          </span>
                        )}
                      </div>
                      {slotClasses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {slotClasses.map(cls => renderClassCard(cls))}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400 italic py-4 px-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                          No classes scheduled
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Drilldown Modal with Detailed Analytics */}
      {showDrilldown && selectedClass && (() => {
        const classSessions = getClassSessions(selectedClass);
        const hasHistoricalData = classSessions.length > 0;
        return (
          <motion.div
            key="drilldown-modal"
            ref={drilldownModalRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDrilldown(false);
                setSelectedClass(null);
              }
            }}
            tabIndex={0}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/70 glass-card rounded-3xl p-6 md:p-8 max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b px-2">
                <div>
                  <div className="flex items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedClass.class}</h2>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        {(() => {
                          const img = findTrainerImage(selectedClass.trainer);
                          return img ? (
                            // eslint-disable-next-line jsx-a11y/img-redundant-alt
                            <img src={img as string} alt={`${selectedClass.trainer} avatar`} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="text-sm font-medium">{selectedClass.trainer}</div>
                          );
                        })()}
                        <div className="text-sm text-slate-500">{selectedClass.trainer}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {selectedClass.day} at {selectedClass.time}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedClass.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedClass.status}
                    </span>
                    {hasHistoricalData && (
                      <span className="text-xs text-gray-500">
                        {classSessions.length} historical sessions
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowDrilldown(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Scrollable body */}
              <div className="overflow-y-auto max-h-[76vh] pr-2">
              
              {/* Consolidated Metrics Cards - Silver Theme with Animations */}
              {hasHistoricalData && (() => {
                const totalCheckIns = classSessions.reduce((sum, s) => sum + s.CheckedIn, 0);
                const totalBooked = classSessions.reduce((sum, s) => sum + s.Booked, 0);
                
                const totalCapacity = classSessions.reduce((sum, s) => sum + s.Capacity, 0);
                const totalRevenue = classSessions.reduce((sum, s) => sum + s.Revenue, 0);
                const emptyClasses = classSessions.filter(s => s.CheckedIn === 0).length;
                const nonEmptySessions = classSessions.filter(s => s.CheckedIn > 0);
                
                const avgCheckInsExcludingEmpty = nonEmptySessions.length > 0 ? nonEmptySessions.reduce((sum, s) => sum + s.CheckedIn, 0) / nonEmptySessions.length : 0;
                const fillRate = totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0;
                
                
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 px-2">
                    {/* Sessions */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 shadow-md border border-gray-300 relative overflow-hidden"
                    >
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      />
                      <div className="relative z-10">
                        <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Sessions</div>
                        <div className="text-3xl font-bold text-gray-900">{classSessions.length}</div>
                        <div className="mt-2 bg-gray-300 rounded-full h-1.5 overflow-hidden">
                          <motion.div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    </motion.div>

                    {/* Check-ins */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 shadow-md border border-gray-300 relative overflow-hidden"
                    >
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      />
                      <div className="relative z-10">
                        <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Check-ins</div>
                        <div className="text-3xl font-bold text-gray-900">{totalCheckIns}</div>
                        <div className="mt-2 bg-gray-300 rounded-full h-1.5 overflow-hidden">
                          <motion.div 
                            className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(fillRate, 100)}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    </motion.div>

                    {/* Class Avg (Excluding Empty) */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 shadow-md border border-gray-300 relative overflow-hidden"
                    >
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      />
                      <div className="relative z-10">
                        <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Avg (No Empty)</div>
                        <div className="text-3xl font-bold text-gray-900">{avgCheckInsExcludingEmpty.toFixed(1)}</div>
                        <div className="mt-2 bg-gray-300 rounded-full h-1.5 overflow-hidden">
                          <motion.div 
                            className="bg-gradient-to-r from-purple-500 to-purple-600 h-1.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((avgCheckInsExcludingEmpty / 30) * 100, 100)}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    </motion.div>

                    {/* Revenue */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 shadow-md border border-gray-300 relative overflow-hidden"
                    >
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      />
                      <div className="relative z-10">
                        <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Revenue</div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</div>
                        <div className="mt-2 bg-gray-300 rounded-full h-1.5 overflow-hidden">
                          <motion.div 
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-1.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((totalRevenue / 1000000) * 100, 100)}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    </motion.div>

                    {/* Fill Rate */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 shadow-md border border-gray-300 relative overflow-hidden"
                    >
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      />
                      <div className="relative z-10">
                        <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Fill Rate</div>
                        <div className="text-3xl font-bold text-gray-900">{fillRate.toFixed(0)}%</div>
                        <div className="mt-2 bg-gray-300 rounded-full h-1.5 overflow-hidden">
                          <motion.div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${fillRate}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    </motion.div>

                    {/* Capacity */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 shadow-md border border-gray-300 relative overflow-hidden"
                    >
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      />
                      <div className="relative z-10">
                        <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Capacity</div>
                        <div className="text-3xl font-bold text-gray-900">{totalCapacity}</div>
                        <div className="mt-2 bg-gray-300 rounded-full h-1.5 overflow-hidden">
                          <motion.div 
                            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-1.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    </motion.div>

                    {/* Bookings */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 shadow-md border border-gray-300 relative overflow-hidden"
                    >
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      />
                      <div className="relative z-10">
                        <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Booked</div>
                        <div className="text-3xl font-bold text-gray-900">{totalBooked}</div>
                        <div className="mt-2 bg-gray-300 rounded-full h-1.5 overflow-hidden">
                          <motion.div 
                            className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-1.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    </motion.div>

                    {/* Empty Classes */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 shadow-md border border-gray-300 relative overflow-hidden"
                    >
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      />
                      <div className="relative z-10">
                        <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Empty</div>
                        <div className="text-3xl font-bold text-gray-900">{emptyClasses}</div>
                        <div className="mt-2 bg-gray-300 rounded-full h-1.5 overflow-hidden">
                          <motion.div 
                            className="bg-gradient-to-r from-red-500 to-red-600 h-1.5 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${classSessions.length > 0 ? (emptyClasses / classSessions.length) * 100 : 0}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })()}

              {/* Large Panels - Additional Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 px-2">
                <div className="bg-white rounded-2xl p-6 border shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">PAYMENT BREAKDOWN</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Rev/Check-in</div>
                      <div className="text-lg font-bold text-slate-800">{formatCurrency(selectedClass.revenuePerCheckIn)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Complimentary</div>
                      <div className="text-lg font-bold text-slate-800">{selectedClass.avgComplimentary}</div>
                      <div className="text-xs text-gray-500">{selectedClass.complimentaryRate}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Memberships</div>
                      <div className="text-lg font-bold text-slate-800">{selectedClass.avgMemberships}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Packages</div>
                      <div className="text-lg font-bold text-slate-800">{selectedClass.avgPackages}</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">BOOKING TYPES</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Intro Offers</div>
                      <div className="text-lg font-bold text-slate-800">{selectedClass.avgIntroOffers}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Single Classes</div>
                      <div className="text-lg font-bold text-slate-800">{selectedClass.avgSingleClasses}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Avg Booked</div>
                      <div className="text-lg font-bold text-slate-800">{selectedClass.avgBooked}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Late Cancelled</div>
                      <div className="text-lg font-bold text-slate-800">{selectedClass.avgLateCancelled}</div>
                    </div>
                    <div className="ml-3">
                      <button
                        onClick={() => setShowNonFunctionalHours(!showNonFunctionalHours)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-white text-gray-700 border border-gray-300 hover:border-blue-400"
                        title="Show / hide non-peak hours in all views"
                      >
                        {showNonFunctionalHours ? 'Hide Non-Peak' : 'Show Non-Peak'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top 3 Trainers for this Class */}
              {selectedClass.topTrainers && selectedClass.topTrainers.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 text-lg mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Top 3 Trainers for this Class
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedClass.topTrainers.map((trainer, index) => (
                      <div 
                        key={index}
                        className={`rounded-xl p-4 border-2 ${
                          index === 0 
                            ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300' 
                            : index === 1
                            ? 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300'
                            : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${
                              index === 0 
                                ? 'bg-yellow-500 text-white' 
                                : index === 1
                                ? 'bg-gray-400 text-white'
                                : 'bg-orange-500 text-white'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">{trainer.name}</div>
                              <div className="text-xs text-gray-600">{trainer.sessions} sessions</div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Total Check-ins:</span>
                            <span className="font-semibold text-sm text-gray-900">{trainer.totalCheckIns}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Class Avg:</span>
                            <span className="font-semibold text-sm text-blue-600">{trainer.classAvg}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Avg Fill Rate:</span>
                            <span className="font-semibold text-sm text-gray-900">{trainer.avgFill}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">Score:</span>
                            <span className="font-semibold text-sm text-purple-600">{trainer.score}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historical Sessions Table */}
              {hasHistoricalData ? (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    All Past Sessions ({classSessions.length})
                  </h3>
                  <div className="bg-gray-50 rounded-xl border border-gray-200" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                    <div style={{ minWidth: '1400px', maxHeight: '500px', overflowY: 'auto' }}>
                      <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-gradient-to-r from-slate-100 to-blue-100 sticky top-0 z-10 border-b-2 border-slate-300">
                          <tr>
                            <th className="text-left px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">Date</th>
                            <th className="text-left px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">Trainer</th>
                            <th className="text-right px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">Check In</th>
                            <th className="text-right px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">Capacity</th>
                            <th className="text-right px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">Fill%</th>
                            <th className="text-right px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">Booked</th>
                            <th className="text-right px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">Cancelled</th>
                            <th className="text-right px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">Waitlist</th>
                            <th className="text-right px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">Revenue</th>
                            <th className="text-right px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">Comp</th>
                            <th className="text-right px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">Members</th>
                            <th className="text-right px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">Packages</th>
                            <th className="text-right px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200">Intro</th>
                            <th className="text-right px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap">Singles</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classSessions.map((session, index) => {
                            const sessionFillRate = session.Capacity > 0 
                              ? Math.round((session.CheckedIn / session.Capacity) * 100) 
                              : 0;
                            const fillRateColor = sessionFillRate >= 80 
                              ? 'text-green-700 font-semibold' 
                              : sessionFillRate >= 60 
                              ? 'text-amber-700 font-semibold' 
                              : 'text-red-700 font-semibold';
                            
                            return (
                              <tr 
                                key={index}
                                className={`border-t border-slate-200 hover:bg-blue-50 transition-colors max-h-[30px] ${
                                  index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                                }`}
                                style={{ maxHeight: '30px', height: '30px' }}
                              >
                                <td className="px-2 py-1 font-medium text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                                  {format(parseISO(session.Date), 'MMM dd, yy')}
                                </td>
                                <td className="px-2 py-1 text-slate-700 whitespace-nowrap truncate max-w-[100px] text-[11px] border-r border-slate-200" title={session.Trainer}>
                                  {session.Trainer}
                                </td>
                                <td className="px-2 py-1 text-right font-semibold text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">{session.CheckedIn}</td>
                                <td className="px-2 py-1 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200">{session.Capacity}</td>
                                <td className={`px-2 py-1 text-right whitespace-nowrap text-[11px] border-r border-slate-200 ${fillRateColor}`}>
                                  {sessionFillRate}%
                                </td>
                                <td className="px-2 py-1 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200">{session.Booked}</td>
                                <td className="px-2 py-1 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200">{session.LateCancelled}</td>
                                <td className="px-2 py-1 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200">{session.Waitlisted || 0}</td>
                                <td className="px-2 py-1 text-right font-semibold text-emerald-700 whitespace-nowrap text-[11px] border-r border-slate-200">
                                  {formatRevenue(session.Revenue)}
                                </td>
                                <td className="px-2 py-1 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200">{session.Complimentary}</td>
                                <td className="px-2 py-1 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200">{session.Memberships}</td>
                                <td className="px-2 py-1 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200">{session.Packages}</td>
                                <td className="px-2 py-1 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200">{session.IntroOffers}</td>
                                <td className="px-2 py-1 text-right text-slate-700 whitespace-nowrap text-[11px]">{session.SingleClasses}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-gradient-to-r from-slate-100 to-blue-100 font-semibold border-t-2 border-slate-300">
                          {/* Totals Row */}
                          <tr style={{ maxHeight: '30px', height: '30px' }} className="border-b border-slate-300">
                            <td className="px-2 py-1 text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200 font-bold">TOTALS</td>
                            <td className="px-2 py-1 border-r border-slate-200"></td>
                            <td className="px-2 py-1 text-right text-blue-900 font-bold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {classSessions.reduce((sum, s) => sum + s.CheckedIn, 0)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {classSessions.reduce((sum, s) => sum + s.Capacity, 0)}
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200"></td>
                            <td className="px-2 py-1 text-right text-blue-900 font-bold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {classSessions.reduce((sum, s) => sum + s.Booked, 0)}
                            </td>
                            <td className="px-2 py-1 text-right text-blue-900 font-bold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {classSessions.reduce((sum, s) => sum + s.LateCancelled, 0)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {classSessions.reduce((sum, s) => sum + (s.Waitlisted || 0), 0)}
                            </td>
                            <td className="px-2 py-1 text-right text-emerald-700 font-bold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {formatRevenue(classSessions.reduce((sum, s) => sum + s.Revenue, 0))}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {classSessions.reduce((sum, s) => sum + s.Complimentary, 0)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {classSessions.reduce((sum, s) => sum + s.Memberships, 0)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {classSessions.reduce((sum, s) => sum + s.Packages, 0)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {classSessions.reduce((sum, s) => sum + s.IntroOffers, 0)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px]">
                              {classSessions.reduce((sum, s) => sum + s.SingleClasses, 0)}
                            </td>
                          </tr>
                          {/* Averages Row */}
                          <tr style={{ maxHeight: '30px', height: '30px' }} className="sticky bottom-0 bg-gradient-to-r from-slate-100 to-blue-100">
                            <td className="px-2 py-1 text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200 font-bold">AVERAGES</td>
                            <td className="px-2 py-1 border-r border-slate-200"></td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {Math.round(classSessions.reduce((sum, s) => sum + s.CheckedIn, 0) / classSessions.length)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {Math.round(classSessions.reduce((sum, s) => sum + s.Capacity, 0) / classSessions.length)}
                            </td>
                            <td className="px-2 py-1 text-right text-blue-700 font-bold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {selectedClass.fillRate}%
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {Math.round(classSessions.reduce((sum, s) => sum + s.Booked, 0) / classSessions.length)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {Math.round(classSessions.reduce((sum, s) => sum + s.LateCancelled, 0) / classSessions.length)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {Math.round(classSessions.reduce((sum, s) => sum + (s.Waitlisted || 0), 0) / classSessions.length)}
                            </td>
                            <td className="px-2 py-1 text-right text-emerald-700 font-bold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {formatRevenue(Math.round(classSessions.reduce((sum, s) => sum + s.Revenue, 0) / classSessions.length))}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {Math.round(classSessions.reduce((sum, s) => sum + s.Complimentary, 0) / classSessions.length)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {Math.round(classSessions.reduce((sum, s) => sum + s.Memberships, 0) / classSessions.length)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {Math.round(classSessions.reduce((sum, s) => sum + s.Packages, 0) / classSessions.length)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {Math.round(classSessions.reduce((sum, s) => sum + s.IntroOffers, 0) / classSessions.length)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px]">
                              {Math.round(classSessions.reduce((sum, s) => sum + s.SingleClasses, 0) / classSessions.length)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 bg-amber-50 rounded-xl p-6 border border-amber-200">
                  <div className="flex items-center gap-3 text-amber-800">
                    <AlertTriangle className="w-6 h-6" />
                    <div>
                      <h3 className="font-semibold mb-1">No Historical Data Available</h3>
                      <p className="text-sm text-amber-700">
                        This is a new class with no past sessions recorded. Metrics shown are estimates.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {selectedClass.recommendations.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-blue-600" />
                    AI Recommendations
                  </h3>
                  <div className="space-y-2">
                    {selectedClass.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 bg-white/70 rounded-lg p-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                        </div>
                        <span className="text-sm text-gray-700 leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conflicts Warning */}
              {selectedClass.conflicts.length > 0 && (
                <div className="mt-4 bg-red-50 rounded-xl p-5 border border-red-200">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Scheduling Conflicts
                  </h3>
                  <div className="space-y-2">
                    {selectedClass.conflicts.map((conflict, index) => (
                      <div key={index} className="flex items-center gap-3 text-sm text-red-700">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        {conflict}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t">
                <button
                  onClick={() => {
                    setEditingClass(selectedClass);
                    setIsEditing(true);
                    setShowDrilldown(false);
                  }}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Class
                </button>
                {hasHistoricalData && (
                  <button
                    onClick={() => {
                      // Export this class's data to CSV
                      const csvContent = [
                        ['Date', 'Trainer', 'Checked In', 'Capacity', 'Fill Rate', 'Booked', 'Late Cancelled', 'Waitlisted', 'Revenue', 'Complimentary', 'Memberships', 'Packages', 'Intro Offers', 'Single Classes'],
                        ...classSessions.map(s => [
                          format(parseISO(s.Date), 'yyyy-MM-dd'),
                          s.Trainer,
                          s.CheckedIn,
                          s.Capacity,
                          `${Math.round((s.CheckedIn / s.Capacity) * 100)}%`,
                          s.Booked,
                          s.LateCancelled,
                          s.Waitlisted || 0,
                          (s.Revenue / 100).toFixed(2),
                          s.Complimentary,
                          s.Memberships,
                          s.Packages,
                          s.IntroOffers,
                          s.SingleClasses
                        ])
                      ].map(row => row.join(',')).join('\n');
                      
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${selectedClass.class}_${selectedClass.day}_${selectedClass.time}.csv`;
                      a.click();
                    }}
                    className="px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Export Data
                  </button>
                )}
                <button
                  onClick={() => setShowDrilldown(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
            </motion.div>
          </motion.div>
        );
      })()}

      {/* Advanced Add Class Modal */}
      {showAddModal && selectedTimeSlot && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              setSelectedTimeSlot(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowAddModal(false);
              setSelectedTimeSlot(null);
            }
          }}
          tabIndex={-1}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Add New Class</h3>
                <p className="text-sm text-gray-600 mt-1">Smart scheduling with AI recommendations</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddModalData({ className: '', trainer: '', location: '', capacity: 25 });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
                  <div className="bg-blue-50 p-3 rounded-lg text-sm text-gray-800 border border-blue-200">
                    <div className="font-medium">{selectedTimeSlot.day} at {selectedTimeSlot.time}</div>
                    <div className="text-xs text-blue-600 mt-1">
                      {popularTimeSlots.includes(selectedTimeSlot.time) ? '🔥 Popular time slot' : '💡 Consider peak hours for better attendance'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class Type</label>
                  <select
                    value={addModalData.className}
                    onChange={(e) => setAddModalData({...addModalData, className: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select class type...</option>
                    {uniqueClasses.map(className => {
                      const classStats = rawData.filter(s => s.Class === className);
                      const avgFill = classStats.length > 0 ? 
                        classStats.reduce((sum, s) => sum + ((s.CheckedIn || 0) / (s.Capacity || 1)), 0) / classStats.length * 100 : 0;
                      return (
                        <option key={className} value={className}>
                          {className} ({Math.round(avgFill)}% avg fill)
                        </option>
                      );
                    })}
                  </select>
                  {addModalData.className && (
                    <div className="text-xs text-gray-600 mt-1">
                      💡 This class type averages {Math.round(rawData.filter(s => s.Class === addModalData.className).reduce((sum, s) => sum + ((s.CheckedIn || 0) / (s.Capacity || 1)), 0) / rawData.filter(s => s.Class === addModalData.className).length * 100)}% fill rate
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trainer</label>
                  <select
                    value={addModalData.trainer}
                    onChange={(e) => setAddModalData({...addModalData, trainer: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select trainer...</option>
                    {uniqueTrainers.map(trainer => {
                      const analytics = trainerAnalytics[trainer];
                      const workloadIcon = {
                        Light: '🟢',
                        Medium: '🟡', 
                        Heavy: '🟠',
                        Overloaded: '🔴'
                      }[analytics?.workload || 'Light'];
                      return (
                        <option key={trainer} value={trainer}>
                          {trainer} {workloadIcon} ({analytics?.totalHours || 0}h/week)
                        </option>
                      );
                    })}
                  </select>
                  {addModalData.trainer && trainerAnalytics[addModalData.trainer] && (
                    <div className="text-xs mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        trainerAnalytics[addModalData.trainer].workload === 'Overloaded' ? 'bg-red-100 text-red-800' :
                        trainerAnalytics[addModalData.trainer].workload === 'Heavy' ? 'bg-orange-100 text-orange-800' :
                        trainerAnalytics[addModalData.trainer].workload === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {trainerAnalytics[addModalData.trainer].workload} workload
                      </span>
                      <span className="ml-2 text-gray-600">
                        Avg fill: {Math.round(trainerAnalytics[addModalData.trainer].avgFillRate)}%
                      </span>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select
                    value={addModalData.location}
                    onChange={(e) => setAddModalData({...addModalData, location: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select location...</option>
                    {uniqueLocations.map(location => {
                      const locationStats = rawData.filter(s => s.Location === location);
                      const avgCapacity = locationStats.length > 0 ? 
                        locationStats.reduce((sum, s) => sum + (s.Capacity || 0), 0) / locationStats.length : 0;
                      return (
                        <option key={location} value={location}>
                          {location} (Avg capacity: {Math.round(avgCapacity)})
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={addModalData.capacity}
                      onChange={(e) => setAddModalData({...addModalData, capacity: parseInt(e.target.value) || 25})}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="100"
                    />
                    {addModalData.location && (
                      <button
                        onClick={() => {
                          const locationStats = rawData.filter(s => s.Location === addModalData.location);
                          const suggestedCapacity = locationStats.length > 0 ? 
                            Math.round(locationStats.reduce((sum, s) => sum + (s.Capacity || 0), 0) / locationStats.length) : 25;
                          setAddModalData({...addModalData, capacity: suggestedCapacity});
                        }}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        Auto
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right Column - AI Insights */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">🤖 AI Scheduling Insights</h4>
                <div className="space-y-3 text-sm">
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="font-medium text-blue-900 mb-1">📊 Time Slot Analysis</div>
                    <div className="text-gray-600">
                      {popularTimeSlots.includes(selectedTimeSlot.time) ? 
                        '✅ High-demand time slot - expect good attendance' :
                        '⚠️ Off-peak time - consider marketing or promotional pricing'
                      }
                    </div>
                  </div>
                  
                  {addModalData.trainer && trainerAnalytics[addModalData.trainer] && (
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="font-medium text-green-900 mb-1">👤 Trainer Performance</div>
                      <div className="text-gray-600">
                        {trainerAnalytics[addModalData.trainer].avgFillRate > 80 ? 
                          `✅ ${addModalData.trainer} has excellent performance (${Math.round(trainerAnalytics[addModalData.trainer].avgFillRate)}% fill rate)` :
                          `⚠️ ${addModalData.trainer} has ${Math.round(trainerAnalytics[addModalData.trainer].avgFillRate)}% avg fill rate`
                        }
                      </div>
                    </div>
                  )}
                  
                  {addModalData.className && (
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="font-medium text-purple-900 mb-1">🏋️ Class Type Insights</div>
                      <div className="text-gray-600">
                        Similar {addModalData.className} classes average {Math.round(rawData.filter(s => s.Class === addModalData.className).reduce((sum, s) => sum + ((s.CheckedIn || 0) / (s.Capacity || 1)), 0) / rawData.filter(s => s.Class === addModalData.className).length * 100)}% capacity
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="font-medium text-orange-900 mb-1">💡 Recommendations</div>
                    <div className="text-gray-600 space-y-1">
                      <div>• Optimal capacity: {Math.round(addModalData.capacity * 0.85)}-{addModalData.capacity}</div>
                      <div>• Marketing focus: First-time visitors</div>
                      <div>• Follow-up: 24h before class</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6 pt-6 border-t">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddModalData({ className: '', trainer: '', location: '', capacity: 25 });
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement actual class addition
                  setShowAddModal(false);
                  setSelectedTimeSlot(null);
                  setAddModalData({ className: '', trainer: '', location: '', capacity: 25 });
                }}
                disabled={!addModalData.className || !addModalData.trainer || !addModalData.location}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🚀 Add Smart Class
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Class Modal */}
      {isEditing && editingClass && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditing(false);
              setEditingClass(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsEditing(false);
              setEditingClass(null);
            }
          }}
          tabIndex={-1}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit Class</h3>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingClass(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                <select
                  defaultValue={editingClass.class}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[...new Set(rawData.map(s => s.Class))].sort().map(className => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trainer</label>
                <select
                  defaultValue={editingClass.trainer}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[...new Set(rawData.map(s => s.Trainer))].sort().map(trainer => (
                    <option key={trainer} value={trainer}>{trainer}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  defaultValue={editingClass.location}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[...new Set(rawData.map(s => s.Location))].sort().map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="number"
                  defaultValue={editingClass.capacity}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  defaultValue={editingClass.status}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingClass(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingClass(null);
                }}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default ProScheduler;