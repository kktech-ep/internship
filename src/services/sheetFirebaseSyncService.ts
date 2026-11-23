import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, stripUndefinedDeep } from '../firebase';
import { CourseDataRow, Form3SupervisionRecord, Student } from '../types';
import {
  convertLoginRowToStudent,
  fetchFullLoginSheetRows,
  getAllLoginSheetTeachers,
  isStudentSheetRow,
  saveCompanyDataToLoginSheet,
} from './sheetAuthService';
import { fetchDataSheetCourses } from './courseDataService';
import {
  buildUnifiedCompanies,
  normalizeStudentAcademicInfo,
  toFirestoreCompanies,
} from '../utils/dataUnifier';
import { formatThaiErrorMessage } from '../utils/thaiErrorUtils';
import { COLLECTIONS } from './firestoreService';

export interface SyncSummary {
  success: boolean;
  message: string;
  studentsCount: number;
  teachersCount: number;
  coursesCount: number;
  companiesCount: number;
  skippedUnchanged?: number;
  syncedAt: string;
  error?: string;
}

const LAST_SYNC_INFO_KEY = 'kktech_last_sheet_firebase_sync_v1';
let activeSyncPromise: Promise<SyncSummary> | null = null;

export function getLastSyncInfo(): SyncSummary | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_SYNC_INFO_KEY);
    return raw ? (JSON.parse(raw) as SyncSummary) : null;
  } catch {
    return null;
  }
}

function saveLastSyncInfo(summary: SyncSummary): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LAST_SYNC_INFO_KEY, JSON.stringify(summary));
  } catch {
    // Ignore quota errors
  }
}

function hasDocChanged(
  existing: Record<string, unknown> | undefined,
  next: Record<string, unknown>,
  fieldsToCompare: string[]
): boolean {
  if (!existing) return true;
  for (const field of fieldsToCompare) {
    if (JSON.stringify(existing[field] ?? null) !== JSON.stringify(next[field] ?? null)) {
      return true;
    }
  }
  return false;
}

/**
 * Sync Google Sheets ('login' + 'data' tabs) -> Firebase Firestore with diff check & query limit()
 */
