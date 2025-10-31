import Papa from 'papaparse';
import { ClassData, ScheduleData, ClassPerformanceData, MappedScheduleClass } from '../types/schedule';
import { SessionData } from '../types';

// Days order for sorting and tabs
const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ====================================================================
// NORMALIZATION DATA BASED ON YOUR PROVIDED LIST
// ====================================================================

// Allowed trainer names for normalization (derived from your list)
const allowedTeachers = [
  'Anisha Shah', 'Atulan Purohit', 'Janhavi Jain', 'Karanvir Bhatia', 'Mrigakshi Jaiswal',
  'Pranjali Jain', 'Reshma Sharma', "Richard D'Costa", 'Rohan Dahima', 'Upasna Paranjpe',
  'Karan Bhatia', 'Saniya Jaiswal', 'Vivaran Dhasmana', 'Nishanth Raj', 'Cauveri Vikrant',
  'Kabir Varma', 'Simonelle De Vitre', 'Simran Dutt', 'Anmol Sharma', 'Bret Saldanha',
  'Raunak Khemuka', 'Kajol Kanchan', 'Pushyank Nahar', 'Shruti Kulkarni',
  'Shruti Suresh', 'Poojitha Bhaskar', 'Siddhartha Kusuma', 'Chaitanya Nahar', 'Veena Narasimhan',
  // Below are added from your old list for broader compatibility
  'Rohan', 'Anisha', 'Richard', 'Pranjali', 'Reshma', 'Atulan', 'Karanvir', 'Cauveri', 
  'Mrigakshi', 'Vivaran', 'Karan', 'Nishanth', 'Pushyank', 'Kajol', 'Siddhartha', 'Shruti K', 'Veena', 'Chaitanya', 'Raunak'
];


// Class name mappings for normalization (updated based on your list)
const classNameMappings: {[key: string]: string} = {
  // Direct mappings to new "Studio" format
  'hosted class': 'Studio Hosted Class',
  'fit': 'Studio FIT',
  'back body blaze': 'Studio Back Body Blaze',
  'bbb': 'Studio Back Body Blaze',
  'barre 57': 'Studio Barre 57',
  'barre57': 'Studio Barre 57',
  'mat 57': 'Studio Mat 57',
  'mat57': 'Studio Mat 57',
  "trainer's choice": "Studio Trainer's Choice",
  'amped up': 'Studio Amped Up!',
  'amped up!': 'Studio Amped Up!',
  'hiit': 'Studio HIIT',
  'foundations': 'Studio Foundations',
  'sweat in 30': 'Studio SWEAT In 30',
  'sweat': 'Studio SWEAT In 30',
  'cardio barre plus': 'Studio Cardio Barre Plus',
  'cardio b+': 'Studio Cardio Barre Plus',
  'cardio barre': 'Studio Cardio Barre',
  'cardio b': 'Studio Cardio Barre',
  'recovery': 'Studio Recovery',
  'pre/post natal': 'Studio Pre/Post Natal',
  'prenatal': 'Studio Pre/Post Natal',
  'cycle': 'Studio PowerCycle',
  'powercycle': 'Studio PowerCycle',
  'strength lab': 'Studio Strength Lab',
  'strength lab (full body)': 'Studio Strength Lab',
  'strength (pull)': 'Studio Strength Lab (Pull)',
  'strength (push)': 'Studio Strength Lab (Push)',
  'strength - fb': 'Studio Strength Lab (Full Body)',
  'strength - pull': 'Studio Strength Lab (Pull)',
  'strength - push': 'Studio Strength Lab (Push)',

  // Express versions
  'cardio barre express': 'Studio Cardio Barre Express',
  'cardio barre exp': 'Studio Cardio Barre Express',
  'cardio b exp': 'Studio Cardio Barre Express',
  'barre 57 express': 'Studio Barre 57 Express',
  'barre 57 exp': 'Studio Barre 57 Express',
  'barre57 exp': 'Studio Barre 57 Express',
  'back body blaze express': 'Studio Back Body Blaze Express',
  'bbb exp': 'Studio Back Body Blaze Express',
  'mat 57 express': 'Studio Mat 57 Express',
  'mat 57 exp': 'Studio Mat 57 Express',
  'mat57 exp': 'Studio Mat 57 Express',
  'cycle exp': 'Studio PowerCycle Express',
  'powercycle express': 'Studio PowerCycle Express',
};


