/**
 * Google Sheets Login & Company Registration Service
 * Spreadsheet ID: 1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28
 * Sheet Tab: login
 * Columns:
 *  A: Timestamp
 *  B: user (รหัสนักศึกษา/อีเมล)
 *  C: pass (รหัสผ่าน)
 *  D: name (ชื่อ-นามสกุล)
 *  E: status (บทบาทสิทธิ์)
 *  F: phoneStudent (เบอร์นักศึกษา)
 *  G: Company (ชื่อสถานประกอบการฝึกอาชีพ)
 *  H: CompanyID
 *  I: CompanyPhone (เบอร์ติดต่อกรณีฉุกเฉิน)
 *  J: room (กลุ่มห้อง)
 *  K: department (หน่วยงาน / แผนก)
 *  L: leader (ชื่อพี่เลี้ยง / ผู้ควบคุมงาน)
 *  M: leaderPhone (เบอร์ติดต่อพี่เลี้ยง)
 *  N: GPS (พิกัด GPS หมุดแผนที่ดาวเทียม)
 *  O: delial (หมายเหตุเพิ่มเติม / จุดสังเกต)
 */

import { AuthUser, Student, SheetTeacher } from '../types';
import { getCurrentWeekInfo } from '../data/weeksData';
import { 
  getCoursesByRoom, 
  getAllTeachersFromData, 
  getCoursesByTeacher, 
  getRoomsByTeacher 
} from './courseDataService';
import preloadedFullRows from '../data/loginSheetFullData.json';

export const LOGIN_SHEET_CONFIG = {
  spreadsheetId: '1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28',
  sheetName: 'login',
  csvUrl: 'https://docs.google.com/spreadsheets/d/1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28/gviz/tq?tqx=out:csv&sheet=login',
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28/edit'
};

export interface SheetLoginAccount {
  user: string;
  pass: string;
  name: string;
  status: string;
}

export interface LoginSheetFullRow {
  rowNumber: number; // 1-based spreadsheet row
  timestamp: string; // Col A
  user: string; // Col B
  pass: string; // Col C
  name: string; // Col D
  status: string; // Col E
  phoneStudent: string; // Col F (phoneUser / phoneStudent)
  Company: string; // Col G
  CompanyID: string; // Col H
  CompanyPhone: string; // Col I
  room: string; // Col J
  level?: string; // Col K (ระดับชั้น เช่น ปวส. / ปริญญาตรี)
  department: string; // Col L
  leader: string; // Col M
  leaderPhone: string; // Col N
  GPS: string; // Col O
  delial: string; // Col P
}

const STORAGE_LOGIN_ACCOUNTS_KEY = 'kktech_sheet_login_accounts_cache_v2';
const STORAGE_LOGIN_FULL_ROWS_KEY = 'kktech_login_sheet_full_rows_v3';

function purgeLegacyLoginCaches(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem('kktech_sheet_login_accounts_cache_v1');
    localStorage.removeItem('kktech_login_sheet_full_rows_v2');
  } catch {
    // ignore
  }
}

export function extractStudentCode(userOrCode: string): string {
  const clean = (userOrCode || '').replace(/\u00a0/g, ' ').trim();
  const prefix = clean.split('@')[0].trim();
  return prefix.replace(/^s(?=\d{8,})/i, '');
}

export function isStudentSheetRow(row: Pick<LoginSheetFullRow, 'user' | 'status' | 'room' | 'name'>): boolean {
  const status = (row.status || '').toLowerCase().trim();
  const user = (row.user || '').trim();
  const room = (row.room || '').trim();
  if (
    status.includes('ครู') ||
    status.includes('อาจารย์') ||
    status.includes('admin') ||
    status.includes('ผู้ดูแล') ||
    status.includes('นิเทศ')
  ) {
    return false;
  }
  return (
    status.includes('นักศึกษา') ||
    /^s?\d{8,}/i.test(user) ||
    room.includes('สอฟ') ||
    room.includes('ทลฟ')
  );
}

