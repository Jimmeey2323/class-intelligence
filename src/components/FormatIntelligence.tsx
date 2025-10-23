import { useMemo, useState, useEffect } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { SessionData } from '../types';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/calculations';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  BarChart3,
  LineChart,
  PieChart,
  Download,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Filter,
  Search,
  FileText,
  Eye,
  MapPin,
  Calendar,
  Activity,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { parseISO, format as formatDate, eachWeekOfInterval, isSameWeek } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type AnalysisTab = 'overview' | 'formats' | 'trainers' | 'reports';

interface FormatMetrics {
  format: string;
  totalSessions: number;
  avgAttendance: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  totalRevenue: number;
  fillRate: number;
  cancelRate: number;
  trainers: string[];
  locations: string[];
  changes: ChangeDetection[];
  sessions: SessionData[];
  isActive: boolean;
  hasPatternBreak: boolean;
  patternBreakDetails?: string;
  forecastedTrend: 'growth' | 'decline' | 'stable';
  volatilityScore: number; // 0-100, higher = more volatile
}

interface ChangeDetection {
  type: 'trainer' | 'time' | 'class' | 'level';
  date: string;
  before: string;
  after: string;
  attendanceImpact: number;
  sessionsBefore: SessionData[];
  sessionsAfter: SessionData[];
  format: string;
  location: string;
  dayOfWeek: string;
  timeSlot: string;
  isActive: boolean; // Only track active classes
}

interface WeeklyData {
  week: string;
  attendance: number;
  revenue: number;
  sessions: number;
}

interface TrainerMetric {
  trainer: string;
  sessions: number;
  avgAttendance: number;
  fillRate: number;
  cancelRate: number;
  revenue: number;
  revenuePerSession: number;
  sessionsList: SessionData[];
}

