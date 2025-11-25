import { SessionData, CheckinData } from '../types';
import { 
  analyzeMemberPatterns, 
  analyzeBookingBehaviorBySegment, 
  analyzeMemberCohorts 
} from '../utils/memberBehavior';

interface GoogleSheetsConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  sessionsSpreadsheetId: string;
  checkinsSpreadsheetId: string;
  activeClientsSpreadsheetId: string;
  sessionsSheetName: string;
  checkinsSheetName: string;
  activeClientsSheetName: string;
}

const CONFIG: GoogleSheetsConfig = {
  clientId: '416630995185-007ermh3iidknbbtdmu5vct207mdlbaa.apps.googleusercontent.com',
  clientSecret: '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',
  refreshToken: '1//04POzX5-KHjRdCgYIARAAGAQSNwF-L9Irx3KUIKNyT8M1eRKn29PbFNbBbLiO7kvvojqrc42bOMM1xSVM8NLlwkXS2ZBIp3kaH8M',
  sessionsSpreadsheetId: '16wFlke0bHFcmfn-3UyuYlGnImBq0DY7ouVYAlAFTZys',
  checkinsSpreadsheetId: '149ILDqovzZA6FRUJKOwzutWdVqmqWBtWPfzG3A0zxTI',
  activeClientsSpreadsheetId: '1OhhnD-9R_876ehw1xROZpyd0VcCLTwuuUUnh3A1Alv4',
  sessionsSheetName: 'Sessions',
  checkinsSheetName: 'Checkins',
  activeClientsSheetName: 'Cleaned',
};

let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedAccessToken && Date.now() < tokenExpiry) {
    return cachedAccessToken;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CONFIG.clientId,
        client_secret: CONFIG.clientSecret,
        refresh_token: CONFIG.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    cachedAccessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000; // Refresh 5 minutes before expiry
    
    return cachedAccessToken!;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

export async function loadSessionsFromGoogleSheets(): Promise<SessionData[]> {
  try {
    const accessToken = await getAccessToken();
    
    // Fetch ALL data from Google Sheets (increase range to cover more columns)
    const range = `${CONFIG.sessionsSheetName}!A:AA`; // Increased range
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.sessionsSpreadsheetId}/values/${encodeURIComponent(range)}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data from Google Sheets: ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length === 0) {
      return [];
    }

    // First row is headers
    const headers = rows[0].map((h: string) => String(h || '').trim());
    
    // Helper to normalize column names for flexible matching
    const normalizeColumnName = (name: string) => {
      return name
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[()]/g, '')
        .replace(/_/g, '');
    };

    // Map column names to indices with flexible matching
    const getColumnIndex = (searchName: string): number => {
      const normalized = normalizeColumnName(searchName);
      const index = headers.findIndex((h: string) => normalizeColumnName(h) === normalized);
      return index;
    };

    // Parse data rows
    const sessionData: SessionData[] = [];
    let skippedRows = 0;
    let successfulRows = 0;
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip completely empty rows
      if (!row || row.every((cell: any) => !cell || String(cell).trim() === '')) {
        skippedRows++;
        continue;
      }
      
      try {
        const session: SessionData = {
          TrainerID: String(row[getColumnIndex('TrainerID')] || '').trim(),
          FirstName: String(row[getColumnIndex('FirstName')] || '').trim(),
          LastName: String(row[getColumnIndex('LastName')] || '').trim(),
          Trainer: String(row[getColumnIndex('Trainer')] || '').trim(),
          SessionID: String(row[getColumnIndex('SessionID')] || '').trim(),
          SessionName: String(row[getColumnIndex('SessionName')] || '').trim(),
          Capacity: parseInt(String(row[getColumnIndex('Capacity')] || '0')) || 0,
          CheckedIn: parseInt(String(row[getColumnIndex('CheckedIn')] || '0')) || 0,
          LateCancelled: parseInt(String(row[getColumnIndex('LateCancelled')] || '0')) || 0,
          Booked: parseInt(String(row[getColumnIndex('Booked')] || '0')) || 0,
          Complimentary: parseInt(String(row[getColumnIndex('Complimentary')] || '0')) || 0,
          Location: String(row[getColumnIndex('Location')] || '').trim(),
          Date: String(row[getColumnIndex('Date')] || row[getColumnIndex('DateIST')] || '').trim(),
          Day: String(row[getColumnIndex('Day')] || row[getColumnIndex('DayofWeek')] || '').trim(),
          Time: String(row[getColumnIndex('Time')] || '').trim(),
          Revenue: parseFloat(String(row[getColumnIndex('Revenue')] || '0')) || 0,
          NonPaid: parseInt(String(row[getColumnIndex('NonPaid')] || '0')) || 0,
          UniqueID1: String(row[getColumnIndex('UniqueID1')] || row[getColumnIndex('UniqueID_1')] || '').trim(),
          UniqueID2: String(row[getColumnIndex('UniqueID2')] || row[getColumnIndex('UniqueID_2')] || '').trim(),
          Memberships: parseInt(String(row[getColumnIndex('Memberships')] || '0')) || 0,
          Packages: parseInt(String(row[getColumnIndex('Packages')] || '0')) || 0,
          IntroOffers: parseInt(String(row[getColumnIndex('IntroOffers')] || row[getColumnIndex('Intro Offers')] || '0')) || 0,
          SingleClasses: parseInt(String(row[getColumnIndex('SingleClasses')] || row[getColumnIndex('Single Classes')] || '0')) || 0,
          Type: String(row[getColumnIndex('Type')] || '').trim(),
          Class: String(row[getColumnIndex('Class')] || '').trim(),
          Classes: parseInt(String(row[getColumnIndex('Classes')] || '1')) || 1,
          Waitlisted: parseInt(String(row[getColumnIndex('Waitlisted')] || '0')) || 0,
        };

        // Debug: Log sessions with evening times
        const timeStr = session.Time.toLowerCase();
        if (timeStr.includes('20:') || timeStr.includes('8') && (timeStr.includes('pm') || timeStr.includes('p.m'))) {
          console.log('🕐 Evening session found:', {
            time: session.Time,
            class: session.Class,
            day: session.Day,
            location: session.Location,
            date: session.Date
          });
        }

        // Only add valid sessions (with required data)
        if (session.SessionID && session.Date) {
          sessionData.push(session);
          successfulRows++;
        } else {
          skippedRows++;
        }
      } catch (error) {
        skippedRows++;
        continue;
      }
    }

    return sessionData;
  } catch (error) {
    console.error('❌ Error loading data from Google Sheets:', error);
    throw error;
  }
}