/**
 * Helper to parse CSV string into array of rows
 */
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Fetch all full 16-column rows from Google Sheet tab: login
 */
export async function fetchFullLoginSheetRows(forceRefresh = false): Promise<LoginSheetFullRow[]> {
  purgeLegacyLoginCaches();

  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(STORAGE_LOGIN_FULL_ROWS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read cached full sheet rows:', e);
    }
  }

  try {
    const response = await fetch(LOGIN_SHEET_CONFIG.csvUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'text/csv, text/plain, */*'
      }
    });

    if (response.ok) {
      const csvText = await response.text();
      const rawRows = parseCSV(csvText);

      const fullRows: LoginSheetFullRow[] = [];
      const firstRowUser = (rawRows[0]?.[1] || '').replace(/\u00a0/g, ' ').trim();
      const isMergedHeader = firstRowUser.startsWith('user ') && firstRowUser.length > 5;
      const isPureHeader = firstRowUser.toLowerCase() === 'user';

      for (let i = 0; i < rawRows.length; i++) {
        if (i === 0 && isPureHeader) continue;

        const r = rawRows[i];
        const padded = r.concat(Array(Math.max(0, 16 - r.length)).fill(''));
        const rowNum = isMergedHeader ? i + 2 : i + 1;

        const cleanCell = (val: string, prefix?: string): string => {
          let cleaned = (val || '').replace(/\u00a0/g, ' ').trim();
          if (i === 0 && isMergedHeader && prefix && cleaned.startsWith(prefix)) {
            cleaned = cleaned.slice(prefix.length).trim();
          }
          return cleaned;
        };

        const rowObj: LoginSheetFullRow = {
          rowNumber: rowNum,
          timestamp: cleanCell(padded[0], 'Timestamp'),
          user: cleanCell(padded[1], 'user'),
          pass: cleanCell(padded[2], 'pass'),
          name: cleanCell(padded[3], 'name'),
          status: cleanCell(padded[4], 'status'),
          phoneStudent: cleanCell(padded[5], 'phoneUser') || cleanCell(padded[5], 'phoneStudent'),
          Company: cleanCell(padded[6], 'Company'),
          CompanyID: cleanCell(padded[7], 'CompanyID'),
          CompanyPhone: cleanCell(padded[8], 'CompanyPhone'),
          room: cleanCell(padded[9], 'room'),
          level: cleanCell(padded[10], 'level'),
          department: cleanCell(padded[11], 'department'),
          leader: cleanCell(padded[12], 'leader'),
          leaderPhone: cleanCell(padded[13], 'leaderPhone'),
          GPS: cleanCell(padded[14], 'GPS'),
          delial: cleanCell(padded[15], 'delial'),
        };

        if (!rowObj.user && !rowObj.name) continue;
        fullRows.push(rowObj);
      }

      if (fullRows.length > 0) {
        try {
          localStorage.setItem(STORAGE_LOGIN_FULL_ROWS_KEY, JSON.stringify(fullRows));
        } catch (e) {
          console.warn('Failed saving full rows to localStorage:', e);
        }
        return fullRows;
      }
    }
  } catch (err) {
    console.warn('Network error fetching full login sheet from Google, using preloaded data:', err);
  }

  return preloadedFullRows as LoginSheetFullRow[];
}

/**
 * Save updated full rows to localStorage
 */
export function saveLocalFullLoginRows(rows: LoginSheetFullRow[]): void {
  purgeLegacyLoginCaches();
  try {
    localStorage.setItem(STORAGE_LOGIN_FULL_ROWS_KEY, JSON.stringify(rows));
  } catch (e) {
    console.warn('Could not save full rows to localStorage:', e);
  }
}

/**
 * Find matching student row in login sheet
 */
