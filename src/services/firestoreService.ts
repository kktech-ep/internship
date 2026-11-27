import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  limit,
  where,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, stripUndefinedDeep } from '../firebase';
import { Student, Company, WeeklySubmission, Announcement, Form3SupervisionRecord, CourseDataRow, SheetTeacher, TeachingReportRecord, UserAvatarRecord } from '../types';
import { getAllLoginSheetStudents } from './sheetAuthService';
import { buildUnifiedCompanies, toFirestoreCompanies } from '../utils/dataUnifier';

export const COLLECTIONS = {
  STUDENTS: 'students',
  COMPANIES: 'companies',
  SUBMISSIONS: 'submissions',
  ANNOUNCEMENTS: 'announcements',
  FORM3_SUPERVISIONS: 'form3_supervisions',
  COURSES: 'courses',
  TEACHERS: 'teachers',
  TEACHING_REPORTS: 'teaching_reports',
  USER_AVATARS: 'user_avatars',
  SITE_STATS: 'site_stats',
  ONLINE_SESSIONS: 'online_sessions',
} as const;

export function toSafeUserAvatarId(identifier: string): string {
  const clean = (identifier || '').trim().toLowerCase();
  if (!clean) return 'usr-default';
  const normalized = clean.replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 110);
  return `usr-${normalized || 'default'}`;
}

export function normalizeAvatarPersonName(name?: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/^(นาย|นางสาว|น\.ส\.|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.|ผศ\.)\s*/g, '')
    .replace(/\s+/g, '');
}

export function resolveUserAvatarUrl(
  avatars: UserAvatarRecord[],
  queryInfo: { email?: string; studentCode?: string; name?: string }
): string | undefined {
  if (!avatars || avatars.length === 0) return undefined;
  const targetEmail = (queryInfo.email || '').trim().toLowerCase();
  const targetEmailPrefix = targetEmail.split('@')[0];
  const targetCode = (queryInfo.studentCode || '').trim().replace(/^s/i, '').toLowerCase();
  const targetName = normalizeAvatarPersonName(queryInfo.name);

  if (targetEmail) {
    const byEmail = avatars.find((a) => (a.email || '').trim().toLowerCase() === targetEmail);
    if (byEmail?.avatarUrl) return byEmail.avatarUrl;
  }
  if (targetCode) {
    const byCode = avatars.find((a) => {
      const recCode = (a.studentCode || '').trim().replace(/^s/i, '').toLowerCase();
      const recPrefix = (a.email || '').trim().toLowerCase().split('@')[0].replace(/^s/i, '');
      return (recCode && recCode === targetCode) || (recPrefix && recPrefix === targetCode);
    });
    if (byCode?.avatarUrl) return byCode.avatarUrl;
  }
  if (targetEmailPrefix) {
    const byPrefix = avatars.find(
      (a) => (a.email || '').trim().toLowerCase().split('@')[0] === targetEmailPrefix
    );
    if (byPrefix?.avatarUrl) return byPrefix.avatarUrl;
  }
  if (targetName) {
    const byName = avatars.find((a) => normalizeAvatarPersonName(a.name) === targetName);
    if (byName?.avatarUrl) return byName.avatarUrl;
  }
  return undefined;
}

function logSubscriptionError(colPath: string, error: unknown, onError?: (err: Error) => void) {
  try {
    handleFirestoreError(error, OperationType.GET, colPath);
  } catch (structuredErr) {
    if (onError) onError(structuredErr as Error);
  }
}

/**
 * Listen for real-time changes to the Students collection
 */
export function subscribeStudents(
  onData: (students: Student[]) => void,
  onError?: (err: Error) => void
) {
  const colPath = COLLECTIONS.STUDENTS;
  return onSnapshot(
    query(collection(db, colPath), limit(500)),
    (snapshot) => {
      const items: Student[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Student);
      });
      onData(items);
    },
    (error) => {
      logSubscriptionError(colPath, error, onError);
    }
  );
}

/**
 * Listen for real-time changes to the Companies collection
 */
