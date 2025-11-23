// Utility to load and parse Active classes from Google Sheets

import { loadActiveClassesFromGoogleSheets } from '../services/googleSheetsService';

export interface ActiveClassData {
  day: string;
  time: string;
  location: string;
  className: string;
  trainer: string;
  notes?: string;
}

export interface ActiveClassesByDay {
  [day: string]: ActiveClassData[];
}

/**
 * Loads active classes from Google Sheets (Cleaned sheet)
 * Returns a map of day -> array of active classes
 */
export async function loadActiveClasses(): Promise<ActiveClassesByDay> {
  try {
    console.log('Loading active classes from Google Sheets...');
    const activeClasses = await loadActiveClassesFromGoogleSheets();
    
    console.log('Loaded active classes:', {
      days: Object.keys(activeClasses),
      totalClasses: Object.values(activeClasses).reduce((sum, classes) => sum + classes.length, 0)
    });
    
    return activeClasses;
  } catch (error) {
    console.error('Error loading active classes:', error);
    return {};
  }
}

/**
 * Parses the Active.csv content into structured data
 */
export function parseActiveClassesCsv(csvText: string): ActiveClassesByDay {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    console.warn('No lines found in CSV');
    return {};
  }
  
  // Skip header row
  const dataLines = lines.slice(1);
  
  const result: ActiveClassesByDay = {};
  let processedCount = 0;
  
  dataLines.forEach((line, _lineIndex) => {
    // Split by tab (Active.csv uses tab delimiter) or comma as fallback
    const fields = line.includes('\t') ? line.split('\t') : line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    if (fields.length < 5) {
      return; // Skip invalid rows
    }
    
    const [day, time, location, className, trainer, notes = ''] = fields.map(f => f.trim());
    
    // Only include classes with a trainer assigned
    if (!trainer || trainer === '') {
      return;
    }
    
    const activeClass: ActiveClassData = {
      day: day,
      time: time,
      location: location,
      className: className,
      trainer: trainer,
      notes: notes
    };
    
    if (!result[day]) {
      result[day] = [];
    }
    
    result[day].push(activeClass);
    processedCount++;
  });
  
  console.log('✅ Active.csv parsed:', {
    days: Object.keys(result).length,
    totalClasses: processedCount,
    classesByDay: Object.fromEntries(
      Object.entries(result).map(([day, classes]) => [day, classes.length])
    )
  });
  
  return result;
}

/**
 * Checks if a class matches the active classes data
 * Uses fuzzy matching for location and class names
 */
export function isClassActive(
  sessionDay: string,
  sessionClass: string,
  sessionLocation: string,
  sessionTime: string,
  activeClasses: ActiveClassesByDay
): boolean {
  if (!sessionDay || !activeClasses[sessionDay]) {
    return false;
  }
  
  const dayClasses = activeClasses[sessionDay];
  
  // Normalize for comparison
  const normalizeString = (str: string) => 
    str.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const normalizedSessionClass = normalizeString(sessionClass);
  const normalizedSessionLocation = normalizeString(sessionLocation);
  const normalizedSessionTime = sessionTime.toLowerCase().trim();
  
  // Find matching class
  return dayClasses.some(activeClass => {
    const normalizedActiveClass = normalizeString(activeClass.className);
    const normalizedActiveLocation = normalizeString(activeClass.location);
    const normalizedActiveTime = activeClass.time.toLowerCase().trim();
    
    // Match by class name and location
    const classMatch = normalizedActiveClass.includes(normalizedSessionClass) ||
                       normalizedSessionClass.includes(normalizedActiveClass);
    
    const locationMatch = normalizedActiveLocation.includes(normalizedSessionLocation) ||
                          normalizedSessionLocation.includes(normalizedActiveLocation);
    
    // Time matching - handle different formats (HH:MM:SS vs HH:MM)
    const timeMatch = normalizedActiveTime.startsWith(normalizedSessionTime.substring(0, 5)) ||
                      normalizedSessionTime.startsWith(normalizedActiveTime.substring(0, 5));
    
    // A class is considered active if it matches class name AND location AND time
    return classMatch && locationMatch && timeMatch;
  });
}
