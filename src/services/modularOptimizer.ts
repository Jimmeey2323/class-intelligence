/**
 * Modular Schedule Optimizer
 * 
 * Breaks down optimization into smaller, focused functions for better performance.
 * Each module handles a specific aspect of schedule optimization.
 */

import { SessionData } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ================== TYPES ==================

export interface OptimizationRules {
  targetTrainerHours: number;
  maxTrainerHours: number;
  minDaysOff: number;
  noClassesBefore: string;
  noClassesAfter: string;
  noClassesBetweenStart: string;
  noClassesBetweenEnd: string;
  blockedTrainers: string[];
  excludedFormats: string[];
  // TrainerLeave uses trainerName (matching ProScheduler.tsx interface)
  trainerLeaves: Array<{ trainerName: string; startDate: string; endDate: string; reason?: string }>;
  // LocationConstraints matching ProScheduler.tsx interface
  locationConstraints: Record<string, {
    maxParallelClasses: number;
    requiredFormats: string[];
    optionalFormats: string[];
    priorityTrainers: string[];
  }>;
  // FormatPriority matching ProScheduler.tsx interface
  formatPriorities: Array<{
    format: string;
    priorityTrainers: string[];
  }>;
  // TrainerPriority matching ProScheduler.tsx interface
  newTrainers: Array<{
    name: string;
    targetHours: number;
    allowedFormats?: string[];
    isNewTrainer?: boolean;
  }>;
  strategy: 'balanced' | 'maximize_attendance' | 'trainer_development' | 'format_diversity' | 'peak_optimization' | 'member_retention';
}

export interface ScheduleClass {
  id: string;
  day: string;
  time: string;
  class: string;
  trainer: string;
  location: string;
  capacity: number;
}

export interface ClassPerformance {
  className: string;
  trainer: string;
  day: string;
  time: string;
  location: string;
  avgCheckIns: number;
  avgFillRate: number;
  sessions: number;
  trend: 'up' | 'down' | 'stable';
  isTopPerformer: boolean;
}

export interface TrainerMetrics {
  name: string;
  avgFillRate: number;
  avgCheckIns: number;
  totalSessions: number;
  currentWeeklyHours: number;
  hoursToTarget: number;
  bestFormats: string[];
  bestDays: string[];
  bestTimes: string[];
  locations: string[];
}

export interface DayOptimization {
  day: string;
  location: string;
  changes: Array<{
    type: 'replace' | 'add' | 'remove' | 'swap';
    original?: ScheduleClass;
    suggested: Partial<ScheduleClass>;
    reason: string;
    projectedImpact: number;
    confidence: number;
  }>;
  formatMixBefore: Record<string, number>;
  formatMixAfter: Record<string, number>;
  projectedFillRateChange: number;
}

export interface AIOptimizationError {
  code: 'API_UNAVAILABLE' | 'RATE_LIMITED' | 'INVALID_RESPONSE' | 'TIMEOUT' | 'UNKNOWN';
  message: string;
  timestamp: Date;
}

export interface AIOptimizationResult {
  success: boolean;
  error?: AIOptimizationError;
  suggestions: Array<{
    id: string;
    type: 'replace_trainer' | 'replace_class' | 'adjust_time' | 'add_class' | 'remove_class';
    original: {
      classId: string;
      className: string;
      trainer: string;
      day: string;
      time: string;
      location: string;
      currentFillRate: number;
    };
    suggested: {
      className: string;
      trainer: string;
      day: string;
      time: string;
      location: string;
      projectedFillRate: number;
    };
    reason: string;
    confidence: number;
    dataPoints: string[];
  }>;
  insights: string[];
  projectedImpact: {
    fillRateChange: number;
    attendanceChange: number;
    trainerUtilizationChange: number;
  };
}

// ================== MODULE 1: Data Analysis ==================

