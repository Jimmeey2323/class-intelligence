export interface ClassData {
  day: string;
  timeRaw: string;
  timeDate: Date | null;
  time: string;
  location: string;
  className: string;
  trainer1: string;
  cover: string;
  notes: string;
  uniqueKey: string;
}

export interface ScheduleData {
  [day: string]: ClassData[];
}

export interface ClassPerformanceData {
  className: string;
  day: string;
  time: string;
  location: string;
  avgCheckIns: number;
  avgCapacity: number;
  avgFillRate: number;
  totalSessions: number;
  lastSessionDate: string;
}

export interface MappedScheduleClass extends ClassData {
  historicalPerformance?: ClassPerformanceData;
  avgCheckIns?: number;
  recommendedCapacity?: number;
}