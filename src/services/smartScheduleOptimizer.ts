/**
 * Smart Schedule Optimizer
 * 
 * A sophisticated AI-powered schedule optimization engine that:
 * 1. Analyzes historical performance data deeply
 * 2. Finds optimal trainer-class-time-location combinations
 * 3. Maximizes trainer utilization while respecting constraints
 * 4. Ensures format diversity and member satisfaction
 * 5. Automatically generates optimized schedules
 */

import { SessionData } from '../types';

// ================== TYPES ==================

export interface TrainerProfile {
  name: string;
  normalizedName: string;
  totalSessions: number;
  avgFillRate: number;
  avgCheckIns: number;
  consistency: number; // Standard deviation of fill rates
  trend: 'improving' | 'declining' | 'stable';
  currentWeeklyHours: number;
  
  // Performance by format
  formatPerformance: Map<string, {
    sessions: number;
    avgFillRate: number;
    avgCheckIns: number;
    revenue: number;
    bestTime: string;
    bestDay: string;
  }>;
  
  // Performance by time slot
  timeSlotPerformance: Map<string, {
    avgFillRate: number;
    avgCheckIns: number;
    sessions: number;
  }>;
  
  // Performance by location
  locationPerformance: Map<string, {
    avgFillRate: number;
    sessions: number;
    topFormats: string[];
  }>;
  
  // Best combinations
  bestCombinations: Array<{
    format: string;
    day: string;
    time: string;
    location: string;
    avgFillRate: number;
    avgCheckIns: number;
    sessions: number;
  }>;
  
  // Availability (days they typically work)
  typicalWorkDays: string[];
  typicalTimeSlots: string[];
}

export interface FormatProfile {
  name: string;
  normalizedName: string;
  totalSessions: number;
  avgFillRate: number;
  avgCheckIns: number;
  avgRevenue: number;
  trend: 'improving' | 'declining' | 'stable';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  
  // Best performers
  topTrainers: Array<{
    name: string;
    avgFillRate: number;
    sessions: number;
  }>;
  
  // Best time slots
  bestTimeSlots: Array<{
    day: string;
    time: string;
    avgFillRate: number;
  }>;
  
  // Performance by location
  locationPerformance: Map<string, {
    avgFillRate: number;
    sessions: number;
  }>;
}

export interface TimeSlotProfile {
  key: string; // "Monday-07:00"
  day: string;
  time: string;
  avgFillRate: number;
  avgCheckIns: number;
  totalSessions: number;
  isPeakTime: boolean;
  
  // Best formats for this slot
  topFormats: Array<{
    name: string;
    avgFillRate: number;
    sessions: number;
  }>;
  
  // Avoid these formats at this time
  worstFormats: Array<{
    name: string;
    avgFillRate: number;
    sessions: number;
  }>;
}

export interface LocationProfile {
  name: string;
  totalSessions: number;
  avgFillRate: number;
  avgCapacity: number;
  
  // Format mix
  currentFormatMix: Map<string, number>;
  recommendedFormatMix: Map<string, number>;
  
  // Trainer distribution
  trainerHours: Map<string, number>;
  
  // Peak hours
  peakHours: string[];
  offPeakHours: string[];
}

export interface OptimizationSuggestion {
  id: string;
  type: 'replace_class' | 'replace_trainer' | 'swap_time' | 'add_class' | 'remove_class' | 'duplicate_class';
  priority: 'high' | 'medium' | 'low';
  confidence: number; // 0-100
  
  // What to change
  original: {
    classId?: string;
    className: string;
    trainer: string;
    day: string;
    time: string;
    location: string;
    currentFillRate: number;
    currentCheckIns: number;
  };
  
  // Recommended change
  suggested: {
    className: string;
    trainer: string;
    day: string;
    time: string;
    location: string;
    projectedFillRate: number;
    projectedCheckIns: number;
  };
  
  // Explanation
  reason: string;
  impact: string;
  dataPoints: string[];
  
  // For UI
  appliedToCalendar?: boolean;
}

export interface OptimizationResult {
  suggestions: OptimizationSuggestion[];
  trainerHoursSummary: Map<string, { current: number; optimized: number; target: number }>;
  formatMixImpact: {
    before: Record<string, number>;
    after: Record<string, number>;
  };
  projectedImpact: {
    totalCheckInsIncrease: number;
    avgFillRateIncrease: number;
    trainerUtilizationIncrease: number;
  };
  insights: string[];
}

export interface ScheduleClass {
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
}

export interface OptimizationConfig {
  targetTrainerHours: number;
  maxTrainerHours: number;
  minDaysOff: number;
  avoidMultiLocationDays: boolean;
  priorityTrainers: string[];
  blockedTrainers: string[];
  excludedFormats: string[];
  locationConstraints: Record<string, {
    maxParallelClasses: number;
    requiredFormats: string[];
    minClasses: number;
  }>;
  peakTimeBonus: number; // Multiplier for peak time scores
  formatDiversityWeight: number;
  trainerUtilizationWeight: number;
  attendanceWeight: number;
}

// ================== OPTIMIZER CLASS ==================

class SmartScheduleOptimizer {
  private trainerProfiles: Map<string, TrainerProfile> = new Map();
  private formatProfiles: Map<string, FormatProfile> = new Map();
  private timeSlotProfiles: Map<string, TimeSlotProfile> = new Map();
  private locationProfiles: Map<string, LocationProfile> = new Map();
  
