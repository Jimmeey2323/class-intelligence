// Pro Scheduler utility functions and types

import { SessionData } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  revenue: number;
  status: 'Active' | 'Inactive';
  conflicts: string[];
  recommendations: string[];
  isEditing?: boolean;
}

export interface ScheduleOptimization {
  type: 'underperforming' | 'high-demand' | 'gap' | 'conflict';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  impact: string;
  classes?: ScheduleClass[];
}

// Calculate optimal time slots based on historical data
export function calculateOptimalTimeSlots(sessions: SessionData[]): { [timeSlot: string]: number } {
  const timeSlotPerformance: { [timeSlot: string]: number[] } = {};
  
  sessions.forEach(session => {
    const timeSlot = session.Time?.substring(0, 5) || '';
    if (!timeSlotPerformance[timeSlot]) {
      timeSlotPerformance[timeSlot] = [];
    }
    
    const fillRate = session.Capacity > 0 ? (session.CheckedIn / session.Capacity) * 100 : 0;
    timeSlotPerformance[timeSlot].push(fillRate);
  });
  
  const optimalSlots: { [timeSlot: string]: number } = {};
  Object.entries(timeSlotPerformance).forEach(([timeSlot, fillRates]) => {
    const avgFillRate = fillRates.reduce((sum, rate) => sum + rate, 0) / fillRates.length;
    optimalSlots[timeSlot] = avgFillRate;
  });
  
  return optimalSlots;
}