export class DataAnalyzer {
  /**
   * Analyze historical performance of classes
   */
  static analyzeClassPerformance(
    data: SessionData[],
    dateFrom?: string,
    dateTo?: string
  ): Map<string, ClassPerformance> {
    const performances = new Map<string, ClassPerformance>();
    
    // Filter by date range if provided
    let filteredData = data;
    if (dateFrom || dateTo) {
      filteredData = data.filter(d => {
        const sessionDate = new Date(d.Date);
        if (dateFrom && sessionDate < new Date(dateFrom)) return false;
        if (dateTo && sessionDate > new Date(dateTo)) return false;
        return true;
      });
    }
    
    // Group by class-trainer-day-time-location
    const groups = new Map<string, SessionData[]>();
    filteredData.forEach(session => {
      const key = `${session.Class}-${session.Trainer}-${session.Day}-${session.Time?.substring(0,5)}-${session.Location}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(session);
    });
    
    // Calculate metrics for each group
    groups.forEach((sessions, key) => {
      if (sessions.length < 2) return; // Need at least 2 sessions for meaningful data
      
      const avgCheckIns = sessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0) / sessions.length;
      const avgFillRate = sessions.reduce((sum, s) => sum + (s.FillRate || 0), 0) / sessions.length;
      
      // Calculate trend (compare first half to second half)
      const midpoint = Math.floor(sessions.length / 2);
      const firstHalf = sessions.slice(0, midpoint);
      const secondHalf = sessions.slice(midpoint);
      const firstAvg = firstHalf.reduce((s, d) => s + (d.FillRate || 0), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, d) => s + (d.FillRate || 0), 0) / secondHalf.length;
      const trendDiff = secondAvg - firstAvg;
      const trend = trendDiff > 5 ? 'up' : trendDiff < -5 ? 'down' : 'stable';
      
      performances.set(key, {
        className: sessions[0].Class || '',
        trainer: sessions[0].Trainer || '',
        day: sessions[0].Day || '',
        time: sessions[0].Time?.substring(0, 5) || '',
        location: sessions[0].Location || '',
        avgCheckIns,
        avgFillRate,
        sessions: sessions.length,
        trend,
        isTopPerformer: avgFillRate >= 70 // Top performer if 70%+ fill rate
      });
    });
    
    return performances;
  }
  
  /**
   * Analyze trainer performance metrics
   */
  static analyzeTrainerPerformance(
    data: SessionData[],
    rules: OptimizationRules
  ): Map<string, TrainerMetrics> {
    const metrics = new Map<string, TrainerMetrics>();
    
    // Group sessions by trainer
    const trainerSessions = new Map<string, SessionData[]>();
    data.forEach(session => {
      const trainer = session.Trainer?.toLowerCase().trim() || 'unknown';
      if (!trainerSessions.has(trainer)) trainerSessions.set(trainer, []);
      trainerSessions.get(trainer)!.push(session);
    });
    
    trainerSessions.forEach((sessions, trainerName) => {
      const avgFillRate = sessions.reduce((s, d) => s + (d.FillRate || 0), 0) / sessions.length;
      const avgCheckIns = sessions.reduce((s, d) => s + (d.CheckedIn || 0), 0) / sessions.length;
      
      // Find best formats
      const formatFills = new Map<string, number[]>();
      sessions.forEach(s => {
        const format = s.Class || '';
        if (!formatFills.has(format)) formatFills.set(format, []);
        formatFills.get(format)!.push(s.FillRate || 0);
      });
      const bestFormats = Array.from(formatFills.entries())
        .map(([format, fills]) => ({
          format,
          avgFill: fills.reduce((a, b) => a + b, 0) / fills.length,
          count: fills.length
        }))
        .filter(f => f.count >= 3)
        .sort((a, b) => b.avgFill - a.avgFill)
        .slice(0, 5)
        .map(f => f.format);
      
      // Find best days
      const dayFills = new Map<string, number[]>();
      sessions.forEach(s => {
        const day = s.Day || '';
        if (!dayFills.has(day)) dayFills.set(day, []);
        dayFills.get(day)!.push(s.FillRate || 0);
      });
      const bestDays = Array.from(dayFills.entries())
        .map(([day, fills]) => ({
          day,
          avgFill: fills.reduce((a, b) => a + b, 0) / fills.length
        }))
        .sort((a, b) => b.avgFill - a.avgFill)
        .slice(0, 3)
        .map(d => d.day);
      
      // Find best times
      const timeFills = new Map<string, number[]>();
      sessions.forEach(s => {
        const time = s.Time?.substring(0, 5) || '';
        if (!timeFills.has(time)) timeFills.set(time, []);
        timeFills.get(time)!.push(s.FillRate || 0);
      });
      const bestTimes = Array.from(timeFills.entries())
        .map(([time, fills]) => ({
          time,
          avgFill: fills.reduce((a, b) => a + b, 0) / fills.length
        }))
        .sort((a, b) => b.avgFill - a.avgFill)
        .slice(0, 3)
        .map(t => t.time);
      
      // Get locations
      const locations = [...new Set(sessions.map(s => s.Location).filter(Boolean))] as string[];
      
      // Current weekly hours (approximate from unique day-time combos in last week)
      const recentSessions = sessions.slice(-20);
      const uniqueSlots = new Set(recentSessions.map(s => `${s.Day}-${s.Time}`));
      const currentWeeklyHours = uniqueSlots.size;
      
      metrics.set(trainerName, {
        name: trainerName,
        avgFillRate,
        avgCheckIns,
        totalSessions: sessions.length,
        currentWeeklyHours,
        hoursToTarget: rules.targetTrainerHours - currentWeeklyHours,
        bestFormats,
        bestDays,
        bestTimes,
        locations
      });
    });
    
    return metrics;
  }
  
  /**
   * Get top performing classes only (for Top Classes tab)
   */
  static getTopPerformingClasses(
    scheduleClasses: ScheduleClass[],
    performances: Map<string, ClassPerformance>,
    locationAverages: Map<string, number>
  ): ScheduleClass[] {
    return scheduleClasses.filter(cls => {
      const key = `${cls.class}-${cls.trainer}-${cls.day}-${cls.time}-${cls.location}`;
      const perf = performances.get(key);
      const locAvg = locationAverages.get(cls.location) || 50;
      
      // Class is top performing if:
      // 1. Has performance data AND above 70% fill rate
      // 2. OR above location average by 10%+
      if (perf) {
        return perf.avgFillRate >= 70 || perf.avgFillRate >= locAvg + 10;
      }
      
      // No data = not proven top performer
      return false;
    });
  }
}

// ================== MODULE 2: Rule-Based Optimizer ==================

export class RuleBasedOptimizer {
  /**
   * Optimize a single day at a location based on rules
   */
  static optimizeDay(
    day: string,
    location: string,
    scheduleClasses: ScheduleClass[],
    performances: Map<string, ClassPerformance>,
    trainerMetrics: Map<string, TrainerMetrics>,
    rules: OptimizationRules
  ): DayOptimization {
    const dayClasses = scheduleClasses.filter(c => c.day === day && c.location === location);
    const changes: DayOptimization['changes'] = [];
    
    // Calculate current format mix
    const formatMixBefore: Record<string, number> = {};
    dayClasses.forEach(c => {
      const format = this.getFormatCategory(c.class);
      formatMixBefore[format] = (formatMixBefore[format] || 0) + 1;
    });
    
    // Identify underperforming classes
    dayClasses.forEach(cls => {
      const key = `${cls.class}-${cls.trainer}-${cls.day}-${cls.time}-${cls.location}`;
      const perf = performances.get(key);
      
      if (!perf || perf.avgFillRate < 50) {
        // Find best replacement
        const replacement = this.findBestReplacement(cls, trainerMetrics, performances, rules);
        if (replacement) {
          changes.push({
            type: 'replace',
            original: cls,
            suggested: replacement.class,
            reason: replacement.reason,
            projectedImpact: replacement.projectedImpact,
            confidence: replacement.confidence
          });
        }
      }
    });
    
    // Check format mix balance based on required and optional formats
    const locationConstraints = rules.locationConstraints[location];
    if (locationConstraints?.requiredFormats?.length > 0) {
      // Ensure all required formats are present
      locationConstraints.requiredFormats.forEach((format: string) => {
        const currentCount = formatMixBefore[format] || 0;
        if (currentCount === 0) {
          // Suggest adding this required format
          changes.push({
            type: 'add',
            suggested: { class: format, location, day },
            reason: `${format} is a required format for this location`,
            projectedImpact: 8,
            confidence: 85
          });
        }
      });
    }
    
    // Calculate projected format mix after changes
    const formatMixAfter = { ...formatMixBefore };
    changes.forEach(change => {
      if (change.type === 'replace' && change.original && change.suggested.class) {
        const oldFormat = this.getFormatCategory(change.original.class);
        const newFormat = this.getFormatCategory(change.suggested.class);
        formatMixAfter[oldFormat] = (formatMixAfter[oldFormat] || 1) - 1;
        formatMixAfter[newFormat] = (formatMixAfter[newFormat] || 0) + 1;
      }
    });
    
    return {
      day,
      location,
      changes,
      formatMixBefore,
      formatMixAfter,
      projectedFillRateChange: changes.reduce((sum, c) => sum + c.projectedImpact, 0) / Math.max(changes.length, 1)
    };
  }
  
  /**
   * Find the best replacement for an underperforming class
   */
  private static findBestReplacement(
    cls: ScheduleClass,
    trainerMetrics: Map<string, TrainerMetrics>,
    _performances: Map<string, ClassPerformance>, // eslint-disable-line @typescript-eslint/no-unused-vars
    rules: OptimizationRules
  ): { class: Partial<ScheduleClass>; reason: string; projectedImpact: number; confidence: number } | null {
    // Find trainers who perform well at this time slot
    const candidates: Array<{
      trainer: string;
      format: string;
      score: number;
      reason: string;
    }> = [];
    
    trainerMetrics.forEach((metrics, trainerName) => {
      // Skip blocked trainers
      if (rules.blockedTrainers.includes(trainerName)) return;
      
      // Skip if trainer already at max hours
      if (metrics.currentWeeklyHours >= rules.maxTrainerHours) return;
      
      // Check if trainer works at this location
      if (!metrics.locations.includes(cls.location)) return;
      
      // Score based on trainer's best formats at this time
      metrics.bestFormats.forEach(format => {
        // Skip excluded formats
        if (rules.excludedFormats.some(ef => format.toLowerCase().includes(ef))) return;
        
        let score = metrics.avgFillRate;
        
        // Bonus for matching day
        if (metrics.bestDays.includes(cls.day)) score += 10;
        
        // Bonus for matching time
        if (metrics.bestTimes.includes(cls.time)) score += 10;
        
        // Bonus for hours to target
        if (metrics.hoursToTarget > 0) score += metrics.hoursToTarget * 2;
        
        candidates.push({
          trainer: trainerName,
          format,
          score,
          reason: `${trainerName} excels at ${format} with ${metrics.avgFillRate.toFixed(0)}% fill rate`
        });
      });
    });
    
    if (candidates.length === 0) return null;
    
    // Sort by score and pick the best
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    
    return {
      class: {
        class: best.format,
        trainer: best.trainer,
        day: cls.day,
        time: cls.time,
        location: cls.location
      },
      reason: best.reason,
      projectedImpact: best.score - 50, // Impact relative to 50% baseline
      confidence: Math.min(90, 50 + candidates.length * 5) // More candidates = more confidence
    };
  }
  
  private static getFormatCategory(className: string): string {
    const lower = className.toLowerCase();
    if (lower.includes('cycle') || lower.includes('powercycle')) return 'cycle';
    if (lower.includes('strength') || lower.includes('fit') || lower.includes('hiit')) return 'strength';
    if (lower.includes('barre')) return 'barre';
    if (lower.includes('yoga')) return 'yoga';
    if (lower.includes('pilates') || lower.includes('mat')) return 'mat';
    if (lower.includes('recovery')) return 'recovery';
    if (lower.includes('boxing')) return 'boxing';
    return 'other';
  }
}

// ================== MODULE 3: AI Optimizer ==================

export class AIOptimizer {
  private static genAI: GoogleGenerativeAI | null = null;
  private static model: any = null;
  private static initialized = false;
  
  /**
   * Initialize AI service - call once at startup
   */
  static initialize(): boolean {
    if (this.initialized) return !!this.model;
    
    const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
    
    if (!apiKey || apiKey.length < 20) {
      console.warn('AI Optimizer: No valid API key found');
      this.initialized = true;
      return false;
    }
    
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-lite',
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        }
      });
      this.initialized = true;
      console.log('AI Optimizer initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize AI Optimizer:', error);
      this.initialized = true;
      return false;
    }
  }
  
  /**
   * Check if AI is available
   */
  static isAvailable(): boolean {
    if (!this.initialized) this.initialize();
    return !!this.model;
  }
  
  /**
   * Optimize schedule using AI - returns error if AI unavailable
   */
  static async optimizeWithAI(
    day: string,
    location: string,
    scheduleClasses: ScheduleClass[],
    performances: Map<string, ClassPerformance>,
    trainerMetrics: Map<string, TrainerMetrics>,
    rules: OptimizationRules
  ): Promise<AIOptimizationResult> {
    // Check AI availability first
    if (!this.isAvailable()) {
      return {
        success: false,
        error: {
          code: 'API_UNAVAILABLE',
          message: 'AI service is not available. Please check your API key configuration.',
          timestamp: new Date()
        },
        suggestions: [],
        insights: [],
        projectedImpact: { fillRateChange: 0, attendanceChange: 0, trainerUtilizationChange: 0 }
      };
    }
    
    try {
      const prompt = this.buildSmartPrompt(day, location, scheduleClasses, performances, trainerMetrics, rules);
      
      const result = await Promise.race([
        this.model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 30000)
        )
      ]);
      
      const response = await (result as any).response;
      const text = response.text();
      
      return this.parseAIResponse(text, scheduleClasses);
      
    } catch (error: any) {
      let errorCode: AIOptimizationError['code'] = 'UNKNOWN';
      let errorMessage = 'An unexpected error occurred';
      
      if (error.message === 'Timeout') {
        errorCode = 'TIMEOUT';
        errorMessage = 'AI request timed out. Please try again.';
      } else if (error.status === 429) {
        errorCode = 'RATE_LIMITED';
        errorMessage = 'AI service rate limited. Please wait a moment and try again.';
      } else if (error.message?.includes('API')) {
        errorCode = 'API_UNAVAILABLE';
        errorMessage = 'AI service temporarily unavailable.';
      }
      
      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          timestamp: new Date()
        },
        suggestions: [],
        insights: [],
        projectedImpact: { fillRateChange: 0, attendanceChange: 0, trainerUtilizationChange: 0 }
      };
    }
  }
  
  /**
   * Build a sophisticated AI prompt with rich context
   */
  private static buildSmartPrompt(
    day: string,
    location: string,
    scheduleClasses: ScheduleClass[],
    performances: Map<string, ClassPerformance>,
    trainerMetrics: Map<string, TrainerMetrics>,
    rules: OptimizationRules
  ): string {
    const dayClasses = scheduleClasses.filter(c => c.day === day && c.location === location);
    
    // Build detailed class performance context
    const classContext = dayClasses.map(cls => {
      const key = `${cls.class}-${cls.trainer}-${cls.day}-${cls.time}-${cls.location}`;
      const perf = performances.get(key);
      return {
        time: cls.time,
        class: cls.class,
        trainer: cls.trainer,
        fillRate: perf?.avgFillRate || 'unknown',
        checkIns: perf?.avgCheckIns || 'unknown',
        trend: perf?.trend || 'unknown',
        sessions: perf?.sessions || 0
      };
    }).sort((a, b) => a.time.localeCompare(b.time));
    
    // Build trainer context
    const trainerContext = Array.from(trainerMetrics.entries())
      .filter(([_, m]) => m.locations.includes(location))
      .map(([name, m]) => ({
        name,
        avgFill: m.avgFillRate.toFixed(0) + '%',
        bestFormats: m.bestFormats.slice(0, 3).join(', '),
        hoursToTarget: m.hoursToTarget,
        bestDays: m.bestDays.join(', ')
      }))
      .slice(0, 10);
    
    // Build format performance context
    const formatPerf = new Map<string, { fills: number[]; times: string[] }>();
    Array.from(performances.values())
      .filter(p => p.location === location)
      .forEach(p => {
        if (!formatPerf.has(p.className)) {
          formatPerf.set(p.className, { fills: [], times: [] });
        }
        formatPerf.get(p.className)!.fills.push(p.avgFillRate);
        if (!formatPerf.get(p.className)!.times.includes(p.time)) {
          formatPerf.get(p.className)!.times.push(p.time);
        }
      });
    
    const formatContext = Array.from(formatPerf.entries())
      .map(([format, data]) => ({
        format,
        avgFill: (data.fills.reduce((a, b) => a + b, 0) / data.fills.length).toFixed(0) + '%',
        bestTimes: data.times.slice(0, 3).join(', ')
      }))
      .sort((a, b) => parseFloat(b.avgFill) - parseFloat(a.avgFill))
      .slice(0, 15);
    
    return `You are an expert fitness studio schedule optimizer. Analyze this schedule for ${day} at ${location} and provide SPECIFIC, ACTIONABLE recommendations.

## CURRENT SCHEDULE (${day}, ${location})
${JSON.stringify(classContext, null, 2)}

## AVAILABLE TRAINERS (work at this location)
${JSON.stringify(trainerContext, null, 2)}

## FORMAT PERFORMANCE DATA (at this location)
${JSON.stringify(formatContext, null, 2)}

## OPTIMIZATION RULES TO FOLLOW
- Target trainer hours: ${rules.targetTrainerHours}hrs/week
- Max trainer hours: ${rules.maxTrainerHours}hrs/week
- Min days off per trainer: ${rules.minDaysOff}
- No classes before: ${rules.noClassesBefore}
- No classes after: ${rules.noClassesAfter}
- Blocked trainers: ${rules.blockedTrainers.join(', ') || 'none'}
- Strategy: ${rules.strategy}

## YOUR TASK
1. Identify underperforming classes (<60% fill rate or declining trend)
2. Recommend SPECIFIC changes (trainer swaps, class replacements, time adjustments)
3. Ensure format diversity throughout the day
4. Balance trainer hours toward targets
5. Maximize overall attendance

## RESPONSE FORMAT (JSON only, no markdown)
{
  "suggestions": [
    {
      "type": "replace_trainer|replace_class|adjust_time|add_class|remove_class",
      "originalClass": "class name",
      "originalTrainer": "trainer name",
      "originalTime": "HH:MM",
      "suggestedClass": "class name",
      "suggestedTrainer": "trainer name",
      "suggestedTime": "HH:MM",
      "reason": "Specific reason with data support",
      "confidence": 75,
      "dataPoints": ["point 1", "point 2"]
    }
  ],
  "insights": [
    "Key insight about the schedule",
    "Another actionable insight"
  ],
  "projectedImpact": {
    "fillRateChange": 5.2,
    "attendanceChange": 12
  }
}

Provide 3-5 high-impact suggestions. Be specific and reference actual data.`;
  }
  
  /**
   * Parse AI response into structured result
   */
  private static parseAIResponse(text: string, scheduleClasses: ScheduleClass[]): AIOptimizationResult {
    try {
      // Clean up the response
      let cleaned = text.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      }
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      
      const parsed = JSON.parse(cleaned);
      
      // Map to our structure
      const suggestions = (parsed.suggestions || []).map((s: any, idx: number) => {
        // Find matching class in schedule
        const matchingClass = scheduleClasses.find(c => 
          c.class.toLowerCase() === s.originalClass?.toLowerCase() &&
          c.trainer.toLowerCase() === s.originalTrainer?.toLowerCase()
        );
        
        return {
          id: `ai-${idx}-${Date.now()}`,
          type: s.type || 'replace_trainer',
          original: {
            classId: matchingClass?.id || '',
            className: s.originalClass || '',
            trainer: s.originalTrainer || '',
            day: matchingClass?.day || '',
            time: s.originalTime || matchingClass?.time || '',
            location: matchingClass?.location || '',
            currentFillRate: 0
          },
          suggested: {
            className: s.suggestedClass || s.originalClass || '',
            trainer: s.suggestedTrainer || '',
            day: matchingClass?.day || '',
            time: s.suggestedTime || s.originalTime || matchingClass?.time || '',
            location: matchingClass?.location || '',
            projectedFillRate: 0
          },
          reason: s.reason || 'AI recommendation',
          confidence: s.confidence || 70,
          dataPoints: s.dataPoints || []
        };
      });
      
      return {
        success: true,
        suggestions,
        insights: parsed.insights || [],
        projectedImpact: {
          fillRateChange: parsed.projectedImpact?.fillRateChange || 0,
          attendanceChange: parsed.projectedImpact?.attendanceChange || 0,
          trainerUtilizationChange: 0
        }
      };
      
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        success: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: 'AI response could not be parsed. Please try again.',
          timestamp: new Date()
        },
        suggestions: [],
        insights: [],
        projectedImpact: { fillRateChange: 0, attendanceChange: 0, trainerUtilizationChange: 0 }
      };
    }
  }
  
  /**
   * Optimize full schedule using AI (batch mode)
   */
  static async optimizeFullSchedule(
    scheduleClasses: ScheduleClass[],
    performances: Map<string, ClassPerformance>,
    trainerMetrics: Map<string, TrainerMetrics>,
    rules: OptimizationRules
  ): Promise<AIOptimizationResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: {
          code: 'API_UNAVAILABLE',
          message: 'AI service is not available. Please check your API key configuration.',
          timestamp: new Date()
        },
        suggestions: [],
        insights: [],
        projectedImpact: { fillRateChange: 0, attendanceChange: 0, trainerUtilizationChange: 0 }
      };
    }
    
    // Build comprehensive prompt for full schedule
    const prompt = this.buildFullSchedulePrompt(scheduleClasses, performances, trainerMetrics, rules);
    
    try {
      const result = await Promise.race([
        this.model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 45000)
        )
      ]);
      
      const response = await (result as any).response;
      const text = response.text();
      
      return this.parseAIResponse(text, scheduleClasses);
      
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.message === 'Timeout' ? 'TIMEOUT' : 'UNKNOWN',
          message: error.message === 'Timeout' 
            ? 'AI request timed out. Try optimizing individual days instead.'
            : 'Failed to optimize schedule. Please try again.',
          timestamp: new Date()
        },
        suggestions: [],
        insights: [],
        projectedImpact: { fillRateChange: 0, attendanceChange: 0, trainerUtilizationChange: 0 }
      };
    }
  }
  
  /**
   * Build prompt for full schedule optimization
   */
  private static buildFullSchedulePrompt(
    scheduleClasses: ScheduleClass[],
    performances: Map<string, ClassPerformance>,
    trainerMetrics: Map<string, TrainerMetrics>,
    rules: OptimizationRules
  ): string {
    // Find underperforming classes
    const underperforming = scheduleClasses.filter(cls => {
      const key = `${cls.class}-${cls.trainer}-${cls.day}-${cls.time}-${cls.location}`;
      const perf = performances.get(key);
      return !perf || perf.avgFillRate < 55;
    }).slice(0, 20); // Limit to prevent prompt from being too large
    
    // Get top trainers needing hours
    const trainersNeedingHours = Array.from(trainerMetrics.values())
      .filter(t => t.hoursToTarget > 2)
      .sort((a, b) => b.hoursToTarget - a.hoursToTarget)
      .slice(0, 10)
      .map(t => ({
        name: t.name,
        hoursNeeded: t.hoursToTarget,
        bestFormats: t.bestFormats.slice(0, 3),
        avgFill: t.avgFillRate.toFixed(0) + '%'
      }));
    
    // Get top performing class-trainer combos
    const topCombos = Array.from(performances.values())
      .filter(p => p.avgFillRate >= 75)
      .sort((a, b) => b.avgFillRate - a.avgFillRate)
      .slice(0, 15)
      .map(p => ({
        class: p.className,
        trainer: p.trainer,
        fillRate: p.avgFillRate.toFixed(0) + '%',
        day: p.day,
        time: p.time
      }));
    
    return `You are an expert fitness studio schedule optimizer. Analyze this full weekly schedule and provide strategic recommendations.

## UNDERPERFORMING CLASSES (need optimization)
${JSON.stringify(underperforming.map(c => ({
  day: c.day,
  time: c.time,
  class: c.class,
  trainer: c.trainer,
  location: c.location
})), null, 2)}

## TRAINERS NEEDING MORE HOURS
${JSON.stringify(trainersNeedingHours, null, 2)}

## TOP PERFORMING COMBINATIONS (proven success)
${JSON.stringify(topCombos, null, 2)}

## RULES
- Target hours: ${rules.targetTrainerHours}/week
- Max hours: ${rules.maxTrainerHours}/week
- Strategy: ${rules.strategy}
- Blocked trainers: ${rules.blockedTrainers.join(', ') || 'none'}

## TASK
1. Replace underperforming classes with proven successful combinations
2. Use trainers who need hours and have proven track records
3. Maintain format diversity
4. Maximize overall fill rates

## RESPONSE FORMAT (JSON only)
{
  "suggestions": [
    {
      "type": "replace_trainer",
      "originalClass": "class name",
      "originalTrainer": "trainer name",
      "originalTime": "HH:MM",
      "suggestedClass": "class name",
      "suggestedTrainer": "trainer name",
      "suggestedTime": "HH:MM",
      "reason": "specific reason with data",
      "confidence": 80,
      "dataPoints": ["data point 1", "data point 2"]
    }
  ],
  "insights": [
    "Strategic insight about the schedule"
  ],
  "projectedImpact": {
    "fillRateChange": 8.5,
    "attendanceChange": 25
  }
}

Provide 5-10 high-impact suggestions prioritized by potential improvement.`;
  }
}

// ================== EXPORTS ==================

export const modularOptimizer = {
  DataAnalyzer,
  RuleBasedOptimizer,
  AIOptimizer
};