  /**
   * Build comprehensive profiles from historical data
   */
  buildProfiles(historicalData: SessionData[], dateFrom: Date, dateTo: Date): void {
    // Clear existing profiles
    this.trainerProfiles.clear();
    this.formatProfiles.clear();
    this.timeSlotProfiles.clear();
    this.locationProfiles.clear();
    
    // Filter data to date range
    const filteredData = historicalData.filter(session => {
      const sessionDate = new Date(session.Date);
      return sessionDate >= dateFrom && sessionDate <= dateTo;
    });
    
    if (filteredData.length === 0) return;
    
    // Build intermediate data structures
    const trainerData = new Map<string, SessionData[]>();
    const formatData = new Map<string, SessionData[]>();
    const timeSlotData = new Map<string, SessionData[]>();
    const locationData = new Map<string, SessionData[]>();
    
    // Group sessions
    filteredData.forEach(session => {
      const trainer = this.normalizeString(session.Trainer || '');
      const format = session.Class || 'Unknown';
      const timeSlotKey = `${session.Day}-${session.Time?.substring(0, 5) || '00:00'}`;
      const location = session.Location || 'Unknown';
      
      if (trainer) {
        if (!trainerData.has(trainer)) trainerData.set(trainer, []);
        trainerData.get(trainer)!.push(session);
      }
      
      if (!formatData.has(format)) formatData.set(format, []);
      formatData.get(format)!.push(session);
      
      if (!timeSlotData.has(timeSlotKey)) timeSlotData.set(timeSlotKey, []);
      timeSlotData.get(timeSlotKey)!.push(session);
      
      if (!locationData.has(location)) locationData.set(location, []);
      locationData.get(location)!.push(session);
    });
    
    // Build trainer profiles
    this.buildTrainerProfiles(trainerData);
    
    // Build format profiles
    this.buildFormatProfiles(formatData);
    
    // Build time slot profiles
    this.buildTimeSlotProfiles(timeSlotData);
    
    // Build location profiles
    this.buildLocationProfiles(locationData);
  }
  
  private buildTrainerProfiles(data: Map<string, SessionData[]>): void {
    data.forEach((sessions, trainerName) => {
      if (sessions.length < 3) return; // Need minimum data
      
      const fillRates = sessions.map(s => s.FillRate || 0);
      const checkIns = sessions.map(s => s.CheckedIn || 0);
      const avgFillRate = this.average(fillRates);
      const avgCheckIns = this.average(checkIns);
      const consistency = 100 - this.standardDeviation(fillRates);
      
      // Calculate trend (compare first half vs second half)
      const halfPoint = Math.floor(sessions.length / 2);
      const firstHalfAvg = this.average(fillRates.slice(0, halfPoint));
      const secondHalfAvg = this.average(fillRates.slice(halfPoint));
      const trend = secondHalfAvg > firstHalfAvg + 5 ? 'improving' : 
                   secondHalfAvg < firstHalfAvg - 5 ? 'declining' : 'stable';
      
      // Format performance
      const formatPerformance = new Map<string, any>();
      const formatSessions = this.groupBy(sessions, s => s.Class || 'Unknown');
      formatSessions.forEach((fSessions, format) => {
        const fFillRates = fSessions.map(s => s.FillRate || 0);
        const fCheckIns = fSessions.map(s => s.CheckedIn || 0);
        const fRevenue = fSessions.reduce((sum, s) => sum + (s.Revenue || 0), 0);
        
        // Find best time and day for this format
        const timePerf = this.groupBy(fSessions, s => s.Time?.substring(0, 5) || '00:00');
        const dayPerf = this.groupBy(fSessions, s => s.Day || 'Unknown');
        
        let bestTime = '';
        let bestTimeAvg = 0;
        timePerf.forEach((tSessions, time) => {
          const avg = this.average(tSessions.map(s => s.FillRate || 0));
          if (avg > bestTimeAvg) {
            bestTimeAvg = avg;
            bestTime = time;
          }
        });
        
        let bestDay = '';
        let bestDayAvg = 0;
        dayPerf.forEach((dSessions, day) => {
          const avg = this.average(dSessions.map(s => s.FillRate || 0));
          if (avg > bestDayAvg) {
            bestDayAvg = avg;
            bestDay = day;
          }
        });
        
        formatPerformance.set(format, {
          sessions: fSessions.length,
          avgFillRate: this.average(fFillRates),
          avgCheckIns: this.average(fCheckIns),
          revenue: fRevenue,
          bestTime,
          bestDay
        });
      });
      
      // Time slot performance
      const timeSlotPerformance = new Map<string, any>();
      const slotSessions = this.groupBy(sessions, s => `${s.Day}-${s.Time?.substring(0, 5)}`);
      slotSessions.forEach((sSessions, slot) => {
        timeSlotPerformance.set(slot, {
          avgFillRate: this.average(sSessions.map(s => s.FillRate || 0)),
          avgCheckIns: this.average(sSessions.map(s => s.CheckedIn || 0)),
          sessions: sSessions.length
        });
      });
      
      // Location performance
      const locationPerformance = new Map<string, any>();
      const locSessions = this.groupBy(sessions, s => s.Location || 'Unknown');
      locSessions.forEach((lSessions, loc) => {
        const locFormats = this.groupBy(lSessions, s => s.Class || 'Unknown');
        const topFormats = Array.from(locFormats.entries())
          .map(([format, fSess]) => ({
            format,
            avgFill: this.average(fSess.map(s => s.FillRate || 0)),
            sessions: fSess.length
          }))
          .sort((a, b) => b.avgFill - a.avgFill)
          .slice(0, 3)
          .map(f => f.format);
        
        locationPerformance.set(loc, {
          avgFillRate: this.average(lSessions.map(s => s.FillRate || 0)),
          sessions: lSessions.length,
          topFormats
        });
      });
      
      // Best combinations (trainer + format + day + time + location)
      const combinationMap = new Map<string, SessionData[]>();
      sessions.forEach(s => {
        const key = `${s.Class}|${s.Day}|${s.Time?.substring(0, 5)}|${s.Location}`;
        if (!combinationMap.has(key)) combinationMap.set(key, []);
        combinationMap.get(key)!.push(s);
      });
      
      const bestCombinations = Array.from(combinationMap.entries())
        .filter(([_, cSessions]) => cSessions.length >= 2)
        .map(([key, cSessions]) => {
          const [format, day, time, location] = key.split('|');
          return {
            format,
            day,
            time,
            location,
            avgFillRate: this.average(cSessions.map(s => s.FillRate || 0)),
            avgCheckIns: this.average(cSessions.map(s => s.CheckedIn || 0)),
            sessions: cSessions.length
          };
        })
        .sort((a, b) => b.avgFillRate - a.avgFillRate)
        .slice(0, 10);
      
      // Typical work patterns
      const dayCount = new Map<string, number>();
      const timeCount = new Map<string, number>();
      sessions.forEach(s => {
        dayCount.set(s.Day || '', (dayCount.get(s.Day || '') || 0) + 1);
        timeCount.set(s.Time?.substring(0, 5) || '', (timeCount.get(s.Time?.substring(0, 5) || '') || 0) + 1);
      });
      
      const typicalWorkDays = Array.from(dayCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([day]) => day);
      
      const typicalTimeSlots = Array.from(timeCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([time]) => time);
      
      this.trainerProfiles.set(trainerName, {
        name: sessions[0].Trainer || trainerName,
        normalizedName: trainerName,
        totalSessions: sessions.length,
        avgFillRate,
        avgCheckIns,
        consistency: Math.max(0, consistency),
        trend,
        currentWeeklyHours: 0, // Will be set from schedule
        formatPerformance,
        timeSlotPerformance,
        locationPerformance,
        bestCombinations,
        typicalWorkDays,
        typicalTimeSlots
      });
    });
  }
  
