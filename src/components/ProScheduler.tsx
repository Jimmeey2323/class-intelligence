import { useState, useMemo, useEffect, useRef, memo, Fragment, useCallback, useTransition, useDeferredValue } from 'react';
import { useDashboardStore, getDataIndices } from '../store/dashboardStore';
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
  ChevronDown,
  Zap,
  ArrowUpRight,
  RefreshCw,
  Settings,
  Building,
  Layers,
  Activity,
  UserPlus,
  UserMinus,
  Ban,
  Sparkles,
  Brain,
  Loader2,
  Wand2,
  Check,
  Target,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
// aiService used for direct AI calls - keeping for future use
// import { aiService } from '../services/aiService';
import { smartOptimizer, OptimizationSuggestion, OptimizationResult } from '../services/smartScheduleOptimizer';
import { AIOptimizer, DataAnalyzer, AIOptimizationResult, AIOptimizationError } from '../services/modularOptimizer';
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
  // Original position tracking for moved classes
  originalDay?: string;
  originalTime?: string;
  wasMoved?: boolean;
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

// ========== OPTIMIZATION SETTINGS TYPES ==========
interface TrainerPriority {
  name: string;
  targetHours: number;
  allowedFormats?: string[]; // If empty, can teach all formats
  isNewTrainer?: boolean;
}

interface LocationConstraints {
  maxParallelClasses: number;
  requiredFormats: string[]; // Formats that MUST be included when at max capacity
  optionalFormats: string[]; // Other formats that can fill remaining slots
  priorityTrainers: string[]; // Trainers to maximize hours for at this location
}

interface FormatPriority {
  format: string;
  priorityTrainers: string[]; // Trainers who should teach this format
}

// Trainer leave/unavailability
interface TrainerLeave {
  trainerName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason?: string;
}

// Format adjustment rules
interface FormatAdjustment {
  format: string;
  adjustmentType: 'increase' | 'decrease' | 'set';
  value: number; // Hours or class count depending on type
  location?: string; // Optional - apply to specific location
}

// Trainer adjustment rules
interface TrainerAdjustment {
  trainerName: string;
  adjustmentType: 'increase' | 'decrease' | 'set';
  value: number; // Hours
  location?: string;
}

// Day adjustment rules
interface DayAdjustment {
  day: string;
  adjustmentType: 'increase' | 'decrease' | 'set';
  value: number; // Class count
  location?: string;
}

// Optimization reason types (exported for use in other components)
export type OptimizationReason = 
  | 'replaced_low_performer'
  | 'optimize_trainer_hours'
  | 'optimize_studio_hours'
  | 'optimize_horizontal_mix'
  | 'optimize_vertical_mix'
  | 'high_demand_slot'
  | 'strategic_scheduling'
  | 'ai_demand_prediction'
  | 'member_preference_match'
  | 'trainer_fatigue_optimization';

// Strategy modes for optimization
export type OptimizationStrategy = 
  | 'balanced'           // Balance all factors equally
  | 'maximize_attendance' // Prioritize high-attendance predictions
  | 'trainer_development' // Focus on developing newer trainers
  | 'format_diversity'   // Ensure varied format mix
  | 'peak_optimization'  // Focus on peak hours
  | 'member_retention';  // Prioritize member preferences

// Seeded random number generator for reproducible but unique iterations
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  // Generate random number between 0 and 1
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  
  // Generate random number between min and max
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  
  // Shuffle array using Fisher-Yates
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  
  // Pick random element from array
  pick<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[Math.floor(this.next() * array.length)];
  }
  
  // Pick n random elements without replacement
  pickN<T>(array: T[], n: number): T[] {
    return this.shuffle(array).slice(0, Math.min(n, array.length));
  }
}

interface OptimizationSettings {
  enabled: boolean;
  targetTrainerHours: number; // Default 15
  strategy: OptimizationStrategy; // Optimization strategy mode
  maxTrainerHours: number; // Maximum hours per trainer (default 16)
  minDaysOff: number; // Minimum days off per trainer (default 2)
  minimizeTrainersPerSlot: boolean;
  avoidMultiLocationDays: boolean; // Try to avoid trainers at multiple locations same day
  locationConstraints: Record<string, LocationConstraints>;
  formatPriorities: FormatPriority[];
  newTrainers: TrainerPriority[];
  priorityTrainers: TrainerPriority[];
  blockedTrainers: string[]; // Trainers who should NEVER be assigned
  excludedFormats: string[]; // Formats to exclude from optimization
  minClassesPerLocation: Record<string, number>; // Minimum classes per location
  trainerLeaves: TrainerLeave[]; // Trainers on leave
  formatAdjustments: FormatAdjustment[]; // Adjust specific formats
  trainerAdjustments: TrainerAdjustment[]; // Adjust specific trainers
  dayAdjustments: DayAdjustment[]; // Adjust specific days
  // Time restrictions
  noClassesBefore: string; // e.g., "07:00"
  noClassesAfter: string; // e.g., "20:00"
  noClassesBetweenStart: string; // e.g., "12:30"
  noClassesBetweenEnd: string; // e.g., "15:30"
  // Format-specific rules
  advancedFormatsMaxPerWeek: number; // Max HIIT/Amped classes per week
  advancedFormatsLocation: string; // Location for advanced formats
  // Randomization seed for variety
  randomizationSeed: number;
}

// Default optimization settings based on user requirements
const DEFAULT_OPTIMIZATION_SETTINGS: OptimizationSettings = {
  enabled: true,
  targetTrainerHours: 15,
  strategy: 'balanced', // Default to balanced optimization
  maxTrainerHours: 16,
  minDaysOff: 2, // Each trainer gets at least 2 days off
  minimizeTrainersPerSlot: true,
  avoidMultiLocationDays: true, // Avoid trainers at multiple locations same day
  blockedTrainers: ['kabir', 'saniya', 'upasana', 'kunal', 'janhavi', 'sovena', 'debanshi'],
  excludedFormats: ['hosted', 'host', 'guest'],
  minClassesPerLocation: {
    'Kwality House, Kemps Corner': 95,
    'Supreme HQ, Bandra': 75
  },
  trainerLeaves: [], // No leaves by default
  formatAdjustments: [],
  trainerAdjustments: [],
  dayAdjustments: [],
  // Time restrictions
  noClassesBefore: '07:00',
  noClassesAfter: '20:00',
  noClassesBetweenStart: '12:30',
  noClassesBetweenEnd: '15:30',
  // Advanced formats
  advancedFormatsMaxPerWeek: 2,
  advancedFormatsLocation: 'Kwality House, Kemps Corner',
  // Randomization for variety - use current timestamp for unique iterations
  randomizationSeed: Date.now(),
  locationConstraints: {
    'Kwality House, Kemps Corner': {
      maxParallelClasses: 4,
      requiredFormats: ['cycle', 'strength'], // 1 cycle + 1 strength mandatory
      optionalFormats: ['barre', 'yoga', 'pilates', 'hiit', 'mat', 'recovery', 'boxing'],
      priorityTrainers: ['anisha', 'pranjali', 'vivaran', 'rohan', 'reshma', 'atulan', 'mrigakshi']
    },
    'Supreme HQ, Bandra': {
      maxParallelClasses: 3,
      requiredFormats: ['cycle'], // 1 cycle mandatory
      optionalFormats: ['barre', 'yoga', 'pilates', 'hiit', 'mat', 'recovery', 'strength', 'boxing'],
      priorityTrainers: ['cauveri', 'vivaran', 'anisha', 'mrigakshi', 'rohan', 'reshma', 'richard', 'karan']
    }
  },
  formatPriorities: [
    { format: 'powercycle', priorityTrainers: ['anmol', 'cauveri', 'vivaran', 'bret', 'rohan'] },
    { format: 'cycle', priorityTrainers: ['anmol', 'cauveri', 'vivaran', 'bret', 'rohan'] },
    { format: 'fit', priorityTrainers: ['mrigakshi', 'atulan', 'anisha', 'richard'] },
    { format: 'hiit', priorityTrainers: ['mrigakshi', 'atulan', 'anisha', 'richard'] },
    { format: 'mat', priorityTrainers: ['reshma', 'pranjali', 'atulan', 'rohan', 'anisha'] },
    { format: 'pilates', priorityTrainers: ['reshma', 'pranjali', 'atulan', 'rohan', 'anisha'] }
  ],
  newTrainers: [
    { name: 'simonelle', targetHours: 15, allowedFormats: ['powercycle', 'cycle', 'barre', 'recovery'], isNewTrainer: true },
    { name: 'bret', targetHours: 15, allowedFormats: ['powercycle', 'cycle', 'barre', 'recovery'], isNewTrainer: true },
    { name: 'anmol', targetHours: 15, allowedFormats: ['powercycle', 'cycle', 'barre', 'recovery'], isNewTrainer: true },
    { name: 'simran', targetHours: 15, allowedFormats: ['powercycle', 'cycle', 'barre', 'recovery'], isNewTrainer: true },
    { name: 'raunak', targetHours: 15, allowedFormats: ['powercycle', 'cycle', 'barre', 'recovery'], isNewTrainer: true }
  ],
  priorityTrainers: [
    { name: 'anisha', targetHours: 15 },
    { name: 'pranjali', targetHours: 15 },
    { name: 'vivaran', targetHours: 15 },
    { name: 'rohan', targetHours: 15 },
    { name: 'reshma', targetHours: 15 },
    { name: 'atulan', targetHours: 15 },
    { name: 'mrigakshi', targetHours: 15 },
    { name: 'cauveri', targetHours: 15 },
    { name: 'richard', targetHours: 15 },
    { name: 'karan', targetHours: 15 }
  ]
};

type ViewMode = 'calendar' | 'analytics' | 'optimization' | 'conflicts';
type CalendarViewMode = 'standard' | 'multi-location' | 'horizontal' | 'analytical' | 'compact' | 'timeline';

