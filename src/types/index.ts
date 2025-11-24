// Core session data from CSV
export interface SessionData {
  TrainerID: string;
  FirstName: string;
  LastName: string;
  Trainer: string;
  SessionID: string;
  SessionName: string;
  Capacity: number;
  CheckedIn: number;
  LateCancelled: number;
  Booked: number;
  Complimentary: number;
  Location: string;
  Date: string; // Will be parsed to Date
  Day: string;
  Time: string;
  Revenue: number;
  NonPaid: number;
  UniqueID1: string;
  UniqueID2: string;
  Memberships: number;
  Packages: number;
  IntroOffers: number;
  SingleClasses: number;
  Type: string;
  Class: string;
  Classes: number;
  Waitlisted?: number;
  NoShow?: number;
  Status?: 'Active' | 'Inactive'; // Calculated field
  FillRate?: number; // Calculated field (CheckedIn/Capacity * 100)
}

// Individual check-in record data
export interface CheckinData {
  MemberID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  OrderAt: string;
  Paid: number;
  PaymentMethodName: string;
  CheckedIn: boolean;
  Complementary: boolean;
  IsLateCancelled: boolean;
  SessionID: string;
  SessionName: string;
  Capacity: number;
  Location: string;
  Date: string;
  DayOfWeek: string;
  Time: string;
  DurationMinutes: number;
  TeacherName: string;
  CleanedProduct: string;
  CleanedCategory: string;
  CleanedClass: string;
  HostID: number;
  Month: string;
  Year: number;
  ClassNo: number;
  IsNew: string;
  UniqueID1: string;
  UniqueID2: string;
}

// Enhanced session data with check-in details
export interface EnhancedSessionData extends SessionData {
  checkins?: CheckinData[];
  uniqueMembers?: number;
  newMembersCount?: number;
  returningMembersCount?: number;
  membershipCount?: number;
  packageCount?: number;
  introOfferCount?: number;
  singleClassCount?: number;
  averageClassNo?: number;
  paidRevenue?: number;
  complementaryCount?: number;
  consistentAttendees?: number;
  randomAttendees?: number;
  lateCancellationRate?: number;
  memberRetentionRate?: number;
  averageMemberClassNo?: number;
}

// Member attendance pattern
export interface MemberAttendancePattern {
  memberId: string;
  memberName: string;
  email: string;
  totalClasses: number;
  lifetimeClassNo: number;
  paymentCategory: string;
  isNew: boolean;
  attendedClasses: string[]; // SessionIDs
  attendedClassNames: string[];
  attendedLocations: string[];
  attendedDays: string[];
  cancelledCount: number;
  lateCancelledCount: number;
  consistencyScore: number; // 0-100: measures if they attend same classes
  classLoyalty: { [className: string]: number }; // Count per class
  locationLoyalty: { [location: string]: number };
  dayPreference: { [day: string]: number };
  timePreference: { [time: string]: number };
  firstVisit: string;
  lastVisit: string;
  bookingPattern: 'consistent' | 'random' | 'mixed';
  cancellationRate: number;
  averageRevenue: number;
}

// Booking and cancellation behavior by segment
export interface BookingBehavior {
  segment: string; // e.g., "Memberships", "Package", "Pilates Mat", etc.
  segmentType: 'paymentCategory' | 'classType' | 'location' | 'trainer';
  totalMembers: number;
  totalBookings: number;
  totalCheckIns: number;
  totalCancellations: number;
  lateCancellations: number;
  cancellationRate: number;
  lateCancellationRate: number;
  showUpRate: number;
  averageBookingsPerMember: number;
  consistentMembers: number;
  randomMembers: number;
  newMembers: number;
  returningMembers: number;
  averageClassNo: number;
  totalRevenue: number;
  averageRevenuePerMember: number;
}

// Member cohort analysis (new vs repeat)
export interface MemberCohort {
  cohortType: 'new' | 'returning' | 'loyal' | 'at-risk' | 'churned';
  memberCount: number;
  totalClasses: number;
  averageClassesPerMember: number;
  totalRevenue: number;
  averageRevenuePerMember: number;
  cancellationRate: number;
  retentionRate: number;
  paymentMix: {
    memberships: number;
    packages: number;
    introOffers: number;
    singleClasses: number;
  };
  preferredClasses: { className: string; count: number }[];
  preferredLocations: { location: string; count: number }[];
}

// Calculated metrics for grouped data
export interface CalculatedMetrics {
  classes: number;
  emptyClasses: number;
  nonEmptyClasses: number;
  complimentaryVisits: number;
  fillRate: number;
  cancellationRate: number;
  rank: number;
  classAvg: number;
  classAvgNonEmpty: number;
  waitlistRate: number;
  revPerBooking: number;
  revPerCheckin: number;
  revLostPerCancellation: number;
  weightedAverage: number;
  consistencyScore: number;
  totalRevenue: number;
  totalCheckIns: number;
  totalBookings: number;
  totalCancellations: number;
  totalCapacity: number;
  totalBooked: number;
  totalWaitlisted: number;
  status: 'Active' | 'Inactive';
  mostRecentDate?: Date;
  compositeScore: number;
}