// Location mappings for normalization (created from your list)
const locationMappings: {[key: string]: string} = {
  'kemps': 'Kwality House, Kemps Corner',
  'kemps corner': 'Kwality House, Kemps Corner',
  'bandra': 'Supreme HQ, Bandra',
  'kenkere': 'Kenkere House',
  'south united': 'South United Football Club',
  'copper cloves': 'The Studio by Copper + Cloves',
  'wework galaxy': 'WeWork Galaxy',
  'wework prestige': 'WeWork Prestige Central',
  'physique': 'Physique Outdoor Pop-up',
  // Added from old script for backward compatibility
  'annex': 'Kwality House, Kemps Corner',
};

// ====================================================================
// HELPER FUNCTIONS (NOW USING THE NEW NORMALIZATION DATA)
// ====================================================================

// Helper function to normalize location name
export function normalizeLocationName(raw: string): string {
  if (!raw) return '';
  const val = raw.trim().toLowerCase();
  
  // Look for a match in the new location mappings
  for (const [key, value] of Object.entries(locationMappings)) {
    if (val.includes(key)) {
      return value;
    }
  }

  return raw.trim(); // Return original trimmed value if no match
}

// Helper function to normalize class name
export function normalizeClassName(raw: string): string {
  if (!raw) return '';
  const val = raw.trim().replace(/\s+/g, ' ').toLowerCase();

  // Check against the new classNameMappings
  for (const [key, value] of Object.entries(classNameMappings)) {
    if (val === key) {
      return value;
    }
  }

  // Fallback to original if no mapping is found
  // Capitalize first letter of each word for consistency
  return raw.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

// Helper function to normalize trainer name
export function normalizeTrainerName(raw: string): string {
  if (!raw) return '';
  const val = raw.trim().toLowerCase();

  // Specific common nicknames first
  if (val === 'mriga') return 'Mrigakshi Jaiswal';
  if (val === 'nishant') return 'Nishanth Raj';
  if (val === 'raunaq') return 'Raunak Khemuka';
  if (val === 'richy') return "Richard D'Costa";

  // Match against the full list of allowed teachers
  for (const name of allowedTeachers) {
    const lowerCaseName = name.toLowerCase();
    // Check for exact match or if the input is the first name of a full name
    if (lowerCaseName === val || lowerCaseName.startsWith(val + ' ')) {
      return name;
    }
  }

  return raw.trim(); // Return original trimmed value if no match
}


// Helper function to check if a class name is valid (not a trainer name or invalid entry)
// This function remains useful and does not need changes.
export function isValidClassName(className: string): boolean {
  if (!className || className.trim() === '') return false;
  
  const trimmed = className.trim().toLowerCase();
  
  const invalidNames = [
    'smita parekh', 'anandita', '2', 'hosted', '1', 'taarika', 'sakshi',
    'smita', 'parekh', 'anand', 'anandi', 'host', 'cover', 'replacement'
  ];
  
  for (const invalid of invalidNames) {
    if (trimmed === invalid || trimmed.includes(invalid)) {
      return false;
    }
  }
  
  if (/^\d+$/.test(trimmed)) return false;
  if (trimmed.split(' ').length === 1 && trimmed.length < 4) return false;
  
  return true;
}

// ====================================================================
// TIME PARSING FUNCTIONS (UNCHANGED)
// ====================================================================

// Helper function to normalize time string format
export function normalizeTimeString(timeStr: string): string {
  if (!timeStr) return '';
  let time = timeStr.trim();
  time = time.replace(/\s*[:,.]\s*/g, ':');
  const completeTimePattern = /\d{1,2}:\d{2}\s*(AM|PM)/gi;
  const timeMatches = time.match(completeTimePattern) || [];

  if (timeMatches.length > 0 && timeMatches[0]) {
    time = timeMatches[0];
  } else {
    const ampmMatch = time.match(/(AM|PM)/i);
    if (ampmMatch) {
      const beforeAmPm = time.substring(0, time.indexOf(ampmMatch[0])).trim();
      const numbersBeforeAmPm = beforeAmPm.match(/[\d:]+$/);
      if (numbersBeforeAmPm) {
        time = numbersBeforeAmPm[0] + ' ' + ampmMatch[0];
      }
    }
  }

  time = time.replace(/(\d),(\d)/g, '$1:$2');
  time = time.replace(/\./g, ':');
  time = time.replace(/\s*:\s*/g, ':');
  time = time.replace(/(\d)(AM|PM)/gi, '$1 $2');
  time = time.replace(/\s+(AM|PM)/gi, ' $1');
  return time.trim().toUpperCase();
}

// Helper function to parse time string to Date
export function parseTimeToDate(timeStr: string): Date | null {
  if (!timeStr) return null;
  const today = new Date();
  let time = normalizeTimeString(timeStr);
  const ampmMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minute = parseInt(ampmMatch[2], 10);
    const ampm = ampmMatch[3].toUpperCase();
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute);
  }
  const hmMatch = time.match(/^(\d{1,2}):(\d{2})$/);
  if (hmMatch) {
    const hour = parseInt(hmMatch[1], 10);
    const minute = parseInt(hmMatch[2], 10);
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute);
  }
  return null;
}

