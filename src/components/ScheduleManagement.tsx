import { useState, useCallback } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  MapPin,
  Users,
  Clock
} from 'lucide-react';
import { MappedScheduleClass } from '../types/schedule';
import { 
  extractScheduleData, 
  calculateClassPerformance, 
  mapScheduleWithPerformance 
} from '../utils/scheduleParser';

export default function ScheduleManagement() {
  const { rawData } = useDashboardStore();
  const [scheduleData, setScheduleData] = useState<{ [day: string]: MappedScheduleClass[] }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Check if filename contains "schedule"
    if (!file.name.toLowerCase().includes('schedule')) {
      setUploadError('Please upload a CSV file with "schedule" in the filename.');
      return;
    }

    setIsProcessing(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const csvText = await file.text();
      const parsedSchedule = await extractScheduleData(csvText);
      
      // Calculate performance data from historic sessions
      const performanceData = calculateClassPerformance(rawData);
      
      // Map schedule with historic performance
      const mappedSchedule = mapScheduleWithPerformance(parsedSchedule, performanceData);
      
      setScheduleData(mappedSchedule);
      setUploadSuccess(true);
      
    } catch (error) {
      console.error('Error processing schedule file:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to process schedule file');
    } finally {
      setIsProcessing(false);
    }
  }, [rawData]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const getPerformanceIndicator = (mappedClass: MappedScheduleClass) => {
    if (!mappedClass.historicalPerformance) {
      return { icon: Minus, color: 'text-gray-400', text: 'No Data' };
    }

    const fillRate = mappedClass.historicalPerformance.avgFillRate;
    if (fillRate >= 80) {
      return { icon: TrendingUp, color: 'text-green-500', text: 'High Demand' };
    } else if (fillRate >= 50) {
      return { icon: Minus, color: 'text-yellow-500', text: 'Medium Demand' };
    } else {
      return { icon: TrendingDown, color: 'text-red-500', text: 'Low Demand' };
    }
  };

  const totalClasses = Object.values(scheduleData).reduce((sum, classes) => sum + classes.length, 0);
  const classesWithData = Object.values(scheduleData)
    .flat()
    .filter(c => c.historicalPerformance).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mb-4">
          Schedule Management
        </h2>
        <p className="text-gray-600">
          Upload your class schedule CSV to analyze performance and optimize capacity planning
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-8">
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            isProcessing 
              ? 'border-blue-300 bg-blue-50' 
              : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            accept=".csv"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
            id="schedule-upload"
          />
          
          {isProcessing ? (
            <div className="space-y-4">
              <div className="animate-spin mx-auto w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-blue-600 font-semibold">Processing schedule file...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-16 h-16 text-gray-400 mx-auto" />
              <div>
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  Upload Schedule CSV
                </p>
                <p className="text-gray-500 mb-4">
                  Drop your schedule file here or click to browse
                </p>
                <label
                  htmlFor="schedule-upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all cursor-pointer"
                >
                  <FileText className="w-5 h-5" />
                  Choose File
                </label>
              </div>
              <p className="text-sm text-gray-400">
                File must contain "schedule" in the name and be in CSV format
              </p>
            </div>
          )}
        </div>

        {/* Upload Status */}
        <AnimatePresence>
          {uploadError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700">{uploadError}</p>
            </motion.div>
          )}
          
          {uploadSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="text-green-700">
                Schedule uploaded successfully! Found {totalClasses} classes, {classesWithData} with historical data.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Schedule Data Display */}
      {Object.keys(scheduleData).length > 0 && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Classes</p>
                  <p className="text-3xl font-bold text-green-600">{totalClasses}</p>
                </div>
                <Calendar className="w-10 h-10 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">With Historic Data</p>
                  <p className="text-3xl font-bold text-blue-600">{classesWithData}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Data Coverage</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {totalClasses > 0 ? Math.round((classesWithData / totalClasses) * 100) : 0}%
                  </p>
                </div>
                <Users className="w-10 h-10 text-purple-500" />
              </div>
            </div>
            
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Predicted</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {classesWithData > 0 ? 
                      Math.round(Object.values(scheduleData)
                        .flat()
                        .filter(c => c.avgCheckIns)
                        .reduce((sum, c) => sum + (c.avgCheckIns || 0), 0) / classesWithData * 10) / 10
                      : 0}
                  </p>
                </div>
                <Clock className="w-10 h-10 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Day Navigation */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-2">
            <div className="flex gap-2 overflow-x-auto">
              {daysOrder.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                    selectedDay === day
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {day}
                  {scheduleData[day] && (
                    <span className="ml-2 text-xs opacity-75">
                      ({scheduleData[day].length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule for Selected Day */}
          {scheduleData[selectedDay] && scheduleData[selectedDay].length > 0 ? (
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">
                {selectedDay} Schedule ({scheduleData[selectedDay].length} classes)
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {scheduleData[selectedDay]
                  .sort((a, b) => {
                    if (a.timeDate && b.timeDate) {
                      return a.timeDate.getTime() - b.timeDate.getTime();
                    }
                    return 0;
                  })
                  .map((mappedClass, index) => {
                    const performance = getPerformanceIndicator(mappedClass);
                    const PerformanceIcon = performance.icon;
                    
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-gray-800 mb-1">
                              {mappedClass.className}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {mappedClass.time}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {mappedClass.location}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              👤 {mappedClass.trainer1}
                              {mappedClass.notes && (
                                <span className="ml-2 text-blue-600">({mappedClass.notes})</span>
                              )}
                            </div>
                          </div>
                          
                          <div className={`flex items-center gap-2 ${performance.color}`}>
                            <PerformanceIcon className="w-5 h-5" />
                            <span className="text-sm font-semibold">{performance.text}</span>
                          </div>
                        </div>
                        
                        {mappedClass.historicalPerformance ? (
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Avg Check-ins:</span>
                                <span className="font-semibold ml-2 text-green-600">
                                  {mappedClass.historicalPerformance.avgCheckIns}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Avg Capacity:</span>
                                <span className="font-semibold ml-2 text-blue-600">
                                  {mappedClass.historicalPerformance.avgCapacity}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Fill Rate:</span>
                                <span className="font-semibold ml-2 text-purple-600">
                                  {mappedClass.historicalPerformance.avgFillRate}%
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Sessions:</span>
                                <span className="font-semibold ml-2 text-gray-600">
                                  {mappedClass.historicalPerformance.totalSessions}
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 border-t pt-2">
                              Last session: {mappedClass.historicalPerformance.lastSessionDate || 'Unknown'}
                            </div>
                            {mappedClass.recommendedCapacity && (
                              <div className="text-sm">
                                <span className="text-gray-600">Recommended Capacity:</span>
                                <span className="font-bold ml-2 text-green-700">
                                  {mappedClass.recommendedCapacity}
                                </span>
                                <span className="text-xs text-gray-500 ml-1">
                                  (10% buffer)
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                            <p className="text-sm text-yellow-700">
                              No historical data found for this class format
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                              Upload more historic session data to get performance insights
                            </p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-600 mb-2">No Classes Scheduled</p>
              <p className="text-gray-500">No classes found for {selectedDay}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}