// Generate optimization recommendations
export function generateOptimizations(classes: ScheduleClass[]): ScheduleOptimization[] {
  const optimizations: ScheduleOptimization[] = [];
  
  // Find underperforming classes
  const underperforming = classes.filter(c => c.fillRate < 50 && c.sessionCount >= 4);
  if (underperforming.length > 0) {
    optimizations.push({
      type: 'underperforming',
      priority: 'high',
      title: `${underperforming.length} Underperforming Classes`,
      description: 'Classes with fill rates below 50% need attention',
      action: 'Consider time changes, marketing, or format modifications',
      impact: `Potential revenue increase of $${underperforming.reduce((sum, c) => sum + (c.capacity - c.avgCheckIns) * 25, 0)}`,
      classes: underperforming
    });
  }
  
  // Find high-demand classes
  const highDemand = classes.filter(c => c.fillRate > 90);
  if (highDemand.length > 0) {
    optimizations.push({
      type: 'high-demand',
      priority: 'medium',
      title: `${highDemand.length} High-Demand Classes`,
      description: 'Classes with fill rates above 90% show expansion opportunity',
      action: 'Consider adding additional sessions or increasing capacity',
      impact: `Potential revenue increase of $${highDemand.length * 500}`,
      classes: highDemand
    });
  }
  
  // Find conflicts
  const conflicted = classes.filter(c => c.conflicts.length > 0);
  if (conflicted.length > 0) {
    optimizations.push({
      type: 'conflict',
      priority: 'high',
      title: `${conflicted.reduce((sum, c) => sum + c.conflicts.length, 0)} Schedule Conflicts`,
      description: 'Trainer or location conflicts need immediate resolution',
      action: 'Reassign trainers or adjust time slots',
      impact: 'Operational efficiency improvement',
      classes: conflicted
    });
  }
  
  return optimizations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

// Export schedule to CSV
export function exportToCSV(classes: ScheduleClass[]): void {
  const csvData = classes.map(cls => ({
    'Day': cls.day,
    'Time': cls.time,
    'Class': cls.class,
    'Trainer': cls.trainer,
    'Location': cls.location,
    'Capacity': cls.capacity,
    'Avg Check-ins': cls.avgCheckIns,
    'Fill Rate (%)': cls.fillRate,
    'Session Count': cls.sessionCount,
    'Revenue ($)': cls.revenue,
    'Status': cls.status,
    'Conflicts': cls.conflicts.join('; '),
    'Recommendations': cls.recommendations.join('; ')
  }));
  
  const ws = XLSX.utils.json_to_sheet(csvData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Schedule');
  XLSX.writeFile(wb, `pro-schedule-${new Date().toISOString().split('T')[0]}.csv`);
}

// Export schedule to Excel
export function exportToExcel(classes: ScheduleClass[]): void {
  const wb = XLSX.utils.book_new();
  
  // Main schedule sheet
  const scheduleData = classes.map(cls => ({
    'Day': cls.day,
    'Time': cls.time,
    'Class': cls.class,
    'Trainer': cls.trainer,
    'Location': cls.location,
    'Capacity': cls.capacity,
    'Avg Check-ins': cls.avgCheckIns,
    'Fill Rate (%)': cls.fillRate,
    'Session Count': cls.sessionCount,
    'Revenue ($)': cls.revenue,
    'Status': cls.status,
    'Conflicts': cls.conflicts.join('; '),
    'Recommendations': cls.recommendations.join('; ')
  }));
  
  const ws1 = XLSX.utils.json_to_sheet(scheduleData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Schedule');
  
  // Analytics sheet
  const analytics = [
    ['Metric', 'Value'],
    ['Total Classes', classes.length],
    ['Total Capacity', classes.reduce((sum, c) => sum + c.capacity, 0)],
    ['Average Fill Rate (%)', Math.round(classes.reduce((sum, c) => sum + c.fillRate, 0) / classes.length)],
    ['Total Revenue ($)', classes.reduce((sum, c) => sum + c.revenue, 0)],
    ['Total Conflicts', classes.reduce((sum, c) => sum + c.conflicts.length, 0)]
  ];
  
  const ws2 = XLSX.utils.aoa_to_sheet(analytics);
  XLSX.utils.book_append_sheet(wb, ws2, 'Analytics');
  
  XLSX.writeFile(wb, `pro-schedule-analysis-${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Export schedule to PDF
export function exportToPDF(classes: ScheduleClass[]): void {
  const doc = new jsPDF('landscape');
  
  // Title
  doc.setFontSize(20);
  doc.text('Pro Scheduler - Class Schedule Analysis', 20, 20);
  
  // Date
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
  
  // Summary metrics
  const totalClasses = classes.length;
  const avgFillRate = Math.round(classes.reduce((sum, c) => sum + c.fillRate, 0) / classes.length);
  const totalRevenue = classes.reduce((sum, c) => sum + c.revenue, 0);
  const totalConflicts = classes.reduce((sum, c) => sum + c.conflicts.length, 0);
  
  doc.text(`Total Classes: ${totalClasses} | Avg Fill Rate: ${avgFillRate}% | Revenue: $${totalRevenue} | Conflicts: ${totalConflicts}`, 20, 40);
  
  // Schedule table
  const tableData = classes.map(cls => [
    cls.day,
    cls.time,
    cls.class,
    cls.trainer,
    cls.location,
    cls.fillRate + '%',
    '$' + cls.revenue,
    cls.status
  ]);
  
  (doc as any).autoTable({
    head: [['Day', 'Time', 'Class', 'Trainer', 'Location', 'Fill Rate', 'Revenue', 'Status']],
    body: tableData,
    startY: 50,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] }
  });
  
  doc.save(`pro-schedule-${new Date().toISOString().split('T')[0]}.pdf`);
}

// Calculate schedule coverage score
export function calculateScheduleCoverage(classes: ScheduleClass[]): number {
  const TOTAL_POSSIBLE_SLOTS = 7 * 15; // 7 days × 15 prime time slots (6 AM - 9 PM)
  return Math.min((classes.length / TOTAL_POSSIBLE_SLOTS) * 100, 100);
}

// Find optimal trainer assignments
export function optimizeTrainerAssignments(classes: ScheduleClass[]): { [trainerId: string]: string[] } {
  const trainerLoad: { [trainerId: string]: string[] } = {};
  
  classes.forEach(cls => {
    if (!trainerLoad[cls.trainer]) {
      trainerLoad[cls.trainer] = [];
    }
    trainerLoad[cls.trainer].push(`${cls.day} ${cls.time}`);
  });
  
  return trainerLoad;
}

// Generate smart scheduling suggestions
export function generateSmartSuggestions(
  classes: ScheduleClass[], 
  sessions: SessionData[]
): string[] {
  const suggestions: string[] = [];
  const timeSlotPerformance = calculateOptimalTimeSlots(sessions);
  
  // Peak time analysis
  const peakTimes = Object.entries(timeSlotPerformance)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([time]) => time);
    
  suggestions.push(`Peak performance times: ${peakTimes.join(', ')}`);
  
  // Coverage gaps
  const coverage = calculateScheduleCoverage(classes);
  if (coverage < 60) {
    suggestions.push(`Schedule coverage is ${Math.round(coverage)}% - consider adding more classes during peak hours`);
  }
  
  // Trainer utilization
  const trainerAssignments = optimizeTrainerAssignments(classes);
  const underutilizedTrainers = Object.entries(trainerAssignments)
    .filter(([, slots]) => slots.length < 5)
    .map(([trainer]) => trainer);
    
  if (underutilizedTrainers.length > 0) {
    suggestions.push(`Consider assigning more classes to: ${underutilizedTrainers.slice(0, 3).join(', ')}`);
  }
  
  return suggestions;
}