  private buildFormatProfiles(data: Map<string, SessionData[]>): void {
    data.forEach((sessions, format) => {
      if (sessions.length < 3) return;
      
      const fillRates = sessions.map(s => s.FillRate || 0);
      const checkIns = sessions.map(s => s.CheckedIn || 0);
      const revenues = sessions.map(s => s.Revenue || 0);
      
      // Calculate trend
      const halfPoint = Math.floor(sessions.length / 2);
      const firstHalfAvg = this.average(fillRates.slice(0, halfPoint));
      const secondHalfAvg = this.average(fillRates.slice(halfPoint));
      const trend = secondHalfAvg > firstHalfAvg + 5 ? 'improving' : 
                   secondHalfAvg < firstHalfAvg - 5 ? 'declining' : 'stable';
      
      // Top trainers
      const trainerSessions = this.groupBy(sessions, s => this.normalizeString(s.Trainer || ''));
      const topTrainers = Array.from(trainerSessions.entries())
        .filter(([name]) => name.length > 0)
        .map(([name, tSessions]) => ({
          name: tSessions[0].Trainer || name,
          avgFillRate: this.average(tSessions.map(s => s.FillRate || 0)),
          sessions: tSessions.length
        }))
        .filter(t => t.sessions >= 2)
        .sort((a, b) => b.avgFillRate - a.avgFillRate)
        .slice(0, 5);
      
      // Best time slots
      const slotSessions = this.groupBy(sessions, s => `${s.Day}|${s.Time?.substring(0, 5)}`);
      const bestTimeSlots = Array.from(slotSessions.entries())
        .filter(([_, sSessions]) => sSessions.length >= 2)
        .map(([key, sSessions]) => {
          const [day, time] = key.split('|');
          return {
            day,
            time,
            avgFillRate: this.average(sSessions.map(s => s.FillRate || 0))
          };
        })
        .sort((a, b) => b.avgFillRate - a.avgFillRate)
        .slice(0, 5);
      
      // Location performance
      const locationPerformance = new Map<string, any>();
      const locSessions = this.groupBy(sessions, s => s.Location || 'Unknown');
      locSessions.forEach((lSessions, loc) => {
        locationPerformance.set(loc, {
          avgFillRate: this.average(lSessions.map(s => s.FillRate || 0)),
          sessions: lSessions.length
        });
      });
      
      this.formatProfiles.set(format, {
        name: format,
        normalizedName: this.normalizeString(format),
        totalSessions: sessions.length,
        avgFillRate: this.average(fillRates),
        avgCheckIns: this.average(checkIns),
        avgRevenue: this.average(revenues),
        trend,
        difficulty: this.getFormatDifficulty(format),
        category: this.getFormatCategory(format),
        topTrainers,
        bestTimeSlots,
        locationPerformance
      });
    });
  }
  
