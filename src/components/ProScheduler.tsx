import { useState, useMemo, useEffect, useRef, memo, Fragment } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { SessionData, CheckinData } from '../types';
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
  Calendar,
  Repeat,
  Undo2,
  ArrowRightLeft,
  Award,
  ChevronDown
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
  isDiscontinued?: boolean;
  trend?: string;
  lastWeekTrainer?: string | null;
  bestPerformingTrainer?: string | null;
  totalCheckIns?: number;
  totalCapacity?: number;
  totalBooked?: number;
  totalLateCancelled?: number;
  totalWaitlisted?: number;
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
  const { rawData = [], activeClassesData = {}, checkinsData = [] } = useDashboardStore();
  
  // State management
  const [filters, setFilters] = useState<ProSchedulerFilters>({
    dateFrom: new Date('2025-08-01'), // August 1, 2025
    dateTo: new Date(), // Current date (no future dates)
    locations: ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra'],
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
  const [showSimilarClasses, setShowSimilarClasses] = useState<string | null>(null);
  const [editedClasses, setEditedClasses] = useState<Map<string, ScheduleClass>>(new Map());
  const [createdClasses, setCreatedClasses] = useState<Set<string>>(new Set());
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [selectedSessionForMembers, setSelectedSessionForMembers] = useState<SessionData | null>(null);
  const [showMemberDetailsModal, setShowMemberDetailsModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<'all' | 'checked-in' | 'cancelled' | 'no-show'>('all');
  const [memberTypeFilter, setMemberTypeFilter] = useState<'all' | 'regulars' | 'new'>('all');
  const [showHighPerformingOnly, setShowHighPerformingOnly] = useState(false);
  const [expandedDayFormats, setExpandedDayFormats] = useState<Set<string>>(new Set());
  const drilldownModalRef = useRef<HTMLDivElement>(null);
  
  // Format difficulty categorization
  const getFormatDifficulty = (format: string): 'beginner' | 'intermediate' | 'advanced' => {
    const normalizedFormat = format.toLowerCase().trim();
    
    // Advanced formats
    if (normalizedFormat.includes('amped up') || 
        normalizedFormat.includes('hiit') || 
        normalizedFormat.includes('strength lab')) {
      return 'advanced';
    }
    
    // Beginner formats
    if (normalizedFormat.includes('barre 57') ||
        normalizedFormat.includes('foundations') ||
        normalizedFormat.includes('sweat in 30') ||
        normalizedFormat.includes('recovery') ||
        normalizedFormat.includes('powercycle')) {
      return 'beginner';
    }
    
    // All others are intermediate
    return 'intermediate';
  };
  
  // Enhanced format classification for heatmap colors
  const getFormatCategory = (className: string): string => {
    const name = className.toLowerCase().trim();
    
    // Yoga family
    if (name.includes('yoga') || name.includes('vinyasa') || name.includes('hatha')) return 'yoga';
    // Pilates family  
    if (name.includes('pilates') || name.includes('mat') || name.includes('reformer')) return 'pilates';
    // High intensity
    if (name.includes('hiit') || name.includes('amped') || name.includes('intensity')) return 'hiit';
    // Cycling
    if (name.includes('spin') || name.includes('cycle') || name.includes('powercycle')) return 'cycle';
    // Strength
    if (name.includes('strength') || name.includes('lab') || name.includes('weight')) return 'strength';
    // Barre
    if (name.includes('barre')) return 'barre';
    // Boxing/Combat
    if (name.includes('box') || name.includes('combat') || name.includes('kickbox')) return 'boxing';
    // Dance
    if (name.includes('dance') || name.includes('zumba') || name.includes('rhythm')) return 'dance';
    // Cardio
    if (name.includes('cardio') || name.includes('burn') || name.includes('sweat')) return 'cardio';
    // Functional
    if (name.includes('functional') || name.includes('movement') || name.includes('mobility')) return 'functional';
    
    return 'general';
  };
  
  // ESC key handler for member details modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMemberDetailsModal) {
        setShowMemberDetailsModal(false);
        setSelectedSessionForMembers(null);
        setMemberSearchQuery('');
        setMemberStatusFilter('all');
        setMemberTypeFilter('all');
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showMemberDetailsModal]);
  
  // Format currency helper - with L/K/Cr formatter for large numbers
  const formatCurrency = (amount: number) => {
    // Revenue values are already in rupees, no need to divide by 100
    const valueInRupees = amount;
    
    if (valueInRupees >= 10000000) { // 1 Crore or more
      return `₹${(valueInRupees / 10000000).toFixed(1)}Cr`;
    } else if (valueInRupees >= 100000) { // 1 Lakh or more
      return `₹${(valueInRupees / 100000).toFixed(1)}L`;
    } else if (valueInRupees >= 1000) { // 1 Thousand or more
      return `₹${(valueInRupees / 1000).toFixed(1)}K`;
    } else if (valueInRupees < 1000 && valueInRupees > 0) { // Under 1K but not zero
      return `₹${(valueInRupees / 1000).toFixed(2)}K`;
    } else {
      return `₹${valueInRupees.toFixed(0)}`;
    }
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

  // Load edited and created classes from localStorage on mount
  useEffect(() => {
    try {
      const savedEdited = localStorage.getItem('editedClasses');
      const savedCreated = localStorage.getItem('createdClasses');
      
      if (savedEdited) {
        const parsedEdited = JSON.parse(savedEdited);
        setEditedClasses(new Map(Object.entries(parsedEdited)));
      }
      
      if (savedCreated) {
        setCreatedClasses(new Set(JSON.parse(savedCreated)));
      }
    } catch (error) {
      console.error('Failed to load saved classes:', error);
    }
  }, []);

  // Save to localStorage whenever edited or created classes change
  useEffect(() => {
    try {
      const editedObj = Object.fromEntries(editedClasses);
      localStorage.setItem('editedClasses', JSON.stringify(editedObj));
      localStorage.setItem('createdClasses', JSON.stringify([...createdClasses]));
    } catch (error) {
      console.error('Failed to save classes:', error);
    }
  }, [editedClasses, createdClasses]);

  // Generate similar class recommendations
  const generateSimilarRecommendations = (cls: ScheduleClass) => {
    const recommendations: Array<{
      class: string;
      trainer: string;
      reason: string;
      score: number;
      avgCheckIns: number;
      fillRate: number;
      revenue: number;
    }> = [];

    // Find classes at same time/day with better performance
    scheduleClasses.forEach(otherClass => {
      if (otherClass.id === cls.id) return;
      
      let score = 0;
      const reasons: string[] = [];

      // Same time slot
      if (otherClass.time === cls.time && otherClass.day === cls.day) {
        score += 20;
        reasons.push('Same time slot');
      }

      // Better fill rate
      if (otherClass.fillRate > cls.fillRate + 10) {
        score += Math.min((otherClass.fillRate - cls.fillRate) / 2, 30);
        reasons.push(`${otherClass.fillRate - cls.fillRate}% higher fill rate`);
      }

      // Better average attendance
      if (otherClass.avgCheckIns > cls.avgCheckIns + 2) {
        score += 15;
        reasons.push(`+${(otherClass.avgCheckIns - cls.avgCheckIns).toFixed(1)} more attendees`);
      }

      // Same location
      if (otherClass.location === cls.location) {
        score += 10;
        reasons.push('Same location');
      }

      // Similar class type (format)
      if (otherClass.class.toLowerCase().includes(cls.class.toLowerCase().split(' ')[0]) ||
          cls.class.toLowerCase().includes(otherClass.class.toLowerCase().split(' ')[0])) {
        score += 15;
        reasons.push('Similar format');
      }

      // Trainer specialization (if trainer teaches this class type historically)
      const trainerClasses = rawData.filter(s => 
        s.Trainer?.toLowerCase() === otherClass.trainer.toLowerCase() &&
        s.Class?.toLowerCase().includes(cls.class.toLowerCase().split(' ')[0])
      );
      if (trainerClasses.length >= 5) {
        score += 20;
        reasons.push(`Trainer experienced in ${cls.class.split(' ')[0]}`);
      }

      if (score > 20 && reasons.length > 0) {
        recommendations.push({
          class: otherClass.class,
          trainer: otherClass.trainer,
          reason: reasons.join(', '),
          score,
          avgCheckIns: otherClass.avgCheckIns,
          fillRate: otherClass.fillRate,
          revenue: otherClass.revenue
        });
      }
    });

    return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
  };

  // Replace class handler
  const handleReplaceClass = (originalClass: ScheduleClass, newTrainer: string, newClassName: string) => {
    const updatedClass: ScheduleClass = {
      ...originalClass,
      trainer: newTrainer,
      class: newClassName,
    };

    // Mark as edited
    const newEditedClasses = new Map(editedClasses);
    newEditedClasses.set(originalClass.id, updatedClass);
    setEditedClasses(newEditedClasses);

    // Close similar modal
    setShowSimilarClasses(null);
    
    // Show success message
    alert(`Class replaced successfully! ${originalClass.class} → ${newClassName} with ${newTrainer}`);
  };

  // Revert class to original state
  const handleRevertClass = (classId: string) => {
    // Remove from edited classes
    const newEditedClasses = new Map(editedClasses);
    newEditedClasses.delete(classId);
    setEditedClasses(newEditedClasses);

    // Remove from created classes
    const newCreatedClasses = new Set(createdClasses);
    newCreatedClasses.delete(classId);
    setCreatedClasses(newCreatedClasses);

    // Show success message
    alert('✅ Class reverted to original state!');
  };

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
          
          const avgCheckIns = sessionCount > 0 ? totalCheckIns / sessionCount : 0;
          const avgBooked = sessionCount > 0 ? totalBooked / sessionCount : 0;
          const avgLateCancelled = sessionCount > 0 ? totalLateCancelled / sessionCount : 0;
          const avgWaitlisted = sessionCount > 0 ? totalWaitlisted / sessionCount : 0;
          const avgComplimentary = sessionCount > 0 ? totalComplimentary / sessionCount : 0;
          const avgMemberships = sessionCount > 0 ? totalMemberships / sessionCount : 0;
          const avgPackages = sessionCount > 0 ? totalPackages / sessionCount : 0;
          const avgIntroOffers = sessionCount > 0 ? totalIntroOffers / sessionCount : 0;
          const avgSingleClasses = sessionCount > 0 ? totalSingleClasses / sessionCount : 0;
          
          const fillRate = sessionCount > 0 && totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0;
          const cancellationRate = totalBooked > 0 ? (totalLateCancelled / totalBooked) * 100 : 0;
          const waitlistRate = sessionCount > 0 && totalCapacity > 0 ? (totalWaitlisted / totalCapacity) * 100 : 0;
          const complimentaryRate = totalCheckIns > 0 ? (totalComplimentary / totalCheckIns) * 100 : 0;
          const bookingToCheckInRate = totalBooked > 0 ? (totalCheckIns / totalBooked) * 100 : 0;
          const revenuePerCheckIn = totalCheckIns > 0 ? totalRevenue / totalCheckIns : 0;
          
          // Calculate consistency score (standard deviation of fill rates)
          const fillRates = historicalSessions.map(s => s.Capacity > 0 ? (s.CheckedIn / s.Capacity) * 100 : 0);
          const avgFillRate = fillRates.length > 0 ? fillRates.reduce((sum, fr) => sum + fr, 0) / fillRates.length : 0;
          const variance = fillRates.length > 0 ? fillRates.reduce((sum, fr) => sum + Math.pow(fr - avgFillRate, 2), 0) / fillRates.length : 0;
          const stdDev = Math.sqrt(variance);
          const consistency = 100 - Math.min(stdDev, 100); // Higher is more consistent
          
          // Top 3 trainers for this class - Initialize before conditional blocks
          let topTrainers: Array<{ name: string; sessions: number; totalCheckIns: number; classAvg: number; avgFill: number; avgRevenue: number; score: number }> = [];
          
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
          
          topTrainers = Array.from(trainerStats.entries())
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
            capacity: sessionCount > 0 ? Math.round(totalCapacity / sessionCount) || 0 : 0,
            avgCheckIns: sessionCount > 0 ? Math.round(avgCheckIns * 10) / 10 : 0,
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
            topTrainers,
            // Trainer change indicators
            lastWeekTrainer: (() => {
              // Get last week's trainer for this slot
              const lastWeekStart = new Date(today);
              lastWeekStart.setDate(lastWeekStart.getDate() - 7);
              const lastWeekEnd = new Date(today);
              lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
              
              const lastWeekSessions = rawData.filter((s: SessionData) => {
                const sessionDate = parseISO(s.Date);
                if (sessionDate < lastWeekStart || sessionDate > lastWeekEnd) return false;
                return s.Day === day && 
                       s.Time?.substring(0, 5) === normalizedTime && 
                       s.Class?.toLowerCase() === activeClass.className?.toLowerCase() &&
                       s.Location?.toLowerCase() === activeClass.location?.toLowerCase();
              });
              
              if (lastWeekSessions.length === 0) return null;
              
              // Return most common trainer from last week
              const trainerCounts = new Map<string, number>();
              lastWeekSessions.forEach(s => {
                if (s.Trainer) {
                  trainerCounts.set(s.Trainer, (trainerCounts.get(s.Trainer) || 0) + 1);
                }
              });
              return Array.from(trainerCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
            })(),
            bestPerformingTrainer: topTrainers.length > 0 ? topTrainers[0].name : null
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

    // Apply edited classes changes
    editedClasses.forEach((editedClass, classId) => {
      const index = classes.findIndex(c => c.id === classId);
      if (index !== -1) {
        // Merge the edited changes with existing class data
        classes[index] = {
          ...classes[index],
          ...editedClass
        };
      }
    });

    // Add newly created classes
    createdClasses.forEach(classId => {
      // Check if this created class is not already in the list
      if (!classes.find(c => c.id === classId)) {
        // Find the created class data from editedClasses Map
        const createdClass = editedClasses.get(classId);
        if (createdClass) {
          classes.push(createdClass);
        }
      }
    });

    // Cache the results
    cachedScheduleClasses = classes;
    cacheTimestamp = Date.now();

    return classes;
  }, [activeClassesData, rawData, filters.dateFrom, filters.dateTo, filters.activeOnly, editedClasses, createdClasses]);

  // Calculate discontinued classes (classes from last week not in active list)
  // Helper function to normalize class names (removes minor variations)
  const normalizeClassName = (className: string): string => {
    if (!className) return '';
    return className
      .toLowerCase()
      .replace(/\s*\(push\)\s*/gi, '')
      .replace(/\s*\(pull\)\s*/gi, '')
      .replace(/\s*\(legs\)\s*/gi, '')
      .replace(/\s*\(core\)\s*/gi, '')
      .replace(/\s*\(upper\)\s*/gi, '')
      .replace(/\s*\(lower\)\s*/gi, '')
      .replace(/\s*\(full body\)\s*/gi, '')
      .replace(/\s*\d+\s*/g, ' ') // Remove numbers
      .replace(/\s+/g, ' ')
      .trim();
  };

  const discontinuedClasses = useMemo(() => {
    const classes: ScheduleClass[] = [];
    
    // Get date range for last 2-3 weeks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeWeeksAgo = new Date(today);
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21); // 3 weeks
    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    
    // Get unique class combinations from last 2-3 weeks
    const recentSessions = rawData.filter((s: SessionData) => {
      const sessionDate = parseISO(s.Date);
      return sessionDate >= threeWeeksAgo && sessionDate <= lastWeekEnd;
    });
    
    // Group by day + time + normalized class + location
    const recentClassMap = new Map<string, SessionData[]>();
    recentSessions.forEach((s: SessionData) => {
      const normalizedClass = normalizeClassName(s.Class);
      const key = `${s.Day}_${s.Time?.substring(0, 5)}_${normalizedClass}_${s.Location}`.toLowerCase();
      const existing = recentClassMap.get(key) || [];
      existing.push(s);
      recentClassMap.set(key, existing);
    });
    
    // Check each recent class against active classes
    recentClassMap.forEach((sessions, key) => {
      const [day, time, normalizedClass, location] = key.split('_');
      
      // Check if this class exists in active classes (with normalized comparison)
      const isActive = scheduleClasses.some(cls => {
        const normalizedActiveClass = normalizeClassName(cls.class);
        return cls.day.toLowerCase() === day &&
          cls.time === time &&
          normalizedActiveClass === normalizedClass &&
          cls.location.toLowerCase() === location;
      });
      
      if (!isActive && sessions.length > 0) {
        // Get ALL historical sessions for this class (not just recent ones) for accurate metrics
        const allHistoricalSessions = rawData.filter((s: SessionData) => {
          const sNormalizedClass = normalizeClassName(s.Class);
          return s.Day.toLowerCase() === day &&
            s.Time?.substring(0, 5) === time &&
            sNormalizedClass === normalizedClass &&
            s.Location.toLowerCase() === location;
        });
        
        // Calculate metrics using ALL historical data
        const totalCheckIns = allHistoricalSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0);
        const totalCapacity = allHistoricalSessions.reduce((sum, s) => sum + (s.Capacity || 0), 0);
        const totalBooked = allHistoricalSessions.reduce((sum, s) => sum + (s.Booked || 0), 0);
        const totalLateCancelled = allHistoricalSessions.reduce((sum, s) => sum + (s.LateCancelled || 0), 0);
        const totalRevenue = allHistoricalSessions.reduce((sum, s) => sum + (s.Revenue || 0), 0);
        const totalWaitlisted = allHistoricalSessions.reduce((sum, s) => sum + (s.Waitlisted || 0), 0);
        const totalComplimentary = allHistoricalSessions.reduce((sum, s) => sum + (s.Complimentary || 0), 0);
        const totalMemberships = allHistoricalSessions.reduce((sum, s) => sum + (s.Memberships || 0), 0);
        const totalPackages = allHistoricalSessions.reduce((sum, s) => sum + (s.Packages || 0), 0);
        const totalIntroOffers = allHistoricalSessions.reduce((sum, s) => sum + (s.IntroOffers || 0), 0);
        const totalSingleClasses = allHistoricalSessions.reduce((sum, s) => sum + (s.SingleClasses || 0), 0);
        
        const sessionCount = allHistoricalSessions.length;
        const avgCheckIns = sessionCount > 0 ? totalCheckIns / sessionCount : 0;
        const fillRate = totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0;
        const cancellationRate = totalBooked > 0 ? (totalLateCancelled / totalBooked) * 100 : 0;
        const revenuePerCheckIn = totalCheckIns > 0 ? totalRevenue / totalCheckIns : 0;
        
        // Get most frequent trainer
        const trainerCounts = new Map<string, number>();
        allHistoricalSessions.forEach(s => {
          const count = trainerCounts.get(s.Trainer) || 0;
          trainerCounts.set(s.Trainer, count + 1);
        });
        const mostFrequentTrainer = Array.from(trainerCounts.entries())
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
        
        classes.push({
          id: `discontinued_${key}`,
          day: day.charAt(0).toUpperCase() + day.slice(1),
          time: time,
          class: sessions[0].Class, // Use original class name from recent session
          trainer: mostFrequentTrainer,
          location: sessions[0].Location,
          capacity: Math.round(totalCapacity / sessionCount),
          avgCheckIns: Math.round(avgCheckIns * 10) / 10,
          fillRate: Math.round(fillRate * 10) / 10,
          revenue: Math.round(totalRevenue / sessionCount),
          sessionCount,
          totalCheckIns,
          totalCapacity,
          totalBooked,
          totalLateCancelled,
          totalWaitlisted,
          totalRevenue,
          avgBooked: totalBooked / sessionCount,
          avgLateCancelled: totalLateCancelled / sessionCount,
          avgWaitlisted: totalWaitlisted / sessionCount,
          cancellationRate: Math.round(cancellationRate * 10) / 10,
          waitlistRate: totalCapacity > 0 ? Math.round((totalWaitlisted / totalCapacity) * 1000) / 10 : 0,
          revenuePerCheckIn: Math.round(revenuePerCheckIn),
          status: 'Discontinued',
          avgComplimentary: Math.round(totalComplimentary / sessionCount * 10) / 10,
          complimentaryRate: totalCheckIns > 0 ? Math.round((totalComplimentary / totalCheckIns) * 1000) / 10 : 0,
          avgMemberships: Math.round(totalMemberships / sessionCount * 10) / 10,
          avgPackages: Math.round(totalPackages / sessionCount * 10) / 10,
          avgIntroOffers: Math.round(totalIntroOffers / sessionCount * 10) / 10,
          avgSingleClasses: Math.round(totalSingleClasses / sessionCount * 10) / 10,
          bookingToCheckInRate: totalBooked > 0 ? (totalCheckIns / totalBooked) * 100 : 0,
          conflicts: [`❌ Discontinued - Last seen in week of ${format(lastWeekEnd, 'MMM dd')}`],
          recommendations: [],
          topTrainers: [],
          consistency: 0,
          trend: 'neutral',
          isDiscontinued: true
        });
      }
    });
    
    return classes;
  }, [rawData, scheduleClasses]);

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

  // Calculate location averages for high-performing filter
  const locationAverages = useMemo(() => {
    const locationStats = new Map<string, { totalCheckIns: number; totalClasses: number }>();
    
    scheduleClasses.forEach(cls => {
      const stats = locationStats.get(cls.location) || { totalCheckIns: 0, totalClasses: 0 };
      stats.totalCheckIns += cls.avgCheckIns;
      stats.totalClasses += 1;
      locationStats.set(cls.location, stats);
    });
    
    const averages = new Map<string, number>();
    locationStats.forEach((stats, location) => {
      const average = stats.totalClasses > 0 ? stats.totalCheckIns / stats.totalClasses : 0;
      averages.set(location, average);
    });
    
    return averages;
  }, [scheduleClasses]);

  // Apply Pro Scheduler filters independently (do not use global filters)
  const filteredClasses = useMemo(() => {
    // Combine regular and discontinued classes based on showDiscontinued state
    const classesToFilter = showDiscontinued 
      ? [...scheduleClasses, ...discontinuedClasses]
      : scheduleClasses;
    
    return classesToFilter.filter(cls => {
      // Location filter
      if (filters.locations.length > 0 && !filters.locations.includes(cls.location)) return false;
      // Trainer filter
      if (filters.trainers.length > 0 && !filters.trainers.includes(cls.trainer)) return false;
      // Class filter
      if (filters.classes.length > 0 && !filters.classes.includes(cls.class)) return false;
      // Active only filter
      if (filters.activeOnly && cls.status !== 'Active' && !cls.isDiscontinued) return false;
      // High-performing filter (class avg > location avg)
      if (showHighPerformingOnly) {
        const locationAvg = locationAverages.get(cls.location) || 0;
        if (cls.avgCheckIns <= locationAvg) return false;
      }
      return true;
    });
  }, [scheduleClasses, discontinuedClasses, showDiscontinued, filters, showHighPerformingOnly, locationAverages]);

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

  const TIME_SLOTS = Array.from({ length: 60 }, (_, i) => {
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
    
    const isHighPerformance = cls.fillRate > 85;
    const isHovered = hoveredClassId === cls.id;
    const isEdited = editedClasses.has(cls.id);
    const isNewlyCreated = createdClasses.has(cls.id);
    const isDiscontinued = cls.isDiscontinued || false;

    return (
      <motion.div
        key={cls.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02, y: -2 }}
        onClick={() => handleClassClick(cls)}
        onMouseEnter={() => setHoveredClassId(cls.id)}
        onMouseLeave={() => setHoveredClassId(null)}
        className={`bg-gradient-to-br ${isDiscontinued ? 'from-gray-200 to-gray-300 border-gray-400 opacity-70' : cardColor} backdrop-blur-sm border rounded-xl shadow-sm hover:shadow-lg cursor-pointer transition-all duration-300 overflow-hidden group relative ${isDiscontinued ? 'grayscale' : ''}`}
      >
        {/* Status Indicators - Top Right */}
        <div className="absolute top-1.5 right-1.5 flex gap-1 z-10">
          {isEdited && !isDiscontinued && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Revert this class to its original state?')) {
                    handleRevertClass(cls.id);
                  }
                }}
                className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full p-1 shadow-md transition-colors" 
                title="Revert to Original"
              >
                <Undo2 className="w-3 h-3" />
              </button>
              <div className="bg-orange-500 text-white rounded-full p-1 shadow-md" title="Edited Class">
                <Edit3 className="w-3 h-3" />
              </div>
            </>
          )}
          {isNewlyCreated && (
            <div className="bg-green-500 text-white rounded-full p-1 shadow-md" title="Newly Created">
              <Plus className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Collapsed View - Beautiful & Clean with Key Metrics */}
        <div className="p-2.5">
          {/* Header with Class Name and Icons */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="font-bold text-sm text-slate-900 truncate flex-1 mr-2">
              {cls.class}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isDiscontinued && (
                <div className="flex items-center gap-1 bg-gray-500 text-white rounded-md px-2 py-1" title="Discontinued Class">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-[10px] font-bold">Discontinued</span>
                </div>
              )}
              {!isDiscontinued && isHighPerformance && (
                <div className="bg-emerald-500 text-white rounded-full p-0.5" title="High performance">
                  <Star className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
          </div>

          {/* Trainer Name with Change Indicators */}
          <div className="flex items-center gap-2 text-[10px] text-slate-600 mb-2">
            {findTrainerImage(cls.trainer) ? (
              // eslint-disable-next-line jsx-a11y/img-redundant-alt
              <img src={findTrainerImage(cls.trainer) as string} alt={`${cls.trainer} avatar`} className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <Users className="w-2.5 h-2.5" />
            )}
            <span className="truncate flex-1">{cls.trainer}</span>
            
            {/* Trainer Change Indicators */}
            {!isDiscontinued && cls.lastWeekTrainer && cls.lastWeekTrainer !== cls.trainer && (
              <div 
                className="bg-amber-500 text-white rounded-full p-0.5 flex-shrink-0" 
                title={`Trainer changed from ${cls.lastWeekTrainer}`}
              >
                <ArrowRightLeft className="w-2.5 h-2.5" />
              </div>
            )}
            {!isDiscontinued && cls.bestPerformingTrainer && cls.bestPerformingTrainer !== cls.trainer && (
              <div 
                className="bg-purple-500 text-white rounded-full p-0.5 flex-shrink-0" 
                title={`Best performer: ${cls.bestPerformingTrainer}`}
              >
                <Award className="w-2.5 h-2.5" />
              </div>
            )}
          </div>

          {/* Metrics - Compact Display */}
          <div className="flex items-center justify-between gap-3">
            {/* Fill Rate */}
            <div className="flex items-center gap-1.5 flex-1">
              <div className={`text-sm font-bold ${
                cls.sessionCount === 0 ? 'text-gray-400' :
                cls.fillRate >= 80 ? 'text-green-600' : 
                cls.fillRate >= 60 ? 'text-amber-600' : 
                'text-red-600'
              }`}>
                {cls.sessionCount === 0 ? '-' : `${cls.fillRate}%`}
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
              <div className={`text-sm font-bold ${
                cls.sessionCount === 0 ? 'text-gray-400' : 'text-emerald-600'
              }`}>
                {cls.sessionCount === 0 ? '-' : cls.avgCheckIns}
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
                      {cls.sessionCount > 0 ? (
                        <>
                          <div className="w-10 bg-gray-200 rounded-full h-1">
                            <div 
                              className={`bg-gradient-to-r ${fillRateColor} h-1 rounded-full transition-all duration-500`}
                              style={{ width: `${Math.min(cls.fillRate, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-bold text-gray-800">{cls.fillRate}%</span>
                        </>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400">-</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium text-gray-600">Attendance</span>
                    <span className={`font-bold ${cls.sessionCount === 0 ? 'text-gray-400' : 'text-gray-800'}`}>
                      {cls.sessionCount === 0 ? '-' : `${cls.avgCheckIns}/${cls.capacity}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium text-gray-600">Revenue</span>
                    <span className={`font-bold ${cls.sessionCount === 0 ? 'text-gray-400' : 'text-emerald-600'}`}>
                      {cls.sessionCount === 0 ? '-' : `₹${(cls.revenue/100).toLocaleString('en-IN')}`}
                    </span>
                  </div>
                </div>

                {/* No Data Message */}
                {cls.sessionCount === 0 && (
                  <div className="bg-amber-50/70 rounded-lg p-2 text-center">
                    <div className="text-[10px] font-semibold text-amber-700">No Historical Data</div>
                    <div className="text-[9px] text-amber-600 mt-0.5">This class hasn't been held yet</div>
                  </div>
                )}

                {/* Client Attendance Patterns */}
                {(() => {
                  // Calculate attendance patterns based on historical sessions for this class
                  const avgCheckIns = cls.avgCheckIns;
                  
                  // Don't show patterns if no historical data
                  if (cls.sessionCount === 0) return null;
                  
                  // Estimate client patterns based on fill rate and historical data
                  const estimateClientPatterns = () => {
                    if (avgCheckIns === 0) return { fixed: 0, firstTime: 0, unpredictable: 0 };
                    
                    // Higher fill rates indicate more consistent attendance
                    const consistencyFactor = cls.fillRate / 100;
                    
                    // Estimate fixed attendees (regular weekly attendees)
                    // Higher fill rate and more sessions = more fixed attendees
                    const fixedRatio = Math.min(0.4 + (consistencyFactor * 0.3), 0.7);
                    const fixed = parseFloat((avgCheckIns * fixedRatio).toFixed(1));
                    
                    // Estimate first-time attendees (based on class popularity and newness)
                    // Popular classes get more first-timers
                    const firstTimeRatio = cls.fillRate > 80 ? 0.15 : cls.fillRate > 60 ? 0.2 : 0.25;
                    const firstTime = parseFloat((avgCheckIns * firstTimeRatio).toFixed(1));
                    
                    // Rest are unpredictable/occasional attendees
                    const unpredictable = parseFloat(Math.max(0, avgCheckIns - fixed - firstTime).toFixed(1));
                    
                    return { fixed, firstTime, unpredictable };
                  };

                  const patterns = estimateClientPatterns();
                  const total = patterns.fixed + patterns.firstTime + patterns.unpredictable;

                  return total > 0 ? (
                    <div className="bg-blue-50/70 rounded-lg p-2 space-y-1">
                      <div className="text-[10px] font-semibold text-blue-700 mb-1.5">Client Patterns</div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px]">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <span className="text-gray-600">Fixed Weekly</span>
                          </div>
                          <span className="font-bold text-green-700">{patterns.fixed}</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px]">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            <span className="text-gray-600">First-Timers</span>
                          </div>
                          <span className="font-bold text-blue-700">{patterns.firstTime}</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px]">
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                            <span className="text-gray-600">Occasional</span>
                          </div>
                          <span className="font-bold text-amber-700">{patterns.unpredictable}</span>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Show Similar Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSimilarClasses(cls.id);
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white text-[9px] font-medium py-1.5 px-2 rounded-md transition-all duration-200 flex items-center justify-center gap-1 shadow-sm hover:shadow-md"
                >
                  <Repeat className="w-2.5 h-2.5" />
                  Show Similar
                </button>

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
      <div className="glass-card rounded-2xl p-3 border border-white/20 shadow-xl backdrop-blur-xl mb-6">
        <div className="grid grid-cols-2 md:grid-cols-8 gap-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`p-3 rounded-xl border transition-all duration-300 ${
              viewMode === 'calendar'
                ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white border-blue-500/30 shadow-lg scale-105'
                : 'bg-white/70 backdrop-blur-sm border-slate-200 hover:border-blue-300 hover:bg-white/90 text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4 mx-auto mb-1" />
            <div className="text-xs font-bold">Calendar</div>
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`p-3 rounded-xl border transition-all duration-300 ${
              viewMode === 'analytics'
                ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white border-blue-500/30 shadow-lg scale-105'
                : 'bg-white/70 backdrop-blur-sm border-slate-200 hover:border-blue-300 hover:bg-white/90 text-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4 mx-auto mb-1" />
            <div className="text-xs font-bold">Analytics</div>
          </button>
          <button
            onClick={() => setShowTrainerAnalytics(!showTrainerAnalytics)}
            className={`p-3 rounded-xl border transition-all duration-300 ${
              showTrainerAnalytics
                ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white border-blue-500/30 shadow-lg scale-105'
                : 'bg-white/70 backdrop-blur-sm border-slate-200 hover:border-emerald-300 hover:bg-white/90 text-slate-700'
            }`}
          >
            <Users className="w-4 h-4 mx-auto mb-1" />
            <div className="text-xs font-bold">Trainers</div>
          </button>
          <button
            onClick={() => setShowConflictResolver(!showConflictResolver)}
            className={`p-3 rounded-xl border transition-all duration-300 ${
              showConflictResolver
                ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white border-blue-500/30 shadow-lg scale-105'
                : 'bg-white/70 backdrop-blur-sm border-slate-200 hover:border-red-300 hover:bg-white/90 text-slate-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
            <div className="text-xs font-bold">Conflicts</div>
          </button>
          <button
            onClick={() => setShowOptimizationPanel(!showOptimizationPanel)}
            className={`p-3 rounded-xl border transition-all duration-300 ${
              showOptimizationPanel
                ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white border-blue-500/30 shadow-lg scale-105'
                : 'bg-white/70 backdrop-blur-sm border-slate-200 hover:border-purple-300 hover:bg-white/90 text-slate-700'
            }`}
          >
            <Star className="w-4 h-4 mx-auto mb-1" />
            <div className="text-xs font-bold">Optimize</div>
          </button>
          <button
            onClick={() => setShowHighPerformingOnly(!showHighPerformingOnly)}
            className={`p-3 rounded-xl border transition-all duration-300 ${
              showHighPerformingOnly
                ? 'bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 text-white border-green-500/30 shadow-lg scale-105'
                : 'bg-white/70 backdrop-blur-sm border-slate-200 hover:border-green-300 hover:bg-white/90 text-slate-700'
            }`}
          >
            <Award className="w-4 h-4 mx-auto mb-1" />
            <div className="text-xs font-bold">Top Classes</div>
          </button>
          <button
            onClick={() => setShowDiscontinued(!showDiscontinued)}
            className={`p-3 rounded-xl border transition-all duration-300 ${
              showDiscontinued
                ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white border-blue-500/30 shadow-lg scale-105'
                : 'bg-white/70 backdrop-blur-sm border-slate-200 hover:border-gray-400 hover:bg-white/90 text-slate-700'
            }`}
          >
            <X className="w-4 h-4 mx-auto mb-1" />
            <div className="text-xs font-bold">Discontinued</div>
            {discontinuedClasses.length > 0 && (
              <div className="text-[9px] text-center mt-0.5">({discontinuedClasses.length})</div>
            )}
          </button>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`p-3 rounded-xl border transition-all duration-300 ${
              showAdvancedFilters
                ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white border-blue-500/30 shadow-lg scale-105'
                : 'bg-white/70 backdrop-blur-sm border-slate-200 hover:border-amber-300 hover:bg-white/90 text-slate-700'
            }`}
          >
            <Edit3 className="w-4 h-4 mx-auto mb-1" />
            <div className="text-xs font-bold">Filters</div>
          </button>
        </div>
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg mb-6">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-slate-700 p-2 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Trainer Analytics</h2>
                <p className="text-slate-600 text-xs">Performance metrics and schedule breakdown</p>
              </div>
            </div>
            <div className="bg-slate-700 text-white px-4 py-2 rounded-lg">
              <div className="text-xl font-bold">{Object.keys(trainerAnalytics).length}</div>
              <div className="text-[10px] uppercase tracking-wide opacity-80">Trainers</div>
            </div>
          </div>
          <div className="p-8">
            <div className="space-y-8">
              {Object.entries(trainerAnalytics).map(([trainerName, analytics]) => {
                const workloadColors = {
                  Light: 'bg-slate-100 text-slate-700',
                  Medium: 'bg-slate-200 text-slate-800',
                  Heavy: 'bg-slate-300 text-slate-900',
                  Overloaded: 'bg-slate-400 text-white'
                };
                
                // Calculate location/day breakdown (exclude discontinued classes)
                const trainerClasses = filteredClasses.filter(c => c.trainer === trainerName && !c.isDiscontinued);
                const locationDayMap = new Map<string, Map<string, number>>();
                
                trainerClasses.forEach(cls => {
                  if (!locationDayMap.has(cls.location)) {
                    locationDayMap.set(cls.location, new Map());
                  }
                  const dayMap = locationDayMap.get(cls.location)!;
                  dayMap.set(cls.day, (dayMap.get(cls.day) || 0) + 1);
                });
                
                return (
                  <div key={trainerName} className="bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 rounded-2xl p-6 border-2 border-gray-200 shadow-lg hover:shadow-2xl hover:border-green-300 transition-all duration-300 transform hover:-translate-y-1">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5 pb-5 border-b-2 border-gray-200">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const img = findTrainerImage(trainerName);
                          const pct = Math.min((analytics.totalHours / 15) * 100, 100);
                          const color = getWorkloadColor(analytics.totalHours);
                          return (
                            <div className="flex items-center gap-3">
                              <div className="self-start">
                                <CircularAvatar percent={pct} color={color} size={56} stroke={4} imgSrc={img} initials={trainerName.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()} />
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 text-lg">{trainerName}</div>
                                <div className="text-xs text-gray-500">{analytics.totalClasses} classes • {analytics.totalHours}h/week</div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <span className={`px-3 py-1.5 text-sm font-bold rounded-full ${workloadColors[analytics.workload]}`}>
                        {analytics.workload}
                      </span>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-semibold mb-1 uppercase tracking-wide">Avg Fill</div>
                        <div className="text-xl font-bold text-slate-900">{Math.round(analytics.avgFillRate)}%</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-semibold mb-1 uppercase tracking-wide">Revenue</div>
                        <div className="text-base font-bold text-slate-900">₹{Math.round(analytics.totalRevenue/100).toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-semibold mb-1 uppercase tracking-wide">Locations</div>
                        <div className="text-xl font-bold text-slate-900">{analytics.locations.length}</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-semibold mb-1 uppercase tracking-wide">Formats</div>
                        <div className="text-xl font-bold text-slate-900">{analytics.classTypes.length}</div>
                      </div>
                    </div>
                    
                    {/* Location/Day Breakdown */}
                    <div className="mt-4">
                      <div className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-2 px-1 uppercase tracking-wide">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        Weekly Schedule
                      </div>
                      <div className="space-y-4">
                        {Array.from(locationDayMap.entries()).map(([location, dayMap]) => (
                          <div key={location} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                            <div className="font-medium text-xs text-slate-700 mb-2">
                              {location}
                            </div>
                            <div className="grid grid-cols-7 gap-1.5">
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(fullDay => {
                                const count = dayMap.get(fullDay) || 0;
                                const shortDay = fullDay.substring(0, 1);
                                return (
                                  <div
                                    key={fullDay}
                                    className={`text-center rounded py-1.5 text-[11px] font-semibold transition-colors ${
                                      count > 0
                                        ? 'bg-slate-700 text-white'
                                        : 'bg-slate-200 text-slate-400'
                                    }`}
                                    title={`${fullDay}: ${count} class${count !== 1 ? 'es' : ''}`}
                                  >
                                    <div>{shortDay}</div>
                                    {count > 0 && <div className="text-[9px] mt-0.5 opacity-90">{count}</div>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
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
                  filteredClasses.filter(cls => !cls.isDiscontinued).forEach(cls => {
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
                filteredClasses.filter(cls => !cls.isDiscontinued).forEach(cls => {
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
      {viewMode === 'calendar' && !showTrainerAnalytics && (
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
              
              {/* Day headers with class count and collapsible format mix */}
              {DAYS_OF_WEEK.map(day => {
                const dayClasses = filteredClasses.filter(cls => cls.day === day.key);
                const isExpanded = expandedDayFormats.has(day.key);
                
                // Calculate format mix for this day grouped by difficulty
                const formatCounts = dayClasses.reduce((acc, cls) => {
                  const format = cls.class || 'Unknown';
                  acc[format] = (acc[format] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                
                // Group formats by difficulty
                const groupedFormats = {
                  beginner: [] as Array<[string, number]>,
                  intermediate: [] as Array<[string, number]>,
                  advanced: [] as Array<[string, number]>
                };
                
                Object.entries(formatCounts).forEach(([format, count]) => {
                  const difficulty = getFormatDifficulty(format);
                  groupedFormats[difficulty].push([format, count]);
                });
                
                // Sort each group by count
                groupedFormats.beginner.sort((a, b) => b[1] - a[1]);
                groupedFormats.intermediate.sort((a, b) => b[1] - a[1]);
                groupedFormats.advanced.sort((a, b) => b[1] - a[1]);
                
                const totalFormats = Object.keys(formatCounts).length;
                
                return (
                  <motion.div 
                    key={day.key} 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-medium text-slate-800 text-sm text-center bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border border-slate-200 overflow-hidden"
                  >
                    <div 
                      className="p-2 cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => {
                        setExpandedDayFormats(prev => {
                          const next = new Set(prev);
                          if (next.has(day.key)) {
                            next.delete(day.key);
                          } else {
                            next.add(day.key);
                          }
                          return next;
                        });
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{day.short}</span>
                        <ChevronDown className={`w-3 h-3 text-blue-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                      <div className="text-xs text-blue-600 font-bold mt-1">{dayClasses.length}</div>
                    </div>
                    
                    {/* Collapsible Format Mix */}
                    <AnimatePresence>
                      {isExpanded && totalFormats > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-200 bg-white"
                        >
                          <div className="p-2 max-h-[300px] overflow-y-auto">
                            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">Format Mix ({totalFormats})</div>
                            <div className="space-y-2">
                              {/* Beginner Formats */}
                              {groupedFormats.beginner.length > 0 && (
                                <div>
                                  <div className="text-[8px] uppercase tracking-wider text-green-600 font-bold mb-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Beginner ({groupedFormats.beginner.length})
                                  </div>
                                  <div className="space-y-0.5 ml-3">
                                    {groupedFormats.beginner.map(([format, count]) => (
                                      <div key={format} className="flex items-center justify-between text-[10px] gap-1 hover:bg-green-50 px-1 py-0.5 rounded">
                                        <span className="text-slate-700 text-left flex-1" title={format}>
                                          {format}
                                        </span>
                                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                                          {count}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Intermediate Formats */}
                              {groupedFormats.intermediate.length > 0 && (
                                <div>
                                  <div className="text-[8px] uppercase tracking-wider text-blue-600 font-bold mb-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Intermediate ({groupedFormats.intermediate.length})
                                  </div>
                                  <div className="space-y-0.5 ml-3">
                                    {groupedFormats.intermediate.map(([format, count]) => (
                                      <div key={format} className="flex items-center justify-between text-[10px] gap-1 hover:bg-blue-50 px-1 py-0.5 rounded">
                                        <span className="text-slate-700 text-left flex-1" title={format}>
                                          {format}
                                        </span>
                                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                                          {count}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Advanced Formats */}
                              {groupedFormats.advanced.length > 0 && (
                                <div>
                                  <div className="text-[8px] uppercase tracking-wider text-red-600 font-bold mb-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Advanced ({groupedFormats.advanced.length})
                                  </div>
                                  <div className="space-y-0.5 ml-3">
                                    {groupedFormats.advanced.map(([format, count]) => (
                                      <div key={format} className="flex items-center justify-between text-[10px] gap-1 hover:bg-red-50 px-1 py-0.5 rounded">
                                        <span className="text-slate-700 text-left flex-1" title={format}>
                                          {format}
                                        </span>
                                        <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                                          {count}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                    {(() => {
                      const displayLocations = filters.locations.length > 0 ? filters.locations : uniqueLocations;
                      return displayLocations.filter(location => filteredClasses.filter(cls => cls.location === location).length > 0).length;
                    })()} locations
                  </span>
                </h3>
              </div>

              {/* Combined Scrollable Container for Header and Body */}
              <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
                <div className="min-w-max">
                  {/* Header Row - Days with Location Sub-columns */}
                  <div className="sticky top-0 z-20 bg-gradient-to-r from-gray-100 to-gray-200 shadow-sm border-b-2 border-gray-300">
                    <div className="flex">
                      <div className="sticky left-0 z-30 flex-shrink-0 w-24 border-r-2 border-gray-300 p-3 flex items-center justify-center bg-gray-100 shadow-sm">
                        <span className="text-sm font-bold text-gray-700">Time</span>
                      </div>
                      {DAYS_OF_WEEK.map((day) => {
                        const dayClasses = filteredClasses.filter(cls => cls.day === day.key);
                        const activeLocations = filters.locations.length > 0 ? filters.locations : uniqueLocations;
                        
                        return (
                          <div key={day.key} className="flex-1 min-w-[280px] border-r-2 border-gray-300 last:border-r-0">
                            {/* Day Header - Minimalistic Design */}
                            <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-b border-gray-200 p-3 text-center">
                              <div className="font-bold text-gray-900 text-sm mb-1">{day.short}</div>
                              <div className="inline-flex items-center justify-center bg-white/70 rounded-full px-2 py-0.5 shadow-sm">
                                <span className="text-xs font-medium text-gray-700">{dayClasses.length}</span>
                              </div>
                            </div>
                            {/* Location Sub-headers - Minimalistic */}
                            <div className="flex">
                              {activeLocations.map((location, idx) => {
                                const locationDayClasses = dayClasses.filter(cls => cls.location === location);
                                return (
                                  <div 
                                    key={`${day.key}-${location}`} 
                                    className={`flex-1 min-w-[130px] p-2 text-center bg-white/90 border-r border-gray-100 ${idx === activeLocations.length - 1 ? 'border-r-0' : ''}`}
                                  >
                                    <div className="text-[10px] font-semibold text-gray-600 truncate flex items-center justify-center gap-1" title={location}>
                                      <MapPin className="w-2 h-2 text-blue-400" />
                                      <span>{location.split(',')[0]}</span>
                                    </div>
                                    {locationDayClasses.length > 0 && (
                                      <div className="inline-flex items-center justify-center bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 mt-1">
                                        <span className="text-[9px] font-bold">{locationDayClasses.length}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots Body */}
                  <div className="bg-white">
                {TIME_SLOTS.map((slot) => {
                  const slotHour = parseInt(slot.time24.split(':')[0]);
                  const isNonFunctional = slotHour < 7 || slotHour > 20;
                  if (!showNonFunctionalHours && isNonFunctional) return null;

                  const slotClasses = filteredClasses.filter(cls => cls.time === slot.time24);
                  const hasClassesAtThisTime = slotClasses.length > 0;

                  return (
                    <div key={slot.time24} className={`flex min-w-max border-b border-gray-100 ${hasClassesAtThisTime ? 'bg-white' : 'bg-gray-25'}`}>
                      {/* Time Label */}
                      <div className={`sticky left-0 z-20 flex-shrink-0 w-24 border-r-2 border-gray-200 p-2 flex items-center justify-center shadow-sm ${hasClassesAtThisTime ? 'bg-gradient-to-r from-blue-50 to-blue-100' : 'bg-gray-50'}`}>
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
                        // const dayClasses = filteredClasses.filter(cls => cls.day === day.key);
                        const activeLocations = filters.locations.length > 0 ? filters.locations : uniqueLocations;
                        
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
                                      {locationSlotClasses.map(cls => (
                                        <div key={cls.id} className="transform scale-90 origin-top">
                                          {renderClassCard(cls)}
                                        </div>
                                      ))}
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
                </div>
              </div>

              {(() => {
                const displayLocations = filters.locations.length > 0 ? filters.locations : uniqueLocations;
                return displayLocations.length === 0 && (
                  <div className="text-center py-12">
                    <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-gray-600 mb-2">No Locations Found</p>
                    <p className="text-gray-500">No class data available for multi-location view</p>
                  </div>
                );
              })()}
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

          {/* Compact Heatmap View - Day-based Class Mix */}
          {calendarViewMode === 'compact' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-slate-100 to-blue-100 px-6 py-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Weekly Class Format Heatmap
                  <span className="text-xs bg-blue-500 text-white px-3 py-1 rounded-full font-bold">
                    {filteredClasses.length} classes
                  </span>
                </h3>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-7 gap-4">
                  {DAYS_OF_WEEK.map((day) => {
                    // Get classes for this day
                    const dayClasses = filteredClasses.filter(cls => cls.day === day.key);
                    
                    // Group classes by actual format names
                    const formatCounts = dayClasses.reduce((acc, cls) => {
                      const formatName = cls.class || 'Unknown';
                      acc[formatName] = (acc[formatName] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    
                    // Generate colors dynamically based on format name hash
                    const getFormatColor = (formatName: string): string => {
                      const colors = [
                        'bg-purple-500', 'bg-pink-500', 'bg-red-500', 'bg-orange-500',
                        'bg-blue-500', 'bg-gray-500', 'bg-fuchsia-500', 'bg-rose-500',
                        'bg-amber-500', 'bg-teal-500', 'bg-green-500', 'bg-indigo-500',
                        'bg-cyan-500', 'bg-violet-500', 'bg-emerald-500', 'bg-lime-500'
                      ];
                      // Simple hash function to get consistent colors
                      let hash = 0;
                      for (let i = 0; i < formatName.length; i++) {
                        hash = formatName.charCodeAt(i) + ((hash << 5) - hash);
                      }
                      return colors[Math.abs(hash) % colors.length];
                    };
                    
                    return (
                      <motion.div
                        key={day.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: DAYS_OF_WEEK.indexOf(day) * 0.1 }}
                        className="bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
                      >
                        {/* Day Header */}
                        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-t-xl p-3 text-center border-b border-slate-200">
                          <div className="font-bold text-slate-900 text-sm mb-1">{day.short}</div>
                          <div className="inline-flex items-center justify-center bg-white/70 rounded-full px-2 py-1 shadow-sm">
                            <span className="text-xs font-medium text-slate-700">{dayClasses.length}</span>
                          </div>
                        </div>
                        
                        {/* Format Heatmap */}
                        <div className="p-3 space-y-2 min-h-[200px]">
                          {dayClasses.length === 0 ? (
                            <div className="text-center text-slate-400 text-xs py-8">
                              No classes
                            </div>
                          ) : (
                            <>
                              {/* Format Distribution */}
                              <div className="space-y-1">
                                {Object.entries(formatCounts)
                                  .sort(([,a], [,b]) => b - a)
                                  .map(([format, count]) => {
                                    const percentage = (count / dayClasses.length) * 100;
                                    return (
                                      <div key={format} className="relative">
                                        <div className="flex items-center justify-between text-xs mb-0.5">
                                          <span className="font-medium text-slate-700 truncate" title={format}>
                                            {format}
                                          </span>
                                          <span className="font-bold text-slate-600 ml-1">
                                            {count}
                                          </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            transition={{ delay: 0.2, duration: 0.8 }}
                                            className={`h-full ${getFormatColor(format)} rounded-full shadow-sm`}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                              
                              {/* Time Slots Preview */}
                              <div className="pt-2 border-t border-slate-100">
                                <div className="text-xs text-slate-500 mb-1 font-medium">Time Slots:</div>
                                <div className="flex flex-wrap gap-1">
                                  {Array.from(new Set(dayClasses.map(cls => cls.time)))
                                    .sort()
                                    .map((time) => {
                                      const timeClasses = dayClasses.filter(cls => cls.time === time);
                                      const dominantFormatName = timeClasses[0].class || 'Unknown';
                                      return (
                                        <div
                                          key={time}
                                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white shadow-sm ${getFormatColor(dominantFormatName)}`}
                                          title={`${time} - ${timeClasses.length} class${timeClasses.length > 1 ? 'es' : ''}: ${dominantFormatName}`}
                                        >
                                          {time.slice(0, 5)}
                                          {timeClasses.length > 1 && (
                                            <span className="ml-1 bg-white/20 rounded-full px-1">
                                              {timeClasses.length}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                              
                              {/* Quick Stats */}
                              <div className="pt-2 border-t border-slate-100">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="text-center">
                                    <div className="text-slate-500">Avg Fill</div>
                                    <div className={`font-bold ${
                                      dayClasses.reduce((sum, cls) => sum + cls.fillRate, 0) / dayClasses.length >= 75 
                                        ? 'text-green-600' 
                                        : 'text-amber-600'
                                    }`}>
                                      {Math.round(dayClasses.reduce((sum, cls) => sum + cls.fillRate, 0) / dayClasses.length)}%
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-slate-500">Formats</div>
                                    <div className="font-bold text-blue-600">
                                      {Object.keys(formatCounts).length}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                
                {/* Legend - Show actual formats */}
                <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h4 className="font-semibold text-slate-800 text-sm mb-3">Format Legend</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {Array.from(new Set(filteredClasses.map(cls => cls.class || 'Unknown')))
                      .sort()
                      .map((formatName) => {
                        // Use the same color function
                        const getFormatColor = (formatName: string): string => {
                          const colors = [
                            'bg-purple-500', 'bg-pink-500', 'bg-red-500', 'bg-orange-500',
                            'bg-blue-500', 'bg-gray-500', 'bg-fuchsia-500', 'bg-rose-500',
                            'bg-amber-500', 'bg-teal-500', 'bg-green-500', 'bg-indigo-500',
                            'bg-cyan-500', 'bg-violet-500', 'bg-emerald-500', 'bg-lime-500'
                          ];
                          let hash = 0;
                          for (let i = 0; i < formatName.length; i++) {
                            hash = formatName.charCodeAt(i) + ((hash << 5) - hash);
                          }
                          return colors[Math.abs(hash) % colors.length];
                        };
                        
                        return (
                          <div key={formatName} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getFormatColor(formatName)} shadow-sm`}></div>
                            <span className="text-xs font-medium text-slate-700 truncate" title={formatName}>{formatName}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline View - Enhanced Premium UI */}
          {calendarViewMode === 'timeline' && (
            <div className="relative py-4">
              {TIME_SLOTS.map((slot, idx) => {
                const slotClasses = filteredClasses.filter(cls => cls.time === slot.time24);
                const hasClasses = slotClasses.length > 0;
                return (
                  <motion.div 
                    key={slot.time24} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="flex gap-6 mb-8 relative group"
                  >
                    {/* Enhanced Timeline with Glow Effects */}
                    <div className="flex flex-col items-center relative z-10">
                      <motion.div 
                        whileHover={{ scale: 1.2, rotate: 180 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className={`relative w-5 h-5 rounded-full shadow-lg transition-all ${
                          hasClasses 
                            ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 ring-4 ring-blue-100 shadow-blue-500/50' 
                            : 'bg-gradient-to-br from-slate-300 to-slate-400 ring-2 ring-slate-100'
                        }`}
                      >
                        {hasClasses && (
                          <motion.div
                            className="absolute inset-0 rounded-full bg-blue-400"
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          />
                        )}
                      </motion.div>
                      {idx < TIME_SLOTS.length - 1 && (
                        <div className={`w-1 h-full relative ${
                          hasClasses 
                            ? 'bg-gradient-to-b from-blue-400 via-blue-300 to-slate-200' 
                            : 'bg-gradient-to-b from-slate-200 to-slate-100'
                        } rounded-full`}>
                          {hasClasses && (
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/30 to-transparent blur-sm" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Time and Classes with Enhanced Card */}
                    <div className="flex-1 pb-6">
                      <div className={`inline-flex items-center gap-3 mb-4 px-4 py-2 rounded-xl transition-all ${
                        hasClasses 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' 
                          : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600'
                      }`}>
                        <Clock className="w-4 h-4" />
                        <span className="font-bold text-lg">{slot.time12}</span>
                        {hasClasses && (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full font-bold text-sm ml-2"
                          >
                            {slotClasses.length} {slotClasses.length === 1 ? 'class' : 'classes'}
                          </motion.span>
                        )}
                      </div>
                      {hasClasses ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {slotClasses.map(cls => renderClassCard(cls))}
                        </div>
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm text-slate-400 italic py-6 px-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                            <span className="text-slate-400 text-xs">—</span>
                          </div>
                          <span>No classes scheduled</span>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Comprehensive Analytics Section */}
      {viewMode === 'analytics' && (() => {
        // Calculate comprehensive analytics
        const allSessions = rawData.filter((session: SessionData) => {
          const sessionDate = parseISO(session.Date);
          return isWithinInterval(sessionDate, { start: filters.dateFrom, end: filters.dateTo });
        });

        const totalSessions = allSessions.length;
        const totalCheckIns = allSessions.reduce((sum, s) => sum + s.CheckedIn, 0);
        const totalRevenue = allSessions.reduce((sum, s) => sum + s.Revenue, 0);
        const totalCapacity = allSessions.reduce((sum, s) => sum + s.Capacity, 0);
        const avgFillRate = totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0;
        const totalCancellations = allSessions.reduce((sum, s) => sum + s.LateCancelled, 0);
        const totalBooked = allSessions.reduce((sum, s) => sum + s.Booked, 0);
        const cancelRate = totalBooked > 0 ? (totalCancellations / totalBooked) * 100 : 0;

        // Group by location
        const locationStats = allSessions.reduce((acc, session) => {
          if (!acc[session.Location]) {
            acc[session.Location] = { sessions: 0, checkIns: 0, revenue: 0, capacity: 0 };
          }
          acc[session.Location].sessions++;
          acc[session.Location].checkIns += session.CheckedIn;
          acc[session.Location].revenue += session.Revenue;
          acc[session.Location].capacity += session.Capacity;
          return acc;
        }, {} as Record<string, { sessions: number; checkIns: number; revenue: number; capacity: number }>);

        // Group by trainer
        const trainerStats = allSessions.reduce((acc, session) => {
          if (!acc[session.Trainer]) {
            acc[session.Trainer] = { sessions: 0, checkIns: 0, revenue: 0, avgFill: 0 };
          }
          acc[session.Trainer].sessions++;
          acc[session.Trainer].checkIns += session.CheckedIn;
          acc[session.Trainer].revenue += session.Revenue;
          return acc;
        }, {} as Record<string, { sessions: number; checkIns: number; revenue: number; avgFill: number }>);

        // Calculate avg fill for trainers
        Object.keys(trainerStats).forEach(trainer => {
          const trainerSessions = allSessions.filter(s => s.Trainer === trainer);
          const totalCap = trainerSessions.reduce((sum, s) => sum + s.Capacity, 0);
          trainerStats[trainer].avgFill = totalCap > 0 ? (trainerStats[trainer].checkIns / totalCap) * 100 : 0;
        });

        // Group by format with difficulty
        const formatStats = allSessions.reduce((acc, session) => {
          const format = session.Class;
          if (!acc[format]) {
            const difficulty = getFormatDifficulty(format);
            acc[format] = { sessions: 0, checkIns: 0, revenue: 0, capacity: 0, difficulty };
          }
          acc[format].sessions++;
          acc[format].checkIns += session.CheckedIn;
          acc[format].revenue += session.Revenue;
          acc[format].capacity += session.Capacity;
          return acc;
        }, {} as Record<string, { sessions: number; checkIns: number; revenue: number; capacity: number; difficulty: string }>);

        // Time slot performance
        const timeSlotStats = allSessions.reduce((acc, session) => {
          const time = session.Time;
          if (!acc[time]) {
            acc[time] = { sessions: 0, checkIns: 0, revenue: 0, fillRate: 0 };
          }
          acc[time].sessions++;
          acc[time].checkIns += session.CheckedIn;
          acc[time].revenue += session.Revenue;
          return acc;
        }, {} as Record<string, { sessions: number; checkIns: number; revenue: number; fillRate: number }>);
        
        // Use the timeSlotStats for calculations
        console.log('Time slot stats:', timeSlotStats);

        // Top performers
        const topFormats = Object.entries(formatStats)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 5);
        const topTrainers = Object.entries(trainerStats)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 5);
        const topLocations = Object.entries(locationStats)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 3);

        return (
          <div className="space-y-6">
            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-6 shadow-2xl overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="text-blue-200 text-sm font-bold uppercase tracking-widest mb-2">Total Sessions</div>
                  <div className="text-5xl font-black text-white mb-2">{totalSessions.toLocaleString()}</div>
                  <div className="text-blue-300 text-xs">Across all locations</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 rounded-2xl p-6 shadow-2xl overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="text-emerald-200 text-sm font-bold uppercase tracking-widest mb-2">Check-Ins</div>
                  <div className="text-5xl font-black text-white mb-2">{totalCheckIns.toLocaleString()}</div>
                  <div className="text-emerald-300 text-xs">Total attendances</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative bg-gradient-to-br from-purple-900 via-violet-900 to-indigo-900 rounded-2xl p-6 shadow-2xl overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="text-purple-200 text-sm font-bold uppercase tracking-widest mb-2">Avg Fill Rate</div>
                  <div className="text-5xl font-black text-white mb-2">{avgFillRate.toFixed(1)}%</div>
                  <div className="text-purple-300 text-xs">Overall utilization</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 rounded-2xl p-6 shadow-2xl overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="text-amber-200 text-sm font-bold uppercase tracking-widest mb-2">Revenue</div>
                  <div className="text-5xl font-black text-white mb-2">{formatCurrency(totalRevenue)}</div>
                  <div className="text-amber-300 text-xs">Total earnings</div>
                </div>
              </motion.div>
            </div>

            {/* Top Performers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Formats */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    Top Formats by Revenue
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {topFormats.map(([format, stats], idx) => (
                    <motion.div
                      key={format}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50 hover:from-blue-50 hover:to-indigo-50 transition-all"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm truncate">{format}</div>
                        <div className="text-xs text-slate-500">{stats.sessions} sessions • {stats.checkIns} check-ins</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-700 text-sm">{formatCurrency(stats.revenue)}</div>
                        <div className="text-xs text-slate-500">{stats.capacity > 0 ? ((stats.checkIns / stats.capacity) * 100).toFixed(0) : 0}% fill</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Top Trainers */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    Top Trainers by Revenue
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {topTrainers.map(([trainer, stats], idx) => (
                    <motion.div
                      key={trainer}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-emerald-50 hover:from-emerald-50 hover:to-teal-50 transition-all"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm truncate">{trainer}</div>
                        <div className="text-xs text-slate-500">{stats.sessions} sessions • {stats.avgFill.toFixed(0)}% fill</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-700 text-sm">{formatCurrency(stats.revenue)}</div>
                        <div className="text-xs text-slate-500">{stats.checkIns} check-ins</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Top Locations */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    Top Locations by Revenue
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {topLocations.map(([location, stats], idx) => (
                    <motion.div
                      key={location}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-purple-50 hover:from-purple-50 hover:to-pink-50 transition-all"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white font-bold flex items-center justify-center text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm truncate">{location}</div>
                        <div className="text-xs text-slate-500">{stats.sessions} sessions</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-700 text-sm">{formatCurrency(stats.revenue)}</div>
                        <div className="text-xs text-slate-500">{stats.capacity > 0 ? ((stats.checkIns / stats.capacity) * 100).toFixed(0) : 0}% fill</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Format Difficulty Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-800">Format Difficulty Distribution</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['beginner', 'intermediate', 'advanced'].map((difficulty) => {
                    const difficultyFormats = Object.entries(formatStats).filter(([_, stats]) => stats.difficulty === difficulty);
                    const totalDiffSessions = difficultyFormats.reduce((sum, [_, stats]) => sum + stats.sessions, 0);
                    const totalDiffRevenue = difficultyFormats.reduce((sum, [_, stats]) => sum + stats.revenue, 0);
                    const color = difficulty === 'beginner' ? 'green' : difficulty === 'intermediate' ? 'blue' : 'red';
                    
                    return (
                      <motion.div
                        key={difficulty}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`p-5 rounded-xl bg-gradient-to-br from-${color}-50 to-${color}-100 border-2 border-${color}-200`}
                      >
                        <div className={`text-${color}-700 text-xs font-bold uppercase tracking-widest mb-2`}>{difficulty}</div>
                        <div className="text-3xl font-black text-slate-800 mb-1">{difficultyFormats.length}</div>
                        <div className="text-xs text-slate-600 mb-3">formats</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Sessions:</span>
                            <span className="font-bold text-slate-800">{totalDiffSessions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Revenue:</span>
                            <span className="font-bold text-slate-800">{formatCurrency(totalDiffRevenue)}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800">Cancellation Analytics</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-red-50">
                    <div>
                      <div className="text-sm text-slate-600">Total Cancellations</div>
                      <div className="text-3xl font-bold text-red-700">{totalCancellations.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-600">Cancel Rate</div>
                      <div className="text-3xl font-bold text-red-700">{cancelRate.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">From {totalBooked.toLocaleString()} total bookings</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800">Capacity Utilization</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50">
                    <div>
                      <div className="text-sm text-slate-600">Total Capacity</div>
                      <div className="text-3xl font-bold text-blue-700">{totalCapacity.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-600">Utilization</div>
                      <div className="text-3xl font-bold text-blue-700">{avgFillRate.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${avgFillRate}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
              className="bg-white/80 glass-card rounded-3xl max-w-7xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
              {/* Left Profile Pane */}
              <div className="md:w-1/3 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white p-8 flex flex-col gap-6 overflow-y-auto">
                <div className="flex items-start justify-between">
                  <h2 className="text-2xl font-bold tracking-tight">{selectedClass.trainer}</h2>
                  <button
                    onClick={() => {
                      setShowDrilldown(false);
                      setSelectedClass(null);
                    }}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Close profile"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Trainer Image */}
                <div className="relative w-full rounded-2xl overflow-hidden shadow-xl border border-white/20 bg-gradient-to-br from-blue-500 to-indigo-600" style={{ paddingBottom: '133.33%' }}>
                  {(() => {
                    const trainerImg = findTrainerImage(selectedClass.trainer);
                    if (trainerImg) {
                      return (
                        <>
                          <img 
                            src={trainerImg as string}
                            alt={selectedClass.trainer} 
                            className="absolute inset-0 w-full h-full object-cover object-top" 
                            loading="eager"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </>
                      );
                    }
                    // Fallback to initials
                    const initials = selectedClass.trainer.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                        <span className="text-9xl font-bold text-white/90">{initials}</span>
                      </div>
                    );
                  })()}
                  <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-1 z-10">
                    <span className="text-xs uppercase tracking-wider opacity-80">Primary Class</span>
                    <span className="text-lg font-semibold">{selectedClass.class}</span>
                  </div>
                </div>

                {/* Core Stats Grid */}
                <div className="grid grid-cols-2 gap-3" aria-label="Core trainer stats">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Sessions</div>
                    <div className="text-xl font-bold">{hasHistoricalData ? classSessions.length : '-'}</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Avg Check-In</div>
                    <div className="text-xl font-bold">
                      {hasHistoricalData && classSessions.length > 0 
                        ? (classSessions.reduce((sum, s) => sum + s.CheckedIn, 0) / classSessions.length).toFixed(1)
                        : '-'}
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Fill Rate</div>
                    <div className="text-xl font-bold">{selectedClass.fillRate > 0 ? `${selectedClass.fillRate}%` : '-'}</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Cancel Rate</div>
                    <div className="text-xl font-bold text-red-300">
                      {hasHistoricalData && selectedClass.avgBooked > 0
                        ? `${(selectedClass.avgLateCancelled / selectedClass.avgBooked * 100).toFixed(1)}%`
                        : '-'}
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 col-span-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Total Revenue</div>
                    <div className="text-xl font-bold text-green-300">
                      {hasHistoricalData 
                        ? formatCurrency(classSessions.reduce((sum, s) => sum + s.Revenue, 0))
                        : '-'}
                    </div>
                  </div>
                </div>

                {/* Profile Summary */}
                <div className="bg-white/10 rounded-xl p-4" aria-label="Trainer profile summary">
                  <div className="text-xs font-semibold uppercase tracking-wide mb-2 opacity-80">Profile Summary</div>
                  <ul className="space-y-1 text-sm">
                    <li><span className="opacity-70">Class:</span> <span className="font-medium">{selectedClass.class}</span></li>
                    <li><span className="opacity-70">Location:</span> <span className="font-medium">{selectedClass.location}</span></li>
                    <li><span className="opacity-70">Schedule:</span> <span className="font-medium">{selectedClass.day} at {selectedClass.time}</span></li>
                    <li><span className="opacity-70">Status:</span> <span className={`font-medium ${selectedClass.status === 'Active' ? 'text-green-300' : 'text-gray-300'}`}>{selectedClass.status}</span></li>
                    <li><span className="opacity-70">Capacity:</span> <span className="font-medium">{selectedClass.capacity}</span></li>
                  </ul>
                </div>

                {/* Specialty & Highlights */}
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide mb-3 opacity-80">Format Specializations</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(() => {
                      // Get ALL sessions for this trainer (not just the selected class)
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      const trainerName = selectedClass.trainer.toLowerCase();
                      
                      const trainerSessions = rawData.filter((session: SessionData) => {
                        const sessionDate = parseISO(session.Date);
                        if (sessionDate >= today) return false; // Only past sessions
                        const inDateRange = isWithinInterval(sessionDate, { start: filters.dateFrom, end: filters.dateTo });
                        if (!inDateRange) return false;
                        
                        // Try multiple trainer matching approaches
                        const sessionTrainer = session.Trainer?.toLowerCase() || '';
                        const sessionFullName = `${session.FirstName || ''} ${session.LastName || ''}`.toLowerCase().trim();
                        
                        return sessionTrainer === trainerName || 
                               sessionFullName === trainerName ||
                               sessionTrainer.includes(trainerName) ||
                               trainerName.includes(sessionTrainer);
                      });

                      // Calculate class frequency from ALL trainer sessions
                      const classCount = trainerSessions.reduce((acc, session) => {
                        if (session.Class) {
                          acc[session.Class] = (acc[session.Class] || 0) + 1;
                        }
                        return acc;
                      }, {} as Record<string, number>);
                      
                      // Sort by frequency and get top 3
                      const topClasses = Object.entries(classCount)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 3)
                        .map(([className, count]) => ({ name: className, count }));

                      // If we still only have 1 or 0 classes, show a debug message
                      if (topClasses.length <= 1) {
                        console.log('Debug trainer sessions:', {
                          selectedTrainer: selectedClass.trainer,
                          foundSessions: trainerSessions.length,
                          sampleSessions: trainerSessions.slice(0, 3).map(s => ({ 
                            Trainer: s.Trainer, 
                            Class: s.Class, 
                            FirstName: s.FirstName, 
                            LastName: s.LastName 
                          })),
                          classCount
                        });
                      }

                      return topClasses.map((classInfo, i) => (
                        <div key={i} className="px-3 py-1.5 bg-blue-500/30 rounded-full text-xs font-medium flex items-center gap-2">
                          <span>{classInfo.name}</span>
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-semibold">
                            {classInfo.count}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-2 opacity-80">Highlights</div>
                  <ul className="space-y-1.5 text-xs">
                    {hasHistoricalData && selectedClass.fillRate >= 80 && (
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                        <span>High Demand Trainer ({selectedClass.fillRate}% fill rate)</span>
                      </li>
                    )}
                    {hasHistoricalData && classSessions.length >= 10 && (
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                        <span>Consistent Schedule ({classSessions.length} sessions)</span>
                      </li>
                    )}
                    {hasHistoricalData && (selectedClass.avgLateCancelled / selectedClass.avgBooked * 100) < 10 && (
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        <span>Low Cancellation Rate</span>
                      </li>
                    )}
                    {hasHistoricalData && classSessions.reduce((sum, s) => sum + s.Revenue, 0) > 50000 && (
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                        <span>Top Revenue Generator</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Right Analytics Pane */}
              <div className="md:w-2/3 p-6 md:p-8 overflow-y-auto max-h-[90vh]">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{selectedClass.class}</h2>
                    <div className="text-sm text-slate-500">Advanced profile & performance analytics</div>
                  </div>
                </div>

                {/* 8 Key Metric Cards with Animated Bars - Premium Dark Style */}
                {hasHistoricalData && (() => {
                  const totalCheckIns = classSessions.reduce((sum, s) => sum + s.CheckedIn, 0);
                  const totalBooked = classSessions.reduce((sum, s) => sum + s.Booked, 0);
                  const totalCapacity = classSessions.reduce((sum, s) => sum + s.Capacity, 0);
                  const totalRevenue = classSessions.reduce((sum, s) => sum + s.Revenue, 0);
                  const totalCancellations = classSessions.reduce((sum, s) => sum + s.LateCancelled, 0);
                  const nonEmptySessions = classSessions.filter(s => s.CheckedIn > 0);
                  const avgCheckInsExcludingEmpty = nonEmptySessions.length > 0 ? nonEmptySessions.reduce((sum, s) => sum + s.CheckedIn, 0) / nonEmptySessions.length : 0;
                  const fillRate = totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0;
                  const cancelRate = totalBooked > 0 ? (totalCancellations / totalBooked) * 100 : 0;

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {/* Sessions */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0 }}
                        className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl transition-all overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Sessions</div>
                          <div className="text-3xl font-black text-white mb-4">{classSessions.length}</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <motion.div 
                              className="bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500 h-1.5 rounded-full shadow-lg shadow-blue-500/50"
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </motion.div>

                      {/* Total Check-ins */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl transition-all overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-transparent to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Check-Ins</div>
                          <div className="text-3xl font-black text-white mb-4">{totalCheckIns}</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <motion.div 
                              className="bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 h-1.5 rounded-full shadow-lg shadow-emerald-500/50"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(fillRate, 100)}%` }}
                              transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </motion.div>

                      {/* Avg (No Empty) */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl transition-all overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 via-transparent to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Avg (No Empty)</div>
                          <div className="text-3xl font-black text-white mb-4">{avgCheckInsExcludingEmpty.toFixed(1)}</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <motion.div 
                              className="bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-500 h-1.5 rounded-full shadow-lg shadow-cyan-500/50"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((avgCheckInsExcludingEmpty / 30) * 100, 100)}%` }}
                              transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </motion.div>

                      {/* Fill Rate */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                        className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl transition-all overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Fill Rate</div>
                          <div className="text-3xl font-black text-white mb-4">{fillRate.toFixed(0)}%</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <motion.div 
                              className="bg-gradient-to-r from-purple-500 via-indigo-400 to-purple-500 h-1.5 rounded-full shadow-lg shadow-purple-500/50"
                              initial={{ width: 0 }}
                              animate={{ width: `${fillRate}%` }}
                              transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </motion.div>

                      {/* Total Booked */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                        className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl transition-all overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 via-transparent to-yellow-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Booked</div>
                          <div className="text-3xl font-black text-white mb-4">{totalBooked}</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <motion.div 
                              className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 h-1.5 rounded-full shadow-lg shadow-amber-500/50"
                              initial={{ width: 0 }}
                              animate={{ width: `${totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0}%` }}
                              transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </motion.div>

                      {/* Cancellations */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.5 }}
                        className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl transition-all overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-rose-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Cancellations</div>
                          <div className="text-3xl font-black text-white mb-4">{totalCancellations}</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <motion.div 
                              className="bg-gradient-to-r from-red-500 via-rose-400 to-red-500 h-1.5 rounded-full shadow-lg shadow-red-500/50"
                              initial={{ width: 0 }}
                              animate={{ width: `${cancelRate}%` }}
                              transition={{ duration: 1.2, delay: 0.7, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </motion.div>

                      {/* Cancel Rate */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.6 }}
                        className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl transition-all overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 via-transparent to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Cancel Rate</div>
                          <div className="text-3xl font-black text-white mb-4">{cancelRate.toFixed(1)}%</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <motion.div 
                              className="bg-gradient-to-r from-orange-500 via-red-400 to-orange-500 h-1.5 rounded-full shadow-lg shadow-orange-500/50"
                              initial={{ width: 0 }}
                              animate={{ width: `${cancelRate}%` }}
                              transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </motion.div>

                      {/* Total Revenue */}
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.7 }}
                        className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl transition-all overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 via-transparent to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Total Revenue</div>
                          <div className="text-3xl font-black text-white mb-4">{formatCurrency(totalRevenue)}</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <motion.div 
                              className="bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 h-1.5 rounded-full shadow-lg shadow-green-500/50"
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ duration: 1.2, delay: 0.9, ease: "easeOut" }}
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
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">CLIENT ATTENDANCE PATTERNS</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {(() => {
                      const avgCheckIns = selectedClass.avgCheckIns;
                      const fillRate = selectedClass.fillRate;
                      
                      // Calculate detailed attendance patterns
                      const consistencyFactor = fillRate / 100;
                      const fixedRatio = Math.min(0.4 + (consistencyFactor * 0.3), 0.7);
                      const fixed = parseFloat((avgCheckIns * fixedRatio).toFixed(1));
                      
                      const firstTimeRatio = fillRate > 80 ? 0.15 : fillRate > 60 ? 0.2 : 0.25;
                      const firstTime = parseFloat((avgCheckIns * firstTimeRatio).toFixed(1));
                      
                      const unpredictable = parseFloat(Math.max(0, avgCheckIns - fixed - firstTime).toFixed(1));
                      const total = parseFloat((fixed + firstTime + unpredictable).toFixed(1));
                      
                      return (
                        <>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <div className="text-xs text-gray-500">Fixed Weekly</div>
                            </div>
                            <div className="text-lg font-bold text-green-700">{fixed}</div>
                            <div className="text-xs text-gray-500">{((fixed / total) * 100).toFixed(0)}% of attendees</div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <div className="text-xs text-gray-500">First-Timers</div>
                            </div>
                            <div className="text-lg font-bold text-blue-700">{firstTime}</div>
                            <div className="text-xs text-gray-500">{((firstTime / total) * 100).toFixed(0)}% of attendees</div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                              <div className="text-xs text-gray-500">Occasional</div>
                            </div>
                            <div className="text-lg font-bold text-amber-700">{unpredictable}</div>
                            <div className="text-xs text-gray-500">{((unpredictable / total) * 100).toFixed(0)}% of attendees</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Retention Rate</div>
                            <div className="text-lg font-bold text-purple-700">{((fixed / total) * 100).toFixed(1)}%</div>
                            <div className="text-xs text-gray-500">Weekly consistency</div>
                          </div>
                        </>
                      );
                    })()}
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
                    <div style={{ minWidth: '2100px', maxHeight: '500px', overflowY: 'auto' }}>
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-gradient-to-r from-slate-100 to-blue-100 sticky top-0 z-10 border-b-2 border-slate-300">
                          <tr>
                            <th className="text-left px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '90px' }}>Date</th>
                            <th className="text-left px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '120px' }}>Trainer</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '70px' }}>Check In</th>
                            <th className="text-center px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '60px' }}>Empty</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '70px' }}>Capacity</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '60px' }}>Fill%</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '70px' }}>Booked</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '80px' }}>Cancelled</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '70px' }}>Canc%</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '80px' }}>No Show</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '80px' }}>Waitlist</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '90px' }}>Revenue</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '80px' }}>Rev/Chk</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '80px' }}>Rev/Book</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '80px' }}>Rev Loss</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '60px' }}>Comp</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '80px' }}>Members</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '80px' }}>Packages</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap border-r border-slate-200" style={{ width: '60px' }}>Intro</th>
                            <th className="text-right px-2 py-2 font-semibold text-slate-700 whitespace-nowrap" style={{ width: '70px' }}>Singles</th>
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
                            const isEmpty = session.CheckedIn === 0;
                            const revPerCheckIn = session.CheckedIn > 0 ? session.Revenue / session.CheckedIn : 0;
                            const revPerBooking = session.Booked > 0 ? session.Revenue / session.Booked : 0;
                            const cancelRate = session.Booked > 0 ? Math.round((session.LateCancelled / session.Booked) * 100) : 0;
                            const revLoss = session.LateCancelled * (session.Booked > 0 ? session.Revenue / session.Booked : 0);
                            
                            return (
                              <tr 
                                key={index}
                                onClick={() => {
                                  setSelectedSessionForMembers(session);
                                  setShowMemberDetailsModal(true);
                                }}
                                className={`border-t border-slate-200 hover:bg-blue-100 transition-colors cursor-pointer ${
                                  index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                                } ${selectedSessionForMembers?.SessionID === session.SessionID ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                                title="Click to view member details for this session"
                              >
                                <td className="px-2 py-2 font-medium text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '90px' }}>
                                  {format(parseISO(session.Date), 'MMM dd, yy')}
                                </td>
                                <td className="px-2 py-2 text-slate-700 whitespace-nowrap truncate text-[11px] border-r border-slate-200" style={{ width: '120px' }} title={session.Trainer}>
                                  {session.Trainer}
                                </td>
                                <td className="px-2 py-2 text-right font-semibold text-blue-700 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '70px' }}>{session.CheckedIn}</td>
                                <td className="px-2 py-2 text-center whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '60px' }}>
                                  {isEmpty ? <span className="text-red-600 font-bold">✗</span> : <span className="text-gray-400">-</span>}
                                </td>
                                <td className="px-2 py-2 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '70px' }}>{session.Capacity}</td>
                                <td className={`px-2 py-2 text-right whitespace-nowrap text-[11px] border-r border-slate-200 ${fillRateColor}`} style={{ width: '60px' }}>
                                  {sessionFillRate}%
                                </td>
                                <td className="px-2 py-2 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '70px' }}>{session.Booked}</td>
                                <td className="px-2 py-2 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '80px' }}>{session.LateCancelled}</td>
                                <td className="px-2 py-2 text-right text-slate-600 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '70px' }}>
                                  {cancelRate}%
                                </td>
                                <td className="px-2 py-2 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '80px' }}>{session.NoShow || 0}</td>
                                <td className="px-2 py-2 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '80px' }}>{session.Waitlisted || 0}</td>
                                <td className="px-2 py-2 text-right font-semibold text-blue-700 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '90px' }}>
                                  {formatCurrency(session.Revenue)}
                                </td>
                                <td className="px-2 py-2 text-right text-slate-600 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '80px' }}>
                                  {session.CheckedIn > 0 ? formatCurrency(revPerCheckIn) : '-'}
                                </td>
                                <td className="px-2 py-2 text-right text-slate-600 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '80px' }}>
                                  {session.Booked > 0 ? formatCurrency(revPerBooking) : '-'}
                                </td>
                                <td className="px-2 py-2 text-right text-red-600 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '80px' }}>
                                  {session.LateCancelled > 0 ? formatCurrency(revLoss) : '-'}
                                </td>
                                <td className="px-2 py-2 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '60px' }}>{session.Complimentary}</td>
                                <td className="px-2 py-2 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '80px' }}>{session.Memberships}</td>
                                <td className="px-2 py-2 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '80px' }}>{session.Packages}</td>
                                <td className="px-2 py-2 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200" style={{ width: '60px' }}>{session.IntroOffers}</td>
                                <td className="px-2 py-2 text-right text-slate-700 whitespace-nowrap text-[11px]" style={{ width: '70px' }}>{session.SingleClasses}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-gradient-to-r from-slate-100 to-blue-100 font-semibold border-t-2 border-slate-300">
                          {/* Totals Row */}
                          <tr 
                            style={{ maxHeight: '30px', height: '30px' }} 
                            className="border-b border-slate-300 cursor-pointer hover:bg-blue-200 transition-colors"
                            onClick={() => {
                              // Create a synthetic session object representing ALL sessions for this UniqueID1
                              const firstSession = classSessions[0];
                              if (firstSession) {
                                setSelectedSessionForMembers({
                                  ...firstSession,
                                  Date: 'ALL', // Special marker to indicate all sessions
                                  Time: 'All Sessions',
                                  CheckedIn: classSessions.reduce((sum, s) => sum + s.CheckedIn, 0),
                                  Booked: classSessions.reduce((sum, s) => sum + s.Booked, 0),
                                  Revenue: classSessions.reduce((sum, s) => sum + s.Revenue, 0),
                                  LateCancelled: classSessions.reduce((sum, s) => sum + s.LateCancelled, 0),
                                  Capacity: classSessions.reduce((sum, s) => sum + s.Capacity, 0)
                                });
                                setShowMemberDetailsModal(true);
                              }
                            }}
                            title="Click to view all members across all sessions"
                          >
                            <td className="px-2 py-1 text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200 font-bold">TOTALS</td>
                            <td className="px-2 py-1 border-r border-slate-200"></td>
                            <td className="px-2 py-1 text-right text-blue-900 font-bold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {classSessions.reduce((sum, s) => sum + s.CheckedIn, 0)}
                            </td>
                            <td className="px-2 py-1 text-center text-red-700 font-bold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {classSessions.filter(s => s.CheckedIn === 0).length}
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
                            <td className="px-2 py-1 border-r border-slate-200"></td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {classSessions.reduce((sum, s) => sum + (s.NoShow || 0), 0)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {classSessions.reduce((sum, s) => sum + (s.Waitlisted || 0), 0)}
                            </td>
                            <td className="px-2 py-1 text-right text-blue-700 font-bold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {formatCurrency(classSessions.reduce((sum, s) => sum + s.Revenue, 0))}
                            </td>
                            <td className="px-2 py-1 border-r border-slate-200"></td>
                            <td className="px-2 py-1 border-r border-slate-200"></td>
                            <td className="px-2 py-1 text-right text-red-700 font-semibold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {formatCurrency(classSessions.reduce((sum, s) => {
                                const revPerBook = s.Booked > 0 ? s.Revenue / s.Booked : 0;
                                return sum + (s.LateCancelled * revPerBook);
                              }, 0))}
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
                            <td className="px-2 py-1 text-center text-purple-700 font-bold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {(() => {
                                const nonEmpty = classSessions.filter(s => s.CheckedIn > 0);
                                return nonEmpty.length > 0 ? Math.round(nonEmpty.reduce((sum, s) => sum + s.CheckedIn, 0) / nonEmpty.length) : 0;
                              })()}
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
                            <td className="px-2 py-1 text-right text-slate-700 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {(() => {
                                const totalBooked = classSessions.reduce((sum, s) => sum + s.Booked, 0);
                                const totalCancelled = classSessions.reduce((sum, s) => sum + s.LateCancelled, 0);
                                return totalBooked > 0 ? Math.round((totalCancelled / totalBooked) * 100) + '%' : '0%';
                              })()}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {Math.round(classSessions.reduce((sum, s) => sum + (s.NoShow || 0), 0) / classSessions.length)}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-900 whitespace-nowrap text-[11px] border-r border-slate-200">
                              {Math.round(classSessions.reduce((sum, s) => sum + (s.Waitlisted || 0), 0) / classSessions.length)}
                            </td>
                            <td className="px-2 py-1 text-right text-blue-700 font-bold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {formatCurrency(Math.round(classSessions.reduce((sum, s) => sum + s.Revenue, 0) / classSessions.length))}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-700 font-semibold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {(() => {
                                const totalCheckIns = classSessions.reduce((sum, s) => sum + s.CheckedIn, 0);
                                const totalRevenue = classSessions.reduce((sum, s) => sum + s.Revenue, 0);
                                return totalCheckIns > 0 ? formatCurrency(Math.round(totalRevenue / totalCheckIns)) : '-';
                              })()}
                            </td>
                            <td className="px-2 py-1 text-right text-slate-700 font-semibold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {(() => {
                                const totalBooked = classSessions.reduce((sum, s) => sum + s.Booked, 0);
                                const totalRevenue = classSessions.reduce((sum, s) => sum + s.Revenue, 0);
                                return totalBooked > 0 ? formatCurrency(Math.round(totalRevenue / totalBooked)) : '-';
                              })()}
                            </td>
                            <td className="px-2 py-1 text-right text-red-700 font-semibold whitespace-nowrap text-[11px] border-r border-slate-200">
                              {formatCurrency(Math.round(classSessions.reduce((sum, s) => {
                                const revPerBook = s.Booked > 0 ? s.Revenue / s.Booked : 0;
                                return sum + (s.LateCancelled * revPerBook);
                              }, 0) / classSessions.length))}
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

      {/* Similar Classes Modal */}
      {showSimilarClasses && (() => {
        const selectedClass = scheduleClasses.find(c => c.id === showSimilarClasses);
        if (!selectedClass) return null;
        
        const recommendations = generateSimilarRecommendations(selectedClass);
        
        return (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowSimilarClasses(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowSimilarClasses(null);
              }
            }}
            tabIndex={-1}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">Similar Class Recommendations</h3>
                    <div className="text-slate-200 space-y-1">
                      <p className="text-sm">Based on: <span className="font-semibold">{selectedClass.class}</span></p>
                      <p className="text-xs">{selectedClass.day} at {selectedClass.time} • {selectedClass.location}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSimilarClasses(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Recommendations List */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] bg-slate-50">
                {recommendations.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <AlertTriangle className="w-16 h-16 mx-auto" />
                    </div>
                    <p className="text-gray-600">No similar classes found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map((rec, idx) => (
                      <motion.div
                        key={`${rec.class}-${rec.trainer}-${idx}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-lg p-4 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: Class Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="bg-slate-700 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs">
                                #{idx + 1}
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-gray-900">{rec.class}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <Users className="w-3 h-3" />
                                  <span>{rec.trainer}</span>
                                </div>
                              </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                                <div className="text-[10px] text-slate-600 font-medium">Fill Rate</div>
                                <div className="text-sm font-bold text-slate-900">{rec.fillRate}%</div>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                                <div className="text-[10px] text-slate-600 font-medium">Attendance</div>
                                <div className="text-sm font-bold text-slate-900">{rec.avgCheckIns}</div>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                                <div className="text-[10px] text-slate-600 font-medium">Revenue</div>
                                <div className="text-sm font-bold text-slate-900">{formatCurrency(rec.revenue)}</div>
                              </div>
                              <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                                <div className="text-[10px] text-slate-600 font-medium">Score</div>
                                <div className="text-sm font-bold text-slate-900">{rec.score}</div>
                              </div>
                            </div>

                            {/* Reason */}
                            <div className="bg-slate-100 rounded-lg p-2 border border-slate-200">
                              <div className="text-[10px] font-semibold text-slate-700 mb-1">Why Recommended?</div>
                              <p className="text-xs text-slate-600">{rec.reason}</p>
                            </div>
                          </div>

                          {/* Right: Replace Button */}
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => {
                                handleReplaceClass(selectedClass, rec.trainer, rec.class);
                                setShowSimilarClasses(null);
                              }}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
                            >
                              <Repeat className="w-3.5 h-3.5" />
                              Replace
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-white px-6 py-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Based on historical performance, time slot, location, and trainer expertise
                  </p>
                  <button
                    onClick={() => setShowSimilarClasses(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}

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
              {/* Class Name with Analytics */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                <select
                  value={editingClass.class}
                  onChange={(e) => setEditingClass({ ...editingClass, class: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {(() => {
                    // Calculate analytics for each class type
                    const classOptions = [...new Set(rawData.map(s => s.Class))].map(className => {
                      const classSessions = rawData.filter(s => s.Class === className);
                      const avgFillRate = classSessions.length > 0 
                        ? classSessions.reduce((sum, s) => sum + ((s.CheckedIn || 0) / (s.Capacity || 1)), 0) / classSessions.length * 100
                        : 0;
                      const avgRevenue = classSessions.length > 0
                        ? classSessions.reduce((sum, s) => sum + (s.Revenue || 0), 0) / classSessions.length
                        : 0;
                      return { name: className, avgFillRate, avgRevenue, sessionCount: classSessions.length };
                    });
                    
                    return classOptions
                      .sort((a, b) => b.avgFillRate - a.avgFillRate)
                      .map(({ name, avgFillRate, avgRevenue, sessionCount }) => (
                        <option key={name} value={name}>
                          {name} ({avgFillRate.toFixed(0)}% fill • {formatCurrency(avgRevenue)} avg • {sessionCount} sessions)
                        </option>
                      ));
                  })()}
                </select>
              </div>
              
              {/* Trainer with Analytics */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trainer</label>
                <select
                  value={editingClass.trainer}
                  onChange={(e) => setEditingClass({ ...editingClass, trainer: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {(() => {
                    // Calculate analytics for each trainer
                    const trainerOptions = [...new Set(rawData.map(s => s.Trainer))].map(trainer => {
                      const trainerSessions = rawData.filter(s => s.Trainer === trainer);
                      const avgFillRate = trainerSessions.length > 0
                        ? trainerSessions.reduce((sum, s) => sum + ((s.CheckedIn || 0) / (s.Capacity || 1)), 0) / trainerSessions.length * 100
                        : 0;
                      const totalClasses = trainerSessions.length;
                      const workload = totalClasses >= 25 ? 'Overloaded' : totalClasses >= 20 ? 'Heavy' : totalClasses >= 15 ? 'Medium' : 'Light';
                      return { name: trainer, avgFillRate, sessionCount: totalClasses, workload };
                    });
                    
                    return trainerOptions
                      .sort((a, b) => b.avgFillRate - a.avgFillRate)
                      .map(({ name, avgFillRate, sessionCount, workload }) => (
                        <option key={name} value={name}>
                          {name} ({avgFillRate.toFixed(0)}% fill • {sessionCount} classes • {workload})
                        </option>
                      ));
                  })()}
                </select>
              </div>
              
              {/* Location with Analytics */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={editingClass.location}
                  onChange={(e) => setEditingClass({ ...editingClass, location: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {(() => {
                    // Calculate analytics for each location
                    const locationOptions = [...new Set(rawData.map(s => s.Location))].map(location => {
                      const locationSessions = rawData.filter(s => s.Location === location);
                      const avgCapacity = locationSessions.length > 0
                        ? locationSessions.reduce((sum, s) => sum + (s.Capacity || 0), 0) / locationSessions.length
                        : 0;
                      const avgFillRate = locationSessions.length > 0
                        ? locationSessions.reduce((sum, s) => sum + ((s.CheckedIn || 0) / (s.Capacity || 1)), 0) / locationSessions.length * 100
                        : 0;
                      return { name: location, avgCapacity, avgFillRate, sessionCount: locationSessions.length };
                    });
                    
                    return locationOptions
                      .sort((a, b) => b.avgFillRate - a.avgFillRate)
                      .map(({ name, avgCapacity, avgFillRate, sessionCount }) => (
                        <option key={name} value={name}>
                          {name} ({avgFillRate.toFixed(0)}% fill • {avgCapacity.toFixed(0)} avg capacity • {sessionCount} sessions)
                        </option>
                      ));
                  })()}
                </select>
              </div>
              
              {/* Capacity with Suggestions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="number"
                  value={editingClass.capacity}
                  onChange={(e) => setEditingClass({ ...editingClass, capacity: parseInt(e.target.value) || 0 })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="100"
                />
                {(() => {
                  // Suggest optimal capacity based on historical data
                  const similarClasses = rawData.filter(s => 
                    s.Class === editingClass.class && 
                    s.Location === editingClass.location
                  );
                  const avgCapacity = similarClasses.length > 0
                    ? similarClasses.reduce((sum, s) => sum + (s.Capacity || 0), 0) / similarClasses.length
                    : 0;
                  const avgAttendance = similarClasses.length > 0
                    ? similarClasses.reduce((sum, s) => sum + (s.CheckedIn || 0), 0) / similarClasses.length
                    : 0;
                  
                  return avgCapacity > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      💡 Similar classes avg: {avgCapacity.toFixed(0)} capacity, {avgAttendance.toFixed(0)} attendance
                    </p>
                  );
                })()}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editingClass.status}
                  onChange={(e) => setEditingClass({ ...editingClass, status: e.target.value })}
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
                  if (editingClass) {
                    // Update the editedClasses Map with the modified class
                    const newEditedClasses = new Map(editedClasses);
                    newEditedClasses.set(editingClass.id, editingClass);
                    setEditedClasses(newEditedClasses);
                    
                    // Show success message
                    alert(`✅ Class updated successfully! Changes saved for ${editingClass.class} on ${editingClass.day} at ${editingClass.time}`);
                  }
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

      {/* Enhanced Member Details Modal */}
      {showMemberDetailsModal && selectedSessionForMembers && (() => {
        // Check if this is for ALL sessions (clicked on totals row)
        const isAllSessions = selectedSessionForMembers.Date === 'ALL';
        
        // Get members for this specific session or all sessions for this UniqueID1
        const sessionMembers = isAllSessions 
          ? checkinsData.filter(
              (checkin: CheckinData) => 
                checkin.UniqueID1 === selectedSessionForMembers.UniqueID1
            )
          : checkinsData.filter(
              (checkin: CheckinData) => 
                checkin.UniqueID1 === selectedSessionForMembers.UniqueID1 &&
                checkin.Date === selectedSessionForMembers.Date
            );
        
        // Calculate how many times each member has ACTUALLY ATTENDED (checked in, not cancelled) THIS specific class (UniqueID1)
        // Filter sessions that match THIS specific UniqueID1 and Date combination
        const classHistorySessions = rawData.filter((s: SessionData) => 
          s.UniqueID1 === selectedSessionForMembers.UniqueID1
        ).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime()); // Sort descending by date
        
        // Get last 15 sessions for this specific UniqueID1
        const last15Sessions = classHistorySessions.slice(0, 15);
        
        // Map to track actual attendance (CheckedIn=true, IsLateCancelled=false) in last 15 sessions
        const memberLast15Attendance = new Map<string, number>();
        last15Sessions.forEach((session: SessionData) => {
          const sessionCheckins = checkinsData.filter(c => 
            c.UniqueID1 === session.UniqueID1 &&
            c.Date === session.Date &&
            c.CheckedIn === true && 
            c.IsLateCancelled === false
          );
          sessionCheckins.forEach(checkin => {
            const key = checkin.MemberID;
            memberLast15Attendance.set(key, (memberLast15Attendance.get(key) || 0) + 1);
          });
        });
        
        // Map to track total attendance for all class history (for nth visit)
        const memberClassAttendance = new Map<string, number>();
        classHistorySessions.forEach((session: SessionData) => {
          const sessionCheckins = checkinsData.filter(c => 
            c.UniqueID1 === session.UniqueID1 &&
            c.Date === session.Date &&
            c.CheckedIn === true && 
            c.IsLateCancelled === false
          );
          sessionCheckins.forEach(checkin => {
            const key = checkin.MemberID;
            memberClassAttendance.set(key, (memberClassAttendance.get(key) || 0) + 1);
          });
        });
        
        // Identify regular members for THIS class (attended ≥10 times in last 15 sessions)
        const regularMembersForClass = new Set(
          Array.from(memberLast15Attendance.entries())
            .filter(([_, count]) => count >= 10)
            .map(([memberId]) => memberId)
        );
        
        // Find regular members who SKIPPED this session
        const regularMembersWhoSkipped = Array.from(regularMembersForClass).filter(memberId => {
          // Check if this regular member attended THIS specific session
          const attendedThisSession = sessionMembers.some(m => 
            m.MemberID === memberId && 
            m.CheckedIn === true && 
            m.IsLateCancelled === false
          );
          return !attendedThisSession;
        }).map(memberId => {
          // Find member info from past sessions
          const memberInfo = checkinsData.find(c => c.MemberID === memberId);
          return {
            memberId,
            name: memberInfo ? `${memberInfo.FirstName} ${memberInfo.LastName}` : 'Unknown',
            email: memberInfo?.Email || '',
            totalVisits: memberClassAttendance.get(memberId) || 0
          };
        });
        
        const hasCheckinData = sessionMembers.length > 0;
        
        // Calculate additional metrics
        const totalPaid = sessionMembers.reduce((sum, m) => sum + (m.Paid || 0), 0);
        const checkedInCount = sessionMembers.filter(m => m.CheckedIn && !m.IsLateCancelled).length;
        const cancelledCount = sessionMembers.filter(m => m.IsLateCancelled).length;
        const noShowCount = sessionMembers.filter(m => !m.CheckedIn && !m.IsLateCancelled).length;
        const regularMembersInSession = sessionMembers.filter(m => 
          regularMembersForClass.has(m.MemberID) && 
          m.CheckedIn && 
          !m.IsLateCancelled
        );
        // Occasional visitors: 3+ total visits but not regular (not 10+ in last 15)
        const occasionalVisitors = sessionMembers.filter(m => 
          m.CheckedIn && 
          !m.IsLateCancelled && 
          !regularMembersForClass.has(m.MemberID) && 
          (memberClassAttendance.get(m.MemberID) || 0) > 3
        ).length;
        const regularToOccasionalRatio = occasionalVisitors > 0 
          ? (regularMembersInSession.length / occasionalVisitors).toFixed(2) 
          : regularMembersInSession.length > 0 ? '∞' : '0';
        
        // Calculate average metrics
        const avgPaid = sessionMembers.length > 0 ? totalPaid / sessionMembers.length : 0;
        const avgClassNo = sessionMembers.length > 0 
          ? sessionMembers.reduce((sum, m) => sum + (m.ClassNo || 0), 0) / sessionMembers.length 
          : 0;
        const newMembersCount = sessionMembers.filter(m => m.ClassNo <= 3).length;
        
        // If showing all sessions, we need to get unique members (one row per member with aggregated data)
        const uniqueMembers = isAllSessions 
          ? Array.from(
              sessionMembers.reduce((map, member) => {
                const existing = map.get(member.MemberID);
                if (!existing) {
                  map.set(member.MemberID, member);
                } else {
                  // Keep the most recent one (or aggregate if needed)
                  if (new Date(member.Date) > new Date(existing.Date)) {
                    map.set(member.MemberID, member);
                  }
                }
                return map;
              }, new Map<string, CheckinData>())
            ).map(([_, member]) => member)
          : sessionMembers;
        
        // Filter members based on search and filters
        const filteredMembers = uniqueMembers.filter(member => {
          if (memberSearchQuery.trim()) {
            const query = memberSearchQuery.toLowerCase();
            const fullName = `${member.FirstName} ${member.LastName}`.toLowerCase();
            const email = (member.Email || '').toLowerCase();
            if (!fullName.includes(query) && !email.includes(query)) {
              return false;
            }
          }
          
          if (memberStatusFilter !== 'all') {
            if (memberStatusFilter === 'checked-in' && !member.CheckedIn) return false;
            if (memberStatusFilter === 'cancelled' && !member.IsLateCancelled) return false;
            if (memberStatusFilter === 'no-show' && (member.CheckedIn || member.IsLateCancelled)) return false;
          }
          
          if (memberTypeFilter !== 'all') {
            if (memberTypeFilter === 'regulars' && !regularMembersForClass.has(member.MemberID)) return false;
            if (memberTypeFilter === 'new' && member.ClassNo > 3) return false;
          }
          
          return true;
        });
        
        return (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowMemberDetailsModal(false);
                setSelectedSessionForMembers(null);
                setMemberSearchQuery('');
                setMemberStatusFilter('all');
                setMemberTypeFilter('all');
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-7xl transform rounded-3xl bg-white/80 glass-card text-left align-middle shadow-2xl transition-all max-h-[90vh] overflow-hidden"
            >
              <div className="flex flex-col md:flex-row max-h-[90vh]">
                {/* Left Profile Pane - Matching EnhancedDrilldownModal2 */}
                <div className="md:w-1/3 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-800 text-white p-8 flex flex-col gap-6 overflow-y-auto max-h-[90vh]">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">{selectedSessionForMembers.Class}</h2>
                      <p className="text-sm opacity-80 mt-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {isAllSessions ? 'All Sessions' : format(parseISO(selectedSessionForMembers.Date), 'EEEE, MMM dd, yyyy')}
                      </p>
                      <p className="text-sm opacity-80 mt-1 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {selectedSessionForMembers.Time}
                      </p>
                      <p className="text-sm opacity-80 mt-1 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {selectedSessionForMembers.Trainer}
                      </p>
                      <p className="text-sm opacity-80 mt-1 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {selectedSessionForMembers.Location}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowMemberDetailsModal(false);
                        setSelectedSessionForMembers(null);
                        setMemberSearchQuery('');
                        setMemberStatusFilter('all');
                        setMemberTypeFilter('all');
                      }}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Session Stats Card */}
                  <div className="relative w-full rounded-2xl shadow-xl border border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wider opacity-80">Session Overview</span>
                        <span className="text-lg font-semibold">Attendance & Revenue</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                          <div className="text-[10px] opacity-70 uppercase tracking-wider mb-1">Checked In</div>
                          <div className="text-2xl font-bold">{checkedInCount}</div>
                          <div className="text-[10px] opacity-60 mt-1">
                            of {selectedSessionForMembers.Capacity}
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                          <div className="text-[10px] opacity-70 uppercase tracking-wider mb-1">Fill Rate</div>
                          <div className="text-2xl font-bold">
                            {selectedSessionForMembers.Capacity > 0 
                              ? Math.round((checkedInCount / selectedSessionForMembers.Capacity) * 100) 
                              : 0}%
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                          <div className="text-[10px] opacity-70 uppercase tracking-wider mb-1">Revenue</div>
                          <div className="text-xl font-bold">{formatCurrency(totalPaid)}</div>
                          <div className="text-[10px] opacity-60 mt-1">{formatCurrency(avgPaid)} avg</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                          <div className="text-[10px] opacity-70 uppercase tracking-wider mb-1">Avg Class No</div>
                          <div className="text-2xl font-bold">{avgClassNo.toFixed(1)}</div>
                          <div className="text-[10px] opacity-60 mt-1">{newMembersCount} new</div>
                        </div>
                      </div>
                      
                      {/* Visitor Breakdown */}
                      <div className="mt-2 pt-4 border-t border-white/10">
                        <div className="text-[10px] opacity-70 uppercase tracking-wider mb-3">Visitor Analysis</div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs opacity-80">Regulars (10+ of last 15)</span>
                            <span className="text-sm font-bold text-green-400">{regularMembersInSession.length}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs opacity-80">Occasional (3+ visits)</span>
                            <span className="text-sm font-bold text-amber-400">{occasionalVisitors}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs opacity-80">Regular:Occasional</span>
                            <span className="text-sm font-bold text-blue-400">{regularToOccasionalRatio}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs opacity-80">Regulars Skipped</span>
                            <span className="text-sm font-bold text-red-400">{regularMembersWhoSkipped.length}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Status Breakdown */}
                      <div className="mt-2 pt-4 border-t border-white/10">
                        <div className="text-[10px] opacity-70 uppercase tracking-wider mb-3">Status</div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs opacity-80">Cancelled</span>
                            <span className="text-sm font-bold text-red-400">{cancelledCount}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs opacity-80">No Show</span>
                            <span className="text-sm font-bold text-orange-400">{noShowCount}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Payment Breakdown */}
                      <div className="mt-2 pt-4 border-t border-white/10">
                        <div className="text-[10px] opacity-70 uppercase tracking-wider mb-3">Payment Types</div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs opacity-80">Memberships</span>
                            <span className="text-sm font-bold">{selectedSessionForMembers.Memberships}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs opacity-80">Packages</span>
                            <span className="text-sm font-bold">{selectedSessionForMembers.Packages}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs opacity-80">Intro Offers</span>
                            <span className="text-sm font-bold">{selectedSessionForMembers.IntroOffers}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs opacity-80">Single Classes</span>
                            <span className="text-sm font-bold">{selectedSessionForMembers.SingleClasses}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Content Pane */}
                <div className="md:w-2/3 bg-white/95 p-6 overflow-y-auto max-h-[90vh]">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">
                    Member Details - {isAllSessions ? 'All Sessions' : `${format(parseISO(selectedSessionForMembers.Date), 'MMM dd, yyyy')} at ${selectedSessionForMembers.Time}`}
                  </h3>
                  
                  {/* Filters */}
                  {hasCheckinData && (
                        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
                          <div className="flex flex-wrap gap-3 items-center">
                            <div className="flex-1 min-w-[200px]">
                              <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={memberSearchQuery}
                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <select
                              value={memberStatusFilter}
                              onChange={(e) => setMemberStatusFilter(e.target.value as any)}
                              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="all">All Status</option>
                              <option value="checked-in">Checked In</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="no-show">No Show</option>
                            </select>
                            <select
                              value={memberTypeFilter}
                              onChange={(e) => setMemberTypeFilter(e.target.value as any)}
                              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="all">All Members</option>
                              <option value="regulars">Regulars (≥5 visits)</option>
                              <option value="new">New (≤3 classes)</option>
                            </select>
                            <div className="text-sm text-slate-600">
                              {filteredMembers.length} of {sessionMembers.length}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Member Table */}
                      {hasCheckinData ? (
                        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gradient-to-r from-slate-100 to-blue-100 border-b-2 border-slate-300 sticky top-0">
                                <tr>
                                  <th className="text-left px-3 py-3 font-semibold text-slate-700 text-xs">Member Name</th>
                                  <th className="text-left px-3 py-3 font-semibold text-slate-700 text-xs">Email</th>
                                  <th className="text-left px-3 py-3 font-semibold text-slate-700 text-xs">Payment Method</th>
                                  <th className="text-left px-3 py-3 font-semibold text-slate-700 text-xs">Category</th>
                                  <th className="text-center px-3 py-3 font-semibold text-slate-700 text-xs">Class No</th>
                                  <th className="text-center px-3 py-3 font-semibold text-slate-700 text-xs">Nth Visit<br/>(This Class)</th>
                                  <th className="text-center px-3 py-3 font-semibold text-slate-700 text-xs">Regular</th>
                                  <th className="text-center px-3 py-3 font-semibold text-slate-700 text-xs">Sessions<br/>Attended</th>
                                  <th className="text-center px-3 py-3 font-semibold text-slate-700 text-xs">Cancellations</th>
                                  <th className="text-center px-3 py-3 font-semibold text-slate-700 text-xs">No Shows</th>
                                  <th className="text-left px-3 py-3 font-semibold text-slate-700 text-xs">Status</th>
                                  <th className="text-right px-3 py-3 font-semibold text-slate-700 text-xs">Paid</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredMembers
                                  .sort((a, b) => {
                                    const aIsRegular = regularMembersForClass.has(a.MemberID);
                                    const bIsRegular = regularMembersForClass.has(b.MemberID);
                                    if (aIsRegular !== bIsRegular) return bIsRegular ? 1 : -1;
                                    if (a.CheckedIn !== b.CheckedIn) return b.CheckedIn ? 1 : -1;
                                    return `${a.FirstName} ${a.LastName}`.localeCompare(`${b.FirstName} ${b.LastName}`);
                                  })
                                  .map((member, index) => {
                                    const isRegular = regularMembersForClass.has(member.MemberID);
                                    const nthVisit = memberClassAttendance.get(member.MemberID) || 1;
                                    const isNew = member.ClassNo <= 3;
                                    
                                    // Calculate additional metrics for this member
                                    const memberSessions = isAllSessions 
                                      ? checkinsData.filter(c => c.MemberID === member.MemberID && c.UniqueID1 === selectedSessionForMembers.UniqueID1)
                                      : [member];
                                    const sessionsAttended = memberSessions.filter(s => s.CheckedIn && !s.IsLateCancelled).length;
                                    const cancellationsCount = memberSessions.filter(s => s.IsLateCancelled).length;
                                    const noShowsCount = memberSessions.filter(s => !s.CheckedIn && !s.IsLateCancelled).length;
                                    
                                    return (
                                      <tr 
                                        key={index}
                                        className={`border-t border-slate-200 hover:bg-blue-50 transition-colors ${
                                          member.IsLateCancelled ? 'bg-red-50/30' : 
                                          isRegular ? 'bg-blue-50/30' : 
                                          'bg-white'
                                        }`}
                                      >
                                        <td className="px-3 py-3">
                                          <div className="font-medium text-slate-900">
                                            {member.FirstName} {member.LastName}
                                          </div>
                                        </td>
                                        <td className="px-3 py-3 text-slate-700 text-xs">{member.Email || '-'}</td>
                                        <td className="px-3 py-3 text-slate-700 text-xs">{member.PaymentMethodName || '-'}</td>
                                        <td className="px-3 py-3 text-slate-700 text-xs">{member.CleanedCategory || '-'}</td>
                                        <td className="px-3 py-3 text-center">
                                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold w-[45px] ${
                                            isNew ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : 'bg-gradient-to-r from-slate-500 to-slate-600 text-white'
                                          }`}>
                                            {member.ClassNo}
                                          </span>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white w-[45px]">
                                            {nthVisit}
                                          </span>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                          {isRegular ? (
                                            <span className="inline-flex items-center justify-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-blue-600 to-indigo-700 text-white w-[70px]">
                                              <Users className="w-2.5 h-2.5" />
                                              Regular
                                            </span>
                                          ) : (memberClassAttendance.get(member.MemberID) || 0) > 3 ? (
                                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white w-[70px]">
                                              Occasional
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-400 text-white w-[70px]">New</span>
                                          )}  
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700 w-[45px]">
                                            {sessionsAttended}
                                          </span>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 w-[45px]">
                                            {cancellationsCount}
                                          </span>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-700 w-[45px]">
                                            {noShowsCount}
                                          </span>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                          {member.IsLateCancelled ? (
                                            <span className="inline-flex items-center justify-center gap-0.5 text-[10px] font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white px-2 py-0.5 rounded w-[85px]">
                                              <X className="w-2.5 h-2.5" />
                                              Cancelled
                                            </span>
                                          ) : member.CheckedIn ? (
                                            <span className="inline-flex items-center justify-center gap-0.5 text-[10px] font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 py-0.5 rounded w-[85px]">
                                              ✓ Checked In
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center justify-center gap-0.5 text-[10px] font-bold bg-gradient-to-r from-slate-500 to-slate-600 text-white px-2 py-0.5 rounded w-[85px]">
                                              No Show
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold text-slate-900 text-xs">
                                          {formatCurrency(member.Paid || 0)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                              <tfoot className="bg-gradient-to-r from-slate-100 to-blue-100 border-t-2 border-slate-300">
                                <tr>
                                  <td colSpan={11} className="px-3 py-3 text-right font-bold text-slate-900 text-sm">
                                    Total Revenue:
                                  </td>
                                  <td className="px-3 py-3 text-right font-bold text-blue-700 text-sm">
                                    {formatCurrency(filteredMembers.reduce((sum, m) => sum + (m.Paid || 0), 0))}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                          
                          {/* Regular Members Who Skipped This Session */}
                          {regularMembersWhoSkipped.length > 0 && (
                            <div className="mt-8">
                              <div className="flex items-center gap-3 mb-4">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                  Regular Members Who Skipped This Session ({regularMembersWhoSkipped.length})
                                </h4>
                              </div>
                              <div className="bg-amber-50/50 rounded-xl border border-amber-200 overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-amber-100 border-b border-amber-200">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-bold text-amber-900">
                                        Member Name
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-bold text-amber-900">
                                        Email
                                      </th>
                                      <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-bold text-amber-900">
                                        Total Visits
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {regularMembersWhoSkipped.map((skipped, index) => (
                                      <tr 
                                        key={index}
                                        className="border-t border-amber-100 hover:bg-amber-100/50 transition-colors bg-white"
                                      >
                                        <td className="px-4 py-3">
                                          <div className="font-medium text-amber-900">
                                            {skipped.name}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-amber-700 text-xs">{skipped.email || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                          <span className="inline-block px-3 py-1 rounded text-xs font-bold bg-amber-200 text-amber-900">
                                            {skipped.totalVisits}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-4 py-2 border border-amber-200">
                                <span className="font-semibold">Note:</span> These are regular members (10+ attendances in last 15 sessions) who didn't attend this session. Consider reaching out to understand their absence.
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                          <div className="flex items-start gap-3 text-amber-800">
                            <AlertTriangle className="w-6 h-6 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-semibold mb-2">Checkins Data Not Available</h4>
                              <p className="text-sm text-amber-700">
                                Member details require checkins data with UniqueID1 mapping.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </div>
  );
}

export default memo(ProScheduler);