export async function findStudentInLoginSheet(
  studentCodeOrUser: string,
  studentName?: string
): Promise<LoginSheetFullRow | null> {
  const rows = await fetchFullLoginSheetRows();
  const cleanTarget = (studentCodeOrUser || '').trim().toLowerCase();
  const targetPrefix = cleanTarget.split('@')[0];
  const targetCode = extractStudentCode(targetPrefix).toLowerCase();

  return rows.find(r => {
    const rUser = r.user.trim().toLowerCase();
    const rPrefix = rUser.split('@')[0];
    const rCode = extractStudentCode(rPrefix).toLowerCase();
    const rName = r.name.trim();

    if (rUser === cleanTarget || rPrefix === targetPrefix || rCode === targetCode) {
      return true;
    }
    if (studentName && rName && (rName.includes(studentName) || studentName.includes(rName))) {
      return true;
    }
    return false;
  }) || null;
}

/**
 * Convert a full row from Google Sheet login tab into a complete Student profile
 */
export function convertLoginRowToStudent(row: LoginSheetFullRow, defaultHours = 320): Student {
  const userStr = (row.user || '').replace(/\u00a0/g, ' ').trim();
  const code = extractStudentCode(userStr) || `std-${row.rowNumber}`;
  const room = (row.room || '').trim() || 'สอฟ.2/1';
  const rowLevel = (row.level || '').trim();
  const isTechDept = room.includes('ทลฟ') || rowLevel.includes('ปริญญาตรี');
  const level = isTechDept
    ? 'ปริญญาตรี'
    : room.includes('1/')
    ? 'ปวส.1'
    : room.includes('2/')
    ? 'ปวส.2'
    : rowLevel || 'ปวส.2';
  const studentDepartment = isTechDept ? 'ภาควิชาเทคโนโลยีไฟฟ้า' : 'แผนกวิชาช่างไฟฟ้ากำลัง';
  
  let gpsLat = 16.4322;
  let gpsLng = 102.8236;
  if (row.GPS && row.GPS.includes(',')) {
    const parts = row.GPS.split(',');
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (!isNaN(lat) && !isNaN(lng)) {
      gpsLat = lat;
      gpsLng = lng;
    }
  }

  const currentWeek = getCurrentWeekInfo().weekNumber;
  const roomCourses = getCoursesByRoom(room);
  const internshipCourse = roomCourses.find(c => c.subjectName.includes('กิจกรรมในสถานประกอบการ') || c.subjectCode.startsWith('30000'));
  const primarySupervisor = internshipCourse?.teacherName || (roomCourses[0]?.teacherName) || 'นายทักษิณ โสภาปิยะ';

  const cleanStudentPhone = (row.phoneStudent || '').trim();
  const studentPhone = cleanStudentPhone && cleanStudentPhone !== '-' ? cleanStudentPhone : undefined;

  return {
    id: `std-${code}`,
    studentCode: code,
    name: (row.name || 'นักศึกษาฝึกงาน').trim(),
    initials: getInitialsFromName(row.name || code),
    level: level,
    department: studentDepartment,
    room: room,
    email: userStr.includes('@') ? userStr : `${userStr}@kktech.ac.th`,
    ...(studentPhone ? { phone: studentPhone } : {}),
    avatarUrl: (typeof localStorage !== 'undefined' ? localStorage.getItem(`kktech_avatar_std-${code}`) : null) || undefined,
    companyId: `comp-${code}`,
    companyName: (row.Company || 'ยังไม่ระบุสถานประกอบการ').trim(),
    currentWeek: currentWeek,
    totalWeeks: 18,
    actualWeeks: 8,
    accumulatedHours: defaultHours,
    requiredHours: 720,
    supervisorTeacher: primarySupervisor,
    courses: roomCourses,
    companyRegistration: {
      registeredAt: row.timestamp ? `${row.timestamp}` : 'ซิงค์จากแผ่นงาน login',
      department: row.department || (row.Company ? 'แผนกปฏิบัติการและบำรุงรักษา' : '-'),
      mentorName: row.leader || '-',
      mentorPhone: row.leaderPhone || '-',
      emergencyPhone: row.CompanyPhone || row.phoneStudent || '-',
      gpsCoordinates: row.GPS || '16.4322, 102.8236',
      gpsLat: gpsLat,
      gpsLng: gpsLng,
      notes: row.delial || ''
    }
  };
}