// Cache for schedule classes
let cachedScheduleClasses: ScheduleClass[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute
let lastInvalidateTimestamp = 0;

// PERFORMANCE: Granular Zustand selectors to prevent unnecessary re-renders
const useRawData = () => useDashboardStore(state => state.rawData);
const useActiveClassesData = () => useDashboardStore(state => state.activeClassesData);
const useCheckinsData = () => useDashboardStore(state => state.checkinsData);
const useUpdateClassSchedule = () => useDashboardStore(state => state.updateClassSchedule);
// Keeping for future optimization features
// const useApplyOptimization = () => useDashboardStore(state => state.applyOptimization);

function ProScheduler() {
  // PERFORMANCE: Use granular selectors instead of destructuring entire store
  const rawData = useRawData() || [];
  const activeClassesData = useActiveClassesData() || {};
  const checkinsData = useCheckinsData() || [];
  const updateClassSchedule = useUpdateClassSchedule();
  // const applyOptimization = useApplyOptimization(); // Future use for applying AI suggestions
  
  // State management
  const [filters, setFilters] = useState<ProSchedulerFilters>({
    dateFrom: new Date(2025, 7, 1), // August 1, 2025 (month is 0-indexed)
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
  const [draggedClass, setDraggedClass] = useState<ScheduleClass | null>(null);
  const [dropTarget, setDropTarget] = useState<{ day: string; time: string } | null>(null);
  const [showMemberDetailsModal, setShowMemberDetailsModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<'all' | 'checked-in' | 'cancelled' | 'no-show'>('all');
  const [memberTypeFilter, setMemberTypeFilter] = useState<'all' | 'regulars' | 'new'>('all');
  const [showHighPerformingOnly, setShowHighPerformingOnly] = useState(false);
  const [isOptimizationEnabled, setIsOptimizationEnabled] = useState(false); // Separate flag for optimization
  const [expandedDayFormats, setExpandedDayFormats] = useState<Set<string>>(new Set());
  const drilldownModalRef = useRef<HTMLDivElement>(null);
  
  // Use transition for non-urgent updates to prevent UI blocking
  const [isPending, startTransition] = useTransition();
  
  // Optimization Settings State - merge saved with defaults to ensure all properties exist
  const [optimizationSettings, setOptimizationSettings] = useState<OptimizationSettings>(() => {
    // Load from localStorage if available
    try {
      const saved = localStorage.getItem('proSchedulerOptimizationSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all properties exist (handles old saved settings)
        return {
          ...DEFAULT_OPTIMIZATION_SETTINGS,
          ...parsed,
          // Ensure arrays are never undefined
          blockedTrainers: parsed.blockedTrainers || DEFAULT_OPTIMIZATION_SETTINGS.blockedTrainers,
          excludedFormats: parsed.excludedFormats || DEFAULT_OPTIMIZATION_SETTINGS.excludedFormats,
          trainerLeaves: parsed.trainerLeaves || DEFAULT_OPTIMIZATION_SETTINGS.trainerLeaves,
          formatAdjustments: parsed.formatAdjustments || DEFAULT_OPTIMIZATION_SETTINGS.formatAdjustments,
          trainerAdjustments: parsed.trainerAdjustments || DEFAULT_OPTIMIZATION_SETTINGS.trainerAdjustments,
          dayAdjustments: parsed.dayAdjustments || DEFAULT_OPTIMIZATION_SETTINGS.dayAdjustments,
          newTrainers: parsed.newTrainers || DEFAULT_OPTIMIZATION_SETTINGS.newTrainers,
          priorityTrainers: parsed.priorityTrainers || DEFAULT_OPTIMIZATION_SETTINGS.priorityTrainers,
          formatPriorities: parsed.formatPriorities || DEFAULT_OPTIMIZATION_SETTINGS.formatPriorities,
          locationConstraints: parsed.locationConstraints || DEFAULT_OPTIMIZATION_SETTINGS.locationConstraints,
          minClassesPerLocation: parsed.minClassesPerLocation || DEFAULT_OPTIMIZATION_SETTINGS.minClassesPerLocation,
        };
      }
    } catch (e) {
      console.error('Failed to load optimization settings:', e);
    }
    return DEFAULT_OPTIMIZATION_SETTINGS;
  });
  const [showOptimizationSettings, setShowOptimizationSettings] = useState(false);
  const [showAllReplacements, setShowAllReplacements] = useState(false);
  
  // AI Optimization State
  const [isAIOptimizing, setIsAIOptimizing] = useState(false);
  const [isCalculatingOptimization, setIsCalculatingOptimization] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [aiOptimizationResult, _setAIOptimizationResult] = useState<{
    replacements: Array<{
      original: { className: string; trainer: string; day: string; time: string; location: string; avgCheckIns: number; fillRate: number; id?: string };
      replacement: { className: string; trainer: string; reason: string; projectedCheckIns: number; projectedFillRate: number; confidence: number; isAIOptimized?: boolean; dataPoints?: string[]; reasoning?: string };
    }>;
    newClasses: Array<{
      className: string;
      trainer: string;
      day: string;
      time: string;
      location: string;
      reason: string;
      projectedCheckIns: number;
      confidence: number;
      isAIOptimized?: boolean;
      dataPoints?: string[];
    }>;
    formatMixAnalysis: {
      current: Record<string, number>;
      recommended: Record<string, number>;
      adjustments: string[];
    };
    insights: string[];
    recommendations?: Array<{
      type: 'swap' | 'add' | 'remove' | 'time_change' | 'trainer_change';
      title: string;
      description: string;
      reasoning?: string;
      impact: string;
      confidence: number;
      dataPoints?: string[];
      alternatives?: string[];
      actionData?: any;
    }>;
  } | null>(null);
  // showAIResults state - kept for future UI enhancement
  // const [showAIResults, setShowAIResults] = useState(false);
  const [appliedAIReplacements, setAppliedAIReplacements] = useState<Set<string>>(new Set());
  
  // Smart Optimization State - New improved AI system
  const [smartOptimizationResult, setSmartOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isSmartOptimizing, setIsSmartOptimizing] = useState(false);
  const [appliedSmartSuggestions, setAppliedSmartSuggestions] = useState<Set<string>>(new Set());
  const [showSmartInsights, setShowSmartInsights] = useState(false);

  // Modular Optimizer State - Per-day optimization
  // These are used by handleOptimizeDay which is currently commented out
  // const [dayOptimizations, setDayOptimizations] = useState<Map<string, DayOptimization>>(new Map());
  // const [optimizingDays, setOptimizingDays] = useState<Set<string>>(new Set());
  const [aiOptimizationError, setAIOptimizationError] = useState<AIOptimizationError | null>(null);
  const [modularAIResult, setModularAIResult] = useState<AIOptimizationResult | null>(null);
  // const [showOptimizePanel, setShowOptimizePanel] = useState(false);
  
  // Deferred values for optimization - these defer the heavy computation to prevent UI blocking
  const deferredOptimizationSettings = useDeferredValue(optimizationSettings);
  const deferredShowHighPerforming = useDeferredValue(showHighPerformingOnly);
  
  // Save optimization settings to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem('proSchedulerOptimizationSettings', JSON.stringify(optimizationSettings));
    } catch (e) {
      console.error('Failed to save optimization settings:', e);
    }
  }, [optimizationSettings]);
  
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
    
    // Check if cache was invalidated by drag-drop update
    const invalidateTimestamp = (typeof window !== 'undefined') ? (window as any).__proSchedulerCacheInvalidate || 0 : 0;
    if (invalidateTimestamp > lastInvalidateTimestamp) {
      cachedScheduleClasses = null;
      lastInvalidateTimestamp = invalidateTimestamp;
      console.log('🔄 Cache invalidated, refreshing schedule classes');
    }
    
    // Return cached data if still valid
    if (cachedScheduleClasses && (now - cacheTimestamp) < CACHE_DURATION) {
      return cachedScheduleClasses;
    }
    
    const classes: ScheduleClass[] = [];
    
    // Process active classes data as PRIMARY source - always show these
    if (activeClassesData && Object.keys(activeClassesData).length > 0) {
      Object.entries(activeClassesData).forEach(([day, dayClasses]) => {
        dayClasses.forEach((activeClass: any) => {
          // FILTER: Skip classes without trainer or containing 'hosted'
          if (!activeClass.trainer || activeClass.trainer.trim() === '' || 
              activeClass.className?.toLowerCase().includes('hosted')) {
            return;
          }
          // Normalize time format from Active.csv (e.g., "7:15 AM" -> "07:15")
          const normalizeTime = (time: string): string => {
            if (!time) return '08:00';
            
            // If already in 24h format, return as-is
            if (/^\d{2}:\d{2}$/.test(time)) return time;
            
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

          // Current day/time (may have been updated by drag-drop)
          const currentDay = activeClass.day || day;
          const normalizedTime = normalizeTime(activeClass.time);
          
          // Original day/time (for metrics lookup and reference display)
          const originalDay = activeClass.originalDay || currentDay;
          const originalTime = activeClass.originalTime || normalizedTime;
          
          // Generate stable ID - use stored ID or create one based on original position
          const stableId = activeClass.id || 
            `active-${originalDay}-${originalTime}-${activeClass.className}-${activeClass.location || 'Unknown'}`.replace(/\s+/g, '_');
          
          // Calculate metrics from historical data using ORIGINAL day/time
          // This ensures metrics remain accurate even after moving the class
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Start of today
          
          const historicalSessions = rawData.filter((session: SessionData) => {
            // CRITICAL: Only include past sessions, exclude future ones
            const sessionDate = parseISO(session.Date);
            if (sessionDate >= today) return false; // Skip future sessions
            
            // Apply date range filter from ProScheduler filters
            const inDateRange = isWithinInterval(sessionDate, { start: filters.dateFrom, end: filters.dateTo });
            if (!inDateRange) return false;
            
            // Use ORIGINAL day/time for metrics lookup (historical data is at original position)
            const sessionTime24 = session.Time?.substring(0, 5) || '';
            const matchesTime = sessionTime24 === originalTime || 
                               session.Time?.startsWith(originalTime);
            const matchesDay = session.Day === originalDay;
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
            id: stableId, // Use stable ID for drag-drop
            day: currentDay, // Current scheduled day (after any moves)
            time: normalizedTime, // Current scheduled time
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
            // Original position tracking (for reference and display)
            originalDay: originalDay !== currentDay ? originalDay : undefined,
            originalTime: originalTime !== normalizedTime ? originalTime : undefined,
            wasMoved: originalDay !== currentDay || originalTime !== normalizedTime,
            // Trainer change indicators
            lastWeekTrainer: (() => {
              // Get last week's trainer for this slot (use original day/time for historical lookup)
              const lastWeekStart = new Date(today);
              lastWeekStart.setDate(lastWeekStart.getDate() - 7);
              const lastWeekEnd = new Date(today);
              lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
              
              const lastWeekSessions = rawData.filter((s: SessionData) => {
                const sessionDate = parseISO(s.Date);
                if (sessionDate < lastWeekStart || sessionDate > lastWeekEnd) return false;
                return s.Day === originalDay && 
                       s.Time?.substring(0, 5) === originalTime && 
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

  // Cached optimized schedule result to prevent re-computation
  const [cachedOptimizedSchedule, setCachedOptimizedSchedule] = useState<any>(null);
  
  // ========== SMART SCHEDULE OPTIMIZATION ==========
  // When Top Classes mode is ON, replace underperforming classes with optimal alternatives
  // Respects location constraints, trainer priorities, format rules, and parallel class limits
  // Uses seeded randomization for unique but reproducible iterations
  // NOTE: Now uses deferred values to prevent UI blocking - computation runs in low priority
  const optimizedSchedule = useMemo(() => {
    // Use deferred value to prevent blocking - this computation only runs when React has idle time
    if (!deferredShowHighPerforming) return null;
    
    const settings = deferredOptimizationSettings;
    const TRAINER_TARGET_HOURS = settings.targetTrainerHours;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Initialize seeded random generator for unique iterations each time Top Classes is activated
    const rng = new SeededRandom(settings.randomizationSeed);
    
    // Strategy weights based on selected mode
    const getStrategyWeights = () => {
      switch (settings.strategy) {
        case 'maximize_attendance':
          return { attendance: 2.0, trainerHours: 0.8, formatDiversity: 0.6, peakBonus: 1.5 };
        case 'trainer_development':
          return { attendance: 0.8, trainerHours: 1.5, formatDiversity: 1.0, newTrainerBonus: 2.0 };
        case 'format_diversity':
          return { attendance: 0.9, trainerHours: 0.9, formatDiversity: 2.0, peakBonus: 0.8 };
        case 'peak_optimization':
          return { attendance: 1.2, trainerHours: 0.9, formatDiversity: 0.7, peakBonus: 2.5 };
        case 'member_retention':
          return { attendance: 1.3, trainerHours: 0.8, formatDiversity: 1.2, loyaltyBonus: 2.0 };
        case 'balanced':
        default:
          return { attendance: 1.0, trainerHours: 1.0, formatDiversity: 1.0, peakBonus: 1.0 };
      }
    };
    const strategyWeights = getStrategyWeights();
    
    // Helper: Check if trainer is a priority trainer for a location
    const isPriorityTrainerForLocation = (trainerName: string, location: string): boolean => {
      const constraints = settings.locationConstraints?.[location];
      if (!constraints || !constraints.priorityTrainers) return false;
      return constraints.priorityTrainers.some(t => t.toLowerCase() === trainerName.toLowerCase());
    };
    
    // Helper: Check if trainer is a priority for a specific format
    const isPriorityTrainerForFormat = (trainerName: string, formatName: string): boolean => {
      const formatPriority = settings.formatPriorities?.find(fp => 
        formatName.toLowerCase().includes(fp.format.toLowerCase())
      );
      if (!formatPriority || !formatPriority.priorityTrainers) return false;
      return formatPriority.priorityTrainers.some(t => t.toLowerCase() === trainerName.toLowerCase());
    };
    
    // Helper: Check if trainer is a new trainer with format restrictions
    const getNewTrainerRestrictions = (trainerName: string): string[] | null => {
      const newTrainer = settings.newTrainers?.find(t => 
        t.name.toLowerCase() === trainerName.toLowerCase()
      );
      return newTrainer?.allowedFormats || null;
    };
    
    // Helper: Check if format can be taught by trainer at location
    const canTrainerTeachFormat = (trainerName: string, formatName: string, location: string): boolean => {
      // Check if new trainer with restrictions
      const restrictions = getNewTrainerRestrictions(trainerName);
      if (restrictions) {
        const canTeach = restrictions.some(f => formatName.toLowerCase().includes(f.toLowerCase()));
        if (!canTeach) return false;
      }
      
      // Check if trainer teaches at this location (from historical data)
      const trainerLocationSessions = rawData.filter((s: SessionData) => 
        s.Trainer?.toLowerCase().trim() === trainerName.toLowerCase() &&
        s.Location === location
      );
      
      // If trainer has no history at this location, only allow if they're a priority trainer there
      if (trainerLocationSessions.length === 0) {
        return isPriorityTrainerForLocation(trainerName, location);
      }
      
      return true;
    };
    
    // Helper: Get format category (cycle, strength, etc.)
    const getFormatCategory = (formatName: string): string => {
      const lower = formatName.toLowerCase();
      if (lower.includes('cycle') || lower.includes('powercycle')) return 'cycle';
      if (lower.includes('strength') || lower.includes('fit') || lower.includes('hiit')) return 'strength';
      if (lower.includes('barre')) return 'barre';
      if (lower.includes('yoga')) return 'yoga';
      if (lower.includes('pilates') || lower.includes('mat')) return 'mat';
      if (lower.includes('recovery')) return 'recovery';
      if (lower.includes('boxing')) return 'boxing';
      return 'other';
    };
    
    // Helper: Check if class is a hosted class (should be excluded from optimization)
    const isHostedClass = (className: string): boolean => {
      const lower = className.toLowerCase();
      return lower.includes('hosted') || lower.includes('host') || lower.includes('guest');
    };
    
    // Step 1: Filter classes by location filter AND exclude hosted classes
    const locationFilteredClasses = scheduleClasses.filter(cls => {
      if (filters.locations.length > 0 && !filters.locations.includes(cls.location)) return false;
      // NEVER include hosted classes in optimization
      if (isHostedClass(cls.class)) return false;
      return true;
    });
    
    // Step 2: Calculate trainer performance metrics from historical data (filtered by location)
    const trainerMetrics = new Map<string, {
      name: string;
      location: string;
      totalSessions: number;
      totalCheckIns: number;
      avgCheckIns: number;
      fillRate: number;
      currentWeeklyHours: number;
      hoursToTarget: number;
      isPriority: boolean;
      isNewTrainer: boolean;
      topClasses: Array<{ class: string; avgCheckIns: number; fillRate: number; sessions: number; location: string }>;
      bestTimeSlots: Array<{ day: string; time: string; avgCheckIns: number }>;
    }>();
    
    // Analyze historical sessions for trainer performance (per location)
    const trainerSessionsByLocation = new Map<string, SessionData[]>();
    rawData.forEach((session: SessionData) => {
      const sessionDate = parseISO(session.Date);
      if (sessionDate >= today) return;
      if (!isWithinInterval(sessionDate, { start: filters.dateFrom, end: filters.dateTo })) return;
      
      // RESPECT LOCATION FILTER
      if (filters.locations.length > 0 && !filters.locations.includes(session.Location)) return;
      
      const trainer = session.Trainer?.toLowerCase().trim();
      const location = session.Location;
      if (!trainer || !location) return;
      
      const key = `${trainer}|${location}`;
      if (!trainerSessionsByLocation.has(key)) {
        trainerSessionsByLocation.set(key, []);
      }
      trainerSessionsByLocation.get(key)!.push(session);
    });
    
    // Calculate metrics for each trainer-location combo
    trainerSessionsByLocation.forEach((sessions, key) => {
      const [trainerName, location] = key.split('|');
      
      const totalCheckIns = sessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0);
      const totalCapacity = sessions.reduce((sum, s) => sum + (s.Capacity || 0), 0);
      const avgCheckIns = sessions.length > 0 ? totalCheckIns / sessions.length : 0;
      const fillRate = totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0;
      
      // Calculate current weekly hours from active schedule (at this location)
      const currentWeeklyHours = locationFilteredClasses
        .filter(cls => cls.trainer.toLowerCase().trim() === trainerName && cls.location === location)
        .reduce((sum) => sum + 1, 0);
      
      // Check priority status
      const isPriority = isPriorityTrainerForLocation(trainerName, location);
      const isNewTrainer = settings.newTrainers?.some(t => t.name.toLowerCase() === trainerName.toLowerCase()) || false;
      
      // Find top classes for this trainer at this location
      const classPerformance = new Map<string, { checkIns: number; capacity: number; count: number }>();
      sessions.forEach(s => {
        const cls = s.Class;
        if (!cls) return;
        const perf = classPerformance.get(cls) || { checkIns: 0, capacity: 0, count: 0 };
        perf.checkIns += s.CheckedIn || 0;
        perf.capacity += s.Capacity || 0;
        perf.count += 1;
        classPerformance.set(cls, perf);
      });
      
      const topClasses = Array.from(classPerformance.entries())
        .map(([className, perf]) => ({
          class: className,
          avgCheckIns: perf.count > 0 ? perf.checkIns / perf.count : 0,
          fillRate: perf.capacity > 0 ? (perf.checkIns / perf.capacity) * 100 : 0,
          sessions: perf.count,
          location
        }))
        .filter(c => c.sessions >= 2)
        .sort((a, b) => b.avgCheckIns - a.avgCheckIns)
        .slice(0, 8);
      
      // Find best time slots
      const slotPerformance = new Map<string, { checkIns: number; count: number }>();
      sessions.forEach(s => {
        const key = `${s.Day}-${s.Time}`;
        const perf = slotPerformance.get(key) || { checkIns: 0, count: 0 };
        perf.checkIns += s.CheckedIn || 0;
        perf.count += 1;
        slotPerformance.set(key, perf);
      });
      
      const bestTimeSlots = Array.from(slotPerformance.entries())
        .map(([k, perf]) => {
          const [day, time] = k.split('-');
          return { day, time, avgCheckIns: perf.count > 0 ? perf.checkIns / perf.count : 0 };
        })
        .sort((a, b) => b.avgCheckIns - a.avgCheckIns)
        .slice(0, 5);
      
      trainerMetrics.set(key, {
        name: trainerName,
        location,
        totalSessions: sessions.length,
        totalCheckIns,
        avgCheckIns,
        fillRate,
        currentWeeklyHours,
        hoursToTarget: TRAINER_TARGET_HOURS - currentWeeklyHours,
        isPriority,
        isNewTrainer,
        topClasses,
        bestTimeSlots
      });
    });
    
    // Step 2b: Calculate TOTAL trainer hours across ALL locations (not per-location)
    const trainerTotalHoursAcrossLocations = new Map<string, number>();
    scheduleClasses.forEach(cls => {
      if (isHostedClass(cls.class)) return; // Don't count hosted classes
      const trainerName = cls.trainer.toLowerCase().trim();
      trainerTotalHoursAcrossLocations.set(
        trainerName,
        (trainerTotalHoursAcrossLocations.get(trainerName) || 0) + 1
      );
    });
    
    // TRAINER HOUR LIMIT: Use settings value (default 16 hours per week across ALL locations)
    const MAX_TRAINER_HOURS = settings.maxTrainerHours || 16;
    
    // Step 3: Identify underperforming classes (respecting filters, excluding hosted)
    const underperformingClasses: ScheduleClass[] = [];
    const highPerformingClasses: ScheduleClass[] = [];
    
    locationFilteredClasses.forEach(cls => {
      // Skip hosted classes - never consider them underperforming
      if (isHostedClass(cls.class)) {
        highPerformingClasses.push(cls); // Keep hosted classes as-is
        return;
      }
      
      const locationAvg = locationAverages.get(cls.location) || 0;
      const isUnderperforming = cls.avgCheckIns < locationAvg && cls.fillRate < 60;
      
      if (isUnderperforming) {
        underperformingClasses.push(cls);
      } else {
        highPerformingClasses.push(cls);
      }
    });
    
    // Step 4: Get format mix per day per location
    const dayLocationFormatMix = new Map<string, Set<string>>();
    const dayLocationTimeslotCount = new Map<string, Map<string, number>>();
    
    locationFilteredClasses.forEach(cls => {
      const dayLocKey = `${cls.day}|${cls.location}`;
      if (!dayLocationFormatMix.has(dayLocKey)) {
        dayLocationFormatMix.set(dayLocKey, new Set());
      }
      dayLocationFormatMix.get(dayLocKey)!.add(cls.class.toLowerCase());
      
      // Count classes per time slot per day/location
      if (!dayLocationTimeslotCount.has(dayLocKey)) {
        dayLocationTimeslotCount.set(dayLocKey, new Map());
      }
      const slotCounts = dayLocationTimeslotCount.get(dayLocKey)!;
      slotCounts.set(cls.time, (slotCounts.get(cls.time) || 0) + 1);
    });
    
    // Step 5: Generate replacement suggestions respecting all constraints
    const replacements: Array<{
      original: ScheduleClass;
      replacement: {
        trainer: string;
        trainerDisplay: string;
        class: string;
        reason: string;
        fullReason: string;
        expectedCheckIns: number;
        expectedFillRate: number;
        trainerHoursAfter: number;
        trainerMaxHours: number;
        score: number;
        isPriority: boolean;
        isNewTrainer: boolean;
        originalClass: string;
        originalTrainer: string;
        originalCheckIns: number;
        originalFillRate: number;
      };
    }> = [];
    
    // Track trainer hours during optimization (GLOBAL hours, not per-location)
    const trainerHoursTracker = new Map<string, number>();
    // Initialize with actual total hours across ALL locations
    trainerTotalHoursAcrossLocations.forEach((hours, trainerName) => {
      trainerHoursTracker.set(trainerName, hours);
    });
    
    // Track trainer work days for ensuring days off
    const trainerWorkDays = new Map<string, Set<string>>();
    // Track trainer locations per day for multi-location avoidance
    const trainerDayLocations = new Map<string, Map<string, Set<string>>>();
    
    // Initialize from current schedule
    locationFilteredClasses.forEach(cls => {
      const trainerName = cls.trainer.toLowerCase().trim();
      
      // Track work days
      if (!trainerWorkDays.has(trainerName)) {
        trainerWorkDays.set(trainerName, new Set());
      }
      trainerWorkDays.get(trainerName)!.add(cls.day);
      
      // Track locations per day
      if (!trainerDayLocations.has(trainerName)) {
        trainerDayLocations.set(trainerName, new Map());
      }
      if (!trainerDayLocations.get(trainerName)!.has(cls.day)) {
        trainerDayLocations.get(trainerName)!.set(cls.day, new Set());
      }
      trainerDayLocations.get(trainerName)!.get(cls.day)!.add(cls.location);
    });
    
    // Helper: Check if adding a class would violate days off requirement
    const wouldViolateDaysOff = (trainerName: string, day: string): boolean => {
      const minDaysOff = settings.minDaysOff || 2;
      const workDays = trainerWorkDays.get(trainerName) || new Set();
      
      // If trainer already works this day, no new violation
      if (workDays.has(day)) return false;
      
      // If adding this day would leave less than minDaysOff
      const newWorkDays = new Set(workDays);
      newWorkDays.add(day);
      const daysOff = 7 - newWorkDays.size;
      return daysOff < minDaysOff;
    };
    
    // Helper: Check if adding would create multi-location day
    const wouldCreateMultiLocationDay = (trainerName: string, day: string, location: string): boolean => {
      if (!settings.avoidMultiLocationDays) return false;
      
      const dayLocs = trainerDayLocations.get(trainerName)?.get(day);
      if (!dayLocs) return false;
      if (dayLocs.has(location)) return false; // Same location is fine
      return dayLocs.size > 0; // Has other locations = would create multi-location
    };
    
    // Location class count tracking for minimum requirements (from settings)
    const locationClassCounts = new Map<string, number>();
    const MINIMUM_CLASSES: Record<string, number> = settings.minClassesPerLocation || {
      'Kwality House, Kemps Corner': 95,
      'Supreme HQ, Bandra': 75
    };
    
    // Count current optimized classes per location
    locationFilteredClasses.forEach(cls => {
      if (!isHostedClass(cls.class)) {
        locationClassCounts.set(cls.location, (locationClassCounts.get(cls.location) || 0) + 1);
      }
    });
    
    underperformingClasses.forEach(underperformer => {
      const location = underperformer.location;
      const locationAvg = locationAverages.get(location) || 0;
      const dayLocKey = `${underperformer.day}|${location}`;
      const dayFormats = dayLocationFormatMix.get(dayLocKey) || new Set();
      const constraints = settings.locationConstraints[location];
      
      if (!constraints) return; // No constraints defined for this location
      
      // Find best replacement candidates
      const candidates: Array<{
        trainer: string;
        trainerDisplay: string;
        class: string;
        expectedCheckIns: number;
        expectedFillRate: number;
        score: number;
        reason: string;
        fullReason: string;
        hoursToTarget: number;
        currentHours: number;
        isNewTrainer: boolean;
        isPriority: boolean;
      }> = [];
      
      // Helper: Check if time is within restricted hours
      const isTimeRestricted = (time: string): boolean => {
        const [hours, minutes] = time.split(':').map(Number);
        const timeMinutes = hours * 60 + minutes;
        
        // No classes before noClassesBefore
        const [beforeH, beforeM] = (settings.noClassesBefore || '07:00').split(':').map(Number);
        if (timeMinutes < beforeH * 60 + beforeM) return true;
        
        // No classes after noClassesAfter  
        const [afterH, afterM] = (settings.noClassesAfter || '20:00').split(':').map(Number);
        if (timeMinutes > afterH * 60 + afterM) return true;
        
        // No classes between noClassesBetweenStart and noClassesBetweenEnd
        const [startH, startM] = (settings.noClassesBetweenStart || '12:30').split(':').map(Number);
        const [endH, endM] = (settings.noClassesBetweenEnd || '15:30').split(':').map(Number);
        const breakStart = startH * 60 + startM;
        const breakEnd = endH * 60 + endM;
        if (timeMinutes >= breakStart && timeMinutes <= breakEnd) return true;
        
        return false;
      };
      
      // Helper: Check if trainer is on leave
      const isTrainerOnLeave = (trainerName: string): boolean => {
        if (!settings.trainerLeaves || settings.trainerLeaves.length === 0) return false;
        const today = new Date();
        return settings.trainerLeaves.some((leave: TrainerLeave) => {
          if (!leave.trainerName.toLowerCase().includes(trainerName.toLowerCase())) return false;
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          return today >= start && today <= end;
        });
      };
      
      // Skip if time slot is restricted
      if (isTimeRestricted(underperformer.time)) {
        return; // Don't replace classes in restricted time slots
      }
      
      trainerMetrics.forEach((metrics) => {
        // ONLY consider trainers from the SAME location
        if (metrics.location !== location) return;
        
        // Skip if trainer has no top classes
        if (metrics.topClasses.length === 0) return;
        
        // CRITICAL: Skip blocked trainers - NEVER assign classes to them
        const trainerNameLower = metrics.name.toLowerCase();
        if (settings.blockedTrainers?.some(blocked => trainerNameLower.includes(blocked.toLowerCase()))) {
          return; // This trainer is blocked from optimization
        }
        
        // Skip trainers on leave
        if (isTrainerOnLeave(metrics.name)) {
          return; // Trainer is on leave
        }
        
        metrics.topClasses.forEach(topClass => {
          // Must be from same location
          if (topClass.location !== location) return;
          
          // Check if new trainer can teach this format
          if (!canTrainerTeachFormat(metrics.name, topClass.class, location)) return;
          
          // CRITICAL: Check if trainer would exceed 16 hours across ALL locations
          const currentTrainerTotalHours = trainerHoursTracker.get(metrics.name) || 0;
          if (currentTrainerTotalHours >= MAX_TRAINER_HOURS) {
            return; // Skip - trainer already at max hours
          }
          
          // Skip hosted classes - never schedule them as replacements
          if (isHostedClass(topClass.class)) return;
          
          // Skip excluded format types
          if (settings.excludedFormats?.some(fmt => topClass.class.toLowerCase().includes(fmt.toLowerCase()))) {
            return; // This format type is excluded
          }
          
          // Skip if this exact format already exists on this day at this location
          const formatCategory = getFormatCategory(topClass.class);
          
          // Skip if same trainer and class
          if (metrics.name === underperformer.trainer.toLowerCase() && 
              topClass.class.toLowerCase() === underperformer.class.toLowerCase()) return;
          
          // Calculate score with location-specific priorities and strategy weights
          let score = 0;
          const reasons: string[] = [];
          
          // ========== AI-ENHANCED SCORING WITH STRATEGY WEIGHTS ==========
          
          // Factor 1: Priority trainer bonus (HUGE boost) - weighted by strategy
          if (metrics.isPriority) {
            score += 50 * strategyWeights.trainerHours;
            reasons.push('Priority trainer for location');
          }
          
          // Factor 2: Format priority trainer match
          if (isPriorityTrainerForFormat(metrics.name, topClass.class)) {
            score += 40 * strategyWeights.formatDiversity;
            reasons.push(`Specialized in ${formatCategory}`);
          }
          
          // Factor 3: Trainer needs more hours (prioritize those below 15, but respect 16hr max)
          const currentTotalHours = trainerHoursTracker.get(metrics.name) || 0;
          const hoursToTarget = Math.min(TRAINER_TARGET_HOURS - currentTotalHours, MAX_TRAINER_HOURS - currentTotalHours);
          if (hoursToTarget > 0 && metrics.isPriority) {
            score += hoursToTarget * 8 * strategyWeights.trainerHours;
            reasons.push(`Needs +${hoursToTarget.toFixed(0)}hrs (${currentTotalHours.toFixed(0)}/${MAX_TRAINER_HOURS} total)`);
          }
          
          // Penalty for trainers near or at max hours
          if (currentTotalHours >= MAX_TRAINER_HOURS - 2) {
            score -= 30;
            reasons.push(`Near max hours (${currentTotalHours.toFixed(0)}/${MAX_TRAINER_HOURS})`);
          }
          
          // Factor 4: Class performance improvement - HEAVILY weighted by strategy
          const checkInsImprovement = topClass.avgCheckIns - underperformer.avgCheckIns;
          if (checkInsImprovement > 0) {
            score += checkInsImprovement * 5 * strategyWeights.attendance;
            reasons.push(`+${checkInsImprovement.toFixed(1)} attendance`);
          }
          
          // Factor 5: Peak time bonus (7-9am, 5-8pm are peak)
          const timeHour = parseInt(underperformer.time.split(':')[0]);
          const isPeakTime = (timeHour >= 7 && timeHour <= 9) || (timeHour >= 17 && timeHour <= 20);
          if (isPeakTime && topClass.avgCheckIns > locationAvg) {
            score += 20 * (strategyWeights.peakBonus || 1.0);
            reasons.push('Peak time optimization');
          }
          
          // Factor 6: Required format bonus (cycle/strength for Kwality)
          if (constraints.requiredFormats.includes(formatCategory)) {
            score += 30 * strategyWeights.formatDiversity;
            reasons.push(`Required format: ${formatCategory}`);
          }
          
          // Factor 7: Format mix diversity
          const existingCategories = Array.from(dayFormats).map(f => getFormatCategory(f));
          if (!existingCategories.includes(formatCategory)) {
            score += 20 * strategyWeights.formatDiversity;
            reasons.push(`Adds ${formatCategory} variety`);
          }
          
          // Factor 8: Minimize trainers per slot (if trainer already teaches at this time)
          const trainerAlreadyTeachesAtTime = locationFilteredClasses.some(
            cls => cls.trainer.toLowerCase() === metrics.name && 
                   cls.day === underperformer.day && 
                   cls.time === underperformer.time &&
                   cls.location === location
          );
          if (settings.minimizeTrainersPerSlot && !trainerAlreadyTeachesAtTime) {
            // Small penalty for adding a new trainer to the slot
            score -= 5;
          } else if (trainerAlreadyTeachesAtTime) {
            // Bonus for reusing same trainer
            score += 15;
            reasons.push('Trainer already at this time');
          }
          
          // Factor 9: New trainer appropriate assignment - enhanced with strategy
          if (metrics.isNewTrainer) {
            const restrictions = getNewTrainerRestrictions(metrics.name);
            if (restrictions?.some(f => topClass.class.toLowerCase().includes(f))) {
              // Apply new trainer bonus if in trainer_development strategy
              const newTrainerBonus = (strategyWeights as any).newTrainerBonus || 1.0;
              score += 10 * newTrainerBonus;
              reasons.push('Good fit for new trainer');
            }
          }
          
          // Factor 9: Days off check - penalize if would violate minimum days off
          if (wouldViolateDaysOff(metrics.name, underperformer.day)) {
            score -= 40; // Strong penalty
            reasons.push('Would reduce days off below minimum');
          }
          
          // Factor 10: Multi-location day check - penalize if would create multi-location day
          if (wouldCreateMultiLocationDay(metrics.name, underperformer.day, location)) {
            score -= 25; // Moderate penalty
            reasons.push('Would create multi-location day');
          }
          
          // Factor 11: Historical performance bonus - best trainer for best class
          if (metrics.isPriority && topClass.avgCheckIns > locationAvg * 1.2) {
            score += 25;
            reasons.push('Top performer for high-demand class');
          }
          
          // Only consider candidates with positive score and above average performance
          if (score > 0 && topClass.avgCheckIns >= locationAvg * 0.9) {
            const trainerDisplay = metrics.name.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            
            // Add controlled randomization for variety (±15% variation)
            const randomFactor = 0.85 + (rng.next() * 0.30); // 0.85 to 1.15
            const adjustedScore = score * randomFactor;
            
            candidates.push({
              trainer: metrics.name,
              trainerDisplay,
              class: topClass.class,
              expectedCheckIns: topClass.avgCheckIns,
              expectedFillRate: topClass.fillRate,
              score: adjustedScore,
              reason: reasons.slice(0, 2).join(', '),
              fullReason: reasons.join(' • '), // Full scheduling reason
              hoursToTarget,
              currentHours: trainerHoursTracker.get(metrics.name) || 0,
              isNewTrainer: metrics.isNewTrainer,
              isPriority: metrics.isPriority
            });
          }
        });
      });
      
      // Sort candidates by adjusted score - this creates variety in each iteration
      candidates.sort((a, b) => b.score - a.score);
      
      // For extra variety, occasionally pick from top 3 instead of always top 1
      // This ensures different schedules each time while maintaining quality
      let best = candidates[0];
      if (candidates.length >= 3) {
        // 20% chance to pick 2nd or 3rd best if they're within 15% of top score
        const variationChance = rng.next();
        if (variationChance > 0.8) {
          const topScore = candidates[0].score;
          const viableCandidates = candidates.slice(0, 3).filter(c => c.score >= topScore * 0.85);
          if (viableCandidates.length > 1) {
            best = rng.pick(viableCandidates) || candidates[0];
          }
        }
      }
      
      if (candidates.length > 0 && best) {
        
        // CRITICAL: Final check - ensure trainer won't exceed 16 hours
        const currentTotalHours = trainerHoursTracker.get(best.trainer) || 0;
        if (currentTotalHours >= MAX_TRAINER_HOURS) {
          return; // Skip this replacement - trainer at max
        }
        
        // Update GLOBAL hours tracker (by trainer name, not location key)
        trainerHoursTracker.set(best.trainer, currentTotalHours + 1);
        
        replacements.push({
          original: underperformer,
          replacement: {
            trainer: best.trainer,
            trainerDisplay: best.trainerDisplay,
            class: best.class,
            reason: best.reason,
            fullReason: best.fullReason,
            expectedCheckIns: best.expectedCheckIns,
            expectedFillRate: best.expectedFillRate,
            trainerHoursAfter: currentTotalHours + 1,
            trainerMaxHours: MAX_TRAINER_HOURS,
            score: best.score,
            isPriority: best.isPriority,
            isNewTrainer: best.isNewTrainer,
            originalClass: underperformer.class,
            originalTrainer: underperformer.trainer,
            originalCheckIns: underperformer.avgCheckIns,
            originalFillRate: underperformer.fillRate
          }
        });
        
        // Update format mix
        dayFormats.add(best.class.toLowerCase());
        
        // Update trainer work days tracker
        if (!trainerWorkDays.has(best.trainer)) {
          trainerWorkDays.set(best.trainer, new Set());
        }
        trainerWorkDays.get(best.trainer)!.add(underperformer.day);
        
        // Update trainer day locations tracker
        if (!trainerDayLocations.has(best.trainer)) {
          trainerDayLocations.set(best.trainer, new Map());
        }
        if (!trainerDayLocations.get(best.trainer)!.has(underperformer.day)) {
          trainerDayLocations.get(best.trainer)!.set(underperformer.day, new Set());
        }
        trainerDayLocations.get(best.trainer)!.get(underperformer.day)!.add(location);
      }
    });
    
    // Sort replacements by score
    replacements.sort((a, b) => b.replacement.score - a.replacement.score);
    
    // Calculate location class counts AFTER replacements
    const locationCounts: Record<string, number> = {};
    const locationShortfalls: Record<string, { needed: number; reasons: string[] }> = {};
    
    Object.keys(MINIMUM_CLASSES).forEach(loc => {
      const currentCount = locationFilteredClasses.filter(cls => cls.location === loc).length;
      const minimum = MINIMUM_CLASSES[loc];
      locationCounts[loc] = currentCount;
      
      if (currentCount < minimum) {
        const shortfall = minimum - currentCount;
        const reasons: string[] = [];
        
        // Analyze why we couldn't meet minimums
        const availableTrainers = Array.from(trainerMetrics.values())
          .filter(t => t.location === loc && !(settings.blockedTrainers || []).some(b => t.name.includes(b)));
        
        const trainersAtMax = availableTrainers.filter(t => 
          (trainerHoursTracker.get(t.name) || 0) >= MAX_TRAINER_HOURS
        );
        
        const trainersNearMax = availableTrainers.filter(t => {
          const hours = trainerHoursTracker.get(t.name) || 0;
          return hours >= MAX_TRAINER_HOURS - 2 && hours < MAX_TRAINER_HOURS;
        });
        
        if (trainersAtMax.length > 0) {
          reasons.push(`${trainersAtMax.length} trainers at max ${MAX_TRAINER_HOURS}hrs: ${trainersAtMax.map(t => t.name).slice(0, 3).join(', ')}${trainersAtMax.length > 3 ? '...' : ''}`);
        }
        
        if (trainersNearMax.length > 0) {
          reasons.push(`${trainersNearMax.length} trainers near max hours`);
        }
        
        if ((settings.blockedTrainers || []).length > 0) {
          reasons.push(`${(settings.blockedTrainers || []).length} trainers blocked from optimization`);
        }
        
        if (settings.trainerLeaves && settings.trainerLeaves.length > 0) {
          reasons.push(`${settings.trainerLeaves.length} trainers on leave`);
        }
        
        // Check if we have enough underperforming classes to replace
        const underperformingAtLoc = underperformingClasses.filter(c => c.location === loc).length;
        if (underperformingAtLoc < shortfall) {
          reasons.push(`Only ${underperformingAtLoc} underperforming classes available to optimize`);
        }
        
        // Check time restrictions impact
        reasons.push(`Time restrictions: No classes before ${settings.noClassesBefore || '07:00'}, after ${settings.noClassesAfter || '20:00'}, or ${settings.noClassesBetweenStart || '12:30'}-${settings.noClassesBetweenEnd || '15:30'}`);
        
        locationShortfalls[loc] = { needed: shortfall, reasons };
      }
    });
    
    return {
      highPerformingClasses,
      underperformingClasses,
      replacements,
      trainerMetrics,
      trainerHoursTracker,
      trainerWorkDays,
      locationCounts,
      locationShortfalls,
      minimumClasses: MINIMUM_CLASSES,
      maxTrainerHours: MAX_TRAINER_HOURS,
      summary: {
        totalClasses: locationFilteredClasses.length,
        highPerforming: highPerformingClasses.length,
        underperforming: underperformingClasses.length,
        replacementsFound: replacements.length,
        minimumsNotMet: Object.keys(locationShortfalls).length > 0
      }
    };
  }, [deferredShowHighPerforming, scheduleClasses, rawData, filters.dateFrom, filters.dateTo, filters.locations, locationAverages, getFormatDifficulty, deferredOptimizationSettings]);

  // Deferred optimization calculation to prevent UI freezing
  // Uses the deferred values to ensure computation doesn't block UI
  useEffect(() => {
    // Show loading state immediately when user toggles on
    if (showHighPerformingOnly && !isCalculatingOptimization && !cachedOptimizedSchedule) {
      setIsCalculatingOptimization(true);
    }
    
    // When deferred computation completes, update cache
    if (deferredShowHighPerforming && optimizedSchedule) {
      setCachedOptimizedSchedule(optimizedSchedule);
      setIsCalculatingOptimization(false);
    } else if (!showHighPerformingOnly) {
      setCachedOptimizedSchedule(null);
      setIsCalculatingOptimization(false);
    }
  }, [showHighPerformingOnly, deferredShowHighPerforming, optimizedSchedule, isCalculatingOptimization, cachedOptimizedSchedule]);

  // AI-powered schedule optimization handler - uses modular optimizer with proper error handling
  const handleAIOptimization = useCallback(async () => {
    if (isAIOptimizing) return;
    
    // Reset state
    setIsAIOptimizing(true);
    setAIOptimizationError(null);
    setModularAIResult(null);
    setAppliedAIReplacements(new Set());
    
    // Small delay to let UI update with loading state
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Check if AI is available FIRST - NO FALLBACK
    if (!AIOptimizer.isAvailable()) {
      setAIOptimizationError({
        code: 'API_UNAVAILABLE',
        message: 'AI service is not available. Please ensure your Google AI API key is configured correctly in the environment settings.',
        timestamp: new Date()
      });
      setIsAIOptimizing(false);
      return;
    }
    
    try {
      // Build performance data using modular analyzer
      const dateFromStr = filters.dateFrom instanceof Date ? filters.dateFrom.toISOString().split('T')[0] : filters.dateFrom;
      const dateToStr = filters.dateTo instanceof Date ? filters.dateTo.toISOString().split('T')[0] : filters.dateTo;
      const performances = DataAnalyzer.analyzeClassPerformance(rawData, dateFromStr, dateToStr);
      const trainerMetrics = DataAnalyzer.analyzeTrainerPerformance(rawData, {
        targetTrainerHours: optimizationSettings.targetTrainerHours,
        maxTrainerHours: optimizationSettings.maxTrainerHours || 16,
        minDaysOff: optimizationSettings.minDaysOff || 2,
        noClassesBefore: optimizationSettings.noClassesBefore || '07:00',
        noClassesAfter: optimizationSettings.noClassesAfter || '20:00',
        noClassesBetweenStart: optimizationSettings.noClassesBetweenStart || '12:30',
        noClassesBetweenEnd: optimizationSettings.noClassesBetweenEnd || '15:30',
        blockedTrainers: optimizationSettings.blockedTrainers || [],
        excludedFormats: optimizationSettings.excludedFormats || ['hosted', 'host', 'guest'],
        trainerLeaves: optimizationSettings.trainerLeaves || [],
        locationConstraints: optimizationSettings.locationConstraints || {},
        formatPriorities: optimizationSettings.formatPriorities || [],
        newTrainers: optimizationSettings.newTrainers || [],
        strategy: optimizationSettings.strategy || 'balanced'
      });
      
      // Run AI optimization
      const result = await AIOptimizer.optimizeFullSchedule(
        scheduleClasses,
        performances,
        trainerMetrics,
        {
          targetTrainerHours: optimizationSettings.targetTrainerHours,
          maxTrainerHours: optimizationSettings.maxTrainerHours || 16,
          minDaysOff: optimizationSettings.minDaysOff || 2,
          noClassesBefore: optimizationSettings.noClassesBefore || '07:00',
          noClassesAfter: optimizationSettings.noClassesAfter || '20:00',
          noClassesBetweenStart: optimizationSettings.noClassesBetweenStart || '12:30',
          noClassesBetweenEnd: optimizationSettings.noClassesBetweenEnd || '15:30',
          blockedTrainers: optimizationSettings.blockedTrainers || [],
          excludedFormats: optimizationSettings.excludedFormats || ['hosted', 'host', 'guest'],
          trainerLeaves: optimizationSettings.trainerLeaves || [],
          locationConstraints: optimizationSettings.locationConstraints || {},
          formatPriorities: optimizationSettings.formatPriorities || [],
          newTrainers: optimizationSettings.newTrainers || [],
          strategy: optimizationSettings.strategy || 'balanced'
        }
      );
      
      if (!result.success && result.error) {
        setAIOptimizationError(result.error);
        setIsAIOptimizing(false);
        return;
      }
      
      setModularAIResult(result);
      
      // Auto-apply high confidence suggestions
      if (result.suggestions && result.suggestions.length > 0) {
        const newApplied = new Set<string>();
        result.suggestions
          .filter(s => s.confidence >= 70)
          .forEach(suggestion => {
            newApplied.add(suggestion.id);
          });
        setAppliedAIReplacements(newApplied);
      }
      
      // Show the optimization panel with results
      setShowOptimizationPanel(true);
      
    } catch (error: any) {
      console.error('AI optimization failed:', error);
      setAIOptimizationError({
        code: 'UNKNOWN',
        message: error.message || 'An unexpected error occurred during AI optimization.',
        timestamp: new Date()
      });
    } finally {
      setIsAIOptimizing(false);
    }
  }, [isAIOptimizing, rawData, scheduleClasses, filters, optimizationSettings]);

  /* 
   * Per-day optimization handler - COMMENTED OUT FOR NOW
   * Will be enabled when per-day optimize buttons are added to calendar headers
   * 
  const handleOptimizeDay = useCallback(async (day: string) => {
    if (optimizingDays.has(day)) return;
    
    setOptimizingDays(prev => new Set(prev).add(day));
    setAIOptimizationError(null);
    
    // Check if AI is available FIRST - NO FALLBACK
    if (!AIOptimizer.isAvailable()) {
      setAIOptimizationError({
        code: 'API_UNAVAILABLE',
        message: 'AI service is not available. Please configure your API key.',
        timestamp: new Date()
      });
      setOptimizingDays(prev => {
        const next = new Set(prev);
        next.delete(day);
        return next;
      });
      return;
    }
    
    try {
      const dayDateFromStr = filters.dateFrom instanceof Date ? filters.dateFrom.toISOString().split('T')[0] : filters.dateFrom;
      const dayDateToStr = filters.dateTo instanceof Date ? filters.dateTo.toISOString().split('T')[0] : filters.dateTo;
      const performances = DataAnalyzer.analyzeClassPerformance(rawData, dayDateFromStr, dayDateToStr);
      const trainerMetrics = DataAnalyzer.analyzeTrainerPerformance(rawData, {
        targetTrainerHours: optimizationSettings.targetTrainerHours,
        maxTrainerHours: optimizationSettings.maxTrainerHours || 16,
        minDaysOff: optimizationSettings.minDaysOff || 2,
        noClassesBefore: optimizationSettings.noClassesBefore || '07:00',
        noClassesAfter: optimizationSettings.noClassesAfter || '20:00',
        noClassesBetweenStart: optimizationSettings.noClassesBetweenStart || '12:30',
        noClassesBetweenEnd: optimizationSettings.noClassesBetweenEnd || '15:30',
        blockedTrainers: optimizationSettings.blockedTrainers || [],
        excludedFormats: optimizationSettings.excludedFormats || ['hosted', 'host', 'guest'],
        trainerLeaves: optimizationSettings.trainerLeaves || [],
        locationConstraints: optimizationSettings.locationConstraints || {},
        formatPriorities: optimizationSettings.formatPriorities || [],
        newTrainers: optimizationSettings.newTrainers || [],
        strategy: optimizationSettings.strategy || 'balanced'
      });
      
      const locations = filters.locations.length > 0 ? filters.locations : [...new Set(scheduleClasses.map(c => c.location))];
      
      // Optimize for each location on this day
      for (const location of locations) {
        const result = await AIOptimizer.optimizeWithAI(
          day,
          location,
          scheduleClasses,
          performances,
          trainerMetrics,
          {
            targetTrainerHours: optimizationSettings.targetTrainerHours,
            maxTrainerHours: optimizationSettings.maxTrainerHours || 16,
            minDaysOff: optimizationSettings.minDaysOff || 2,
            noClassesBefore: optimizationSettings.noClassesBefore || '07:00',
            noClassesAfter: optimizationSettings.noClassesAfter || '20:00',
            noClassesBetweenStart: optimizationSettings.noClassesBetweenStart || '12:30',
            noClassesBetweenEnd: optimizationSettings.noClassesBetweenEnd || '15:30',
            blockedTrainers: optimizationSettings.blockedTrainers || [],
            excludedFormats: optimizationSettings.excludedFormats || ['hosted', 'host', 'guest'],
            trainerLeaves: optimizationSettings.trainerLeaves || [],
            locationConstraints: optimizationSettings.locationConstraints || {},
            formatPriorities: optimizationSettings.formatPriorities || [],
            newTrainers: optimizationSettings.newTrainers || [],
            strategy: optimizationSettings.strategy || 'balanced'
          }
        );
        
        if (!result.success && result.error) {
          setAIOptimizationError(result.error);
          break;
        }
        
        // Store day optimization result
        if (result.suggestions.length > 0) {
          setDayOptimizations(prev => {
            const next = new Map(prev);
            next.set(`${day}-${location}`, {
              day,
              location,
              changes: result.suggestions.map(s => ({
                type: s.type === 'replace_trainer' || s.type === 'replace_class' ? 'replace' as const : 
                      s.type === 'add_class' ? 'add' as const : 
                      s.type === 'remove_class' ? 'remove' as const : 'swap' as const,
                original: scheduleClasses.find(c => c.id === s.original.classId),
                suggested: {
                  class: s.suggested.className,
                  trainer: s.suggested.trainer,
                  time: s.suggested.time,
                  location: s.suggested.location
                },
                reason: s.reason,
                projectedImpact: s.confidence,
                confidence: s.confidence
              })),
              formatMixBefore: {},
              formatMixAfter: {},
              projectedFillRateChange: result.projectedImpact.fillRateChange
            });
            return next;
          });
        }
      }
      
    } catch (error: any) {
      console.error('Day optimization failed:', error);
      setAIOptimizationError({
        code: 'UNKNOWN',
        message: error.message || 'Failed to optimize this day.',
        timestamp: new Date()
      });
    } finally {
      setOptimizingDays(prev => {
        const next = new Set(prev);
        next.delete(day);
        return next;
      });
    }
  }, [optimizingDays, rawData, scheduleClasses, filters, optimizationSettings]);
  */

  // ========== SMART SCHEDULE OPTIMIZATION ==========
  // New improved AI optimization that analyzes patterns and suggests changes
  const handleSmartOptimization = useCallback(async () => {
    if (isSmartOptimizing) return;
    
    setIsSmartOptimizing(true);
    
    try {
      // Build profiles from historical data
      smartOptimizer.buildProfiles(rawData, filters.dateFrom, filters.dateTo);
      
      // Generate optimizations
      const result = smartOptimizer.generateOptimizations(
        scheduleClasses,
        {
          targetTrainerHours: optimizationSettings.targetTrainerHours,
          maxTrainerHours: optimizationSettings.maxTrainerHours || 16,
          minDaysOff: optimizationSettings.minDaysOff || 2,
          avoidMultiLocationDays: optimizationSettings.avoidMultiLocationDays || false,
          priorityTrainers: optimizationSettings.priorityTrainers?.map(t => t.name) || [],
          blockedTrainers: optimizationSettings.blockedTrainers || [],
          excludedFormats: optimizationSettings.excludedFormats || ['hosted'],
          locationConstraints: Object.fromEntries(
            Object.entries(optimizationSettings.locationConstraints || {}).map(([loc, constraints]) => [
              loc,
              {
                maxParallelClasses: constraints.maxParallelClasses,
                requiredFormats: constraints.requiredFormats,
                minClasses: optimizationSettings.minClassesPerLocation?.[loc] || 0
              }
            ])
          ),
          peakTimeBonus: 1.3,
          formatDiversityWeight: 1.0,
          trainerUtilizationWeight: 1.2,
          attendanceWeight: 1.5
        }
      );
      
      setSmartOptimizationResult(result);
      setShowSmartInsights(true);
      
      // Auto-apply high-confidence suggestions to calendar
      const highConfidence = result.suggestions.filter(s => s.confidence >= 75 && s.priority === 'high');
      const autoApplied = new Set<string>();
      highConfidence.forEach(s => {
        autoApplied.add(s.id);
      });
      setAppliedSmartSuggestions(autoApplied);
      
      console.log('Smart optimization complete:', result.suggestions.length, 'suggestions');
      
    } catch (error) {
      console.error('Smart optimization failed:', error);
    } finally {
      setIsSmartOptimizing(false);
    }
  }, [isSmartOptimizing, rawData, scheduleClasses, filters, optimizationSettings]);
  
  // Apply a smart suggestion to the calendar
  const applySmartSuggestion = useCallback((suggestion: OptimizationSuggestion) => {
    setAppliedSmartSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(suggestion.id)) {
        next.delete(suggestion.id);
      } else {
        next.add(suggestion.id);
      }
      return next;
    });
  }, []);
  
  // Get suggestion for a specific class
  const getSuggestionForClass = useCallback((classId: string): OptimizationSuggestion | null => {
    if (!smartOptimizationResult) return null;
    return smartOptimizationResult.suggestions.find(s => s.original.classId === classId) || null;
  }, [smartOptimizationResult]);

  // Apply Pro Scheduler filters independently (do not use global filters)
  // When Top Classes mode is ON, include optimized replacements
  // Uses cached schedule to prevent UI blocking
  const filteredClasses = useMemo(() => {
    // Combine regular and discontinued classes based on showDiscontinued state
    let classesToFilter = showDiscontinued 
      ? [...scheduleClasses, ...discontinuedClasses]
      : scheduleClasses;
    
    // Use cached optimized schedule to prevent recalculation
    const activeOptimizedSchedule = cachedOptimizedSchedule || optimizedSchedule;
    
    // When Top Classes mode is ON, replace underperforming with optimized alternatives
    if (showHighPerformingOnly && activeOptimizedSchedule) {
      const replacementMap = new Map<string, typeof activeOptimizedSchedule.replacements[0]>();
      activeOptimizedSchedule.replacements.forEach((r: any) => {
        replacementMap.set(r.original.id, r);
      });
      
      classesToFilter = classesToFilter.map(cls => {
        const replacement = replacementMap.get(cls.id);
        if (replacement) {
          // Return a modified class with replacement info
          return {
            ...cls,
            // Keep original slot info
            day: cls.day,
            time: cls.time,
            location: cls.location,
            // Replace class and trainer
            class: replacement.replacement.class,
            trainer: replacement.replacement.trainerDisplay,
            // Update expected metrics
            avgCheckIns: replacement.replacement.expectedCheckIns,
            fillRate: replacement.replacement.expectedFillRate,
            // Mark as optimized replacement
            isOptimizedReplacement: true,
            originalClass: replacement.replacement.originalClass,
            originalTrainer: replacement.replacement.originalTrainer,
            originalCheckIns: replacement.replacement.originalCheckIns,
            originalFillRate: replacement.replacement.originalFillRate,
            optimizationReason: replacement.replacement.reason,
            optimizationFullReason: replacement.replacement.fullReason,
            optimizationScore: replacement.replacement.score,
            trainerHoursAfter: replacement.replacement.trainerHoursAfter,
            trainerMaxHours: replacement.replacement.trainerMaxHours,
            isPriorityTrainer: replacement.replacement.isPriority,
            isNewTrainer: replacement.replacement.isNewTrainer
          } as ScheduleClass & { 
            isOptimizedReplacement: boolean; 
            originalClass: string; 
            originalTrainer: string;
            originalCheckIns: number;
            originalFillRate: number;
            optimizationReason: string;
            optimizationFullReason: string;
            optimizationScore: number;
            trainerHoursAfter: number;
            trainerMaxHours: number;
            isPriorityTrainer: boolean;
            isNewTrainer: boolean;
          };
        }
        return cls;
      });
    }
    
    // Apply SMART optimizations - new improved system
    if (smartOptimizationResult && appliedSmartSuggestions.size > 0) {
      const suggestionMap = new Map<string, OptimizationSuggestion>();
      smartOptimizationResult.suggestions.forEach(s => {
        if (s.original.classId && appliedSmartSuggestions.has(s.id)) {
          suggestionMap.set(s.original.classId, s);
        }
      });
      
      classesToFilter = classesToFilter.map(cls => {
        const suggestion = suggestionMap.get(cls.id);
        if (suggestion && (suggestion.type === 'replace_class' || suggestion.type === 'replace_trainer')) {
          return {
            ...cls,
            class: suggestion.suggested.className || cls.class,
            trainer: suggestion.suggested.trainer || cls.trainer,
            avgCheckIns: suggestion.suggested.projectedCheckIns,
            fillRate: suggestion.suggested.projectedFillRate,
            isSmartOptimized: true,
            smartConfidence: suggestion.confidence,
            smartReason: suggestion.reason,
            smartImpact: suggestion.impact,
            smartDataPoints: suggestion.dataPoints,
            smartPriority: suggestion.priority,
            originalClass: suggestion.original.className,
            originalTrainer: suggestion.original.trainer,
            originalCheckIns: suggestion.original.currentCheckIns,
            originalFillRate: suggestion.original.currentFillRate
          } as ScheduleClass & {
            isSmartOptimized: boolean;
            smartConfidence: number;
            smartReason: string;
            smartImpact: string;
            smartDataPoints: string[];
            smartPriority: string;
            originalClass: string;
            originalTrainer: string;
            originalCheckIns: number;
            originalFillRate: number;
          };
        }
        return cls;
      });
    }
    
    // Apply AI optimizations when available and applied
    if (aiOptimizationResult && appliedAIReplacements.size > 0) {
      // Build multiple key formats for matching
      const aiReplacementMap = new Map<string, typeof aiOptimizationResult.replacements[0]>();
      aiOptimizationResult.replacements.forEach(r => {
        // Primary key
        const key = `${r.original.className}-${r.original.trainer}-${r.original.day}-${r.original.time}-${r.original.location}`;
        aiReplacementMap.set(key, r);
        // Lowercase key for case-insensitive matching
        const lowerKey = key.toLowerCase();
        aiReplacementMap.set(lowerKey, r);
      });
      
      classesToFilter = classesToFilter.map(cls => {
        // Try multiple key formats
        const key = `${cls.class}-${cls.trainer}-${cls.day}-${cls.time}-${cls.location}`;
        const lowerKey = key.toLowerCase();
        
        // Check both keys
        const aiReplacement = aiReplacementMap.get(key) || aiReplacementMap.get(lowerKey);
        const isApplied = appliedAIReplacements.has(key) || appliedAIReplacements.has(lowerKey);
        
        if (aiReplacement && isApplied) {
          console.log('Applying AI replacement:', cls.class, '->', aiReplacement.replacement.className);
          return {
            ...cls,
            day: cls.day,
            time: cls.time,
            location: cls.location,
            class: aiReplacement.replacement.className,
            trainer: aiReplacement.replacement.trainer,
            avgCheckIns: aiReplacement.replacement.projectedCheckIns,
            fillRate: aiReplacement.replacement.projectedFillRate,
            isAIOptimized: true,
            aiConfidence: aiReplacement.replacement.confidence,
            aiReason: aiReplacement.replacement.reason,
            aiDataPoints: (aiReplacement.replacement as any).dataPoints || [],
            originalClass: aiReplacement.original.className,
            originalTrainer: aiReplacement.original.trainer,
            originalCheckIns: aiReplacement.original.avgCheckIns,
            originalFillRate: aiReplacement.original.fillRate
          } as ScheduleClass & {
            isAIOptimized: boolean;
            aiConfidence: number;
            aiReason: string;
            aiDataPoints: string[];
            originalClass: string;
            originalTrainer: string;
            originalCheckIns: number;
            originalFillRate: number;
          };
        }
        return cls;
      });
    }
    
    return classesToFilter.filter(cls => {
      // Location filter
      if (filters.locations.length > 0 && !filters.locations.includes(cls.location)) return false;
      // Trainer filter - match against both original and replacement trainer
      if (filters.trainers.length > 0) {
        const isOptimized = (cls as any).isOptimizedReplacement;
        const originalTrainer = (cls as any).originalTrainer;
        if (!filters.trainers.includes(cls.trainer) && 
            !(isOptimized && originalTrainer && filters.trainers.includes(originalTrainer))) {
          return false;
        }
      }
      // Class filter - match against both original and replacement class
      if (filters.classes.length > 0) {
        const isOptimized = (cls as any).isOptimizedReplacement || (cls as any).isAIOptimized || (cls as any).isSmartOptimized;
        const originalClass = (cls as any).originalClass;
        if (!filters.classes.includes(cls.class) && 
            !(isOptimized && originalClass && filters.classes.includes(originalClass))) {
          return false;
        }
      }
      // Active only filter
      if (filters.activeOnly && cls.status !== 'Active' && !cls.isDiscontinued) return false;
      // When Top Classes mode is ON, we've already optimized - don't filter out replacements
      if (showHighPerformingOnly) {
        // Keep all classes (both high-performing and optimized replacements)
        return true;
      }
      return true;
    });
  }, [scheduleClasses, discontinuedClasses, showDiscontinued, filters, showHighPerformingOnly, locationAverages, optimizedSchedule, cachedOptimizedSchedule, aiOptimizationResult, appliedAIReplacements, smartOptimizationResult, appliedSmartSuggestions]);

  // PERFORMANCE: Get unique values from pre-computed indices (O(1) instead of O(n))
  const uniqueTrainers = useMemo(() => {
    const indices = getDataIndices();
    if (indices) return indices.uniqueTrainers;
    // Fallback if indices not ready
    const trainers = rawData.map(session => session.Trainer).filter(Boolean);
    return Array.from(new Set(trainers)).sort();
  }, [rawData]);

  const uniqueLocations = useMemo(() => {
    const indices = getDataIndices();
    if (indices) return indices.uniqueLocations;
    // Fallback
    const locations = rawData.map(session => session.Location).filter(Boolean);
    return Array.from(new Set(locations)).sort();
  }, [rawData]);

  const uniqueClasses = useMemo(() => {
    const indices = getDataIndices();
    if (indices) return indices.uniqueClasses;
    // Fallback
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

  // Helper: Format number with max 1 decimal
  const formatMetric = (value: number | undefined | null, suffix: string = ''): string => {
    if (value === undefined || value === null || isNaN(value)) return '-';
    if (value === 0) return '0' + suffix;
    const formatted = Number(value.toFixed(1));
    return formatted + suffix;
  };

  // Calculate projected metrics for classes without historical data
  // Based on performance of other classes at same timeslot + location
  const getProjectedMetrics = (cls: ScheduleClass): { 
    avgCheckIns: number; 
    fillRate: number; 
    confidence: 'high' | 'medium' | 'low';
    basedOn: string;
    sampleSize: number;
  } => {
    // Try to find similar classes at same timeslot & location
    const similarSessions = rawData.filter((session: SessionData) => {
      const matchesDay = session.Day === cls.day;
      const matchesTime = session.Time?.startsWith(cls.time);
      const matchesLocation = session.Location?.toLowerCase() === cls.location.toLowerCase();
      return matchesDay && matchesTime && matchesLocation;
    });
    
    if (similarSessions.length >= 5) {
      const avgCheckIns = similarSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0) / similarSessions.length;
      const totalCapacity = similarSessions.reduce((sum, s) => sum + (s.Capacity || 0), 0);
      const fillRate = totalCapacity > 0 
        ? (similarSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0) / totalCapacity) * 100
        : 0;
      return { 
        avgCheckIns, 
        fillRate, 
        confidence: similarSessions.length >= 15 ? 'high' : 'medium',
        basedOn: `${cls.day} ${cls.time} at ${cls.location}`,
        sampleSize: similarSessions.length
      };
    }
    
    // Fallback: Try location-only
    const locationSessions = rawData.filter((session: SessionData) => {
      return session.Location?.toLowerCase() === cls.location.toLowerCase();
    });
    
    if (locationSessions.length >= 10) {
      const avgCheckIns = locationSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0) / locationSessions.length;
      const totalCapacity = locationSessions.reduce((sum, s) => sum + (s.Capacity || 0), 0);
      const fillRate = totalCapacity > 0 
        ? (locationSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0) / totalCapacity) * 100
        : 0;
      return { 
        avgCheckIns, 
        fillRate, 
        confidence: 'low',
        basedOn: `${cls.location} average`,
        sampleSize: locationSessions.length
      };
    }
    
    // Ultimate fallback: Overall average
    const avgCheckIns = rawData.length > 0
      ? rawData.reduce((sum: number, s: SessionData) => sum + (s.CheckedIn || 0), 0) / rawData.length
      : 10;
    const totalCapacity = rawData.reduce((sum: number, s: SessionData) => sum + (s.Capacity || 0), 0);
    const fillRate = totalCapacity > 0 
      ? (rawData.reduce((sum: number, s: SessionData) => sum + (s.CheckedIn || 0), 0) / totalCapacity) * 100
      : 50;
    return { 
      avgCheckIns, 
      fillRate, 
      confidence: 'low',
      basedOn: 'Overall studio average',
      sampleSize: rawData.length
    };
  };

  // Get all historical sessions for the selected class (with date filter applied)
  // For optimized replacements, look up sessions for the NEW trainer-class combo
  const getClassSessions = (cls: ScheduleClass): SessionData[] => {
    if (!cls) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isOptimized = (cls as any).isOptimizedReplacement;
    
    // For optimized replacements, find sessions for the NEW trainer teaching this class format
    // Look for ANY session of this class type by this trainer at this location
    if (isOptimized) {
      return rawData.filter((session: SessionData) => {
        const sessionDate = parseISO(session.Date);
        if (sessionDate >= today) return false;
        const inDateRange = isWithinInterval(sessionDate, { start: filters.dateFrom, end: filters.dateTo });
        if (!inDateRange) return false;
        
        // Match by trainer and class type (ignore day/time for optimized since we want historic perf)
        const matchesClass = session.Class?.toLowerCase() === cls.class.toLowerCase();
        const matchesLocation = session.Location?.toLowerCase() === cls.location.toLowerCase();
        const matchesTrainer = session.Trainer?.toLowerCase().includes(cls.trainer.toLowerCase()) ||
                              cls.trainer.toLowerCase().includes(session.Trainer?.toLowerCase() || '');
        
        return matchesClass && matchesLocation && matchesTrainer;
      }).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    }
    
    // Standard lookup for non-optimized classes
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

  // Get sessions for the ORIGINAL class (for comparison in optimized replacements)
  const getOriginalClassSessions = (cls: ScheduleClass): SessionData[] => {
    if (!cls) return [];
    const isOptimized = (cls as any).isOptimizedReplacement;
    if (!isOptimized) return [];
    
    const originalClass = (cls as any).originalClass;
    // originalTrainer available if needed: (cls as any).originalTrainer
    if (!originalClass) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return rawData.filter((session: SessionData) => {
      const sessionDate = parseISO(session.Date);
      if (sessionDate >= today) return false;
      const inDateRange = isWithinInterval(sessionDate, { start: filters.dateFrom, end: filters.dateTo });
      if (!inDateRange) return false;
      
      // Match original class details
      const matchesDay = session.Day === cls.day;
      const matchesTime = session.Time?.startsWith(cls.time);
      const matchesClass = session.Class?.toLowerCase() === originalClass.toLowerCase();
      const matchesLocation = session.Location?.toLowerCase() === cls.location.toLowerCase();
      
      return matchesDay && matchesTime && matchesClass && matchesLocation;
    }).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
  };

  // Render class card with enhanced styling
  const renderClassCard = (cls: ScheduleClass) => {
    // Check if this is an optimized replacement (Top Classes mode)
    const isOptimizedReplacement = (cls as any).isOptimizedReplacement || false;
    // Check if this is an AI-optimized class
    const isAIOptimized = (cls as any).isAIOptimized || false;
    // Check if this is a Smart-optimized class (new system)
    const isSmartOptimized = (cls as any).isSmartOptimized || false;
    const originalClass = (cls as any).originalClass;
    const originalTrainer = (cls as any).originalTrainer;
    const optimizationReason = (cls as any).optimizationReason || (cls as any).aiReason || (cls as any).smartReason;
    const aiConfidence = (cls as any).aiConfidence || (cls as any).smartConfidence;
    const smartPriority = (cls as any).smartPriority;
    const smartImpact = (cls as any).smartImpact;
    const smartDataPoints = (cls as any).smartDataPoints || [];
    
    // Check if there's a pending smart suggestion for this class
    const pendingSuggestion = getSuggestionForClass(cls.id);
    const hasPendingSuggestion = pendingSuggestion && !appliedSmartSuggestions.has(pendingSuggestion.id);
    
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

    // Find matching format color - for optimized replacements use a special gradient
    const getFormatColor = () => {
      if (isSmartOptimized) {
        return smartPriority === 'high' 
          ? 'from-amber-100 to-orange-200 border-orange-400 ring-2 ring-orange-300 ring-offset-1'
          : 'from-cyan-100 to-blue-200 border-blue-400 ring-2 ring-blue-300 ring-offset-1';
      }
      if (isAIOptimized) {
        return 'from-violet-100 to-purple-200 border-purple-400 ring-2 ring-purple-300 ring-offset-1';
      }
      if (isOptimizedReplacement) {
        return 'from-emerald-100 to-green-200 border-emerald-400 ring-2 ring-emerald-300';
      }
      // Show warning color if there's a pending suggestion
      if (hasPendingSuggestion && pendingSuggestion.priority === 'high') {
        return 'from-red-50 to-rose-100 border-red-300 ring-1 ring-red-200';
      }
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
    
    // Native drag handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
      if (isDiscontinued) {
        e.preventDefault();
        return;
      }
      
      // Set data transfer
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', cls.id);
      e.dataTransfer.setData('application/json', JSON.stringify({
        id: cls.id,
        class: cls.class,
        day: cls.day,
        time: cls.time
      }));
      
      // Update state after a microtask to avoid interfering with drag
      setTimeout(() => {
        setDraggedClass(cls);
      }, 0);
    };
    
    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDraggedClass(null);
      setDropTarget(null);
    };
    
    const handleCardClick = (e: React.MouseEvent) => {
      // Don't trigger click if we're dragging
      if (draggedClass) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      handleClassClick(cls);
    };

    return (
      <div
        key={cls.id}
        draggable={!isDiscontinued}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleCardClick}
        onMouseEnter={() => setHoveredClassId(cls.id)}
        onMouseLeave={() => setHoveredClassId(null)}
        style={{ userSelect: 'none', WebkitUserSelect: 'none', cursor: isDiscontinued ? 'not-allowed' : 'grab' }}
        className={`bg-gradient-to-br ${isDiscontinued ? 'from-gray-200 to-gray-300 border-gray-400 opacity-70' : cardColor} border rounded-xl shadow-sm hover:shadow-md overflow-hidden group relative ${isDiscontinued ? 'grayscale' : ''} ${draggedClass?.id === cls.id ? 'opacity-40 scale-95' : ''}`}
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
                onMouseDown={(e) => e.stopPropagation()}
                onDragStart={(e) => e.stopPropagation()}
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
          {isOptimizedReplacement && !isSmartOptimized && (
            <div className="bg-emerald-600 text-white rounded-full p-1 shadow-md animate-pulse" title={`Optimized: Replaces ${originalClass} (${originalTrainer})\n${optimizationReason}`}>
              <Zap className="w-3 h-3" />
            </div>
          )}
          {isSmartOptimized && (
            <div 
              className={`text-white rounded-full p-1 shadow-md ${smartPriority === 'high' ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`} 
              title={`Smart Optimized (${aiConfidence}% confidence)\n${smartImpact}\n\nData: ${smartDataPoints.join(', ')}`}
            >
              <Wand2 className="w-3 h-3" />
            </div>
          )}
          {isAIOptimized && !isOptimizedReplacement && !isSmartOptimized && (
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full p-1 shadow-md" title={`AI Optimized (${aiConfidence}% confidence): Replaces ${originalClass}\n${optimizationReason}`}>
              <Sparkles className="w-3 h-3" />
            </div>
          )}
          {/* Pending Suggestion Indicator */}
          {hasPendingSuggestion && !isSmartOptimized && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                applySmartSuggestion(pendingSuggestion);
              }}
              className={`text-white rounded-full p-1 shadow-md transition-all hover:scale-110 ${
                pendingSuggestion.priority === 'high' 
                  ? 'bg-gradient-to-r from-red-500 to-rose-500 animate-pulse' 
                  : 'bg-gradient-to-r from-amber-500 to-yellow-500'
              }`}
              title={`💡 Suggestion: ${pendingSuggestion.reason}\n\nClick to apply:\n→ ${pendingSuggestion.suggested.className} with ${pendingSuggestion.suggested.trainer}\n${pendingSuggestion.impact}`}
            >
              <Target className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Smart Optimization Banner - NEW */}
        {isSmartOptimized && (
          <div className={`absolute top-0 left-0 right-0 text-white text-[8px] font-bold py-0.5 px-2 flex items-center justify-center gap-1 shadow-sm ${
            smartPriority === 'high' 
              ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600'
              : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600'
          }`}>
            <Wand2 className="w-2.5 h-2.5" />
            <span>SMART OPTIMIZED</span>
            <span className="opacity-75">|</span>
            <span className="font-normal opacity-90">{aiConfidence}%</span>
            <span className="opacity-75">|</span>
            <span className="font-normal opacity-90 truncate">was: {originalClass}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const suggestion = smartOptimizationResult?.suggestions.find(s => s.original.classId === cls.id);
                if (suggestion) {
                  applySmartSuggestion(suggestion);
                }
              }}
              className="ml-1 bg-white/20 hover:bg-white/30 rounded px-1 text-[7px]"
            >
              Undo
            </button>
          </div>
        )}

        {/* AI Optimization Banner */}
        {isAIOptimized && !isOptimizedReplacement && !isSmartOptimized && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white text-[8px] font-bold py-0.5 px-2 flex items-center justify-center gap-1 shadow-sm">
            <Sparkles className="w-2.5 h-2.5" />
            <span>AI OPTIMIZED</span>
            <span className="opacity-75">|</span>
            <span className="font-normal opacity-90">{aiConfidence}%</span>
            <span className="opacity-75">|</span>
            <span className="font-normal opacity-90 truncate">was: {originalClass}</span>
          </div>
        )}

        {/* Optimization Banner - Show when class is optimized replacement */}
        {isOptimizedReplacement && !isAIOptimized && !isSmartOptimized && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-emerald-600 to-green-600 text-white text-[8px] font-bold py-0.5 px-2 flex items-center justify-center gap-1 shadow-sm">
            <Zap className="w-2.5 h-2.5" />
            <span>OPTIMIZED</span>
            <span className="opacity-75">|</span>
            <span className="font-normal opacity-90 truncate">was: {originalClass}</span>
          </div>
        )}

        {/* Moved From Banner - Show when class was drag-dropped */}
        {cls.wasMoved && cls.originalDay && cls.originalTime && !isOptimizedReplacement && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[8px] font-medium py-0.5 px-2 flex items-center justify-center gap-1 shadow-sm">
            <ArrowRightLeft className="w-2.5 h-2.5" />
            <span>Moved from: {cls.originalDay} @ {cls.originalTime}</span>
          </div>
        )}

        {/* Collapsed View - Beautiful & Clean with Key Metrics */}
        <div className={`p-2.5 ${isAIOptimized || isOptimizedReplacement || (cls.wasMoved && cls.originalDay) ? 'pt-5' : ''}`}>
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
                {cls.sessionCount === 0 ? '-' : formatMetric(cls.fillRate, '%')}
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
                {cls.sessionCount === 0 ? '-' : formatMetric(cls.avgCheckIns)}
              </div>
              <div className="text-[9px] text-slate-500">
                avg
              </div>
            </div>
          </div>
        </div>

        {/* Expanded View on Hover - simplified for performance */}
        {isHovered && (
          <div className="border-t border-gray-200 bg-white/95">
            <div className="p-3 space-y-2">
              {/* Trainer & Location */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <div className="bg-blue-100 rounded-full p-1">
                    {findTrainerImage(cls.trainer) ? (
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
                            className={`bg-gradient-to-r ${fillRateColor} h-1 rounded-full`}
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

              {/* Show Similar Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSimilarClasses(cls.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white text-[9px] font-medium py-1.5 px-2 rounded-md flex items-center justify-center gap-1 shadow-sm hover:shadow-md"
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
          </div>
        )}
      </div>
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

      {/* Drag-and-Drop Info Banner */}
      {viewMode === 'calendar' && (
        <div className={`border rounded-xl p-4 flex items-center gap-3 transition-all duration-300 ${
          draggedClass 
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-600 shadow-xl scale-105' 
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
        }`}>
          <div className={`rounded-full p-2 ${
            draggedClass ? 'bg-white text-blue-600 animate-pulse' : 'bg-blue-500 text-white'
          }`}>
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className={`font-semibold text-sm ${draggedClass ? 'text-white' : 'text-blue-900'}`}>
              {draggedClass ? '🎯 Moving Class - Drop in any time slot!' : 'Drag & Drop Enabled'}
            </div>
            <div className={`text-xs ${draggedClass ? 'text-blue-100' : 'text-blue-700'}`}>
              {draggedClass 
                ? `Dragging: ${draggedClass.class} (${draggedClass.trainer}) from ${draggedClass.day} ${draggedClass.time}`
                : 'Drag class cards to different time slots or days to reschedule. Changes are saved automatically.'
              }
            </div>
          </div>
          {draggedClass && (
            <div className="bg-white text-blue-600 px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              📍 Drop to move
            </div>
          )}
        </div>
      )}

      {/* OPTIMIZATION MODE SUMMARY PANEL */}
      {showHighPerformingOnly && optimizedSchedule && (
        <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 rounded-2xl p-6 shadow-xl mb-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl p-3">
                <Zap className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  ⚡ Smart Schedule Optimization Active
                </h3>
                <p className="text-emerald-100 text-sm">
                  Optimized schedule • Max {optimizedSchedule.maxTrainerHours}hrs/trainer • No hosted classes
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowHighPerformingOnly(false)}
              className="bg-white/20 hover:bg-white/30 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              Exit Optimization Mode
            </button>
          </div>
          
          {/* Location Class Counts - Minimum Requirements */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {Object.entries(optimizedSchedule.locationCounts || {}).map(([location, count]) => {
              const minimum = (optimizedSchedule.minimumClasses as Record<string, number>)?.[location] || 0;
              const isMet = count >= minimum;
              const shortfall = (optimizedSchedule as any).locationShortfalls?.[location] as { needed: number; reasons: string[] } | undefined;
              return (
                <div key={location} className={`rounded-xl p-4 ${isMet ? 'bg-green-500/30' : 'bg-red-500/30'} border ${isMet ? 'border-green-400/50' : 'border-red-400/50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{location.includes('Kwality') ? 'Kwality House' : 'Supreme HQ Bandra'}</span>
                    {isMet ? (
                      <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">✓ Met</span>
                    ) : (
                      <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">⚠ -{shortfall?.needed || (minimum - count)} Below</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{count}</span>
                    <span className="text-sm opacity-75">/ {minimum} min classes</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full ${isMet ? 'bg-green-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min((count / minimum) * 100, 100)}%` }}
                    />
                  </div>
                  
                  {/* Show reasons why minimum not met */}
                  {!isMet && shortfall && shortfall.reasons.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-red-400/30">
                      <div className="text-[10px] uppercase text-red-200 mb-1 font-semibold">Why Not Met:</div>
                      <ul className="space-y-1">
                        {shortfall.reasons.slice(0, 4).map((reason, idx) => (
                          <li key={idx} className="text-[10px] text-red-100/80 flex items-start gap-1.5">
                            <span className="text-red-400 mt-0.5">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-black">{optimizedSchedule.summary.totalClasses}</div>
              <div className="text-xs text-emerald-200 uppercase tracking-wide">Total Classes</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-green-300">{optimizedSchedule.summary.highPerforming}</div>
              <div className="text-xs text-emerald-200 uppercase tracking-wide">High Performing</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-amber-300">{optimizedSchedule.summary.underperforming}</div>
              <div className="text-xs text-emerald-200 uppercase tracking-wide">Underperforming</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-cyan-300">{optimizedSchedule.summary.replacementsFound}</div>
              <div className="text-xs text-emerald-200 uppercase tracking-wide">Replacements Found</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-yellow-300">
                {optimizedSchedule.summary.replacementsFound > 0 
                  ? `+${formatMetric(optimizedSchedule.replacements.reduce((sum, r) => sum + (r.replacement.expectedCheckIns - r.original.avgCheckIns), 0))}` 
                  : '0'}
              </div>
              <div className="text-xs text-emerald-200 uppercase tracking-wide">Expected +Attendance</div>
            </div>
          </div>
          
          {/* Replacement Details */}
          {optimizedSchedule.replacements.length > 0 && (
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Optimized Replacements ({optimizedSchedule.replacements.length})
                </h4>
                <button
                  onClick={() => setShowAllReplacements(true)}
                  className="bg-white/20 hover:bg-white/30 rounded-lg px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View All Replacements
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[200px] overflow-y-auto">
                {optimizedSchedule.replacements.slice(0, 9).map((r, i) => (
                  <div key={i} className="bg-white/10 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-red-300 line-through text-xs opacity-75">
                          {r.original.class} ({r.original.trainer})
                        </div>
                        <div className="flex items-center gap-1 text-emerald-200 font-bold">
                          <ArrowUpRight className="w-3 h-3" />
                          {r.replacement.class} ({r.replacement.trainerDisplay})
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-emerald-300">{r.original.day} {r.original.time}</span>
                      <span className="bg-green-500/30 px-2 py-0.5 rounded-full font-bold">
                        +{formatMetric(r.replacement.expectedCheckIns - r.original.avgCheckIns)} attendance
                      </span>
                    </div>
                    <div className="text-[9px] text-emerald-200/70 mt-1 truncate" title={r.replacement.reason}>
                      {r.replacement.reason}
                    </div>
                  </div>
                ))}
              </div>
              {optimizedSchedule.replacements.length > 9 && (
                <button 
                  onClick={() => setShowAllReplacements(true)}
                  className="w-full text-center text-xs text-emerald-200 mt-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  View all {optimizedSchedule.replacements.length} replacements →
                </button>
              )}
            </div>
          )}
          
          {/* Trainer Hours Optimization */}
          {optimizedSchedule.trainerHoursTracker && optimizedSchedule.trainerHoursTracker.size > 0 && (
            <div className="mt-4 bg-white/10 rounded-xl p-4">
              <h4 className="font-bold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Trainer Hours (Max {optimizedSchedule.maxTrainerHours}hrs/week across ALL locations)
              </h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(optimizedSchedule.trainerHoursTracker.entries())
                  .filter(([_, hours]) => hours > 0)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 12)
                  .map(([trainerName, hours]) => {
                    const isAtMax = hours >= (optimizedSchedule.maxTrainerHours || 16);
                    const isNearMax = hours >= (optimizedSchedule.maxTrainerHours || 16) - 2;
                    return (
                      <div key={trainerName} className={`rounded-lg px-3 py-2 text-xs ${isAtMax ? 'bg-red-500/30 border border-red-400/50' : isNearMax ? 'bg-amber-500/20 border border-amber-400/50' : 'bg-white/10'}`}>
                        <div className="font-semibold capitalize">{trainerName}</div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className={`font-bold ${isAtMax ? 'text-red-300' : isNearMax ? 'text-amber-300' : 'text-emerald-200'}`}>
                            {hours}/{optimizedSchedule.maxTrainerHours || 16}hrs
                          </span>
                          {isAtMax && <span className="text-red-200">MAX</span>}
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-1 mt-1">
                          <div 
                            className={`h-1 rounded-full ${isAtMax ? 'bg-red-400' : isNearMax ? 'bg-amber-400' : 'bg-gradient-to-r from-emerald-400 to-green-400'}`}
                            style={{ width: `${Math.min((hours / (optimizedSchedule.maxTrainerHours || 16)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}
        </div>
      )}

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
            onClick={() => {
              // Use startTransition to mark this as a non-urgent update
              // This prevents the UI from blocking while heavy computation runs
              startTransition(() => {
                setShowHighPerformingOnly(!showHighPerformingOnly);
              });
            }}
            disabled={isCalculatingOptimization || isPending}
            className={`p-3 rounded-xl border transition-all duration-300 ${
              isCalculatingOptimization || isPending
                ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white border-gray-400/30 cursor-wait'
                : showHighPerformingOnly
                ? 'bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 text-white border-green-500/30 shadow-lg scale-105'
                : 'bg-white/70 backdrop-blur-sm border-slate-200 hover:border-green-300 hover:bg-white/90 text-slate-700'
            }`}
          >
            {(isCalculatingOptimization || isPending) ? (
              <Loader2 className="w-4 h-4 mx-auto mb-1 animate-spin" />
            ) : (
              <Award className="w-4 h-4 mx-auto mb-1" />
            )}
            <div className="text-xs font-bold">{(isCalculatingOptimization || isPending) ? 'Loading...' : 'Top Classes'}</div>
          </button>
          {/* Regenerate button - only visible when Top Classes is active */}
          {showHighPerformingOnly && (
            <button
              onClick={() => {
                // Generate new random seed for unique iteration
                startTransition(() => {
                  setOptimizationSettings(prev => ({
                    ...prev,
                    randomizationSeed: Date.now()
                  }));
                });
              }}
              disabled={isPending}
              className={`p-3 rounded-xl border transition-all duration-300 ${isPending ? 'opacity-50 cursor-wait' : ''} bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white border-indigo-500/30 shadow-lg hover:scale-105 animate-pulse`}
              title="Generate a new unique schedule iteration"
            >
              {isPending ? <Loader2 className="w-4 h-4 mx-auto mb-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mx-auto mb-1" />}
              <div className="text-xs font-bold">{isPending ? 'Loading...' : 'Regenerate'}</div>
            </button>
          )}
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
          <button
            onClick={() => setShowOptimizationSettings(true)}
            className="p-3 rounded-xl border transition-all duration-300 bg-white/70 backdrop-blur-sm border-slate-200 hover:border-indigo-300 hover:bg-white/90 text-slate-700"
          >
            <Settings className="w-4 h-4 mx-auto mb-1" />
            <div className="text-xs font-bold">Rules</div>
          </button>
          <button
            onClick={handleSmartOptimization}
            disabled={isSmartOptimizing}
            className={`relative p-3 rounded-xl border transition-all duration-300 ${
              showSmartInsights
                ? 'bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 text-white border-violet-500/30 shadow-lg scale-105'
                : isSmartOptimizing
                ? 'bg-violet-100 border-violet-300 text-violet-600'
                : 'bg-white/70 backdrop-blur-sm border-slate-200 hover:border-violet-300 hover:bg-violet-50 text-slate-700'
            }`}
          >
            {isSmartOptimizing ? (
              <Loader2 className="w-4 h-4 mx-auto mb-1 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mx-auto mb-1" />
            )}
            <div className="text-xs font-bold">Smart AI</div>
            {smartOptimizationResult && smartOptimizationResult.suggestions.length > 0 && !showSmartInsights && (
              <span className="absolute -top-1 -right-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                {smartOptimizationResult.suggestions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Smart AI Insights Floating Panel */}
      <AnimatePresence>
        {showSmartInsights && smartOptimizationResult && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mb-6 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 rounded-2xl border border-violet-200 shadow-xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Wand2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Smart Schedule Intelligence</h2>
                    <p className="text-white/80 text-sm">AI-powered optimization suggestions</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                    <Target className="w-4 h-4 text-white" />
                    <span className="text-white font-medium text-sm">
                      {smartOptimizationResult.suggestions.length} suggestions
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                    <TrendingUp className="w-4 h-4 text-white" />
                    <span className="text-white font-medium text-sm">
                      +{smartOptimizationResult.projectedImpact.avgFillRateIncrease.toFixed(1)}% fill rate
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSmartInsights(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Key Insights */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-violet-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Key Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {smartOptimizationResult.insights.slice(0, 6).map((insight, idx) => (
                    <div
                      key={idx}
                      className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-violet-100 hover:border-violet-300 transition-all hover:shadow-md"
                    >
                      <p className="text-sm text-slate-700">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Projected Impact */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-violet-100">
                <h3 className="text-sm font-semibold text-violet-800 mb-3">Projected Impact if All Suggestions Applied</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">
                      +{smartOptimizationResult.projectedImpact.avgFillRateIncrease.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-600">Fill Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      +{smartOptimizationResult.projectedImpact.totalCheckInsIncrease}
                    </div>
                    <div className="text-xs text-slate-600">Attendance/Week</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-violet-600">
                      +{smartOptimizationResult.projectedImpact.trainerUtilizationIncrease.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-600">Trainer Utilization</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-violet-600">
                      {appliedSmartSuggestions.size}/{smartOptimizationResult.suggestions.length}
                    </div>
                    <div className="text-xs text-slate-600">Applied</div>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-violet-700">Tip:</span> Look for purple badges on classes in the calendar to see specific suggestions
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      smartOptimizationResult.suggestions.forEach(s => {
                        if (!appliedSmartSuggestions.has(s.id)) {
                          applySmartSuggestion(s);
                        }
                      });
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium shadow-md hover:shadow-lg"
                  >
                    <Check className="w-4 h-4" />
                    Apply All Suggestions
                  </button>
                  <button
                    onClick={() => setAppliedSmartSuggestions(new Set())}
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg transition-all text-sm font-medium border border-slate-200"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset All
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Error Alert */}
      <AnimatePresence>
        {aiOptimizationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 bg-gradient-to-r from-red-50 via-rose-50 to-pink-50 rounded-2xl border border-red-200 shadow-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-red-500 to-rose-500 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold text-white">AI Service Unavailable</h2>
              </div>
              <button
                onClick={() => setAIOptimizationError(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-800 mb-2">
                    {aiOptimizationError.code === 'API_UNAVAILABLE' && 'API Key Not Configured'}
                    {aiOptimizationError.code === 'RATE_LIMITED' && 'Rate Limited'}
                    {aiOptimizationError.code === 'TIMEOUT' && 'Request Timed Out'}
                    {aiOptimizationError.code === 'INVALID_RESPONSE' && 'Invalid Response'}
                    {aiOptimizationError.code === 'UNKNOWN' && 'Optimization Failed'}
                  </h3>
                  <p className="text-red-700 text-sm mb-4">{aiOptimizationError.message}</p>
                  <div className="bg-white/60 rounded-lg p-4 border border-red-100">
                    <h4 className="text-sm font-semibold text-red-800 mb-2">How to fix:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {aiOptimizationError.code === 'API_UNAVAILABLE' && (
                        <>
                          <li>1. Set <code className="bg-red-100 px-1 rounded">VITE_GOOGLE_AI_API_KEY</code> in your environment</li>
                          <li>2. Ensure the API key is valid and has access to Gemini API</li>
                          <li>3. Restart the development server after setting the key</li>
                        </>
                      )}
                      {aiOptimizationError.code === 'RATE_LIMITED' && (
                        <>
                          <li>1. Wait a few minutes before trying again</li>
                          <li>2. Consider upgrading your API quota</li>
                        </>
                      )}
                      {aiOptimizationError.code === 'TIMEOUT' && (
                        <>
                          <li>1. Try optimizing individual days instead of the full schedule</li>
                          <li>2. Check your network connection</li>
                        </>
                      )}
                      {(aiOptimizationError.code === 'INVALID_RESPONSE' || aiOptimizationError.code === 'UNKNOWN') && (
                        <>
                          <li>1. Try again - the AI service may be temporarily overloaded</li>
                          <li>2. If the issue persists, check the console for more details</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Classes Panel - Shows only top performers based on historic data */}
      {showHighPerformingOnly && (
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 rounded-2xl border border-amber-200 shadow-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold text-white">Top Performing Classes</h2>
              <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-medium">
                {optimizedSchedule?.summary.highPerforming || 0} classes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHighPerformingOnly(false)}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <p className="text-amber-800 text-sm mb-4">
              Showing only top-performing classes based on historic fill rate data. These are classes that consistently achieve above 70% fill rate or perform significantly above location average.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Stats Cards */}
              <div className="bg-white/70 rounded-xl p-4 border border-amber-100">
                <div className="text-sm font-bold text-amber-800 mb-1">Total Classes</div>
                <div className="text-2xl font-bold text-slate-800">{optimizedSchedule?.summary.totalClasses || 0}</div>
              </div>
              <div className="bg-white/70 rounded-xl p-4 border border-amber-100">
                <div className="text-sm font-bold text-amber-800 mb-1">Top Performers</div>
                <div className="text-2xl font-bold text-emerald-600">{optimizedSchedule?.summary.highPerforming || 0}</div>
              </div>
              <div className="bg-white/70 rounded-xl p-4 border border-amber-100">
                <div className="text-sm font-bold text-amber-800 mb-1">Underperforming</div>
                <div className="text-2xl font-bold text-red-500">{optimizedSchedule?.summary.underperforming || 0}</div>
              </div>
              <div className="bg-white/70 rounded-xl p-4 border border-amber-100">
                <div className="text-sm font-bold text-amber-800 mb-1">Top Rate</div>
                <div className="text-2xl font-bold text-amber-600">
                  {((optimizedSchedule?.summary.highPerforming || 0) / Math.max(optimizedSchedule?.summary.totalClasses || 1, 1) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            
            {/* Optimization Actions */}
            <div className="mt-6 flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 mb-1">Want to optimize underperforming classes?</h3>
                <p className="text-sm text-slate-600">Use the Optimize button to apply rule-based optimizations, or AI Optimize for intelligent suggestions.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsOptimizationEnabled(true);
                    setOptimizationSettings(prev => ({ ...prev, randomizationSeed: Date.now() }));
                  }}
                  disabled={isOptimizationEnabled}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                    isOptimizationEnabled
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-md'
                  }`}
                >
                  {isOptimizationEnabled ? (
                    <>
                      <Check className="w-4 h-4" />
                      Optimized
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Optimize
                    </>
                  )}
                </button>
                <button
                  onClick={handleAIOptimization}
                  disabled={isAIOptimizing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                    isAIOptimizing 
                      ? 'bg-purple-200 text-purple-600 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md'
                  }`}
                >
                  {isAIOptimizing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI Optimize
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Optimization Results Panel - Appears after AI Optimize is clicked */}
      <AnimatePresence>
        {modularAIResult && modularAIResult.success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 bg-gradient-to-r from-purple-50 via-indigo-50 to-violet-50 rounded-2xl border border-purple-200 shadow-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold text-white">AI Optimization Results</h2>
                <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {modularAIResult.suggestions.length} suggestions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Apply all suggestions
                    const newApplied = new Set(appliedAIReplacements);
                    modularAIResult.suggestions.forEach(s => newApplied.add(s.id));
                    setAppliedAIReplacements(newApplied);
                  }}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium"
                >
                  <Check className="w-4 h-4" />
                  Apply All
                </button>
                <button
                  onClick={() => setModularAIResult(null)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Key Insights */}
              {modularAIResult.insights.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Insights
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {modularAIResult.insights.map((insight, idx) => (
                      <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-100">
                        <p className="text-sm text-slate-700">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Suggestions */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {modularAIResult.suggestions.map((suggestion) => {
                  const isApplied = appliedAIReplacements.has(suggestion.id);
                  return (
                    <div
                      key={suggestion.id}
                      className={`rounded-xl p-4 border transition-all ${
                        isApplied
                          ? 'bg-purple-50 border-purple-300'
                          : 'bg-white/70 border-slate-200 hover:border-purple-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              suggestion.type === 'replace_trainer' ? 'bg-blue-100 text-blue-700' :
                              suggestion.type === 'replace_class' ? 'bg-amber-100 text-amber-700' :
                              suggestion.type === 'add_class' ? 'bg-green-100 text-green-700' :
                              suggestion.type === 'remove_class' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {suggestion.type.replace('_', ' ')}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              suggestion.confidence >= 80 ? 'bg-green-100 text-green-700' :
                              suggestion.confidence >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {suggestion.confidence}% confidence
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mb-2">{suggestion.reason}</p>
                          <div className="text-xs text-slate-500">
                            {suggestion.original.day} {suggestion.original.time} @ {suggestion.original.location}
                          </div>
                          {suggestion.dataPoints.length > 0 && (
                            <div className="mt-2 text-xs text-purple-600">
                              {suggestion.dataPoints.slice(0, 2).map((dp, i) => (
                                <div key={i}>• {dp}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            const newApplied = new Set(appliedAIReplacements);
                            if (isApplied) {
                              newApplied.delete(suggestion.id);
                            } else {
                              newApplied.add(suggestion.id);
                            }
                            setAppliedAIReplacements(newApplied);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isApplied
                              ? 'bg-purple-600 text-white'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                        >
                          {isApplied ? 'Applied' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Projected Impact */}
              <div className="mt-6 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-purple-100">
                <h3 className="text-sm font-semibold text-purple-800 mb-3">Projected Impact</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-emerald-600">
                      +{modularAIResult.projectedImpact.fillRateChange.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-600">Fill Rate</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-600">
                      +{modularAIResult.projectedImpact.attendanceChange}
                    </div>
                    <div className="text-xs text-slate-600">Attendance/Week</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-purple-600">
                      {appliedAIReplacements.size}/{modularAIResult.suggestions.length}
                    </div>
                    <div className="text-xs text-slate-600">Applied</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REMOVED: Orphaned panel code cleaned up */}

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
                      lang="en-US"
                      value={format(filters.dateFrom, 'yyyy-MM-dd')}
                      onChange={(e) => {
                        if (e.target.value) {
                          const [year, month, day] = e.target.value.split('-').map(Number);
                          const newDate = new Date(year, month - 1, day, 12, 0, 0);
                          console.log('From date:', e.target.value, '→', newDate.toLocaleDateString());
                          setFilters({ ...filters, dateFrom: newDate });
                        }
                      }}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">To</label>
                    <input
                      type="date"
                      lang="en-US"
                      value={format(filters.dateTo, 'yyyy-MM-dd')}
                      onChange={(e) => {
                        if (e.target.value) {
                          const [year, month, day] = e.target.value.split('-').map(Number);
                          const newDate = new Date(year, month - 1, day, 23, 59, 59);
                          console.log('To date:', e.target.value, '→', newDate.toLocaleDateString());
                          setFilters({ ...filters, dateTo: newDate });
                        }
                      }}
                      max={format(new Date(), 'yyyy-MM-dd')}
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
                  .map(([trainer, data]) => {
                    
                    
                    const isSelected = filters.trainers.includes(trainer);
                    
                    // Generate initials for avatar
                    const initials = trainer.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    
                    return (
                      <div
                        key={trainer}
                        onClick={() => {
                          if (isSelected) {
                            setFilters({ ...filters, trainers: filters.trainers.filter(t => t !== trainer) });
                          } else {
                            setFilters({ ...filters, trainers: [...filters.trainers, trainer] });
                          }
                        }}
                        className={`group relative bg-white rounded-lg p-2 hover:shadow-md cursor-pointer border ${isSelected ? 'ring-2 ring-blue-200' : 'hover:shadow-lg'}`}
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
                      </div>
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
                  <div 
                    key={day.key} 
                    className="font-medium text-slate-800 text-sm text-center bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border border-slate-200 overflow-hidden"
                  >
                    <div 
                      className="p-2 cursor-pointer hover:bg-blue-50"
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
                        <ChevronDown className={`w-3 h-3 text-blue-600 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                      <div className="text-xs text-blue-600 font-bold mt-1">{dayClasses.length}</div>
                    </div>
                    
                    {/* Collapsible Format Mix - simplified */}
                    {isExpanded && totalFormats > 0 && (
                      <div className="border-t border-slate-200 bg-white">
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
                      </div>
                    )}
                  </div>
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
                    <div 
                      key={`${day.key}-${slot.time24}`} 
                      className={`min-h-[80px] relative rounded-lg ${
                        dropTarget?.day === day.key && dropTarget?.time === slot.time24 
                          ? 'ring-2 ring-blue-400 bg-blue-50' 
                          : 'bg-gray-50/30'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        if (dropTarget?.day !== day.key || dropTarget?.time !== slot.time24) {
                          setDropTarget({ day: day.key, time: slot.time24 });
                        }
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropTarget({ day: day.key, time: slot.time24 });
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        // Only clear if we're actually leaving the element
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX;
                        const y = e.clientY;
                        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                          setDropTarget(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Get class data from dataTransfer or state
                        let classData = draggedClass;
                        
                        // Try to get from dataTransfer as backup
                        if (!classData) {
                          try {
                            const jsonData = e.dataTransfer.getData('application/json');
                            if (jsonData) {
                              classData = JSON.parse(jsonData);
                            }
                          } catch (err) {
                            console.warn('Failed to parse drag data');
                          }
                        }
                        
                        if (classData && (classData.day !== day.key || classData.time !== slot.time24)) {
                          const store = useDashboardStore.getState();
                          if (store.updateClassSchedule) {
                            store.updateClassSchedule(classData.id, day.key, slot.time24);
                          }
                        }
                        
                        setDraggedClass(null);
                        setDropTarget(null);
                      }}
                    >
                      {scheduleGrid[day.key]?.[slot.time24]?.map(cls => renderClassCard(cls))}
                      
                      {/* Drop Preview - Simple indicator */}
                      {draggedClass && dropTarget?.day === day.key && dropTarget?.time === slot.time24 && (
                        <div className="absolute inset-0 bg-blue-100 rounded-lg border-2 border-dashed border-blue-500 flex items-center justify-center pointer-events-none z-10">
                          <div className="text-center text-blue-700 font-medium text-xs px-2">
                            Drop here
                          </div>
                        </div>
                      )}
                      
                      {/* Empty slot - add class button */}
                      {(!scheduleGrid[day.key]?.[slot.time24] || scheduleGrid[day.key][slot.time24].length === 0) && !draggedClass && (
                        <div 
                          onClick={() => {
                            setSelectedTimeSlot({ day: day.key, time: slot.time24 });
                            setShowAddModal(true);
                          }}
                          className="h-full min-h-[60px] border border-dashed border-slate-200 rounded-lg flex items-center justify-center opacity-40 hover:opacity-100 cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                        >
                          <Plus className="w-4 h-4 text-slate-400" />
                        </div>
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
                        const isExpanded = expandedDayFormats.has(day.key);
                        
                        // Calculate format mix for this day
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
                          <div key={day.key} className="flex-1 min-w-[280px] border-r-2 border-gray-300 last:border-r-0">
                            {/* Day Header - With Format Mix */}
                            <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-b border-gray-200 overflow-hidden">
                              <div 
                                className="p-3 text-center cursor-pointer hover:bg-blue-50 transition-colors"
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
                                  <span className="font-bold text-gray-900 text-sm">{day.short}</span>
                                  <ChevronDown className={`w-3 h-3 text-blue-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                                <div className="inline-flex items-center justify-center bg-white/70 rounded-full px-2 py-0.5 shadow-sm mt-1">
                                  <span className="text-xs font-medium text-gray-700">{dayClasses.length}</span>
                                </div>
                              </div>
                              
                              {/* Collapsible Format Mix - simplified */}
                              {isExpanded && totalFormats > 0 && (
                                <div className="border-t border-slate-200 bg-white">
                                  <div className="p-2 max-h-[200px] overflow-y-auto">
                                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">Format Mix ({totalFormats})</div>
                                    <div className="space-y-2">
                                      {groupedFormats.beginner.length > 0 && (
                                        <div>
                                          <div className="text-[8px] uppercase tracking-wider text-green-600 font-bold mb-1 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            Beginner ({groupedFormats.beginner.length})
                                          </div>
                                          <div className="space-y-0.5 ml-3">
                                            {groupedFormats.beginner.map(([format, count]) => (
                                              <div key={format} className="flex items-center justify-between text-[10px] gap-1 hover:bg-green-50 px-1 py-0.5 rounded">
                                                <span className="text-slate-700 text-left flex-1 truncate" title={format}>{format}</span>
                                                <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">{count}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {groupedFormats.intermediate.length > 0 && (
                                        <div>
                                          <div className="text-[8px] uppercase tracking-wider text-blue-600 font-bold mb-1 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            Intermediate ({groupedFormats.intermediate.length})
                                          </div>
                                          <div className="space-y-0.5 ml-3">
                                            {groupedFormats.intermediate.map(([format, count]) => (
                                              <div key={format} className="flex items-center justify-between text-[10px] gap-1 hover:bg-blue-50 px-1 py-0.5 rounded">
                                                <span className="text-slate-700 text-left flex-1 truncate" title={format}>{format}</span>
                                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">{count}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {groupedFormats.advanced.length > 0 && (
                                        <div>
                                          <div className="text-[8px] uppercase tracking-wider text-red-600 font-bold mb-1 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                            Advanced ({groupedFormats.advanced.length})
                                          </div>
                                          <div className="space-y-0.5 ml-3">
                                            {groupedFormats.advanced.map(([format, count]) => (
                                              <div key={format} className="flex items-center justify-between text-[10px] gap-1 hover:bg-red-50 px-1 py-0.5 rounded">
                                                <span className="text-slate-700 text-left flex-1 truncate" title={format}>{format}</span>
                                                <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">{count}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
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
                                    className={`flex-1 min-w-[130px] p-2 min-h-[90px] relative bg-white hover:bg-gray-50/50 transition-colors border-r border-gray-100 ${idx === activeLocations.length - 1 ? 'border-r-0' : ''} overflow-hidden ${
                                      dropTarget?.day === day.key && dropTarget?.time === slot.time24 
                                        ? 'ring-4 ring-blue-400 bg-blue-50' 
                                        : ''
                                    }`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = 'move';
                                      setDropTarget({ day: day.key, time: slot.time24 });
                                    }}
                                    onDragLeave={() => {
                                      setDropTarget(null);
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      if (draggedClass && (draggedClass.day !== day.key || draggedClass.time !== slot.time24)) {
                                        const store = useDashboardStore.getState();
                                        if (store.updateClassSchedule) {
                                          store.updateClassSchedule(draggedClass.id, day.key, slot.time24);
                                          console.log(`Moved ${draggedClass.class} to ${day.full} at ${slot.time12}`);
                                        }
                                      }
                                      setDraggedClass(null);
                                      setDropTarget(null);
                                    }}
                                  >
                                    <div className="space-y-1">
                                      {locationSlotClasses.map(cls => (
                                        <div key={cls.id} className="transform scale-90 origin-top">
                                          {renderClassCard(cls)}
                                        </div>
                                      ))}
                                    </div>
                                    
                                    {/* Drop Preview - simplified */}
                                    {draggedClass && dropTarget?.day === day.key && dropTarget?.time === slot.time24 && (
                                      <div className="absolute inset-0 bg-blue-500 opacity-50 rounded-lg border-2 border-dashed border-blue-600 flex items-center justify-center pointer-events-none z-10">
                                        <div className="text-center text-white font-bold text-xs px-2">
                                          <div>↓ Drop here ↓</div>
                                          <div className="text-[10px] opacity-80">{draggedClass.class}</div>
                                        </div>
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
              {TIME_SLOTS.map((slot) => {
                const slotClasses = filteredClasses.filter(cls => cls.time === slot.time24);
                const slotHour = parseInt(slot.time24.split(':')[0]);
                const isNonFunctional = slotHour < 7 || slotHour > 20;
                if (!showNonFunctionalHours && isNonFunctional && slotClasses.length === 0) return null;
                
                return (
                  <div 
                    key={slot.time24}
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
                                    <div
                                      className={`min-h-[80px] ${
                                        dropTarget?.day === day.key && dropTarget?.time === slot.time24 
                                          ? 'ring-2 ring-blue-400 rounded-lg' 
                                          : ''
                                      }`}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'move';
                                        setDropTarget({ day: day.key, time: slot.time24 });
                                      }}
                                      onDragLeave={() => {
                                        setDropTarget(null);
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        if (draggedClass && (draggedClass.day !== day.key || draggedClass.time !== slot.time24)) {
                                          const store = useDashboardStore.getState();
                                          if (store.updateClassSchedule) {
                                            store.updateClassSchedule(draggedClass.id, day.key, slot.time24);
                                            console.log(`Moved ${draggedClass.class} to ${day.full} at ${slot.time12}`);
                                          }
                                        }
                                        setDraggedClass(null);
                                        setDropTarget(null);
                                      }}
                                    >
                                      {daySlotClass ? (
                                        renderClassCard(daySlotClass)
                                      ) : (
                                        <div className="border border-dashed border-slate-200 rounded-lg p-2 text-center text-[10px] text-slate-400">
                                          No class
                                        </div>
                                      )}
                                      
                                      {/* Drop Preview - simplified */}
                                      {draggedClass && dropTarget?.day === day.key && dropTarget?.time === slot.time24 && (
                                        <div className="absolute inset-0 bg-blue-500 opacity-50 rounded-lg border-2 border-dashed border-blue-600 flex items-center justify-center pointer-events-none z-10">
                                          <div className="text-center text-white font-bold text-[10px] px-1">
                                            ↓ Drop ↓
                                          </div>
                                        </div>
                                      )}
                                    </div>
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
                  </div>
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

              {/* Scrollable Container */}
              <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
                <div className="min-w-max">
                  {/* Sticky Header Row */}
                  <div className="sticky top-0 z-20 flex bg-gradient-to-r from-gray-100 to-gray-200 shadow-sm border-b border-gray-300">
                    <div className="sticky left-0 z-30 flex-shrink-0 w-24 border-r border-gray-200 p-3 flex items-center justify-center bg-gray-100 shadow-sm">
                      <span className="text-sm font-bold text-gray-700">Time</span>
                    </div>
                {DAYS_OF_WEEK.map((day) => {
                  const dayClasses = filteredClasses.filter(cls => cls.day === day.key);
                  const isExpanded = expandedDayFormats.has(day.key);
                  const avgFillRate = dayClasses.length > 0 
                    ? Math.round(dayClasses.reduce((sum, cls) => sum + cls.fillRate, 0) / dayClasses.length)
                    : 0;
                  const totalRevenue = dayClasses.reduce((sum, cls) => sum + cls.revenue, 0);
                  
                  // Calculate format mix for this day
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
                    <div key={day.key} className="flex-1 min-w-[140px] border-r border-gray-200 last:border-r-0 overflow-hidden">
                      <div 
                        className="p-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
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
                          <span className="font-bold text-gray-800 text-sm">{day.short}</span>
                          <ChevronDown className={`w-3 h-3 text-blue-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{dayClasses.length} classes</div>
                        <div className="text-xs text-blue-600 font-bold mt-1">{avgFillRate}% fill</div>
                        <div className="text-xs text-emerald-600 font-semibold mt-1">{formatRevenue(totalRevenue)}</div>
                      </div>
                      
                      {/* Collapsible Format Mix - simplified */}
                      {isExpanded && totalFormats > 0 && (
                        <div className="border-t border-gray-200 bg-white">
                          <div className="p-2 max-h-[200px] overflow-y-auto">
                            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">Format Mix ({totalFormats})</div>
                            <div className="space-y-2">
                              {groupedFormats.beginner.length > 0 && (
                                <div>
                                  <div className="text-[8px] uppercase tracking-wider text-green-600 font-bold mb-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Beginner ({groupedFormats.beginner.length})
                                  </div>
                                  <div className="space-y-0.5 ml-3">
                                    {groupedFormats.beginner.map(([format, count]) => (
                                      <div key={format} className="flex items-center justify-between text-[10px] gap-1 hover:bg-green-50 px-1 py-0.5 rounded">
                                        <span className="text-slate-700 text-left flex-1 truncate" title={format}>{format}</span>
                                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">{count}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {groupedFormats.intermediate.length > 0 && (
                                <div>
                                  <div className="text-[8px] uppercase tracking-wider text-blue-600 font-bold mb-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Intermediate ({groupedFormats.intermediate.length})
                                  </div>
                                  <div className="space-y-0.5 ml-3">
                                    {groupedFormats.intermediate.map(([format, count]) => (
                                      <div key={format} className="flex items-center justify-between text-[10px] gap-1 hover:bg-blue-50 px-1 py-0.5 rounded">
                                        <span className="text-slate-700 text-left flex-1 truncate" title={format}>{format}</span>
                                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">{count}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {groupedFormats.advanced.length > 0 && (
                                <div>
                                  <div className="text-[8px] uppercase tracking-wider text-red-600 font-bold mb-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Advanced ({groupedFormats.advanced.length})
                                  </div>
                                  <div className="space-y-0.5 ml-3">
                                    {groupedFormats.advanced.map(([format, count]) => (
                                      <div key={format} className="flex items-center justify-between text-[10px] gap-1 hover:bg-red-50 px-1 py-0.5 rounded">
                                        <span className="text-slate-700 text-left flex-1 truncate" title={format}>{format}</span>
                                        <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">{count}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                    <div key={slot.time24} className={`flex border-b border-gray-100 ${hasClassesAtThisTime ? 'bg-white' : 'bg-gray-25'}`}>
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
                      <div
                        key={day.key}
                        className="bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md"
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
                                          <div
                                            className={`h-full ${getFormatColor(format)} rounded-full shadow-sm`}
                                            style={{ width: `${percentage}%` }}
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
                      </div>
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

          {/* Timeline View - Simplified for Performance */}
          {calendarViewMode === 'timeline' && (
            <div className="relative py-4">
              {TIME_SLOTS.map((slot, idx) => {
                const slotClasses = filteredClasses.filter(cls => cls.time === slot.time24);
                const hasClasses = slotClasses.length > 0;
                return (
                  <div 
                    key={slot.time24} 
                    className="flex gap-6 mb-8 relative group"
                  >
                    {/* Timeline */}
                    <div className="flex flex-col items-center relative z-10">
                      <div 
                        className={`relative w-5 h-5 rounded-full shadow-lg ${
                          hasClasses 
                            ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 ring-4 ring-blue-100 shadow-blue-500/50' 
                            : 'bg-gradient-to-br from-slate-300 to-slate-400 ring-2 ring-slate-100'
                        }`}
                      />
                      {idx < TIME_SLOTS.length - 1 && (
                        <div className={`w-1 h-full ${
                          hasClasses 
                            ? 'bg-gradient-to-b from-blue-400 via-blue-300 to-slate-200' 
                            : 'bg-gradient-to-b from-slate-200 to-slate-100'
                        } rounded-full`} />
                      )}
                    </div>
                    
                    {/* Time and Classes */}
                    <div className="flex-1 pb-6">
                      <div className={`inline-flex items-center gap-3 mb-4 px-4 py-2 rounded-xl ${
                        hasClasses 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30' 
                          : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600'
                      }`}>
                        <Clock className="w-4 h-4" />
                        <span className="font-bold text-lg">{slot.time12}</span>
                        {hasClasses && (
                          <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full font-bold text-sm ml-2">
                            {slotClasses.length} {slotClasses.length === 1 ? 'class' : 'classes'}
                          </span>
                        )}
                      </div>
                      {hasClasses ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {slotClasses.map(cls => renderClassCard(cls))}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400 italic py-6 px-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                            <span className="text-slate-400 text-xs">—</span>
                          </div>
                          <span>No classes scheduled</span>
                        </div>
                      )}
                    </div>
                  </div>
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
              <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-6 shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100" />
                <div className="relative z-10">
                  <div className="text-blue-200 text-sm font-bold uppercase tracking-widest mb-2">Total Sessions</div>
                  <div className="text-5xl font-black text-white mb-2">{totalSessions.toLocaleString()}</div>
                  <div className="text-blue-300 text-xs">Across all locations</div>
                </div>
              </div>

              <div className="relative bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 rounded-2xl p-6 shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100" />
                <div className="relative z-10">
                  <div className="text-emerald-200 text-sm font-bold uppercase tracking-widest mb-2">Check-Ins</div>
                  <div className="text-5xl font-black text-white mb-2">{totalCheckIns.toLocaleString()}</div>
                  <div className="text-emerald-300 text-xs">Total attendances</div>
                </div>
              </div>

              <div className="relative bg-gradient-to-br from-purple-900 via-violet-900 to-indigo-900 rounded-2xl p-6 shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100" />
                <div className="relative z-10">
                  <div className="text-purple-200 text-sm font-bold uppercase tracking-widest mb-2">Avg Fill Rate</div>
                  <div className="text-5xl font-black text-white mb-2">{avgFillRate.toFixed(1)}%</div>
                  <div className="text-purple-300 text-xs">Overall utilization</div>
                </div>
              </div>

              <div className="relative bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 rounded-2xl p-6 shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-red-500/10 opacity-0 group-hover:opacity-100" />
                <div className="relative z-10">
                  <div className="text-amber-200 text-sm font-bold uppercase tracking-widest mb-2">Revenue</div>
                  <div className="text-5xl font-black text-white mb-2">{formatCurrency(totalRevenue)}</div>
                  <div className="text-amber-300 text-xs">Total earnings</div>
                </div>
              </div>
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
                    <div
                      key={format}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50 hover:from-blue-50 hover:to-indigo-50"
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
                    </div>
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
                    <div
                      key={trainer}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-emerald-50 hover:from-emerald-50 hover:to-teal-50"
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
                    </div>
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
                    <div
                      key={location}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-purple-50 hover:from-purple-50 hover:to-pink-50"
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
                    </div>
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
                      <div
                        key={difficulty}
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
                      </div>
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
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                      style={{ width: `${avgFillRate}%` }}
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
          <div
            key="drilldown-modal"
            ref={drilldownModalRef}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDrilldown(false);
                setSelectedClass(null);
              }
            }}
            tabIndex={0}
          >
            <div
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

                {/* Core Stats Grid - with projected metrics support */}
                {(() => {
                  const isOptimized = (selectedClass as any).isOptimizedReplacement;
                  const projectedMetrics = !hasHistoricalData && isOptimized ? getProjectedMetrics(selectedClass) : null;
                  
                  return (
                    <>
                      {/* Projected Metrics Banner - only show when using projections */}
                      {projectedMetrics && (
                        <div className="bg-amber-500/20 border border-amber-400/40 rounded-xl p-3 mb-3">
                          <div className="flex items-center gap-2 text-amber-200">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs font-semibold uppercase">Projected Metrics</span>
                          </div>
                          <div className="text-[10px] text-amber-100/80 mt-1">
                            Based on {projectedMetrics.basedOn} ({projectedMetrics.sampleSize} samples, {projectedMetrics.confidence} confidence)
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3" aria-label="Core trainer stats">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                            Sessions {projectedMetrics && <span className="text-amber-300">(Est.)</span>}
                          </div>
                          <div className="text-xl font-bold">
                            {hasHistoricalData ? classSessions.length : projectedMetrics ? '~' + Math.round(projectedMetrics.sampleSize / 4) : '-'}
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                            Avg Check-In {projectedMetrics && <span className="text-amber-300">(Proj.)</span>}
                          </div>
                          <div className={`text-xl font-bold ${projectedMetrics ? 'text-amber-200' : ''}`}>
                            {hasHistoricalData && classSessions.length > 0 
                              ? formatMetric(classSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0) / classSessions.length)
                              : projectedMetrics
                                ? formatMetric(projectedMetrics.avgCheckIns)
                                : formatMetric(selectedClass.avgCheckIns)}
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                            Fill Rate {projectedMetrics && <span className="text-amber-300">(Proj.)</span>}
                          </div>
                          <div className={`text-xl font-bold ${projectedMetrics ? 'text-amber-200' : ''}`}>
                            {hasHistoricalData && classSessions.length > 0
                              ? formatMetric(
                                  classSessions.reduce((sum, s) => sum + (s.Capacity || 0), 0) > 0
                                    ? (classSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0) / classSessions.reduce((sum, s) => sum + (s.Capacity || 0), 0)) * 100
                                    : 0,
                                  '%'
                                )
                              : projectedMetrics
                                ? formatMetric(projectedMetrics.fillRate, '%')
                                : formatMetric(selectedClass.fillRate, '%')}
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Cancel Rate</div>
                          <div className="text-xl font-bold text-red-300">
                            {hasHistoricalData && classSessions.length > 0
                              ? formatMetric(
                                  classSessions.reduce((sum, s) => sum + (s.Booked || 0), 0) > 0
                                    ? (classSessions.reduce((sum, s) => sum + (s.LateCancelled || 0), 0) / classSessions.reduce((sum, s) => sum + (s.Booked || 0), 0)) * 100
                                    : 0,
                                  '%'
                                )
                              : '-'}
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 col-span-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Total Revenue</div>
                          <div className="text-xl font-bold text-green-300">
                            {hasHistoricalData 
                              ? formatCurrency(classSessions.reduce((sum, s) => sum + (s.Revenue || 0), 0))
                              : '-'}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

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

                {/* Moved Class Indicator & Restore Button */}
                {selectedClass.wasMoved && selectedClass.originalDay && selectedClass.originalTime && (
                  <div className="bg-blue-500/20 border border-blue-400/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowRightLeft className="w-4 h-4 text-blue-300" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-blue-200">Class Was Moved</span>
                    </div>
                    <div className="text-sm text-blue-100 mb-3">
                      Originally scheduled for <span className="font-bold">{selectedClass.originalDay}</span> at <span className="font-bold">{selectedClass.originalTime}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (selectedClass.originalDay && selectedClass.originalTime && updateClassSchedule) {
                          // Restore class to original position
                          updateClassSchedule(selectedClass.id, selectedClass.originalDay, selectedClass.originalTime);
                          
                          // Update the selected class display
                          setSelectedClass({
                            ...selectedClass,
                            day: selectedClass.originalDay,
                            time: selectedClass.originalTime,
                            wasMoved: false,
                            originalDay: undefined,
                            originalTime: undefined
                          });
                          
                          // Show confirmation
                          alert(`Class restored to ${selectedClass.originalDay} at ${selectedClass.originalTime}`);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      <Undo2 className="w-4 h-4" />
                      Restore to Original Timeslot
                    </button>
                  </div>
                )}

                {/* Optimization Scheduling Reason - Show if this is an optimized replacement */}
                {(selectedClass as any).isOptimizedReplacement && (() => {
                  const originalSessions = getOriginalClassSessions(selectedClass);
                  const newSessions = classSessions;
                  const projectedMetrics = newSessions.length === 0 ? getProjectedMetrics(selectedClass) : null;
                  const useProjected = newSessions.length === 0 && projectedMetrics;
                  
                  // Calculate metrics from actual historical data
                  const origCheckIns = originalSessions.length > 0
                    ? originalSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0) / originalSessions.length
                    : (selectedClass as any).originalCheckIns || 0;
                  const origFillRate = originalSessions.length > 0 && originalSessions.reduce((sum, s) => sum + (s.Capacity || 0), 0) > 0
                    ? (originalSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0) / originalSessions.reduce((sum, s) => sum + (s.Capacity || 0), 0)) * 100
                    : (selectedClass as any).originalFillRate || 0;
                  
                  const newCheckIns = newSessions.length > 0
                    ? newSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0) / newSessions.length
                    : useProjected ? projectedMetrics.avgCheckIns : (selectedClass.avgCheckIns || 0);
                  const newFillRate = newSessions.length > 0 && newSessions.reduce((sum, s) => sum + (s.Capacity || 0), 0) > 0
                    ? (newSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0) / newSessions.reduce((sum, s) => sum + (s.Capacity || 0), 0)) * 100
                    : useProjected ? projectedMetrics.fillRate : (selectedClass.fillRate || 0);
                  
                  return (
                    <div className="bg-gradient-to-r from-emerald-600/30 to-green-600/30 rounded-xl p-4 border border-emerald-400/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-emerald-300" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Optimization Logic</span>
                      </div>
                      
                      {/* Projected Banner */}
                      {useProjected && (
                        <div className="bg-amber-500/20 border border-amber-400/40 rounded-lg p-2 mb-3">
                          <div className="flex items-center gap-2 text-amber-200 text-[10px]">
                            <TrendingUp className="w-3 h-3" />
                            <span className="font-semibold uppercase">New metrics are projected</span>
                          </div>
                          <div className="text-[9px] text-amber-100/80">
                            Based on {projectedMetrics.basedOn} ({projectedMetrics.confidence} confidence)
                          </div>
                        </div>
                      )}
                      
                      {/* Original vs Optimized Comparison */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-red-500/20 rounded-lg p-2 border border-red-400/30">
                          <div className="text-[9px] uppercase text-red-200 mb-1">Was ({originalSessions.length} sessions)</div>
                          <div className="text-xs font-medium text-red-100 truncate">{(selectedClass as any).originalClass}</div>
                          <div className="text-[10px] text-red-200">by {(selectedClass as any).originalTrainer}</div>
                          <div className="text-sm font-bold text-red-300 mt-1">
                            {formatMetric(origCheckIns)} avg / {formatMetric(origFillRate, '%')}
                          </div>
                        </div>
                        <div className={`rounded-lg p-2 border ${useProjected ? 'bg-amber-500/20 border-amber-400/30' : 'bg-green-500/20 border-green-400/30'}`}>
                          <div className={`text-[9px] uppercase mb-1 ${useProjected ? 'text-amber-200' : 'text-green-200'}`}>
                            {useProjected ? `Projected (${projectedMetrics.sampleSize} samples)` : `Now (${newSessions.length} sessions)`}
                          </div>
                          <div className={`text-xs font-medium truncate ${useProjected ? 'text-amber-100' : 'text-green-100'}`}>{selectedClass.class}</div>
                          <div className={`text-[10px] ${useProjected ? 'text-amber-200' : 'text-green-200'}`}>by {selectedClass.trainer}</div>
                          <div className={`text-sm font-bold mt-1 ${useProjected ? 'text-amber-300' : 'text-green-300'}`}>
                            {useProjected && '~'}{formatMetric(newCheckIns)} avg / {formatMetric(newFillRate, '%')}
                          </div>
                        </div>
                      </div>
                      
                      {/* Performance Improvement */}
                      {newCheckIns > origCheckIns && (
                        <div className="bg-emerald-500/20 rounded-lg p-2 mb-3 border border-emerald-400/30">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-300" />
                            <span className="text-sm font-bold text-emerald-200">
                              {useProjected ? '~' : ''}+{formatMetric(newCheckIns - origCheckIns)} avg attendance improvement{useProjected ? ' (projected)' : ''}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Scheduling Reasons */}
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase text-emerald-200 mb-1">Why This Change?</div>
                        <div className="text-xs text-emerald-100 leading-relaxed">
                          {((selectedClass as any).optimizationFullReason || (selectedClass as any).optimizationReason || 'High-performing class replacement').split(' • ').map((reason: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 mb-1">
                              <span className="text-emerald-400 mt-0.5">•</span>
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Trainer Hours */}
                        <div className="mt-3 pt-3 border-t border-emerald-400/30">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-emerald-200">Trainer Hours After</span>
                            <span className="font-bold text-emerald-100">
                              {(selectedClass as any).trainerHoursAfter || 0} / {(selectedClass as any).trainerMaxHours || 16}hrs
                            </span>
                          </div>
                          <div className="flex gap-2 mt-2">
                            {(selectedClass as any).isPriorityTrainer && (
                              <span className="bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded text-[9px] uppercase">Priority Trainer</span>
                            )}
                            {(selectedClass as any).isNewTrainer && (
                              <span className="bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded text-[9px] uppercase">New Trainer</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Optimization Score */}
                      <div className="mt-3 pt-3 border-t border-emerald-400/30 flex items-center justify-between">
                        <span className="text-[10px] text-emerald-200">Optimization Score</span>
                        <span className="text-lg font-bold text-emerald-300">{(selectedClass as any).optimizationScore || 0}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Specialty & Highlights */}
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide mb-3 opacity-80">Format Specializations</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(() => {
                      // Get ALL sessions for this trainer (not just the selected class)
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      const trainerName = selectedClass.trainer.toLowerCase();
                      
                      // Get sessions from rawData (cleaned sheet)
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

                      // Also get sessions from checkinsData (sessions sheet) - more comprehensive
                      const trainerCheckins = checkinsData.filter((checkin: CheckinData) => {
                        const sessionDate = parseISO(checkin.Date);
                        if (sessionDate >= today) return false; // Only past sessions
                        const inDateRange = isWithinInterval(sessionDate, { start: filters.dateFrom, end: filters.dateTo });
                        if (!inDateRange) return false;
                        
                        // Match by trainer name
                        const checkinTrainer = checkin.TeacherName?.toLowerCase() || '';
                        
                        return checkinTrainer === trainerName || 
                               checkinTrainer.includes(trainerName) ||
                               trainerName.includes(checkinTrainer);
                      });

                      // Calculate class frequency from rawData
                      const classCount = trainerSessions.reduce((acc, session) => {
                        if (session.Class) {
                          acc[session.Class] = (acc[session.Class] || 0) + 1;
                        }
                        return acc;
                      }, {} as Record<string, number>);
                      
                      // Add class frequency from checkinsData (use CleanedClass for class name)
                      // Group by unique session to avoid counting duplicates
                      const uniqueSessions = new Set<string>();
                      trainerCheckins.forEach((checkin: CheckinData) => {
                        const sessionKey = `${checkin.SessionID}-${checkin.CleanedClass}`;
                        if (!uniqueSessions.has(sessionKey)) {
                          uniqueSessions.add(sessionKey);
                          if (checkin.CleanedClass) {
                            classCount[checkin.CleanedClass] = (classCount[checkin.CleanedClass] || 0) + 1;
                          }
                        }
                      });
                      
                      // Calculate metrics for each class
                      const classMetrics = Object.keys(classCount).map(className => {
                        // Get all sessions for this class from rawData
                        const classSessions = trainerSessions.filter(s => s.Class === className);
                        
                        // Calculate average check-ins (class average)
                        const totalCheckIns = classSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0);
                        const totalCapacity = classSessions.reduce((sum, s) => sum + (s.Capacity || 0), 0);
                        const classAverage = classSessions.length > 0 ? totalCheckIns / classSessions.length : 0;
                        const fillRate = totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0;
                        
                        return {
                          name: className,
                          count: classCount[className],
                          classAverage: Math.round(classAverage * 10) / 10,
                          fillRate: Math.round(fillRate)
                        };
                      });
                      
                      // Calculate location average for comparison
                      const location = selectedClass.location;
                      const locationSessions = rawData.filter((session: SessionData) => {
                        const sessionDate = parseISO(session.Date);
                        if (sessionDate >= today) return false;
                        const inDateRange = isWithinInterval(sessionDate, { start: filters.dateFrom, end: filters.dateTo });
                        return inDateRange && session.Location === location;
                      });
                      
                      const locationTotalCheckIns = locationSessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0);
                      const locationAverage = locationSessions.length > 0 
                        ? locationTotalCheckIns / locationSessions.length 
                        : 0;
                      
                      // Filter classes: classAverage > locationAverage OR fillRate > 60%
                      const topClasses = classMetrics
                        .filter(cls => cls.classAverage > locationAverage || cls.fillRate > 60)
                        .sort((a, b) => {
                          // Sort by class average first, then by frequency
                          if (Math.abs(a.classAverage - b.classAverage) > 1) {
                            return b.classAverage - a.classAverage;
                          }
                          return b.count - a.count;
                        });

                      // Debug logging if needed
                      if (topClasses.length === 0) {
                        console.log('Debug trainer class metrics:', {
                          selectedTrainer: selectedClass.trainer,
                          location: location,
                          locationAverage: Math.round(locationAverage * 10) / 10,
                          foundInRawData: trainerSessions.length,
                          foundInCheckinsData: trainerCheckins.length,
                          uniqueSessionsFromCheckins: uniqueSessions.size,
                          allClassMetrics: classMetrics,
                          classCount
                        });
                      }

                      return topClasses.map((classInfo, i) => (
                        <div key={i} className="px-3 py-1.5 bg-blue-500/30 rounded-full text-xs font-medium flex items-center gap-2">
                          <span>{classInfo.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-semibold" title="Sessions taught">
                              {classInfo.count}
                            </span>
                            <span className="text-[10px] bg-green-500/30 px-1.5 py-0.5 rounded-full font-semibold" title="Class average">
                              {classInfo.classAverage}
                            </span>
                            <span className="text-[10px] bg-blue-500/30 px-1.5 py-0.5 rounded-full font-semibold" title="Fill rate">
                              {classInfo.fillRate}%
                            </span>
                          </div>
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
                      <div className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-600/10 opacity-0 group-hover:opacity-100" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Sessions</div>
                          <div className="text-3xl font-black text-white mb-4">{classSessions.length}</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <div className="bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500 h-1.5 rounded-full shadow-lg shadow-blue-500/50 w-full" />
                          </div>
                        </div>
                      </div>

                      {/* Total Check-ins */}
                      <div className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-transparent to-green-600/10 opacity-0 group-hover:opacity-100" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Check-Ins</div>
                          <div className="text-3xl font-black text-white mb-4">{totalCheckIns}</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <div className="bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 h-1.5 rounded-full shadow-lg shadow-emerald-500/50" style={{ width: `${Math.min(fillRate, 100)}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Avg (No Empty) */}
                      <div className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 via-transparent to-blue-600/10 opacity-0 group-hover:opacity-100" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Avg (No Empty)</div>
                          <div className="text-3xl font-black text-white mb-4">{avgCheckInsExcludingEmpty.toFixed(1)}</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <div className="bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-500 h-1.5 rounded-full shadow-lg shadow-cyan-500/50" style={{ width: `${Math.min((avgCheckInsExcludingEmpty / 30) * 100, 100)}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Fill Rate */}
                      <div className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-indigo-600/10 opacity-0 group-hover:opacity-100" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Fill Rate</div>
                          <div className="text-3xl font-black text-white mb-4">{fillRate.toFixed(0)}%</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <div className="bg-gradient-to-r from-purple-500 via-indigo-400 to-purple-500 h-1.5 rounded-full shadow-lg shadow-purple-500/50" style={{ width: `${fillRate}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Total Booked */}
                      <div className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 via-transparent to-yellow-600/10 opacity-0 group-hover:opacity-100" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Booked</div>
                          <div className="text-3xl font-black text-white mb-4">{totalBooked}</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 h-1.5 rounded-full shadow-lg shadow-amber-500/50" style={{ width: `${totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Cancellations */}
                      <div className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-rose-600/10 opacity-0 group-hover:opacity-100" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Cancellations</div>
                          <div className="text-3xl font-black text-white mb-4">{totalCancellations}</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <div className="bg-gradient-to-r from-red-500 via-rose-400 to-red-500 h-1.5 rounded-full shadow-lg shadow-red-500/50" style={{ width: `${cancelRate}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Cancel Rate */}
                      <div className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 via-transparent to-red-600/10 opacity-0 group-hover:opacity-100" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Cancel Rate</div>
                          <div className="text-3xl font-black text-white mb-4">{cancelRate.toFixed(1)}%</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <div className="bg-gradient-to-r from-orange-500 via-red-400 to-orange-500 h-1.5 rounded-full shadow-lg shadow-orange-500/50" style={{ width: `${cancelRate}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Total Revenue */}
                      <div className="relative rounded-xl p-5 shadow-xl border border-slate-800/20 hover:shadow-2xl overflow-hidden group bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 via-transparent to-emerald-600/10 opacity-0 group-hover:opacity-100" />
                        <div className="relative z-10">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Total Revenue</div>
                          <div className="text-3xl font-black text-white mb-4">{formatCurrency(totalRevenue)}</div>
                          <div className="mt-3 bg-slate-700/50 rounded-full h-1.5 overflow-hidden backdrop-blur-sm">
                            <div className="bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 h-1.5 rounded-full shadow-lg shadow-green-500/50 w-full" />
                          </div>
                        </div>
                      </div>
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
            </div>
          </div>
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
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
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
          </div>
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
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
                      <div
                        key={`${rec.class}-${rec.trainer}-${idx}`}
                        className="bg-white rounded-lg p-4 border border-slate-200 hover:border-slate-300 hover:shadow-md"
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
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-sm hover:shadow-md flex items-center gap-1.5"
                            >
                              <Repeat className="w-3.5 h-3.5" />
                              Replace
                            </button>
                          </div>
                        </div>
                      </div>
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
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
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
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
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
          </div>
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
            <div className="w-full max-w-7xl transform rounded-3xl bg-white/80 glass-card text-left align-middle shadow-2xl max-h-[90vh] overflow-hidden">
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
            </div>
          </div>
        );
      })()}

      {/* OPTIMIZATION SETTINGS MODAL */}
      {showOptimizationSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-white" />
                <div>
                  <h2 className="text-xl font-bold text-white">Optimization Rules</h2>
                  <p className="text-indigo-100 text-sm">Configure trainer priorities, format assignments, and scheduling constraints</p>
                </div>
              </div>
              <button
                onClick={() => setShowOptimizationSettings(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-8">
                
                {/* Location Constraints */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Location Constraints & Priority Trainers
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Configure max parallel classes, required formats, and priority trainers for each location.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(optimizationSettings.locationConstraints).map(([location, constraints]: [string, LocationConstraints]) => (
                      <div key={location} className="bg-white rounded-xl p-4 border border-blue-100">
                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <Building className="w-4 h-4 text-blue-500" />
                          {location.includes('Kwality') ? 'Kwality House' : 'Supreme HQ Bandra'}
                        </h4>
                        
                        {/* Max Parallel Classes */}
                        <div className="mb-4">
                          <label className="block text-sm text-slate-600 mb-1">Max Parallel Classes</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={constraints.maxParallelClasses}
                            onChange={(e) => {
                              const newSettings = { ...optimizationSettings };
                              newSettings.locationConstraints[location].maxParallelClasses = parseInt(e.target.value) || 1;
                              setOptimizationSettings(newSettings);
                            }}
                            className="w-24 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        {/* Required Formats */}
                        <div className="mb-4">
                          <label className="block text-sm text-slate-600 mb-1">Required Formats (must have)</label>
                          <div className="flex flex-wrap gap-2">
                            {constraints.requiredFormats.map((fmt: string) => (
                              <div key={fmt} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs capitalize">
                                {fmt}
                                <button
                                  onClick={() => {
                                    const newSettings = { ...optimizationSettings };
                                    newSettings.locationConstraints[location].requiredFormats = constraints.requiredFormats.filter((f: string) => f !== fmt);
                                    setOptimizationSettings(newSettings);
                                  }}
                                  className="ml-1 text-blue-600 hover:text-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Add required format..."
                            className="mt-2 w-full px-3 py-1 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const input = e.target as HTMLInputElement;
                                const value = input.value.trim().toLowerCase();
                                if (value && !constraints.requiredFormats.includes(value)) {
                                  const newSettings = { ...optimizationSettings };
                                  newSettings.locationConstraints[location].requiredFormats = [...constraints.requiredFormats, value];
                                  setOptimizationSettings(newSettings);
                                  input.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                        
                        {/* Priority Trainers */}
                        <div>
                          <label className="block text-sm text-slate-600 mb-1">Priority Trainers (maximize hours)</label>
                          <div className="flex flex-wrap gap-2">
                            {constraints.priorityTrainers.map((trainer: string, idx: number) => (
                              <div key={trainer} className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                <span className="w-4 h-4 bg-green-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">{idx + 1}</span>
                                {trainer}
                                <button
                                  onClick={() => {
                                    const newSettings = { ...optimizationSettings };
                                    newSettings.locationConstraints[location].priorityTrainers = constraints.priorityTrainers.filter((_: string, i: number) => i !== idx);
                                    setOptimizationSettings(newSettings);
                                  }}
                                  className="ml-1 text-green-600 hover:text-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Add priority trainer..."
                            className="mt-2 w-full px-3 py-1 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const input = e.target as HTMLInputElement;
                                const value = input.value.trim().toLowerCase();
                                if (value && !constraints.priorityTrainers.includes(value)) {
                                  const newSettings = { ...optimizationSettings };
                                  newSettings.locationConstraints[location].priorityTrainers = [...constraints.priorityTrainers, value];
                                  setOptimizationSettings(newSettings);
                                  input.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Format Priorities */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-600" />
                    Format-Specific Trainer Priorities
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Assign trainers who specialize in specific class formats.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {optimizationSettings.formatPriorities.map((fp: FormatPriority, fpIndex: number) => (
                      <div key={fp.format} className="bg-white rounded-xl p-4 border border-purple-100">
                        <h4 className="font-semibold text-slate-700 mb-3 capitalize flex items-center gap-2">
                          {fp.format.includes('cycle') && <Zap className="w-4 h-4 text-yellow-500" />}
                          {fp.format.includes('fit') && <Star className="w-4 h-4 text-green-500" />}
                          {fp.format.includes('mat') && <Activity className="w-4 h-4 text-purple-500" />}
                          {fp.format.replace(/_/g, ' ')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {fp.priorityTrainers.map((trainer: string, idx: number) => (
                            <div key={trainer} className="flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                              <span className="w-4 h-4 bg-purple-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">{idx + 1}</span>
                              {trainer}
                              <button
                                onClick={() => {
                                  const newSettings = { ...optimizationSettings };
                                  newSettings.formatPriorities[fpIndex].priorityTrainers = fp.priorityTrainers.filter((_: string, i: number) => i !== idx);
                                  setOptimizationSettings(newSettings);
                                }}
                                className="ml-1 text-purple-600 hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Add trainer..."
                          className="mt-2 w-full px-2 py-1 text-xs border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              const value = input.value.trim().toLowerCase();
                              if (value && !fp.priorityTrainers.includes(value)) {
                                const newSettings = { ...optimizationSettings };
                                newSettings.formatPriorities[fpIndex].priorityTrainers = [...fp.priorityTrainers, value];
                                setOptimizationSettings(newSettings);
                                input.value = '';
                              }
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* New Trainers */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-amber-600" />
                    New Trainer Restrictions
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    New trainers are restricted to specific formats until they gain experience.
                  </p>
                  
                  <div className="space-y-4">
                    {(optimizationSettings.newTrainers || []).map((trainer: TrainerPriority, tIndex: number) => (
                      <div key={trainer.name} className="bg-white rounded-xl p-4 border border-amber-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <UserPlus className="w-5 h-5 text-amber-500" />
                          <span className="font-semibold capitalize">{trainer.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Allowed:</span>
                          <div className="flex flex-wrap gap-1">
                            {trainer.allowedFormats?.map((fmt: string) => (
                              <span key={fmt} className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs capitalize">{fmt}</span>
                            )) || <span className="text-xs text-slate-400">All formats</span>}
                          </div>
                          <button
                            onClick={() => {
                              const newSettings = { ...optimizationSettings };
                              newSettings.newTrainers = newSettings.newTrainers.filter((_: TrainerPriority, i: number) => i !== tIndex);
                              setOptimizationSettings(newSettings);
                            }}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add new trainer form */}
                    <div className="bg-white rounded-xl p-4 border border-dashed border-amber-300">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Trainer name..."
                          className="flex-1 px-3 py-2 text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          id="new-trainer-name"
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById('new-trainer-name') as HTMLInputElement;
                            const value = input.value.trim().toLowerCase();
                            if (value) {
                              const newSettings = { ...optimizationSettings };
                              newSettings.newTrainers = [...newSettings.newTrainers, {
                                name: value,
                                targetHours: 15,
                                allowedFormats: ['powercycle', 'cycle', 'barre', 'recovery'],
                                isNewTrainer: true
                              }];
                              setOptimizationSettings(newSettings);
                              input.value = '';
                            }
                          }}
                          className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                        >
                          Add New Trainer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Target Hours */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    Trainer Hour Targets
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-slate-700">Target Hours Per Week:</label>
                      <input
                        type="number"
                        min="10"
                        max="40"
                        value={optimizationSettings.targetTrainerHours}
                        onChange={(e) => {
                          const newSettings = { ...optimizationSettings };
                          newSettings.targetTrainerHours = parseInt(e.target.value) || 15;
                          setOptimizationSettings(newSettings);
                        }}
                        className="w-24 px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <span className="text-sm text-slate-500">hours</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-slate-700">Maximum Hours Per Trainer:</label>
                      <input
                        type="number"
                        min="10"
                        max="40"
                        value={optimizationSettings.maxTrainerHours}
                        onChange={(e) => {
                          const newSettings = { ...optimizationSettings };
                          newSettings.maxTrainerHours = parseInt(e.target.value) || 16;
                          setOptimizationSettings(newSettings);
                        }}
                        className="w-24 px-3 py-2 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <span className="text-sm text-slate-500">hours max</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="minimize-trainers"
                      checked={optimizationSettings.minimizeTrainersPerSlot}
                      onChange={(e) => {
                        const newSettings = { ...optimizationSettings };
                        newSettings.minimizeTrainersPerSlot = e.target.checked;
                        setOptimizationSettings(newSettings);
                      }}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="minimize-trainers" className="text-sm text-slate-700">
                      Minimize number of trainers per time slot (consolidate hours)
                    </label>
                  </div>
                </div>

                {/* BLOCKED TRAINERS */}
                <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-6 border border-red-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <UserMinus className="w-5 h-5 text-red-600" />
                    Blocked Trainers
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    These trainers will NEVER be assigned any optimized classes. They will only keep their existing scheduled classes.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(optimizationSettings.blockedTrainers || []).map((trainer: string) => (
                      <div key={trainer} className="flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1.5 rounded-full text-sm font-medium capitalize">
                        <UserMinus className="w-4 h-4" />
                        {trainer}
                        <button
                          onClick={() => {
                            const newSettings = { ...optimizationSettings };
                            newSettings.blockedTrainers = newSettings.blockedTrainers.filter((t: string) => t !== trainer);
                            setOptimizationSettings(newSettings);
                          }}
                          className="ml-1 text-red-600 hover:text-red-900 hover:bg-red-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="add-blocked-trainer"
                      placeholder="Add trainer to block..."
                      className="flex-1 px-3 py-2 text-sm border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          const value = input.value.trim().toLowerCase();
                          if (value && !(optimizationSettings.blockedTrainers || []).includes(value)) {
                            const newSettings = { ...optimizationSettings };
                            newSettings.blockedTrainers = [...(newSettings.blockedTrainers || []), value];
                            setOptimizationSettings(newSettings);
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('add-blocked-trainer') as HTMLInputElement;
                        const value = input.value.trim().toLowerCase();
                        if (value && !(optimizationSettings.blockedTrainers || []).includes(value)) {
                          const newSettings = { ...optimizationSettings };
                          newSettings.blockedTrainers = [...(newSettings.blockedTrainers || []), value];
                          setOptimizationSettings(newSettings);
                          input.value = '';
                        }
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                    >
                      Block Trainer
                    </button>
                  </div>
                </div>

                {/* EXCLUDED FORMATS */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Ban className="w-5 h-5 text-orange-600" />
                    Excluded Formats
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    These class formats will NEVER be scheduled as optimized replacements (e.g., hosted classes, guest sessions).
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(optimizationSettings.excludedFormats || []).map((fmt: string) => (
                      <div key={fmt} className="flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-sm font-medium capitalize">
                        <Ban className="w-4 h-4" />
                        {fmt}
                        <button
                          onClick={() => {
                            const newSettings = { ...optimizationSettings };
                            newSettings.excludedFormats = newSettings.excludedFormats.filter((f: string) => f !== fmt);
                            setOptimizationSettings(newSettings);
                          }}
                          className="ml-1 text-orange-600 hover:text-orange-900 hover:bg-orange-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="add-excluded-format"
                      placeholder="Add format to exclude (e.g., hosted, guest)..."
                      className="flex-1 px-3 py-2 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          const value = input.value.trim().toLowerCase();
                          if (value && !(optimizationSettings.excludedFormats || []).includes(value)) {
                            const newSettings = { ...optimizationSettings };
                            newSettings.excludedFormats = [...(newSettings.excludedFormats || []), value];
                            setOptimizationSettings(newSettings);
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('add-excluded-format') as HTMLInputElement;
                        const value = input.value.trim().toLowerCase();
                        if (value && !(optimizationSettings.excludedFormats || []).includes(value)) {
                          const newSettings = { ...optimizationSettings };
                          newSettings.excludedFormats = [...(newSettings.excludedFormats || []), value];
                          setOptimizationSettings(newSettings);
                          input.value = '';
                        }
                      }}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                    >
                      Exclude Format
                    </button>
                  </div>
                </div>

                {/* MINIMUM CLASSES PER LOCATION */}
                <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-6 border border-cyan-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5 text-cyan-600" />
                    Minimum Classes Per Location
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Ensure each location has at least this many classes scheduled in the optimized schedule.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(optimizationSettings.minClassesPerLocation || {}).map(([location, minClasses]) => (
                      <div key={location} className="bg-white rounded-xl p-4 border border-cyan-100">
                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-cyan-500" />
                          {location.includes('Kwality') ? 'Kwality House, Kemps Corner' : 'Supreme HQ, Bandra'}
                        </h4>
                        
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-slate-600">Minimum Classes:</label>
                          <input
                            type="number"
                            min="50"
                            max="150"
                            value={minClasses as number}
                            onChange={(e) => {
                              const newSettings = { ...optimizationSettings };
                              newSettings.minClassesPerLocation = {
                                ...newSettings.minClassesPerLocation,
                                [location]: parseInt(e.target.value) || 75
                              };
                              setOptimizationSettings(newSettings);
                            }}
                            className="w-24 px-3 py-2 text-sm border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-bold text-cyan-700"
                          />
                          <span className="text-sm text-slate-500">classes per week</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TIME RESTRICTIONS */}
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-600" />
                    Time Restrictions
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Define when classes should NOT be scheduled.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <h4 className="font-semibold text-slate-700 mb-3">Operating Hours</h4>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-slate-600">No classes before:</label>
                          <input
                            type="time"
                            value={optimizationSettings.noClassesBefore || '07:00'}
                            onChange={(e) => {
                              const newSettings = { ...optimizationSettings };
                              newSettings.noClassesBefore = e.target.value;
                              setOptimizationSettings(newSettings);
                            }}
                            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">No classes after:</label>
                        <input
                          type="time"
                          value={optimizationSettings.noClassesAfter || '20:00'}
                          onChange={(e) => {
                            const newSettings = { ...optimizationSettings };
                            newSettings.noClassesAfter = e.target.value;
                            setOptimizationSettings(newSettings);
                          }}
                          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <h4 className="font-semibold text-slate-700 mb-3">Mid-Day Break</h4>
                      <p className="text-xs text-slate-500 mb-3">No classes between these times</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={optimizationSettings.noClassesBetweenStart || '12:30'}
                          onChange={(e) => {
                            const newSettings = { ...optimizationSettings };
                            newSettings.noClassesBetweenStart = e.target.value;
                            setOptimizationSettings(newSettings);
                          }}
                          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500"
                        />
                        <span className="text-slate-500">to</span>
                        <input
                          type="time"
                          value={optimizationSettings.noClassesBetweenEnd || '15:30'}
                          onChange={(e) => {
                            const newSettings = { ...optimizationSettings };
                            newSettings.noClassesBetweenEnd = e.target.value;
                            setOptimizationSettings(newSettings);
                          }}
                          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* TRAINER LEAVE / UNAVAILABILITY */}
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-6 border border-indigo-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Trainer Leaves & Unavailability
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Trainers on leave will not be assigned any classes during their leave period.
                  </p>
                  
                  {/* Existing Leaves */}
                  <div className="space-y-2 mb-4">
                    {(optimizationSettings.trainerLeaves || []).map((leave: TrainerLeave, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-indigo-100">
                        <div className="flex-1">
                          <div className="font-semibold capitalize text-slate-700">{leave.trainerName}</div>
                          <div className="text-xs text-slate-500">
                            {leave.startDate} to {leave.endDate}
                            {leave.reason && <span className="ml-2 text-indigo-500">({leave.reason})</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newSettings = { ...optimizationSettings };
                            newSettings.trainerLeaves = newSettings.trainerLeaves.filter((_: TrainerLeave, i: number) => i !== idx);
                            setOptimizationSettings(newSettings);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Add Leave Form */}
                  <div className="bg-white rounded-lg p-4 border border-dashed border-indigo-300">
                    <div className="grid grid-cols-4 gap-3">
                      <input
                        type="text"
                        id="leave-trainer"
                        placeholder="Trainer name"
                        className="px-3 py-2 text-sm border border-indigo-200 rounded-lg"
                      />
                      <input
                        type="date"
                        id="leave-start"
                        className="px-3 py-2 text-sm border border-indigo-200 rounded-lg"
                      />
                      <input
                        type="date"
                        id="leave-end"
                        className="px-3 py-2 text-sm border border-indigo-200 rounded-lg"
                      />
                      <button
                        onClick={() => {
                          const trainer = (document.getElementById('leave-trainer') as HTMLInputElement).value.trim().toLowerCase();
                          const start = (document.getElementById('leave-start') as HTMLInputElement).value;
                          const end = (document.getElementById('leave-end') as HTMLInputElement).value;
                          if (trainer && start && end) {
                            const newSettings = { ...optimizationSettings };
                            newSettings.trainerLeaves = [...(newSettings.trainerLeaves || []), {
                              trainerName: trainer,
                              startDate: start,
                              endDate: end
                            }];
                            setOptimizationSettings(newSettings);
                            (document.getElementById('leave-trainer') as HTMLInputElement).value = '';
                            (document.getElementById('leave-start') as HTMLInputElement).value = '';
                            (document.getElementById('leave-end') as HTMLInputElement).value = '';
                          }
                        }}
                        className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600"
                      >
                        Add Leave
                      </button>
                    </div>
                  </div>
                </div>

                {/* ADVANCED SETTINGS */}
                <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-6 border border-pink-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-pink-600" />
                    Advanced Scheduling Rules
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Trainer Days Off */}
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-slate-700 w-64">Minimum days off per trainer:</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={optimizationSettings.minDaysOff || 2}
                        onChange={(e) => {
                          const newSettings = { ...optimizationSettings };
                          newSettings.minDaysOff = parseInt(e.target.value) || 2;
                          setOptimizationSettings(newSettings);
                        }}
                        className="w-20 px-3 py-2 text-sm border border-pink-200 rounded-lg"
                      />
                      <span className="text-sm text-slate-500">days per week</span>
                    </div>
                    
                    {/* Avoid Multi-Location Days */}
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        id="avoid-multi-location"
                        checked={optimizationSettings.avoidMultiLocationDays ?? true}
                        onChange={(e) => {
                          const newSettings = { ...optimizationSettings };
                          newSettings.avoidMultiLocationDays = e.target.checked;
                          setOptimizationSettings(newSettings);
                        }}
                        className="w-4 h-4 text-pink-600 border-gray-300 rounded"
                      />
                      <label htmlFor="avoid-multi-location" className="text-sm text-slate-700">
                        Avoid scheduling trainers at multiple locations on the same day
                      </label>
                    </div>
                    
                    {/* Advanced Formats */}
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-slate-700 w-64">Max HIIT/Amped Up classes per week:</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={optimizationSettings.advancedFormatsMaxPerWeek || 2}
                        onChange={(e) => {
                          const newSettings = { ...optimizationSettings };
                          newSettings.advancedFormatsMaxPerWeek = parseInt(e.target.value) || 2;
                          setOptimizationSettings(newSettings);
                        }}
                        className="w-20 px-3 py-2 text-sm border border-pink-200 rounded-lg"
                      />
                      <span className="text-sm text-slate-500">at {optimizationSettings.advancedFormatsLocation || 'Kwality House'} only</span>
                    </div>
                    
                    {/* Regenerate with variety */}
                    <div className="pt-4 border-t border-pink-200">
                      <button
                        onClick={() => {
                          const newSettings = { ...optimizationSettings };
                          newSettings.randomizationSeed = Date.now();
                          setOptimizationSettings(newSettings);
                        }}
                        className="px-4 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600 flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Generate New Schedule Variation
                      </button>
                      <p className="text-xs text-pink-600 mt-2">
                        Click to generate a different optimized schedule while following all rules
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setOptimizationSettings(DEFAULT_OPTIMIZATION_SETTINGS);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                Reset to Defaults
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowOptimizationSettings(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Save to localStorage
                    localStorage.setItem('proSchedulerOptimizationSettings', JSON.stringify(optimizationSettings));
                    setShowOptimizationSettings(false);
                    // Trigger recalculation
                    if (typeof window !== 'undefined' && (window as { __proSchedulerCacheInvalidate?: () => void }).__proSchedulerCacheInvalidate) {
                      (window as { __proSchedulerCacheInvalidate?: () => void }).__proSchedulerCacheInvalidate!();
                    }
                  }}
                  className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg transition-colors shadow-lg"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ALL REPLACEMENTS MODAL */}
      {showAllReplacements && optimizedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-white" />
                <div>
                  <h2 className="text-xl font-bold text-white">All Optimization Changes</h2>
                  <p className="text-emerald-100 text-sm">
                    {optimizedSchedule.replacements.length} replacements • {optimizedSchedule.summary.underperforming} underperforming classes improved
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAllReplacements(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Replacements List */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="text-xs text-blue-600 uppercase font-semibold mb-1">Total Replacements</div>
                  <div className="text-2xl font-bold text-blue-800">{optimizedSchedule.replacements.length}</div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <div className="text-xs text-green-600 uppercase font-semibold mb-1">Avg Improvement</div>
                  <div className="text-2xl font-bold text-green-800">
                    +{formatMetric(
                      optimizedSchedule.replacements.length > 0
                        ? optimizedSchedule.replacements.reduce((sum, r) => 
                            sum + (r.replacement.expectedCheckIns - r.replacement.originalCheckIns), 0
                          ) / optimizedSchedule.replacements.length
                        : 0
                    )}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                  <div className="text-xs text-purple-600 uppercase font-semibold mb-1">Priority Trainers Used</div>
                  <div className="text-2xl font-bold text-purple-800">
                    {optimizedSchedule.replacements.filter(r => r.replacement.isPriority).length}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                  <div className="text-xs text-amber-600 uppercase font-semibold mb-1">New Trainers Used</div>
                  <div className="text-2xl font-bold text-amber-800">
                    {optimizedSchedule.replacements.filter(r => r.replacement.isNewTrainer).length}
                  </div>
                </div>
              </div>

              {/* Replacements Table */}
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 uppercase">
                  <div className="col-span-2">Day/Time</div>
                  <div className="col-span-2">Original</div>
                  <div className="col-span-2">Replacement</div>
                  <div className="col-span-1">Orig Avg</div>
                  <div className="col-span-1">New Avg</div>
                  <div className="col-span-3">Reason</div>
                  <div className="col-span-1">Score</div>
                </div>
                
                {optimizedSchedule.replacements.map((r, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      // Find the optimized class and open drilldown
                      const optimizedClass = filteredClasses.find(c => c.id === r.original.id);
                      if (optimizedClass) {
                        setSelectedClass(optimizedClass as ScheduleClass);
                        setShowDrilldown(true);
                        setShowAllReplacements(false);
                      }
                    }}
                  >
                    {/* Day/Time & Location */}
                    <div className="col-span-2">
                      <div className="font-semibold text-slate-800">{r.original.day}</div>
                      <div className="text-xs text-slate-500">{r.original.time}</div>
                      <div className="text-[10px] text-slate-400 truncate">{r.original.location.split(',')[0]}</div>
                    </div>
                    
                    {/* Original Class/Trainer */}
                    <div className="col-span-2">
                      <div className="text-red-600 font-medium text-sm truncate">{r.replacement.originalClass}</div>
                      <div className="text-xs text-red-400">{r.replacement.originalTrainer}</div>
                    </div>
                    
                    {/* Replacement Class/Trainer */}
                    <div className="col-span-2">
                      <div className="text-green-600 font-medium text-sm truncate">{r.replacement.class}</div>
                      <div className="text-xs text-green-500 flex items-center gap-1">
                        {r.replacement.trainerDisplay}
                        {r.replacement.isPriority && <Star className="w-3 h-3 text-blue-500" />}
                        {r.replacement.isNewTrainer && <UserPlus className="w-3 h-3 text-amber-500" />}
                      </div>
                    </div>
                    
                    {/* Original Metrics */}
                    <div className="col-span-1">
                      <div className="text-red-500 font-semibold">{formatMetric(r.replacement.originalCheckIns)}</div>
                      <div className="text-[10px] text-red-400">{formatMetric(r.replacement.originalFillRate, '%')}</div>
                    </div>
                    
                    {/* New Metrics */}
                    <div className="col-span-1">
                      <div className="text-green-600 font-semibold">{formatMetric(r.replacement.expectedCheckIns)}</div>
                      <div className="text-[10px] text-green-500">{formatMetric(r.replacement.expectedFillRate, '%')}</div>
                    </div>
                    
                    {/* Reason */}
                    <div className="col-span-3">
                      <div className="text-xs text-slate-600 line-clamp-2">{r.replacement.fullReason || r.replacement.reason}</div>
                    </div>
                    
                    {/* Score */}
                    <div className="col-span-1">
                      <div className={`text-center font-bold rounded-lg py-1 ${
                        r.replacement.score >= 100 ? 'bg-green-100 text-green-700' :
                        r.replacement.score >= 50 ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {r.replacement.score}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {optimizedSchedule.replacements.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No replacements needed - schedule is already optimized!</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Click any row to see detailed analytics in the drilldown modal
              </p>
              <button
                onClick={() => setShowAllReplacements(false)}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-lg transition-colors shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ProScheduler);