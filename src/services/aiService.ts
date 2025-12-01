import { GoogleGenerativeAI } from '@google/generative-ai';
import { SessionData } from '../types';

// Load API key from environment variables
const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
const USE_MOCK_AI = import.meta.env.VITE_USE_MOCK_AI === 'true';

// Rich historical analysis interface
interface HistoricalAnalysis {
  classPerformance: Map<string, {
    avgCheckIns: number;
    avgFillRate: number;
    totalSessions: number;
    trend: 'up' | 'down' | 'stable';
    revenue: number;
    bestTrainers: Array<{ name: string; avgFill: number; sessions: number }>;
    bestDays: Array<{ day: string; avgFill: number }>;
    bestTimes: Array<{ time: string; avgFill: number }>;
    cancelRate: number;
  }>;
  trainerPerformance: Map<string, {
    avgFillRate: number;
    avgCheckIns: number;
    totalSessions: number;
    bestFormats: string[];
    bestDays: string[];
    bestTimes: string[];
    consistency: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  timeSlotPerformance: Map<string, {
    avgFillRate: number;
    avgCheckIns: number;
    bestFormats: string[];
    worstFormats: string[];
  }>;
  locationPerformance: Map<string, {
    avgFillRate: number;
    totalClasses: number;
    topClasses: string[];
    underperformingClasses: string[];
    beginnerClassCount: { morning: number; evening: number };
  }>;
}

class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    try {
      console.log('AI Service initialized with:', {
        hasApiKey: !!API_KEY,
        apiKeyLength: API_KEY?.length || 0,
        useMockAI: USE_MOCK_AI
      });
      
