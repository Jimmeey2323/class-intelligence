/**
 * Advanced AI Insights Service
 * Provides smart recommendations, anomaly detection, forecasting, and root cause analysis
 */

import { SessionData } from '../types';
import {
  tTest,
  confidenceInterval,
  detectAnomaly,
  forecastLinear,
  correlation,
  mean,
  standardDeviation,
  percentageChange,
  calculateConfidenceScore,
  TTestResult,
  ForecastResult,
  AnomalyResult
} from '../utils/statistics';

export interface SmartRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'schedule' | 'trainer' | 'capacity' | 'pricing' | 'marketing';
  priority: 'high' | 'medium' | 'low';
  confidence: number; // 0-100
  expectedImpact: {
    metric: string;
    change: number;
    unit: string;
  };
  estimatedROI: number; // In currency
  actionRequired: string;
  rationale: string[];
  dataPoints: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface EnhancedAnomaly {
  id: string;
  title: string;
  description: string;
  type: 'attendance' | 'revenue' | 'cancellation' | 'multi-factor';
  severity: 'minor' | 'moderate' | 'critical';
  detected: string;
  affectedClass: string;
  affectedLocation: string;
  metrics: {
    expected: number;
    actual: number;
    deviation: number;
    zScore: number;
  };
  context: string[];
  suggestedActions: string[];
  relatedFactors: string[];
}

export interface RootCauseAnalysis {
  primaryCause: string;
  contributingFactors: Array<{
    factor: string;
    attribution: number; // 0-100%
    confidence: number;
  }>;
  evidence: string[];
  recommendations: string[];
}

export interface TrainerInsight {
  trainer: string;
  strengths: string[];
  improvements: string[];
  optimalSlots: Array<{
    day: string;
    time: string;
    performanceBoost: number;
  }>;
  peerComparison: {
    ranking: string;
    vsAverage: number;
  };
  trajectory: 'improving' | 'declining' | 'stable';
  monthlyGrowth: number;
}

export class AdvancedInsightsService {
  /**
   * Generate smart, actionable recommendations
   */
  static generateRecommendations(data: SessionData[]): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    
    // Group by class format
    const formatGroups = this.groupByFormat(data);
    
    // 1. Identify underperforming time slots
    const timeSlotRecs = this.analyzeTimeSlots(data);
    recommendations.push(...timeSlotRecs);
    
    // 2. Trainer swap opportunities
    const trainerRecs = this.analyzeTrainerOpportunities(data);
    recommendations.push(...trainerRecs);
    
    // 3. Capacity optimization
    const capacityRecs = this.analyzeCapacity(data);
    recommendations.push(...capacityRecs);
    
    // 4. Class replacement suggestions
    const replacementRecs = this.suggestClassReplacements(formatGroups);
    recommendations.push(...replacementRecs);
    
