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
import { Form1CompanyModal } from './components/Modals/Form1CompanyModal';
import { Form2WeeklyReportModal } from './components/Modals/Form2WeeklyReportModal';
import { Form3SupervisionModal } from './components/Modals/Form3SupervisionModal';
import { LookerStudioModal } from './components/Modals/LookerStudioModal';
import { GoogleSheetModal } from './components/Modals/GoogleSheetModal';
import { AuthModal } from './components/Modals/AuthModal';
import { LoginGatewayView } from './views/LoginGatewayView';
import { StudentGuideView } from './views/StudentGuideView';
import { mockStudents, mockCompanies, mockWeeklySubmissions, mockAnnouncements } from './data/mockData';
import { Student, Company, WeeklySubmission, AuthUser, Form3SupervisionRecord } from './types';
import { WEEKS_1_TO_18, getCurrentWeekInfo } from './data/weeksData';
import { getStoredAuthUser, signOutKktechUser, getCachedAccessToken } from './services/authService';
import { appendForm1ToGoogleSheet } from './services/googleSheetsService';
import { 
  saveCompanyDataToLoginSheet,
  getAllLoginSheetStudents,
  findStudentInLoginSheet,
  convertLoginRowToStudent,
  fetchFullLoginSheetRows
} from './services/sheetAuthService';
import {
  syncAllLoginSheetRowsToFirebase,
  saveAndSyncStudentBothWays
} from './services/sheetFirebaseSyncService';
import {
  seedFirestoreIfEmpty,
  subscribeStudents,
  subscribeCompanies,
  subscribeSubmissions,
  saveStudentToFirestore,
  saveSubmissionToFirestore,
  deleteSubmissionFromFirestore,
  deleteForm3SupervisionFromFirestore
} from './services/firestoreService';
import { deleteLocalForm3Row } from './services/googleSheetsService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredAuthUser);
  const [gatewayRole, setGatewayRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [showGuidePreLogin, setShowGuidePreLogin] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<string>('hub');
  const [isMobileMode, setIsMobileMode] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<'student' | 'teacher' | 'admin'>('student');
  
  // App data state: initialized directly with all students from Google Sheet login tab (1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28)
  const [students, setStudents] = useState<Student[]>(() => {
    const sheetStudents = getAllLoginSheetStudents();
    return sheetStudents.length > 0 ? sheetStudents : mockStudents;
  });
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [submissions, setSubmissions] = useState<Record<string, WeeklySubmission[]>>(mockWeeklySubmissions);

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
    if (currentUser && currentUser.role === 'student') {
      const code = currentUser.studentId || currentUser.email.split('@')[0];
      const match = students.find(
        s => s.studentCode === code || s.id === `std-${code}` || s.email.toLowerCase() === currentUser.email.toLowerCase() || s.name === currentUser.name
      );
      if (match) return match;
    }
    return students.find((s) => s.id === activeStudentId) || students[0];
  }, [students, activeStudentId, currentUser]);

  // Keep student section in sync with logged-in user from Google Spreadsheet login tab
  useEffect(() => {
    if (currentUser && currentUser.role === 'student') {
      const code = currentUser.studentId || currentUser.email.split('@')[0];
      const studentId = `std-${code}`;
      setActiveStudentId(studentId);

      findStudentInLoginSheet(code, currentUser.name).then((row) => {
        if (row) {
          const freshStudent = convertLoginRowToStudent(row);
          setStudents((prev) => {
            const idx = prev.findIndex(s => s.studentCode === code || s.id === studentId || s.name === row.name);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...prev[idx], ...freshStudent };
              return updated;
            } else {
              return [freshStudent, ...prev];
            }
          });
        }
      });
    }
  }, [currentUser]);

  // Initialize and synchronize with Firebase Firestore (project: internship2-2569) & Google Sheets (login tab)
  useEffect(() => {
    // 1. Seed initial data if Firestore collections are empty
    seedFirestoreIfEmpty(mockStudents, mockCompanies, mockWeeklySubmissions, mockAnnouncements);

    // 2. Synchronize all rows from Google Spreadsheet login tab into Firebase Firestore (internship2-2569)
    syncAllLoginSheetRowsToFirebase().then((res) => {
      console.log('[UnifiedDatabase] Google Sheet login ⇋ Firebase sync result:', res.message);
    });

    // 3. Real-time subscription to Students collection
    const unsubStudents = subscribeStudents(
      (remoteStudents) => {
        if (remoteStudents && remoteStudents.length > 0) {
          setStudents(remoteStudents);
        }
      },
      (err) => console.warn('Students firestore stream note:', err)
    );

    // 3. Real-time subscription to Companies collection
    const unsubCompanies = subscribeCompanies(
      (remoteCompanies) => {
        if (remoteCompanies && remoteCompanies.length > 0) {
          setCompanies(remoteCompanies);
        }
      },
      (err) => console.warn('Companies firestore stream note:', err)
    );

    // 4. Real-time subscription to Weekly Submissions collection
    const unsubSubmissions = subscribeSubmissions(
      (remoteSubs) => {
        if (remoteSubs && remoteSubs.length > 0) {
          const grouped: Record<string, WeeklySubmission[]> = {};
          remoteSubs.forEach((sub) => {
            if (!grouped[sub.studentId]) {
              grouped[sub.studentId] = [];
            }
            grouped[sub.studentId].push(sub);
          });
          setSubmissions(prev => ({
            ...prev,
            ...grouped
          }));
        }
      },
      (err) => console.warn('Submissions firestore stream note:', err)
    );

    return () => {
      unsubStudents();
      unsubCompanies();
      unsubSubmissions();
    };
  }, []);

  // Callback to update student company registration from Form #1
  const handleSaveCompanyInfo = async (updatedInfo: Partial<Student['companyRegistration']> & { companyName?: string }) => {
    const updatedStudent: Student = {
      ...currentStudent,
      companyName: updatedInfo.companyName || currentStudent.companyName,
      companyRegistration: {
        ...currentStudent.companyRegistration,
        ...updatedInfo
      }
    };

    setStudents(prev => prev.map(s => s.id === currentStudent.id ? updatedStudent : s));
    
    // Persist and synchronize bidirectionally to Firebase Firestore (internship2-2569) & Google Sheets (login tab)
    try {
      const token = getCachedAccessToken();
      await saveAndSyncStudentBothWays(updatedStudent, token);

      // Also append to Form_1 history tab
      await appendForm1ToGoogleSheet({
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
        status: 'บันทึกสำเร็จ'
      }, token);
    } catch (sheetErr) {
      console.warn('Unified database sync note:', sheetErr);
    }
  };

  // Callback to update student avatar photo
  const handleUpdateStudentAvatar = async (dataUrl: string) => {
    setStudents(prev => prev.map(s => s.id === currentStudent.id ? { ...s, avatarUrl: dataUrl } : s));

    try {
      localStorage.setItem(`kktech_avatar_${currentStudent.id}`, dataUrl);
      localStorage.setItem(`kktech_avatar_std-${currentStudent.studentCode}`, dataUrl);
    } catch (e) {
      console.warn('LocalStorage avatar cache note:', e);
    }

    try {
      await saveStudentToFirestore({
        ...currentStudent,
        avatarUrl: dataUrl
      });
    } catch (err) {
      console.warn('Firestore avatar save note:', err);
    }
  };

  // Callback to submit Form #2 weekly report
  const handleSubmitWeeklyReport = async (submissionData: Partial<WeeklySubmission>) => {
    const weekNum = submissionData.weekNumber || 8;
    const weekMeta = WEEKS_1_TO_18.find(w => w.weekNumber === weekNum);
    const newSub: WeeklySubmission = {
      id: `sub-w${weekNum}-${Date.now()}`,
      studentId: currentStudent.id,
      weekNumber: weekNum,
      dateRange: submissionData.dateRange || weekMeta?.dateRange || '10 มิ.ย. 2569 - 14 มิ.ย. 2569',
      submittedAt: submissionData.submittedAt || new Date().toLocaleString('th-TH'),
      status: 'pending',
      taskTitle: submissionData.taskTitle || weekMeta?.defaultTask || 'งานติดตั้งตู้ Distribution Board (MDB)',
      dailyLogs: submissionData.dailyLogs || [],
      photos: submissionData.photos || [],
      totalHours: submissionData.totalHours || 40.0,
      mentorRating: 5.0,
      mentorComment: 'นักศึกษาตั้งใจทำงาน ปฏิบัติตามมาตรฐานวิศวกรรมไฟฟ้า',
      mentorName: currentStudent.companyRegistration.mentorName,
      mentorPosition: 'วิศวกรไฟฟ้า / พี่เลี้ยง',
      teacherScore: 19.5,
      teacherGrade: 'A',
      teacherName: currentStudent.supervisorTeacher,
      studentSignature: currentStudent.name.replace(/^(นาย|นางสาว)\s*/, ''),
      mentorSignature: 'ชาญชัย มงคลศรี',
      teacherSignature: 'ทักษิณ โสภาปิยะ',
      verifiedHash: `7B8C${currentStudent.studentCode}-KKTECH-2569-W${String(weekNum).padStart(2, '0')}-OK`,
      safetyChecklist: submissionData.safetyChecklist || {
        hardHat: true,
        highVoltageGloves: true,
        safetyShoes: true,
        lotoProcedure: true
      }
    };

    setSubmissions(prev => ({
      ...prev,
      [currentStudent.id]: [newSub, ...(prev[currentStudent.id] || []).filter(s => s.weekNumber !== newSub.weekNumber)]
    }));

    // Persist submission to Firebase Firestore (internship2-2569)
    try {
      await saveSubmissionToFirestore(newSub);
    } catch (e) {
      console.error('Error saving submission to Firestore:', e);
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
    const idsToUpdate = evalData.studentIds && evalData.studentIds.length > 0 
      ? evalData.studentIds 
      : (evalData.studentId ? [evalData.studentId] : []);
    
    if (idsToUpdate.length === 0) return;

    const modifiedSubs: WeeklySubmission[] = [];

    setSubmissions(prev => {
      const next = { ...prev };
      for (const sId of idsToUpdate) {
        const studentSubs = next[sId] || [];
        if (studentSubs.length > 0) {
          next[sId] = studentSubs.map((sub, i) => {
            if (i === 0) {
              const modSub: WeeklySubmission = {
                ...sub,
                status: 'graded' as const,
                teacherScore: evalData.score,
                teacherGrade: evalData.grade,
                teacherComment: evalData.comment,
                mentorComment: evalData.mentorFeedback
              };
              modifiedSubs.push(modSub);
              return modSub;
            }
            return sub;
          });
        }
      }
      return next;
    });

    // Persist updated evaluations to Firebase Firestore (internship2-2569)
    for (const sub of modifiedSubs) {
      try {
        await saveSubmissionToFirestore(sub);
      } catch (e) {
        console.error('Error updating evaluation in Firestore:', e);
      }
    }
  };

  // Callback for Admin to delete a student's weekly submission
  const handleDeleteSubmission = async (submissionId: string, studentId: string): Promise<boolean> => {
    try {
      await deleteSubmissionFromFirestore(submissionId);
      setSubmissions(prev => {
        const studentSubs = prev[studentId] || [];
        return {
          ...prev,
          [studentId]: studentSubs.filter(s => s.id !== submissionId)
        };
      });
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
      return true;
    } catch (err) {
      console.error('Error deleting supervision from Firestore:', err);
      throw err;
    }
  };

  const handleLoginSuccess = async (user: AuthUser) => {
    // If user clicked the teacher gateway, ensure their effective role is teacher
    const effectiveRole = (gatewayRole === 'teacher' && user.role === 'admin') ? 'teacher' : user.role;
    const effectiveUser = { ...user, role: effectiveRole };
    setCurrentUser(effectiveUser);
    setCurrentRole(effectiveUser.role);

    // If logging in as student from Google Sheet login tab, map directly to their row in the login sheet
    if (effectiveUser.role === 'student') {
      const code = effectiveUser.studentId || effectiveUser.email.split('@')[0];
      const newStudentId = `std-${code}`;
      setActiveStudentId(newStudentId);

      // Fetch row directly from Google Sheet login tab (1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28)
      try {
        const row = await findStudentInLoginSheet(code, effectiveUser.name);
        if (row) {
          const studentFromSheet = convertLoginRowToStudent(row);
          setStudents(prev => {
            const idx = prev.findIndex(s => s.studentCode === code || s.id === newStudentId || s.name === effectiveUser.name);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...prev[idx], ...studentFromSheet };
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

  // Guard views based on user's active role
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    if (role === 'student') {
      const allowedStudentViews = ['hub', 'student', 'weekly-log', 'guide'];
      if (!allowedStudentViews.includes(currentView)) {
        setCurrentView('student');
      }
    } else if (role === 'teacher') {
      const allowedTeacherViews = ['hub', 'teacher', 'map', 'a4', 'guide'];
      if (!allowedTeacherViews.includes(currentView)) {
        setCurrentView('teacher');
      }
    }
  }, [currentUser, currentView]);

  const handleSignOut = () => {
    signOutKktechUser();
    setCurrentUser(null);
  };

  // If user is not logged in and wants to read student guide
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

  // If user is not logged in, show the role selection gateway landing page
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
      {/* Top Application Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          setIsMobileMode(false);
          setCurrentView(view);
        }}
        isMobileMode={isMobileMode}
        onToggleMobileMode={() => setIsMobileMode(!isMobileMode)}
        currentRole={currentRole}
        onChangeRole={(role) => setCurrentRole(role)}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        onOpenLookerModal={() => setIsLookerModalOpen(true)}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main View Container */}
      <div className="flex-1 flex flex-col">
        {isMobileMode ? (
          /* Mobile Frame Simulator View (Screenshot 5 & 6) */
          <div className="max-w-7xl mx-auto w-full px-4 py-6">
            <MobileSimView
              currentRole={currentRole === 'student' ? 'student' : 'teacher'}
              onChangeRole={(role) => setCurrentRole(role)}
              currentUser={currentUser}
              student={currentStudent}
              students={students}
              companies={companies}
              submissions={submissions}
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
          /* SCREENSHOT 1: Hub View Full Width */
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
              announcements={mockAnnouncements}
              student={currentStudent}
              currentUser={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onUpdateAvatar={handleUpdateStudentAvatar}
            />
          </main>
        ) : (
          /* Top-bar only full-width content layout */
          <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 print:max-w-none print:p-0">
              {currentView === 'student' && (
                <StudentView
                  student={currentStudent}
                  submissions={submissions[currentStudent.id] || []}
                  onOpenForm1={() => setIsForm1Open(true)}
                  onOpenForm2={() => setIsForm2Open(true)}
                  onNavigateA4={() => setCurrentView('a4')}
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
                  submissions={submissions[currentStudent.id] || []}
                  initialWeek={selectedLogWeek}
                  currentUser={currentUser}
                  onNavigateA4={(weekNum) => {
                    if (weekNum) setSelectedLogWeek(weekNum);
                    setCurrentView('a4');
                  }}
                  onSubmissionUpdated={(newSub) => {
                    setSubmissions(prev => ({
                      ...prev,
                      [currentStudent.id]: [
                        newSub,
                        ...(prev[currentStudent.id] || []).filter(s => s.weekNumber !== newSub.weekNumber)
                      ]
                    }));
                  }}
                  onDeleteSubmission={(subId) => handleDeleteSubmission(subId, currentStudent.id)}
                />
              )}

              {currentView === 'teacher' && (
                <TeacherView
                  students={students}
                  companies={companies}
                  submissions={submissions}
                  currentUser={currentUser}
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
                  companies={companies}
                  students={students}
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
                  companies={companies}
                  initialStudentId={activeStudentId}
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

              {currentView === 'admin' && (
                <AdminView
                  students={students}
                  companies={companies}
                  submissions={submissions}
                  onDeleteSubmission={handleDeleteSubmission}
                  onDeleteSupervision={handleDeleteSupervision}
                  onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
                  onOpenLookerModal={() => setIsLookerModalOpen(true)}
                />
              )}

              {currentView === 'guide' && (
                <StudentGuideView
                  onNavigate={(view) => setCurrentView(view)}
                  currentUser={currentUser}
                />
              )}
            </main>
        )}
      </div>

      {/* Global Footer */}
      <Footer />

      {/* Interactive Modal Dialogs */}
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
        onSubmit={handleSubmitWeeklyReport}
      />

      <Form3SupervisionModal
        isOpen={isForm3Open}
        onClose={() => setIsForm3Open(false)}
        students={students}
        companies={companies}
        selectedStudentId={targetStudentForForm3}
        teacherName={currentUser?.name}
        teacherEmail={currentUser?.email}
        onSaveEvaluation={handleSaveEvaluation}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
      />

      <LookerStudioModal
        isOpen={isLookerModalOpen}
        onClose={() => setIsLookerModalOpen(false)}
      />

      <GoogleSheetModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        students={students}
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