export async function loadCheckinsFromGoogleSheets(): Promise<CheckinData[]> {
  try {
    const accessToken = await getAccessToken();
    
    const range = `${CONFIG.checkinsSheetName}!A:AD`; // Extended range
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.checkinsSpreadsheetId}/values/${encodeURIComponent(range)}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch checkins data: ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length === 0) {
      return [];
    }

    const headers = rows[0].map((h: string) => String(h || '').trim());
    
    // Helper to normalize column names
    const normalizeColumnName = (name: string) => {
      return name
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[()]/g, '')
        .replace(/_/g, '');
    };

    const getColumnIndex = (searchName: string): number => {
      const normalized = normalizeColumnName(searchName);
      const index = headers.findIndex((h: string) => normalizeColumnName(h) === normalized);
      return index;
    };

    const checkinData: CheckinData[] = [];
    let skippedRows = 0;
    let successfulRows = 0;
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip completely empty rows
      if (!row || row.every((cell: any) => !cell || String(cell).trim() === '')) {
        skippedRows++;
        continue;
      }
      
      try {
        const checkin: CheckinData = {
          MemberID: String(row[getColumnIndex('MemberID')] || row[getColumnIndex('Member ID')] || '').trim(),
          FirstName: String(row[getColumnIndex('FirstName')] || row[getColumnIndex('First Name')] || '').trim(),
          LastName: String(row[getColumnIndex('LastName')] || row[getColumnIndex('Last Name')] || '').trim(),
          Email: String(row[getColumnIndex('Email')] || '').trim(),
          OrderAt: String(row[getColumnIndex('OrderAt')] || row[getColumnIndex('Order At')] || '').trim(),
          Paid: parseFloat(String(row[getColumnIndex('Paid')] || '0')),
          PaymentMethodName: String(row[getColumnIndex('PaymentMethodName')] || row[getColumnIndex('Payment Method Name')] || '').trim(),
          CheckedIn: String(row[getColumnIndex('CheckedIn')] || row[getColumnIndex('Checked In')] || '').toUpperCase() === 'TRUE',
          Complementary: String(row[getColumnIndex('Complementary')] || '').toUpperCase() === 'TRUE',
          IsLateCancelled: String(row[getColumnIndex('IsLateCancelled')] || row[getColumnIndex('Is Late Cancelled')] || '').toUpperCase() === 'TRUE',
          SessionID: String(row[getColumnIndex('SessionID')] || row[getColumnIndex('Session ID')] || '').trim(),
          SessionName: String(row[getColumnIndex('SessionName')] || row[getColumnIndex('Session Name')] || '').trim(),
          Capacity: parseInt(String(row[getColumnIndex('Capacity')] || '0')) || 0,
          Location: String(row[getColumnIndex('Location')] || '').trim(),
          Date: String(row[getColumnIndex('Date(IST)')] || row[getColumnIndex('DateIST')] || row[getColumnIndex('Date')] || '').trim(),
          DayOfWeek: String(row[getColumnIndex('DayofWeek')] || row[getColumnIndex('DayOfWeek')] || row[getColumnIndex('Day of Week')] || '').trim(),
          Time: String(row[getColumnIndex('Time')] || '').trim(),
          DurationMinutes: parseInt(String(row[getColumnIndex('DurationMinutes')] || row[getColumnIndex('Duration(Minutes)')] || '0')) || 0,
          TeacherName: String(row[getColumnIndex('TeacherName')] || row[getColumnIndex('Teacher Name')] || '').trim(),
          CleanedProduct: String(row[getColumnIndex('CleanedProduct')] || row[getColumnIndex('Cleaned Product')] || '').trim(),
          CleanedCategory: String(row[getColumnIndex('CleanedCategory')] || row[getColumnIndex('Cleaned Category')] || '').trim(),
          CleanedClass: String(row[getColumnIndex('CleanedClass')] || row[getColumnIndex('Cleaned Class')] || '').trim(),
          HostID: parseInt(String(row[getColumnIndex('HostID')] || row[getColumnIndex('Host ID')] || '0')) || 0,
          Month: String(row[getColumnIndex('Month')] || '').trim(),
          Year: parseInt(String(row[getColumnIndex('Year')] || '0')) || 0,
          ClassNo: parseInt(String(row[getColumnIndex('ClassNo')] || row[getColumnIndex('Class No')] || '0')) || 0,
          IsNew: String(row[getColumnIndex('IsNew')] || row[getColumnIndex('Is New')] || '').trim(),
          UniqueID1: String(row[getColumnIndex('UniqueID1')] || row[getColumnIndex('UniqueID_1')] || row[getColumnIndex('Unique ID 1')] || '').trim(),
          UniqueID2: String(row[getColumnIndex('UniqueID2')] || row[getColumnIndex('Unique ID 2')] || '').trim(),
        };

        if (checkin.SessionID) {
          checkinData.push(checkin);
          successfulRows++;
        } else {
          skippedRows++;
        }
      } catch (error) {
        skippedRows++;
        continue;
      }
    }

    return checkinData;
  } catch (error) {
    console.error('Error loading check-ins from Google Sheets:', error);
    throw error;
  }
}