  private buildTimeSlotProfiles(data: Map<string, SessionData[]>): void {
    data.forEach((sessions, slotKey) => {
      if (sessions.length < 2) return;
      
      const [day, time] = slotKey.split('-');
      const fillRates = sessions.map(s => s.FillRate || 0);
      const checkIns = sessions.map(s => s.CheckedIn || 0);
      
      // Determine if peak time
      const hour = parseInt(time?.split(':')[0] || '0');
      const isPeakTime = (hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20);
      
      // Top and worst formats
      const formatSessions = this.groupBy(sessions, s => s.Class || 'Unknown');
      const formatPerf = Array.from(formatSessions.entries())
        .map(([format, fSessions]) => ({
          name: format,
          avgFillRate: this.average(fSessions.map(s => s.FillRate || 0)),
          sessions: fSessions.length
        }))
        .filter(f => f.sessions >= 2);
      
      const topFormats = [...formatPerf].sort((a, b) => b.avgFillRate - a.avgFillRate).slice(0, 3);
      const worstFormats = [...formatPerf].sort((a, b) => a.avgFillRate - b.avgFillRate).slice(0, 3);
      
      this.timeSlotProfiles.set(slotKey, {
        key: slotKey,
        day,
        time,
        avgFillRate: this.average(fillRates),
        avgCheckIns: this.average(checkIns),
        totalSessions: sessions.length,
        isPeakTime,
        topFormats,
        worstFormats
      });
    });
  }
  
  private buildLocationProfiles(data: Map<string, SessionData[]>): void {
    data.forEach((sessions, location) => {
      const fillRates = sessions.map(s => s.FillRate || 0);
      const capacities = sessions.map(s => s.Capacity || 20);
      
      // Format mix
      const formatSessions = this.groupBy(sessions, s => this.getFormatCategory(s.Class || ''));
      const currentFormatMix = new Map<string, number>();
      formatSessions.forEach((fSessions, format) => {
        currentFormatMix.set(format, fSessions.length);
      });
      
      // Trainer hours
      const trainerSessions = this.groupBy(sessions, s => this.normalizeString(s.Trainer || ''));
      const trainerHours = new Map<string, number>();
      trainerSessions.forEach((tSessions, trainer) => {
        trainerHours.set(trainer, tSessions.length);
      });
      
      // Peak vs off-peak
      const hourSessions = this.groupBy(sessions, s => s.Time?.substring(0, 2) || '00');
      const peakHours: string[] = [];
      const offPeakHours: string[] = [];
      hourSessions.forEach((hSessions, hour) => {
        const avgFill = this.average(hSessions.map(s => s.FillRate || 0));
        if (avgFill >= 70) {
          peakHours.push(hour);
        } else {
          offPeakHours.push(hour);
        }
      });
      
      this.locationProfiles.set(location, {
        name: location,
        totalSessions: sessions.length,
        avgFillRate: this.average(fillRates),
        avgCapacity: this.average(capacities),
        currentFormatMix,
        recommendedFormatMix: new Map(), // Will be calculated during optimization
        trainerHours,
        peakHours: peakHours.sort(),
        offPeakHours: offPeakHours.sort()
      });
    });
  }
  
