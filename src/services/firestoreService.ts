import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError, stripUndefinedDeep } from '../firebase';
import { Student, Company, WeeklySubmission, Announcement, Form3SupervisionRecord, CourseDataRow, SheetTeacher, TeachingReportRecord } from '../types';
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
} as const;

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
    collection(db, colPath),
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
    collection(db, colPath),
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
    collection(db, colPath),
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
    collection(db, colPath),
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
    collection(db, colPath),
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
    collection(db, colPath),
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
 * Save or update a teacher's avatar URL in Firestore /teachers
 */
export async function saveTeacherAvatarToFirestore(
  teacher: Partial<SheetTeacher> & { id: string },
  avatarUrl: string
): Promise<void> {
  const path = `${COLLECTIONS.TEACHERS}/${teacher.id}`;
  try {
    await setDoc(
      doc(db, COLLECTIONS.TEACHERS, teacher.id),
      stripUndefinedDeep({
        ...teacher,
        avatarUrl,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
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
    collection(db, colPath),
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
    collection(db, colPath),
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
