/**
 * Google Spreadsheet (Tab: login) & Firebase Firestore (internship2-2569)
 * Unified Database & Authoritative Synchronization Service
 *
 * Target Spreadsheet ID: 1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28
 * Target Sheet Tab: login
 * Firebase Project: internship2-2569
 * Firestore Collections:
 *   - /students/{studentId}
 *   - /teachers/{teacherId}
 *   - /users/{userId}
 *   - /login_sheet/{userId}
 *   - /companies/{companyId}
 *   - /courses/{courseId}
 */

import { doc, getDocs, collection, writeBatch, WriteBatch } from 'firebase/firestore';
import { db, stripUndefinedDeep } from '../firebase';
import {
  fetchFullLoginSheetRows,
  convertLoginRowToStudent,
  saveCompanyDataToLoginSheet,
  getAllLoginSheetTeachers,
  isStudentSheetRow,
  mapStatusToRole,
  LOGIN_SHEET_CONFIG
} from './sheetAuthService';
import { Student, Form3SupervisionRecord, SheetTeacher, UserAvatarRecord } from '../types';
import { fetchDataSheetCourses } from './courseDataService';
import { buildUnifiedCompanies, toFirestoreCompanies } from '../utils/dataUnifier';
import { getUserAvatarsFromFirestore, resolveUserAvatarUrl } from './firestoreService';

export interface SyncSummary {
  success: boolean;
  totalSynced: number;
  studentsCount: number;
  deletedCount?: number;
  timestamp: string;
  sourceSpreadsheetId: string;
  targetFirebaseProject: string;
  message: string;
}

const STORAGE_LAST_SYNC_KEY = 'kktech_sheet_firebase_last_sync_info_v2';

/**
 * Commit Firestore write/delete operations in safe chunks of 400
 */
async function commitBatchOperations(
  operations: Array<(batch: WriteBatch) => void>
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((op) => op(batch));
    await batch.commit();
  }
}

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
 * AND automatically delete stale/old users & students that are no longer in the Google Sheet.
 */