export async function loadEnhancedSessionsFromGoogleSheets(): Promise<SessionData[]> {
  try {
    // Load both datasets in parallel
    const [sessions, checkins] = await Promise.all([
      loadSessionsFromGoogleSheets(),
      loadCheckinsFromGoogleSheets()
    ]);

    // Group checkins by SessionID for fast lookup
    const checkinsBySession = new Map<string, CheckinData[]>();
    checkins.forEach(checkin => {
      if (!checkinsBySession.has(checkin.SessionID)) {
        checkinsBySession.set(checkin.SessionID, []);
      }
      checkinsBySession.get(checkin.SessionID)!.push(checkin);
    });

    // Enhance sessions with checkin data and member behavior metrics
    const enhancedSessions = sessions.map(session => {
      const sessionCheckins = checkinsBySession.get(session.SessionID) || [];
      
      if (sessionCheckins.length === 0) {
        return session;
      }

      // Calculate payment category metrics from checkins
      const checkedInRecords = sessionCheckins.filter(c => c.CheckedIn && !c.IsLateCancelled);
      const membershipCount = checkedInRecords.filter(c => c.CleanedCategory === 'Memberships').length;
      const packageCount = checkedInRecords.filter(c => c.CleanedCategory === 'Package').length;
      const introOfferCount = checkedInRecords.filter(c => c.CleanedCategory === 'Intro Offer').length;
      const singleClassCount = checkedInRecords.filter(c => c.CleanedCategory === 'Sessions/Single Classes').length;
      
      const paidRevenue = sessionCheckins.reduce((sum, c) => sum + c.Paid, 0);
      const complementaryCount = sessionCheckins.filter(c => c.Complementary).length;

      // Calculate member behavior metrics
      const uniqueMembers = new Set(sessionCheckins.map(c => c.MemberID)).size;
      const newMembers = sessionCheckins.filter(c => c.IsNew.toLowerCase().includes('new')).length;
      const returningMembers = checkedInRecords.length - newMembers;
      
      // Analyze attendance patterns for this session
      const memberPatterns = analyzeMemberPatterns(sessionCheckins);
      const consistentAttendees = memberPatterns.filter(m => m.bookingPattern === 'consistent').length;
      const randomAttendees = memberPatterns.filter(m => m.bookingPattern === 'random').length;
      
      const lateCancellations = sessionCheckins.filter(c => c.IsLateCancelled).length;
      const lateCancellationRate = sessionCheckins.length > 0 
        ? (lateCancellations / sessionCheckins.length) * 100 
        : 0;
      
      const averageMemberClassNo = checkedInRecords.length > 0
        ? checkedInRecords.reduce((sum, c) => sum + c.ClassNo, 0) / checkedInRecords.length
        : 0;

      // Return enhanced session with all member behavior metrics
      return {
        ...session,
        // Override with more accurate checkin data
        Memberships: membershipCount || session.Memberships,
        Packages: packageCount || session.Packages,
        IntroOffers: introOfferCount || session.IntroOffers,
        SingleClasses: singleClassCount || session.SingleClasses,
        Complimentary: complementaryCount || session.Complimentary,
        Revenue: paidRevenue || session.Revenue,
        CheckedIn: checkedInRecords.length || session.CheckedIn,
        // Add new member behavior fields
        uniqueMembers,
        newMembersCount: newMembers,
        returningMembersCount: returningMembers,
        consistentAttendees,
        randomAttendees,
        lateCancellationRate,
        averageMemberClassNo: Math.round(averageMemberClassNo),
        memberRetentionRate: uniqueMembers > 0 ? (returningMembers / uniqueMembers) * 100 : 0,
      };
    });

    return enhancedSessions;
  } catch (error) {
    console.error('Error loading enhanced sessions:', error);
    // Fallback to sessions only if checkins fail
    return loadSessionsFromGoogleSheets();
  }
}