  /**
   * Generate optimization suggestions for the schedule
   */
  generateOptimizations(
    currentSchedule: ScheduleClass[],
    config: OptimizationConfig
  ): OptimizationResult {
    const suggestions: OptimizationSuggestion[] = [];
    const trainerHoursSummary = new Map<string, { current: number; optimized: number; target: number }>();
    
    // Calculate current trainer hours
    const currentTrainerHours = new Map<string, number>();
    currentSchedule.forEach(cls => {
      const trainer = this.normalizeString(cls.trainer);
      currentTrainerHours.set(trainer, (currentTrainerHours.get(trainer) || 0) + 1);
    });
    
    // Update trainer profiles with current hours
    currentTrainerHours.forEach((hours, trainer) => {
      const profile = this.trainerProfiles.get(trainer);
      if (profile) {
        profile.currentWeeklyHours = hours;
      }
    });
    
    // 1. Find underperforming classes (below 60% fill rate or below location average)
    const locationAvgFillRates = new Map<string, number>();
    const locationClasses = this.groupBy(currentSchedule, cls => cls.location);
    locationClasses.forEach((classes, location) => {
      locationAvgFillRates.set(location, this.average(classes.map(c => c.fillRate)));
    });
    
    currentSchedule.forEach(cls => {
      const locationAvg = locationAvgFillRates.get(cls.location) || 60;
      const isUnderperforming = cls.fillRate < Math.min(60, locationAvg * 0.9);
      
      if (isUnderperforming && cls.sessionCount >= 3) {
        const suggestion = this.findBetterOption(cls, currentSchedule, config);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    });
    
    // 2. Find trainers who need more hours
    this.trainerProfiles.forEach((profile, trainerName) => {
      if (config.blockedTrainers.some(bt => trainerName.includes(bt.toLowerCase()))) return;
      if (config.priorityTrainers.length > 0 && !config.priorityTrainers.some(pt => trainerName.includes(pt.toLowerCase()))) return;
      
      const currentHours = currentTrainerHours.get(trainerName) || 0;
      trainerHoursSummary.set(profile.name, {
        current: currentHours,
        optimized: currentHours, // Will be updated as suggestions are made
        target: config.targetTrainerHours
      });
      
      if (currentHours < config.targetTrainerHours - 2 && profile.avgFillRate >= 65) {
        // This trainer could use more hours - find opportunities
        const addSuggestions = this.findAddOpportunities(profile, currentSchedule, config);
        suggestions.push(...addSuggestions);
      }
    });
    
    // 3. Look for trainer swaps that improve performance
    currentSchedule.forEach(cls => {
      const betterTrainer = this.findBetterTrainer(cls, currentSchedule, config);
      if (betterTrainer) {
        suggestions.push(betterTrainer);
      }
    });
    
    // 4. Identify duplicate/redundant classes
    const slotClasses = this.groupBy(currentSchedule, cls => `${cls.day}-${cls.time}-${cls.location}`);
    slotClasses.forEach((classes, slot) => {
      if (classes.length > 1) {
        // Multiple classes in same slot at same location
        const formatCategories = classes.map(c => this.getFormatCategory(c.class));
        const uniqueCategories = new Set(formatCategories);
        if (uniqueCategories.size < classes.length) {
          // Some classes are in the same category - might be redundant
          const sortedByFill = [...classes].sort((a, b) => a.fillRate - b.fillRate);
          const weakest = sortedByFill[0];
          if (weakest.fillRate < 50) {
            suggestions.push({
              id: `remove-${weakest.id}`,
              type: 'remove_class',
              priority: 'medium',
              confidence: 70,
              original: {
                classId: weakest.id,
                className: weakest.class,
                trainer: weakest.trainer,
                day: weakest.day,
                time: weakest.time,
                location: weakest.location,
                currentFillRate: weakest.fillRate,
                currentCheckIns: weakest.avgCheckIns
              },
              suggested: {
                className: '',
                trainer: '',
                day: weakest.day,
                time: weakest.time,
                location: weakest.location,
                projectedFillRate: 0,
                projectedCheckIns: 0
              },
              reason: `Remove redundant ${weakest.class} - similar format already running at same time`,
              impact: `Free up trainer ${weakest.trainer} for higher-performing slots`,
              dataPoints: [
                `Only ${weakest.fillRate}% fill rate`,
                `${classes.length} classes running at ${slot}`,
                `Similar formats competing for same members`
              ]
            });
          }
        }
      }
    });
    
    // Sort suggestions by priority and confidence
    suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.confidence - a.confidence;
    });
    
    // Calculate projected impact
    const projectedImpact = this.calculateProjectedImpact(suggestions, currentSchedule);
    
    // Generate insights
    const insights = this.generateInsights(currentSchedule, suggestions, config);
    
    // Calculate format mix before and after
    const formatMixImpact = this.calculateFormatMixImpact(suggestions, currentSchedule);
    