    // Sort by priority and confidence
    return recommendations
      .sort((a, b) => {
        const priorityMap = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityMap[b.priority] - priorityMap[a.priority];
        return priorityDiff !== 0 ? priorityDiff : b.confidence - a.confidence;
      })
      .slice(0, 10); // Top 10 recommendations
  }

  /**
   * Detect anomalies with context and severity
   */
  static detectAnomalies(data: SessionData[]): EnhancedAnomaly[] {
    const anomalies: EnhancedAnomaly[] = [];
    const formatGroups = this.groupByFormat(data);
    
    formatGroups.forEach((sessions, format) => {
      if (sessions.length < 5) return;
      
      // Sort by date
      const sorted = [...sessions].sort((a, b) => 
        new Date(a.Date).getTime() - new Date(b.Date).getTime()
      );
      
      // Check last 3 sessions for anomalies
      const recent = sorted.slice(-3);
      const historical = sorted.slice(0, -3);
      
      if (historical.length < 5) return;
      
      recent.forEach(session => {
        // Attendance anomaly
        const attendanceAnomaly = detectAnomaly(
          session.CheckedIn,
          historical.map(s => s.CheckedIn)
        );
        
        if (attendanceAnomaly.isAnomaly) {
          const context: string[] = [];
          const relatedFactors: string[] = [];
          
          // Check for related factors
          const revenueAnomaly = detectAnomaly(
            session.Revenue,
            historical.map(s => s.Revenue)
          );
          
          if (revenueAnomaly.isAnomaly) {
            context.push('Revenue also anomalous');
            relatedFactors.push('revenue');
          }
          
          // Check cancellation rate
          const cancelRate = session.Booked > 0 ? (session.LateCancelled / session.Booked) * 100 : 0;
          const historicalCancelRates = historical
            .filter(s => s.Booked > 0)
            .map(s => (s.LateCancelled / s.Booked) * 100);
          
          if (historicalCancelRates.length > 0) {
            const avgCancelRate = mean(historicalCancelRates);
            if (Math.abs(cancelRate - avgCancelRate) > 20) {
              context.push(`Cancellation rate ${cancelRate.toFixed(1)}% vs usual ${avgCancelRate.toFixed(1)}%`);
              relatedFactors.push('cancellations');
            }
          }
          
          // Multi-factor anomaly
          const type = relatedFactors.length > 1 ? 'multi-factor' : 'attendance';
          
          anomalies.push({
            id: `anomaly-${format}-${session.Date}`,
            title: `${attendanceAnomaly.severity.toUpperCase()}: ${format} attendance ${attendanceAnomaly.deviationPercent > 0 ? 'spike' : 'drop'}`,
            description: `Detected ${Math.abs(attendanceAnomaly.deviationPercent).toFixed(0)}% deviation from expected attendance`,
            type,
            severity: attendanceAnomaly.severity,
            detected: session.Date,
            affectedClass: format,
            affectedLocation: session.Location,
            metrics: {
              expected: attendanceAnomaly.expectedValue,
              actual: attendanceAnomaly.actualValue,
              deviation: attendanceAnomaly.deviationPercent,
              zScore: attendanceAnomaly.score
            },
            context,
            suggestedActions: this.generateAnomalyActions(attendanceAnomaly, session),
            relatedFactors
          });
        }
      });
    });
    
    // Sort by severity
    const severityMap = { critical: 3, moderate: 2, minor: 1 };
    return anomalies.sort((a, b) => severityMap[b.severity] - severityMap[a.severity]);
  }

  /**
   * Perform root cause analysis for attendance drops
   */
  static analyzeRootCause(
    currentSessions: SessionData[],
    previousSessions: SessionData[]
  ): RootCauseAnalysis {
    const factors: Array<{ factor: string; attribution: number; confidence: number }> = [];
    const evidence: string[] = [];
    
    // 1. Trainer change impact
    const currentTrainers = new Set(currentSessions.map(s => s.Trainer));
    const previousTrainers = new Set(previousSessions.map(s => s.Trainer));
    const trainerChanged = !this.setsEqual(currentTrainers, previousTrainers);
    
    if (trainerChanged) {
      const currentAvg = mean(currentSessions.map(s => s.CheckedIn));
      const previousAvg = mean(previousSessions.map(s => s.CheckedIn));
      const impact = percentageChange(previousAvg, currentAvg);
      
      factors.push({
        factor: 'Trainer change',
        attribution: Math.min(Math.abs(impact), 40),
        confidence: 75
      });
      evidence.push(`Trainer changed: ${Array.from(previousTrainers).join(', ')} → ${Array.from(currentTrainers).join(', ')}`);
    }
    
    // 2. Time/schedule change
    const currentTimes = new Set(currentSessions.map(s => s.Time));
    const previousTimes = new Set(previousSessions.map(s => s.Time));
    const timeChanged = !this.setsEqual(currentTimes, previousTimes);
    
    if (timeChanged) {
      factors.push({
        factor: 'Schedule change',
        attribution: 25,
        confidence: 70
      });
      evidence.push(`Time slot changed: ${Array.from(previousTimes).join(', ')} → ${Array.from(currentTimes).join(', ')}`);
    }
    
    // 3. Seasonal trends
    const months = currentSessions.map(s => new Date(s.Date).getMonth());
    const hasWinterMonths = months.some(m => m === 11 || m === 0 || m === 1);
    const hasSummerMonths = months.some(m => m === 5 || m === 6 || m === 7);
    
    if (hasWinterMonths) {
      factors.push({
        factor: 'Seasonal (Winter)',
        attribution: 15,
        confidence: 60
      });
      evidence.push('Winter months typically see 10-20% lower attendance');
    } else if (hasSummerMonths) {
      factors.push({
        factor: 'Seasonal (Summer)',
        attribution: 20,
        confidence: 65
      });
      evidence.push('Summer months often show vacation-related dips');
    }
    
    // 4. Price changes (if revenue per person changed significantly)
    const currentRevPerPerson = currentSessions.reduce((sum, s) => sum + (s.CheckedIn > 0 ? s.Revenue / s.CheckedIn : 0), 0) / currentSessions.length;
    const previousRevPerPerson = previousSessions.reduce((sum, s) => sum + (s.CheckedIn > 0 ? s.Revenue / s.CheckedIn : 0), 0) / previousSessions.length;
    
    if (Math.abs(percentageChange(previousRevPerPerson, currentRevPerPerson)) > 10) {
      factors.push({
        factor: 'Pricing change',
        attribution: 20,
        confidence: 80
      });
      evidence.push(`Revenue per person changed ${percentageChange(previousRevPerPerson, currentRevPerPerson).toFixed(1)}%`);
    }
    
    // Normalize attributions to sum to 100%
    const totalAttribution = factors.reduce((sum, f) => sum + f.attribution, 0);
    if (totalAttribution > 0) {
      factors.forEach(f => f.attribution = (f.attribution / totalAttribution) * 100);
    }
    
    // Determine primary cause
    const primary = factors.length > 0 
      ? factors.reduce((max, f) => f.attribution > max.attribution ? f : max, factors[0])
      : null;
    
    return {
      primaryCause: primary?.factor || 'Unknown',
      contributingFactors: factors.sort((a, b) => b.attribution - a.attribution),
      evidence,
      recommendations: this.generateRootCauseRecommendations(factors)
    };
  }

  /**
   * Generate trainer insights
   */
  static generateTrainerInsights(data: SessionData[], trainer: string): TrainerInsight {
    const trainerSessions = data.filter(s => s.Trainer === trainer);
    const allTrainersSessions = data;
    
    // Calculate performance by time slot
    const timeSlotPerformance = new Map<string, { avg: number; count: number }>();
    trainerSessions.forEach(s => {
      const key = `${s.Day}-${s.Time}`;
      const existing = timeSlotPerformance.get(key) || { avg: 0, count: 0 };
      existing.avg = (existing.avg * existing.count + s.CheckedIn) / (existing.count + 1);
      existing.count++;
      timeSlotPerformance.set(key, existing);
    });
    
    // Find optimal slots (above trainer's average)
    const trainerAvg = mean(trainerSessions.map(s => s.CheckedIn));
    const optimalSlots = Array.from(timeSlotPerformance.entries())
      .filter(([_, perf]) => perf.avg > trainerAvg * 1.1)
      .map(([slot, perf]) => {
        const [day, time] = slot.split('-');
        return {
          day,
          time,
          performanceBoost: percentageChange(trainerAvg, perf.avg)
        };
      })
      .sort((a, b) => b.performanceBoost - a.performanceBoost)
      .slice(0, 3);
    
    // Compare to peers
    const allTrainersAvg = mean(allTrainersSessions.map(s => s.CheckedIn));
    const vsAverage = percentageChange(allTrainersAvg, trainerAvg);
    
    // Calculate trajectory
    const sorted = [...trainerSessions].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    
    const firstAvg = mean(firstHalf.map(s => s.CheckedIn));
    const secondAvg = mean(secondHalf.map(s => s.CheckedIn));
    const monthlyGrowth = percentageChange(firstAvg, secondAvg);
    
    let trajectory: 'improving' | 'declining' | 'stable' = 'stable';
    if (monthlyGrowth > 5) trajectory = 'improving';
    else if (monthlyGrowth < -5) trajectory = 'declining';
    
    return {
      trainer,
      strengths: this.identifyTrainerStrengths(trainerSessions, allTrainersSessions),
      improvements: this.identifyImprovementAreas(trainerSessions, allTrainersSessions),
      optimalSlots,
      peerComparison: {
        ranking: vsAverage > 10 ? 'Top performer' : vsAverage > 0 ? 'Above average' : 'Below average',
        vsAverage
      },
      trajectory,
      monthlyGrowth
    };
  }

  // Helper methods
  private static groupByFormat(data: SessionData[]): Map<string, SessionData[]> {
    const groups = new Map<string, SessionData[]>();
    data.forEach(session => {
      const format = session.Class;
      if (!groups.has(format)) {
        groups.set(format, []);
      }
      groups.get(format)!.push(session);
    });
    return groups;
  }

  private static setsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }

  private static analyzeTimeSlots(data: SessionData[]): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    
    // Group by time slot
    const timeSlots = new Map<string, SessionData[]>();
    data.forEach(s => {
      const key = `${s.Day}-${s.Time}`;
      if (!timeSlots.has(key)) timeSlots.set(key, []);
      timeSlots.get(key)!.push(s);
    });
    
    // Find underperforming slots
    const avgFillRate = mean(data.map(s => s.Capacity > 0 ? (s.CheckedIn / s.Capacity) * 100 : 0));
    
    timeSlots.forEach((sessions, slot) => {
      const fillRate = mean(sessions.map(s => s.Capacity > 0 ? (s.CheckedIn / s.Capacity) * 100 : 0));
      
      if (fillRate < avgFillRate * 0.7 && sessions.length >= 3) {
        const [day, time] = slot.split('-');
        recommendations.push({
          id: `timeslot-${slot}`,
          title: `Optimize ${day} ${time} slot`,
          description: `This time slot is underperforming with ${fillRate.toFixed(0)}% fill rate vs ${avgFillRate.toFixed(0)}% average`,
          type: 'schedule',
          priority: 'high',
          confidence: 75,
          expectedImpact: {
            metric: 'Fill Rate',
            change: avgFillRate - fillRate,
            unit: '%'
          },
          estimatedROI: (avgFillRate - fillRate) / 100 * mean(sessions.map(s => s.Revenue)) * 4, // 4 weeks
          actionRequired: `Consider moving popular class to this slot or changing instructor`,
          rationale: [
            `Currently ${fillRate.toFixed(0)}% filled`,
            `${sessions.length} sessions analyzed`,
            `Potential revenue gain: ₹${Math.round((avgFillRate - fillRate) / 100 * mean(sessions.map(s => s.Revenue)) * 4)}`
          ],
          dataPoints: sessions.length,
          riskLevel: 'low'
        });
      }
    });
    
    return recommendations;
  }

  private static analyzeTrainerOpportunities(data: SessionData[]): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    
    // Group by trainer and class
    const trainerPerformance = new Map<string, { sessions: SessionData[]; avgAttendance: number }>();
    
    data.forEach(s => {
      const key = `${s.Trainer}-${s.Class}`;
      if (!trainerPerformance.has(key)) {
        trainerPerformance.set(key, { sessions: [], avgAttendance: 0 });
      }
      const perf = trainerPerformance.get(key)!;
      perf.sessions.push(s);
      perf.avgAttendance = mean(perf.sessions.map(s => s.CheckedIn));
    });
    
    // Find swap opportunities
    const trainers = Array.from(new Set(data.map(s => s.Trainer)));
    const classes = Array.from(new Set(data.map(s => s.Class)));
    
    classes.forEach(className => {
      const classTrainers = trainers.filter(t => 
        data.some(s => s.Trainer === t && s.Class === className)
      );
      
      if (classTrainers.length >= 2) {
        const performances = classTrainers.map(t => ({
          trainer: t,
          avg: mean(data.filter(s => s.Trainer === t && s.Class === className).map(s => s.CheckedIn))
        })).sort((a, b) => b.avg - a.avg);
        
        const top = performances[0];
        const bottom = performances[performances.length - 1];
        
        if (top.avg > bottom.avg * 1.3) {
          recommendations.push({
            id: `trainer-swap-${className}`,
            title: `Trainer optimization for ${className}`,
            description: `${top.trainer} performs ${percentageChange(bottom.avg, top.avg).toFixed(0)}% better than ${bottom.trainer}`,
            type: 'trainer',
            priority: 'medium',
            confidence: 80,
            expectedImpact: {
              metric: 'Attendance',
              change: top.avg - bottom.avg,
              unit: 'people/class'
            },
            estimatedROI: (top.avg - bottom.avg) * 100 * 4, // Assume ₹100 per person, 4 weeks
            actionRequired: `Consider reassigning ${className} classes or cross-training`,
            rationale: [
              `${top.trainer}: ${top.avg.toFixed(1)} avg attendance`,
              `${bottom.trainer}: ${bottom.avg.toFixed(1)} avg attendance`,
              `Potential lift: ${(top.avg - bottom.avg).toFixed(1)} people per class`
            ],
            dataPoints: data.filter(s => s.Class === className).length,
            riskLevel: 'medium'
          });
        }
      }
    });
    
    return recommendations;
  }

  private static analyzeCapacity(data: SessionData[]): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    
    // Group by class
    const classGroups = this.groupByFormat(data);
    
    classGroups.forEach((sessions, className) => {
      const avgFillRate = mean(sessions.map(s => s.Capacity > 0 ? (s.CheckedIn / s.Capacity) * 100 : 0));
      const avgWaitlist = mean(sessions.map(s => s.Waitlisted || 0));
      
      // High fill rate + waitlists = capacity too low
      if (avgFillRate > 90 && avgWaitlist > 2) {
        recommendations.push({
          id: `capacity-increase-${className}`,
          title: `Increase capacity for ${className}`,
          description: `Consistently full with ${avgWaitlist.toFixed(1)} average waitlist`,
          type: 'capacity',
          priority: 'high',
          confidence: 90,
          expectedImpact: {
            metric: 'Revenue',
            change: avgWaitlist * 100 * sessions.length,
            unit: '₹/month'
          },
          estimatedROI: avgWaitlist * 100 * sessions.length,
          actionRequired: `Add capacity or additional class sessions`,
          rationale: [
            `${avgFillRate.toFixed(0)}% average fill rate`,
            `${avgWaitlist.toFixed(1)} average waitlist`,
            `Turning away potential customers`
          ],
          dataPoints: sessions.length,
          riskLevel: 'low'
        });
      }
      
      // Low fill rate = capacity too high
      if (avgFillRate < 50 && sessions.length >= 5) {
        recommendations.push({
          id: `capacity-reduce-${className}`,
          title: `Reduce capacity or frequency for ${className}`,
          description: `Only ${avgFillRate.toFixed(0)}% filled on average`,
          type: 'capacity',
          priority: 'medium',
          confidence: 75,
          expectedImpact: {
            metric: 'Efficiency',
            change: 50 - avgFillRate,
            unit: '% improvement'
          },
          estimatedROI: 0,
          actionRequired: `Consider reducing capacity or merging sessions`,
          rationale: [
            `${avgFillRate.toFixed(0)}% average fill rate`,
            `Resources underutilized`,
            `Opportunity to reallocate to popular classes`
          ],
          dataPoints: sessions.length,
          riskLevel: 'medium'
        });
      }
    });
    
    return recommendations;
  }

  private static suggestClassReplacements(formatGroups: Map<string, SessionData[]>): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    
    const performances = Array.from(formatGroups.entries()).map(([format, sessions]) => ({
      format,
      sessions: sessions.length,
      avgAttendance: mean(sessions.map(s => s.CheckedIn)),
      totalRevenue: sessions.reduce((sum, s) => sum + s.Revenue, 0)
    })).sort((a, b) => b.avgAttendance - a.avgAttendance);
    
    if (performances.length >= 3) {
      const bottom = performances[performances.length - 1];
      const top = performances[0];
      
      if (bottom.avgAttendance < top.avgAttendance * 0.5 && bottom.sessions >= 5) {
        recommendations.push({
          id: `replace-${bottom.format}`,
          title: `Consider replacing ${bottom.format}`,
          description: `Low performance: ${bottom.avgAttendance.toFixed(1)} avg attendance vs ${top.avgAttendance.toFixed(1)} for ${top.format}`,
          type: 'schedule',
          priority: 'medium',
          confidence: 70,
          expectedImpact: {
            metric: 'Attendance',
            change: top.avgAttendance - bottom.avgAttendance,
            unit: 'people/class'
          },
          estimatedROI: (top.totalRevenue / top.sessions) * bottom.sessions - bottom.totalRevenue,
          actionRequired: `Test alternative class formats in these slots`,
          rationale: [
            `${bottom.format}: ${bottom.avgAttendance.toFixed(1)} avg`,
            `Top class ${top.format}: ${top.avgAttendance.toFixed(1)} avg`,
            `Potential revenue increase: ₹${Math.round((top.totalRevenue / top.sessions) * bottom.sessions - bottom.totalRevenue)}`
          ],
          dataPoints: bottom.sessions,
          riskLevel: 'high'
        });
      }
    }
    
    return recommendations;
  }

  private static generateAnomalyActions(anomaly: AnomalyResult, session: SessionData): string[] {
    const actions: string[] = [];
    
    if (anomaly.deviationPercent < 0) {
      // Attendance drop
      actions.push('Review recent changes (trainer, time, marketing)');
      actions.push('Check for competing events or holidays');
      actions.push('Survey members about scheduling preferences');
      if (Math.abs(anomaly.deviationPercent) > 30) {
        actions.push('URGENT: Investigate immediately - significant drop');
      }
    } else {
      // Attendance spike
      actions.push('Identify success factors to replicate');
      actions.push('Consider increasing capacity if sustainable');
      actions.push('Document what worked for future optimization');
    }
    
    return actions;
  }

  private static generateRootCauseRecommendations(factors: Array<{ factor: string; attribution: number; confidence: number }>): string[] {
    const recs: string[] = [];
    
    factors.forEach(f => {
      if (f.factor.includes('Trainer') && f.attribution > 30) {
        recs.push('Consider trainer training or replacement');
        recs.push('Survey members on trainer satisfaction');
      }
      if (f.factor.includes('Schedule') && f.attribution > 20) {
        recs.push('Test alternative time slots through A/B testing');
        recs.push('Analyze member availability patterns');
      }
      if (f.factor.includes('Pricing') && f.attribution > 20) {
        recs.push('Review pricing strategy and competitor rates');
        recs.push('Consider value-added services to justify pricing');
      }
      if (f.factor.includes('Seasonal') && f.attribution > 15) {
        recs.push('Plan seasonal promotions to counter dips');
        recs.push('Adjust class mix for seasonal preferences');
      }
    });
    
    return recs.length > 0 ? recs : ['Continue monitoring and gather more data'];
  }

  private static identifyTrainerStrengths(trainerSessions: SessionData[], allSessions: SessionData[]): string[] {
    const strengths: string[] = [];
    
    // Check if strong in specific class types
    const classTypes = new Map<string, number>();
    trainerSessions.forEach(s => {
      const avg = classTypes.get(s.Class) || 0;
      classTypes.set(s.Class, avg + s.CheckedIn);
    });
    
    const avgAttendance = mean(trainerSessions.map(s => s.CheckedIn));
    
    classTypes.forEach((total, className) => {
      const count = trainerSessions.filter(s => s.Class === className).length;
      const classAvg = total / count;
      if (classAvg > avgAttendance * 1.2) {
        strengths.push(`Excels at ${className} classes (+${percentageChange(avgAttendance, classAvg).toFixed(0)}%)`);
      }
    });
    
    // Check fill rate
    const fillRate = mean(trainerSessions.map(s => s.Capacity > 0 ? (s.CheckedIn / s.Capacity) * 100 : 0));
    if (fillRate > 75) {
      strengths.push(`High fill rate: ${fillRate.toFixed(0)}%`);
    }
    
    // Check cancellation rate
    const cancelRate = trainerSessions.reduce((sum, s) => sum + s.LateCancelled, 0) / trainerSessions.reduce((sum, s) => sum + s.Booked, 0) * 100;
    if (cancelRate < 10) {
      strengths.push(`Low cancellation rate: ${cancelRate.toFixed(1)}%`);
    }
    
    return strengths.length > 0 ? strengths : ['Solid all-around performance'];
  }

  private static identifyImprovementAreas(trainerSessions: SessionData[], allSessions: SessionData[]): string[] {
    const improvements: string[] = [];
    
    const avgAttendance = mean(trainerSessions.map(s => s.CheckedIn));
    const overallAvg = mean(allSessions.map(s => s.CheckedIn));
    
    if (avgAttendance < overallAvg * 0.9) {
      improvements.push(`Below studio average by ${percentageChange(avgAttendance, overallAvg).toFixed(0)}%`);
    }
    
    const fillRate = mean(trainerSessions.map(s => s.Capacity > 0 ? (s.CheckedIn / s.Capacity) * 100 : 0));
    if (fillRate < 60) {
      improvements.push(`Room to improve fill rate from ${fillRate.toFixed(0)}%`);
    }
    
    const cancelRate = trainerSessions.reduce((sum, s) => sum + s.LateCancelled, 0) / trainerSessions.reduce((sum, s) => sum + s.Booked, 0) * 100;
    if (cancelRate > 15) {
      improvements.push(`Reduce cancellation rate from ${cancelRate.toFixed(1)}%`);
    }
    
    return improvements.length > 0 ? improvements : ['Maintain current performance level'];
  }
}
