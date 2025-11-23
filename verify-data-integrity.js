#!/usr/bin/env node

/**
 * Data Integrity Verification Script
 * 
 * This script loads data from all three Google Sheets and performs comprehensive
 * validation checks to ensure data is loading correctly and metrics are accurate.
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load credentials
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

// Spreadsheet IDs
const SPREADSHEETS = {
  sessions: {
    id: '16wFlke0bHFcmfn-3UyuYlGnImBq0DY7ouVYAlAFTZys',
    sheet: 'Form responses 1',
    name: 'Sessions'
  },
  checkins: {
    id: '149ILDqovzZA6FRUJKOwzutWdVqmqWBtWPfzG3A0zxTI',
    sheet: 'Form responses 1',
    name: 'Check-ins'
  },
  activeClasses: {
    id: '1OhhnD-9R_876ehw1xROZpyd0VcCLTwuuUUnh3A1Alv4',
    sheet: 'Cleaned',
    name: 'Active Classes'
  }
};

// Helper to normalize column names
function normalizeColumnName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()_]/g, '');
}

async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

async function loadSheetData(auth, spreadsheetId, sheetName, range = 'A:AA') {
  const sheets = google.sheets({ version: 'v4', auth });
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${range}`,
    });
    
    return response.data.values || [];
  } catch (error) {
    console.error(`❌ Error loading ${sheetName}:`, error.message);
    return [];
  }
}

function parseSheetData(rows, sheetName) {
  if (rows.length === 0) {
    console.warn(`⚠️ No data found in ${sheetName}`);
    return { headers: [], data: [] };
  }
  
  const headers = rows[0];
  const data = [];
  
  // Create column index mapping
  const getColumnIndex = (searchName) => {
    const normalized = normalizeColumnName(searchName);
    return headers.findIndex(h => normalizeColumnName(h) === normalized);
  };
  
  let successfulRows = 0;
  let skippedRows = 0;
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    // Skip empty rows
    if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
      skippedRows++;
      continue;
    }
    
    try {
      const rowData = {};
      headers.forEach((header, index) => {
        const value = row[index];
        rowData[header] = value !== undefined ? String(value).trim() : '';
      });
      
      data.push(rowData);
      successfulRows++;
    } catch (error) {
      console.warn(`⚠️ Error parsing row ${i + 1}:`, error.message);
      skippedRows++;
    }
  }
  
  return { headers, data, successfulRows, skippedRows };
}

function validateSessions(sessions) {
  console.log('\n📊 SESSIONS DATA VALIDATION');
  console.log('━'.repeat(60));
  
  const totalRows = sessions.data.length;
  const requiredFields = ['SessionID', 'Class', 'Day', 'Time', 'Location', 'Trainer', 'Date'];
  
  // Check required fields
  const missingFields = {};
  requiredFields.forEach(field => {
    const missing = sessions.data.filter(row => !row[field] || row[field] === '').length;
    if (missing > 0) {
      missingFields[field] = missing;
    }
  });
  
  // Calculate totals
  const totalCheckins = sessions.data.reduce((sum, row) => {
    const val = parseInt(row['Check-Ins'] || row['CheckedIn'] || '0');
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  
  const totalCapacity = sessions.data.reduce((sum, row) => {
    const val = parseInt(row['Capacity'] || '0');
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  
  const totalRevenue = sessions.data.reduce((sum, row) => {
    const val = parseFloat(row['Revenue'] || '0');
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  
  const uniqueSessionIDs = new Set(sessions.data.map(row => row['SessionID'] || row['Session ID'])).size;
  const uniqueClasses = new Set(sessions.data.map(row => row['Class'])).size;
  const uniqueTrainers = new Set(sessions.data.map(row => row['Trainer'])).size;
  const uniqueLocations = new Set(sessions.data.map(row => row['Location'])).size;
  
  // Date range
  const dates = sessions.data
    .map(row => row['Date'] || row['DateIST'])
    .filter(d => d)
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a - b);
  
  const dateRange = dates.length > 0 
    ? `${dates[0].toISOString().split('T')[0]} to ${dates[dates.length - 1].toISOString().split('T')[0]}`
    : 'No valid dates';
  
  // Sample times
  const sampleTimes = sessions.data
    .map(row => row['Time'])
    .filter(t => t)
    .slice(0, 10);
  
  console.log(`✅ Total Sessions Loaded: ${totalRows}`);
  console.log(`   - Successful: ${sessions.successfulRows}`);
  console.log(`   - Skipped: ${sessions.skippedRows}`);
  console.log(`\n📋 Headers Found (${sessions.headers.length}):`);
  console.log(`   ${sessions.headers.join(', ')}`);
  
  if (Object.keys(missingFields).length > 0) {
    console.log(`\n⚠️ Missing Required Fields:`);
    Object.entries(missingFields).forEach(([field, count]) => {
      console.log(`   - ${field}: ${count} rows missing`);
    });
  }
  
  console.log(`\n🔢 Metrics:`);
  console.log(`   - Unique Session IDs: ${uniqueSessionIDs}`);
  console.log(`   - Unique Classes: ${uniqueClasses}`);
  console.log(`   - Unique Trainers: ${uniqueTrainers}`);
  console.log(`   - Unique Locations: ${uniqueLocations}`);
  console.log(`   - Total Check-ins: ${totalCheckins}`);
  console.log(`   - Total Capacity: ${totalCapacity}`);
  console.log(`   - Fill Rate: ${totalCapacity > 0 ? ((totalCheckins / totalCapacity) * 100).toFixed(2) : 0}%`);
  console.log(`   - Total Revenue: ₹${totalRevenue.toFixed(2)}`);
  console.log(`   - Date Range: ${dateRange}`);
  
  console.log(`\n⏰ Sample Times (first 10):`);
  sampleTimes.forEach(time => console.log(`   - ${time}`));
  
  return {
    totalRows,
    uniqueSessionIDs,
    totalCheckins,
    totalCapacity,
    totalRevenue,
    fillRate: totalCapacity > 0 ? (totalCheckins / totalCapacity) * 100 : 0,
  };
}

function validateCheckins(checkins) {
  console.log('\n👥 CHECK-INS DATA VALIDATION');
  console.log('━'.repeat(60));
  
  const totalRows = checkins.data.length;
  const requiredFields = ['MemberID', 'SessionID', 'Email'];
  
  // Check required fields
  const missingFields = {};
  requiredFields.forEach(field => {
    const missing = checkins.data.filter(row => !row[field] || row[field] === '').length;
    if (missing > 0) {
      missingFields[field] = missing;
    }
  });
  
  // Calculate totals
  const totalPaid = checkins.data.reduce((sum, row) => {
    const val = parseFloat(row['Paid'] || '0');
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  
  const uniqueMembers = new Set(checkins.data.map(row => row['MemberID'] || row['Member ID'])).size;
  const uniqueSessions = new Set(checkins.data.map(row => row['SessionID'] || row['Session ID'])).size;
  
  const checkedInCount = checkins.data.filter(row => {
    const val = String(row['CheckedIn'] || '').toUpperCase();
    return val === 'TRUE' || val === '1';
  }).length;
  
  const lateCancelledCount = checkins.data.filter(row => {
    const val = String(row['IsLateCancelled'] || '').toUpperCase();
    return val === 'TRUE' || val === '1';
  }).length;
  
  const complementaryCount = checkins.data.filter(row => {
    const val = String(row['Complementary'] || '').toUpperCase();
    return val === 'TRUE' || val === '1';
  }).length;
  
  // Payment methods
  const paymentMethods = {};
  checkins.data.forEach(row => {
    const method = row['PaymentMethodName'] || 'Unknown';
    paymentMethods[method] = (paymentMethods[method] || 0) + 1;
  });
  
  console.log(`✅ Total Check-ins Loaded: ${totalRows}`);
  console.log(`   - Successful: ${checkins.successfulRows}`);
  console.log(`   - Skipped: ${checkins.skippedRows}`);
  console.log(`\n📋 Headers Found (${checkins.headers.length}):`);
  console.log(`   ${checkins.headers.join(', ')}`);
  
  if (Object.keys(missingFields).length > 0) {
    console.log(`\n⚠️ Missing Required Fields:`);
    Object.entries(missingFields).forEach(([field, count]) => {
      console.log(`   - ${field}: ${count} rows missing`);
    });
  }
  
  console.log(`\n🔢 Metrics:`);
  console.log(`   - Unique Members: ${uniqueMembers}`);
  console.log(`   - Unique Sessions: ${uniqueSessions}`);
  console.log(`   - Total Revenue: ₹${totalPaid.toFixed(2)}`);
  console.log(`   - Checked In: ${checkedInCount}`);
  console.log(`   - Late Cancelled: ${lateCancelledCount}`);
  console.log(`   - Complementary: ${complementaryCount}`);
  
  console.log(`\n💳 Payment Methods:`);
  Object.entries(paymentMethods)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([method, count]) => {
      console.log(`   - ${method}: ${count}`);
    });
  
  return {
    totalRows,
    uniqueMembers,
    uniqueSessions,
    totalPaid,
    checkedInCount,
  };
}

function validateActiveClasses(activeClasses) {
  console.log('\n📅 ACTIVE CLASSES DATA VALIDATION');
  console.log('━'.repeat(60));
  
  const totalRows = activeClasses.data.length;
  const requiredFields = ['Day', 'Time', 'Class', 'Trainer'];
  
  // Check required fields
  const missingFields = {};
  requiredFields.forEach(field => {
    const missing = activeClasses.data.filter(row => !row[field] || row[field] === '').length;
    if (missing > 0) {
      missingFields[field] = missing;
    }
  });
  
  const uniqueDays = new Set(activeClasses.data.map(row => row['Day'] || row['DayofWeek'])).size;
  const uniqueClasses = new Set(activeClasses.data.map(row => row['Class'] || row['ClassName'])).size;
  const uniqueTrainers = new Set(activeClasses.data.map(row => row['Trainer'] || row['TeacherName'])).size;
  const uniqueLocations = new Set(activeClasses.data.map(row => row['Location'])).size;
  
  // Sample times
  const sampleTimes = activeClasses.data
    .map(row => row['Time'])
    .filter(t => t)
    .slice(0, 10);
  
  console.log(`✅ Total Active Classes Loaded: ${totalRows}`);
  console.log(`   - Successful: ${activeClasses.successfulRows}`);
  console.log(`   - Skipped: ${activeClasses.skippedRows}`);
  console.log(`\n📋 Headers Found (${activeClasses.headers.length}):`);
  console.log(`   ${activeClasses.headers.join(', ')}`);
  
  if (Object.keys(missingFields).length > 0) {
    console.log(`\n⚠️ Missing Required Fields:`);
    Object.entries(missingFields).forEach(([field, count]) => {
      console.log(`   - ${field}: ${count} rows missing`);
    });
  }
  
  console.log(`\n🔢 Metrics:`);
  console.log(`   - Unique Days: ${uniqueDays}`);
  console.log(`   - Unique Classes: ${uniqueClasses}`);
  console.log(`   - Unique Trainers: ${uniqueTrainers}`);
  console.log(`   - Unique Locations: ${uniqueLocations}`);
  
  console.log(`\n⏰ Sample Times (first 10):`);
  sampleTimes.forEach(time => console.log(`   - ${time}`));
  
  return {
    totalRows,
    uniqueDays,
    uniqueClasses,
    uniqueTrainers,
  };
}

function crossValidate(sessionsMetrics, checkinsMetrics) {
  console.log('\n🔍 CROSS-VALIDATION');
  console.log('━'.repeat(60));
  
  const issues = [];
  
  // Check if sessions checkins match checkins data
  console.log(`\nComparing Sessions vs Check-ins:`);
  console.log(`   - Sessions unique IDs: ${sessionsMetrics.uniqueSessionIDs}`);
  console.log(`   - Checkins unique sessions: ${checkinsMetrics.uniqueSessions}`);
  
  if (checkinsMetrics.uniqueSessions > sessionsMetrics.uniqueSessionIDs) {
    issues.push(`⚠️ More unique sessions in checkins (${checkinsMetrics.uniqueSessions}) than in sessions (${sessionsMetrics.uniqueSessionIDs})`);
  }
  
  // Check if total checkins is reasonable
  if (sessionsMetrics.totalCheckins > checkinsMetrics.checkedInCount * 2) {
    issues.push(`⚠️ Sessions total checkins (${sessionsMetrics.totalCheckins}) is much higher than checkins checked-in count (${checkinsMetrics.checkedInCount})`);
  }
  
  if (issues.length > 0) {
    console.log(`\n⚠️ Issues Found:`);
    issues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log(`\n✅ No cross-validation issues found!`);
  }
}

async function main() {
  console.log('🚀 Starting Data Integrity Verification...\n');
  
  try {
    // Authorize
    const auth = await authorize();
    console.log('✅ Authorized with Google Sheets API\n');
    
    // Load all sheets
    console.log('📥 Loading data from Google Sheets...');
    const [sessionsRows, checkinsRows, activeClassesRows] = await Promise.all([
      loadSheetData(auth, SPREADSHEETS.sessions.id, SPREADSHEETS.sessions.sheet, 'A:AA'),
      loadSheetData(auth, SPREADSHEETS.checkins.id, SPREADSHEETS.checkins.sheet, 'A:AD'),
      loadSheetData(auth, SPREADSHEETS.activeClasses.id, SPREADSHEETS.activeClasses.sheet, 'A:Z'),
    ]);
    
    console.log('✅ Data loaded from all sheets\n');
    
    // Parse data
    const sessions = parseSheetData(sessionsRows, 'Sessions');
    const checkins = parseSheetData(checkinsRows, 'Check-ins');
    const activeClasses = parseSheetData(activeClassesRows, 'Active Classes');
    
    // Validate each dataset
    const sessionsMetrics = validateSessions(sessions);
    const checkinsMetrics = validateCheckins(checkins);
    const activeClassesMetrics = validateActiveClasses(activeClasses);
    
    // Cross-validate
    crossValidate(sessionsMetrics, checkinsMetrics);
    
    console.log('\n✅ Data Integrity Verification Complete!\n');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
}

main();
