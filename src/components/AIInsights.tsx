import { useState, useEffect } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { aiService } from '../services/aiService';
import { 
  Brain, 
  TrendingUp, 
  Lightbulb, 
  Target, 
  Calendar, 
  DollarSign,
  Users,
  RefreshCw,
  Sparkles,
  BarChart3,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ScheduleRecommendation {
  title: string;
  description: string;
  timeframe: string;
  difficulty: string;
  confidence: number;
  expectedFillRate: number;
  expectedRevenue: number;
}

interface OptimalSchedule {
  recommendations: ScheduleRecommendation[];
  keyChanges: string[];
  expectedImpact: string;
}

export default function AIInsights() {
  const { filteredData } = useDashboardStore();
  const [insights, setInsights] = useState<string[]>([]);
  const [optimalSchedule, setOptimalSchedule] = useState<OptimalSchedule | null>(null);
  const [impactPrediction, setImpactPrediction] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'schedule' | 'impact'>('insights');

  const generateInsights = async () => {
    if (filteredData.length === 0) return;
    
    setLoading(true);
    try {
      const aiInsights = await aiService.generateInsights(filteredData);
      setInsights(aiInsights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      setInsights(['⚠️ Unable to generate AI insights at this time']);
    } finally {
      setLoading(false);
    }
  };

  const generateSchedule = async () => {
    if (filteredData.length === 0) return;
    
    setLoading(true);
    try {
      const result = await aiService.suggestOptimalSchedule(filteredData);
      
      // Convert suggestions to OptimalSchedule format
      const schedule = {
        recommendations: result.suggestions.map((suggestion) => ({
          title: `${suggestion.format} with ${suggestion.trainer}`,
          description: suggestion.reasoning,
          timeframe: `${suggestion.day} at ${suggestion.time}`,
          difficulty: suggestion.expectedFillRate > 70 ? 'low' : suggestion.expectedFillRate > 50 ? 'medium' : 'high',
          confidence: suggestion.expectedFillRate / 100,
          expectedFillRate: suggestion.expectedFillRate,
          expectedRevenue: 200 + suggestion.expectedFillRate * 3
        })),
        keyChanges: result.suggestions.slice(0, 5).map((s) => `${s.format} at ${s.location} (${s.day} ${s.time})`),
        expectedImpact: result.suggestions.length > 0 ? `${result.suggestions.length} optimization opportunities identified` : 'No changes recommended'
      };
      
      setOptimalSchedule(schedule);
    } catch (error) {
      console.error('Failed to generate schedule:', error);
      setOptimalSchedule({
        recommendations: [],
        keyChanges: ['Unable to generate schedule recommendations'],
        expectedImpact: 'AI service temporarily unavailable'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateImpactPrediction = async () => {
    if (filteredData.length === 0 || !optimalSchedule) return;
    
    setLoading(true);
    try {
      // Use the first recommendation as the proposed change
      const firstRecommendation = optimalSchedule.recommendations[0];
      const proposedChange = {
        type: 'add' as const,
        session: firstRecommendation ? {
          Class: firstRecommendation.title.split(' with ')[0],
          Trainer: firstRecommendation.title.split(' with ')[1] || 'Unknown'
        } : undefined
      };
      
      const prediction = await aiService.predictImpact(filteredData, proposedChange);
      const impactText = `${prediction.explanation} (Risk: ${prediction.riskLevel}, Confidence: ${(prediction.confidence * 100).toFixed(0)}%)`;
      setImpactPrediction(impactText);
    } catch (error) {
      console.error('Failed to generate impact prediction:', error);
      setImpactPrediction('Impact prediction temporarily unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'insights' && insights.length === 0) {
      generateInsights();
    } else if (activeTab === 'schedule' && !optimalSchedule) {
      generateSchedule();
    } else if (activeTab === 'impact' && !impactPrediction && optimalSchedule) {
      generateImpactPrediction();
    }
  }, [activeTab, filteredData]);

  if (filteredData.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center">
        <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-700 mb-2">AI Insights</h3>
        <p className="text-gray-500">Upload data to get intelligent recommendations and insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">AI-Powered Insights</h2>
              <p className="text-gray-600">Smart recommendations powered by Gemini AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
              AI Enhanced
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'insights'
                ? 'bg-white text-purple-700 shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            Smart Insights
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'schedule'
                ? 'bg-white text-purple-700 shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Optimal Schedule
          </button>
          <button
            onClick={() => setActiveTab('impact')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'impact'
                ? 'bg-white text-purple-700 shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Target className="w-4 h-4" />
            Impact Analysis
          </button>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-card rounded-3xl p-6"
      >
        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-600">AI is analyzing your data...</p>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Smart Insights & Recommendations</h3>
              <button
                onClick={generateInsights}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
            
            <div className="grid gap-4">
              {insights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border-l-4 border-purple-500"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Lightbulb className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-gray-800 leading-relaxed">{insight}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && !loading && optimalSchedule && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">AI-Optimized Schedule</h3>
              <button
                onClick={generateSchedule}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
            </div>

            {/* Key Changes */}
            <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500 mb-6">
              <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Key Recommendations
              </h4>
              <ul className="space-y-1">
                {optimalSchedule.keyChanges.map((change, index) => (
                  <li key={index} className="text-blue-700">• {change}</li>
                ))}
              </ul>
            </div>

            {/* Schedule Recommendations */}
            <div className="grid gap-4">
              {optimalSchedule.recommendations.map((rec, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100">
                        <Calendar className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <h5 className="font-bold text-gray-800">{rec.title}</h5>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {rec.timeframe}
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            {rec.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{rec.expectedFillRate}%</div>
                          <div className="text-xs text-gray-500">Fill Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">₹{Math.round(rec.expectedRevenue)}</div>
                          <div className="text-xs text-gray-500">Revenue</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm bg-gray-50 rounded-lg p-3">{rec.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Expected Impact */}
            <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-500">
              <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Expected Impact
              </h4>
              <p className="text-green-700">{optimalSchedule.expectedImpact}</p>
            </div>
          </div>
        )}

        {/* Impact Tab */}
        {activeTab === 'impact' && !loading && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Schedule Change Impact Analysis</h3>
              <button
                onClick={generateImpactPrediction}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Analyze
              </button>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border-l-4 border-orange-500">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-orange-100">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-bold text-orange-800 mb-3">Predicted Impact</h4>
                  <p className="text-gray-800 leading-relaxed">{impactPrediction || 'Click "Analyze" to generate impact predictions based on the optimal schedule recommendations.'}</p>
                </div>
              </div>
            </div>

            {/* Impact Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-800">Attendance</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">+15-25%</div>
                <div className="text-sm text-gray-500">Expected increase</div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-gray-800">Revenue</span>
                </div>
                <div className="text-2xl font-bold text-green-600">+20-30%</div>
                <div className="text-sm text-gray-500">Projected growth</div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-800">Efficiency</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">+10-20%</div>
                <div className="text-sm text-gray-500">Capacity utilization</div>        
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}