/**
 * Load comprehensive member behavior analytics
 * Returns patterns, booking behaviors by segment, and cohort analysis
 */
export async function loadMemberBehaviorAnalytics() {
  try {
    const checkins = await loadCheckinsFromGoogleSheets();
    
    return {
      memberPatterns: analyzeMemberPatterns(checkins),
      bookingByPaymentCategory: analyzeBookingBehaviorBySegment(checkins, 'paymentCategory'),
      bookingByClass: analyzeBookingBehaviorBySegment(checkins, 'classType'),
      bookingByLocation: analyzeBookingBehaviorBySegment(checkins, 'location'),
      bookingByTrainer: analyzeBookingBehaviorBySegment(checkins, 'trainer'),
      cohortAnalysis: analyzeMemberCohorts(checkins),
    };
  } catch (error) {
    console.error('Error loading member behavior analytics:', error);
    throw error;
  }
}

/**
 * Load active classes schedule from Google Sheets (Cleaned sheet)
 * Returns a map of day -> array of active classes
 */
export async function loadActiveClassesFromGoogleSheets(): Promise<{ [day: string]: any[] }> {
  try {
    const accessToken = await getAccessToken();

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.activeClientsSpreadsheetId}/values/${CONFIG.activeClientsSheetName}!A:Z`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load active classes: ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length === 0) {
      return {};
    }

    // Parse the data
    const headers = rows[0];
    
    const activeClassesByDay: { [day: string]: any[] } = {};
    let successfulRows = 0;
    let skippedRows = 0;

    // Helper to normalize column names
    const normalizeColumnName = (name: string) => {
      return name
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[()_]/g, '');
    };

    // Create column index mapping
    const getColumnIndex = (searchName: string): number => {
      const normalized = normalizeColumnName(searchName);
      const index = headers.findIndex((h: string) => normalizeColumnName(h) === normalized);
      return index;
    };

    // Process each row starting from index 1
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip empty rows
      if (!row || row.every((cell: any) => !cell || String(cell).trim() === '')) {
        skippedRows++;
        continue;
      }
      
      try {
        const day = String(row[getColumnIndex('Day')] || row[getColumnIndex('DayofWeek')] || '').trim();
        const time = String(row[getColumnIndex('Time')] || '').trim();
        const location = String(row[getColumnIndex('Location')] || '').trim();
        const className = String(row[getColumnIndex('Class')] || row[getColumnIndex('ClassName')] || row[getColumnIndex('SessionName')] || '').trim();
        const trainer = String(row[getColumnIndex('Trainer')] || row[getColumnIndex('TeacherName')] || '').trim();
        const capacity = parseInt(String(row[getColumnIndex('Capacity')] || '0')) || 0;
        const duration = parseInt(String(row[getColumnIndex('Duration')] || row[getColumnIndex('DurationMinutes')] || '0')) || 0;

        // Only include classes with required fields
        if (!day || !time || !className || !trainer) {
          skippedRows++;
          continue;
        }

        // Initialize day array if needed
        if (!activeClassesByDay[day]) {
          activeClassesByDay[day] = [];
        }

        activeClassesByDay[day].push({
          day,
          time,
          location,
          className,
          trainer,
          capacity,
          duration,
        });
        successfulRows++;
      } catch (error) {
        skippedRows++;
        continue;
      }
    }

    return activeClassesByDay;
  } catch (error) {
    console.error('❌ Error loading active classes from Google Sheets:', error);
    return {};
  }
}
