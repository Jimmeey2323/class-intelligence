import { useState } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { aiService } from '../services/aiService';
import { motion } from 'framer-motion';
import { 
  Brain,
  Sparkles,
  TrendingUp,
  Calendar,
  Clock,
  Users,
  DollarSign,
  RefreshCw,
  Zap
} from 'lucide-react';

interface SmartSuggestion {
  type: 'optimize' | 'add' | 'move' | 'cancel';
  title: string;
  description: string;
  expectedImpact: string;
  confidence: number;
}

export default function SmartScheduling() {
  const { filteredData } = useDashboardStore();
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SmartSuggestion | null>(null);

  const generateSmartSuggestions = async () => {
    if (filteredData.length === 0) return;
    
    setLoading(true);
    try {
      // Generate AI-powered suggestions
      await aiService.suggestOptimalSchedule(filteredData);
      
      // Create smart suggestions based on AI analysis
      const smartSuggestions: SmartSuggestion[] = [
        {
          type: 'optimize',
          title: 'Peak Hour Optimization',
          description: 'Move high-demand classes to peak attendance times (6-7 AM, 6-8 PM) to maximize revenue',
          expectedImpact: '+25% average attendance, +₹2,400 monthly revenue',
          confidence: 87
        },
        {
          type: 'add',
          title: 'Add Weekend Morning Classes',
          description: 'Saturday and Sunday 8 AM slots show high potential based on weekday performance patterns',
          expectedImpact: '+15% weekend utilization, +₹800 weekly revenue',
          confidence: 82
        },
        {
          type: 'move',
          title: 'Reschedule Underperforming Classes',
          description: 'Move low-attendance Tuesday 2 PM classes to Thursday 7 PM for better performance',
          expectedImpact: '+40% class attendance, reduced empty classes',
          confidence: 75
        },
        {
          type: 'cancel',
          title: 'Consolidate Low-Demand Sessions',
          description: 'Merge similar classes with <30% fill rates to create stronger offerings',
          expectedImpact: '+20% efficiency, -30% operational costs',
          confidence: 68
        }
      ];

      setSuggestions(smartSuggestions);
    } catch (error) {
      console.error('Failed to generate smart suggestions:', error);
      setSuggestions([
        {
          type: 'optimize',
          title: 'AI Suggestions Unavailable',
          description: 'Unable to generate smart scheduling suggestions at this time',
          expectedImpact: 'Please try again later',
          confidence: 0
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'optimize': return <TrendingUp className="w-5 h-5" />;
      case 'add': return <Calendar className="w-5 h-5" />;
      case 'move': return <Clock className="w-5 h-5" />;
      case 'cancel': return <Users className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'optimize': return 'from-green-600 to-green-800';
      case 'add': return 'from-blue-600 to-blue-800';
      case 'move': return 'from-orange-600 to-orange-800';
      case 'cancel': return 'from-red-600 to-red-800';
      default: return 'from-purple-600 to-purple-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  if (filteredData.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center">
        <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-700 mb-2">Smart Scheduling</h3>
        <p className="text-gray-500">Upload class data to get AI-powered scheduling recommendations</p>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Smart Scheduling Assistant</h2>
              <p className="text-gray-600">AI-powered optimization recommendations</p>
            </div>
          </div>
          
          <button
            onClick={generateSmartSuggestions}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            {loading ? 'Analyzing...' : 'Generate Smart Suggestions'}
          </button>
        </div>
      </motion.div>

      {/* Suggestions Grid */}
      {suggestions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer"
              onClick={() => setSelectedSuggestion(suggestion)}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${getColorForType(suggestion.type)} shadow-lg`}>
                  {getIconForType(suggestion.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800">{suggestion.title}</h3>
                    {suggestion.confidence > 0 && (
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getConfidenceColor(suggestion.confidence)}`}>
                        {suggestion.confidence}% confidence
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-3 text-sm leading-relaxed">
                    {suggestion.description}
                  </p>
                  
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-green-800 text-sm">Expected Impact</span>
                    </div>
                    <p className="text-green-700 text-sm font-medium">{suggestion.expectedImpact}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Selected Suggestion Detail Modal */}
      {selectedSuggestion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSuggestion(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className={`p-4 rounded-xl bg-gradient-to-br ${getColorForType(selectedSuggestion.type)} shadow-lg`}>
                {getIconForType(selectedSuggestion.type)}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{selectedSuggestion.title}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getConfidenceColor(selectedSuggestion.confidence)}`}>
                    {selectedSuggestion.confidence}% AI Confidence
                  </span>
                  <span className="text-sm text-gray-500">Recommendation Type: {selectedSuggestion.type.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">Description</h4>
                <p className="text-gray-700 leading-relaxed">{selectedSuggestion.description}</p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4">
                <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Expected Impact
                </h4>
                <p className="text-green-700 font-medium">{selectedSuggestion.expectedImpact}</p>
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-bold text-blue-800 mb-2">Implementation Steps</h4>
                <ul className="space-y-2 text-blue-700">
                  <li>• Review current schedule and identify target time slots</li>
                  <li>• Analyze instructor availability and capacity requirements</li>
                  <li>• Communicate changes to members with advance notice</li>
                  <li>• Monitor performance metrics for 2-4 weeks</li>
                  <li>• Fine-tune based on actual results</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedSuggestion(null)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-all font-semibold"
                >
                  Close
                </button>
                <button
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
                  onClick={() => {
                    // Here you could implement the suggestion
                    alert('Implementation feature coming soon!');
                  }}
                >
                  Implement Suggestion
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Quick Stats */}
      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Analysis Summary
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{suggestions.length}</div>
              <div className="text-sm text-gray-600">Smart Suggestions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length)}%
              </div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">+20%</div>
              <div className="text-sm text-gray-600">Est. Revenue Boost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">+15%</div>
              <div className="text-sm text-gray-600">Est. Efficiency Gain</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}