export async function syncAllLoginSheetRowsToFirebase(
  forceSheetRefresh = false
): Promise<SyncSummary> {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    const nowIso = new Date().toISOString();
    try {
      const [fullRows, freshCourses] = await Promise.all([
        fetchFullLoginSheetRows(forceSheetRefresh),
        fetchDataSheetCourses(forceSheetRefresh),
      ]);

      // Fetch limited snapshots for diffing to minimize writes
      const [existingStudentSnap, existingTeacherSnap, existingCourseSnap, existingCompanySnap] =
        await Promise.all([
          getDocs(query(collection(db, COLLECTIONS.STUDENTS), limit(1000))),
          getDocs(query(collection(db, COLLECTIONS.TEACHERS), limit(200))),
          getDocs(query(collection(db, COLLECTIONS.COURSES), limit(500))),
          getDocs(query(collection(db, COLLECTIONS.COMPANIES), limit(500))),
        ]);

      const existingStudents = new Map<string, Record<string, unknown>>();
      existingStudentSnap.forEach((d) =>
        existingStudents.set(d.id, d.data() as Record<string, unknown>)
      );

      const existingTeachers = new Map<string, Record<string, unknown>>();
      existingTeacherSnap.forEach((d) =>
        existingTeachers.set(d.id, d.data() as Record<string, unknown>)
      );

      const existingCourses = new Map<string, Record<string, unknown>>();
      existingCourseSnap.forEach((d) =>
        existingCourses.set(d.id, d.data() as Record<string, unknown>)
      );

      const existingCompanies = new Map<string, Record<string, unknown>>();
      existingCompanySnap.forEach((d) =>
        existingCompanies.set(d.id, d.data() as Record<string, unknown>)
      );

      const writeOps: Array<{ col: string; id: string; data: Record<string, unknown> }> = [];
      let skippedUnchanged = 0;

      // 1. Students
      const studentList: Student[] = [];
      const seenStudentIds = new Set<string>();
      for (const row of fullRows) {
        if (!row.name || !isStudentSheetRow(row)) continue;
        const std = normalizeStudentAcademicInfo(convertLoginRowToStudent(row));
        if (seenStudentIds.has(std.id)) continue;
        seenStudentIds.add(std.id);
        studentList.push(std);

        const prev = existingStudents.get(std.id);
        const keepForm1 = prev?.lastSyncSource === 'web_portal_form1';
        const mergedPayload: Record<string, unknown> = {
          ...std,
          ...(prev?.avatarUrl ? { avatarUrl: prev.avatarUrl } : {}),
          ...(typeof prev?.actualWeeks === 'number' && prev.actualWeeks !== 8
            ? { actualWeeks: prev.actualWeeks }
            : {}),
          ...(typeof prev?.accumulatedHours === 'number' && prev.accumulatedHours !== 320
            ? { accumulatedHours: prev.accumulatedHours }
            : {}),
          ...(keepForm1
            ? {
                companyName: prev.companyName || std.companyName,
                companyRegistration: prev.companyRegistration || std.companyRegistration,
                room: prev.room || std.room,
                lastSyncSource: 'web_portal_form1',
              }
            : {}),
          source: 'Google Sheets login sync',
          updatedAt: nowIso,
        };

        if (
          hasDocChanged(prev, mergedPayload, [
            'name',
            'phone',
            'room',
            'level',
            'department',
            'email',
            'companyName',
            'supervisorTeacher',
            'companyRegistration',
          ])
        ) {
          writeOps.push({ col: COLLECTIONS.STUDENTS, id: std.id, data: mergedPayload });
        } else {
          skippedUnchanged++;
        }
      }

      // 2. Teachers
      const sheetTeachers = getAllLoginSheetTeachers();
      for (const tch of sheetTeachers) {
        const prev = existingTeachers.get(tch.id);
        const payload: Record<string, unknown> = {
          ...tch,
          ...(prev?.avatarUrl ? { avatarUrl: prev.avatarUrl } : {}),
          source: 'Google Sheets login & data sync',
          updatedAt: nowIso,
        };
        if (
          hasDocChanged(prev, payload, ['name', 'email', 'status', 'role', 'rooms', 'subjects'])
        ) {
          writeOps.push({ col: COLLECTIONS.TEACHERS, id: tch.id, data: payload });
        } else {
          skippedUnchanged++;
        }
      }

      // 3. Courses
      const courseList: CourseDataRow[] = freshCourses || [];
      courseList.forEach((crs, idx) => {
        const safeId = `crs-${idx + 1}-${(crs.room || 'all').replace(/[^a-zA-Z0-9_-]/g, '_')}-${(crs.subjectCode || 'sub').replace(/[^a-zA-Z0-9_-]/g, '_')}`.slice(
          0,
          120
        );
        const prev = existingCourses.get(safeId);
        const payload: Record<string, unknown> = {
          ...crs,
          id: safeId,
          updatedAt: nowIso,
        };
        if (hasDocChanged(prev, payload, ['room', 'subjectCode', 'subjectName', 'teacherName'])) {
          writeOps.push({ col: COLLECTIONS.COURSES, id: safeId, data: payload });
        } else {
          skippedUnchanged++;
        }
      });

      // 4. Derived Companies
      const derivedCompanies = toFirestoreCompanies(buildUnifiedCompanies(studentList, []));
      for (const comp of derivedCompanies) {
        const prev = existingCompanies.get(comp.id);
        const payload: Record<string, unknown> = {
          ...comp,
          updatedAt: nowIso,
        };
        if (
          hasDocChanged(prev, payload, ['name', 'studentsCount', 'assignedTeacher', 'zone'])
        ) {
          writeOps.push({ col: COLLECTIONS.COMPANIES, id: comp.id, data: payload });
        } else {
          skippedUnchanged++;
        }
      }

      // Commit changed docs in chunks
      const CHUNK = 400;
      for (let i = 0; i < writeOps.length; i += CHUNK) {
        const batch = writeBatch(db);
        for (const op of writeOps.slice(i, i + CHUNK)) {
          batch.set(doc(db, op.col, op.id), stripUndefinedDeep(op.data), { merge: true });
        }
        await batch.commit();
      }

      const summary: SyncSummary = {
        success: true,
        message:
          writeOps.length > 0
            ? `ซิงค์ข้อมูลจาก Google Sheets ขึ้น Firestore สำเร็จ (อัปเดต ${writeOps.length} รายการ, ข้ามรายการเดิม ${skippedUnchanged} รายการ)`
            : `ข้อมูลใน Firestore ตรงกับ Google Sheets แล้ว (${studentList.length} นักศึกษา, ${sheetTeachers.length} ครู)`,
        studentsCount: studentList.length,
        teachersCount: sheetTeachers.length,
        coursesCount: courseList.length,
        companiesCount: derivedCompanies.length,
        skippedUnchanged,
        syncedAt: nowIso,
      };
      saveLastSyncInfo(summary);
      return summary;
    } catch (err) {
      const thaiErr = formatThaiErrorMessage(
        err,
        'ไม่สามารถซิงค์ข้อมูลจาก Google Sheet ขึ้น Firestore ได้ในขณะนี้'
      );
      const summary: SyncSummary = {
        success: false,
        message: thaiErr,
        studentsCount: 0,
        teachersCount: 0,
        coursesCount: 0,
        companiesCount: 0,
        syncedAt: nowIso,
        error: thaiErr,
      };
      return summary;
    } finally {
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
}

/**
 * Save Form #1 company registration to Firestore and sync back to Google Sheet login tab
 */
export async function saveAndSyncStudentBothWays(
  student: Student,
  accessToken?: string | null
): Promise<{ success: boolean; sheetResult: string; firestoreResult: string }> {
  let firestoreResult = '';
  let sheetResult = '';
  let firestoreOk = false;

  try {
    const cleanPayload = stripUndefinedDeep({
      ...student,
      lastSyncSource: 'web_portal_form1',
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, COLLECTIONS.STUDENTS, student.id), cleanPayload, { merge: true });
    firestoreOk = true;
    firestoreResult = 'บันทึกข้อมูลลงฐานข้อมูล Firestore สำเร็จ';
  } catch (err) {
    firestoreOk = false;
    firestoreResult = formatThaiErrorMessage(
      err,
      'ไม่สามารถบันทึกข้อมูลนักศึกษาลงฐานข้อมูล Firestore ได้'
    );
  }

  try {
    const sheetRes = await saveCompanyDataToLoginSheet(
      {
        userOrCode: student.studentCode || student.email,
        studentName: student.name,
        companyName: student.companyName,
        department: student.companyRegistration?.department || '',
        mentorName: student.companyRegistration?.mentorName || '',
        mentorPhone: student.companyRegistration?.mentorPhone || '',
        emergencyPhone: student.companyRegistration?.emergencyPhone || '',
        gpsCoordinates: student.companyRegistration?.gpsCoordinates || '',
        notes: student.companyRegistration?.notes || '',
        room: student.room,
        level: student.level,
      },
      accessToken
    );
    sheetResult = sheetRes.message;
  } catch (err) {
    sheetResult = formatThaiErrorMessage(err, 'ซิงค์ไปยัง Google Sheet อยู่ในคิวสำรอง');
  }

  return {
    success: firestoreOk,
    firestoreResult,
    sheetResult,
  };
}

/**
 * Recompute & update /companies collection in Firestore cleanly with query limit()
 */
export async function syncDerivedCompaniesToFirestore(
  students: Student[],
  form3List: Form3SupervisionRecord[]
): Promise<void> {
  try {
    const derived = toFirestoreCompanies(buildUnifiedCompanies(students, form3List));
    if (derived.length === 0) return;

    const existingSnap = await getDocs(query(collection(db, COLLECTIONS.COMPANIES), limit(1000)));
    const existingMap = new Map<string, Record<string, unknown>>();
    existingSnap.forEach((d) => existingMap.set(d.id, d.data() as Record<string, unknown>));

    const nowIso = new Date().toISOString();
    const toWrite = derived.filter((c) =>
      hasDocChanged(existingMap.get(c.id), c as unknown as Record<string, unknown>, [
        'name',
        'studentsCount',
        'status',
        'assignedTeacher',
        'lastScore',
      ])
    );

    if (toWrite.length === 0) return;
    const CHUNK = 400;
    for (let i = 0; i < toWrite.length; i += CHUNK) {
      const batch = writeBatch(db);
      for (const comp of toWrite.slice(i, i + CHUNK)) {
        batch.set(
          doc(db, COLLECTIONS.COMPANIES, comp.id),
          stripUndefinedDeep({ ...comp, updatedAt: nowIso }),
          { merge: true }
        );
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.COMPANIES);
  }
}

/**
 * Wipe students/teachers/courses/companies and re-seed fresh from Google Sheets
 */
export async function wipeAndReplaceFirebaseWithSheetData(): Promise<SyncSummary> {
  const collectionsToClear = [
    COLLECTIONS.STUDENTS,
    COLLECTIONS.TEACHERS,
    COLLECTIONS.COURSES,
    COLLECTIONS.COMPANIES,
  ];
  for (const colName of collectionsToClear) {
    let hasMore = true;
    while (hasMore) {
      const snap = await getDocs(query(collection(db, colName), limit(400)));
      if (snap.empty) {
        hasMore = false;
        break;
      }
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      if (snap.size < 400) hasMore = false;
    }
  }
  return syncAllLoginSheetRowsToFirebase(true);
}