export function subscribeCompanies(
  onData: (companies: Company[]) => void,
  onError?: (err: Error) => void
) {
  const colPath = COLLECTIONS.COMPANIES;
  return onSnapshot(
    query(collection(db, colPath), limit(300)),
    (snapshot) => {
      const items: Company[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Company);
      });
      onData(items);
    },
    (error) => {
      logSubscriptionError(colPath, error, onError);
    }
  );
}

/**
 * Listen for real-time changes to the Submissions collection
 */
export function subscribeSubmissions(
  onData: (submissions: WeeklySubmission[]) => void,
  onError?: (err: Error) => void
) {
  const colPath = COLLECTIONS.SUBMISSIONS;
  return onSnapshot(
    query(collection(db, colPath), limit(500)),
    (snapshot) => {
      const items: WeeklySubmission[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as WeeklySubmission);
      });
      onData(items);
    },
    (error) => {
      logSubscriptionError(colPath, error, onError);
    }
  );
}

/**
 * Save or update a student document in Firestore
 */
export async function saveStudentToFirestore(student: Student): Promise<void> {
  const path = `${COLLECTIONS.STUDENTS}/${student.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.STUDENTS, student.id), stripUndefinedDeep(student), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save or update a company document in Firestore
 */
export async function saveCompanyToFirestore(company: Company): Promise<void> {
  const path = `${COLLECTIONS.COMPANIES}/${company.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.COMPANIES, company.id), stripUndefinedDeep(company), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save or update a weekly submission in Firestore
 */
export async function saveSubmissionToFirestore(submission: WeeklySubmission): Promise<void> {
  const path = `${COLLECTIONS.SUBMISSIONS}/${submission.id}`;
  try {
    await setDoc(
      doc(db, COLLECTIONS.SUBMISSIONS, submission.id),
      stripUndefinedDeep({ ...submission, updatedAt: new Date().toISOString() }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save multiple weekly submissions atomically in Firestore
 */
export async function saveSubmissionsBatchToFirestore(submissions: WeeklySubmission[]): Promise<void> {
  if (!submissions || submissions.length === 0) return;
  const path = COLLECTIONS.SUBMISSIONS;
  try {
    const nowIso = new Date().toISOString();
    const CHUNK = 400;
    for (let i = 0; i < submissions.length; i += CHUNK) {
      const batch = writeBatch(db);
      for (const sub of submissions.slice(i, i + CHUNK)) {
        batch.set(
          doc(db, COLLECTIONS.SUBMISSIONS, sub.id),
          stripUndefinedDeep({ ...sub, updatedAt: nowIso }),
          { merge: true }
        );
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Listen for real-time changes to the Announcements collection
 */
export function subscribeAnnouncements(
  onData: (announcements: Announcement[]) => void,
  onError?: (err: Error) => void
) {
  const colPath = COLLECTIONS.ANNOUNCEMENTS;
  return onSnapshot(
    query(collection(db, colPath), limit(50)),
    (snapshot) => {
      const items: Announcement[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Announcement);
      });
      onData(items);
    },
    (error) => {
      logSubscriptionError(colPath, error, onError);
    }
  );
}

/**
 * Listen for real-time changes to the Courses collection
 */
export function subscribeCourses(
  onData: (courses: CourseDataRow[]) => void,
  onError?: (err: Error) => void
) {
  const colPath = COLLECTIONS.COURSES;
  return onSnapshot(
    query(collection(db, colPath), limit(300)),
    (snapshot) => {
      const items: CourseDataRow[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as CourseDataRow);
      });
      onData(items);
    },
    (error) => {
      logSubscriptionError(colPath, error, onError);
    }
  );
}

/**
 * Listen for real-time changes to the Teachers collection
 */
export function subscribeTeachers(
  onData: (teachers: SheetTeacher[]) => void,
  onError?: (err: Error) => void
) {
  const colPath = COLLECTIONS.TEACHERS;
  return onSnapshot(
    query(collection(db, colPath), limit(100)),
    (snapshot) => {
      const items: SheetTeacher[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as SheetTeacher);
      });
      onData(items);
    },
    (error) => {
      logSubscriptionError(colPath, error, onError);
    }
  );
}

/**
 * Save or update a teacher's avatar URL in Firestore /teachers and /user_avatars
 */
export async function saveTeacherAvatarToFirestore(
  teacher: Partial<SheetTeacher> & { id: string },
  avatarUrl: string
): Promise<void> {
  const path = `${COLLECTIONS.TEACHERS}/${teacher.id}`;
  const nowIso = new Date().toISOString();
  try {
    const email = (teacher.email || teacher.user || teacher.id).trim();
    const avatarDocId = toSafeUserAvatarId(email);
    const batch = writeBatch(db);
    batch.set(
      doc(db, COLLECTIONS.TEACHERS, teacher.id),
      stripUndefinedDeep({
        ...teacher,
        avatarUrl,
        updatedAt: nowIso,
      }),
      { merge: true }
    );
    batch.set(
      doc(db, COLLECTIONS.USER_AVATARS, avatarDocId),
      stripUndefinedDeep({
        id: avatarDocId,
        email,
        name: teacher.name || email,
        role: teacher.role || 'teacher',
        avatarUrl,
        updatedAt: nowIso,
      }),
      { merge: true }
    );
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save or update a user's avatar photo in dedicated /user_avatars collection (plus profile doc sync)
 */
export async function saveUserAvatarToFirestore(params: {
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  avatarUrl: string;
  studentCode?: string;
  studentDocId?: string;
  teacherDocId?: string;
}): Promise<UserAvatarRecord> {
  const email = (params.email || params.studentCode || params.name).trim();
  const avatarDocId = toSafeUserAvatarId(email);
  const path = `${COLLECTIONS.USER_AVATARS}/${avatarDocId}`;
  const nowIso = new Date().toISOString();
  const record: UserAvatarRecord = {
    id: avatarDocId,
    email,
    name: params.name,
    role: params.role,
    ...(params.studentCode ? { studentCode: params.studentCode } : {}),
    avatarUrl: params.avatarUrl,
    updatedAt: nowIso,
  };
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTIONS.USER_AVATARS, avatarDocId), stripUndefinedDeep(record), { merge: true });
    if (params.role === 'student' && params.studentDocId) {
      batch.set(
        doc(db, COLLECTIONS.STUDENTS, params.studentDocId),
        stripUndefinedDeep({ avatarUrl: params.avatarUrl, updatedAt: nowIso }),
        { merge: true }
      );
    } else if ((params.role === 'teacher' || params.role === 'admin') && params.teacherDocId) {
      batch.set(
        doc(db, COLLECTIONS.TEACHERS, params.teacherDocId),
        stripUndefinedDeep({
          id: params.teacherDocId,
          email,
          name: params.name,
          avatarUrl: params.avatarUrl,
          updatedAt: nowIso,
        }),
        { merge: true }
      );
    }
    await batch.commit();
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Listen for real-time changes to the User Avatars collection
 */
export function subscribeUserAvatars(
  onData: (avatars: UserAvatarRecord[]) => void,
  onError?: (err: Error) => void
) {
  const colPath = COLLECTIONS.USER_AVATARS;
  return onSnapshot(
    query(collection(db, colPath), limit(500)),
    (snapshot) => {
      const items: UserAvatarRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as UserAvatarRecord);
      });
      onData(items);
    },
    (error) => {
      logSubscriptionError(colPath, error, onError);
    }
  );
}

/**
 * Fetch all user avatars once from Firestore
 */
export async function getUserAvatarsFromFirestore(): Promise<UserAvatarRecord[]> {
  try {
    const snap = await getDocs(query(collection(db, COLLECTIONS.USER_AVATARS), limit(500)));
    const items: UserAvatarRecord[] = [];
    snap.forEach((docSnap) => items.push(docSnap.data() as UserAvatarRecord));
    return items;
  } catch {
    return [];
  }
}

/**
 * Seed initial data if the Firestore collection is empty
 * Strictly seeds directly from Google Sheets "login" tab students & real derived companies
 */
export async function seedFirestoreIfEmpty(
  _mockStudents: Student[],
  mockCompanies: Company[],
  _mockWeeklySubmissions: Record<string, WeeklySubmission[]>,
  mockAnnouncements: Announcement[]
): Promise<void> {
  try {
    const studentSnapshot = await getDocs(query(collection(db, COLLECTIONS.STUDENTS), limit(1)));
    if (studentSnapshot.empty) {
      console.log('Seeding initial data into Firestore (internship2-2569) from Google Sheets login tab...');
      
      // Seed real students from Google Sheets login tab
      const realStudents = getAllLoginSheetStudents();
      for (const student of realStudents) {
        await setDoc(doc(db, COLLECTIONS.STUDENTS, student.id), stripUndefinedDeep(student));
      }

      // Derive and seed real companies using unified builder (fallback to mockCompanies only if none)
      const unifiedCompanies = toFirestoreCompanies(buildUnifiedCompanies(realStudents, []));
      if (unifiedCompanies.length > 0) {
        for (const company of unifiedCompanies) {
          await setDoc(doc(db, COLLECTIONS.COMPANIES, company.id), stripUndefinedDeep(company));
        }
      } else {
        for (const company of mockCompanies) {
          await setDoc(doc(db, COLLECTIONS.COMPANIES, company.id), stripUndefinedDeep(company));
        }
      }

      // Seed announcements
      for (const ann of mockAnnouncements) {
        await setDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, ann.id), stripUndefinedDeep(ann));
      }
      console.log('Firestore seed completed successfully from Google Sheets login tab.');
    } else {
      // Ensure announcements exist if collection is empty
      const annSnap = await getDocs(query(collection(db, COLLECTIONS.ANNOUNCEMENTS), limit(1)));
      if (annSnap.empty) {
        for (const ann of mockAnnouncements) {
          await setDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, ann.id), stripUndefinedDeep(ann));
        }
      }
    }
  } catch (error) {
    console.warn('Seed operation check note:', error);
  }
}