/**
 * Get all students mapped directly from Google Sheet login tab dataset
 */
export function getAllLoginSheetStudents(): Student[] {
  purgeLegacyLoginCaches();
  let sourceRows: LoginSheetFullRow[] = preloadedFullRows as LoginSheetFullRow[];
  try {
    const cached = localStorage.getItem(STORAGE_LOGIN_FULL_ROWS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        sourceRows = parsed as LoginSheetFullRow[];
      }
    }
  } catch (e) {
    console.warn('Could not read cached students from login sheet:', e);
  }

  const deduped = new Map<string, Student>();
  sourceRows
    .filter(r => r.name && isStudentSheetRow(r))
    .forEach(r => {
      const student = convertLoginRowToStudent(r);
      if (!deduped.has(student.id)) {
        deduped.set(student.id, student);
      }
    });

  return Array.from(deduped.values());
}

/**
 * Normalizes a teacher's name for matching/deduplicating across sheets
 */
export function normalizeTeacherKey(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/^(ว่าที่ร้อยตรี|ส\.ต\.ท\.|ส\.อ\.|นาย|นางสาว|นาง|อาจารย์|ดร\.)\s*/, '')
    .replace(/\s+/g, '');
}

/**
 * Get all current teachers/admin from Google Sheets "login" tab & enrich with "data" tab
 * References Google Sheets ID: 1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28
 */