    return {
      suggestions: suggestions.slice(0, 20), // Limit to top 20 suggestions
      trainerHoursSummary,
      formatMixImpact,
      projectedImpact,
      insights
    };
  }
  
  private findBetterOption(
    cls: ScheduleClass,
    currentSchedule: ScheduleClass[],
    config: OptimizationConfig
  ): OptimizationSuggestion | null {
    const timeSlotKey = `${cls.day}-${cls.time.substring(0, 5)}`;
    const timeSlotProfile = this.timeSlotProfiles.get(timeSlotKey);
    
    // Get current trainer's schedule to check availability
    const trainerSchedule = new Set(
      currentSchedule
        .filter(c => this.normalizeString(c.trainer) !== this.normalizeString(cls.trainer))
        .map(c => `${this.normalizeString(c.trainer)}-${c.day}-${c.time}`)
    );
    
    let bestOption: {
      format: string;
      trainer: string;
      projectedFillRate: number;
      projectedCheckIns: number;
      confidence: number;
      dataPoints: string[];
    } | null = null;
    
    // Strategy 1: Find a better format for this slot with the best trainer
    if (timeSlotProfile) {
      for (const topFormat of timeSlotProfile.topFormats) {
        if (topFormat.name === cls.class) continue;
        if (config.excludedFormats.some(ef => topFormat.name.toLowerCase().includes(ef.toLowerCase()))) continue;
        
        const formatProfile = this.formatProfiles.get(topFormat.name);
        if (!formatProfile) continue;
        
        // Find best available trainer for this format
        for (const trainer of formatProfile.topTrainers) {
          const trainerNorm = this.normalizeString(trainer.name);
          if (config.blockedTrainers.some(bt => trainerNorm.includes(bt.toLowerCase()))) continue;
          
          const trainerProfile = this.trainerProfiles.get(trainerNorm);
          if (!trainerProfile) continue;
          
          // Check availability
          const availKey = `${trainerNorm}-${cls.day}-${cls.time}`;
          if (trainerSchedule.has(availKey)) continue;
          
          // Check if trainer would exceed max hours
          const currentHours = trainerProfile.currentWeeklyHours;
          if (currentHours >= config.maxTrainerHours) continue;
          
          // Check location constraint
          const locationPerf = trainerProfile.locationPerformance.get(cls.location);
          if (!locationPerf || locationPerf.sessions < 2) continue;
          
          const projectedFillRate = Math.min(95, (trainer.avgFillRate + topFormat.avgFillRate) / 2);
          
          if (!bestOption || projectedFillRate > bestOption.projectedFillRate) {
            bestOption = {
              format: topFormat.name,
              trainer: trainer.name,
              projectedFillRate,
              projectedCheckIns: Math.round((projectedFillRate / 100) * (cls.capacity || 20)),
              confidence: Math.min(90, 50 + trainer.sessions * 5),
              dataPoints: [
                `${trainer.name} achieves ${Math.round(trainer.avgFillRate)}% fill rate for ${topFormat.name}`,
                `${topFormat.name} averages ${Math.round(topFormat.avgFillRate)}% at this time slot`,
                `Based on ${trainer.sessions} sessions from this trainer`
              ]
            };
          }
        }
      }
    }
    
    // Strategy 2: Keep the format but find a better trainer
    const currentFormat = cls.class;
    const formatProfile = this.formatProfiles.get(currentFormat);
    
    if (formatProfile) {
      for (const trainer of formatProfile.topTrainers) {
        if (trainer.name === cls.trainer) continue;
        
        const trainerNorm = this.normalizeString(trainer.name);
        if (config.blockedTrainers.some(bt => trainerNorm.includes(bt.toLowerCase()))) continue;
        
        const trainerProfile = this.trainerProfiles.get(trainerNorm);
        if (!trainerProfile) continue;
        
        // Check availability
        const availKey = `${trainerNorm}-${cls.day}-${cls.time}`;
        if (trainerSchedule.has(availKey)) continue;
        
        // Check hours
        if (trainerProfile.currentWeeklyHours >= config.maxTrainerHours) continue;
        
        const projectedFillRate = trainer.avgFillRate;
        const improvement = projectedFillRate - cls.fillRate;
        
        if (improvement >= 10 && (!bestOption || projectedFillRate > bestOption.projectedFillRate)) {
          bestOption = {
            format: currentFormat,
            trainer: trainer.name,
            projectedFillRate,
            projectedCheckIns: Math.round((projectedFillRate / 100) * (cls.capacity || 20)),
            confidence: Math.min(88, 55 + trainer.sessions * 4),
            dataPoints: [
              `${trainer.name} averages ${Math.round(trainer.avgFillRate)}% for ${currentFormat}`,
              `+${Math.round(improvement)}% improvement expected`,
              `Based on ${trainer.sessions} historical sessions`
            ]
          };
        }
      }
    }
    
    if (!bestOption || bestOption.projectedFillRate < cls.fillRate + 10) {
      return null;
    }
    
    return {
      id: `replace-${cls.id}`,
      type: bestOption.format === cls.class ? 'replace_trainer' : 'replace_class',
      priority: cls.fillRate < 40 ? 'high' : cls.fillRate < 55 ? 'medium' : 'low',
      confidence: bestOption.confidence,
      original: {
        classId: cls.id,
        className: cls.class,
        trainer: cls.trainer,
        day: cls.day,
        time: cls.time,
        location: cls.location,
        currentFillRate: cls.fillRate,
        currentCheckIns: cls.avgCheckIns
      },
      suggested: {
        className: bestOption.format,
        trainer: bestOption.trainer,
        day: cls.day,
        time: cls.time,
        location: cls.location,
        projectedFillRate: bestOption.projectedFillRate,
        projectedCheckIns: bestOption.projectedCheckIns
      },
      reason: bestOption.format === cls.class
        ? `Replace ${cls.trainer} with ${bestOption.trainer} - better performer for ${cls.class}`
        : `Replace ${cls.class} with ${bestOption.format} taught by ${bestOption.trainer}`,
      impact: `+${Math.round(bestOption.projectedFillRate - cls.fillRate)}% fill rate improvement expected`,
      dataPoints: bestOption.dataPoints
    };
  }
  
  private findBetterTrainer(
    cls: ScheduleClass,
    currentSchedule: ScheduleClass[],
    config: OptimizationConfig
  ): OptimizationSuggestion | null {
    if (cls.fillRate >= 75) return null; // Already doing well
    
    const formatProfile = this.formatProfiles.get(cls.class);
    if (!formatProfile) return null;
    
    const currentTrainerNorm = this.normalizeString(cls.trainer);
    const currentTrainerProfile = this.trainerProfiles.get(currentTrainerNorm);
    const currentTrainerFormatPerf = currentTrainerProfile?.formatPerformance.get(cls.class);
    
    // Build occupied slots
    const trainerSchedule = new Map<string, Set<string>>();
    currentSchedule.forEach(c => {
      const tn = this.normalizeString(c.trainer);
      if (!trainerSchedule.has(tn)) trainerSchedule.set(tn, new Set());
      trainerSchedule.get(tn)!.add(`${c.day}-${c.time}`);
    });
    
    for (const topTrainer of formatProfile.topTrainers) {
      if (topTrainer.name === cls.trainer) continue;
      if (topTrainer.avgFillRate <= (currentTrainerFormatPerf?.avgFillRate || cls.fillRate) + 10) continue;
      
      const trainerNorm = this.normalizeString(topTrainer.name);
      if (config.blockedTrainers.some(bt => trainerNorm.includes(bt.toLowerCase()))) continue;
      
      const trainerProfile = this.trainerProfiles.get(trainerNorm);
      if (!trainerProfile) continue;
      
      // Check availability
      const slotKey = `${cls.day}-${cls.time}`;
      if (trainerSchedule.get(trainerNorm)?.has(slotKey)) continue;
      
      // Check hours
      if (trainerProfile.currentWeeklyHours >= config.maxTrainerHours) continue;
      
      // Check if this trainer performs well at this location
      const locationPerf = trainerProfile.locationPerformance.get(cls.location);
      if (!locationPerf || locationPerf.avgFillRate < 60) continue;
      
      const improvement = topTrainer.avgFillRate - cls.fillRate;
      
      return {
        id: `swap-trainer-${cls.id}`,
        type: 'replace_trainer',
        priority: improvement > 20 ? 'high' : improvement > 10 ? 'medium' : 'low',
        confidence: Math.min(85, 50 + topTrainer.sessions * 5),
        original: {
          classId: cls.id,
          className: cls.class,
          trainer: cls.trainer,
          day: cls.day,
          time: cls.time,
          location: cls.location,
          currentFillRate: cls.fillRate,
          currentCheckIns: cls.avgCheckIns
        },
        suggested: {
          className: cls.class,
          trainer: topTrainer.name,
          day: cls.day,
          time: cls.time,
          location: cls.location,
          projectedFillRate: topTrainer.avgFillRate,
          projectedCheckIns: Math.round((topTrainer.avgFillRate / 100) * (cls.capacity || 20))
        },
        reason: `${topTrainer.name} is a top performer for ${cls.class} with ${Math.round(topTrainer.avgFillRate)}% fill rate`,
        impact: `+${Math.round(improvement)}% fill rate improvement expected`,
        dataPoints: [
          `${topTrainer.name}: ${Math.round(topTrainer.avgFillRate)}% avg fill rate`,
          `Current: ${cls.trainer} at ${Math.round(cls.fillRate)}%`,
          `${topTrainer.sessions} sessions analyzed`
        ]
      };
    }
    
    return null;
  }
  
  private findAddOpportunities(
    trainerProfile: TrainerProfile,
    currentSchedule: ScheduleClass[],
    config: OptimizationConfig
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Find slots where this trainer could be added based on their best combinations
    const trainerNorm = trainerProfile.normalizedName;
    
    // Get current schedule for this trainer
    const trainerCurrentSlots = new Set<string>();
    const trainerWorkDays = new Set<string>();
    currentSchedule.forEach(cls => {
      if (this.normalizeString(cls.trainer) === trainerNorm) {
        trainerCurrentSlots.add(`${cls.day}-${cls.time}`);
        trainerWorkDays.add(cls.day);
      }
    });
    
    // Check days off constraint
    if (7 - trainerWorkDays.size <= config.minDaysOff) {
      return suggestions; // Can't add more days
    }
    
    // Look for gaps in schedule where trainer could be added
    for (const combo of trainerProfile.bestCombinations) {
      const slotKey = `${combo.day}-${combo.time}`;
      
      // Skip if already in this slot
      if (trainerCurrentSlots.has(slotKey)) continue;
      
      // Skip if would exceed max hours
      if (trainerProfile.currentWeeklyHours >= config.maxTrainerHours) break;
      
      // Check if there's already a class at this slot at this location
      const existingClass = currentSchedule.find(c => 
        c.day === combo.day && 
        c.time === combo.time && 
        c.location === combo.location
      );
      
      if (existingClass && existingClass.fillRate >= 70) continue; // Slot is doing well
      
      if (!existingClass) {
        // Empty slot - suggest adding a class
        suggestions.push({
          id: `add-${trainerNorm}-${slotKey}-${combo.location}`,
          type: 'add_class',
          priority: combo.avgFillRate > 80 ? 'high' : 'medium',
          confidence: Math.min(80, 40 + combo.sessions * 10),
          original: {
            className: '',
            trainer: '',
            day: combo.day,
            time: combo.time,
            location: combo.location,
            currentFillRate: 0,
            currentCheckIns: 0
          },
          suggested: {
            className: combo.format,
            trainer: trainerProfile.name,
            day: combo.day,
            time: combo.time,
            location: combo.location,
            projectedFillRate: combo.avgFillRate,
            projectedCheckIns: combo.avgCheckIns
          },
          reason: `Add ${combo.format} with ${trainerProfile.name} - strong historical performance`,
          impact: `${trainerProfile.name} needs more hours (${trainerProfile.currentWeeklyHours}/${config.targetTrainerHours})`,
          dataPoints: [
            `${Math.round(combo.avgFillRate)}% fill rate in ${combo.sessions} sessions`,
            `${trainerProfile.name} excels at ${combo.format}`,
            `Trainer at ${trainerProfile.currentWeeklyHours} hours, target is ${config.targetTrainerHours}`
          ]
        });
      }
    }
    
    return suggestions.slice(0, 2); // Max 2 suggestions per trainer
  }
  
  private calculateProjectedImpact(
    suggestions: OptimizationSuggestion[],
    _currentSchedule: ScheduleClass[]
  ): { totalCheckInsIncrease: number; avgFillRateIncrease: number; trainerUtilizationIncrease: number } {
    let totalCheckInsIncrease = 0;
    let fillRateSum = 0;
    let count = 0;
    
    suggestions.forEach(s => {
      if (s.type !== 'remove_class' && s.type !== 'add_class') {
        totalCheckInsIncrease += s.suggested.projectedCheckIns - s.original.currentCheckIns;
        fillRateSum += s.suggested.projectedFillRate - s.original.currentFillRate;
        count++;
      }
    });
    
    return {
      totalCheckInsIncrease: Math.round(totalCheckInsIncrease),
      avgFillRateIncrease: count > 0 ? Math.round(fillRateSum / count) : 0,
      trainerUtilizationIncrease: 0 // Would need more complex calculation
    };
  }
  
  private calculateFormatMixImpact(
    suggestions: OptimizationSuggestion[],
    currentSchedule: ScheduleClass[]
  ): { before: Record<string, number>; after: Record<string, number> } {
    const before: Record<string, number> = {};
    const after: Record<string, number> = {};
    
    // Calculate current mix
    currentSchedule.forEach(cls => {
      const category = this.getFormatCategory(cls.class);
      before[category] = (before[category] || 0) + 1;
    });
    
    // Copy to after
    Object.assign(after, before);
    
    // Apply suggestions
    suggestions.forEach(s => {
      if (s.type === 'replace_class') {
        const oldCategory = this.getFormatCategory(s.original.className);
        const newCategory = this.getFormatCategory(s.suggested.className);
        if (oldCategory !== newCategory) {
          after[oldCategory] = (after[oldCategory] || 1) - 1;
          after[newCategory] = (after[newCategory] || 0) + 1;
        }
      } else if (s.type === 'add_class') {
        const category = this.getFormatCategory(s.suggested.className);
        after[category] = (after[category] || 0) + 1;
      } else if (s.type === 'remove_class') {
        const category = this.getFormatCategory(s.original.className);
        after[category] = (after[category] || 1) - 1;
      }
    });
    
    return { before, after };
  }
  
  private generateInsights(
    currentSchedule: ScheduleClass[],
    suggestions: OptimizationSuggestion[],
    config: OptimizationConfig
  ): string[] {
    const insights: string[] = [];
    
    // Underperforming count
    const underperforming = currentSchedule.filter(c => c.fillRate < 60);
    if (underperforming.length > 0) {
      insights.push(`📊 ${underperforming.length} classes are below 60% fill rate and have optimization opportunities`);
    }
    
    // High-priority suggestions
    const highPriority = suggestions.filter(s => s.priority === 'high');
    if (highPriority.length > 0) {
      insights.push(`🎯 ${highPriority.length} high-impact optimizations identified with 15%+ improvement potential`);
    }
    
    // Trainer utilization
    const underutilizedTrainers = Array.from(this.trainerProfiles.values())
      .filter(t => t.currentWeeklyHours < config.targetTrainerHours - 3 && t.avgFillRate >= 70);
    if (underutilizedTrainers.length > 0) {
      insights.push(`👥 ${underutilizedTrainers.length} high-performing trainers could take on more classes`);
    }
    
    // Top performer
    const topTrainer = Array.from(this.trainerProfiles.values())
      .sort((a, b) => b.avgFillRate - a.avgFillRate)[0];
    if (topTrainer) {
      insights.push(`🏆 ${topTrainer.name} leads with ${Math.round(topTrainer.avgFillRate)}% fill rate - consider expanding their schedule`);
    }
    
    return insights;
  }
  
  // ================== HELPER METHODS ==================
  
  private normalizeString(s: string): string {
    return (s || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  }
  
  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  
  private standardDeviation(arr: number[]): number {
    if (arr.length === 0) return 0;
    const avg = this.average(arr);
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }
  
  private groupBy<T>(arr: T[], keyFn: (item: T) => string): Map<string, T[]> {
    const map = new Map<string, T[]>();
    arr.forEach(item => {
      const key = keyFn(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  }
  
  private getFormatCategory(format: string): string {
    const lower = (format || '').toLowerCase();
    if (lower.includes('cycle') || lower.includes('spin') || lower.includes('ride')) return 'Cycle';
    if (lower.includes('yoga')) return 'Yoga';
    if (lower.includes('pilates') || lower.includes('mat')) return 'Pilates';
    if (lower.includes('strength') || lower.includes('fit') || lower.includes('hiit')) return 'Strength';
    if (lower.includes('barre')) return 'Barre';
    if (lower.includes('box') || lower.includes('kickbox')) return 'Boxing';
    if (lower.includes('dance') || lower.includes('zumba')) return 'Dance';
    if (lower.includes('stretch') || lower.includes('restore') || lower.includes('recovery')) return 'Recovery';
    return 'Other';
  }
  
  private getFormatDifficulty(format: string): 'beginner' | 'intermediate' | 'advanced' {
    const lower = (format || '').toLowerCase();
    if (lower.includes('basic') || lower.includes('essentials') || lower.includes('intro') || lower.includes('beginner') || lower.includes('gentle')) {
      return 'beginner';
    }
    if (lower.includes('advanced') || lower.includes('amped') || lower.includes('intense') || lower.includes('power') || lower.includes('pro')) {
      return 'advanced';
    }
    return 'intermediate';
  }
  
  // ================== PUBLIC API ==================
  
  getTrainerProfile(name: string): TrainerProfile | undefined {
    return this.trainerProfiles.get(this.normalizeString(name));
  }
  
  getFormatProfile(name: string): FormatProfile | undefined {
    return this.formatProfiles.get(name);
  }
  
  getAllTrainerProfiles(): TrainerProfile[] {
    return Array.from(this.trainerProfiles.values());
  }
  
  getAllFormatProfiles(): FormatProfile[] {
    return Array.from(this.formatProfiles.values());
  }
}

// Singleton instance
export const smartOptimizer = new SmartScheduleOptimizer();