// Helper function to format Date to time string
export function formatTime(date: Date | null): string {
  if (!date) return '';
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minStr = minutes < 10 ? '0' + minutes : String(minutes);
  return `${hours}:${minStr} ${ampm}`;
}

// ====================================================================
// MAIN CSV PROCESSING FUNCTION (UNCHANGED)
// ====================================================================

export async function extractScheduleData(csvText: string): Promise<ScheduleData> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data as string[][];
          if (rows.length < 5) {
            throw new Error('CSV does not have enough rows (minimum 5 required)');
          }

          const dayRow = rows[2];
          const headerRow = rows[3];
          const dataRows = rows.slice(4);
          
          const locationCols = [1, 7, 13, 18, 23, 28, 34];
          const dayCols = locationCols;
          const classCols = [2, 8, 14, 19, 24, 29, 35];
          const trainer1Cols = [3, 9, 15, 20, 25, 30, 36];
          const coverCols = [6, 12, 17, 22, 27, 32, 38];
          
          let timeColIndex = headerRow.findIndex(h => h?.trim().toLowerCase() === 'time');
          
          if (timeColIndex === -1) {
            throw new Error('Time column header not found in row 4. Available headers: ' + headerRow.filter(Boolean).join(', '));
          }
          
          const classes: ClassData[] = [];
          
          for (const row of dataRows) {
            for (let setIdx = 0; setIdx < locationCols.length; setIdx++) {
              const location = normalizeLocationName(row[locationCols[setIdx]]?.trim() || '');
              if (!location) continue;
              
              const dayRaw = dayRow[dayCols[setIdx]]?.trim() || 'Unknown';
              const day = daysOrder.find(d => d.toLowerCase() === dayRaw.toLowerCase()) || dayRaw;
              
              const classNameRaw = row[classCols[setIdx]]?.trim() || '';
              const className = normalizeClassName(classNameRaw);
              if (!className || !isValidClassName(className)) continue;
              
              const trainer1Raw = row[trainer1Cols[setIdx]]?.trim() || '';
              const coverRaw = row[coverCols[setIdx]]?.trim() || '';
              let trainer1 = normalizeTrainerName(trainer1Raw);
              let notes = '';
              
              if (coverRaw) {
                const coverNorm = normalizeTrainerName(coverRaw);
                notes = coverNorm ? `Cover: ${coverNorm}` : `Cover noted.`;
                if(coverNorm) trainer1 = coverNorm; // The cover trainer takes the class
              }
              
              const timeRaw = row[timeColIndex]?.trim() || '';
              const timeDate = parseTimeToDate(timeRaw);
              const time = timeDate ? formatTime(timeDate) : timeRaw;
              
              const uniqueKey = (day + time + className + trainer1 + location).toLowerCase().replace(/\s+/g, '');
              
              classes.push({
                day,
                timeRaw,
                timeDate,
                time,
                location,
                className,
                trainer1,
                cover: coverRaw,
                notes,
                uniqueKey,
              });
            }
          }
          
          const classesByDay: ScheduleData = {};
          for (const cls of classes) {
            if (!classesByDay[cls.day]) classesByDay[cls.day] = [];
            classesByDay[cls.day].push(cls);
          }
          
          const sortedClassesByDay: ScheduleData = {};
          daysOrder.forEach(day => {
            if (classesByDay[day]) {
              sortedClassesByDay[day] = classesByDay[day].sort((a, b) => {
                if (a.timeDate && b.timeDate) return a.timeDate.getTime() - b.timeDate.getTime();
                return 0;
              });
            }
          });
          
          resolve(sortedClassesByDay);
        } catch (err) {
          reject(err);
        }
      },
      error: (err: any) => {
        reject(new Error('Error parsing CSV file: ' + err.message));
      },
    });
  });
}