/**
 * Save or update a Form_3 supervision report in Firestore
 */
export async function saveForm3SupervisionToFirestore(record: Form3SupervisionRecord): Promise<void> {
  const path = `${COLLECTIONS.FORM3_SUPERVISIONS}/${record.id}`;
  try {
    await setDoc(
      doc(db, COLLECTIONS.FORM3_SUPERVISIONS, record.id),
      stripUndefinedDeep(record),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save a batch of Form_3 supervision records atomically and immediately to Firestore
 */
export async function saveForm3SupervisionsBatchToFirestore(records: Form3SupervisionRecord[]): Promise<void> {
  if (!records || records.length === 0) return;
  const path = COLLECTIONS.FORM3_SUPERVISIONS;
  try {
    const CHUNK = 200;
    for (let i = 0; i < records.length; i += CHUNK) {
      const batch = writeBatch(db);
      for (const rec of records.slice(i, i + CHUNK)) {
        batch.set(
          doc(db, COLLECTIONS.FORM3_SUPERVISIONS, rec.id),
          stripUndefinedDeep(rec),
          { merge: true }
        );
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save or update a teacher's weekly workplace teaching report in Firestore
 */
export async function saveTeachingReportToFirestore(report: TeachingReportRecord): Promise<void> {
  const path = `${COLLECTIONS.TEACHING_REPORTS}/${report.id}`;
  try {
    await setDoc(
      doc(db, COLLECTIONS.TEACHING_REPORTS, report.id),
      stripUndefinedDeep({ ...report, updatedAt: report.updatedAt || new Date().toISOString() }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Listen for real-time changes to the Teaching Reports collection
 */
export function subscribeTeachingReports(
  onData: (reports: TeachingReportRecord[]) => void,
  onError?: (err: Error) => void
) {
  const colPath = COLLECTIONS.TEACHING_REPORTS;
  return onSnapshot(
    query(collection(db, colPath), limit(500)),
    (snapshot) => {
      const items: TeachingReportRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as TeachingReportRecord);
      });
      onData(items);
    },
    (error) => {
      logSubscriptionError(colPath, error, onError);
    }
  );
}

/**
 * Listen for real-time changes to the Form3 Supervisions collection
 */
export function subscribeForm3Supervisions(
  onData: (records: Form3SupervisionRecord[]) => void,
  onError?: (err: Error) => void
) {
  const colPath = COLLECTIONS.FORM3_SUPERVISIONS;
  return onSnapshot(
    query(collection(db, colPath), limit(500)),
    (snapshot) => {
      const items: Form3SupervisionRecord[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Form3SupervisionRecord);
      });
      onData(items);
    },
    (error) => {
      logSubscriptionError(colPath, error, onError);
    }
  );
}

/**
 * Delete a student's weekly submission from Firestore (for Admin)
 */
export async function deleteSubmissionFromFirestore(submissionId: string): Promise<void> {
  const path = `${COLLECTIONS.SUBMISSIONS}/${submissionId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.SUBMISSIONS, submissionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Delete a teacher's supervision report from Firestore (for Admin)
 */
export async function deleteForm3SupervisionFromFirestore(recordId: string): Promise<void> {
  const path = `${COLLECTIONS.FORM3_SUPERVISIONS}/${recordId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.FORM3_SUPERVISIONS, recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface OnlineSessionRecord {
  id: string;
  role: 'student' | 'teacher' | 'admin' | 'guest';
  lastSeenMs: number;
  updatedAt: string;
}

/**
 * Increment aggregate portal page visits counter in Firestore
 */
export async function recordPageVisitToFirestore(): Promise<void> {
  const path = `${COLLECTIONS.SITE_STATS}/portal`;
  try {
    await setDoc(
      doc(db, COLLECTIONS.SITE_STATS, 'portal'),
      {
        id: 'portal',
        totalVisits: increment(1),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Listen for real-time updates to total portal page visits
 */
export function subscribeSiteStats(
  onData: (totalVisits: number) => void,
  onError?: (err: Error) => void
) {
  const docPath = `${COLLECTIONS.SITE_STATS}/portal`;
  return onSnapshot(
    doc(db, COLLECTIONS.SITE_STATS, 'portal'),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as { totalVisits?: unknown };
        const count = typeof data.totalVisits === 'number' && Number.isFinite(data.totalVisits)
          ? Math.max(0, Math.floor(data.totalVisits))
          : 0;
        onData(count);
      } else {
        onData(0);
      }
    },
    (error) => {
      logSubscriptionError(docPath, error, onError);
    }
  );
}

/**
 * Upsert an active browser session heartbeat for live online user counting
 */
export async function upsertOnlineSessionToFirestore(
  sessionId: string,
  role: 'student' | 'teacher' | 'admin' | 'guest'
): Promise<void> {
  const path = `${COLLECTIONS.ONLINE_SESSIONS}/${sessionId}`;
  try {
    const payload: OnlineSessionRecord = {
      id: sessionId,
      role,
      lastSeenMs: Date.now(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, COLLECTIONS.ONLINE_SESSIONS, sessionId), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Remove an active browser session document when the tab/session closes
 */
export async function removeOnlineSessionFromFirestore(sessionId: string): Promise<void> {
  const path = `${COLLECTIONS.ONLINE_SESSIONS}/${sessionId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.ONLINE_SESSIONS, sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Listen for real-time changes to currently active online sessions
 */
export function subscribeOnlineSessions(
  cutoffMs: number,
  onData: (sessions: OnlineSessionRecord[]) => void,
  onError?: (err: Error) => void
) {
  const colPath = COLLECTIONS.ONLINE_SESSIONS;
  return onSnapshot(
    query(collection(db, colPath), where('lastSeenMs', '>=', cutoffMs), limit(300)),
    (snapshot) => {
      const items: OnlineSessionRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Partial<OnlineSessionRecord>;
        if (data && typeof data.id === 'string' && typeof data.lastSeenMs === 'number') {
          items.push({
            id: data.id,
            role: data.role || 'guest',
            lastSeenMs: data.lastSeenMs,
            updatedAt: data.updatedAt || '',
          });
        }
      });
      onData(items);
    },
    (error) => {
      logSubscriptionError(colPath, error, onError);
    }
  );
}