// Grouped row data
export interface GroupedRow extends Partial<SessionData>, CalculatedMetrics {
  groupKey: string;
  groupValue: string;
  cleanedClass?: string;
  cleanedDay?: string;
  cleanedTime?: string;
  cleanedLocation?: string;
  children?: SessionData[];
  isGroupRow: true;
}

// Column width settings
export interface ColumnWidthSettings {
  [columnId: string]: number;
}

// Quick filter preset
export interface QuickFilter {
  id: string;
  label: string;
  minCheckins: number;
  minFillRate?: number;
  minRevenue?: number;
}

// Filter state
export interface FilterState {
  dateFrom: Date;
  dateTo: Date;
  trainers: string[];
  locations: string[];
  classTypes: string[];
  classes: string[];
  minCheckins: number;
  minClasses?: number;
  searchQuery: string;
  statusFilter?: 'all' | 'active' | 'inactive';
  excludeHostedClasses?: boolean;
  includeTrainer?: boolean;
  searchResults?: SessionData[];
}

// View modes
export type ViewMode = 'grouped' | 'flat';
export type GroupBy = 
  | 'ClassDayTimeLocation' // Class + Day + Time + Location (default)
  | 'ClassDayTimeLocationTrainer' // Class + Day + Time + Location + Trainer
  | 'Class'
  | 'Type'
  | 'Trainer'
  | 'Location'
  | 'Day'
  | 'Date'
  | 'Time'
  | 'SessionName'
  | 'LocationClass' // Location + Class
  | 'ClassDay' // Class + Day
  | 'ClassDayTrainer' // Class + Day + Trainer
  | 'DayTimeLocation' // Day + Time + Location
  | 'ClassTime' // Class + Time
  | 'TrainerLocation' // Trainer + Location
  | 'DayLocation' // Day + Location
  | 'TimeLocation' // Time + Location
  | 'ClassType' // Class + Type
  | 'TypeLocation' // Type + Location
  | 'TrainerDay' // Trainer + Day
  | 'ClassTrainer' // Class + Trainer
  | 'DayTime' // Day + Time
  | 'ClassLocation' // Class + Location
  | 'TrainerTime'; // Trainer + Time

export type AdditionalView = 
  | 'metrics'
  | 'revenue'
  | 'attendance'
  | 'performance'
  | 'trends'
  | 'cancellations'
  | 'capacity';

export type TableView = 
  | 'default'
  | 'performance'
  | 'revenue'
  | 'attendance'
  | 'capacity'
  | 'cancellations'
  | 'consistency';

export type RankingMetric = 
  | 'classAvg'
  | 'fillRate'
  | 'totalCheckIns'
  | 'totalRevenue'
  | 'revPerCheckin'
  | 'consistencyScore'
  | 'cancellationRate'
  | 'classes'
  | 'emptyClasses'
  | 'compositeScore';

// Store state
export interface DashboardState {
  // Data
  rawData: SessionData[];
  filteredData: SessionData[]; // Filtered sessions before grouping
  processedData: (SessionData | GroupedRow)[];
  scheduleData: { [day: string]: any[] }; // Schedule data from uploaded CSV
  activeClassesData: { [day: string]: any[] }; // Active classes loaded from Active.csv
  
  // Filters
  filters: FilterState;
  
  // View configuration
  viewMode: ViewMode;
  groupBy: GroupBy;
  additionalView: AdditionalView | null;
  includeTrainerInRankings: boolean;
  
  // UI state
  expandedGroups: Set<string>;
  selectedRows: Set<string>;
  isFilterCollapsed: boolean;
  columnWidths: ColumnWidthSettings;
  columnVisibility: Record<string, boolean>;
  excludeHostedClasses: boolean;
  tableView: TableView;
  
  // Sorting
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  rankingMetric: RankingMetric;
  
  // Actions
  getAverageCheckIns: (className: string, day: string, time: string, location: string) => {
    avgCheckIns: number;
    totalSessions: number;
    lastSessionDate: string;
  } | null;
  setRawData: (data: SessionData[]) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setViewMode: (mode: ViewMode) => void;
  setGroupBy: (groupBy: GroupBy) => void;
  setAdditionalView: (view: AdditionalView | null) => void;
  toggleGroup: (groupKey: string) => void;
  toggleFilterCollapse: () => void;
  setSorting: (column: string, direction: 'asc' | 'desc') => void;
  setRankingMetric: (metric: RankingMetric) => void;
  setColumnWidth: (columnId: string, width: number) => void;
  setIncludeTrainerInRankings: (include: boolean) => void;
  setColumnVisibility: (columnId: string, visible: boolean) => void;
  setExcludeHostedClasses: (exclude: boolean) => void;
  setTableView: (view: TableView) => void;
  setScheduleData: (scheduleData: { [day: string]: any[] }) => void;
  applyFilters: () => void;
  exportData: (format: 'csv' | 'xlsx') => void;
}

// Rankings
export interface RankingItem {
  name: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
}

// Chart data
export interface ChartDataPoint {
  date: string;
  value: number;
  category?: string;
}

// Drilldown modal data
export interface DrilldownData {
  session: SessionData;
  rawRows: SessionData[];
  attendees?: Array<{ name: string; email: string; payment: number }>;
  historicalData?: ChartDataPoint[];
  memberPatterns?: MemberAttendancePattern[];
  bookingBehavior?: BookingBehavior[];
  cohortAnalysis?: MemberCohort[];
}
