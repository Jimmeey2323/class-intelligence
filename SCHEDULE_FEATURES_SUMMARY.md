# New Features: Average Check-ins & Schedule Management

## ✨ Features Implemented

### 1. **Average Check-ins Display** 📊

**Location**: Calendar Views (Grid, Horizontal)
**Purpose**: Show historical performance for better scheduling decisions

#### What's New:
- **Current + Average**: Each class now displays both current check-ins and historical average
- **Grid View**: Shows "Avg: X.X" below the current capacity display
- **Horizontal View**: Shows detailed breakdown with "Current: X/Y" and "Avg: X.X (N sessions)"
- **Smart Calculation**: Matches by exact class name, day, time, and location
- **Future Planning**: Especially useful for planning future class capacities

#### Display Format:
```
Grid View:
┌─────────────────────┐
│ Studio Barre 57     │
│ 12/20  Avg: 14.5    │
│ 👤 Trainer Name     │
│ 🕐 9:00 AM          │
└─────────────────────┘

Horizontal View:
Current: 12/20
Avg: 14.5 (8 sessions)
```

### 2. **Schedule Management Tab** 📅

**Location**: New tab in main navigation
**Purpose**: Upload and analyze class schedules with performance mapping

#### Key Features:

##### File Upload System
- **Drag & Drop**: Modern file upload interface
- **Validation**: Only accepts CSV files with "schedule" in filename
- **Processing**: Real-time feedback with loading states
- **Error Handling**: Clear error messages for invalid files

##### Schedule Processing
- **CSV Parsing**: Handles complex schedule CSV structures
- **Data Normalization**: Standardizes class names, locations, trainers
- **Time Parsing**: Supports both 12-hour and 24-hour formats
- **Validation**: Filters out invalid entries and trainer names

##### Performance Mapping
- **Historic Matching**: Maps schedule classes to historic performance data
- **Matching Logic**: Exact match by normalized class name, day, time, location
- **Metrics Calculation**: Average check-ins, capacity, fill rate
- **Coverage Analysis**: Shows percentage of classes with historic data

##### Interactive Dashboard
- **Summary Cards**: Total classes, coverage %, average predictions
- **Day Navigation**: Tab-based navigation through weekdays
- **Performance Indicators**: Visual indicators (High/Medium/Low demand)
- **Detailed Views**: Comprehensive class information with recommendations

#### Schedule Data Structure:
```typescript
interface MappedScheduleClass {
  day: string;
  time: string;
  location: string;
  className: string;
  trainer1: string;
  cover?: string;
  notes?: string;
  historicalPerformance?: {
    avgCheckIns: number;
    avgCapacity: number;
    avgFillRate: number;
    totalSessions: number;
  };
  recommendedCapacity?: number; // 10% buffer above avg
}
```

### 3. **Enhanced Data Processing** 🔧

#### Normalization System
- **Class Names**: Maps variations to standard format (e.g., "bbb" → "Studio Back Body Blaze")
- **Locations**: Standardizes location names (e.g., "bandra" → "Supreme HQ, Bandra")
- **Trainers**: Handles nicknames and variations (e.g., "mriga" → "Mrigakshi Jaiswal")

#### Performance Analytics
- **Smart Aggregation**: Groups sessions by normalized identifiers
- **Statistical Calculations**: Mean, count, percentages with proper rounding
- **Trend Detection**: Visual indicators for performance levels
- **Capacity Recommendations**: Suggests optimal capacity with safety buffer

## 🎯 Usage Scenarios

### For Studio Managers:
1. **Schedule Upload**: Upload weekly schedule CSV
2. **Performance Review**: See which scheduled classes have strong/weak historic performance
3. **Capacity Planning**: Use recommended capacity based on historic data
4. **Gap Analysis**: Identify classes without historic data needing monitoring

### For Operations Teams:
1. **Resource Allocation**: Prioritize marketing for low-performing scheduled classes
2. **Trainer Assignment**: Review cover arrangements and trainer performance
3. **Data Quality**: Track coverage of performance data across schedule
4. **Forecasting**: Use average check-ins for attendance predictions

## 📁 File Structure Added

```
src/
├── types/
│   └── schedule.ts           # Schedule data types
├── utils/
│   └── scheduleParser.ts     # CSV processing & normalization
├── components/
│   └── ScheduleManagement.tsx # Schedule upload & analysis UI
└── store/
    └── dashboardStore.ts     # Added getAverageCheckIns function
```

## 🚀 Technical Implementation

### Average Check-ins Calculation:
```typescript
getAverageCheckIns: (className, day, time, location) => {
  // Filter historic sessions by exact match
  const similarClasses = rawData.filter(session => 
    session.Class === className &&
    session.Day === day &&
    session.Time === time &&
    session.Location === location
  );
  
  // Calculate average and metadata
  return {
    avgCheckIns: totalCheckIns / sessionCount,
    totalSessions: sessionCount,
    lastSessionDate: mostRecentDate
  };
}
```

### Schedule Processing Pipeline:
1. **CSV Upload** → Parse with Papa Parse
2. **Data Extraction** → Extract from structured schedule format
3. **Normalization** → Apply name/location/trainer mappings
4. **Performance Mapping** → Match with historic data
5. **Visualization** → Display with analytics and recommendations

## ✅ Benefits Delivered

1. **Informed Scheduling**: Data-driven capacity decisions
2. **Performance Visibility**: Clear view of class popularity trends
3. **Quality Insights**: Identify gaps in historic data coverage
4. **Operational Efficiency**: Automated mapping reduces manual analysis
5. **Future Planning**: Predictive capacity recommendations
6. **User Experience**: Intuitive upload and navigation interface

The system now provides comprehensive schedule analysis capabilities, bridging the gap between historic performance and future planning with intelligent data processing and clear visualizations.