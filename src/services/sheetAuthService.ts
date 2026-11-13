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
import preloadedAccounts from '../data/loginSheetAccounts.json';
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
  phoneStudent: string; // Col F
  Company: string; // Col G
  CompanyID: string; // Col H
  CompanyPhone: string; // Col I
  room: string; // Col J
  department: string; // Col K
  leader: string; // Col L
  leaderPhone: string; // Col M
  GPS: string; // Col N
  delial: string; // Col O
}

const STORAGE_LOGIN_ACCOUNTS_KEY = 'kktech_sheet_login_accounts_cache_v1';
const STORAGE_LOGIN_FULL_ROWS_KEY = 'kktech_login_sheet_full_rows_v2';

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
 * Fetch all full 15-column rows from Google Sheet tab: login
 */
export async function fetchFullLoginSheetRows(forceRefresh = false): Promise<LoginSheetFullRow[]> {
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
      headers: {
        'Accept': 'text/csv, text/plain, */*'
      }
    });

    if (response.ok) {
      const csvText = await response.text();
      const rawRows = parseCSV(csvText);

      const fullRows: LoginSheetFullRow[] = [];

      for (let i = 0; i < rawRows.length; i++) {
        const r = rawRows[i];
        const padded = r.concat(Array(Math.max(0, 15 - r.length)).fill(''));
        const rowNum = i + 1;

        if (i === 0) {
          // Row 0 header may contain data
          fullRows.push({
            rowNumber: rowNum,
            timestamp: padded[0].replace('Timestamp ', '').trim(),
            user: padded[1].replace('user ', '').trim(),
            pass: padded[2].replace('pass ', '').trim(),
            name: padded[3].replace('name ', '').trim(),
            status: padded[4].replace('status ', '').trim(),
            phoneStudent: padded[5].replace('phoneStudent ', '').trim(),
            Company: padded[6].replace('Company ', '').trim(),
            CompanyID: padded[7].replace('CompanyID ', '').trim(),
            CompanyPhone: padded[8].replace('CompanyPhone ', '').trim(),
            room: padded[9].replace('room ', '').trim(),
            department: padded[10].replace('department ', '').trim(),
            leader: padded[11].replace('leader ', '').trim(),
            leaderPhone: padded[12].replace('leaderPhone ', '').trim(),
            GPS: padded[13].replace('GPS ', '').trim(),
            delial: padded[14].replace('delial ', '').trim(),
          });
        } else {
          fullRows.push({
            rowNumber: rowNum,
            timestamp: padded[0].trim(),
            user: padded[1].trim(),
            pass: padded[2].trim(),
            name: padded[3].trim(),
            status: padded[4].trim(),
            phoneStudent: padded[5].trim(),
            Company: padded[6].trim(),
            CompanyID: padded[7].trim(),
            CompanyPhone: padded[8].trim(),
            room: padded[9].trim(),
            department: padded[10].trim(),
            leader: padded[11].trim(),
            leaderPhone: padded[12].trim(),
            GPS: padded[13].trim(),
            delial: padded[14].trim(),
          });
        }
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
  const targetCode = cleanTarget.split('@')[0];

  return rows.find(r => {
    const rUser = r.user.trim().toLowerCase();
    const rCode = rUser.split('@')[0];
    const rName = r.name.trim();

    if (rUser === cleanTarget || rCode === targetCode) {
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
  const userStr = (row.user || '').trim();
  const code = userStr.split('@')[0] || `std-${row.rowNumber}`;
  const room = (row.room || '').trim() || 'สอฟ.2/1';
  const level = room.includes('1/') ? 'ปวส.1' : 'ปวส.2';
  
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

  return {
    id: `std-${code}`,
    studentCode: code,
    name: row.name || 'นักศึกษาฝึกงาน',
    initials: getInitialsFromName(row.name || code),
    level: level,
    department: 'แผนกวิชาช่างไฟฟ้ากำลัง',
    room: room,
    email: userStr.includes('@') ? userStr : `${userStr}@kktech.ac.th`,
    avatarUrl: (typeof localStorage !== 'undefined' ? localStorage.getItem(`kktech_avatar_std-${code}`) : null) || undefined,
    companyId: `comp-${code}`,
    companyName: row.Company || 'ยังไม่ระบุสถานประกอบการ',
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
 * Get all students mapped directly from Google Sheet login tab dataset (113 records)
 */
export function getAllLoginSheetStudents(): Student[] {
  try {
    const cached = localStorage.getItem(STORAGE_LOGIN_FULL_ROWS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed as LoginSheetFullRow[])
          .filter(r => r.name && (r.status?.includes('นักศึกษา') || /^\d+/.test(r.user)))
          .map(r => convertLoginRowToStudent(r));
      }
    }
  } catch (e) {
    console.warn('Could not read cached students from login sheet:', e);
  }

  return (preloadedFullRows as LoginSheetFullRow[])
    .filter(r => r.name && (r.status?.includes('นักศึกษา') || /^\d+/.test(r.user)))
    .map(r => convertLoginRowToStudent(r));
}

/**
 * Normalizes a teacher's name for matching/deduplicating across sheets
 */
export function normalizeTeacherKey(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/^(ว่าที่ร้อยตรี|นาย|นางสาว|นาง|อาจารย์|ดร\.)\s*/, '')
    .replace(/\s+/g, '');
}

/**
 * Known default teachers and course instructors for KKTECH
 */
const KNOWN_DEFAULT_TEACHERS: SheetTeacher[] = [
  {
    id: 'tch-thaksin',
    name: 'นายทักษิณ โสภาปิยะ',
    user: 'thaksinso@kktech.ac.th',
    email: 'thaksinso@kktech.ac.th',
    status: 'ครูนิเทศก์ / ผู้ดูแลระบบ (admin)',
    role: 'teacher',
    phone: '081-987-6543',
    department: 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
    rooms: ['สอฟ.2/1', 'สอฟ.2/2', 'สอฟ.2/5', 'สอฟ.2/8'],
    subjects: ['30000-2005 กิจกรรมในสถานประกอบการ 1', '30104-2028 ระบบปรับอากาศในงานอุตสาหกรรม']
  },
  {
    id: 'tch-puttipong',
    name: 'นายพุฒิพงศ์ ไชยราช',
    user: 'puttipong@kktech.ac.th',
    email: 'puttipong@kktech.ac.th',
    status: 'ครูประจำวิชา / ครูนิเทศก์',
    role: 'teacher',
    phone: '086-123-4567',
    department: 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
    rooms: ['สอฟ.2/5'],
    subjects: ['30000-2005 กิจกรรมในสถานประกอบการ 1', '30104-2027 ไฟฟ้าอุตสาหกรรม']
  },
  {
    id: 'tch-yuttasat',
    name: 'นายยุทธศาสตร์ น้อยศรี',
    user: 'yuttasat@kktech.ac.th',
    email: 'yuttasat@kktech.ac.th',
    status: 'ครูประจำวิชา / ครูนิเทศก์',
    role: 'teacher',
    phone: '089-234-5678',
    department: 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
    rooms: ['สอฟ.2/5'],
    subjects: ['30104-2011 การประมาณการระบบไฟฟ้า']
  },
  {
    id: 'tch-thanyaporn',
    name: 'นางสาวธัญพร ถานะ',
    user: 'thanyaporn@kktech.ac.th',
    email: 'thanyaporn@kktech.ac.th',
    status: 'ครูประจำวิชา / ครูนิเทศก์',
    role: 'teacher',
    phone: '084-345-6789',
    department: 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
    rooms: ['สอฟ.2/5'],
    subjects: ['30104-2017 อินเทอร์เน็ตของสรรพสิ่ง']
  },
  {
    id: 'tch-anarkan',
    name: 'นายอนรรฆพนธ์ คลังชำนาญ',
    user: 'anarkan@kktech.ac.th',
    email: 'anarkan@kktech.ac.th',
    status: 'ครูประจำวิชา / ครูนิเทศก์',
    role: 'teacher',
    phone: '085-456-7890',
    department: 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
    rooms: ['สอฟ.2/5'],
    subjects: ['30104-2026 การติดตั้งไฟฟ้า 2']
  },
  {
    id: 'tch-tatthep',
    name: 'นายทัดเทพ ชีวะโอสถ',
    user: 'tatthep@kktech.ac.th',
    email: 'tatthep@kktech.ac.th',
    status: 'ครูประจำวิชา / ครูนิเทศก์',
    role: 'teacher',
    phone: '082-567-8901',
    department: 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
    rooms: ['สอฟ.2/5'],
    subjects: ['30104-2036 การซ่อมบํารุงระบบไฟฟ้า']
  },

  {
    id: 'tch-ekkachai',
    name: 'นายเอกชัย พลอยงาม',
    user: 'ekkachai@kktech.ac.th',
    email: 'ekkachai@kktech.ac.th',
    status: 'ครูนิเทศก์ / ครูที่ปรึกษา',
    role: 'teacher',
    phone: '087-789-0123',
    department: 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
    rooms: ['สอฟ.2/8'],
    subjects: ['30000-2005 กิจกรรมในสถานประกอบการ 1']
  }
];

/**
 * Get all teachers from Google Sheets "login" tab & cross-reference with "data" tab
 * References Google Sheets ID: 1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28
 */
export function getAllLoginSheetTeachers(): SheetTeacher[] {
  const teacherMap = new Map<string, SheetTeacher>();

  // 1. Seed with known default teachers
  KNOWN_DEFAULT_TEACHERS.forEach(t => {
    const key = normalizeTeacherKey(t.name);
    teacherMap.set(key, { ...t });
  });

  // 2. Read full rows from login tab
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

  // 3. Scan full rows from login sheet for teachers/supervisors/admins
  fullRows.forEach((r, idx) => {
    const status = (r.status || '').trim();
    const user = (r.user || '').trim();
    const name = (r.name || '').trim();
    const isTeacherStatus = status.includes('ครู') || 
                           status.includes('อาจารย์') || 
                           status.includes('admin') || 
                           status.includes('ผู้ดูแล') || 
                           status.includes('นิเทศ');
    const isNonStudentUser = user.length > 0 && !/^\d+/.test(user) && !status.includes('นักศึกษา');

    if (name && (isTeacherStatus || isNonStudentUser)) {
      const key = normalizeTeacherKey(name);
      const email = user.includes('@') ? user : `${user}@kktech.ac.th`;
      const existing = teacherMap.get(key);

      if (existing) {
        if (status) existing.status = status;
        if (user) existing.user = user;
        if (email) existing.email = email;
        if (r.phoneStudent) existing.phone = r.phoneStudent;
        if (r.department) existing.department = r.department;
        if (r.room && !existing.rooms?.includes(r.room)) {
          existing.rooms = [...(existing.rooms || []), r.room];
        }
      } else {
        teacherMap.set(key, {
          id: `tch-row-${idx}`,
          name: name,
          user: user,
          email: email,
          status: status || 'ครูนิเทศก์',
          role: status.includes('admin') ? 'admin' : 'teacher',
          phone: r.phoneStudent || '',
          department: r.department || 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
          rooms: r.room ? [r.room] : []
        });
      }
    }
  });

  // 4. Scan preloaded accounts from login sheet
  try {
    preloadedAccounts.forEach((acc, idx) => {
      const status = (acc.status || '').trim();
      const user = (acc.user || '').trim();
      const name = (acc.name || '').trim();
      if (name && (status.includes('ครู') || status.includes('admin') || status.includes('อาจารย์') || !/^\d+/.test(user))) {
        const key = normalizeTeacherKey(name);
        const email = user.includes('@') ? user : `${user}@kktech.ac.th`;
        const existing = teacherMap.get(key);
        if (existing) {
          if (!existing.email) existing.email = email;
          if (status) existing.status = status;
        } else {
          teacherMap.set(key, {
            id: `tch-acc-${idx}`,
            name: name,
            user: user,
            email: email,
            status: status || 'ครูนิเทศก์',
            role: status.includes('admin') ? 'admin' : 'teacher',
            department: 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น'
          });
        }
      }
    });
  } catch (e) {
    // ignore
  }

  // 5. Enrich with course data sheet info (rooms & subjects from data tab)
  try {
    const dataTeachers = getAllTeachersFromData();
    dataTeachers.forEach(tName => {
      const key = normalizeTeacherKey(tName);
      const rooms = getRoomsByTeacher(tName);
      const courses = getCoursesByTeacher(tName);
      const subjectLabels = courses.map(c => `${c.subjectCode} ${c.subjectName}`);
      
      const existing = teacherMap.get(key);
      if (existing) {
        existing.rooms = Array.from(new Set([...(existing.rooms || []), ...rooms]));
        existing.subjects = Array.from(new Set([...(existing.subjects || []), ...subjectLabels]));
      } else {
        teacherMap.set(key, {
          id: `tch-data-${key}`,
          name: tName,
          user: `${key.replace(/\s+/g, '').slice(0, 8)}@kktech.ac.th`,
          email: `${key.replace(/\s+/g, '').slice(0, 8)}@kktech.ac.th`,
          status: 'ครูประจำวิชา / นิเทศก์',
          role: 'teacher',
          department: 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
          rooms: rooms,
          subjects: subjectLabels
        });
      }
    });
  } catch (e) {
    // ignore
  }

  return Array.from(teacherMap.values()).sort((a, b) => {
    // Put นายทักษิณ โสภาปิยะ at top as primary supervisor
    if (a.name.includes('ทักษิณ')) return -1;
    if (b.name.includes('ทักษิณ')) return 1;
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
  },
  accessToken?: string | null
): Promise<{ success: boolean; message: string; rowNumber?: number; syncedLive: boolean }> {
  const allRows = await fetchFullLoginSheetRows();
  const cleanTarget = (data.userOrCode || '').trim().toLowerCase();
  const targetCode = cleanTarget.split('@')[0];

  const rowIndex = allRows.findIndex(r => {
    const rUser = r.user.trim().toLowerCase();
    const rCode = rUser.split('@')[0];
    const rName = r.name.trim();

    if (rUser === cleanTarget || rCode === targetCode) {
      return true;
    }
    if (data.studentName && rName && (rName.includes(data.studentName) || data.studentName.includes(rName))) {
      return true;
    }
    return false;
  });

  const nowTimestamp = new Date().toLocaleString('th-TH');
  let targetRowNumber = rowIndex >= 0 ? allRows[rowIndex].rowNumber : allRows.length + 1;

  let updatedRow: LoginSheetFullRow;

  if (rowIndex >= 0) {
    const existing = allRows[rowIndex];
    updatedRow = {
      ...existing,
      timestamp: nowTimestamp,
      Company: data.companyName,
      CompanyPhone: data.emergencyPhone || existing.CompanyPhone,
      room: data.room || existing.room,
      department: data.department,
      leader: data.mentorName,
      leaderPhone: data.mentorPhone,
      GPS: data.gpsCoordinates,
      delial: data.notes
    };
    allRows[rowIndex] = updatedRow;
  } else {
    // New entry
    updatedRow = {
      rowNumber: targetRowNumber,
      timestamp: nowTimestamp,
      user: data.userOrCode.includes('@') ? data.userOrCode : `${data.userOrCode}@kktech.ac.th`,
      pass: targetCode,
      name: data.studentName || 'นักศึกษาฝึกงาน',
      status: 'นักศึกษา',
      phoneStudent: '',
      Company: data.companyName,
      CompanyID: 'ขอนแก่น',
      CompanyPhone: data.emergencyPhone,
      room: data.room || 'สอฟ.2/1',
      department: data.department,
      leader: data.mentorName,
      leaderPhone: data.mentorPhone,
      GPS: data.gpsCoordinates,
      delial: data.notes
    };
    allRows.push(updatedRow);
  }

  // Update localStorage immediately
  saveLocalFullLoginRows(allRows);

  // If OAuth accessToken is available, update Google Sheet live via REST API
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
        updatedRow.department,   // Col K: department
        updatedRow.leader,       // Col L: leader
        updatedRow.leaderPhone,  // Col M: leaderPhone
        updatedRow.GPS,          // Col N: GPS
        updatedRow.delial        // Col O: delial
      ];

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${LOGIN_SHEET_CONFIG.spreadsheetId}/values/login!A${updatedRow.rowNumber}:O${updatedRow.rowNumber}?valueInputOption=USER_ENTERED`;

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `login!A${updatedRow.rowNumber}:O${updatedRow.rowNumber}`,
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

  const accounts = await fetchSheetLoginAccounts();
  const userPrefix = cleanUser.split('@')[0];

  const matchedUser = accounts.find(acc => {
    const accUser = acc.user.trim().toLowerCase();
    const accUserPrefix = accUser.split('@')[0];

    const isUserMatch = (
      accUser === cleanUser ||
      accUserPrefix === cleanUser ||
      accUser === `${cleanUser}@kktech.ac.th` ||
      cleanUser === `${accUser}@kktech.ac.th` ||
      accUserPrefix === userPrefix
    );

    return isUserMatch;
  });

  if (!matchedUser) {
    return {
      success: false,
      error: `ไม่พบชื่อผู้ใช้ "${inputUser}" ในฐานข้อมูลแผ่นงาน login ของ Google Sheet (ID: ${LOGIN_SHEET_CONFIG.spreadsheetId})`
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
  const studentCode = matchedUser.user.split('@')[0];

  const authUser: AuthUser = {
    email: userEmail,
    name: matchedUser.name,
    role,
    initials,
    department: role === 'student' ? 'แผนกช่างไฟฟ้ากำลัง (นักศึกษาฝึกงาน)' : 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
    studentId: role === 'student' ? studentCode : undefined,
    provider: 'google'
  };

  let studentProfile: Student | undefined;
  if (role === 'student') {
    const fullRows = await fetchFullLoginSheetRows();
    const rowMatch = fullRows.find(r => {
      const rCode = r.user.trim().toLowerCase().split('@')[0];
      return rCode === studentCode || r.name.trim() === matchedUser.name.trim();
    });
    if (rowMatch) {
      studentProfile = convertLoginRowToStudent(rowMatch);
    }
  }

  return {
    success: true,
    user: authUser,
    matchedAccount: matchedUser,
    studentProfile
  };
}