export function FormatIntelligence() {
  const { rawData } = useDashboardStore();
  const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [drilldownChange, setDrilldownChange] = useState<ChangeDetection | null>(null);
  const [drilldownTrainer, setDrilldownTrainer] = useState<TrainerMetric | null>(null);
  const [changeFilterType, setChangeFilterType] = useState<string>('all');
  const [changeSearchTerm, setChangeSearchTerm] = useState('');
  const [trainerFilterMinSessions, setTrainerFilterMinSessions] = useState(0);
  const [trainerSearchTerm, setTrainerSearchTerm] = useState('');
  
  // Format Intelligence independent filters
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedTrainers, setSelectedTrainers] = useState<string[]>([]);
  const [selectedClassTypes, setSelectedClassTypes] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active'); // Default to active only
  const [showPatternBreaksOnly, setShowPatternBreaksOnly] = useState(false);

  // Get all unique values for filters
  const allLocations = useMemo(() => {
    const locations = new Set(rawData.map(s => s.Location));
    return Array.from(locations).sort();
  }, [rawData]);

  const allTrainers = useMemo(() => {
    const trainers = new Set(rawData.map(s => s.Trainer));
    return Array.from(trainers).sort();
  }, [rawData]);

  const allClassTypes = useMemo(() => {
    const types = new Set(rawData.map(s => s.Type));
    return Array.from(types).sort();
  }, [rawData]);

  // Apply format intelligence independent filters (completely independent from main dashboard)
  const formatFilteredData = useMemo(() => {
    let data = rawData; // Start from raw data, not filtered data
    
    // Filter by location
    if (selectedLocations.length > 0) {
      data = data.filter(s => selectedLocations.includes(s.Location));
    }
    
    // Filter by trainer
    if (selectedTrainers.length > 0) {
      data = data.filter(s => selectedTrainers.includes(s.Trainer));
    }
    
    // Filter by class type
    if (selectedClassTypes.length > 0) {
      data = data.filter(s => selectedClassTypes.includes(s.Type));
    }
    
    // Filter by date range
    if (dateFrom) {
      data = data.filter(s => new Date(s.Date) >= dateFrom);
    }
    if (dateTo) {
      data = data.filter(s => new Date(s.Date) <= dateTo);
    }
    
    return data;
  }, [rawData, selectedLocations, selectedTrainers, selectedClassTypes, dateFrom, dateTo]);

  // Get all unique formats
  const allFormats = useMemo(() => {
    const formats = new Set(formatFilteredData.map(s => s.Class));
    return Array.from(formats).sort();
  }, [formatFilteredData]);

  // Calculate comprehensive format metrics
  const formatMetrics = useMemo<FormatMetrics[]>(() => {
    const metricsMap = new Map<string, FormatMetrics>();

    allFormats.forEach(format => {
      const sessions = formatFilteredData.filter(s => s.Class === format);
      if (sessions.length === 0) return;

      // Sort by date
      const sortedSessions = [...sessions].sort((a, b) => 
        new Date(a.Date).getTime() - new Date(b.Date).getTime()
      );

      // Calculate trend (compare first half vs second half)
      const midpoint = Math.floor(sortedSessions.length / 2);
      const firstHalf = sortedSessions.slice(0, midpoint);
      const secondHalf = sortedSessions.slice(midpoint);
      
      const firstAvg = firstHalf.reduce((sum, s) => sum + s.CheckedIn, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, s) => sum + s.CheckedIn, 0) / secondHalf.length;
      const trendPercentage = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (trendPercentage > 5) trend = 'increasing';
      else if (trendPercentage < -5) trend = 'decreasing';

      // Detect changes by grouping sessions into recurring class slots
      // A slot is defined by: Day of Week + Time + Location + Class Name
      const changes: ChangeDetection[] = [];
      
      // Helper to get day of week from date
      const getDayOfWeek = (dateStr: string): string => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(dateStr).getDay()];
      };
      
      // Helper function to parse time and calculate hour difference
      const getHourDifference = (time1: string, time2: string): number => {
        const parseTime = (timeStr: string): number => {
          const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!match) return 0;
          
          let hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const period = match[3].toUpperCase();
          
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          
          return hours + minutes / 60;
        };
        
        const hours1 = parseTime(time1);
        const hours2 = parseTime(time2);
        return Math.abs(hours2 - hours1);
      };
      
      // Group sessions by recurring slot (day/time/location)
      const slotMap = new Map<string, SessionData[]>();
      sortedSessions.forEach(session => {
        const dayOfWeek = getDayOfWeek(session.Date);
        const slotKey = `${dayOfWeek}|${session.Time}|${session.Location}`;
        if (!slotMap.has(slotKey)) {
          slotMap.set(slotKey, []);
        }
        slotMap.get(slotKey)!.push(session);
      });
      
      // For each slot, detect changes
      slotMap.forEach((slotSessions, slotKey) => {
        if (slotSessions.length < 2) return; // Need at least 2 sessions to detect change
        
        // Sort by date within slot
        const sortedSlotSessions = [...slotSessions].sort((a, b) => 
          new Date(a.Date).getTime() - new Date(b.Date).getTime()
        );
        
        // Check if this slot is active (has sessions in last 30 days)
        const lastSessionDate = new Date(sortedSlotSessions[sortedSlotSessions.length - 1].Date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const isSlotActive = lastSessionDate >= thirtyDaysAgo;
        
        // Only track changes for active slots
        if (!isSlotActive) return;
        
        const [dayOfWeek, timeSlot, location] = slotKey.split('|');
        
        for (let i = 1; i < sortedSlotSessions.length; i++) {
          const prev = sortedSlotSessions[i - 1];
          const curr = sortedSlotSessions[i];
          
          // TRAINER CHANGE: Same day/time/location/class, different trainer
          if (prev.Trainer !== curr.Trainer && 
              prev.Class === curr.Class && 
              prev.Type === curr.Type) {
            const sessionsBefore = sortedSlotSessions.slice(Math.max(0, i - 5), i);
            const sessionsAfter = sortedSlotSessions.slice(i, Math.min(i + 5, sortedSlotSessions.length));
            const beforeAvg = sessionsBefore.reduce((sum, s) => sum + s.CheckedIn, 0) / sessionsBefore.length;
            const afterAvg = sessionsAfter.reduce((sum, s) => sum + s.CheckedIn, 0) / sessionsAfter.length;
            
            changes.push({
              type: 'trainer',
              date: curr.Date,
              before: prev.Trainer,
              after: curr.Trainer,
              attendanceImpact: afterAvg - beforeAvg,
              sessionsBefore,
              sessionsAfter,
              format: curr.Class,
              location: curr.Location,
              dayOfWeek,
              timeSlot,
              isActive: true,
            });
          }
          
          // CLASS CHANGE: Same day/time/location/trainer, different class name
          if (prev.Class !== curr.Class && 
              prev.Trainer === curr.Trainer && 
              prev.Time === curr.Time) {
            const sessionsBefore = sortedSlotSessions.slice(Math.max(0, i - 5), i);
            const sessionsAfter = sortedSlotSessions.slice(i, Math.min(i + 5, sortedSlotSessions.length));
            const beforeAvg = sessionsBefore.reduce((sum, s) => sum + s.CheckedIn, 0) / sessionsBefore.length;
            const afterAvg = sessionsAfter.reduce((sum, s) => sum + s.CheckedIn, 0) / sessionsAfter.length;
            
            changes.push({
              type: 'class',
              date: curr.Date,
              before: prev.Class,
              after: curr.Class,
              attendanceImpact: afterAvg - beforeAvg,
              sessionsBefore,
              sessionsAfter,
              format: curr.Class,
              location: curr.Location,
              dayOfWeek,
              timeSlot,
              isActive: true,
            });
          }
          
          // TIME CHANGE: Same day/location/trainer/class, different time (>1 hour)
          if (prev.Time !== curr.Time && 
              prev.Trainer === curr.Trainer && 
              prev.Class === curr.Class) {
            const hourDiff = getHourDifference(prev.Time, curr.Time);
            if (hourDiff > 1) {
              const sessionsBefore = sortedSlotSessions.slice(Math.max(0, i - 5), i);
              const sessionsAfter = sortedSlotSessions.slice(i, Math.min(i + 5, sortedSlotSessions.length));
              const beforeAvg = sessionsBefore.reduce((sum, s) => sum + s.CheckedIn, 0) / sessionsBefore.length;
              const afterAvg = sessionsAfter.reduce((sum, s) => sum + s.CheckedIn, 0) / sessionsAfter.length;
              
              changes.push({
                type: 'time',
                date: curr.Date,
                before: prev.Time,
                after: curr.Time,
                attendanceImpact: afterAvg - beforeAvg,
                sessionsBefore,
                sessionsAfter,
                format: curr.Class,
                location: curr.Location,
                dayOfWeek,
                timeSlot: curr.Time,
                isActive: true,
              });
            }
          }
          
          // LEVEL/TYPE CHANGE: Same day/time/location/trainer/class, different level
          if (prev.Type !== curr.Type && 
              prev.Trainer === curr.Trainer && 
              prev.Class === curr.Class && 
              prev.Time === curr.Time) {
            const sessionsBefore = sortedSlotSessions.slice(Math.max(0, i - 5), i);
            const sessionsAfter = sortedSlotSessions.slice(i, Math.min(i + 5, sortedSlotSessions.length));
            const beforeAvg = sessionsBefore.reduce((sum, s) => sum + s.CheckedIn, 0) / sessionsBefore.length;
            const afterAvg = sessionsAfter.reduce((sum, s) => sum + s.CheckedIn, 0) / sessionsAfter.length;
            
            changes.push({
              type: 'level',
              date: curr.Date,
              before: prev.Type,
              after: curr.Type,
              attendanceImpact: afterAvg - beforeAvg,
              sessionsBefore,
              sessionsAfter,
              format: curr.Class,
              location: curr.Location,
              dayOfWeek,
              timeSlot,
              isActive: true,
            });
          }
        }
      });

      const totalCheckIns = sessions.reduce((sum, s) => sum + s.CheckedIn, 0);
      const totalCapacity = sessions.reduce((sum, s) => sum + s.Capacity, 0);
      const totalRevenue = sessions.reduce((sum, s) => sum + s.Revenue, 0);
      const totalCancellations = sessions.reduce((sum, s) => sum + s.LateCancelled, 0);
      const totalBooked = sessions.reduce((sum, s) => sum + s.Booked, 0);

      // Determine if class is active (has sessions in last 30 days)
      const lastSessionDate = new Date(sortedSessions[sortedSessions.length - 1].Date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isActive = lastSessionDate >= thirtyDaysAgo;

      // Detect pattern breaks (sudden drops/spikes in attendance)
      let hasPatternBreak = false;
      let patternBreakDetails = '';
      
      if (sortedSessions.length >= 6) {
        // Calculate moving average and standard deviation
        const attendances = sortedSessions.map(s => s.CheckedIn);
        const recentAttendances = attendances.slice(-6);
        const avg = recentAttendances.reduce((a, b) => a + b, 0) / recentAttendances.length;
        const variance = recentAttendances.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / recentAttendances.length;
        const stdDev = Math.sqrt(variance);
        
        // Check if last session is significantly different (>2 std deviations)
        const lastAttendance = recentAttendances[recentAttendances.length - 1];
        if (Math.abs(lastAttendance - avg) > 2 * stdDev && stdDev > 0) {
          hasPatternBreak = true;
          patternBreakDetails = lastAttendance < avg ? 
            `Sudden drop: ${lastAttendance} vs avg ${avg.toFixed(1)}` :
            `Sudden spike: ${lastAttendance} vs avg ${avg.toFixed(1)}`;
        }
      }

      // Calculate volatility score (coefficient of variation)
      const attendances = sortedSessions.map(s => s.CheckedIn);
      const mean = attendances.reduce((a, b) => a + b, 0) / attendances.length;
      const variance = attendances.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / attendances.length;
      const stdDev = Math.sqrt(variance);
      const volatilityScore = mean > 0 ? Math.min((stdDev / mean) * 100, 100) : 0;

      // Forecast trend based on recent trajectory
      let forecastedTrend: 'growth' | 'decline' | 'stable' = 'stable';
      if (sortedSessions.length >= 8) {
        const last4 = sortedSessions.slice(-4).reduce((sum, s) => sum + s.CheckedIn, 0) / 4;
        const prev4 = sortedSessions.slice(-8, -4).reduce((sum, s) => sum + s.CheckedIn, 0) / 4;
        const change = ((last4 - prev4) / prev4) * 100;
        if (change > 10) forecastedTrend = 'growth';
        else if (change < -10) forecastedTrend = 'decline';
      }

      metricsMap.set(format, {
        format,
        totalSessions: sessions.length,
        avgAttendance: totalCheckIns / sessions.length,
        trend,
        trendPercentage,
        totalRevenue,
        fillRate: totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0,
        cancelRate: totalBooked > 0 ? (totalCancellations / totalBooked) * 100 : 0,
        trainers: Array.from(new Set(sessions.map(s => s.Trainer))),
        locations: Array.from(new Set(sessions.map(s => s.Location))),
        changes,
        sessions: sortedSessions,
        isActive,
        hasPatternBreak,
        patternBreakDetails,
        forecastedTrend,
        volatilityScore,
      });
    });

    let metrics = Array.from(metricsMap.values());
    
    // Filter by status
    if (statusFilter === 'active') {
      metrics = metrics.filter(m => m.isActive);
    } else if (statusFilter === 'inactive') {
      metrics = metrics.filter(m => !m.isActive);
    }
    
    // Filter by pattern breaks
    if (showPatternBreaksOnly) {
      metrics = metrics.filter(m => m.hasPatternBreak || m.changes.length > 0);
    }
    
    // Sort: Pattern breaks and active with changes first, then by total sessions
    return metrics.sort((a, b) => {
      // Prioritize pattern breaks
      if (a.hasPatternBreak && !b.hasPatternBreak) return -1;
      if (!a.hasPatternBreak && b.hasPatternBreak) return 1;
      
      // Then prioritize classes with changes
      if (a.changes.length > 0 && b.changes.length === 0) return -1;
      if (a.changes.length === 0 && b.changes.length > 0) return 1;
      
      // Then by total sessions
      return b.totalSessions - a.totalSessions;
    });
  }, [formatFilteredData, allFormats, statusFilter, showPatternBreaksOnly]);

  // Get weekly trend data for selected format
  const weeklyTrendData = useMemo<WeeklyData[]>(() => {
    if (selectedFormat === 'all') return [];

    const sessions = formatFilteredData.filter((s: SessionData) => s.Class === selectedFormat);
    if (sessions.length === 0) return [];

    const dates = sessions.map((s: SessionData) => parseISO(s.Date));
    const minDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));

    const weeks = eachWeekOfInterval({ start: minDate, end: maxDate });

    return weeks.map(weekStart => {
      const weekSessions = sessions.filter((s: SessionData) => {
        const sessionDate = parseISO(s.Date);
        return isSameWeek(sessionDate, weekStart);
      });

      return {
        week: formatDate(weekStart, 'MMM d'),
        attendance: weekSessions.reduce((sum: number, s: SessionData) => sum + s.CheckedIn, 0),
        revenue: weekSessions.reduce((sum: number, s: SessionData) => sum + s.Revenue, 0),
        sessions: weekSessions.length,
      };
    });
  }, [selectedFormat, formatFilteredData]);

  // Trainer comparison data
  const trainerComparison = useMemo(() => {
    if (selectedFormat === 'all') return [];

    const sessions = formatFilteredData.filter((s: SessionData) => s.Class === selectedFormat);
    const trainerMap = new Map<string, SessionData[]>();

    sessions.forEach((session: SessionData) => {
      if (!trainerMap.has(session.Trainer)) {
        trainerMap.set(session.Trainer, []);
      }
      trainerMap.get(session.Trainer)!.push(session);
    });

    return Array.from(trainerMap.entries()).map(([trainer, trainerSessions]) => {
      const totalCheckIns = trainerSessions.reduce((sum, s) => sum + s.CheckedIn, 0);
      const totalCapacity = trainerSessions.reduce((sum, s) => sum + s.Capacity, 0);
      const totalRevenue = trainerSessions.reduce((sum, s) => sum + s.Revenue, 0);
      const totalCancellations = trainerSessions.reduce((sum, s) => sum + s.LateCancelled, 0);
      const totalBooked = trainerSessions.reduce((sum, s) => sum + s.Booked, 0);

      return {
        trainer,
        sessions: trainerSessions.length,
        avgAttendance: totalCheckIns / trainerSessions.length,
        fillRate: totalCapacity > 0 ? (totalCheckIns / totalCapacity) * 100 : 0,
        cancelRate: totalBooked > 0 ? (totalCancellations / totalBooked) * 100 : 0,
        revenue: totalRevenue,
        revenuePerSession: totalRevenue / trainerSessions.length,
        sessionsList: trainerSessions.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime()),
      };
    }).sort((a, b) => b.avgAttendance - a.avgAttendance);
  }, [selectedFormat, formatFilteredData]);

  // Filtered changes based on type and search
  const filteredChanges = useMemo(() => {
    const metrics = formatMetrics.find(f => f.format === selectedFormat);
    if (!metrics) return [];
    
    return metrics.changes.filter(change => {
      const matchesType = changeFilterType === 'all' || change.type === changeFilterType;
      const matchesSearch = changeSearchTerm === '' ||
        change.before.toLowerCase().includes(changeSearchTerm.toLowerCase()) ||
        change.after.toLowerCase().includes(changeSearchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [formatMetrics, selectedFormat, changeFilterType, changeSearchTerm]);

  // Filtered trainers based on min sessions and search
  const filteredTrainers = useMemo(() => {
    return trainerComparison.filter(trainer => {
      const matchesMinSessions = trainer.sessions >= trainerFilterMinSessions;
      const matchesSearch = trainerSearchTerm === '' ||
        trainer.trainer.toLowerCase().includes(trainerSearchTerm.toLowerCase());
      return matchesMinSessions && matchesSearch;
    });
  }, [trainerComparison, trainerFilterMinSessions, trainerSearchTerm]);

  // PDF Generation Function
  const generateFormatPDF = (format: FormatMetrics) => {
    const doc = new jsPDF();
    let yPosition = 20;

    // Page 1: Executive Summary
    doc.setFontSize(24);
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text('Format Intelligence Report', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246); // blue-600
    doc.text(format.format, 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // gray-600
    doc.text(`Generated on: ${formatDate(new Date(), 'dd MMM yyyy')}`, 20, yPosition);
    yPosition += 15;

    // Executive Summary Box
    doc.setFillColor(239, 246, 255); // blue-50
    doc.rect(15, yPosition, 180, 60, 'F');
    yPosition += 10;

    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55); // gray-800
    doc.text('Executive Summary', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81); // gray-700
    doc.text(`Total Sessions: ${formatNumber(format.totalSessions)}`, 25, yPosition);
    yPosition += 7;
    doc.text(`Average Attendance: ${formatNumber(format.avgAttendance, 1)} participants`, 25, yPosition);
    yPosition += 7;
    doc.text(`Fill Rate: ${formatPercentage(format.fillRate)}`, 25, yPosition);
    yPosition += 7;
    doc.text(`Total Revenue: ${formatCurrency(format.totalRevenue, true)}`, 25, yPosition);
    yPosition += 7;
    doc.text(`Attendance Trend: ${format.trend.toUpperCase()} (${format.trendPercentage > 0 ? '+' : ''}${formatNumber(format.trendPercentage, 1)}%)`, 25, yPosition);
    yPosition += 15;

    // Key Metrics Table
    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: [
        ['Total Sessions', formatNumber(format.totalSessions)],
        ['Avg Attendance', formatNumber(format.avgAttendance, 1)],
        ['Fill Rate', formatPercentage(format.fillRate)],
        ['Cancellation Rate', formatPercentage(format.cancelRate)],
        ['Total Revenue', formatCurrency(format.totalRevenue, true)],
        ['Unique Trainers', format.trainers.length.toString()],
        ['Unique Locations', format.locations.length.toString()],
      ],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10 },
    });

    // Page 2: Trend Analysis
    doc.addPage();
    yPosition = 20;
    
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138);
    doc.text('Trend Analysis', 20, yPosition);
    yPosition += 15;

    if (format.trend === 'increasing') {
      doc.setFillColor(220, 252, 231);
    } else if (format.trend === 'decreasing') {
      doc.setFillColor(254, 226, 226);
    } else {
      doc.setFillColor(243, 244, 246);
    }
    doc.rect(15, yPosition, 180, 30, 'F');
    yPosition += 10;

    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text(`Trend Status: ${format.trend.toUpperCase()}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Percentage Change: ${format.trendPercentage > 0 ? '+' : ''}${formatNumber(format.trendPercentage, 1)}%`, 20, yPosition);
    yPosition += 15;

    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    const trendText = format.trend === 'increasing' 
      ? 'This format shows positive growth with increasing attendance over the analyzed period.'
      : format.trend === 'decreasing'
      ? 'This format is experiencing declining attendance and may require intervention.'
      : 'This format maintains stable attendance with minimal variation.';
    doc.text(trendText, 20, yPosition, { maxWidth: 170 });
    yPosition += 20;

    // Trainers Section
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text('Teaching Staff', 20, yPosition);
    yPosition += 10;

    autoTable(doc, {
      startY: yPosition,
      head: [['Trainer', 'Location']],
      body: format.trainers.map(trainer => {
        const trainerLocations = format.sessions
          .filter(s => s.Trainer === trainer)
          .map(s => s.Location);
        const uniqueLocations = Array.from(new Set(trainerLocations));
        return [trainer, uniqueLocations.join(', ')];
      }),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });

    // Page 3: Schedule Changes & Impact
    doc.addPage();
    yPosition = 20;
    
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138);
    doc.text('Schedule Changes & Impact Analysis', 20, yPosition);
    yPosition += 15;

    if (format.changes.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(75, 85, 99);
      doc.text(`Total Changes Detected: ${format.changes.length}`, 20, yPosition);
      yPosition += 10;

      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Type', 'Before', 'After', 'Impact']],
        body: format.changes.map(change => [
          formatDate(parseISO(change.date), 'dd MMM yyyy'),
          change.type.charAt(0).toUpperCase() + change.type.slice(1),
          change.before,
          change.after,
          `${change.attendanceImpact > 0 ? '+' : ''}${formatNumber(change.attendanceImpact, 1)}`,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9 },
        columnStyles: {
          4: { 
            cellWidth: 25,
            halign: 'center',
          }
        },
        didParseCell: (data: any) => {
          if (data.column.index === 4 && data.section === 'body') {
            const impact = format.changes[data.row.index].attendanceImpact;
            if (impact > 0) {
              data.cell.styles.textColor = [21, 128, 61];
            } else if (impact < 0) {
              data.cell.styles.textColor = [220, 38, 38];
            } else {
              data.cell.styles.textColor = [75, 85, 99];
            }
          }
        },
      });
    } else {
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      doc.text('No schedule changes detected during the analyzed period.', 20, yPosition);
    }

    // Page 4: Recommendations & Insights
    doc.addPage();
    yPosition = 20;
    
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138);
    doc.text('Recommendations & Insights', 20, yPosition);
    yPosition += 15;

    // Generate recommendations based on data
    const recommendations: string[] = [];
    
    if (format.trend === 'decreasing') {
      recommendations.push('• Consider analyzing what changes preceded the decline in attendance');
      recommendations.push('• Review trainer performance and client feedback');
      recommendations.push('• Evaluate optimal class timing and location');
    } else if (format.trend === 'increasing') {
      recommendations.push('• Continue current strategies as they are working well');
      recommendations.push('• Consider adding more sessions to meet growing demand');
      recommendations.push('• Document successful practices for replication');
    }

    if (format.fillRate < 50) {
      recommendations.push('• Low fill rate indicates potential capacity or marketing issues');
      recommendations.push('• Consider reducing class capacity or increasing promotional efforts');
    } else if (format.fillRate > 90) {
      recommendations.push('• High fill rate suggests strong demand');
      recommendations.push('• Consider adding additional sessions to capture waitlist demand');
    }

    if (format.cancelRate > 20) {
      recommendations.push('• High cancellation rate requires investigation');
      recommendations.push('• Review cancellation policies and client communication');
    }

    if (format.changes.length > 5) {
      recommendations.push('• Frequent schedule changes may confuse clients');
      recommendations.push('• Establish more consistent scheduling patterns');
    }

    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text('Key Recommendations:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    recommendations.forEach(rec => {
      doc.text(rec, 20, yPosition, { maxWidth: 170 });
      yPosition += 7;
    });

    yPosition += 10;
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text('Performance Summary:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`This format has conducted ${formatNumber(format.totalSessions)} sessions with an average`, 20, yPosition);
    yPosition += 7;
    doc.text(`attendance of ${formatNumber(format.avgAttendance, 1)} participants per session. The overall fill rate of`, 20, yPosition);
    yPosition += 7;
    doc.text(`${formatPercentage(format.fillRate)} suggests ${format.fillRate > 70 ? 'strong' : format.fillRate > 50 ? 'moderate' : 'weak'} demand. Revenue generation`, 20, yPosition);
    yPosition += 7;
    doc.text(`totals ${formatCurrency(format.totalRevenue, true)} across all sessions.`, 20, yPosition);

    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      doc.text(`© ${new Date().getFullYear()} Class Intelligence Dashboard`, 20, doc.internal.pageSize.height - 10);
    }

    // Save the PDF
    doc.save(`${format.format.replace(/[^a-z0-9]/gi, '_')}_Report.pdf`);
  };

  // Change Drilldown Modal Component
  const ChangeDrilldownModal = ({ change, onClose }: { change: ChangeDetection; onClose: () => void }) => {
    useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="glass-card rounded-3xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent mb-2 capitalize">
                {change.type} Change Impact Analysis
              </h2>
              <p className="text-sm text-gray-600">
                Change occurred on {formatDate(parseISO(change.date), 'dd MMMM yyyy')}
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-semibold">
                  {change.format}
                </span>
                <span className="px-3 py-1 rounded-lg bg-purple-100 text-purple-800 text-xs font-semibold flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {change.location}
                </span>
                <span className="px-3 py-1 rounded-lg bg-green-100 text-green-800 text-xs font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {change.dayOfWeek}s at {change.timeSlot}
                </span>
                {change.isActive && (
                  <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                    ACTIVE CLASS
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-xl hover:bg-red-100 transition-colors group"
            >
              <X className="w-6 h-6 text-gray-600 group-hover:text-red-600" />
            </button>
          </div>

          {/* Change Summary */}
          <div className="glass-card rounded-2xl p-6 mb-6 bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {change.type === 'trainer' && <Users className="w-8 h-8 text-purple-600" />}
                {change.type === 'class' && <BarChart3 className="w-8 h-8 text-orange-600" />}
                {change.type === 'time' && <Clock className="w-8 h-8 text-blue-600" />}
                {change.type === 'level' && <TrendingUp className="w-8 h-8 text-green-600" />}
                <div>
                  <p className="text-sm text-gray-600 font-medium">Changed From → To</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-bold text-lg">{change.before}</span>
                    <span className="text-gray-400 text-2xl">→</span>
                    <span className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-lg">{change.after}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 font-medium mb-1">Attendance Impact</p>
                <div className={`flex items-center gap-2 justify-end ${change.attendanceImpact > 0 ? 'text-green-700' : change.attendanceImpact < 0 ? 'text-red-700' : 'text-gray-700'}`}>
                  {change.attendanceImpact > 0 ? <ArrowUpRight className="w-6 h-6" /> : change.attendanceImpact < 0 ? <ArrowDownRight className="w-6 h-6" /> : null}
                  <p className="text-3xl font-bold">
                    {change.attendanceImpact > 0 ? '+' : ''}{formatNumber(change.attendanceImpact, 1)}
                  </p>
                </div>
                <p className="text-xs text-gray-600 mt-1">avg participants</p>
              </div>
            </div>
          </div>

          {/* Before vs After Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Before */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-gray-200 text-gray-700 text-sm">BEFORE</span>
                {change.before}
              </h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Sessions</span>
                  <span className="font-bold text-gray-900">{change.sessionsBefore.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Avg Attendance</span>
                  <span className="font-bold text-gray-900">
                    {formatNumber(change.sessionsBefore.reduce((sum, s) => sum + s.CheckedIn, 0) / change.sessionsBefore.length, 1)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Total Revenue</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(change.sessionsBefore.reduce((sum, s) => sum + s.Revenue, 0), true)}
                  </span>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {change.sessionsBefore.map((session, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-gray-200 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">{formatDate(parseISO(session.Date), 'dd MMM')}</span>
                      <span className="font-bold text-green-700">{session.CheckedIn}/{session.Capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* After */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm">AFTER</span>
                {change.after}
              </h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Sessions</span>
                  <span className="font-bold text-gray-900">{change.sessionsAfter.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Avg Attendance</span>
                  <span className="font-bold text-gray-900">
                    {formatNumber(change.sessionsAfter.reduce((sum, s) => sum + s.CheckedIn, 0) / change.sessionsAfter.length, 1)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Total Revenue</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(change.sessionsAfter.reduce((sum, s) => sum + s.Revenue, 0), true)}
                  </span>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {change.sessionsAfter.map((session, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-blue-200 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">{formatDate(parseISO(session.Date), 'dd MMM')}</span>
                      <span className="font-bold text-green-700">{session.CheckedIn}/{session.Capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Data Scope Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Eye className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">About This Data</h4>
                <p className="text-sm text-blue-800">
                  This change analysis shows sessions based on your current filters. The sessions shown are from the 
                  5 sessions immediately before and after the detected change for <strong>{change.format}</strong> at{' '}
                  <strong>{change.location}</strong>. To see different changes or date ranges, adjust the main dashboard 
                  filters or Format Intelligence filters above.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Trainer Drilldown Modal Component
  const TrainerDrilldownModal = ({ trainer, onClose }: { trainer: TrainerMetric; onClose: () => void }) => {
    useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="glass-card rounded-3xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent mb-2">
                {trainer.trainer}
              </h2>
              <p className="text-sm text-gray-600">
                Detailed performance metrics and session history
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-xl hover:bg-red-100 transition-colors group"
            >
              <X className="w-6 h-6 text-gray-600 group-hover:text-red-600" />
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass-card rounded-xl p-4 border-l-4 border-blue-600">
              <p className="text-xs text-gray-600 mb-1 uppercase font-semibold">Sessions</p>
              <p className="text-2xl font-bold text-blue-700">{formatNumber(trainer.sessions)}</p>
            </div>
            <div className="glass-card rounded-xl p-4 border-l-4 border-green-600">
              <p className="text-xs text-gray-600 mb-1 uppercase font-semibold">Avg Attendance</p>
              <p className="text-2xl font-bold text-green-700">{formatNumber(trainer.avgAttendance, 1)}</p>
            </div>
            <div className="glass-card rounded-xl p-4 border-l-4 border-purple-600">
              <p className="text-xs text-gray-600 mb-1 uppercase font-semibold">Fill Rate</p>
              <p className="text-2xl font-bold text-purple-700">{formatPercentage(trainer.fillRate)}</p>
            </div>
            <div className="glass-card rounded-xl p-4 border-l-4 border-emerald-600">
              <p className="text-xs text-gray-600 mb-1 uppercase font-semibold">Total Revenue</p>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(trainer.revenue, true)}</p>
            </div>
          </div>

          {/* Session History */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Session History</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {trainer.sessionsList.map((session, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.01 }}
                  className="p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-bold">
                          {formatDate(parseISO(session.Date), 'dd MMM yyyy')}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold">
                          {session.Day}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-xs font-semibold">
                          {session.Time}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{session.Location}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-green-700">{session.CheckedIn}/{session.Capacity}</p>
                      <p className="text-xs text-gray-600">{formatPercentage((session.CheckedIn / session.Capacity) * 100)} full</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-600">Revenue</p>
                      <p className="font-bold text-sm text-emerald-700">{formatCurrency(session.Revenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Booked</p>
                      <p className="font-bold text-sm text-blue-700">{session.Booked}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Cancelled</p>
                      <p className="font-bold text-sm text-red-700">{session.LateCancelled}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 border-l-4 border-blue-600"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 font-semibold uppercase">Total Formats</p>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatMetrics.length}</p>
          <p className="text-xs text-gray-500 mt-1">Unique class formats</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6 border-l-4 border-green-600"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 font-semibold uppercase">Increasing</p>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-700">
            {formatMetrics.filter(f => f.trend === 'increasing').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Growing attendance</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6 border-l-4 border-red-600"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 font-semibold uppercase">Decreasing</p>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-700">
            {formatMetrics.filter(f => f.trend === 'decreasing').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Declining attendance</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6 border-l-4 border-gray-600"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 font-semibold uppercase">Changes Detected</p>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatMetrics.reduce((sum, f) => sum + f.changes.length, 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Schedule modifications</p>
        </motion.div>
      </div>

      {/* Top/Bottom Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-bold text-gray-900">Top Performing Formats</h3>
          </div>
          <div className="space-y-3">
            {formatMetrics.slice(0, 5).map((format, idx) => (
              <div key={format.format} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{format.format}</p>
                    <p className="text-xs text-gray-600">{format.totalSessions} sessions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-700">{formatNumber(format.avgAttendance, 1)}</p>
                  <p className="text-xs text-gray-600">avg attendance</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-6 h-6 text-red-600" />
            <h3 className="text-xl font-bold text-gray-900">Formats Needing Attention</h3>
          </div>
          <div className="space-y-3">
            {formatMetrics.filter(f => f.trend === 'decreasing').slice(0, 5).map((format) => (
              <div key={format.format} className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-bold text-gray-900">{format.format}</p>
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <ArrowDownRight className="w-3 h-3" />
                      {formatPercentage(Math.abs(format.trendPercentage))} decline
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-700">{formatNumber(format.avgAttendance, 1)}</p>
                  <p className="text-xs text-gray-600">avg attendance</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderFormatsTab = () => (
    <div className="space-y-6">
      {/* Format Selector */}
      <div className="glass-card rounded-2xl p-6">
        <label className="block text-sm font-bold text-gray-800 mb-3 uppercase">Select Format to Analyze</label>
        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white text-lg font-medium"
        >
          <option value="all">-- Select a Format --</option>
          {allFormats.map(format => (
            <option key={format} value={format}>{format}</option>
          ))}
        </select>
      </div>

      {selectedFormat !== 'all' && (() => {
        const metrics = formatMetrics.find(f => f.format === selectedFormat);
        if (!metrics) return null;

        return (
          <>
            {/* Format Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card rounded-2xl p-6 border-l-4 border-blue-600">
                <p className="text-sm text-gray-600 font-semibold uppercase mb-2">Total Sessions</p>
                <p className="text-3xl font-bold text-blue-700">{formatNumber(metrics.totalSessions)}</p>
              </div>
              <div className="glass-card rounded-2xl p-6 border-l-4 border-green-600">
                <p className="text-sm text-gray-600 font-semibold uppercase mb-2">Avg Attendance</p>
                <p className="text-3xl font-bold text-green-700">{formatNumber(metrics.avgAttendance, 1)}</p>
              </div>
              <div className="glass-card rounded-2xl p-6 border-l-4 border-emerald-600">
                <p className="text-sm text-gray-600 font-semibold uppercase mb-2">Total Revenue</p>
                <p className="text-3xl font-bold text-emerald-700">{formatCurrency(metrics.totalRevenue, true)}</p>
              </div>
            </div>

            {/* Trend */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <LineChart className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Attendance Trend</h3>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 ${
                  metrics.trend === 'increasing' ? 'bg-green-100 text-green-700' :
                  metrics.trend === 'decreasing' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {metrics.trend === 'increasing' ? <TrendingUp className="w-5 h-5" /> :
                   metrics.trend === 'decreasing' ? <TrendingDown className="w-5 h-5" /> :
                   <div className="w-5 h-0.5 bg-gray-600" />}
                  {metrics.trend.toUpperCase()}
                </div>
                <p className="text-lg text-gray-700">
                  <span className={`font-bold ${metrics.trendPercentage > 0 ? 'text-green-700' : metrics.trendPercentage < 0 ? 'text-red-700' : 'text-gray-700'}`}>
                    {metrics.trendPercentage > 0 ? '+' : ''}{formatNumber(metrics.trendPercentage, 1)}%
                  </span>
                  {' '}change in attendance
                </p>
              </div>

              {weeklyTrendData.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={weeklyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '12px',
                      }}
                    />
                    <Area type="monotone" dataKey="attendance" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Changes Detected */}
            {metrics.changes.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                  <h3 className="text-xl font-bold text-gray-900">Schedule Changes & Impact</h3>
                  <span className="ml-auto px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold">
                    {filteredChanges.length} of {metrics.changes.length} changes
                  </span>
                </div>

                {/* Filter Controls */}
                <div className="mb-4 space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={changeSearchTerm}
                      onChange={(e) => setChangeSearchTerm(e.target.value)}
                      placeholder="Search by before/after value..."
                      className="w-full px-4 py-3 pl-10 rounded-xl border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <select
                      value={changeFilterType}
                      onChange={(e) => setChangeFilterType(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all bg-white"
                    >
                      <option value="all">All Change Types</option>
                      <option value="trainer">Trainer Changes</option>
                      <option value="class">Class Changes</option>
                      <option value="time">Time Changes (over 1 hour)</option>
                      <option value="level">Level/Type Changes</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredChanges.map((change, idx) => (
                    <div 
                      key={idx} 
                      className="p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => setDrilldownChange(change)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {change.type === 'trainer' && <Users className="w-5 h-5 text-purple-600" />}
                          {change.type === 'class' && <BarChart3 className="w-5 h-5 text-orange-600" />}
                          {change.type === 'time' && <Clock className="w-5 h-5 text-blue-600" />}
                          {change.type === 'level' && <TrendingUp className="w-5 h-5 text-green-600" />}
                          <p className="font-bold text-gray-900 capitalize">{change.type} Change</p>
                        </div>
                        <p className="text-sm text-gray-600">{formatDate(parseISO(change.date), 'dd MMM yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">{change.before}</span>
                        <span className="text-gray-400">→</span>
                        <span className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium">{change.after}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${change.attendanceImpact > 0 ? 'text-green-700' : change.attendanceImpact < 0 ? 'text-red-700' : 'text-gray-700'}`}>
                        {change.attendanceImpact > 0 ? <ArrowUpRight className="w-4 h-4" /> : change.attendanceImpact < 0 ? <ArrowDownRight className="w-4 h-4" /> : null}
                        <p className="text-sm font-bold">
                          {change.attendanceImpact > 0 ? '+' : ''}{formatNumber(change.attendanceImpact, 1)} avg attendance impact
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Click for detailed analysis
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );

  const renderTrainersTab = () => (
    <div className="space-y-6">
      {/* Format Selector */}
      <div className="glass-card rounded-2xl p-6">
        <label className="block text-sm font-bold text-gray-800 mb-3 uppercase">Select Format to Compare Trainers</label>
        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white text-lg font-medium"
        >
          <option value="all">-- Select a Format --</option>
          {allFormats.map(format => (
            <option key={format} value={format}>{format}</option>
          ))}
        </select>
      </div>

      {selectedFormat !== 'all' && trainerComparison.length > 0 && (
        <>
          {/* Comparison Chart */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">Trainer Performance Comparison</h3>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={trainerComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="trainer" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '12px',
                  }}
                />
                <Legend />
                <Bar dataKey="avgAttendance" fill="#3b82f6" name="Avg Attendance" radius={[8, 8, 0, 0]} />
                <Bar dataKey="fillRate" fill="#10b981" name="Fill Rate %" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Comparison Table */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Detailed Metrics</h3>
              <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold">
                {filteredTrainers.length} of {trainerComparison.length} trainers
              </span>
            </div>

            {/* Filter Controls */}
            <div className="mb-4 space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={trainerSearchTerm}
                  onChange={(e) => setTrainerSearchTerm(e.target.value)}
                  placeholder="Search by trainer name..."
                  className="w-full px-4 py-3 pl-10 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-gray-600" />
                <label className="text-sm font-medium text-gray-700">Minimum Sessions:</label>
                <input
                  type="number"
                  value={trainerFilterMinSessions}
                  onChange={(e) => setTrainerFilterMinSessions(Number(e.target.value))}
                  min="0"
                  className="px-4 py-2 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all w-24"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 uppercase">Trainer</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700 uppercase">Sessions</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700 uppercase">Avg Attendance</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700 uppercase">Fill Rate</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700 uppercase">Cancel Rate</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700 uppercase">Total Revenue</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700 uppercase">Rev/Session</th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainers.map((trainer) => (
                    <tr key={trainer.trainer} className="border-b border-gray-200 hover:bg-purple-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">{trainer.trainer}</td>
                      <td className="py-3 px-4 text-center text-gray-700">{formatNumber(trainer.sessions)}</td>
                      <td className="py-3 px-4 text-center font-bold text-green-700">{formatNumber(trainer.avgAttendance, 1)}</td>
                      <td className="py-3 px-4 text-center font-bold text-blue-700">{formatPercentage(trainer.fillRate)}</td>
                      <td className="py-3 px-4 text-center font-bold text-red-700">{formatPercentage(trainer.cancelRate)}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">{formatCurrency(trainer.revenue, true)}</td>
                      <td className="py-3 px-4 text-center font-bold text-purple-700">{formatCurrency(trainer.revenuePerSession, true)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setDrilldownTrainer(trainer)}
                          className="px-3 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold hover:bg-purple-200 transition-colors flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3 h-3" /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderReportsTab = () => (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <Download className="w-16 h-16 text-blue-600" />
          <h3 className="text-2xl font-bold text-gray-900">Generate Custom Reports</h3>
          <p className="text-gray-600 max-w-2xl">
            Create comprehensive format-specific reports with detailed analytics, trends, trainer comparisons, and actionable insights.
          </p>
          <button className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl">
            Generate Report
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {formatMetrics.slice(0, 10).map(format => (
          <div key={format.format} className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-900">{format.format}</h4>
              <button 
                onClick={() => generateFormatPDF(format)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <FileText className="w-4 h-4" />
                Download PDF
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(format.totalSessions)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Avg Attendance</p>
                <p className="text-2xl font-bold text-green-700">{formatNumber(format.avgAttendance, 1)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Fill Rate</p>
                <p className="text-2xl font-bold text-blue-700">{formatPercentage(format.fillRate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Revenue</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(format.totalRevenue, true)}</p>
              </div>
            </div>
            
            {/* Report Preview Info */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-2 font-medium">Report includes:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-blue-600"></div>
                  Executive summary & key metrics
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-blue-600"></div>
                  Trend analysis & performance insights
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-blue-600"></div>
                  Schedule changes impact analysis
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-blue-600"></div>
                  Recommendations & action items
                </li>
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
            Format Intelligence
          </h1>
          <p className="text-gray-600 mt-2">Deep dive into class formats with advanced analytics and change detection</p>
        </div>
        <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export All Data
        </button>
      </div>

      {/* Format Intelligence Filters */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl gradient-blue">
            <Filter className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Format Intelligence Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Location Filter */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Locations
            </label>
            <select
              multiple
              value={selectedLocations}
              onChange={(e) =>
                setSelectedLocations(Array.from(e.target.selectedOptions, (option) => option.value))
              }
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all min-h-[100px]"
            >
              {allLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            {selectedLocations.length > 0 && (
              <button
                onClick={() => setSelectedLocations([])}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear ({selectedLocations.length})
              </button>
            )}
          </div>

          {/* Trainer Filter */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Users className="w-4 h-4 text-blue-600" />
              Trainers
            </label>
            <select
              multiple
              value={selectedTrainers}
              onChange={(e) =>
                setSelectedTrainers(Array.from(e.target.selectedOptions, (option) => option.value))
              }
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all min-h-[100px]"
            >
              {allTrainers.map((trainer) => (
                <option key={trainer} value={trainer}>
                  {trainer}
                </option>
              ))}
            </select>
            {selectedTrainers.length > 0 && (
              <button
                onClick={() => setSelectedTrainers([])}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear ({selectedTrainers.length})
              </button>
            )}
          </div>

          {/* Class Type Filter */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Class Types
            </label>
            <select
              multiple
              value={selectedClassTypes}
              onChange={(e) =>
                setSelectedClassTypes(Array.from(e.target.selectedOptions, (option) => option.value))
              }
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all min-h-[100px]"
            >
              {allClassTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {selectedClassTypes.length > 0 && (
              <button
                onClick={() => setSelectedClassTypes([])}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear ({selectedClassTypes.length})
              </button>
            )}
          </div>

          {/* Status & Pattern Filters */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Status & Patterns
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all mb-2"
            >
              <option value="all">All Classes</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <label className="flex items-center gap-2 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200 cursor-pointer hover:shadow-md transition-all">
              <input
                type="checkbox"
                checked={showPatternBreaksOnly}
                onChange={(e) => setShowPatternBreaksOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-gray-800">Show Pattern Breaks & Changes Only</span>
            </label>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

          {/* Date From */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              From Date
            </label>
            <input
              type="date"
              value={dateFrom ? formatDate(dateFrom, 'yyyy-MM-dd') : ''}
              onChange={(e) => setDateFrom(e.target.value ? new Date(e.target.value) : null)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            {dateFrom && (
              <button
                onClick={() => setDateFrom(null)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear
              </button>
            )}
          </div>

          {/* Date To */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              To Date
            </label>
            <input
              type="date"
              value={dateTo ? formatDate(dateTo, 'yyyy-MM-dd') : ''}
              onChange={(e) => setDateTo(e.target.value ? new Date(e.target.value) : null)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            {dateTo && (
              <button
                onClick={() => setDateTo(null)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        
        {/* Data Summary - Always Visible */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Analyzing{' '}
                <span className="font-semibold text-blue-700">
                  {formatFilteredData.length.toLocaleString()}
                </span>{' '}
                sessions from{' '}
                <span className="font-semibold text-gray-800">
                  {rawData.length.toLocaleString()}
                </span>{' '}
                total
              </p>
              {formatFilteredData.length > 0 && (() => {
                const dates = formatFilteredData.map((s: SessionData) => new Date(s.Date).getTime());
                const minDate = new Date(Math.min(...dates));
                const maxDate = new Date(Math.max(...dates));
                return (
                  <p className="text-xs text-gray-500">
                    Date range: {formatDate(minDate, 'dd MMM yyyy')} - {formatDate(maxDate, 'dd MMM yyyy')}
                  </p>
                );
              })()}
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {(selectedLocations.length > 0 || selectedTrainers.length > 0 || selectedClassTypes.length > 0 || dateFrom || dateTo) && (
                  <p className="text-xs font-semibold text-blue-600">
                    Active Filters: 
                    {selectedLocations.length > 0 && <span className="ml-1 px-2 py-0.5 bg-blue-100 rounded">{selectedLocations.length} locations</span>}
                    {selectedTrainers.length > 0 && <span className="ml-1 px-2 py-0.5 bg-purple-100 rounded">{selectedTrainers.length} trainers</span>}
                    {selectedClassTypes.length > 0 && <span className="ml-1 px-2 py-0.5 bg-green-100 rounded">{selectedClassTypes.length} types</span>}
                    {(dateFrom || dateTo) && <span className="ml-1 px-2 py-0.5 bg-orange-100 rounded">date range</span>}
                  </p>
                )}
                {statusFilter === 'active' && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded font-medium">Active Classes Only</span>}
                {statusFilter === 'inactive' && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-medium">Inactive Classes Only</span>}
                {showPatternBreaksOnly && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded font-medium">Pattern Breaks Only</span>}
              </div>
            </div>
            {(selectedLocations.length > 0 || selectedTrainers.length > 0 || selectedClassTypes.length > 0 || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSelectedLocations([]);
                  setSelectedTrainers([]);
                  setSelectedClassTypes([]);
                  setDateFrom(null);
                  setDateTo(null);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="glass-card rounded-2xl p-2 inline-flex gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Overview
          </div>
        </button>
        <button
          onClick={() => setActiveTab('formats')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'formats'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5" />
            Format Analysis
          </div>
        </button>
        <button
          onClick={() => setActiveTab('trainers')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'trainers'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Trainer Comparison
          </div>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'reports'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Reports
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'formats' && renderFormatsTab()}
          {activeTab === 'trainers' && renderTrainersTab()}
          {activeTab === 'reports' && renderReportsTab()}
        </motion.div>
      </AnimatePresence>

      {/* Drilldown Modals */}
      <AnimatePresence>
        {drilldownChange && (
          <ChangeDrilldownModal 
            change={drilldownChange} 
            onClose={() => setDrilldownChange(null)} 
          />
        )}
        {drilldownTrainer && (
          <TrainerDrilldownModal 
            trainer={drilldownTrainer} 
            onClose={() => setDrilldownTrainer(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
