/**
 * Google Spreadsheet (Tab: login) & Firebase Firestore (internship2-2569)
 * Unified Database & Bidirectional Synchronization Service
 * 
 * Target Spreadsheet ID: 1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28
 * Target Sheet Tab: login
 * Firebase Project: internship2-2569
 * Firestore Collections:
 *   - /students/{studentId}
 *   - /login_sheet/{userId}
 *   - /companies/{companyId}
 */

import { doc, setDoc, getDocs, deleteDoc, collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { 
  fetchFullLoginSheetRows, 
  convertLoginRowToStudent, 
  saveCompanyDataToLoginSheet,
  getAllLoginSheetTeachers,
  LoginSheetFullRow,
  LOGIN_SHEET_CONFIG
} from './sheetAuthService';
import { Student, Company, SheetTeacher } from '../types';
import { fetchDataSheetCourses, fetchPivotSheetCourses } from './courseDataService';

export interface SyncSummary {
  success: boolean;
  totalSynced: number;
  studentsCount: number;
  timestamp: string;
  sourceSpreadsheetId: string;
  targetFirebaseProject: string;
  message: string;
}

const STORAGE_LAST_SYNC_KEY = 'kktech_sheet_firebase_last_sync_info_v1';

/**
 * Get cached last sync summary info
 */
export function getLastSyncInfo(): SyncSummary | null {
  try {
    const raw = localStorage.getItem(STORAGE_LAST_SYNC_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read sync info cache:', e);
  }
  return null;
}

/**
 * Synchronize every row from Google Sheet (login tab) into Firebase Firestore (internship2-2569)
 * This links and merges both sources into a unified single source of truth.
 */
export async function syncAllLoginSheetRowsToFirebase(): Promise<SyncSummary> {
  console.log(`[SyncEngine] Starting full synchronization: Google Sheet login -> Firebase (internship2-2569)...`);

  const startTime = new Date();
  const summary: SyncSummary = {
    success: false,
    totalSynced: 0,
    studentsCount: 0,
    timestamp: startTime.toLocaleString('th-TH'),
    sourceSpreadsheetId: LOGIN_SHEET_CONFIG.spreadsheetId,
    targetFirebaseProject: 'internship2-2569',
    message: ''
  };

  try {
    // 1. Fetch live rows from Google Sheet tab 'login'
    const sheetRows = await fetchFullLoginSheetRows(true);

    if (!sheetRows || sheetRows.length === 0) {
      summary.message = 'ไม่พบข้อมูลแถวใน Google Spreadsheet แผ่นงาน login';
      return summary;
    }

    let syncedCount = 0;
    let studentRows = 0;
    const detectedCompanies = new Map<string, { name: string; phone?: string; leader?: string; gps?: string }>();

    // 2. Loop through every row and save to Firestore
    for (const row of sheetRows) {
      const userRaw = (row.user || '').trim();
      if (!userRaw && !row.name) continue;

      const cleanUserId = userRaw.replace(/[^a-zA-Z0-9_-]/g, '_') || `row_${row.rowNumber}`;

      // 2.1 Mirror raw 15-column spreadsheet row into Firestore collection /login_sheet/{userId}
      try {
        await setDoc(
          doc(db, 'login_sheet', cleanUserId),
          {
            rowNumber: row.rowNumber,
            timestamp: row.timestamp || '',
            user: row.user,
            pass: row.pass || '',
            name: row.name,
            status: row.status || '',
            phoneStudent: row.phoneStudent || '',
            Company: row.Company || '',
            CompanyID: row.CompanyID || '',
            CompanyPhone: row.CompanyPhone || '',
            room: row.room || '',
            department: row.department || '',
            leader: row.leader || '',
            leaderPhone: row.leaderPhone || '',
            GPS: row.GPS || '',
            delial: row.delial || '',
            lastSync: startTime.toISOString(),
            spreadsheetId: LOGIN_SHEET_CONFIG.spreadsheetId,
            sheetTab: LOGIN_SHEET_CONFIG.sheetName
          },
          { merge: true }
        );
      } catch (err) {
        console.warn(`[SyncEngine] Notice writing login_sheet for ${cleanUserId}:`, err);
      }

      // 2.2 For students, map to full Student entity and sync to /students/{studentId}
      const isStudent = row.status?.includes('นักศึกษา') || /^\d+/.test(userRaw) || row.room?.includes('สอฟ');
      if (isStudent && row.name) {
        const student = convertLoginRowToStudent(row);
        try {
          await setDoc(
            doc(db, 'students', student.id),
            {
              ...student,
              syncedFromSheet: true,
              sheetRowNumber: row.rowNumber,
              lastSyncAt: startTime.toISOString()
            },
            { merge: true }
          );
          studentRows++;
        } catch (err) {
          console.warn(`[SyncEngine] Notice writing student doc ${student.id}:`, err);
        }
      }

      // 2.3 Gather company info to update /companies/{companyId}
      if (row.Company && row.Company.trim().length > 2) {
        const compName = row.Company.trim();
        if (!detectedCompanies.has(compName)) {
          detectedCompanies.set(compName, {
            name: compName,
            phone: row.CompanyPhone || row.leaderPhone,
            leader: row.leader,
            gps: row.GPS
          });
        }
      }

      syncedCount++;
    }

    // 2.4 Synchronize distinct companies to Firestore /companies
    let compIndex = 1;
    for (const [compName, compInfo] of detectedCompanies.entries()) {
      const compId = `comp-sheet-${compIndex++}`;
      let lat = 16.4322;
      let lng = 102.8236;
      if (compInfo.gps && compInfo.gps.includes(',')) {
        const parts = compInfo.gps.split(',');
        const pLat = parseFloat(parts[0].trim());
        const pLng = parseFloat(parts[1].trim());
        if (!isNaN(pLat) && !isNaN(pLng)) {
          lat = pLat;
          lng = pLng;
        }
      }

      try {
        await setDoc(
          doc(db, 'companies', compId),
          {
            id: compId,
            name: compName,
            shortName: compName.slice(0, 30),
            address: 'จังหวัดขอนแก่น (เชื่อมต่อจากแผ่นงาน login)',
            zone: 'อ.เมืองขอนแก่น',
            distanceKm: 5.5,
            sector: 'high-voltage',
            sectorLabel: 'ระบบไฟฟ้าและควบคุม',
            contactPerson: compInfo.leader || 'ผู้จัดการฝ่าย',
            phone: compInfo.phone || '-',
            lat: lat,
            lng: lng,
            studentsCount: 1,
            status: 'completed',
            statusText: 'เชื่อมต่อแล้ว',
            assignedTeacher: 'นายทักษิณ โสภาปิยะ',
            jobScope: 'งานติดตั้งและบำรุงรักษาระบบไฟฟ้า',
            lastSyncAt: startTime.toISOString()
          },
          { merge: true }
        );
      } catch (e) {
        // non-blocking
      }
    }

    // 2.5 Synchronize courses from Google Sheet 'data' & 'ตาราง Pivot 1' into Firestore /courses
    let coursesCount = 0;
    try {
      const courses = await fetchDataSheetCourses(true);
      for (const crs of courses) {
        const courseId = `crs-${crs.room}-${crs.subjectCode}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        await setDoc(
          doc(db, 'courses', courseId),
          {
            ...crs,
            lastSyncAt: startTime.toISOString(),
            spreadsheetId: LOGIN_SHEET_CONFIG.spreadsheetId
          },
          { merge: true }
        );
        coursesCount++;
      }
    } catch (courseErr) {
      console.warn('[SyncEngine] Course sync to Firestore notice:', courseErr);
    }

    summary.success = true;
    summary.totalSynced = syncedCount + coursesCount;
    summary.studentsCount = studentRows;
    summary.message = `เชื่อมโยงสำเร็จ: อัปเดตข้อมูล ${syncedCount} รายการ (${studentRows} นักศึกษา, ${coursesCount} รายวิชาสอน แผ่นงาน login, data, ตาราง Pivot 1) จาก Google Sheet (1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28) สู่ Firebase: internship2-2569 เป็นปัจจุบันเรียบร้อย`;
    
    // Save summary cache
    localStorage.setItem(STORAGE_LAST_SYNC_KEY, JSON.stringify(summary));
    console.log(`[SyncEngine] ${summary.message}`);
    return summary;
  } catch (error) {
    console.error('[SyncEngine] Error during full sync:', error);
    summary.message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเชื่อมโยงฐานข้อมูล';
    return summary;
  }
}

/**
 * Perform bidirectional write:
 * Simultaneously writes updated company & student info to Firebase Firestore AND Google Sheet tab 'login'
 */
export async function saveAndSyncStudentBothWays(
  student: Student,
  token?: string | null
): Promise<{ success: boolean; sheetResult: string; firestoreResult: string }> {
  const result = {
    success: true,
    sheetResult: '',
    firestoreResult: ''
  };

  const now = new Date();
  const cleanUserId = student.studentCode.replace(/[^a-zA-Z0-9_-]/g, '_');

  // 1. Write to Firebase Firestore /students/{studentId}
  try {
    await setDoc(
      doc(db, 'students', student.id),
      {
        ...student,
        updatedAt: now.toISOString(),
        lastSyncSource: 'web_portal_form1'
      },
      { merge: true }
    );
    result.firestoreResult = 'บันทึกลง Firebase Firestore (internship2-2569) สำเร็จ';
  } catch (err) {
    console.warn('[SyncEngine] Firestore student save notice:', err);
    result.firestoreResult = 'บันทึกใน Firestore ไม่สำเร็จ: ' + (err instanceof Error ? err.message : String(err));
  }

  // 2. Write to Firebase Firestore /login_sheet/{userId}
  try {
    await setDoc(
      doc(db, 'login_sheet', cleanUserId),
      {
        user: student.studentCode,
        name: student.name,
        room: student.room,
        Company: student.companyName,
        department: student.companyRegistration?.department || '',
        leader: student.companyRegistration?.mentorName || '',
        leaderPhone: student.companyRegistration?.mentorPhone || '',
        CompanyPhone: student.companyRegistration?.emergencyPhone || '',
        GPS: student.companyRegistration?.gpsCoordinates || '',
        delial: student.companyRegistration?.notes || '',
        timestamp: now.toLocaleString('th-TH'),
        lastSync: now.toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[SyncEngine] Firestore login_sheet write notice:', err);
  }

  // 3. Write directly to Google Sheet ID 1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28 tab 'login'
  try {
    const sheetRes = await saveCompanyDataToLoginSheet(
      {
        userOrCode: student.studentCode,
        studentName: student.name,
        companyName: student.companyName,
        department: student.companyRegistration?.department || '',
        mentorName: student.companyRegistration?.mentorName || '',
        mentorPhone: student.companyRegistration?.mentorPhone || '',
        emergencyPhone: student.companyRegistration?.emergencyPhone || '',
        gpsCoordinates: student.companyRegistration?.gpsCoordinates || '',
        notes: student.companyRegistration?.notes || '',
        room: student.room
      },
      token
    );
    result.sheetResult = sheetRes.message;
  } catch (err) {
    console.warn('[SyncEngine] Google Sheet update notice:', err);
    result.sheetResult = 'การบันทึกลง Google Sheet อยู่ระหว่างรอการเชื่อมต่อ token';
  }

  return result;
}

/**
 * Wipe all old user data (students & teachers) from Firebase (internship2-2569)
 * and replace them with fresh data from Google Sheets (tab: login)
 */
export async function wipeAndReplaceFirebaseWithSheetData(): Promise<{
  success: boolean;
  deletedCount: number;
  insertedStudents: number;
  insertedTeachers: number;
  insertedUsers: number;
  message: string;
}> {
  console.log('[SyncEngine] Wiping old database in Firebase (internship2-2569) and replacing from Google Sheets...');

  let deletedCount = 0;
  const collectionsToClear = ['students', 'teachers', 'users', 'login_sheet'];

  // 1. Delete all old documents in collections
  for (const colName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, colName));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, colName, d.id));
        deletedCount++;
      }
    } catch (e) {
      console.warn(`[SyncEngine] Notice wiping collection ${colName}:`, e);
    }
  }

  // 2. Fetch live rows from Google Sheets login tab
  const rows = await fetchFullLoginSheetRows(true);
  const startTimeISO = new Date().toISOString();

  let insertedStudents = 0;
  let insertedTeachers = 0;
  let insertedUsers = 0;

  // Insert default verified teachers from system & login sheet
  const defaultTeachers = getAllLoginSheetTeachers();
  for (const tch of defaultTeachers) {
    try {
      const cleanUserId = tch.email.replace(/[^a-zA-Z0-9_-]/g, '_');
      await setDoc(doc(db, 'teachers', tch.id), {
        ...tch,
        source: 'Google Sheets login sync',
        updatedAt: startTimeISO
      });
      await setDoc(doc(db, 'users', cleanUserId), {
        email: tch.email,
        name: tch.name,
        role: tch.role,
        status: tch.status,
        department: tch.department,
        phone: tch.phone || '',
        pass: '123456',
        updatedAt: startTimeISO
      });
      insertedTeachers++;
      insertedUsers++;
    } catch (e) {
      // non-blocking
    }
  }

  // 3. Process every row from Google Sheets login tab
  for (const row of rows) {
    const userRaw = (row.user || '').trim();
    let name = (row.name || '').trim();
    if (!name && !userRaw) continue;

    // Completely exclude any Supannee Jaidee record
    if (
      name.includes('สุพรรณี') || 
      userRaw.includes('supannee') || 
      userRaw.includes('supanee')
    ) {
      continue;
    }

    // Standardize prefix: replace ว่าที่ร้อยตรี ทักษิณ with นายทักษิณ
    if (name.includes('ทักษิณ')) {
      name = name.replace(/ว่าที่ร้อยตรี\s*ทักษิณ/g, 'นายทักษิณ').replace(/ว่าที่ร้อยตรีทักษิณ/g, 'นายทักษิณ');
    }

    const cleanUserId = userRaw.replace(/[^a-zA-Z0-9_-]/g, '_') || `row_${row.rowNumber}`;
    const isStudent = row.status.includes('นักศึกษา') || /^\d+/.test(userRaw) || row.room.includes('สอฟ');
    const isTeacher = !isStudent && (
      row.status.includes('ครู') || 
      row.status.includes('อาจารย์') || 
      row.status.includes('admin') || 
      row.status.includes('ผู้ดูแล') || 
      row.status.includes('นิเทศ') ||
      userRaw.includes('thaksinso')
    );

    // Save mirror row in /login_sheet
    try {
      await setDoc(doc(db, 'login_sheet', cleanUserId), {
        rowNumber: row.rowNumber,
        timestamp: row.timestamp,
        user: row.user,
        pass: row.pass,
        name: name,
        status: row.status,
        phoneStudent: row.phoneStudent,
        Company: row.Company,
        CompanyID: row.CompanyID,
        CompanyPhone: row.CompanyPhone,
        room: row.room,
        department: row.department,
        leader: row.leader,
        leaderPhone: row.leaderPhone,
        GPS: row.GPS,
        delial: row.delial,
        syncedAt: startTimeISO
      });
    } catch (e) {
      // non-blocking
    }

    if (isStudent) {
      const code = userRaw.split('@')[0] || `std-${row.rowNumber}`;
      const studentId = `std-${code}`;
      const level = (row.room || '').includes('1/') ? 'ปวส.1' : 'ปวส.2';

      let lat = 16.4322;
      let lng = 102.8236;
      if (row.GPS && row.GPS.includes(',')) {
        const parts = row.GPS.split(',');
        const pLat = parseFloat(parts[0].trim());
        const pLng = parseFloat(parts[1].trim());
        if (!isNaN(pLat) && !isNaN(pLng)) {
          lat = pLat;
          lng = pLng;
        }
      }

      const studentDoc: Student = {
        id: studentId,
        studentCode: code,
        name: name,
        initials: name.slice(0, 2),
        level: level,
        department: 'แผนกวิชาช่างไฟฟ้ากำลัง',
        room: row.room || 'สอฟ.2/8',
        email: userRaw.includes('@') ? userRaw : `${userRaw}@kktech.ac.th`,
        companyId: `comp-${code}`,
        companyName: row.Company || 'ยังไม่ระบุสถานประกอบการ',
        currentWeek: 8,
        totalWeeks: 18,
        actualWeeks: 8,
        accumulatedHours: 320,
        requiredHours: 720,
        supervisorTeacher: 'นายทักษิณ โสภาปิยะ',
        companyRegistration: {
          registeredAt: row.timestamp || 'ซิงค์จากแผ่นงาน login',
          department: row.department || (row.Company ? 'แผนกปฏิบัติการและบำรุงรักษา' : '-'),
          mentorName: row.leader || '-',
          mentorPhone: row.leaderPhone || '-',
          emergencyPhone: row.CompanyPhone || row.phoneStudent || '-',
          gpsCoordinates: row.GPS || '16.4322, 102.8236',
          gpsLat: lat,
          gpsLng: lng,
          notes: row.delial || ''
        }
      };

      try {
        await setDoc(doc(db, 'students', studentId), studentDoc);
        insertedStudents++;

        await setDoc(doc(db, 'users', cleanUserId), {
          email: userRaw.includes('@') ? userRaw : `${userRaw}@kktech.ac.th`,
          name: row.name,
          role: 'student',
          studentId: code,
          status: row.status || 'นักศึกษา',
          room: row.room,
          department: 'แผนกวิชาช่างไฟฟ้ากำลัง',
          phone: row.phoneStudent,
          pass: row.pass,
          companyName: row.Company,
          updatedAt: startTimeISO
        });
        insertedUsers++;
      } catch (e) {
        // non-blocking
      }
    } else if (isTeacher) {
      const email = userRaw.includes('@') ? userRaw : `${userRaw}@kktech.ac.th`;
      const tchId = `tch-${cleanUserId}`;
      try {
        await setDoc(doc(db, 'teachers', tchId), {
          id: tchId,
          name: name,
          user: userRaw,
          email: email,
          status: row.status || 'ครูนิเทศก์',
          role: row.status.includes('admin') ? 'admin' : 'teacher',
          phone: row.phoneStudent || '',
          department: row.department || 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
          room: row.room || '',
          updatedAt: startTimeISO
        });
        insertedTeachers++;

        await setDoc(doc(db, 'users', cleanUserId), {
          email: email,
          name: name,
          role: row.status.includes('admin') ? 'admin' : 'teacher',
          status: row.status,
          department: row.department || 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
          phone: row.phoneStudent,
          pass: row.pass,
          updatedAt: startTimeISO
        });
        insertedUsers++;
      } catch (e) {
        // non-blocking
      }
    }
  }

  const message = `ลบข้อมูลเก่าสำเร็จ (${deletedCount} รายการ) และนำเข้าข้อมูลใหม่จาก Google Sheets เรียบร้อย (นักศึกษา ${insertedStudents} คน, ครูนิเทศก์ ${insertedTeachers} ท่าน)`;
  return {
    success: true,
    deletedCount,
    insertedStudents,
    insertedTeachers,
    insertedUsers,
    message
  };
}