export function getAllLoginSheetTeachers(): SheetTeacher[] {
  purgeLegacyLoginCaches();
  const teacherMap = new Map<string, SheetTeacher>();

  let fullRows: LoginSheetFullRow[] = preloadedFullRows as LoginSheetFullRow[];
  try {
    const cached = localStorage.getItem(STORAGE_LOGIN_FULL_ROWS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        fullRows = parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading full rows for teachers:', e);
  }

  // Build exclusively from current login sheet teacher/admin rows
  fullRows.forEach((r) => {
    if (isStudentSheetRow(r)) return;
    const status = (r.status || '').trim();
    const user = (r.user || '').trim();
    const name = (r.name || '').trim();
    if (!name && !user) return;

    const cleanUserId = user.replace(/[^a-zA-Z0-9_-]/g, '_') || `row_${r.rowNumber}`;
    const email = user.includes('@') ? user : `${user}@kktech.ac.th`;
    const key = normalizeTeacherKey(name || user);
    const existing = teacherMap.get(key);
    const mappedRole = mapStatusToRole(status);

    if (existing) {
      if (status) existing.status = status;
      if (mappedRole === 'admin') existing.role = 'admin';
      if (user) existing.user = user;
      if (email) existing.email = email;
      if (r.phoneStudent) existing.phone = r.phoneStudent;
      if (r.department) existing.department = r.department;
      if (r.room && !existing.rooms?.includes(r.room)) {
        existing.rooms = [...(existing.rooms || []), r.room];
      }
    } else {
      teacherMap.set(key, {
        id: `tch-${cleanUserId}`,
        name: name || user,
        user: user,
        email: email,
        status: status || 'ครูนิเทศก์',
        role: mappedRole === 'admin' ? 'admin' : 'teacher',
        phone: r.phoneStudent || '',
        department: r.department || 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
        rooms: r.room && r.room !== 'ครูประจำรายวิชา' ? [r.room] : [],
        subjects: []
      });
    }
  });

  // Enrich matched login-sheet teachers with rooms & subjects from "data" tab
  try {
    const dataTeachers = getAllTeachersFromData();
    dataTeachers.forEach(tName => {
      const key = normalizeTeacherKey(tName);
      const existing = teacherMap.get(key);
      if (existing) {
        const rooms = getRoomsByTeacher(tName);
        const courses = getCoursesByTeacher(tName);
        const subjectLabels = courses.map(c => `${c.subjectCode} ${c.subjectName}`);
        existing.rooms = Array.from(new Set([...(existing.rooms || []), ...rooms]));
        existing.subjects = Array.from(new Set([...(existing.subjects || []), ...subjectLabels]));
      }
    });
  } catch {
    // ignore
  }

  return Array.from(teacherMap.values()).sort((a, b) => {
    if (a.name.includes('ทักษิณ') || a.user.includes('thaksin')) return -1;
    if (b.name.includes('ทักษิณ') || b.user.includes('thaksin')) return 1;
    return a.name.localeCompare(b.name, 'th');
  });
}

/**
 * Save/Update company data for a student directly into Google Sheets tab: login
 */
export async function saveCompanyDataToLoginSheet(
  data: {
    userOrCode: string;
    studentName?: string;
    companyName: string;
    department: string;
    mentorName: string;
    mentorPhone: string;
    emergencyPhone: string;
    gpsCoordinates: string;
    notes: string;
    room?: string;
    level?: string;
  },
  accessToken?: string | null
): Promise<{ success: boolean; message: string; rowNumber?: number; syncedLive: boolean }> {
  const allRows = await fetchFullLoginSheetRows();
  const cleanTarget = (data.userOrCode || '').trim().toLowerCase();
  const targetPrefix = cleanTarget.split('@')[0];
  const targetCode = extractStudentCode(targetPrefix).toLowerCase();

  const rowIndex = allRows.findIndex(r => {
    const rUser = r.user.trim().toLowerCase();
    const rPrefix = rUser.split('@')[0];
    const rCode = extractStudentCode(rPrefix).toLowerCase();
    const rName = r.name.trim();

    if (rUser === cleanTarget || rPrefix === targetPrefix || rCode === targetCode) {
      return true;
    }
    if (data.studentName && rName && (rName.includes(data.studentName) || data.studentName.includes(rName))) {
      return true;
    }
    return false;
  });

  const nowTimestamp = new Date().toLocaleString('th-TH');
  const maxRowNum = allRows.reduce((max, r) => Math.max(max, r.rowNumber || 0), 1);
  const targetRowNumber = rowIndex >= 0 ? allRows[rowIndex].rowNumber : maxRowNum + 1;

  let updatedRow: LoginSheetFullRow;

  if (rowIndex >= 0) {
    const existing = allRows[rowIndex];
    updatedRow = {
      ...existing,
      timestamp: nowTimestamp,
      Company: data.companyName,
      CompanyPhone: data.emergencyPhone || existing.CompanyPhone,
      room: data.room || existing.room,
      level: data.level || existing.level || ((data.room || existing.room || '').includes('ทลฟ') ? 'ปริญญาตรี' : 'ปวส.'),
      department: data.department,
      leader: data.mentorName,
      leaderPhone: data.mentorPhone,
      GPS: data.gpsCoordinates,
      delial: data.notes
    };
    allRows[rowIndex] = updatedRow;
  } else {
    const roomStr = data.room || 'สอฟ.2/1';
    const derivedUser = data.userOrCode.includes('@')
      ? data.userOrCode
      : `s${targetCode}@kktech.ac.th`;
    updatedRow = {
      rowNumber: targetRowNumber,
      timestamp: nowTimestamp,
      user: derivedUser,
      pass: targetCode,
      name: data.studentName || 'นักศึกษาฝึกงาน',
      status: 'นักศึกษา',
      phoneStudent: '',
      Company: data.companyName,
      CompanyID: 'ขอนแก่น',
      CompanyPhone: data.emergencyPhone,
      room: roomStr,
      level: data.level || (roomStr.includes('ทลฟ') ? 'ปริญญาตรี' : 'ปวส.'),
      department: data.department,
      leader: data.mentorName,
      leaderPhone: data.mentorPhone,
      GPS: data.gpsCoordinates,
      delial: data.notes
    };
    allRows.push(updatedRow);
  }

  saveLocalFullLoginRows(allRows);

  if (accessToken) {
    try {
      const rowValues = [
        updatedRow.timestamp,
        updatedRow.user,
        updatedRow.pass,
        updatedRow.name,
        updatedRow.status,
        updatedRow.phoneStudent,
        updatedRow.Company,      // Col G: Company
        updatedRow.CompanyID,    // Col H: CompanyID
        updatedRow.CompanyPhone, // Col I: CompanyPhone
        updatedRow.room,         // Col J: room
        updatedRow.level || '',  // Col K: level
        updatedRow.department,   // Col L: department
        updatedRow.leader,       // Col M: leader
        updatedRow.leaderPhone,  // Col N: leaderPhone
        updatedRow.GPS,          // Col O: GPS
        updatedRow.delial        // Col P: delial
      ];

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${LOGIN_SHEET_CONFIG.spreadsheetId}/values/login!A${updatedRow.rowNumber}:P${updatedRow.rowNumber}?valueInputOption=USER_ENTERED`;

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `login!A${updatedRow.rowNumber}:P${updatedRow.rowNumber}`,
          majorDimension: 'ROWS',
          values: [rowValues]
        })
      });

      if (res.ok) {
        return {
          success: true,
          message: `ซิงค์บันทึกข้อมูลลงแผ่นงาน login แถวที่ ${updatedRow.rowNumber} ของ Google Sheets เรียบร้อยแล้ว`,
          rowNumber: updatedRow.rowNumber,
          syncedLive: true
        };
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('Google Sheets PUT error:', errJson);
        return {
          success: true,
          message: `บันทึกข้อมูลในระบบเรียบร้อย (Google Sheets API: ${errJson.error?.message || res.statusText})`,
          rowNumber: updatedRow.rowNumber,
          syncedLive: false
        };
      }
    } catch (e: any) {
      console.warn('Network error updating Google Sheet login tab:', e);
      return {
        success: true,
        message: 'บันทึกข้อมูลเข้าสู่ฐานข้อมูลระบบเรียบร้อย (เครือข่ายออฟไลน์)',
        rowNumber: updatedRow.rowNumber,
        syncedLive: false
      };
    }
  }

  return {
    success: true,
    message: `บันทึกข้อมูลสถานประกอบการลงแผ่นงาน login แถวที่ ${updatedRow.rowNumber} สำเร็จ`,
    rowNumber: updatedRow.rowNumber,
    syncedLive: false
  };
}

/**
 * Fetch simplified login accounts for authentication
 */
export async function fetchSheetLoginAccounts(forceRefresh = false): Promise<SheetLoginAccount[]> {
  const fullRows = await fetchFullLoginSheetRows(forceRefresh);
  return fullRows.map(r => ({
    user: r.user,
    pass: r.pass,
    name: r.name,
    status: r.status
  }));
}

/**
 * Generate 2-letter Thai or English initials from name
 */
export function getInitialsFromName(name: string): string {
  if (!name) return 'KK';
  const clean = name
    .replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|ดร\.|อ\.|อาจารย์)\s*/, '')
    .trim();
  if (clean.length >= 2) {
    return clean.slice(0, 2);
  }
  return clean || 'KK';
}

/**
 * Map status from login sheet to system role
 */
export function mapStatusToRole(status: string): 'student' | 'teacher' | 'admin' {
  const s = (status || '').toLowerCase().trim();
  if (s.includes('admin') || s.includes('ผู้ดูแล') || s.includes('แอดมิน')) {
    return 'admin';
  }
  if (s.includes('teacher') || s.includes('ครู') || s.includes('อาจารย์') || s.includes('นิเทศ')) {
    return 'teacher';
  }
  return 'student';
}

/**
 * Authenticate with user and pass against Google Sheets data
 */
export async function authenticateWithGoogleSheet(
  inputUser: string,
  inputPass: string
): Promise<{ success: boolean; user?: AuthUser; error?: string; matchedAccount?: SheetLoginAccount; studentProfile?: Student }> {
  const cleanUser = inputUser.trim().toLowerCase();
  const cleanPass = inputPass.trim();

  if (!cleanUser) {
    return { success: false, error: 'กรุณาระบุ User (ชื่อผู้ใช้ / รหัสนักศึกษา / อีเมล)' };
  }
  if (!cleanPass) {
    return { success: false, error: 'กรุณาระบุ Pass (รหัสผ่าน)' };
  }

  // Always check latest live Google Sheet accounts so deleted old users are rejected
  const fullRows = await fetchFullLoginSheetRows(true);
  const accounts: SheetLoginAccount[] = fullRows.map(r => ({
    user: r.user,
    pass: r.pass,
    name: r.name,
    status: r.status
  }));
  const userPrefix = cleanUser.split('@')[0];
  const userDigits = extractStudentCode(userPrefix).toLowerCase();

  const matchedUser = accounts.find(acc => {
    const accUser = acc.user.trim().toLowerCase();
    const accUserPrefix = accUser.split('@')[0];
    const accDigits = extractStudentCode(accUserPrefix).toLowerCase();

    return (
      accUser === cleanUser ||
      accUserPrefix === cleanUser ||
      accUser === `${cleanUser}@kktech.ac.th` ||
      cleanUser === `${accUser}@kktech.ac.th` ||
      accUserPrefix === userPrefix ||
      (userDigits.length >= 8 && accDigits === userDigits)
    );
  });

  if (!matchedUser) {
    return {
      success: false,
      error: `ไม่พบชื่อผู้ใช้ "${inputUser}" ในฐานข้อมูลปัจจุบันของ Google Sheet (แผ่นงาน login)`
    };
  }

  if (matchedUser.pass.trim() !== cleanPass) {
    return {
      success: false,
      error: 'รหัสผ่าน (pass) ไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านอีกครั้ง'
    };
  }

  const role = mapStatusToRole(matchedUser.status);
  const userEmail = matchedUser.user.includes('@') ? matchedUser.user : `${matchedUser.user}@kktech.ac.th`;
  const initials = getInitialsFromName(matchedUser.name);
  const studentCode = role === 'student' ? extractStudentCode(matchedUser.user) : undefined;

  let studentProfile: Student | undefined;
  if (role === 'student') {
    const rowMatch = fullRows.find(r => {
      const rUser = r.user.trim().toLowerCase();
      const rCode = extractStudentCode(rUser).toLowerCase();
      return rUser === userEmail.toLowerCase() || (studentCode && rCode === studentCode.toLowerCase()) || r.name.trim() === matchedUser.name.trim();
    });
    if (rowMatch) {
      studentProfile = convertLoginRowToStudent(rowMatch);
    }
  }

  const authUser: AuthUser = {
    email: userEmail,
    name: matchedUser.name,
    role,
    initials,
    department:
      role === 'student'
        ? (studentProfile?.room || '').includes('ทลฟ')
          ? 'ภาควิชาเทคโนโลยีไฟฟ้า (นักศึกษาฝึกงาน)'
          : 'แผนกช่างไฟฟ้ากำลัง (นักศึกษาฝึกงาน)'
        : 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
    studentId: studentCode,
    provider: 'google'
  };

  return {
    success: true,
    user: authUser,
    matchedAccount: matchedUser,
    studentProfile
  };
}