export async function syncAllLoginSheetRowsToFirebase(): Promise<SyncSummary> {
  console.log('[SyncEngine] Starting authoritative sync: Google Sheet login -> Firebase (internship2-2569)...');

  const startTime = new Date();
  const summary: SyncSummary = {
    success: false,
    totalSynced: 0,
    studentsCount: 0,
    deletedCount: 0,
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

    // Load existing Firestore /students to preserve Form 1 updates and uploaded avatars for current students
    const existingStudentsMap = new Map<string, Student & { lastSyncSource?: string }>();
    const existingStudentDocRefs = new Map<string, ReturnType<typeof doc>>();
    try {
      const existingSnap = await getDocs(collection(db, 'students'));
      existingSnap.forEach((docSnap) => {
        existingStudentsMap.set(docSnap.id, docSnap.data() as Student & { lastSyncSource?: string });
        existingStudentDocRefs.set(docSnap.id, docSnap.ref);
      });
    } catch (readErr) {
      console.warn('[SyncEngine] Notice reading existing Firestore students:', readErr);
    }

    // Load existing Firestore /teachers and /user_avatars to preserve uploaded avatars
    const existingAvatars: UserAvatarRecord[] = await getUserAvatarsFromFirestore();
    const existingTeachersAvatarMap = new Map<string, string>();
    try {
      const existingTeachersSnap = await getDocs(collection(db, 'teachers'));
      existingTeachersSnap.forEach((docSnap) => {
        const data = docSnap.data() as SheetTeacher;
        if (data.avatarUrl) {
          existingTeachersAvatarMap.set(docSnap.id, data.avatarUrl);
          if (data.email) existingTeachersAvatarMap.set(data.email.toLowerCase(), data.avatarUrl);
        }
      });
    } catch (readErr) {
      console.warn('[SyncEngine] Notice reading existing Firestore teachers:', readErr);
    }

    let syncedCount = 0;
    let studentRows = 0;
    const validLoginSheetIds = new Set<string>();
    const validUserIds = new Set<string>();
    const validStudentIds = new Set<string>();
    const validTeacherIds = new Set<string>();
    const validCompanyIds = new Set<string>();

    const batchOps: Array<(batch: WriteBatch) => void> = [];
    const syncedStudentsForCompanies: Student[] = [];

    // 2. Process all live rows from Google Sheet login tab
    for (const row of sheetRows) {
      const userRaw = (row.user || '').trim();
      const name = (row.name || '').trim();
      if (!userRaw && !name) continue;

      const cleanUserId = userRaw.replace(/[^a-zA-Z0-9_-]/g, '_') || `row_${row.rowNumber}`;
      const isStudent = isStudentSheetRow(row);
      const userEmail = userRaw.includes('@') ? userRaw : `${userRaw}@kktech.ac.th`;

      // 2.1 Mirror raw 16-column spreadsheet row into /login_sheet/{userId}
      validLoginSheetIds.add(cleanUserId);
      batchOps.push((batch) => {
        batch.set(doc(db, 'login_sheet', cleanUserId), {
          rowNumber: row.rowNumber,
          timestamp: row.timestamp || '',
          user: row.user,
          pass: row.pass || '',
          name: name,
          status: row.status || '',
          phoneStudent: row.phoneStudent || '',
          Company: row.Company || '',
          CompanyID: row.CompanyID || '',
          CompanyPhone: row.CompanyPhone || '',
          room: row.room || '',
          level: row.level || '',
          department: row.department || '',
          leader: row.leader || '',
          leaderPhone: row.leaderPhone || '',
          GPS: row.GPS || '',
          delial: row.delial || '',
          lastSync: startTime.toISOString(),
          spreadsheetId: LOGIN_SHEET_CONFIG.spreadsheetId,
          sheetTab: LOGIN_SHEET_CONFIG.sheetName
        });
      });

      let effectiveCompanyName = (row.Company || '').trim();
      let effectiveStudent: Student | null = null;

      if (isStudent && name) {
        const student = convertLoginRowToStudent(row);
        const existing = existingStudentsMap.get(student.id);
        const keepExistingForm1 = Boolean(
          existing &&
          existing.lastSyncSource === 'web_portal_form1' &&
          existing.companyName &&
          existing.companyName !== 'ยังไม่ระบุสถานประกอบการ'
        );

        const persistedStudentAvatar =
          resolveUserAvatarUrl(existingAvatars, {
            email: userEmail,
            studentCode: student.studentCode,
            name: student.name,
          }) || existing?.avatarUrl;

        const mergedStudent: Student & Record<string, unknown> = {
          ...student,
          companyName: keepExistingForm1 && existing ? existing.companyName : student.companyName,
          companyId: keepExistingForm1 && existing ? existing.companyId : student.companyId,
          room: (keepExistingForm1 && existing?.room) ? existing.room : student.room,
          companyRegistration: keepExistingForm1 && existing?.companyRegistration
            ? existing.companyRegistration
            : student.companyRegistration,
          ...(keepExistingForm1 && existing?.lastSyncSource ? { lastSyncSource: existing.lastSyncSource } : {}),
          ...(persistedStudentAvatar ? { avatarUrl: persistedStudentAvatar } : {}),
          ...(typeof existing?.accumulatedHours === 'number' && existing.accumulatedHours !== 320
            ? { accumulatedHours: existing.accumulatedHours }
            : {}),
          ...(typeof existing?.actualWeeks === 'number' && existing.actualWeeks !== 8
            ? { actualWeeks: existing.actualWeeks }
            : {}),
          syncedFromSheet: true,
          sheetRowNumber: row.rowNumber,
          lastSyncAt: startTime.toISOString()
        };

        effectiveStudent = mergedStudent as Student;
        syncedStudentsForCompanies.push(effectiveStudent);

        validStudentIds.add(student.id);
        validUserIds.add(cleanUserId);

        batchOps.push((batch) => {
          batch.set(doc(db, 'students', student.id), stripUndefinedDeep(mergedStudent));
          batch.set(doc(db, 'users', cleanUserId), stripUndefinedDeep({
            email: userEmail,
            name: name,
            role: 'student',
            studentId: student.studentCode,
            status: row.status || 'นักศึกษา',
            room: effectiveStudent?.room || student.room,
            level: student.level,
            department: student.department,
            phone: row.phoneStudent || '',
            pass: row.pass || '',
            companyName: (mergedStudent.companyName || '').trim(),
            updatedAt: startTime.toISOString()
          }));
        });
        studentRows++;
      } else {
        const mappedRole = mapStatusToRole(row.status || '');
        const tchId = `tch-${cleanUserId}`;
        const preservedAvatar =
          resolveUserAvatarUrl(existingAvatars, { email: userEmail, name }) ||
          existingTeachersAvatarMap.get(tchId) ||
          existingTeachersAvatarMap.get(userEmail.toLowerCase());
        validTeacherIds.add(tchId);
        validUserIds.add(cleanUserId);

        batchOps.push((batch) => {
          batch.set(doc(db, 'teachers', tchId), {
            id: tchId,
            name: name || userRaw,
            user: userRaw,
            email: userEmail,
            status: row.status || 'ครูนิเทศก์',
            role: mappedRole === 'admin' ? 'admin' : 'teacher',
            phone: row.phoneStudent || '',
            department: row.department || 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
            room: row.room || '',
            ...(preservedAvatar ? { avatarUrl: preservedAvatar } : {}),
            updatedAt: startTime.toISOString()
          });
          batch.set(doc(db, 'users', cleanUserId), {
            email: userEmail,
            name: name || userRaw,
            role: mappedRole,
            status: row.status || 'ครูนิเทศก์',
            department: row.department || 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
            phone: row.phoneStudent || '',
            pass: row.pass || '',
            updatedAt: startTime.toISOString()
          });
        });
      }

      syncedCount++;
    }

    // 2.4 Synchronize distinct companies to Firestore /companies using unified builder
    let existingForm3: Form3SupervisionRecord[] = [];
    try {
      const f3Snap = await getDocs(collection(db, 'form3_supervisions'));
      f3Snap.forEach((d) => existingForm3.push(d.data() as Form3SupervisionRecord));
    } catch {
      // ignore if empty or offline
    }
    const derivedCompanies = toFirestoreCompanies(buildUnifiedCompanies(syncedStudentsForCompanies, existingForm3));
    for (const comp of derivedCompanies) {
      validCompanyIds.add(comp.id);
      batchOps.push((batch) => {
        batch.set(
          doc(db, 'companies', comp.id),
          stripUndefinedDeep({
            ...comp,
            lastSyncAt: startTime.toISOString()
          })
        );
      });
    }

    // 2.5 Delete ALL stale/old documents not in current Google Sheet (students, users, teachers, login_sheet, companies)
    let deletedCount = 0;
    existingStudentDocRefs.forEach((ref, docId) => {
      if (!validStudentIds.has(docId)) {
        batchOps.push((batch) => batch.delete(ref));
        deletedCount++;
      }
    });

    const cleanupTargets: Array<{ col: string; validSet: Set<string> }> = [
      { col: 'users', validSet: validUserIds },
      { col: 'teachers', validSet: validTeacherIds },
      { col: 'login_sheet', validSet: validLoginSheetIds },
      { col: 'companies', validSet: validCompanyIds },
    ];

    for (const target of cleanupTargets) {
      try {
        const snap = await getDocs(collection(db, target.col));
        snap.forEach((d) => {
          if (!target.validSet.has(d.id)) {
            batchOps.push((batch) => batch.delete(d.ref));
            deletedCount++;
          }
        });
      } catch (err) {
        console.warn(`[SyncEngine] Notice scanning stale docs in ${target.col}:`, err);
      }
    }

    // Commit all writes + stale deletions in batches
    await commitBatchOperations(batchOps);

    // 2.6 Synchronize courses from Google Sheet 'data' into Firestore /courses
    let coursesCount = 0;
    try {
      const courses = await fetchDataSheetCourses(true);
      const validCourseIds = new Set<string>();
      const courseOps: Array<(batch: WriteBatch) => void> = [];
      for (const crs of courses) {
        const courseId = `crs-${crs.room}-${crs.subjectCode}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        validCourseIds.add(courseId);
        courseOps.push((batch) => {
          batch.set(
            doc(db, 'courses', courseId),
            {
              ...crs,
              lastSyncAt: startTime.toISOString(),
              spreadsheetId: LOGIN_SHEET_CONFIG.spreadsheetId
            },
            { merge: true }
          );
        });
        coursesCount++;
      }
      const existingCoursesSnap = await getDocs(collection(db, 'courses'));
      existingCoursesSnap.forEach((d) => {
        if (!validCourseIds.has(d.id)) {
          courseOps.push((batch) => batch.delete(d.ref));
        }
      });
      await commitBatchOperations(courseOps);
    } catch (courseErr) {
      console.warn('[SyncEngine] Course sync to Firestore notice:', courseErr);
    }

    summary.success = true;
    summary.totalSynced = syncedCount + coursesCount;
    summary.studentsCount = studentRows;
    summary.deletedCount = deletedCount;
    summary.message = `อัปเดตฐานข้อมูลสำเร็จ: ซิงค์ผู้ใช้ปัจจุบัน ${syncedCount} บัญชี (นักศึกษา ${studentRows} คน, รายวิชา ${coursesCount} วิชา)${deletedCount > 0 ? ` และลบผู้ใช้เก่าออก ${deletedCount} รายการ` : ''} จาก Google Sheet สู่ Firebase เรียบร้อย`;

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
  const userEmail = student.email || `s${student.studentCode}@kktech.ac.th`;
  const cleanUserId = userEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
  const batch = writeBatch(db);

  // 1. Write to Firebase Firestore /students/{studentId}, /login_sheet/{userId}, and /users/{userId} immediately
  try {
    batch.set(
      doc(db, 'students', student.id),
      stripUndefinedDeep({
        ...student,
        updatedAt: now.toISOString(),
        lastSyncSource: 'web_portal_form1'
      }),
      { merge: true }
    );

    // 2. Write to Firebase Firestore /login_sheet/{userId}
    batch.set(
      doc(db, 'login_sheet', cleanUserId),
      stripUndefinedDeep({
        user: userEmail,
        name: student.name,
        room: student.room,
        level: student.level,
        Company: student.companyName,
        department: student.companyRegistration?.department || '',
        leader: student.companyRegistration?.mentorName || '',
        leaderPhone: student.companyRegistration?.mentorPhone || '',
        CompanyPhone: student.companyRegistration?.emergencyPhone || '',
        GPS: student.companyRegistration?.gpsCoordinates || '',
        delial: student.companyRegistration?.notes || '',
        timestamp: now.toLocaleString('th-TH'),
        lastSync: now.toISOString()
      }),
      { merge: true }
    );

    // 2b. Mirror updated room/companyName into /users/{userId}
    batch.set(
      doc(db, 'users', cleanUserId),
      stripUndefinedDeep({
        email: userEmail,
        name: student.name,
        room: student.room,
        level: student.level,
        companyName: student.companyName,
        updatedAt: now.toISOString()
      }),
      { merge: true }
    );

    await batch.commit();
    result.firestoreResult = 'บันทึกลงฐานข้อมูลออนไลน์ (Real-time) สำเร็จ';
  } catch (err) {
    console.warn('[SyncEngine] Firestore student save notice:', err);
    result.success = false;
    result.firestoreResult = 'บันทึกในฐานข้อมูลออนไลน์ไม่สำเร็จ: ' + (err instanceof Error ? err.message : String(err));
  }

  // 3. Write directly to Google Sheet ID 1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28 tab 'login'
  try {
    const sheetRes = await saveCompanyDataToLoginSheet(
      {
        userOrCode: userEmail,
        studentName: student.name,
        companyName: student.companyName,
        department: student.companyRegistration?.department || '',
        mentorName: student.companyRegistration?.mentorName || '',
        mentorPhone: student.companyRegistration?.mentorPhone || '',
        emergencyPhone: student.companyRegistration?.emergencyPhone || '',
        gpsCoordinates: student.companyRegistration?.gpsCoordinates || '',
        notes: student.companyRegistration?.notes || '',
        room: student.room,
        level: student.level
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
 * Wipe all old user data (students, teachers, users, login_sheet, companies) from Firebase (internship2-2569)
 * and replace them strictly with current live data from Google Sheets (tab: login)
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
  const collectionsToClear = ['students', 'teachers', 'users', 'login_sheet', 'companies'];
  const deleteOps: Array<(batch: WriteBatch) => void> = [];

  // 1. Collect all old documents across user-related collections
  for (const colName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, colName));
      snap.forEach((d) => {
        deleteOps.push((batch) => batch.delete(d.ref));
        deletedCount++;
      });
    } catch (e) {
      console.warn(`[SyncEngine] Notice reading collection ${colName} for wipe:`, e);
    }
  }
  await commitBatchOperations(deleteOps);

  // 2. Fetch live rows from Google Sheets login tab
  const rows = await fetchFullLoginSheetRows(true);
  const startTimeISO = new Date().toISOString();

  let insertedStudents = 0;
  let insertedTeachers = 0;
  let insertedUsers = 0;
  const insertOps: Array<(batch: WriteBatch) => void> = [];
  const seenTeachers = new Set<string>();
  const detectedCompanies = new Map<string, Student[]>();

  // Load persistent /user_avatars so profile pictures survive account resets
  const persistedAvatars: UserAvatarRecord[] = await getUserAvatarsFromFirestore();

  // Get enriched teacher map from sheetAuthService (which reads exclusively from current login + data sheets)
  const enrichedTeachers = getAllLoginSheetTeachers();
  const enrichedByEmail = new Map(enrichedTeachers.map(t => [t.email.toLowerCase(), t]));

  // 3. Process every current row from Google Sheets login tab
  for (const row of rows) {
    const userRaw = (row.user || '').trim();
    const name = (row.name || '').trim();
    if (!name && !userRaw) continue;

    const cleanUserId = userRaw.replace(/[^a-zA-Z0-9_-]/g, '_') || `row_${row.rowNumber}`;
    const userEmail = userRaw.includes('@') ? userRaw : `${userRaw}@kktech.ac.th`;
    const isStudent = isStudentSheetRow(row);

    // Save mirror row in /login_sheet
    insertOps.push((batch) => {
      batch.set(doc(db, 'login_sheet', cleanUserId), {
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
        level: row.level || '',
        department: row.department,
        leader: row.leader,
        leaderPhone: row.leaderPhone,
        GPS: row.GPS,
        delial: row.delial,
        syncedAt: startTimeISO
      });
    });

    if (isStudent) {
      const studentDoc = convertLoginRowToStudent(row);
      const compName = (studentDoc.companyName || '').trim();
      if (compName && compName.length > 2 && compName !== 'ยังไม่ระบุสถานประกอบการ') {
        if (!detectedCompanies.has(compName)) detectedCompanies.set(compName, []);
        detectedCompanies.get(compName)!.push(studentDoc);
      }

      const preservedStudentAvatar = resolveUserAvatarUrl(persistedAvatars, {
        email: userEmail,
        studentCode: studentDoc.studentCode,
        name: studentDoc.name,
      });

      insertOps.push((batch) => {
        batch.set(doc(db, 'students', studentDoc.id), stripUndefinedDeep({
          ...studentDoc,
          ...(preservedStudentAvatar ? { avatarUrl: preservedStudentAvatar } : {}),
          syncedFromSheet: true,
          sheetRowNumber: row.rowNumber,
          lastSyncAt: startTimeISO
        }));
        batch.set(doc(db, 'users', cleanUserId), {
          email: userEmail,
          name: name,
          role: 'student',
          studentId: studentDoc.studentCode,
          status: row.status || 'นักศึกษา',
          room: studentDoc.room,
          level: studentDoc.level,
          department: studentDoc.department,
          phone: row.phoneStudent,
          pass: row.pass,
          companyName: studentDoc.companyName,
          updatedAt: startTimeISO
        });
      });
      insertedStudents++;
      insertedUsers++;
    } else {
      const tchId = `tch-${cleanUserId}`;
      const mappedRole = mapStatusToRole(row.status || '');
      const enriched = enrichedByEmail.get(userEmail.toLowerCase());
      if (!seenTeachers.has(tchId)) {
        seenTeachers.add(tchId);
        const preservedTchAvatar = resolveUserAvatarUrl(persistedAvatars, {
          email: userEmail,
          name,
        });
        insertOps.push((batch) => {
          batch.set(doc(db, 'teachers', tchId), stripUndefinedDeep({
            id: tchId,
            name: name,
            user: userRaw,
            email: userEmail,
            status: row.status || 'ครูนิเทศก์',
            role: mappedRole === 'admin' ? 'admin' : 'teacher',
            phone: row.phoneStudent || '',
            department: row.department || 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
            room: row.room || '',
            rooms: enriched?.rooms || [],
            subjects: enriched?.subjects || [],
            ...(preservedTchAvatar ? { avatarUrl: preservedTchAvatar } : {}),
            updatedAt: startTimeISO
          }));
        });
        insertedTeachers++;
      }

      insertOps.push((batch) => {
        batch.set(doc(db, 'users', cleanUserId), {
          email: userEmail,
          name: name,
          role: mappedRole,
          status: row.status,
          department: row.department || 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
          phone: row.phoneStudent,
          pass: row.pass,
          updatedAt: startTimeISO
        });
      });
      insertedUsers++;
    }
  }

  // Insert derived companies using unified builder
  const wipeStudentsList: Student[] = Array.from(detectedCompanies.values()).flat();
  const unifiedWipeCompanies = toFirestoreCompanies(buildUnifiedCompanies(wipeStudentsList, []));
  for (const comp of unifiedWipeCompanies) {
    insertOps.push((batch) => {
      batch.set(doc(db, 'companies', comp.id), {
        ...comp,
        lastSyncAt: startTimeISO
      });
    });
  }

  await commitBatchOperations(insertOps);

  const message = `ลบผู้ใช้ในฐานข้อมูลเก่าออกทั้งหมด (${deletedCount} รายการ) และปรับปรุงข้อมูลปัจจุบันจาก Google Sheets เรียบร้อย (นักศึกษา ${insertedStudents} คน, ครู/แอดมิน ${insertedTeachers} ท่าน, บัญชีผู้ใช้ ${insertedUsers} บัญชี)`;
  return {
    success: true,
    deletedCount,
    insertedStudents,
    insertedTeachers,
    insertedUsers,
    message
  };
}

/**
 * Recompute and synchronize derived /companies documents in Firestore after Form 1 or Form 3 updates
 */
export async function syncDerivedCompaniesToFirestore(
  studentsList: Student[],
  form3List: Form3SupervisionRecord[]
): Promise<void> {
  try {
    const derived = toFirestoreCompanies(buildUnifiedCompanies(studentsList, form3List));
    const validIds = new Set(derived.map((c) => c.id));
    const ops: Array<(batch: WriteBatch) => void> = [];
    const nowIso = new Date().toISOString();

    for (const comp of derived) {
      ops.push((batch) => {
        batch.set(doc(db, 'companies', comp.id), stripUndefinedDeep({ ...comp, lastSyncAt: nowIso }), { merge: true });
      });
    }

    const existingSnap = await getDocs(collection(db, 'companies'));
    existingSnap.forEach((d) => {
      if (!validIds.has(d.id)) {
        ops.push((batch) => batch.delete(d.ref));
      }
    });

    if (ops.length > 0) {
      await commitBatchOperations(ops);
    }
  } catch (err) {
    console.warn('[SyncEngine] Derived company sync notice:', err);
  }
}
