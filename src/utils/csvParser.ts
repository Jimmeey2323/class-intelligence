import Papa from 'papaparse';
import { SessionData } from '../types';

/**
 * Parse CSV file and convert to SessionData[]
 */
export async function parseCSVFile(file: File): Promise<SessionData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // We'll handle type conversion manually
      complete: (results) => {
        try {
          const data = results.data.map((row: any) => convertToSessionData(row));
          resolve(data);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Parse multiple CSV files
 */
export async function parseMultipleCSVFiles(files: File[]): Promise<SessionData[]> {
  const allData: SessionData[] = [];
  
  for (const file of files) {
    try {
      const data = await parseCSVFile(file);
      allData.push(...data);
    } catch (error) {
      console.error(`Error parsing file ${file.name}:`, error);
    }
  }
  
  return allData;
}

/**
 * Convert raw CSV row to SessionData with proper types
 */
function convertToSessionData(row: any): SessionData {
  return {
    TrainerID: String(row.TrainerID || ''),
    FirstName: String(row.FirstName || ''),
    LastName: String(row.LastName || ''),
    Trainer: String(row.Trainer || ''),
    SessionID: String(row.SessionID || ''),
    SessionName: String(row.SessionName || ''),
    Capacity: parseNumber(row.Capacity),
    CheckedIn: parseNumber(row.CheckedIn),
    LateCancelled: parseNumber(row.LateCancelled),
    Booked: parseNumber(row.Booked),
    Complimentary: parseNumber(row.Complimentary),
    Location: String(row.Location || ''),
    Date: parseDate(row.Date),
    Day: String(row.Day || ''),
    Time: String(row.Time || ''),
    Revenue: parseNumber(row.Revenue),
    NonPaid: parseNumber(row.NonPaid),
    UniqueID1: String(row.UniqueID1 || ''),
    UniqueID2: String(row.UniqueID2 || ''),
    Memberships: parseNumber(row.Memberships),
    Packages: parseNumber(row.Packages),
    IntroOffers: parseNumber(row.IntroOffers),
    SingleClasses: parseNumber(row.SingleClasses),
    Type: String(row.Type || ''),
    Class: String(row.Class || ''),
    Classes: parseNumber(row.Classes),
  };
}

/**
 * Parse number safely
 */
function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Parse date safely - handles YYYY-MM-DD format
 */
function parseDate(value: any): string {
  if (!value) return '';
  
  // If already a valid date string, return it
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return value;
  }
  
  // Try to parse and format
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    console.warn('Failed to parse date:', value);
  }
  
  return String(value);
}

/**
 * Export data to CSV
 */
export function exportToCSV(data: any[], filename: string = 'export.csv'): void {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Validate CSV structure
 */
export function validateCSVStructure(file: File): Promise<{ valid: boolean; errors: string[] }> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      preview: 1,
      complete: (results) => {
        const errors: string[] = [];
        const requiredFields = [
          'TrainerID',
          'Trainer',
          'SessionID',
          'Capacity',
          'CheckedIn',
          'Date',
          'Class',
          'UniqueID1',
        ];
        
        const headers = results.meta.fields || [];
        
        requiredFields.forEach((field) => {
          if (!headers.includes(field)) {
            errors.push(`Missing required field: ${field}`);
          }
        });
        
        resolve({
          valid: errors.length === 0,
          errors,
        });
      },
      error: (error) => {
        resolve({
          valid: false,
          errors: [error.message],
        });
      },
    });
  });
}
