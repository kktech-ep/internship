import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HubView } from './views/HubView';
import { StudentView } from './views/StudentView';
import { TeacherView } from './views/TeacherView';
import { CompanyMapView } from './views/CompanyMapView';
import { A4ReportView } from './views/A4ReportView';
import { AdminView } from './views/AdminView';
import { MobileSimView } from './views/MobileSimView';
import { WeeklyLogReportView } from './views/WeeklyLogReportView';
import { WeeklyTeachingReportsView } from './views/WeeklyTeachingReportsView';
import { Form1CompanyModal } from './components/Modals/Form1CompanyModal';
import { Form2WeeklyReportModal } from './components/Modals/Form2WeeklyReportModal';
import { Form3SupervisionModal } from './components/Modals/Form3SupervisionModal';
import { LookerStudioModal } from './components/Modals/LookerStudioModal';
import { GoogleSheetModal } from './components/Modals/GoogleSheetModal';
import { AuthModal } from './components/Modals/AuthModal';
import { LoginGatewayView } from './views/LoginGatewayView';
import { StudentGuideView } from './views/StudentGuideView';
import { mockStudents, mockCompanies, mockAnnouncements } from './data/mockData';
import {
  Student,
  Company,
  WeeklySubmission,
  AuthUser,
  Form3SupervisionRecord,
  Announcement,
  CourseDataRow,
  SheetTeacher,
  UserAvatarRecord,
  TeachingReportRecord,
} from './types';
import { WEEKS_1_TO_18, getCurrentWeekInfo } from './data/weeksData';
import { getStoredAuthUser, saveAuthUser, signOutKktechUser, getCachedAccessToken } from './services/authService';
import {
  appendForm1ToGoogleSheet,
  deleteLocalForm3Row,
  getLocalForm3Rows,
  reconcileForm3WithCloud,
  saveLocalForm3Rows,
} from './services/googleSheetsService';
import {
  getAllLoginSheetStudents,
  getAllLoginSheetTeachers,
  findStudentInLoginSheet,
  convertLoginRowToStudent,
  fetchSheetLoginAccounts,
  mapStatusToRole,
  extractStudentCode,
} from './services/sheetAuthService';
import { fetchDataSheetCourses, getCachedCourses } from './services/courseDataService';
import {
  saveAndSyncStudentBothWays,
  syncAllLoginSheetRowsToFirebase,
  syncDerivedCompaniesToFirestore,
} from './services/sheetFirebaseSyncService';
import {
  subscribeStudents,
  subscribeCompanies,
  subscribeSubmissions,
  subscribeAnnouncements,
  subscribeForm3Supervisions,
  subscribeCourses,
  subscribeTeachers,
  subscribeUserAvatars,
  saveStudentToFirestore,
  saveSubmissionToFirestore,
  saveSubmissionsBatchToFirestore,
  saveUserAvatarToFirestore,
  resolveUserAvatarUrl,
  deleteSubmissionFromFirestore,
  deleteForm3SupervisionFromFirestore,
  subscribeTeachingReports,
} from './services/firestoreService';
import {
  getLocalTeachingReports,
  reconcileTeachingReportsWithCloud,
} from './utils/teachingReportCache';
import { formatThaiErrorMessage } from './utils/thaiErrorUtils';
import {
  getCandidateStudentKeys,
  getMergedStudentSubmissions,
  writeSubmissionToLocalCache,
  markSubmissionSyncedToCloud,
  removeSubmissionFromLocalCache,
  mergeSubmissionsWithLocalCache,
  reconcileSubmissionsWithCloud,
  computeSubmissionTotalHours,
} from './utils/submissionUtils';
import {
  normalizeStudentAcademicInfo,
  getStudentEvaluationSummary,
  buildUnifiedCompanies,
  toFirestoreCompanies,
} from './utils/dataUnifier';