// ====================================================================
// PERFORMANCE ANALYSIS FUNCTIONS
// ====================================================================

export function calculateClassPerformance(historicData: SessionData[]): Map<string, ClassPerformanceData> {
  const performanceMap = new Map<string, ClassPerformanceData>();
  
  // Group sessions by class, day, time, and location
  const sessionGroups = new Map<string, SessionData[]>();
  
  historicData.forEach(session => {
    // Normalize the session data to match schedule format
    const normalizedClass = normalizeClassName(session.Class || '');
    const normalizedLocation = normalizeLocationName(session.Location || '');
    const normalizedTime = normalizeTimeString(session.Time || '');
    
    const key = `${normalizedClass}|${session.Day}|${normalizedTime}|${normalizedLocation}`.toLowerCase();
    
    if (!sessionGroups.has(key)) {
      sessionGroups.set(key, []);
    }
    sessionGroups.get(key)!.push(session);
  });
  
  // Calculate performance metrics for each group
  sessionGroups.forEach((sessions, key) => {
    const [className, day, time, location] = key.split('|');
    
    const totalCheckIns = sessions.reduce((sum, s) => sum + (s.CheckedIn || 0), 0);
    const totalCapacity = sessions.reduce((sum, s) => sum + (s.Capacity || 0), 0);
    const totalSessions = sessions.length;
    
    const avgCheckIns = totalCheckIns / totalSessions;
    const avgCapacity = totalCapacity / totalSessions;
    const avgFillRate = avgCapacity > 0 ? (avgCheckIns / avgCapacity) * 100 : 0;
    
    // Find the most recent session date
    const lastSessionDate = sessions
      .map(s => s.Date)
      .filter(Boolean)
      .sort()
      .pop() || '';
    
    performanceMap.set(key, {
      className: className.charAt(0).toUpperCase() + className.slice(1),
      day: day.charAt(0).toUpperCase() + day.slice(1),
      time: time.toUpperCase(),
      location: location.charAt(0).toUpperCase() + location.slice(1),
      avgCheckIns: Math.round(avgCheckIns * 10) / 10,
      avgCapacity: Math.round(avgCapacity * 10) / 10,
      avgFillRate: Math.round(avgFillRate * 10) / 10,
      totalSessions,
      lastSessionDate,
    });
  });
  
  return performanceMap;
}

export function mapScheduleWithPerformance(
  scheduleData: ScheduleData, 
  performanceData: Map<string, ClassPerformanceData>
): { [day: string]: MappedScheduleClass[] } {
  const mappedData: { [day: string]: MappedScheduleClass[] } = {};
  
  Object.entries(scheduleData).forEach(([day, classes]) => {
    mappedData[day] = classes.map(cls => {
      // Create a matching key for performance lookup
      const performanceKey = `${cls.className}|${cls.day}|${normalizeTimeString(cls.time)}|${cls.location}`.toLowerCase();
      const performance = performanceData.get(performanceKey);
      
      const mappedClass: MappedScheduleClass = {
        ...cls,
        historicalPerformance: performance,
        avgCheckIns: performance?.avgCheckIns,
        recommendedCapacity: performance ? Math.ceil(performance.avgCheckIns * 1.1) : undefined, // 10% buffer
      };
      
      return mappedClass;
    });
  });
  
  return mappedData;
}