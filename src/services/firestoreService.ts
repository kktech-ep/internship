import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  limit
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { Student, Company, WeeklySubmission, Announcement, Form3SupervisionRecord } from '../types';
import { getAllLoginSheetStudents } from './sheetAuthService';

export const COLLECTIONS = {
  STUDENTS: 'students',
  COMPANIES: 'companies',
  SUBMISSIONS: 'submissions',
  ANNOUNCEMENTS: 'announcements',
  FORM3_SUPERVISIONS: 'form3_supervisions',
} as const;

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
      console.warn(`Firestore subscription notice for ${colPath}:`, error.message);
      if (onError) onError(error as Error);
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
      console.warn(`Firestore subscription notice for ${colPath}:`, error.message);
      if (onError) onError(error as Error);
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
      console.warn(`Firestore subscription notice for ${colPath}:`, error.message);
      if (onError) onError(error as Error);
    }
  );
}

/**
 * Save or update a student document in Firestore
 */
export async function saveStudentToFirestore(student: Student): Promise<void> {
  const path = `${COLLECTIONS.STUDENTS}/${student.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.STUDENTS, student.id), student, { merge: true });
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
    await setDoc(doc(db, COLLECTIONS.COMPANIES, company.id), company, { merge: true });
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
    await setDoc(doc(db, COLLECTIONS.SUBMISSIONS, submission.id), submission, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Seed initial data if the Firestore collection is empty
 * Strictly seeds directly from Google Sheets "login" tab students & companies
 */
export async function seedFirestoreIfEmpty(
  _mockStudents: Student[],
  mockCompanies: Company[],
  mockWeeklySubmissions: Record<string, WeeklySubmission[]>,
  mockAnnouncements: Announcement[]
): Promise<void> {
  try {
    const studentSnapshot = await getDocs(query(collection(db, COLLECTIONS.STUDENTS), limit(1)));
    if (studentSnapshot.empty) {
      console.log('Seeding initial data into Firestore (internship2-2569) from Google Sheets login tab...');
      
      // Seed real students from Google Sheets login tab
      const realStudents = getAllLoginSheetStudents();
      for (const student of realStudents) {
        await setDoc(doc(db, COLLECTIONS.STUDENTS, student.id), student);
      }

      // Seed companies
      for (const company of mockCompanies) {
        await setDoc(doc(db, COLLECTIONS.COMPANIES, company.id), company);
      }

      // Seed submissions
      for (const studentSubs of Object.values(mockWeeklySubmissions)) {
        for (const sub of studentSubs) {
          await setDoc(doc(db, COLLECTIONS.SUBMISSIONS, sub.id), sub);
        }
      }

      // Seed announcements
      for (const ann of mockAnnouncements) {
        await setDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, ann.id), ann);
      }
      console.log('Firestore seed completed successfully from Google Sheets login tab.');
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
    await setDoc(doc(db, COLLECTIONS.FORM3_SUPERVISIONS, record.id), record, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
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
      console.warn(`Firestore subscription notice for ${colPath}:`, error.message);
      if (onError) onError(error as Error);
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