let hasRunStartupSheetSync = false;

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredAuthUser);
  const [gatewayRole, setGatewayRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [showGuidePreLogin, setShowGuidePreLogin] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<string>('hub');
  const [isMobileMode, setIsMobileMode] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<'student' | 'teacher' | 'admin'>(
    () => getStoredAuthUser()?.role || 'student'
  );

  // Authoritative unified state anchored to Google Sheet + Firebase Firestore
  const [students, setStudents] = useState<Student[]>(() => {
    const sheetStudents = getAllLoginSheetStudents();
    const base = sheetStudents.length > 0 ? sheetStudents : mockStudents;
    return base.map(normalizeStudentAcademicInfo);
  });
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [submissions, setSubmissions] = useState<Record<string, WeeklySubmission[]>>(
    () => mergeSubmissionsWithLocalCache({}, false)
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements);
  const [form3List, setForm3List] = useState<Form3SupervisionRecord[]>(() => getLocalForm3Rows());
  const [courses, setCourses] = useState<CourseDataRow[]>(() => getCachedCourses());
  const [teachers, setTeachers] = useState<SheetTeacher[]>(() => getAllLoginSheetTeachers());
  const [userAvatars, setUserAvatars] = useState<UserAvatarRecord[]>([]);
  const [teachingReports, setTeachingReports] = useState<TeachingReportRecord[]>(() =>
    getLocalTeachingReports()
  );
  const [teachingReportsNotice, setTeachingReportsNotice] = useState<string | null>(null);
  const [focusedTeachingReportTarget, setFocusedTeachingReportTarget] = useState<{
    teacherName: string;
    weekNumber: number;
  } | null>(null);
  const [teachingReportsVisitKey, setTeachingReportsVisitKey] = useState<number>(0);

  const hasCloudSubsRef = React.useRef<boolean>(false);
  const hasCloudForm3Ref = React.useRef<boolean>(false);
  const remoteForm3Ref = React.useRef<Form3SupervisionRecord[]>([]);
  const submissionsRef = React.useRef<Record<string, WeeklySubmission[]>>(submissions);
  submissionsRef.current = submissions;
  const userAvatarsRef = React.useRef<UserAvatarRecord[]>(userAvatars);
  userAvatarsRef.current = userAvatars;

  // Initial active student id based on logged in user or first student from login sheet
  const [activeStudentId, setActiveStudentId] = useState<string>(() => {
    const storedUser = getStoredAuthUser();
    if (storedUser && storedUser.role === 'student') {
      const code = storedUser.studentId || storedUser.email.split('@')[0];
      return `std-${code}`;
    }
    const sheetStudents = getAllLoginSheetStudents();
    return sheetStudents[0]?.id || 'std-68301040165';
  });

  // Modals state
  const [isForm1Open, setIsForm1Open] = useState<boolean>(false);
  const [isForm2Open, setIsForm2Open] = useState<boolean>(false);
  const [isForm3Open, setIsForm3Open] = useState<boolean>(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [isLookerModalOpen, setIsLookerModalOpen] = useState<boolean>(false);
  const [targetStudentForForm3, setTargetStudentForForm3] = useState<string | undefined>(undefined);
  const [selectedLogWeek, setSelectedLogWeek] = useState<number>(() => getCurrentWeekInfo().weekNumber);

  // Target currentStudent strictly matches the logged-in student user from Google Sheet login tab
  const currentStudent = useMemo(() => {
    let target: Student | undefined;
    if (currentUser && currentUser.role === 'student') {
      const code = currentUser.studentId || currentUser.email.split('@')[0];
      target = students.find(
        (s) =>
          s.studentCode === code ||
          s.id === `std-${code}` ||
          s.email.toLowerCase() === currentUser.email.toLowerCase() ||
          s.name === currentUser.name
      );
    }
    if (!target) {
      target = students.find((s) => s.id === activeStudentId) || students[0];
    }
    const normalized = target ? normalizeStudentAcademicInfo(target) : students[0];
    if (normalized) {
      const dbAvatar = resolveUserAvatarUrl(userAvatars, {
        email: normalized.email,
        studentCode: normalized.studentCode,
        name: normalized.name,
      });
      if (dbAvatar && normalized.avatarUrl !== dbAvatar) {
        return { ...normalized, avatarUrl: dbAvatar };
      }
    }
    return normalized;
  }, [students, activeStudentId, currentUser, userAvatars]);

  const currentUserAvatarUrl = useMemo(() => {
    if (!currentUser) return null;
    const fromAvatars = resolveUserAvatarUrl(userAvatars, {
      email: currentUser.email,
      studentCode: currentUser.studentId,
      name: currentUser.name,
    });
    if (fromAvatars) return fromAvatars;

    if (currentUser.role === 'student') {
      return currentStudent?.avatarUrl || null;
    }

    const cleanEmail = (currentUser.email || '').trim().toLowerCase();
    const matchedTeacher = teachers.find(
      (t) =>
        (t.email && t.email.toLowerCase() === cleanEmail) ||
        (currentUser.name && t.name === currentUser.name)
    );
    if (matchedTeacher?.avatarUrl) return matchedTeacher.avatarUrl;

    if (typeof localStorage !== 'undefined' && currentUser.email) {
      return localStorage.getItem(`kktech_teacher_avatar_${currentUser.email}`) || null;
    }
    return null;
  }, [currentUser, userAvatars, currentStudent?.avatarUrl, teachers]);

  // Derived live companies synced identically across Map, A4, Teacher, Admin, Looker, Mobile
  const effectiveCompanies = useMemo(() => {
    const derived = toFirestoreCompanies(buildUnifiedCompanies(students, form3List));
    return derived.length > 0 ? derived : companies;
  }, [students, form3List, companies]);

  // Keep student section in sync with logged-in user from Google Spreadsheet login tab
  useEffect(() => {
    if (currentUser && currentUser.role === 'student') {
      const code = currentUser.studentId || currentUser.email.split('@')[0];
      const studentId = `std-${code}`;
      setActiveStudentId(studentId);

      findStudentInLoginSheet(code, currentUser.name).then((row) => {
        if (row) {
          const freshStudent = normalizeStudentAcademicInfo(convertLoginRowToStudent(row));
          setStudents((prev) => {
            const idx = prev.findIndex(
              (s) => s.studentCode === code || s.id === studentId || s.name === row.name
            );
            if (idx >= 0) {
              const existing = prev[idx] as Student & { lastSyncSource?: string };
              const keepExistingForm1 = existing.lastSyncSource === 'web_portal_form1';
              const updated = [...prev];
              updated[idx] = normalizeStudentAcademicInfo({
                ...freshStudent,
                ...existing,
                companyName: keepExistingForm1
                  ? existing.companyName
                  : freshStudent.companyName || existing.companyName,
                companyRegistration: keepExistingForm1
                  ? existing.companyRegistration
                  : freshStudent.companyRegistration || existing.companyRegistration,
                phone: freshStudent.phone || existing.phone,
                avatarUrl: existing.avatarUrl || freshStudent.avatarUrl,
              });
              return updated;
            } else {
              return [freshStudent, ...prev];
            }
          });
        }
      });
    }
  }, [currentUser]);

  // Initialize and subscribe to Firebase Firestore (project: internship2-2569) & auto-sync Google Sheets on startup
  useEffect(() => {
    // 1. Refresh courses catalog live from Google Sheet 'data' tab
    fetchDataSheetCourses(true)
      .then((crs) => {
        if (crs && crs.length > 0) setCourses(crs);
      })
      .catch(() => {});

    // 2. Apply Google Sheet login accounts into local state
    const applyFreshSheetUsers = () => {
      const freshSheetStudents = getAllLoginSheetStudents().map(normalizeStudentAcademicInfo);
      if (freshSheetStudents.length > 0) {
        setStudents((prev) => {
          const prevById = new Map(prev.map((s) => [s.id, s]));
          return freshSheetStudents.map((fs) => {
            const existing = prevById.get(fs.id) as (Student & { lastSyncSource?: string }) | undefined;
            const keepForm1 = existing?.lastSyncSource === 'web_portal_form1';
            return normalizeStudentAcademicInfo({
              ...fs,
              ...(existing?.avatarUrl ? { avatarUrl: existing.avatarUrl } : {}),
              ...(typeof existing?.accumulatedHours === 'number' && existing.accumulatedHours !== 320
                ? { accumulatedHours: existing.accumulatedHours }
                : {}),
              ...(typeof existing?.actualWeeks === 'number' && existing.actualWeeks !== 8
                ? { actualWeeks: existing.actualWeeks }
                : {}),
              companyName: keepForm1 && existing ? existing.companyName : fs.companyName,
              companyRegistration:
                keepForm1 && existing?.companyRegistration ? existing.companyRegistration : fs.companyRegistration,
              ...(keepForm1 && existing?.room ? { room: existing.room } : {}),
              ...(keepForm1 && existing?.lastSyncSource ? { lastSyncSource: existing.lastSyncSource } : {}),
            });
          });
        });
      }
      const freshTeachers = getAllLoginSheetTeachers();
      if (freshTeachers.length > 0) {
        setTeachers((prev) => {
          const prevByEmail = new Map(prev.map((t) => [t.email.toLowerCase(), t]));
          return freshTeachers.map((ft) => ({
            ...ft,
            avatarUrl: prevByEmail.get(ft.email.toLowerCase())?.avatarUrl || ft.avatarUrl,
          }));
        });
      }
    };

    fetchSheetLoginAccounts(false)
      .then(() => applyFreshSheetUsers())
      .catch(() => {});

    // 3. Automatically sync Google Sheet (login + data tabs) -> Firebase Firestore on web open
    if (!hasRunStartupSheetSync) {
      hasRunStartupSheetSync = true;
      syncAllLoginSheetRowsToFirebase()
        .then((summary) => {
          applyFreshSheetUsers();
          const freshCourses = getCachedCourses();
          if (freshCourses && freshCourses.length > 0) {
            setCourses(freshCourses);
          }
          if (!summary.success && summary.message) {
            console.warn('Startup Google Sheet -> Firestore sync note:', summary.message);
          }
        })
        .catch((err) => {
          console.warn(
            'Startup Google Sheet -> Firestore sync note:',
            formatThaiErrorMessage(err, 'ไม่สามารถซิงค์ข้อมูลอัตโนมัติในขณะนี้')
          );
        });
    }

    // 4. Real-time subscription to Students collection anchored strictly to current Google Sheet students
    const unsubStudents = subscribeStudents(
      (remoteStudents) => {
        if (remoteStudents && remoteStudents.length > 0) {
          const sheetBase = getAllLoginSheetStudents();
          const mergedMap = new Map<string, Student>();
          sheetBase.forEach((s) => mergedMap.set(s.id, normalizeStudentAcademicInfo(s)));
          remoteStudents.forEach((rs) => {
            if (!rs || (!mergedMap.has(rs.id) && !rs.studentCode)) return;
            const localCachedAvatar =
              (typeof localStorage !== 'undefined' &&
                (localStorage.getItem(`kktech_avatar_${rs.id}`) ||
                  localStorage.getItem(`kktech_avatar_std-${rs.studentCode}`))) ||
              undefined;
            const prev = mergedMap.get(rs.id);
            const fromUserAvatars = resolveUserAvatarUrl(userAvatarsRef.current, {
              email: prev?.email || rs.email,
              studentCode: prev?.studentCode || rs.studentCode,
              name: rs.name || prev?.name,
            });
            mergedMap.set(
              rs.id,
              normalizeStudentAcademicInfo({
                ...(prev || {}),
                ...rs,
                email: prev?.email || rs.email || '',
                studentCode: prev?.studentCode || rs.studentCode || '',
                phone: rs.phone || prev?.phone,
                avatarUrl: fromUserAvatars || rs.avatarUrl || prev?.avatarUrl || localCachedAvatar,
              } as Student)
            );
          });
          setStudents(Array.from(mergedMap.values()));
        }
      },
      (err) => console.warn('Students firestore stream note:', err)
    );

    // 5. Real-time subscription to Companies collection
    const unsubCompanies = subscribeCompanies(
      (remoteCompanies) => {
        if (remoteCompanies && remoteCompanies.length > 0) {
          setCompanies(remoteCompanies);
        }
      },
      (err) => console.warn('Companies firestore stream note:', err)
    );

    // 6. Real-time subscription to Courses collection
    const unsubCourses = subscribeCourses(
      (remoteCourses) => {
        if (remoteCourses && remoteCourses.length > 0) {
          setCourses(remoteCourses);
        }
      },
      (err) => console.warn('Courses firestore stream note:', err)
    );

    // 7. Real-time subscription to Teachers collection (preserves uploaded avatars across devices)
    const unsubTeachers = subscribeTeachers(
      (remoteTeachers) => {
        const sheetTeachers = getAllLoginSheetTeachers();
        if (remoteTeachers && remoteTeachers.length > 0) {
          const remoteByEmail = new Map(
            remoteTeachers.map((rt) => [(rt.email || '').toLowerCase(), rt])
          );
          const remoteById = new Map(remoteTeachers.map((rt) => [rt.id, rt]));
          const merged = sheetTeachers.map((st) => {
            const rt = remoteById.get(st.id) || remoteByEmail.get(st.email.toLowerCase());
            const fromUserAvatars = resolveUserAvatarUrl(userAvatarsRef.current, {
              email: rt?.email || st.email,
              name: rt?.name || st.name,
            });
            return rt
              ? {
                  ...st,
                  ...rt,
                  ...(fromUserAvatars ? { avatarUrl: fromUserAvatars } : {}),
                  rooms: st.rooms?.length ? st.rooms : rt.rooms,
                  subjects: st.subjects?.length ? st.subjects : rt.subjects,
                }
              : {
                  ...st,
                  ...(fromUserAvatars ? { avatarUrl: fromUserAvatars } : {}),
                };
          });
          setTeachers(merged);
        }
      },
      (err) => console.warn('Teachers firestore stream note:', err)
    );

    // 7b. Real-time subscription to dedicated User Avatars database (/user_avatars)
    const unsubUserAvatars = subscribeUserAvatars(
      (avatars) => {
        const list = avatars || [];
        userAvatarsRef.current = list;
        setUserAvatars(list);
        if (list.length > 0) {
          setStudents((prev) =>
            prev.map((s) => {
              const av = resolveUserAvatarUrl(list, {
                email: s.email,
                studentCode: s.studentCode,
                name: s.name,
              });
              return av && av !== s.avatarUrl ? { ...s, avatarUrl: av } : s;
            })
          );
          setTeachers((prev) =>
            prev.map((t) => {
              const av = resolveUserAvatarUrl(list, {
                email: t.email,
                name: t.name,
              });
              return av && av !== t.avatarUrl ? { ...t, avatarUrl: av } : t;
            })
          );
        }
      },
      (err) => console.warn('User avatars firestore stream note:', err)
    );

    // 8. Real-time authoritative subscription to Weekly Submissions collection
    const unsubSubmissions = subscribeSubmissions(
      (remoteSubs) => {
        hasCloudSubsRef.current = true;
        setSubmissions(reconcileSubmissionsWithCloud(remoteSubs || []));
      },
      (err) => console.warn('Submissions firestore stream note:', err)
    );

    const handleSubLocalUpdate = () => {
      setSubmissions((prev) => mergeSubmissionsWithLocalCache(prev, hasCloudSubsRef.current));
    };
    window.addEventListener('kktech_submissions_updated', handleSubLocalUpdate);

    // 9. Real-time subscription to Announcements collection
    const unsubAnnouncements = subscribeAnnouncements(
      (remoteAnnouncements) => {
        if (remoteAnnouncements && remoteAnnouncements.length > 0) {
          setAnnouncements(remoteAnnouncements);
        }
      },
      (err) => console.warn('Announcements firestore stream note:', err)
    );

    // 10. Real-time authoritative subscription to Form 3 Supervisions
    const unsubForm3 = subscribeForm3Supervisions(
      (remoteRecords) => {
        hasCloudForm3Ref.current = true;
        const recs = remoteRecords || [];
        remoteForm3Ref.current = recs;
        setForm3List(reconcileForm3WithCloud(recs));
      },
      (err) => console.warn('Form 3 supervision stream note:', err)
    );

    const handleForm3LocalSync = () => {
      if (hasCloudForm3Ref.current) {
        setForm3List(reconcileForm3WithCloud(remoteForm3Ref.current));
      } else {
        setForm3List(getLocalForm3Rows());
      }
    };
    window.addEventListener('kktech_form3_updated', handleForm3LocalSync);

    // 11. Single authoritative real-time subscription to Workplace Teaching Reports (/teaching_reports)
    const unsubTeachingReports = subscribeTeachingReports(
      (remoteReports) => {
        const merged = reconcileTeachingReportsWithCloud(remoteReports || []);
        setTeachingReports(merged);
        setTeachingReportsNotice(null);
      },
      (err) => {
        console.warn('Teaching reports stream note:', err);
        setTeachingReportsNotice(
          formatThaiErrorMessage(
            err,
            'ไม่สามารถเชื่อมต่อฐานข้อมูลรายงานการสอนได้ในขณะนี้'
          )
        );
      }
    );

    return () => {
      unsubStudents();
      unsubCompanies();
      unsubCourses();
      unsubTeachers();
      unsubUserAvatars();
      unsubSubmissions();
      unsubAnnouncements();
      unsubForm3();
      unsubTeachingReports();
      window.removeEventListener('kktech_submissions_updated', handleSubLocalUpdate);
      window.removeEventListener('kktech_form3_updated', handleForm3LocalSync);
    };
  }, []);

  const handleTeachingReportSaved = (saved: TeachingReportRecord) => {
    setTeachingReports((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
    setFocusedTeachingReportTarget({
      teacherName: saved.reporterName,
      weekNumber: Number(saved.weekNumber),
    });
  };

  // Helper: sync a student's actualWeeks & accumulatedHours from authoritative submissions + Form 3
  const syncStudentLiveStats = (targetStudent: Student, nextSubsMap: Record<string, WeeklySubmission[]>) => {
    const summary = getStudentEvaluationSummary(targetStudent, nextSubsMap, form3List);
    if (
      summary.effectiveActualWeeks !== targetStudent.actualWeeks ||
      summary.effectiveAccumulatedHours !== targetStudent.accumulatedHours
    ) {
      const updatedStudent: Student = {
        ...targetStudent,
        actualWeeks: summary.effectiveActualWeeks,
        accumulatedHours: summary.effectiveAccumulatedHours,
      };
      setStudents((prev) => prev.map((s) => (s.id === targetStudent.id ? updatedStudent : s)));
      saveStudentToFirestore(updatedStudent).catch((e) =>
        console.warn('Firestore student stats sync note:', e)
      );
    }
  };

  // Single authoritative Form #1 save handler (writes once to Firestore, Sheet, and derived /companies)
  const handleSaveCompanyInfo = async (
    updatedInfo: Partial<Student['companyRegistration']> & { companyName?: string; room?: string }
  ): Promise<{ success: boolean; sheetResult: string; firestoreResult: string }> => {
    const { room: newRoom, companyName: newCompanyName, ...regUpdates } = updatedInfo;
    const updatedStudent = normalizeStudentAcademicInfo({
      ...currentStudent,
      room: newRoom || currentStudent.room,
      companyName: newCompanyName || currentStudent.companyName,
      lastSyncSource: 'web_portal_form1',
      companyRegistration: {
        ...currentStudent.companyRegistration,
        ...regUpdates,
      },
    } as Student);

    const nextStudents = students.some((s) => s.id === updatedStudent.id)
      ? students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
      : [updatedStudent, ...students];
    setStudents(nextStudents);

    let syncResult = {
      success: false,
      sheetResult: '',
      firestoreResult: '',
    };

    try {
      const token = getCachedAccessToken();
      syncResult = await saveAndSyncStudentBothWays(updatedStudent, token);

      if (syncResult.success) {
        await syncDerivedCompaniesToFirestore(nextStudents, form3List);
      }

      if (syncResult.success) {
        appendForm1ToGoogleSheet(
          {
            timestamp: new Date().toLocaleString('th-TH'),
            studentCode: updatedStudent.studentCode,
            studentName: updatedStudent.name,
            level: `${updatedStudent.level} ${updatedStudent.department}`,
            companyName: updatedStudent.companyName,
            department: updatedStudent.companyRegistration.department,
            mentorName: updatedStudent.companyRegistration.mentorName,
            mentorPhone: updatedStudent.companyRegistration.mentorPhone,
            emergencyPhone: updatedStudent.companyRegistration.emergencyPhone,
            gpsCoordinates: updatedStudent.companyRegistration.gpsCoordinates,
            notes: updatedStudent.companyRegistration.notes || '',
            status: 'บันทึกสำเร็จ',
          },
          token
        ).catch((sheetErr) => console.warn('Form 1 sheet append note:', sheetErr));
      }
    } catch (syncErr) {
      console.warn('Unified database sync note:', syncErr);
      syncResult = {
        success: false,
        sheetResult: syncResult.sheetResult || '',
        firestoreResult: formatThaiErrorMessage(
          syncErr,
          'ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลออนไลน์ได้ กรุณาลองใหม่อีกครั้ง'
        ),
      };
    }

    return syncResult;
  };

  // Callback to update student avatar photo (persists to /user_avatars + /students)
  const handleUpdateStudentAvatar = async (dataUrl: string) => {
    setStudents((prev) => prev.map((s) => (s.id === currentStudent.id ? { ...s, avatarUrl: dataUrl } : s)));

    try {
      localStorage.setItem(`kktech_avatar_${currentStudent.id}`, dataUrl);
      localStorage.setItem(`kktech_avatar_std-${currentStudent.studentCode}`, dataUrl);
    } catch (e) {
      console.warn('LocalStorage avatar cache note:', e);
    }

    try {
      const studentEmail = currentStudent.email || `s${currentStudent.studentCode}@kktech.ac.th`;
      await saveUserAvatarToFirestore({
        email: studentEmail,
        name: currentStudent.name,
        role: 'student',
        studentCode: currentStudent.studentCode,
        avatarUrl: dataUrl,
        studentDocId: currentStudent.id,
      });
    } catch (err) {
      console.error('Firestore student avatar save failed:', err);
      throw err;
    }
  };

  // Callback to update teacher/admin avatar photo (persists to /user_avatars + /teachers)
  const handleUpdateTeacherAvatar = async (dataUrl: string) => {
    const email = currentUser?.email || 'thaksinso@kktech.ac.th';
    const name = currentUser?.name || email;
    const role = currentUser?.role === 'admin' ? 'admin' : 'teacher';
    const cleanUserId = email.replace(/[^a-zA-Z0-9_-]/g, '_');
    const matchedTeacher = teachers.find(
      (t) =>
        (t.email && t.email.toLowerCase() === email.toLowerCase()) ||
        (name && t.name === name)
    );
    const teacherDocId = matchedTeacher?.id || `tch-${cleanUserId}`;

    setTeachers((prev) =>
      prev.map((t) =>
        t.id === teacherDocId || t.email.toLowerCase() === email.toLowerCase()
          ? { ...t, avatarUrl: dataUrl }
          : t
      )
    );

    try {
      localStorage.setItem(`kktech_teacher_avatar_${email}`, dataUrl);
    } catch (e) {
      console.warn('LocalStorage teacher avatar cache note:', e);
    }

    try {
      await saveUserAvatarToFirestore({
        email,
        name,
        role,
        avatarUrl: dataUrl,
        teacherDocId,
      });
    } catch (err) {
      console.error('Firestore teacher avatar save failed:', err);
      throw err;
    }
  };

  // Callback to submit Form #2 weekly report (unified deterministic doc ID matching WeeklyLogReportView)
  const handleSubmitWeeklyReport = async (submissionData: Partial<WeeklySubmission>) => {
    const weekNum = submissionData.weekNumber || 8;
    const weekMeta = WEEKS_1_TO_18.find((w) => w.weekNumber === weekNum);
    const existingForWeek = getMergedStudentSubmissions(currentStudent, submissions).find(
      (s) => s.weekNumber === weekNum
    );
    const isAlreadyGraded = existingForWeek?.status === 'graded';
    const computedHours = computeSubmissionTotalHours(submissionData);

    const newSub: WeeklySubmission = {
      id: `sub-${currentStudent.id}-w${weekNum}`,
      studentId: currentStudent.id,
      weekNumber: weekNum,
      dateRange: submissionData.dateRange || weekMeta?.dateRange || '10 มิ.ย. 2569 - 14 มิ.ย. 2569',
      submittedAt: submissionData.submittedAt || new Date().toLocaleString('th-TH'),
      status: isAlreadyGraded ? 'graded' : 'pending',
      taskTitle: submissionData.taskTitle || weekMeta?.defaultTask || 'งานติดตั้งตู้ Distribution Board (MDB)',
      dailyLogs: submissionData.dailyLogs || [],
      photos: submissionData.photos || [],
      totalHours: computedHours,
      mentorRating: existingForWeek?.mentorRating || 5.0,
      mentorComment: existingForWeek?.mentorComment || 'นักศึกษาตั้งใจทำงาน ปฏิบัติตามมาตรฐานวิศวกรรมไฟฟ้า',
      mentorName: currentStudent.companyRegistration.mentorName,
      mentorPosition: 'วิศวกรไฟฟ้า / พี่เลี้ยง',
      teacherScore: isAlreadyGraded ? existingForWeek?.teacherScore ?? 0 : 0,
      teacherGrade: isAlreadyGraded ? existingForWeek?.teacherGrade ?? '' : '',
      ...(isAlreadyGraded && existingForWeek?.teacherComment
        ? { teacherComment: existingForWeek.teacherComment }
        : {}),
      teacherName: currentStudent.supervisorTeacher,
      studentSignature: currentStudent.name.replace(/^(นาย|นางสาว)\s*/, ''),
      mentorSignature: (currentStudent.companyRegistration.mentorName || 'ชาญชัย มงคลศรี').replace(
        /^(นาย|นางสาว|นาง|ช่าง)\s*/,
        ''
      ),
      teacherSignature: (currentStudent.supervisorTeacher || 'ทักษิณ โสภาปิยะ').replace(
        /^(นาย|นางสาว|นาง|อาจารย์|ว่าที่ร้อยตรี|ดร\.)\s*/,
        ''
      ),
      verifiedHash: `7B8C${currentStudent.studentCode}-KKTECH-2569-W${String(weekNum).padStart(2, '0')}-OK`,
      safetyChecklist: submissionData.safetyChecklist || {
        hardHat: true,
        highVoltageGloves: true,
        safetyShoes: true,
        lotoProcedure: true,
      },
    };

    setSelectedLogWeek(weekNum);
    writeSubmissionToLocalCache(newSub, currentStudent);

    const nextSubsMap: Record<string, WeeklySubmission[]> = {
      ...submissions,
      [currentStudent.id]: [
        newSub,
        ...(submissions[currentStudent.id] || []).filter((s) => s.weekNumber !== newSub.weekNumber),
      ],
    };
    setSubmissions(nextSubsMap);
    syncStudentLiveStats(currentStudent, nextSubsMap);

    // Persist submission immediately to Firebase Firestore (internship2-2569)
    try {
      await saveSubmissionToFirestore(newSub);
      markSubmissionSyncedToCloud(newSub.id);
    } catch (e) {
      console.error('Error saving submission to Firestore:', e);
      throw e;
    }
  };

  // Callback to save Form #3 evaluation (single or multiple students)
  const handleSaveEvaluation = async (evalData: {
    studentId?: string;
    studentIds?: string[];
    score: number;
    grade: string;
    comment: string;
    mentorFeedback: string;
    safetyPassed: boolean;
    visitDate?: string;
    record?: Form3SupervisionRecord;
    records?: Form3SupervisionRecord[];
  }) => {
    const incomingRecords: Form3SupervisionRecord[] =
      evalData.records && evalData.records.length > 0
        ? evalData.records
        : evalData.record
        ? [evalData.record]
        : [];

    let nextForm3List = form3List;
    if (incomingRecords.length > 0) {
      const mergedMap = new Map<string, Form3SupervisionRecord>();
      form3List.forEach((r) => {
        if (r && r.id) mergedMap.set(r.id, r);
      });
      incomingRecords.forEach((r) => {
        if (r && r.id) mergedMap.set(r.id, r);
      });
      nextForm3List = Array.from(mergedMap.values()).sort((a, b) => {
        const tA = new Date(a.timestamp || a.visitDate).getTime() || 0;
        const tB = new Date(b.timestamp || b.visitDate).getTime() || 0;
        return tB - tA;
      });
      setForm3List(nextForm3List);
      saveLocalForm3Rows(nextForm3List);
      syncDerivedCompaniesToFirestore(students, nextForm3List).catch((err) =>
        console.warn('Derived companies sync note:', err)
      );
    }

    const idsToUpdate =
      evalData.studentIds && evalData.studentIds.length > 0
        ? evalData.studentIds
        : evalData.studentId
        ? [evalData.studentId]
        : [];

    if (idsToUpdate.length === 0) return;

    const modifiedSubs: WeeklySubmission[] = [];
    const nextSubs: Record<string, WeeklySubmission[]> = { ...submissionsRef.current };

    for (const sId of idsToUpdate) {
      const matchedStudent =
        students.find((s) => s.id === sId || s.studentCode === sId || getCandidateStudentKeys(s).includes(sId)) ||
        ({ id: sId, studentCode: sId.replace(/^std-/, '') } as Pick<Student, 'id' | 'studentCode'>);

      const mergedSubs = getMergedStudentSubmissions(matchedStudent, nextSubs);
      if (mergedSubs.length === 0) continue;

      const latestWeek = Math.max(...mergedSubs.map((s) => Number(s.weekNumber) || 0));
      const targetSub = mergedSubs.find((s) => s.weekNumber === latestWeek);
      if (!targetSub) continue;

      const modSub: WeeklySubmission = {
        ...targetSub,
        status: 'graded' as const,
        teacherScore: evalData.score,
        teacherGrade: evalData.grade,
        teacherComment: evalData.comment,
        mentorComment: evalData.mentorFeedback,
      };
      modifiedSubs.push(modSub);
      writeSubmissionToLocalCache(modSub, matchedStudent);

      const keys = getCandidateStudentKeys(matchedStudent);
      let placed = false;
      for (const k of keys) {
        if (nextSubs[k]) {
          nextSubs[k] = nextSubs[k].map((sub) =>
            sub.id === modSub.id || sub.weekNumber === latestWeek ? modSub : sub
          );
          placed = true;
        }
      }
      if (!placed) {
        const primaryKey = 'id' in matchedStudent && matchedStudent.id ? matchedStudent.id : sId;
        nextSubs[primaryKey] = [modSub];
      }
    }

    if (modifiedSubs.length > 0) {
      submissionsRef.current = nextSubs;
      setSubmissions(nextSubs);

      // Persist all updated evaluations atomically and immediately to Firebase Firestore
      await saveSubmissionsBatchToFirestore(modifiedSubs);
      modifiedSubs.forEach((sub) => markSubmissionSyncedToCloud(sub.id));

      for (const sId of idsToUpdate) {
        const st = students.find(
          (s) => s.id === sId || s.studentCode === sId || getCandidateStudentKeys(s).includes(sId)
        );
        if (st) {
          syncStudentLiveStats(st, nextSubs);
        }
      }
    }
  };

  // Callback for Admin/Student to delete a student's weekly submission
  const handleDeleteSubmission = async (submissionId: string, studentId: string): Promise<boolean> => {
    try {
      await deleteSubmissionFromFirestore(submissionId);
      const keys = new Set(getCandidateStudentKeys(studentId));
      let targetWeek: number | undefined;
      Object.values(submissions)
        .flat()
        .forEach((s) => {
          if (s.id === submissionId) targetWeek = s.weekNumber;
        });

      removeSubmissionFromLocalCache(studentId, targetWeek ?? -1, submissionId);

      const next: Record<string, WeeklySubmission[]> = {};
      for (const [k, arr] of Object.entries(submissions)) {
        if (keys.has(k) || arr.some((s) => s.id === submissionId)) {
          next[k] = arr.filter((s) => s.id !== submissionId);
        } else {
          next[k] = arr;
        }
      }
      setSubmissions(next);

      const targetStudent = students.find(
        (s) => s.id === studentId || getCandidateStudentKeys(s).includes(studentId)
      );
      if (targetStudent) {
        syncStudentLiveStats(targetStudent, next);
      }

      return true;
    } catch (err) {
      console.error('Error deleting submission from Firestore:', err);
      throw err;
    }
  };

  // Callback for Admin to delete a teacher's supervision record
  const handleDeleteSupervision = async (recordId: string): Promise<boolean> => {
    try {
      await deleteForm3SupervisionFromFirestore(recordId);
      deleteLocalForm3Row(recordId);
      const nextForm3List = form3List.filter((r) => r.id !== recordId);
      setForm3List(nextForm3List);
      syncDerivedCompaniesToFirestore(students, nextForm3List).catch(() => {});
      return true;
    } catch (err) {
      console.error('Error deleting supervision from Firestore:', err);
      throw err;
    }
  };

  const handleLoginSuccess = async (user: AuthUser) => {
    const effectiveRole = gatewayRole === 'teacher' && user.role === 'admin' ? 'teacher' : user.role;
    const effectiveUser = { ...user, role: effectiveRole };
    saveAuthUser(effectiveUser);
    setCurrentUser(effectiveUser);
    setCurrentRole(effectiveUser.role);

    if (effectiveUser.role === 'student') {
      const code = effectiveUser.studentId || effectiveUser.email.split('@')[0];
      const newStudentId = `std-${code}`;
      setActiveStudentId(newStudentId);

      try {
        const row = await findStudentInLoginSheet(code, effectiveUser.name);
        if (row) {
          const studentFromSheet = normalizeStudentAcademicInfo(convertLoginRowToStudent(row));
          setStudents((prev) => {
            const idx = prev.findIndex(
              (s) => s.studentCode === code || s.id === newStudentId || s.name === effectiveUser.name
            );
            if (idx >= 0) {
              const existing = prev[idx] as Student & { lastSyncSource?: string };
              const keepExistingForm1 = existing.lastSyncSource === 'web_portal_form1';
              const updated = [...prev];
              updated[idx] = normalizeStudentAcademicInfo({
                ...studentFromSheet,
                ...existing,
                companyName: keepExistingForm1
                  ? existing.companyName
                  : studentFromSheet.companyName || existing.companyName,
                companyRegistration: keepExistingForm1
                  ? existing.companyRegistration
                  : studentFromSheet.companyRegistration || existing.companyRegistration,
                avatarUrl: existing.avatarUrl || studentFromSheet.avatarUrl,
              });
              return updated;
            }
            return [studentFromSheet, ...prev];
          });
        }
      } catch (err) {
        console.warn('Error syncing student row from login sheet:', err);
      }

      setCurrentView('student');
    } else if (effectiveUser.role === 'teacher') {
      setCurrentView('teacher');
    } else {
      setCurrentView('hub');
    }
    setIsAuthModalOpen(false);
  };

  // Keep currentRole aligned with currentUser account role
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== 'admin' && currentRole !== currentUser.role) {
      setCurrentRole(currentUser.role);
    }
  }, [currentUser, currentRole]);

  // Verify restored user account against live Google Sheet login tab on startup
  useEffect(() => {
    const stored = getStoredAuthUser();
    if (!stored) return;
    let cancelled = false;
    fetchSheetLoginAccounts(true)
      .then((accounts) => {
        if (cancelled || !accounts || accounts.length === 0) return;
        const cleanEmail = stored.email.trim().toLowerCase();
        const emailPrefix = cleanEmail.split('@')[0];
        const emailDigits = extractStudentCode(emailPrefix).toLowerCase();
        const matched = accounts.find((acc) => {
          const accUser = acc.user.trim().toLowerCase();
          const accPrefix = accUser.split('@')[0];
          const accDigits = extractStudentCode(accPrefix).toLowerCase();
          return (
            accUser === cleanEmail ||
            accPrefix === emailPrefix ||
            (emailDigits.length >= 8 && accDigits === emailDigits)
          );
        });
        if (!matched) {
          saveAuthUser(null);
          setCurrentUser(null);
          setCurrentRole('student');
          return;
        }
        const sheetRole = mapStatusToRole(matched.status);
        const sheetEmail = matched.user.includes('@') ? matched.user.trim() : `${matched.user.trim()}@kktech.ac.th`;
        const sheetStudentId = sheetRole === 'student' ? extractStudentCode(matched.user) : undefined;
        if (
          sheetRole !== stored.role ||
          (matched.name && matched.name !== stored.name) ||
          sheetEmail.toLowerCase() !== cleanEmail ||
          sheetStudentId !== stored.studentId
        ) {
          const refreshedUser: AuthUser = {
            ...stored,
            email: sheetEmail,
            role: sheetRole,
            name: matched.name || stored.name,
            studentId: sheetStudentId,
          };
          saveAuthUser(refreshedUser);
          setCurrentUser(refreshedUser);
          setCurrentRole(sheetRole);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Guard views based on user's active role
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    if (role === 'student') {
      const allowedStudentViews = ['hub', 'student', 'weekly-log', 'a4', 'guide'];
      if (!allowedStudentViews.includes(currentView)) {
        setCurrentView('student');
      }
    } else if (role === 'teacher') {
      const allowedTeacherViews = ['hub', 'teacher', 'map', 'a4', 'teaching-reports', 'guide'];
      if (!allowedTeacherViews.includes(currentView)) {
        setCurrentView('teacher');
      }
    }
  }, [currentUser, currentView]);

  const currentStudentSubmissions = useMemo(
    () => getMergedStudentSubmissions(currentStudent, submissions),
    [currentStudent, submissions]
  );

  const handleSignOut = () => {
    signOutKktechUser();
    setCurrentUser(null);
    setCurrentRole('student');
  };

  if (!currentUser && showGuidePreLogin) {
    return (
      <div className="min-h-screen bg-[#edf2f7] p-4 sm:p-6 lg:p-8 print:min-h-0 print:p-0 print:bg-white">
        <StudentGuideView
          onNavigate={(view) => {
            if (view === 'hub') setShowGuidePreLogin(false);
            else {
              setShowGuidePreLogin(false);
              setCurrentView(view);
            }
          }}
          currentUser={currentUser}
        />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginGatewayView
          onSelectRole={(role) => {
            setGatewayRole(role);
            setIsAuthModalOpen(true);
          }}
          onDirectLogin={(user) => {
            handleLoginSuccess(user);
          }}
          onOpenGuide={() => setShowGuidePreLogin(true)}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
          initialRole={gatewayRole}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Prompt',sans-serif] text-slate-800 antialiased selection:bg-sky-500 selection:text-white print:block print:min-h-0 print:bg-white">
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          setIsMobileMode(false);
          if (view === 'teaching-reports') {
            setTeachingReportsVisitKey((k) => k + 1);
          }
          setCurrentView(view);
        }}
        isMobileMode={isMobileMode}
        onToggleMobileMode={() => setIsMobileMode(!isMobileMode)}
        currentRole={currentRole}
        onChangeRole={(role) => setCurrentRole(role)}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        onOpenLookerModal={() => setIsLookerModalOpen(true)}
        currentUser={currentUser}
        userAvatarUrl={currentUserAvatarUrl}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex flex-col">
        {isMobileMode ? (
          <div className="max-w-7xl mx-auto w-full px-4 py-6">
            <MobileSimView
              currentRole={currentRole === 'student' ? 'student' : 'teacher'}
              onChangeRole={(role) => setCurrentRole(role)}
              currentUser={currentUser}
              student={currentStudent}
              students={students}
              companies={effectiveCompanies}
              submissions={submissions}
              form3List={form3List}
              courses={courses}
              teachers={teachers}
              userAvatars={userAvatars}
              onOpenForm1={() => setIsForm1Open(true)}
              onOpenForm2={() => setIsForm2Open(true)}
              onOpenForm3={(stdId) => {
                setTargetStudentForForm3(stdId);
                setIsForm3Open(true);
              }}
              onNavigateA4={(stdId) => {
                if (stdId) setActiveStudentId(stdId);
                setIsMobileMode(false);
                setCurrentView('a4');
              }}
              onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
              onOpenLookerModal={() => setIsLookerModalOpen(true)}
              onNavigateGuide={() => {
                setIsMobileMode(false);
                setCurrentView('guide');
              }}
            />
          </div>
        ) : currentView === 'hub' ? (
          <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
            <HubView
              onNavigate={(view) => setCurrentView(view)}
              onOpenForm1={() => setIsForm1Open(true)}
              onOpenForm2={() => setIsForm2Open(true)}
              onOpenForm3={() => {
                setTargetStudentForForm3(undefined);
                setIsForm3Open(true);
              }}
              onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
              onOpenLookerModal={() => setIsLookerModalOpen(true)}
              announcements={announcements}
              student={currentStudent}
              students={students}
              companies={effectiveCompanies}
              submissions={submissions}
              form3List={form3List}
              courses={courses}
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onUpdateAvatar={handleUpdateStudentAvatar}
            />
          </main>
        ) : (
          <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 print:max-w-none print:p-0">
            {currentView === 'student' && (
              <StudentView
                student={currentStudent}
                submissions={currentStudentSubmissions}
                form3List={form3List}
                onOpenForm1={() => setIsForm1Open(true)}
                onOpenForm2={() => setIsForm2Open(true)}
                onNavigateA4={(weekNum) => {
                  if (typeof weekNum === 'number') setSelectedLogWeek(weekNum);
                  setCurrentView('a4');
                }}
                onNavigateWeeklyLog={(w) => {
                  if (w) setSelectedLogWeek(w);
                  setCurrentView('weekly-log');
                }}
                onNavigateGuide={() => setCurrentView('guide')}
                onUpdateAvatar={handleUpdateStudentAvatar}
              />
            )}

            {currentView === 'weekly-log' && (
              <WeeklyLogReportView
                student={currentStudent}
                submissions={currentStudentSubmissions}
                initialWeek={selectedLogWeek}
                currentUser={currentUser}
                onNavigateA4={(weekNum) => {
                  if (weekNum) setSelectedLogWeek(weekNum);
                  setCurrentView('a4');
                }}
                onSubmissionUpdated={(newSub) => {
                  setSelectedLogWeek(newSub.weekNumber);
                  const nextSubsMap: Record<string, WeeklySubmission[]> = {
                    ...submissionsRef.current,
                    [currentStudent.id]: [
                      newSub,
                      ...(submissionsRef.current[currentStudent.id] || []).filter(
                        (s) => s.weekNumber !== newSub.weekNumber
                      ),
                    ],
                  };
                  submissionsRef.current = nextSubsMap;
                  setSubmissions(nextSubsMap);
                  syncStudentLiveStats(currentStudent, nextSubsMap);
                }}
                onDeleteSubmission={(subId) => handleDeleteSubmission(subId, currentStudent.id)}
              />
            )}

            {currentView === 'teacher' && (
              <TeacherView
                students={students}
                companies={effectiveCompanies}
                submissions={submissions}
                form3List={form3List}
                courses={courses}
                teachers={teachers}
                userAvatars={userAvatars}
                currentUser={currentUser}
                onUpdateTeacherAvatar={handleUpdateTeacherAvatar}
                onOpenForm3={(stdId) => {
                  setTargetStudentForForm3(stdId);
                  setIsForm3Open(true);
                }}
                onNavigateA4={(stdId) => {
                  if (stdId) setActiveStudentId(stdId);
                  setCurrentView('a4');
                }}
                onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
                onOpenLookerModal={() => setIsLookerModalOpen(true)}
              />
            )}

            {currentView === 'map' && (
              <CompanyMapView
                companies={effectiveCompanies}
                students={students}
                form3List={form3List}
                onOpenForm1={() => setIsForm1Open(true)}
                onOpenForm3={(stdId) => {
                  setTargetStudentForForm3(stdId);
                  setIsForm3Open(true);
                }}
              />
            )}

            {currentView === 'a4' && (
              <A4ReportView
                students={students}
                submissions={submissions}
                companies={effectiveCompanies}
                form3List={form3List}
                courses={courses}
                initialStudentId={activeStudentId}
                initialWeek={selectedLogWeek}
                currentUser={currentUser}
                onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
                onOpenLookerModal={() => setIsLookerModalOpen(true)}
                onOpenForm3={(stdId) => {
                  setTargetStudentForForm3(stdId);
                  setIsForm3Open(true);
                }}
                onSelectStudent={(stdId) => {
                  setActiveStudentId(stdId);
                }}
                onDeleteSubmission={handleDeleteSubmission}
                onDeleteSupervision={handleDeleteSupervision}
              />
            )}

            {currentView === 'teaching-reports' && (
              <WeeklyTeachingReportsView
                key={`tr-visit-${teachingReportsVisitKey}`}
                currentUser={currentUser}
                students={students}
                form3List={form3List}
                submissions={submissions}
                courses={courses}
                teachers={teachers}
                userAvatars={userAvatars}
                onUpdateTeacherAvatar={handleUpdateTeacherAvatar}
                teachingReports={teachingReports}
                cloudLoadError={teachingReportsNotice}
                initialTeacherFilter={focusedTeachingReportTarget?.teacherName}
                initialHighlightWeek={focusedTeachingReportTarget?.weekNumber}
                onTeachingReportSaved={handleTeachingReportSaved}
              />
            )}

            {currentView === 'admin' && (
              <AdminView
                students={students}
                companies={effectiveCompanies}
                submissions={submissions}
                form3List={form3List}
                courses={courses}
                teachers={teachers}
                onDeleteSubmission={handleDeleteSubmission}
                onDeleteSupervision={handleDeleteSupervision}
                onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
                onOpenLookerModal={() => setIsLookerModalOpen(true)}
              />
            )}

            {currentView === 'guide' && (
              <StudentGuideView onNavigate={(view) => setCurrentView(view)} currentUser={currentUser} />
            )}
          </main>
        )}
      </div>

      <Footer />

      <Form1CompanyModal
        isOpen={isForm1Open}
        onClose={() => setIsForm1Open(false)}
        student={currentStudent}
        onSave={handleSaveCompanyInfo}
      />

      <Form2WeeklyReportModal
        isOpen={isForm2Open}
        onClose={() => setIsForm2Open(false)}
        student={currentStudent}
        currentWeek={currentStudent.currentWeek}
        submissions={currentStudentSubmissions}
        onSubmit={handleSubmitWeeklyReport}
        onNavigateA4={(weekNum) => {
          setSelectedLogWeek(weekNum);
          setIsMobileMode(false);
          setCurrentView('a4');
        }}
      />

      <Form3SupervisionModal
        isOpen={isForm3Open}
        onClose={() => setIsForm3Open(false)}
        students={students}
        companies={effectiveCompanies}
        teachers={teachers}
        selectedStudentId={targetStudentForForm3}
        teacherName={currentUser?.name}
        teacherEmail={currentUser?.email}
        onSaveEvaluation={handleSaveEvaluation}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
      />

      <LookerStudioModal
        isOpen={isLookerModalOpen}
        onClose={() => setIsLookerModalOpen(false)}
        students={students}
        companies={effectiveCompanies}
        submissions={submissions}
        form3List={form3List}
      />

      <GoogleSheetModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        students={students}
        submissions={submissions}
        form3List={form3List}
        courses={courses}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        initialRole={gatewayRole}
      />
    </div>
  );
}