      if (!USE_MOCK_AI && API_KEY && API_KEY.length > 20) {
        this.genAI = new GoogleGenerativeAI(API_KEY);
        
        // Use gemini-2.0-flash-lite for schedule optimization
        this.model = this.genAI.getGenerativeModel({ 
          model: 'gemini-2.0-flash-lite',
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        });
        
        console.log('Google AI initialized successfully with gemini-2.0-flash-lite');
      } else {
        console.log('Using mock AI responses');
      }
    } catch (error) {
      console.warn('Failed to initialize Gemini AI, using mock responses:', error);
    }
  }

  /**
   * Build comprehensive historical analysis from raw data
   * This is the foundation for intelligent optimization
   */
  private buildHistoricalAnalysis(data: SessionData[]): HistoricalAnalysis {
    const classPerformance = new Map<string, {
      checkIns: number[];
      fillRates: number[];
      revenue: number[];
      cancelRates: number[];
      trainers: Map<string, { fills: number[]; checkIns: number[] }>;
      days: Map<string, number[]>;
      times: Map<string, number[]>;
    }>();

    const trainerPerformance = new Map<string, {
      fillRates: number[];
      checkIns: number[];
      formats: Map<string, number[]>;
      days: Map<string, number[]>;
      times: Map<string, number[]>;
    }>();

    const timeSlotPerformance = new Map<string, {
      fillRates: number[];
      checkIns: number[];
      formats: Map<string, number[]>;
    }>();

    const locationPerformance = new Map<string, {
      fillRates: number[];
      classes: Map<string, number[]>;
      beginnerMorning: number;
      beginnerEvening: number;
    }>();

    // Process each session
    data.forEach(session => {
      const className = session.Class || 'Unknown';
      const trainer = session.Trainer || 'Unknown';
      const day = session.Day || 'Unknown';
      const time = session.Time?.substring(0, 5) || '00:00';
      const location = session.Location || 'Unknown';
      const fillRate = session.FillRate || 0;
      const checkIns = session.CheckedIn || 0;
      const revenue = session.Revenue || 0;
      const capacity = session.Capacity || 20;
      const cancelled = session.LateCancelled || 0;
      const cancelRate = capacity > 0 ? (cancelled / capacity) * 100 : 0;

      // Class performance
      if (!classPerformance.has(className)) {
        classPerformance.set(className, {
          checkIns: [], fillRates: [], revenue: [], cancelRates: [],
          trainers: new Map(), days: new Map(), times: new Map()
        });
      }
      const classPerfEntry = classPerformance.get(className)!;
      classPerfEntry.checkIns.push(checkIns);
      classPerfEntry.fillRates.push(fillRate);
      classPerfEntry.revenue.push(revenue);
      classPerfEntry.cancelRates.push(cancelRate);
      
      if (!classPerfEntry.trainers.has(trainer)) {
        classPerfEntry.trainers.set(trainer, { fills: [], checkIns: [] });
      }
      classPerfEntry.trainers.get(trainer)!.fills.push(fillRate);
      classPerfEntry.trainers.get(trainer)!.checkIns.push(checkIns);
      
      if (!classPerfEntry.days.has(day)) classPerfEntry.days.set(day, []);
      classPerfEntry.days.get(day)!.push(fillRate);
      
      if (!classPerfEntry.times.has(time)) classPerfEntry.times.set(time, []);
      classPerfEntry.times.get(time)!.push(fillRate);

      // Trainer performance
      if (!trainerPerformance.has(trainer)) {
        trainerPerformance.set(trainer, {
          fillRates: [], checkIns: [],
          formats: new Map(), days: new Map(), times: new Map()
        });
      }
      const trainerPerfEntry = trainerPerformance.get(trainer)!;
      trainerPerfEntry.fillRates.push(fillRate);
      trainerPerfEntry.checkIns.push(checkIns);
      
      if (!trainerPerfEntry.formats.has(className)) trainerPerfEntry.formats.set(className, []);
      trainerPerfEntry.formats.get(className)!.push(fillRate);
      
      if (!trainerPerfEntry.days.has(day)) trainerPerfEntry.days.set(day, []);
      trainerPerfEntry.days.get(day)!.push(fillRate);
      
      if (!trainerPerfEntry.times.has(time)) trainerPerfEntry.times.set(time, []);
      trainerPerfEntry.times.get(time)!.push(fillRate);

      // Time slot performance
      const timeKey = `${day}-${time}`;
      if (!timeSlotPerformance.has(timeKey)) {
        timeSlotPerformance.set(timeKey, { fillRates: [], checkIns: [], formats: new Map() });
      }
      const timePerfEntry = timeSlotPerformance.get(timeKey)!;
      timePerfEntry.fillRates.push(fillRate);
      timePerfEntry.checkIns.push(checkIns);
      
      if (!timePerfEntry.formats.has(className)) timePerfEntry.formats.set(className, []);
      timePerfEntry.formats.get(className)!.push(fillRate);

      // Location performance
      if (!locationPerformance.has(location)) {
        locationPerformance.set(location, {
          fillRates: [], classes: new Map(), beginnerMorning: 0, beginnerEvening: 0
        });
      }
      const locPerfEntry = locationPerformance.get(location)!;
      locPerfEntry.fillRates.push(fillRate);
      
      if (!locPerfEntry.classes.has(className)) locPerfEntry.classes.set(className, []);
      locPerfEntry.classes.get(className)!.push(fillRate);
      
      // Track beginner classes
      if (this.isBeginnerFormat(className)) {
        const hour = parseInt(time.split(':')[0] || '12');
        if (hour < 14) locPerfEntry.beginnerMorning++;
        else locPerfEntry.beginnerEvening++;
      }
    });

    // Transform raw data into analysis
    const classAnalysis = new Map<string, any>();
    classPerformance.forEach((value, className) => {
      const avgFill = this.average(value.fillRates);
      const avgCheckIns = this.average(value.checkIns);
      
      // Calculate trend
      const mid = Math.floor(value.fillRates.length / 2);
      const firstHalf = value.fillRates.slice(0, mid);
      const secondHalf = value.fillRates.slice(mid);
      const firstAvg = this.average(firstHalf);
      const secondAvg = this.average(secondHalf);
      const trend = secondAvg > firstAvg * 1.1 ? 'up' : secondAvg < firstAvg * 0.9 ? 'down' : 'stable';

      // Best trainers for this class
      const bestTrainers = Array.from(value.trainers.entries())
        .map(([name, data]) => ({
          name,
          avgFill: this.average(data.fills),
          sessions: data.fills.length
        }))
        .filter(t => t.sessions >= 2)
        .sort((a, b) => b.avgFill - a.avgFill)
        .slice(0, 5);

      // Best days for this class
      const bestDays = Array.from(value.days.entries())
        .map(([day, fills]) => ({ day, avgFill: this.average(fills) }))
        .sort((a, b) => b.avgFill - a.avgFill);

      // Best times for this class
      const bestTimes = Array.from(value.times.entries())
        .map(([time, fills]) => ({ time, avgFill: this.average(fills) }))
        .sort((a, b) => b.avgFill - a.avgFill);

      classAnalysis.set(className, {
        avgCheckIns: Math.round(avgCheckIns * 10) / 10,
        avgFillRate: Math.round(avgFill),
        totalSessions: value.fillRates.length,
        trend,
        revenue: value.revenue.reduce((a, b) => a + b, 0),
        bestTrainers,
        bestDays,
        bestTimes,
        cancelRate: this.average(value.cancelRates)
      });
    });

    const trainerAnalysis = new Map<string, any>();
    trainerPerformance.forEach((value, trainer) => {
      const avgFill = this.average(value.fillRates);
      
      // Calculate trend
      const mid = Math.floor(value.fillRates.length / 2);
      const firstAvg = this.average(value.fillRates.slice(0, mid));
      const secondAvg = this.average(value.fillRates.slice(mid));
      const trend = secondAvg > firstAvg * 1.1 ? 'up' : secondAvg < firstAvg * 0.9 ? 'down' : 'stable';

      // Consistency (standard deviation based)
      const stdDev = this.standardDeviation(value.fillRates);
      const consistency = Math.max(0, 100 - stdDev);

      // Best formats
      const bestFormats = Array.from(value.formats.entries())
        .map(([format, fills]) => ({ format, avgFill: this.average(fills), count: fills.length }))
        .filter(f => f.count >= 2)
        .sort((a, b) => b.avgFill - a.avgFill)
        .slice(0, 5)
        .map(f => f.format);

      // Best days
      const bestDays = Array.from(value.days.entries())
        .map(([day, fills]) => ({ day, avgFill: this.average(fills) }))
        .sort((a, b) => b.avgFill - a.avgFill)
        .slice(0, 3)
        .map(d => d.day);

      // Best times
      const bestTimes = Array.from(value.times.entries())
        .map(([time, fills]) => ({ time, avgFill: this.average(fills) }))
        .sort((a, b) => b.avgFill - a.avgFill)
        .slice(0, 3)
        .map(t => t.time);

      trainerAnalysis.set(trainer, {
        avgFillRate: Math.round(avgFill),
        avgCheckIns: Math.round(this.average(value.checkIns) * 10) / 10,
        totalSessions: value.fillRates.length,
        bestFormats,
        bestDays,
        bestTimes,
        consistency: Math.round(consistency),
        trend
      });
    });

    const timeSlotAnalysis = new Map<string, any>();
    timeSlotPerformance.forEach((value, timeKey) => {
      const formatPerf = Array.from(value.formats.entries())
        .map(([format, fills]) => ({ format, avgFill: this.average(fills) }))
        .sort((a, b) => b.avgFill - a.avgFill);

      timeSlotAnalysis.set(timeKey, {
        avgFillRate: Math.round(this.average(value.fillRates)),
        avgCheckIns: Math.round(this.average(value.checkIns) * 10) / 10,
        bestFormats: formatPerf.slice(0, 3).map(f => f.format),
        worstFormats: formatPerf.slice(-3).map(f => f.format)
      });
    });

    const locationAnalysis = new Map<string, any>();
    locationPerformance.forEach((value, location) => {
      const classPerf = Array.from(value.classes.entries())
        .map(([cls, fills]) => ({ class: cls, avgFill: this.average(fills) }))
        .sort((a, b) => b.avgFill - a.avgFill);

      locationAnalysis.set(location, {
        avgFillRate: Math.round(this.average(value.fillRates)),
        totalClasses: value.fillRates.length,
        topClasses: classPerf.slice(0, 5).map(c => c.class),
        underperformingClasses: classPerf.filter(c => c.avgFill < 60).map(c => c.class),
        beginnerClassCount: {
          morning: value.beginnerMorning,
          evening: value.beginnerEvening
        }
      });
    });

    return {
      classPerformance: classAnalysis,
      trainerPerformance: trainerAnalysis,
      timeSlotPerformance: timeSlotAnalysis,
      locationPerformance: locationAnalysis
    };
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

  /**
   * AI-powered strategic schedule optimization
   * Uses deep historical analysis to generate intelligent, data-backed recommendations
   */
  async optimizeScheduleWithAI(
    historicalData: SessionData[],
    activeClasses: any[],
    rules: {
      targetFillRate?: number;
      minSessionsForAnalysis?: number;
      formatMixTargets?: Record<string, number>;
      trainerPreferences?: Record<string, string[]>;
      excludeTrainers?: string[];
      excludeFormats?: string[];
      focusLocations?: string[];
      optimizationGoal?: 'attendance' | 'revenue' | 'balanced' | 'format_diversity';
      requireBeginnerMix?: boolean;
    }
  ): Promise<{
    replacements: Array<{
      original: { className: string; trainer: string; day: string; time: string; location: string; avgCheckIns: number; fillRate: number; id?: string };
      replacement: { className: string; trainer: string; reason: string; projectedCheckIns: number; projectedFillRate: number; confidence: number; isAIOptimized: boolean; dataPoints?: string[] };
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
      isAIOptimized: boolean;
      dataPoints?: string[];
    }>;
    formatMixAnalysis: {
      current: Record<string, number>;
      recommended: Record<string, number>;
      adjustments: string[];
    };
    insights: string[];
    recommendations: Array<{
      type: 'swap' | 'add' | 'remove' | 'time_change' | 'trainer_change';
      title: string;
      description: string;
      reasoning: string;
      impact: string;
      confidence: number;
      dataPoints: string[];
      alternatives?: string[];
      actionData?: any;
    }>;
  }> {
    console.log('Starting AI optimization with', historicalData.length, 'historical records');
    
    // Build comprehensive historical analysis (done async-friendly)
    const analysis = this.buildHistoricalAnalysis(historicalData);
    
    // Filter out excluded trainers and formats
    const excludedTrainers = (rules.excludeTrainers || []).map(t => t.toLowerCase());
    const excludedFormats = (rules.excludeFormats || ['hosted', 'host', 'guest']).map(f => f.toLowerCase());
    const targetFillRate = rules.targetFillRate || 70;
    const minSessions = rules.minSessionsForAnalysis || 4;

    // Identify underperforming classes from active schedule
    const underperformingClasses: any[] = [];
    const highPerformingClasses: any[] = [];

    activeClasses.forEach(cls => {
      const classLower = (cls.class || cls.className || '').toLowerCase();
      const trainerLower = (cls.trainer || '').toLowerCase();
      
      // Skip excluded
      if (excludedTrainers.some(et => trainerLower.includes(et))) return;
      if (excludedFormats.some(ef => classLower.includes(ef))) return;

      const fillRate = cls.fillRate || 0;
      const avgCheckIns = cls.avgCheckIns || 0;
      const sessionCount = cls.sessionCount || 0;

      if (sessionCount >= minSessions) {
        if (fillRate < targetFillRate) {
          underperformingClasses.push({
            id: cls.id,
            className: cls.class || cls.className,
            trainer: cls.trainer,
            day: cls.day,
            time: cls.time,
            location: cls.location,
            fillRate,
            avgCheckIns,
            sessionCount
          });
        } else if (fillRate >= 75) {
          highPerformingClasses.push({
            id: cls.id,
            className: cls.class || cls.className,
            trainer: cls.trainer,
            day: cls.day,
            time: cls.time,
            location: cls.location,
            fillRate,
            avgCheckIns,
            sessionCount
          });
        }
      }
    });

    // Sort underperformers by fill rate (worst first)
    underperformingClasses.sort((a, b) => a.fillRate - b.fillRate);

    // Try AI optimization
    if (!USE_MOCK_AI && this.model) {
      try {
        return await this.generateDeepAIOptimizations(
          analysis,
          underperformingClasses.slice(0, 10),
          highPerformingClasses.slice(0, 15),
          activeClasses,
          rules,
          excludedTrainers,
          excludedFormats
        );
      } catch (error) {
        console.error('AI optimization failed, using algorithmic approach:', error);
      }
    }

    // Fallback to smart algorithmic optimization
    return this.generateSmartAlgorithmicOptimizations(
      analysis,
      underperformingClasses,
      highPerformingClasses,
      activeClasses,
      rules,
      excludedTrainers,
      excludedFormats
    );
  }

  /**
   * Deep AI-powered optimization with extended thinking
   */
  private async generateDeepAIOptimizations(
    analysis: HistoricalAnalysis,
    underperformers: any[],
    topPerformers: any[],
    activeClasses: any[],
    rules: any,
    excludedTrainers: string[],
    excludedFormats: string[]
  ): Promise<any> {
    // Build rich context for AI
    const classData = Array.from(analysis.classPerformance.entries())
      .filter(([name]) => !excludedFormats.some(ef => name.toLowerCase().includes(ef)))
      .slice(0, 20)
      .map(([name, data]) => ({
        name,
        fill: data.avgFillRate,
        sessions: data.totalSessions,
        trend: data.trend,
        bestTrainers: data.bestTrainers.slice(0, 3).map((t: any) => `${t.name}(${Math.round(t.avgFill)}%)`).join(', '),
        bestDays: data.bestDays.slice(0, 2).map((d: any) => d.day).join(', '),
        bestTimes: data.bestTimes.slice(0, 2).map((t: any) => t.time).join(', ')
      }));

    const trainerData = Array.from(analysis.trainerPerformance.entries())
      .filter(([name]) => !excludedTrainers.some(et => name.toLowerCase().includes(et)))
      .slice(0, 15)
      .map(([name, data]) => ({
        name,
        fill: data.avgFillRate,
        sessions: data.totalSessions,
        trend: data.trend,
        consistency: data.consistency,
        bestFormats: data.bestFormats.slice(0, 3).join(', '),
        bestDays: data.bestDays.join(', ')
      }));

    const locationData = Array.from(analysis.locationPerformance.entries())
      .map(([name, data]) => ({
        name,
        fill: data.avgFillRate,
        topClasses: data.topClasses.slice(0, 3).join(', '),
        underperforming: data.underperformingClasses.slice(0, 3).join(', '),
        beginnerMorning: data.beginnerClassCount.morning,
        beginnerEvening: data.beginnerClassCount.evening
      }));

    const underperformerData = underperformers.map(u => ({
      class: u.className,
      trainer: u.trainer,
      day: u.day,
      time: u.time,
      location: u.location,
      fill: u.fillRate,
      checkIns: u.avgCheckIns
    }));

    // Build comprehensive prompt for deep thinking
    const prompt = `You are an expert fitness studio schedule optimizer. Analyze this data and provide SPECIFIC, DATA-BACKED recommendations.

## HISTORICAL PERFORMANCE DATA

### Classes (sorted by fill rate):
${JSON.stringify(classData, null, 1)}

### Trainers:
${JSON.stringify(trainerData, null, 1)}

### Locations:
${JSON.stringify(locationData, null, 1)}

### UNDERPERFORMING CLASSES TO OPTIMIZE:
${JSON.stringify(underperformerData, null, 1)}

## RULES
- Goal: ${rules.optimizationGoal || 'balanced'} optimization
- Target fill rate: ${rules.targetFillRate || 70}%
- EXCLUDED trainers (never use): ${excludedTrainers.join(', ') || 'none'}
- EXCLUDED formats (never schedule): ${excludedFormats.join(', ') || 'none'}
- Each shift (morning/evening) at each location MUST have at least 1 beginner-friendly class
- Same trainer cannot be scheduled at same time in different locations
- Same class cannot run at same time in same location
- IMPORTANT: Use historical data to justify EVERY change. If you suggest a trainer, they MUST have a history of high performance (fill rate > 75%) for that specific format or time.
- DO NOT suggest generic changes. Every suggestion must be backed by the provided historical stats.

## REQUIRED OUTPUT
Provide a JSON response with detailed, data-backed recommendations:

{
  "replacements": [
    {
      "original": {
        "className": "exact class name",
        "trainer": "exact trainer name",
        "day": "day",
        "time": "HH:MM",
        "location": "location"
      },
      "replacement": {
        "className": "replacement class based on data",
        "trainer": "best trainer for this class based on their performance data",
        "reason": "Detailed explanation referencing specific data (e.g. 'Trainer X has 85% fill rate in this format vs current 45%')",
        "projectedFillRate": 85,
        "projectedCheckIns": 17,
        "confidence": 88,
        "dataPoints": [
          "Trainer X has 92% fill rate for this format",
          "This class performs 30% better at this time slot",
          "Historical avg of 17 check-ins for this combination"
        ]
      }
    }
  ],
  "recommendations": [
    {
      "type": "swap|add|remove|time_change|trainer_change",
      "title": "Clear action title",
      "description": "What to do",
      "reasoning": "WHY this will work based on the data",
      "impact": "Expected improvement with specific numbers",
      "confidence": 85,
      "dataPoints": [
        "Specific data point 1",
        "Specific data point 2"
      ],
      "alternatives": ["Alternative option 1", "Alternative option 2"]
    }
  ],
  "insights": [
    "Key insight 1 with specific data references",
    "Key insight 2 with specific data references"
  ]
}

IMPORTANT: 
- Reference ACTUAL data from above in your reasoning
- Include specific numbers (fill rates, check-ins) in dataPoints
- Each recommendation must have clear reasoning based on historical performance
- Prioritize trainers based on their actual performance with each format`;

    console.log('Sending to AI for deep analysis...');
    
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('AI response received, parsing...');

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiResult = JSON.parse(jsonMatch[0]);
        
        // Enrich replacements with original data
        const enrichedReplacements = (aiResult.replacements || []).map((r: any) => {
          const matchingUnderperformer = underperformers.find(u => 
            u.className?.toLowerCase() === r.original?.className?.toLowerCase() &&
            u.trainer?.toLowerCase() === r.original?.trainer?.toLowerCase()
          );
          
          return {
            original: {
              className: r.original?.className || '',
              trainer: r.original?.trainer || '',
              day: r.original?.day || matchingUnderperformer?.day || '',
              time: r.original?.time || matchingUnderperformer?.time || '',
              location: r.original?.location || matchingUnderperformer?.location || '',
              avgCheckIns: matchingUnderperformer?.avgCheckIns || 0,
              fillRate: matchingUnderperformer?.fillRate || 0,
              id: matchingUnderperformer?.id
            },
            replacement: {
              className: r.replacement?.className || '',
              trainer: r.replacement?.trainer || '',
              reason: r.replacement?.reason || 'AI optimization based on historical performance',
              projectedCheckIns: r.replacement?.projectedCheckIns || 15,
              projectedFillRate: r.replacement?.projectedFillRate || 80,
              confidence: r.replacement?.confidence || 75,
              isAIOptimized: true,
              dataPoints: r.replacement?.dataPoints || []
            }
          };
        });

        // Parse format mix from current schedule
        const formatCounts: Record<string, number> = {};
        activeClasses.forEach(cls => {
          const format = this.extractFormat(cls.class || cls.className || '');
          formatCounts[format] = (formatCounts[format] || 0) + 1;
        });
        const totalClasses = activeClasses.length;
        const formatMix: Record<string, number> = {};
        Object.entries(formatCounts).forEach(([format, count]) => {
          formatMix[format] = Math.round((count / totalClasses) * 100);
        });

        return {
          replacements: enrichedReplacements,
          newClasses: [],
          formatMixAnalysis: {
            current: formatMix,
            recommended: this.getRecommendedFormatMix(formatMix),
            adjustments: this.getFormatAdjustments(formatMix, rules.formatMixTargets)
          },
          insights: aiResult.insights || [],
          recommendations: (aiResult.recommendations || []).map((r: any) => ({
            type: r.type || 'swap',
            title: r.title || 'Optimization',
            description: r.description || '',
            reasoning: r.reasoning || r.reason || '',
            impact: r.impact || 'Improved performance expected',
            confidence: r.confidence || 75,
            dataPoints: r.dataPoints || [],
            alternatives: r.alternatives || [],
            actionData: r.actionData || null
          }))
        };
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e, text);
    }

    // Fallback to algorithmic
    return this.generateSmartAlgorithmicOptimizations(
      analysis,
      underperformers,
      topPerformers,
      activeClasses,
      rules,
      excludedTrainers,
      excludedFormats
    );
  }

  /**
   * Smart algorithmic optimization when AI is unavailable
   * Uses historical analysis for data-backed recommendations
   */
  private generateSmartAlgorithmicOptimizations(
    analysis: HistoricalAnalysis,
    underperformers: any[],
    topPerformers: any[],
    activeClasses: any[],
    rules: any,
    excludedTrainers: string[],
    excludedFormats: string[]
  ): any {
    const replacements: any[] = [];
    const recommendations: any[] = [];
    const insights: string[] = [];

    // Track trainer schedules to avoid conflicts
    const trainerSchedule = new Map<string, Set<string>>();
    activeClasses.forEach(cls => {
      const trainer = (cls.trainer || '').toLowerCase();
      if (!trainerSchedule.has(trainer)) {
        trainerSchedule.set(trainer, new Set());
      }
      trainerSchedule.get(trainer)!.add(`${cls.day}-${cls.time}`);
    });

    // Process each underperformer
    underperformers.slice(0, 8).forEach(underperformer => {
      const timeSlotKey = `${underperformer.day}-${underperformer.time}`;

      // Find best class for this time slot based on historical data
      const timeSlotData = analysis.timeSlotPerformance.get(timeSlotKey);
      // Use time slot data to prioritize formats that work well
      const slotBestFormats = timeSlotData?.bestFormats || [];

      // Find best replacement class
      let bestClass: string | null = null;
      let bestTrainer: string | null = null;
      let bestFillRate = 0;
      let dataPoints: string[] = [];

      // Look through top performers to find best match
      for (const [className, classData] of analysis.classPerformance.entries()) {
        // Skip excluded formats
        if (excludedFormats.some(ef => className.toLowerCase().includes(ef))) continue;
        
        // Skip if same class
        if (className.toLowerCase() === underperformer.className?.toLowerCase()) continue;
        
        // Bonus if this format works well at this time slot
        const slotBonus = slotBestFormats.includes(className) ? 10 : 0;

        // Check if this class performs well at this time
        const classTimePerf = classData.bestTimes.find((t: any) => t.time === underperformer.time);
        const classDayPerf = classData.bestDays.find((d: any) => d.day === underperformer.day);
        
        if (classData.avgFillRate >= 70 && classData.totalSessions >= 4) {
          // Find best trainer for this class who is available
          for (const trainerInfo of classData.bestTrainers) {
            const trainerLower = trainerInfo.name.toLowerCase();
            
            // Skip excluded trainers
            if (excludedTrainers.some(et => trainerLower.includes(et))) continue;
            
            // Check if trainer is available at this time
            const trainerSlots = trainerSchedule.get(trainerLower);
            const isAvailable = !trainerSlots?.has(timeSlotKey);
            
            // Calculate effective fill rate with slot bonus
            const effectiveFillRate = trainerInfo.avgFill + slotBonus;
            
            if (isAvailable && effectiveFillRate >= bestFillRate) {
              bestFillRate = effectiveFillRate;
              bestClass = className;
              bestTrainer = trainerInfo.name;
              
              dataPoints = [
                `${trainerInfo.name} has ${Math.round(trainerInfo.avgFill)}% fill rate teaching ${className}`,
                `${className} averages ${classData.avgFillRate}% fill rate overall`,
                `Based on ${classData.totalSessions} historical sessions`
              ];
              
              if (slotBonus > 0) {
                dataPoints.push(`${className} is a top format for this time slot`);
              }
              if (classTimePerf) {
                dataPoints.push(`${className} performs ${Math.round(classTimePerf.avgFill)}% at ${underperformer.time}`);
              }
              if (classDayPerf) {
                dataPoints.push(`${className} performs ${Math.round(classDayPerf.avgFill)}% on ${underperformer.day}s`);
              }
            }
          }
        }
      }

      if (bestClass && bestTrainer) {
        replacements.push({
          original: {
            className: underperformer.className,
            trainer: underperformer.trainer,
            day: underperformer.day,
            time: underperformer.time,
            location: underperformer.location,
            avgCheckIns: underperformer.avgCheckIns,
            fillRate: underperformer.fillRate,
            id: underperformer.id
          },
          replacement: {
            className: bestClass,
            trainer: bestTrainer,
            reason: `Replace ${underperformer.className} (${underperformer.fillRate}% fill) with ${bestClass} taught by ${bestTrainer}. Historical data shows ${bestTrainer} achieves ${Math.round(bestFillRate)}% fill rate for ${bestClass}.`,
            projectedCheckIns: Math.round(underperformer.avgCheckIns * (bestFillRate / Math.max(underperformer.fillRate, 1))),
            projectedFillRate: Math.round(bestFillRate),
            confidence: Math.min(95, 60 + Math.round(bestFillRate - underperformer.fillRate)),
            isAIOptimized: true,
            dataPoints
          }
        });

        // Update trainer schedule
        if (!trainerSchedule.has(bestTrainer.toLowerCase())) {
          trainerSchedule.set(bestTrainer.toLowerCase(), new Set());
        }
        trainerSchedule.get(bestTrainer.toLowerCase())!.add(timeSlotKey);
      }
    });

    // Generate location-specific recommendations
    analysis.locationPerformance.forEach((locData, location) => {
      // Check beginner class balance
      if (locData.beginnerClassCount.morning === 0) {
        recommendations.push({
          type: 'add',
          title: `Add Morning Beginner Class at ${location}`,
          description: `No beginner-friendly classes in morning shift at ${location}. Add a basics or essentials class.`,
          reasoning: 'New members and beginners prefer morning classes. Having at least one beginner-friendly option increases retention.',
          impact: 'Capture 15-20% of new member signups who prefer morning workouts',
          confidence: 88,
          dataPoints: [
            `${location} has ${locData.beginnerClassCount.evening} beginner classes in evening only`,
            `Morning beginner classes typically achieve 75%+ fill rate`
          ],
          alternatives: ['Yoga Basics', 'Pilates Essentials', 'Core Foundations', 'Stretch & Restore']
        });
      }

      if (locData.beginnerClassCount.evening === 0) {
        recommendations.push({
          type: 'add',
          title: `Add Evening Beginner Class at ${location}`,
          description: `No beginner-friendly classes in evening shift at ${location}. Working professionals need accessible options.`,
          reasoning: 'Evening is peak time for working professionals. Beginner options help convert new members.',
          impact: 'Increase evening attendance by 10-15% with accessible class options',
          confidence: 85,
          dataPoints: [
            `${location} has ${locData.beginnerClassCount.morning} beginner classes in morning only`,
            `Evening classes at ${location} average ${locData.avgFillRate}% fill rate`
          ],
          alternatives: ['Gentle Flow', 'Yoga Essentials', 'Beginner Pilates', 'Mindful Movement']
        });
      }

      // Recommend removing consistently underperforming classes
      locData.underperformingClasses.slice(0, 2).forEach(cls => {
        const classData = analysis.classPerformance.get(cls);
        if (classData && classData.avgFillRate < 50 && classData.totalSessions >= 6) {
          recommendations.push({
            type: 'remove',
            title: `Consider Removing ${cls} at ${location}`,
            description: `${cls} consistently underperforms at ${location} with only ${classData.avgFillRate}% fill rate.`,
            reasoning: `With ${classData.totalSessions} sessions analyzed, the low fill rate indicates poor demand for this format at this location.`,
            impact: `Free up slot for higher-performing format, potential 30-40% attendance increase`,
            confidence: 80,
            dataPoints: [
              `${cls} averages ${classData.avgFillRate}% fill rate at ${location}`,
              `Trend: ${classData.trend}`,
              `Better alternatives: ${locData.topClasses.slice(0, 3).join(', ')}`
            ],
            alternatives: locData.topClasses.slice(0, 4)
          });
        }
      });
    });

    // Generate trainer-specific recommendations
    const trainersSortedByPerf = Array.from(analysis.trainerPerformance.entries())
      .filter(([name]) => !excludedTrainers.some(et => name.toLowerCase().includes(et)))
      .sort((a, b) => b[1].avgFillRate - a[1].avgFillRate);

    // Top performers - recommend expanding
    trainersSortedByPerf.slice(0, 3).forEach(([trainerName, data]) => {
      if (data.avgFillRate >= 80 && data.consistency >= 70) {
        recommendations.push({
          type: 'add',
          title: `Expand ${trainerName}'s Schedule`,
          description: `${trainerName} is a top performer with ${data.avgFillRate}% fill rate and ${data.consistency}% consistency.`,
          reasoning: `High-performing trainers drive member retention. ${trainerName} excels in ${data.bestFormats.slice(0, 2).join(' and ')}.`,
          impact: `Each additional class by ${trainerName} could generate 15+ check-ins based on historical performance`,
          confidence: 90,
          dataPoints: [
            `${data.avgFillRate}% average fill rate across ${data.totalSessions} sessions`,
            `Best formats: ${data.bestFormats.join(', ')}`,
            `Best days: ${data.bestDays.join(', ')}`,
            `Trend: ${data.trend}`
          ],
          alternatives: data.bestFormats.slice(0, 4)
        });
      }
    });

    // Generate insights based on data
    if (underperformers.length > 0) {
      const avgUnderperformerFill = underperformers.reduce((sum, u) => sum + u.fillRate, 0) / underperformers.length;
      insights.push(`📉 ${underperformers.length} classes performing below target with average ${Math.round(avgUnderperformerFill)}% fill rate. Top ${replacements.length} have been optimized.`);
    }

    if (topPerformers.length > 0) {
      const avgTopFill = topPerformers.reduce((sum, t) => sum + t.fillRate, 0) / topPerformers.length;
      insights.push(`⭐ Your top ${topPerformers.length} classes average ${Math.round(avgTopFill)}% fill rate. These formats and trainers inform the replacement suggestions.`);
    }

    const topTrainer = trainersSortedByPerf[0];
    if (topTrainer) {
      insights.push(`🏆 ${topTrainer[0]} leads with ${topTrainer[1].avgFillRate}% fill rate in ${topTrainer[1].bestFormats[0]}. Consider expanding their schedule.`);
    }

    // Format mix analysis
    const formatCounts: Record<string, number> = {};
    activeClasses.forEach(cls => {
      const format = this.extractFormat(cls.class || cls.className || '');
      formatCounts[format] = (formatCounts[format] || 0) + 1;
    });
    const totalClasses = activeClasses.length;
    const formatMix: Record<string, number> = {};
    Object.entries(formatCounts).forEach(([format, count]) => {
      formatMix[format] = Math.round((count / totalClasses) * 100);
    });

    return {
      replacements,
      newClasses: [],
      formatMixAnalysis: {
        current: formatMix,
        recommended: this.getRecommendedFormatMix(formatMix),
        adjustments: this.getFormatAdjustments(formatMix, rules.formatMixTargets)
      },
      insights,
      recommendations
    };
  }

  private extractFormat(className: string): string {
    const lower = (className || '').toLowerCase();
    if (lower.includes('yoga')) return 'Yoga';
    if (lower.includes('pilates')) return 'Pilates';
    if (lower.includes('hiit') || lower.includes('high intensity')) return 'HIIT';
    if (lower.includes('strength') || lower.includes('conditioning')) return 'Strength';
    if (lower.includes('cycling') || lower.includes('spin')) return 'Cycling';
    if (lower.includes('dance') || lower.includes('zumba')) return 'Dance';
    if (lower.includes('barre')) return 'Barre';
    if (lower.includes('box') || lower.includes('kickbox')) return 'Boxing';
    if (lower.includes('stretch') || lower.includes('restore')) return 'Recovery';
    return 'Other';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getRecommendedFormatMix(_current: Record<string, number>): Record<string, number> {
    return {
      'Yoga': 20,
      'Pilates': 15,
      'HIIT': 15,
      'Strength': 15,
      'Cycling': 10,
      'Dance': 10,
      'Barre': 5,
      'Recovery': 5,
      'Other': 5
    };
  }

  private getFormatAdjustments(current: Record<string, number>, targets?: Record<string, number>): string[] {
    const recommended = targets || this.getRecommendedFormatMix(current);
    const adjustments: string[] = [];

    Object.entries(recommended).forEach(([format, target]) => {
      const currentPct = current[format] || 0;
      const diff = target - currentPct;
      
      if (diff > 5) {
        adjustments.push(`Increase ${format} by ~${Math.round(diff)}% (current: ${currentPct}%, target: ${target}%)`);
      } else if (diff < -5) {
        adjustments.push(`Reduce ${format} by ~${Math.round(-diff)}% (current: ${currentPct}%, target: ${target}%)`);
      }
    });

    return adjustments;
  }

  isBeginnerFormat(className: string): boolean {
    const beginnerKeywords = ['basics', 'essentials', 'beginner', 'gentle', 'intro', 'foundation', 'stretch', 'restore', 'yin', 'restorative', 'easy', 'starter'];
    const lowerClass = (className || '').toLowerCase();
    return beginnerKeywords.some(kw => lowerClass.includes(kw));
  }

  getShift(time: string): 'morning' | 'evening' {
    if (!time) return 'morning';
    const hour = parseInt(time.split(':')[0] || '12');
    return hour < 14 ? 'morning' : 'evening';
  }

  // ========== ORIGINAL METHODS FOR INSIGHTS TAB ==========

  async generateInsights(data: SessionData[]): Promise<string[]> {
    try {
      const dataAnalysis = this.analyzeData(data);
      
      if (USE_MOCK_AI || !this.model) {
        return this.generateMockInsights(dataAnalysis);
      }

      const prompt = `
        Analyze this fitness studio class data and provide 5-7 key insights:

        Data Summary:
        - Total Sessions: ${dataAnalysis.totalSessions}
        - Average Fill Rate: ${dataAnalysis.avgFillRate.toFixed(1)}%
        - Average Class Size: ${dataAnalysis.avgClassSize.toFixed(1)}
        - Top Performing Classes: ${dataAnalysis.topClasses.join(', ')}
        - Low Performing Classes: ${dataAnalysis.lowClasses.join(', ')}
        - Peak Days: ${dataAnalysis.peakDays.join(', ')}
        - Peak Times: ${dataAnalysis.peakTimes.join(', ')}

        Keep each insight concise (1-2 sentences) and actionable.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text.split('\n').filter((line: string) => line.trim().length > 0);
    } catch (error) {
      console.error('Error generating insights:', error);
      return this.generateMockInsights(this.analyzeData(data));
    }
  }

  analyzeData(data: SessionData[]) {
    if (!data || data.length === 0) {
      return {
        totalSessions: 0,
        avgFillRate: 0,
        avgClassSize: 0,
        topClasses: [],
        lowClasses: [],
        peakDays: [],
        peakTimes: [],
        avgRevenue: 0,
        cancelRate: 0
      };
    }

    const totalSessions = data.length;
    const avgFillRate = data.reduce((sum, session) => sum + (session.FillRate || 0), 0) / totalSessions;
    const avgClassSize = data.reduce((sum, session) => sum + (session.CheckedIn || 0), 0) / totalSessions;
    const avgRevenue = data.reduce((sum, session) => sum + (session.Revenue || 0), 0) / totalSessions;
    const cancelRate = data.reduce((sum, session) => sum + (session.LateCancelled || 0), 0) / totalSessions;

    const classFillRates = data.reduce((acc, session) => {
      const key = session.Class;
      if (!acc[key]) acc[key] = [];
      acc[key].push(session.FillRate || 0);
      return acc;
    }, {} as Record<string, number[]>);

    const classAvgFillRates = Object.entries(classFillRates).map(([className, rates]) => ({
      class: className,
      avgFillRate: rates.reduce((sum, rate) => sum + rate, 0) / rates.length
    }));

    const topClasses = classAvgFillRates
      .sort((a, b) => b.avgFillRate - a.avgFillRate)
      .slice(0, 3)
      .map(c => c.class);

    const lowClasses = classAvgFillRates
      .sort((a, b) => a.avgFillRate - b.avgFillRate)
      .slice(0, 3)
      .map(c => c.class);

    const dayStats = data.reduce((acc, session) => {
      acc[session.Day] = (acc[session.Day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timeStats = data.reduce((acc, session) => {
      acc[session.Time] = (acc[session.Time] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const peakDays = Object.entries(dayStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([day]) => day);

    const peakTimes = Object.entries(timeStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([time]) => time);

    return {
      totalSessions,
      avgFillRate,
      avgClassSize,
      topClasses,
      lowClasses,
      peakDays,
      peakTimes,
      avgRevenue,
      cancelRate
    };
  }

  private generateMockInsights(analysis: any): string[] {
    const insights = [];

    if (analysis.avgFillRate > 85) {
      insights.push(`🔥 Outstanding ${analysis.avgFillRate.toFixed(1)}% fill rate! Consider adding ${analysis.topClasses[0]} sessions during ${analysis.peakTimes.slice(0, 2).join(' and ')} to capture waitlist demand`);
    } else if (analysis.avgFillRate > 70) {
      insights.push(`⚡ Strong ${analysis.avgFillRate.toFixed(1)}% fill rate with ${analysis.peakDays.join(' and ')} showing highest demand - expand popular classes on these peak days`);
    } else if (analysis.avgFillRate < 50) {
      insights.push(`📈 Fill rate of ${analysis.avgFillRate.toFixed(1)}% needs attention - consolidate ${analysis.lowClasses.join(' and ')} classes or move to ${analysis.peakTimes[0]} slot`);
    } else {
      insights.push(`⚖️ Moderate ${analysis.avgFillRate.toFixed(1)}% fill rate - focus on promoting ${analysis.topClasses[0]} format which shows strong potential`);
    }

    if (analysis.topClasses.length > 0 && analysis.lowClasses.length > 0) {
      insights.push(`🎯 Replace ${analysis.lowClasses[0]} with ${analysis.topClasses[0]} format - data shows better performance in similar time slots`);
    }

    if (analysis.peakTimes.length > 1) {
      insights.push(`⏰ Peak times are ${analysis.peakTimes.slice(0, 2).join(' and ')} - prioritize top trainers for these slots`);
    }

    const revenuePerAttendee = analysis.avgRevenue / Math.max(analysis.avgClassSize, 1);
    insights.push(`💰 Revenue per attendee: ₹${Math.round(revenuePerAttendee)} - ${revenuePerAttendee > 25 ? 'premium pricing working well' : 'consider value optimization'}`);

    if (analysis.totalSessions > 50) {
      insights.push(`👥 High volume (${analysis.totalSessions} sessions) - ensure backup trainer coverage for ${analysis.topClasses[0]} during ${analysis.peakDays.join('/')}`);
    }

    return insights.slice(0, 7);
  }

  /**
   * Suggest optimal schedule based on historical data
   * Used by AIInsights and SmartScheduling components
   */
  async suggestOptimalSchedule(
    data: SessionData[],
    constraints?: {
      location?: string;
      dayOfWeek?: string;
      timeSlot?: string;
    }
  ): Promise<{
    suggestions: Array<{
      format: string;
      trainer: string;
      time: string;
      day: string;
      location: string;
      expectedFillRate: number;
      reasoning: string;
    }>;
    insights: string[];
  }> {
    const analysis = this.buildHistoricalAnalysis(data);
    const suggestions: Array<{
      format: string;
      trainer: string;
      time: string;
      day: string;
      location: string;
      expectedFillRate: number;
      reasoning: string;
    }> = [];

    // Filter data by constraints if provided
    let filteredData = data;
    if (constraints?.location) {
      filteredData = filteredData.filter(d => d.Location === constraints.location);
    }
    if (constraints?.dayOfWeek) {
      filteredData = filteredData.filter(d => d.Day === constraints.dayOfWeek);
    }

    // Get top performing combinations
    const performanceMap = new Map<string, { fill: number; count: number; revenue: number }>();
    filteredData.forEach(session => {
      const fillRate = session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0;
      const key = `${session.Class}|${session.Trainer}|${session.Time}|${session.Day}|${session.Location}`;
      const existing = performanceMap.get(key) || { fill: 0, count: 0, revenue: 0 };
      performanceMap.set(key, {
        fill: existing.fill + fillRate,
        count: existing.count + 1,
        revenue: existing.revenue + (session.Revenue || 0)
      });
    });

    // Sort by average fill rate
    const sortedCombinations = Array.from(performanceMap.entries())
      .map(([key, stats]) => ({
        key,
        avgFill: stats.fill / stats.count,
        count: stats.count,
        avgRevenue: stats.revenue / stats.count
      }))
      .sort((a, b) => b.avgFill - a.avgFill)
      .slice(0, 10);

    // Generate suggestions
    for (const combo of sortedCombinations) {
      const [format, trainer, time, day, location] = combo.key.split('|');
      suggestions.push({
        format,
        trainer,
        time,
        day,
        location,
        expectedFillRate: Math.round(combo.avgFill),
        reasoning: `Based on ${combo.count} sessions with ${Math.round(combo.avgFill)}% avg fill rate and ₹${Math.round(combo.avgRevenue)} avg revenue`
      });
    }

    // Generate insights from analysis
    const insights: string[] = [];
    
    // Top performing classes
    const sortedClasses = Array.from(analysis.classPerformance.entries())
      .sort((a, b) => b[1].avgFillRate - a[1].avgFillRate);
    
    if (sortedClasses.length > 0) {
      const topClass = sortedClasses[0];
      insights.push(`🏆 ${topClass[0]} is your top performer with ${topClass[1].avgFillRate}% fill rate across ${topClass[1].totalSessions} sessions`);
    }
    
    // Top trainers
    const sortedTrainers = Array.from(analysis.trainerPerformance.entries())
      .sort((a, b) => b[1].avgFillRate - a[1].avgFillRate);
    
    if (sortedTrainers.length > 0) {
      const topTrainer = sortedTrainers[0];
      insights.push(`⭐ ${topTrainer[0]} leads with ${topTrainer[1].avgFillRate}% avg fill rate`);
    }
    
    // Location insights
    analysis.locationPerformance.forEach((locData, location) => {
      if (locData.beginnerClassCount) {
        const { morning, evening } = locData.beginnerClassCount;
        if (morning === 0 || evening === 0) {
          insights.push(`📍 ${location}: Consider adding beginner classes in ${morning === 0 ? 'morning' : 'evening'} slots`);
        }
      }
    });

    return {
      suggestions,
      insights
    };
  }

  /**
   * Predict impact of a schedule change
   * Used by AIInsights component
   */
  async predictImpact(
    currentSchedule: SessionData[],
    proposedChange: {
      type: 'add' | 'remove' | 'modify';
      session?: Partial<SessionData>;
      originalSession?: Partial<SessionData>;
    }
  ): Promise<{
    fillRateChange: number;
    revenueChange: number;
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number;
    explanation: string;
  }> {
    const analysis = this.buildHistoricalAnalysis(currentSchedule);
    
    // Calculate overall averages
    let totalFill = 0;
    let totalSessions = 0;
    analysis.classPerformance.forEach(perf => {
      totalFill += perf.avgFillRate * perf.totalSessions;
      totalSessions += perf.totalSessions;
    });
    const avgFillRate = totalSessions > 0 ? totalFill / totalSessions : 50;
    
    // Default prediction
    let fillRateChange = 0;
    let revenueChange = 0;
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    let confidence = 0.6;
    let explanation = '';

    if (proposedChange.type === 'add' && proposedChange.session) {
      const session = proposedChange.session;
      const className = session.Class || session.SessionName || '';
      const trainer = session.Trainer || '';
      
      // Check if this format/trainer combo has historical data
      const historicalFormatData = analysis.classPerformance.get(className);
      const historicalTrainerData = analysis.trainerPerformance.get(trainer);
      
      if (historicalFormatData && historicalTrainerData) {
        const expectedFill = (historicalFormatData.avgFillRate + historicalTrainerData.avgFillRate) / 2;
        fillRateChange = expectedFill - avgFillRate;
        revenueChange = historicalFormatData.revenue / Math.max(historicalFormatData.totalSessions, 1) * (expectedFill / 100);
        confidence = Math.min(0.9, 0.5 + (historicalFormatData.totalSessions + historicalTrainerData.totalSessions) / 200);
        riskLevel = fillRateChange > 0 ? 'low' : fillRateChange > -10 ? 'medium' : 'high';
        explanation = `Adding ${className} with ${trainer} is predicted to ${fillRateChange > 0 ? 'increase' : 'decrease'} performance by ${Math.abs(fillRateChange).toFixed(1)}% based on ${historicalFormatData.totalSessions + historicalTrainerData.totalSessions} historical sessions`;
      } else {
        riskLevel = 'high';
        confidence = 0.4;
        explanation = 'Limited historical data for this combination - higher uncertainty';
      }
    } else if (proposedChange.type === 'remove' && proposedChange.originalSession) {
      const session = proposedChange.originalSession;
      const className = session.Class || session.SessionName || '';
      const historicalData = analysis.classPerformance.get(className);
      
      if (historicalData) {
        fillRateChange = -historicalData.avgFillRate * 0.1; // Removing reduces overall average
        revenueChange = -(historicalData.revenue / Math.max(historicalData.totalSessions, 1));
        riskLevel = historicalData.avgFillRate > 70 ? 'high' : historicalData.avgFillRate > 50 ? 'medium' : 'low';
        confidence = 0.75;
        explanation = `Removing ${className} will reduce capacity - this format has ${historicalData.avgFillRate.toFixed(1)}% avg fill rate`;
      } else {
        explanation = 'No historical data for this class';
      }
    } else if (proposedChange.type === 'modify' && proposedChange.session && proposedChange.originalSession) {
      const newSession = proposedChange.session;
      const oldSession = proposedChange.originalSession;
      const newClassName = newSession.Class || newSession.SessionName || '';
      const oldClassName = oldSession.Class || oldSession.SessionName || '';
      
      // Compare old vs new
      const oldFormat = analysis.classPerformance.get(oldClassName);
      const newFormat = analysis.classPerformance.get(newClassName);
      
      if (oldFormat && newFormat) {
        fillRateChange = newFormat.avgFillRate - oldFormat.avgFillRate;
        revenueChange = (newFormat.revenue / Math.max(newFormat.totalSessions, 1)) - (oldFormat.revenue / Math.max(oldFormat.totalSessions, 1));
        riskLevel = Math.abs(fillRateChange) < 10 ? 'low' : Math.abs(fillRateChange) < 20 ? 'medium' : 'high';
        confidence = 0.7;
        explanation = `Changing from ${oldClassName} to ${newClassName} is expected to ${fillRateChange > 0 ? 'improve' : 'reduce'} fill rate by ${Math.abs(fillRateChange).toFixed(1)}%`;
      } else {
        explanation = 'Insufficient data for comparison';
      }
    }

    return {
      fillRateChange: Math.round(fillRateChange * 10) / 10,
      revenueChange: Math.round(revenueChange),
      riskLevel,
      confidence: Math.round(confidence * 100) / 100,
      explanation
    };
  }
}

export const aiService = new AIService();
