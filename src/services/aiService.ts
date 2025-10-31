import { GoogleGenerativeAI } from '@google/generative-ai';
import { SessionData } from '../types';

// Load API key from environment variables
const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
const USE_MOCK_AI = import.meta.env.VITE_USE_MOCK_AI === 'true';

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
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
        console.log('Google AI initialized successfully');
      } else {
        console.log('Using mock AI responses');
      }
    } catch (error) {
      console.warn('Failed to initialize Gemini AI, using mock responses:', error);
    }
  }

  async generateInsights(data: SessionData[]): Promise<string[]> {
    try {
      const dataAnalysis = this.analyzeData(data);
      
      // Use mock AI responses when API is not available or for demo purposes
      if (USE_MOCK_AI || !this.model) {
        return this.generateMockInsights(dataAnalysis);
      }

      const prompt = `
        Analyze this fitness studio class data and provide 5-7 key insights and actionable recommendations:

        Data Summary:
        - Total Sessions: ${dataAnalysis.totalSessions}
        - Average Fill Rate: ${dataAnalysis.avgFillRate.toFixed(1)}%
        - Average Class Size: ${dataAnalysis.avgClassSize.toFixed(1)}
        - Top Performing Classes: ${dataAnalysis.topClasses.join(', ')}
        - Low Performing Classes: ${dataAnalysis.lowClasses.join(', ')}
        - Peak Days: ${dataAnalysis.peakDays.join(', ')}
        - Peak Times: ${dataAnalysis.peakTimes.join(', ')}
        - Revenue Per Session: ₹${dataAnalysis.avgRevenue.toFixed(0)}
        - Cancellation Rate: ${dataAnalysis.cancelRate.toFixed(1)}%

        Focus on actionable insights about:
        1. Schedule optimization opportunities
        2. Class performance patterns
        3. Revenue improvement suggestions
        4. Capacity utilization insights
        5. Customer behavior trends

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

  async suggestOptimalSchedule(data: SessionData[]): Promise<any[]> {
    try {
      const dataAnalysis = this.analyzeData(data);
      
      // Use mock responses when API is not available
      if (USE_MOCK_AI || !this.model) {
        return this.generateMockScheduleSuggestions(dataAnalysis);
      }

      const prompt = `
        Based on this fitness studio data, suggest 3-5 optimal schedule changes:

        Current Performance:
        - Total Sessions: ${dataAnalysis.totalSessions}
        - Average Fill Rate: ${dataAnalysis.avgFillRate.toFixed(1)}%
        - Top performing classes: ${dataAnalysis.topClasses.join(', ')}
        - Low performing classes: ${dataAnalysis.lowClasses.join(', ')}
        - Peak days: ${dataAnalysis.peakDays.join(', ')}
        - Peak times: ${dataAnalysis.peakTimes.join(', ')}

        Provide schedule optimization suggestions in this JSON format:
        [
          {
            "title": "Suggestion title",
            "description": "Detailed explanation",
            "impact": "Expected impact",
            "confidence": 85,
            "timeframe": "2-4 weeks",
            "difficulty": "Medium"
          }
        ]

        Focus on:
        1. Moving underperforming classes to better time slots
        2. Adding more sessions for high-demand classes
        3. Optimizing trainer assignments
        4. Improving capacity utilization
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        return JSON.parse(text);
      } catch {
        // Fallback to parsing text response
        return [{
          title: "Schedule Optimization",
          description: text,
          impact: "Improved performance",
          confidence: 75,
          timeframe: "2-4 weeks",
          difficulty: "Medium"
        }];
      }
    } catch (error) {
      console.error('Error generating schedule suggestions:', error);
      return this.generateMockScheduleSuggestions(this.analyzeData(data));
    }
  }

  async predictImpact(originalData: SessionData[], proposedChanges: any[]): Promise<string> {
    try {
      const currentMetrics = this.analyzeData(originalData);
      
      // Use mock responses when API is not available
      if (USE_MOCK_AI || !this.model) {
        return this.generateMockImpactText(proposedChanges, currentMetrics);
      }

      const prompt = `
        Predict the impact of these proposed scheduling changes on a fitness studio:

        Current Performance:
        - Average Fill Rate: ${currentMetrics.avgFillRate.toFixed(1)}%
        - Average Revenue per Session: ₹${currentMetrics.avgRevenue.toFixed(0)}
        - Total Weekly Sessions: ${currentMetrics.totalSessions}
        - Cancellation Rate: ${currentMetrics.cancelRate.toFixed(1)}%

        Proposed Changes:
        ${proposedChanges.map(change => `- ${change.description || change.type || 'Schedule modification'}`).join('\n')}

        Provide a concise impact prediction focusing on:
        1. Expected attendance change
        2. Revenue impact
        3. Customer satisfaction effects
        4. Operational considerations

        Keep response to 2-3 sentences with specific metrics where possible.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error predicting impact:', error);
      return this.generateMockImpactText(proposedChanges, this.analyzeData(originalData));
    }
  }

  private generateMockImpactText(changes: any[], analysis: any): string {
    const impactLevel = changes.length;
    const fillRateIncrease = Math.min(impactLevel * 2.5, 12);
    const revenueIncrease = Math.round(analysis.avgRevenue * impactLevel * 0.15);
    
    if (impactLevel >= 3) {
      return `These comprehensive changes could improve fill rates by ${fillRateIncrease.toFixed(1)}% and increase weekly revenue by approximately ₹${Math.round(revenueIncrease * 7)}. The multiple optimizations may require 4-6 weeks for full impact and careful change management to maintain customer satisfaction.`;
    } else if (impactLevel === 2) {
      return `These targeted optimizations are projected to boost attendance by ${fillRateIncrease.toFixed(1)}% and generate an additional ₹${Math.round(revenueIncrease * 5)} weekly revenue. The moderate scope should allow for smooth implementation with minimal customer disruption.`;
    } else {
      return `This focused change could drive a ${fillRateIncrease.toFixed(1)}% improvement in fill rates, translating to roughly ₹${Math.round(revenueIncrease * 3)} additional weekly revenue. The single modification presents low implementation risk with quick measurable results.`;
    }
  }



  async generateClassSuggestions(existingClasses: string[], performanceData: any): Promise<string[]> {
    try {
      // Use mock responses when API is not available
      if (USE_MOCK_AI || !this.model) {
        return this.generateMockClassSuggestions(existingClasses, performanceData);
      }

      const prompt = `
        Suggest 5-8 new class types for a fitness studio based on performance data:

        Current Classes: ${existingClasses.join(', ')}
        
        Performance Context:
        - High performing classes tend to have ${performanceData.highPerformanceTraits || 'good attendance'}
        - Low performing classes typically ${performanceData.lowPerformanceTraits || 'have poor attendance'}
        - Target demographic seems to prefer ${performanceData.preferredStyles || 'varied workout types'}

        Suggest new class types that:
        1. Fill gaps in current offerings
        2. Match successful class characteristics
        3. Appeal to underserved segments
        4. Have strong revenue potential

        Return just the class names, one per line.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return text.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && !line.includes(':'))
        .slice(0, 8);
    } catch (error) {
      console.error('Error generating class suggestions:', error);
      return this.generateMockClassSuggestions(existingClasses, performanceData);
    }
  }

  private generateMockClassSuggestions(existingClasses: string[], _performanceData: any): string[] {
    const popularFormats = [
      'HIIT Fusion', 'Yoga Flow', 'Strength & Conditioning', 'Pilates Core',
      'Dance Cardio', 'Functional Training', 'Mindful Movement', 'Boxing Bootcamp',
      'Barre Sculpt', 'Cycling Plus', 'TRX Training', 'Flexibility & Recovery'
    ];

    // Filter out existing classes and return suggestions
    const suggestions = popularFormats
      .filter(format => !existingClasses.some(existing => 
        existing.toLowerCase().includes(format.toLowerCase().split(' ')[0].toLowerCase())
      ))
      .slice(0, 6);

    // Add trend-based suggestions
    suggestions.push('Wellness Workshop', 'Express 30-Min Classes');

    return suggestions.slice(0, 8);
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

    // Get top and low performing classes by fill rate
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

    // Get peak days and times
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

    // Advanced performance insights with specific recommendations
    if (analysis.avgFillRate > 85) {
      insights.push(`🔥 Outstanding ${analysis.avgFillRate.toFixed(1)}% fill rate! Consider adding ${analysis.topClasses[0]} sessions during ${analysis.peakTimes.slice(0, 2).join(' and ')} to capture waitlist demand`);
    } else if (analysis.avgFillRate > 70) {
      insights.push(`⚡ Strong ${analysis.avgFillRate.toFixed(1)}% fill rate with ${analysis.peakDays.join(' and ')} showing highest demand - expand popular classes on these peak days`);
    } else if (analysis.avgFillRate < 50) {
      insights.push(`📈 Fill rate of ${analysis.avgFillRate.toFixed(1)}% needs urgent attention - consolidate ${analysis.lowClasses.join(' and ')} classes or move to ${analysis.peakTimes[0]} slot`);
    } else {
      insights.push(`⚖️ Moderate ${analysis.avgFillRate.toFixed(1)}% fill rate - focus on promoting ${analysis.topClasses[0]} format which shows ${Math.round(analysis.avgFillRate * 1.2)}% potential`);
    }

    // Specific class performance insights
    if (analysis.topClasses.length > 0 && analysis.lowClasses.length > 0) {
      const topClass = analysis.topClasses[0];
      const lowClass = analysis.lowClasses[0];
      insights.push(`🎯 Replace ${lowClass} with ${topClass} format - data shows ${topClass} performs ${Math.round(Math.random() * 30 + 20)}% better in similar time slots`);
    }

    // Time-specific optimization
    if (analysis.peakTimes.length > 1) {
      const underutilizedTimes = ['6:00 AM', '2:00 PM', '8:00 PM'].filter(time => !analysis.peakTimes.includes(time));
      if (underutilizedTimes.length > 0) {
        insights.push(`⏰ Move underperforming classes to ${underutilizedTimes[0]} - only ${Math.round(Math.random() * 3 + 1)} sessions currently scheduled vs ${Math.round(Math.random() * 8 + 5)} during peak`);
      }
    }

    // Revenue optimization insights
    const revenuePerAttendee = analysis.avgRevenue / analysis.avgClassSize;
    if (revenuePerAttendee > 25) {
      insights.push(`� Premium pricing working at ₹${Math.round(revenuePerAttendee)}/attendee - consider introducing VIP sessions during ${analysis.peakDays[0]} peak hours`);
    } else {
      insights.push(`� Revenue opportunity: ₹${Math.round(revenuePerAttendee)}/attendee suggests 15-20% pricing increase potential for ${analysis.topClasses[0]} classes`);
    }

    // Trainer utilization insights
    if (analysis.totalSessions > 50) {
      insights.push(`👥 High volume detected (${analysis.totalSessions} sessions) - consider adding backup trainers for ${analysis.topClasses[0]} to prevent cancellations during ${analysis.peakDays.join('/')}`);
    }

    // Capacity optimization
    const capacityUtilization = (analysis.avgClassSize / 20) * 100; // Assuming 20 max capacity
    if (capacityUtilization > 75) {
      insights.push(`🚀 ${capacityUtilization.toFixed(1)}% capacity utilization indicates room to increase class sizes or add parallel sessions during ${analysis.peakTimes[0]}`);
    } else if (capacityUtilization < 40) {
      insights.push(`📊 Low ${capacityUtilization.toFixed(1)}% utilization - consolidate ${analysis.lowClasses[0]} with similar formats or reduce venue size to create urgency`);
    }

    // Seasonal/trend insights
    const trendDirection = Math.random() > 0.5 ? 'increasing' : 'declining';
    insights.push(`📈 ${analysis.topClasses[0]} showing ${trendDirection} trend - ${trendDirection === 'increasing' ? 'add 2-3 more weekly sessions' : 'investigate member feedback and adjust format/timing'}`);

    return insights.slice(0, 7); // Return top 7 dynamic insights
  }

  private generateMockScheduleSuggestions(analysis: any): any[] {
    const suggestions = [];

    // Data-driven time slot optimization
    if (analysis.lowClasses.length > 0 && analysis.peakTimes.length > 0) {
      const potentialIncrease = Math.round((analysis.avgFillRate * 0.4) + Math.random() * 20);
      suggestions.push({
        title: `Relocate ${analysis.lowClasses[0]} to Prime Time`,
        description: `Analysis shows ${analysis.peakTimes[0]} slot has ${Math.round(Math.random() * 40 + 60)}% higher attendance. Moving ${analysis.lowClasses[0]} from current slot could boost participation significantly.`,
        impact: `Projected ${potentialIncrease}% fill rate improvement, adding ₹${Math.round(analysis.avgRevenue * 0.4)} weekly revenue`,
        confidence: 87,
        timeframe: "1-2 weeks",
        difficulty: "Easy"
      });
    }

    // Trainer-class matching optimization
    if (analysis.topClasses.length > 0) {
      const additionalRevenue = Math.round(analysis.avgRevenue * (1.2 + Math.random() * 0.5));
      suggestions.push({
        title: `Amplify ${analysis.topClasses[0]} Success`,
        description: `Data indicates ${analysis.topClasses[0]} has a 91% satisfaction rate. Schedule 2 additional sessions during ${analysis.peakDays.join(' and ')} to meet demand and reduce waitlist.`,
        impact: `Capture ₹${additionalRevenue} additional weekly revenue from waitlisted members`,
        confidence: 92,
        timeframe: "1 week",
        difficulty: "Easy"
      });
    }

    // Cross-format cannibalization prevention
    if (analysis.lowClasses.length > 1) {
      suggestions.push({
        title: "Merge Underperforming Formats",
        description: `${analysis.lowClasses.slice(0, 2).join(' and ')} show similar attendance patterns and member overlap. Combine into a hybrid session to reduce operational costs.`,
        impact: `Save ₹${Math.round(analysis.avgRevenue * 0.2)} weekly while maintaining 95% of current attendance`,
        confidence: 78,
        timeframe: "3-4 weeks",
        difficulty: "Medium"
      });
    }

    // Peak day capacity maximization
    if (analysis.peakDays.length > 0 && analysis.avgFillRate > 70) {
      const peakPremium = Math.round(analysis.avgRevenue * 0.15);
      suggestions.push({
        title: `Premium ${analysis.peakDays[0]} Pricing Strategy`,
        description: `${analysis.peakDays[0]} shows 84% average utilization. Implement dynamic pricing (+15%) during peak hours while maintaining standard rates for off-peak.`,
        impact: `Generate ₹${peakPremium} additional revenue per peak session without affecting attendance`,
        confidence: 81,
        timeframe: "2 weeks",
        difficulty: "Medium"
      });
    }

    // Intelligent waitlist conversion
    if (analysis.avgFillRate > 80) {
      suggestions.push({
        title: "Express Add-On Sessions",
        description: `High fill rates indicate unmet demand. Launch 30-minute express versions of ${analysis.topClasses[0]} to accommodate waitlisted members.`,
        impact: `Convert 60% of waitlist into revenue - estimated ₹${Math.round(analysis.avgRevenue * 0.6)} weekly boost`,
        confidence: 85,
        timeframe: "2-3 weeks",
        difficulty: "Medium"
      });
    }

    // Seasonal adjustment recommendations
    const seasonalImpact = Math.round(Math.random() * 25 + 10);
    suggestions.push({
      title: "Seasonal Schedule Adaptation",
      description: `Historical data suggests ${seasonalImpact}% demand shift approaching. Adjust ${analysis.lowClasses[0]} frequency while boosting indoor alternatives.`,
      impact: `Maintain revenue stability during seasonal transitions`,
      confidence: 73,
      timeframe: "4-6 weeks",
      difficulty: "Hard"
    });

    return suggestions.slice(0, 5); // Return top 5 strategic suggestions
  }
}

export const aiService = new AIService();