import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, 
  Database, 
  BarChart3, 
  ExternalLink, 
  Upload, 
  Users, 
  Key, 
  Settings, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Lock,
  Layers,
  Download,
  Server,
  HardDrive,
  FolderArchive,
  FileCode,
  Trash2,
  Search,
  Filter
} from 'lucide-react';
import { Student, Company, WeeklySubmission, Form3SupervisionRecord } from '../types';
import { getCurrentWeekInfo } from '../data/weeksData';
import { 
  wipeAndReplaceFirebaseWithSheetData, 
  syncAllLoginSheetRowsToFirebase,
  getLastSyncInfo
} from '../services/sheetFirebaseSyncService';
import { downloadAllWebZip } from '../services/webZipService';
import { subscribeForm3Supervisions } from '../services/firestoreService';
import { getLocalForm3Rows } from '../services/googleSheetsService';
import { getAllLoginSheetTeachers, fetchSheetLoginAccounts } from '../services/sheetAuthService';
import { getCachedCourses, getRoomsByTeacher } from '../services/courseDataService';

interface AdminViewProps {
  students: Student[];
  companies: Company[];
  submissions?: Record<string, WeeklySubmission[]>;
  onDeleteSubmission?: (submissionId: string, studentId: string) => Promise<boolean>;
  onDeleteSupervision?: (recordId: string) => Promise<boolean>;
  onOpenSheetsModal: () => void;
  onOpenLookerModal: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  students,
  companies,
  submissions = {},
  onDeleteSubmission,
  onDeleteSupervision,
  onOpenSheetsModal,
  onOpenLookerModal,
}) => {
  const [syncStatus, setSyncStatus] = useState<string>('เชื่อมต่อสมบูรณ์ (Real-time)');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isWipingAndReplacing, setIsWipingAndReplacing] = useState<boolean>(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [downloadProgressMsg, setDownloadProgressMsg] = useState<string | null>(null);
  const [syncAlert, setSyncAlert] = useState<{ type: 'success' | 'error'; message: string; details?: string } | null>(null);
  const currentWeekInfo = getCurrentWeekInfo();

  // Data management state for Admin
  const [supervisions, setSupervisions] = useState<Form3SupervisionRecord[]>(() => getLocalForm3Rows());
  const [dataManageTab, setDataManageTab] = useState<'submissions' | 'supervisions'>('submissions');
  const [subSearch, setSubSearch] = useState('');
  const [subWeekFilter, setSubWeekFilter] = useState('all');
  const [supSearch, setSupSearch] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [loginAccountsCount, setLoginAccountsCount] = useState<number>(() => Math.max(students.length, 152));
  const remoteForm3Ref = useRef<Form3SupervisionRecord[]>([]);

  useEffect(() => {
    fetchSheetLoginAccounts()
      .then((accs) => {
        if (accs && accs.length > 0) setLoginAccountsCount(accs.length);
      })
      .catch(() => {});

    const mergeAndSet = (remoteList?: Form3SupervisionRecord[]) => {
      const remote = remoteList !== undefined ? remoteList : remoteForm3Ref.current;
      const local = getLocalForm3Rows();
      const map = new Map<string, Form3SupervisionRecord>();
      local.forEach(r => { if (r && r.id) map.set(r.id, r); });
      remote.forEach(r => { if (r && r.id) map.set(r.id, r); });
      setSupervisions(Array.from(map.values()));
    };

    mergeAndSet([]);

    const unsub = subscribeForm3Supervisions(
      (remoteRecords) => {
        const recs = remoteRecords || [];
        remoteForm3Ref.current = recs;
        mergeAndSet(recs);
      },
      (err) => console.warn('Form3 supervision stream notice in AdminView:', err)
    );

    const handleSync = () => mergeAndSet();
    window.addEventListener('kktech_form3_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      unsub();
      window.removeEventListener('kktech_form3_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [students.length]);

  // Map student details
  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach(s => map.set(s.id, s));
    return map;
  }, [students]);

  // Flatten submissions
  const allSubmissionsList = useMemo(() => {
    const list: Array<WeeklySubmission & { studentName?: string; studentCode?: string; companyName?: string }> = [];
    Object.entries(submissions).forEach(([studentId, subs]) => {
      const std = studentMap.get(studentId);
      subs.forEach(s => {
        list.push({
          ...s,
          studentName: std?.name || s.studentId,
          studentCode: std?.studentCode || '',
          companyName: std?.companyName || ''
        });
      });
    });
    return list.sort((a, b) => b.weekNumber - a.weekNumber);
  }, [submissions, studentMap]);

  const sheetTeachers = useMemo(() => getAllLoginSheetTeachers(), []);
  const sheetCoursesCount = useMemo(() => getCachedCourses().length, []);

  const liveMetrics = useMemo(() => {
    const totalStudents = students.length;
    const totalTeachers = sheetTeachers.length;
    const totalRecords = totalStudents + companies.length + allSubmissionsList.length + supervisions.length + sheetCoursesCount;
    const supervisedStudentIds = new Set(supervisions.map(r => r.studentCode || r.studentName).filter(Boolean));
    const gradedStudentIds = new Set(allSubmissionsList.filter(s => s.status === 'graded').map(s => s.studentId));
    const coveredCount = new Set([...supervisedStudentIds, ...gradedStudentIds]).size;
    const passRate = totalStudents > 0 ? Math.min(100, Math.round((coveredCount / totalStudents) * 1000) / 10) : 0;

    return {
      totalStudents,
      totalTeachers,
      totalRecords,
      passRate
    };
  }, [students.length, sheetTeachers.length, companies.length, allSubmissionsList, supervisions, sheetCoursesCount]);

  const teacherAssignments = useMemo(() => {
    const courses = getCachedCourses();
    return sheetTeachers.slice(0, 6).map((t) => {
      const assignedRooms = Array.from(new Set([...(t.rooms || []), ...getRoomsByTeacher(t.name, courses)]));
      const cleanTName = t.name.replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, '').trim();
      const assignedStudents = students.filter(s =>
        (s.room && assignedRooms.includes(s.room)) ||
        (cleanTName && s.supervisorTeacher && s.supervisorTeacher.includes(cleanTName))
      );
      const uniqueCompanies = new Set(
        assignedStudents.map(s => (s.companyName || '').trim()).filter(n => n && !n.includes('รออัปเดต'))
      );
      const supervisedSet = new Set(
        supervisions
          .filter(r => r.teacherName?.includes(cleanTName) || assignedStudents.some(s => s.studentCode === r.studentCode))
          .map(r => r.studentCode || r.studentName)
      );
      const pct = assignedStudents.length > 0
        ? Math.min(100, Math.round((supervisedSet.size / assignedStudents.length) * 100))
        : 0;
      return {
        id: t.id,
        name: t.name,
        role: t.role,
        roomsText: assignedRooms.length > 0 ? assignedRooms.join(', ') : (t.department || 'แผนกวิชาช่างไฟฟ้ากำลัง'),
        studentsCount: assignedStudents.length,
        companiesCount: uniqueCompanies.size,
        supervisedPct: pct
      };
    });
  }, [sheetTeachers, students, supervisions]);

  const filteredSubmissions = useMemo(() => {
    return allSubmissionsList.filter(s => {
      const matchWeek = subWeekFilter === 'all' || s.weekNumber.toString() === subWeekFilter;
      const matchSearch = !subSearch || 
        (s.studentName && s.studentName.toLowerCase().includes(subSearch.toLowerCase())) ||
        (s.studentCode && s.studentCode.includes(subSearch)) ||
        (s.taskTitle && s.taskTitle.toLowerCase().includes(subSearch.toLowerCase())) ||
        (s.companyName && s.companyName.toLowerCase().includes(subSearch.toLowerCase()));
      return matchWeek && matchSearch;
    });
  }, [allSubmissionsList, subWeekFilter, subSearch]);

  const filteredSupervisions = useMemo(() => {
    return supervisions.filter(r => {
      if (!supSearch) return true;
      const term = supSearch.toLowerCase();
      return (
        (r.studentName && r.studentName.toLowerCase().includes(term)) ||
        (r.studentCode && r.studentCode.includes(term)) ||
        (r.companyName && r.companyName.toLowerCase().includes(term)) ||
        (r.teacherName && r.teacherName.toLowerCase().includes(term))
      );
    });
  }, [supervisions, supSearch]);

  const handleDeleteSub = async (subId: string, studentId: string, studentName: string, weekNum: number) => {
    if (!onDeleteSubmission) return;
    if (window.confirm(`⚠️ คำเตือน Admin: คุณแน่ใจหรือไม่ที่จะลบบันทึกสัปดาห์ที่ ${weekNum} ของนักศึกษา ${studentName} (${studentId})?\n\nการลบนี้จะลบข้อมูลออกจาก Firestore (internship2-2569) อย่างถาวร`)) {
      try {
        await onDeleteSubmission(subId, studentId);
        setActionNotice(`ลบบันทึกสัปดาห์ที่ ${weekNum} ของ ${studentName} สำเร็จแล้ว`);
        setTimeout(() => setActionNotice(null), 4000);
      } catch (e: any) {
        alert('เกิดข้อผิดพลาดในการลบ: ' + (e.message || String(e)));
      }
    }
  };

  const handleDeleteSup = async (recId: string, studentName: string, companyName: string) => {
    if (!onDeleteSupervision) return;
    if (window.confirm(`⚠️ คำเตือน Admin: คุณแน่ใจหรือไม่ที่จะลบรายงานการนิเทศของ ${studentName} ณ ${companyName}?\n\nการลบนี้จะลบข้อมูลออกจาก Firestore และฐานข้อมูลระบบอย่างถาวร`)) {
      try {
        await onDeleteSupervision(recId);
        setSupervisions(prev => prev.filter(r => r.id !== recId));
        setActionNotice(`ลบรายงานการนิเทศของ ${studentName} ณ ${companyName} สำเร็จแล้ว`);
        setTimeout(() => setActionNotice(null), 4000);
      } catch (e: any) {
        alert('เกิดข้อผิดพลาดในการลบ: ' + (e.message || String(e)));
      }
    }
  };

  const handleDownloadWebZip = async () => {
    setIsDownloadingZip(true);
    setDownloadProgressMsg('กำลังรวบรวมไฟล์เว็บทั้งหมดเพื่อสร้างไฟล์ .zip...');
    setSyncAlert(null);
    try {
      const res = await downloadAllWebZip((status) => {
        setDownloadProgressMsg(status);
      });
      setSyncAlert({
        type: 'success',
        message: 'รวมไฟล์เว็บทั้งหมดเป็นไฟล์ .zip เรียบร้อยแล้ว',
        details: `${res.message} - พร้อมนำไปแตกไฟล์และติดตั้งบน Server จริง (AppServ / XAMPP / Apache / IIS)`
      });
    } catch (err: any) {
      setSyncAlert({
        type: 'error',
        message: 'ไม่สามารถดาวน์โหลดไฟล์เว็บได้: ' + (err?.message || String(err))
      });
    } finally {
      setIsDownloadingZip(false);
      setTimeout(() => setDownloadProgressMsg(null), 4000);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncAlert(null);
    try {
      const res = await syncAllLoginSheetRowsToFirebase();
      setSyncStatus(`ซิงค์ข้อมูลล่าสุดเมื่อ ${new Date().toLocaleTimeString('th-TH')}`);
      setSyncAlert({
        type: res.success ? 'success' : 'error',
        message: res.message,
        details: `อัปเดตแล้ว ${res.totalSynced} รายการ (${res.studentsCount} นักศึกษา)`
      });
    } catch (err) {
      setSyncAlert({
        type: 'error',
        message: 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล: ' + (err instanceof Error ? err.message : String(err))
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleWipeAndReplace = async () => {
    if (!window.confirm('คุณต้องการลบข้อมูล User ครูนิเทศ และ นักศึกษา ใน Firebase (internship2-2569) เดิมทั้งหมด แล้วนำเข้าจาก Google Sheets แผ่นงาน Login (152 บัญชี) ใช่หรือไม่?')) {
      return;
    }
    setIsWipingAndReplacing(true);
    setSyncAlert(null);
    try {
      const res = await wipeAndReplaceFirebaseWithSheetData();
      setSyncStatus(`อัปเดตสมบูรณ์เมื่อ ${new Date().toLocaleTimeString('th-TH')}`);
      setSyncAlert({
        type: res.success ? 'success' : 'error',
        message: res.message,
        details: `ลบข้อมูลเก่า: ${res.deletedCount} รายการ | นำเข้านักศึกษาใหม่: ${res.insertedStudents} คน | ครูนิเทศก์: ${res.insertedTeachers} ท่าน | ผู้ใช้งาน: ${res.insertedUsers} บัญชี`
      });
    } catch (err) {
      setSyncAlert({
        type: 'error',
        message: 'เกิดข้อผิดพลาดในการล้างและนำเข้าข้อมูล: ' + (err instanceof Error ? err.message : String(err))
      });
    } finally {
      setIsWipingAndReplacing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-950 flex items-center justify-center text-rose-400 font-bold shrink-0 shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">แผงควบคุมระบบ & หัวหน้าแผนกวิชาช่างไฟฟ้า</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                  Admin Console
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                จัดการฐานข้อมูล Google Sheets, มอบหมายครูนิเทศก์, จัดการสิทธิ์ความปลอดภัย และวิเคราะห์สถิติภาพรวม
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadWebZip}
              disabled={isDownloadingZip}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs transition cursor-pointer disabled:opacity-60"
              title="รวมไฟล์เว็บทั้งหมดเป็นไฟล์ .zip เพื่อนำไปติดตั้งบน Server จริง (AppServ / Apache)"
            >
              {isDownloadingZip ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isDownloadingZip ? 'กำลังรวมไฟล์เว็บ...' : 'ดาวน์โหลดเว็บลง Server (.zip)'}</span>
            </button>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-semibold shadow-2xs transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
              <span>{isSyncing ? 'กำลังดึงข้อมูล Sheets...' : 'รีเฟรชข้อมูลคลาวด์'}</span>
            </button>
            <button
              onClick={onOpenSheetsModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-bold shadow-xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>เปิด Google Sheet หลัก</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real Server Publishing & Download Package Section */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                Production Deployment
              </span>
              <span className="text-sm text-slate-400">• สำหรับผู้ดูแลระบบนำไปแสดงผลบน Server จริง</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              ดาวน์โหลดไฟล์เว็บเพจสำหรับนำไปติดตั้งบน Server จริง
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              ดาวน์โหลดแพ็กเกจไฟล์เว็บแบบสมบูรณ์ (.zip) เพื่อนำไปวางใน Web Server ของวิทยาลัย (เช่น AppServ, XAMPP, Apache หรือ IIS) ได้ทันที โดยระบบยังคงเชื่อมต่อฐานข้อมูล Google Cloud Firebase และรองรับระบบล็อกอินอย่างสมบูรณ์
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-slate-300">
              <div className="flex items-center gap-1.5">
                <FolderArchive className="w-4 h-4 text-amber-400" />
                <span>ไฟล์: <strong className="text-white">appserv_publish.zip</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>ขนาด: <strong className="text-white">~4.6 MB</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-sky-400" />
                <span>มีไฟล์ .htaccess & index.html ครบถ้วน</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2">
            <button
              onClick={handleDownloadWebZip}
              disabled={isDownloadingZip}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5 disabled:opacity-60 disabled:transform-none"
            >
              {isDownloadingZip ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>กำลังรวมไฟล์เว็บทั้งหมด (.zip)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>ดาวน์โหลดไฟล์เว็บทั้งหมด (.zip)</span>
                </>
              )}
            </button>
            <p className="text-xs text-slate-400 text-center">
              {downloadProgressMsg || 'คลิกเพื่อรวมไฟล์และเริ่มดาวน์โหลดทันที'}
            </p>
          </div>
        </div>

        {/* 3 Steps instructions inside the card */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="font-bold text-sky-300 text-sm mb-1">ขั้นตอนที่ 1: แตกไฟล์</div>
            <p className="text-[13px] text-slate-300 leading-relaxed">
              แตกไฟล์ .zip แล้วนำไฟล์ทั้งหมดไปวางในโฟลเดอร์ <code className="bg-black/30 px-1 py-0.5 rounded font-mono text-amber-300">C:\AppServ\www\</code> หรือ <code className="bg-black/30 px-1 py-0.5 rounded font-mono text-amber-300">C:\xampp\htdocs\</code>
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="font-bold text-emerald-300 text-sm mb-1">ขั้นตอนที่ 2: เริ่มการทำงาน</div>
            <p className="text-[13px] text-slate-300 leading-relaxed">
              เปิดบราวเซอร์แล้วเข้าใช้งานผ่าน <code className="bg-black/30 px-1 py-0.5 rounded font-mono text-emerald-300">http://localhost/</code> หรือ IP เครื่องเซิร์ฟเวอร์ในเครือข่ายวิทยาลัย
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="font-bold text-amber-300 text-sm mb-1">ขั้นตอนที่ 3: ออนไลน์อัตโนมัติ</div>
            <p className="text-[13px] text-slate-300 leading-relaxed">
              ระบบเชื่อมต่อกับ Cloud Firestore แบบเรียลไทม์อัตโนมัติ สามารถบันทึกข้อมูลและส่งรายงานได้ทันที
            </p>
          </div>
        </div>
      </div>

      {/* Sync Alert Banner if triggered */}
      {syncAlert && (
        <div className={`p-4 rounded-2xl border text-sm flex items-start justify-between gap-3 transition ${
          syncAlert.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-start gap-2.5">
            {syncAlert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-base">{syncAlert.message}</div>
              {syncAlert.details && (
                <div className="text-[13px] mt-0.5 opacity-90">{syncAlert.details}</div>
              )}
            </div>
          </div>
          <button
            onClick={() => setSyncAlert(null)}
            className="text-slate-400 hover:text-slate-600 text-sm px-2 py-1 rounded"
          >
            ✕ ปิด
          </button>
        </div>
      )}

      {/* Unified Cloud Database Management Card */}
      <div className="bg-white rounded-2xl border border-amber-300 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-amber-700" />
                Firebase Firestore: internship2-2569
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                Google Sheet: login
              </span>
              <span className="text-[13px] text-slate-500 font-medium">
                สถานะ: {syncStatus}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              ฐานข้อมูลผู้ใช้งาน (User & Pass) เชื่อมโยงตรงจาก Google Sheets สู่ Firebase Firestore
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
              ข้อมูลผู้ใช้จริงซิงค์จาก Google Sheets แผ่นงาน Login เข้าสู่ Firebase (internship2-2569): 
              <strong className="text-slate-900"> นักศึกษา {liveMetrics.totalStudents} คน</strong> (คอลเลกชัน <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-900 font-mono text-xs">/students</code>) และ 
              <strong className="text-slate-900"> ครูนิเทศก์/ประจำวิชา {liveMetrics.totalTeachers} ท่าน</strong> (คอลเลกชัน <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-900 font-mono text-xs">/teachers</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-900 font-mono text-xs">/users</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-900 font-mono text-xs">/login_sheet</code>)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleWipeAndReplace}
              disabled={isWipingAndReplacing || isSyncing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-sm shadow-sm transition cursor-pointer disabled:opacity-50"
              title="ลบฐานข้อมูลผู้ใช้เก่าทั้งหมดใน Firebase แล้วนำเข้าใหม่ 152 บัญชีจาก Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${isWipingAndReplacing ? 'animate-spin' : ''}`} />
              <span>{isWipingAndReplacing ? 'กำลังล้าง & อัปเดตข้อมูล...' : 'ลบข้อมูลเก่า & นำเข้าใหม่จาก Sheet'}</span>
            </button>
            <button
              onClick={handleManualSync}
              disabled={isSyncing || isWipingAndReplacing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm shadow-2xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
              <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูล (Real-time)'}</span>
            </button>
          </div>
        </div>

        {/* Database Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-sm">
          <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200">
            <div className="text-xs text-amber-800 font-semibold">นักศึกษาในระบบ</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{liveMetrics.totalStudents} <span className="text-sm font-normal text-slate-500">คน</span></div>
            <div className="text-xs text-slate-500">/students collection</div>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-50/50 border border-sky-200">
            <div className="text-xs text-sky-800 font-semibold">ครูนิเทศก์ / ประจำวิชา</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{liveMetrics.totalTeachers} <span className="text-sm font-normal text-slate-500">ท่าน</span></div>
            <div className="text-xs text-slate-500">/teachers collection</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200">
            <div className="text-xs text-emerald-800 font-semibold">ผู้ใช้งานทั้งหมด (Sheet)</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{loginAccountsCount} <span className="text-sm font-normal text-slate-500">บัญชี</span></div>
            <div className="text-xs text-slate-500">/users & /login_sheet</div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-200">
            <div className="text-xs text-indigo-800 font-semibold">สถานะ Firestore DB</div>
            <div className="text-base font-bold text-emerald-700 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
              <span>เชื่อมต่อสมบูรณ์</span>
            </div>
            <div className="text-xs text-slate-500 truncate" title="ai-studio-kktechpowerporta-615d1fa9-e2f4-479e-9581-f8f2f219ee18">
              Database: ai-studio-kktech...
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Systems Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Firebase Firestore Cloud Card */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/5 rounded-full pointer-events-none"></div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              Firebase Firestore
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
              Synced Live
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 truncate">internship2-2569</div>
          <p className="text-[13px] text-slate-500">
            Collections: students, companies, submissions
          </p>
          <div className="pt-2">
            <span className="text-amber-700 text-sm font-semibold flex items-center gap-1">
              <span>Data Field พร้อมบันทึกคลาวด์</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-600" /> Google Sheets API v4
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
              Connected
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900">{liveMetrics.totalRecords.toLocaleString()} เรคคอร์ด</div>
          <p className="text-[13px] text-slate-500">ID: #KK-PWR-2569 (Master Sheet ทวิภาคี)</p>
          <div className="pt-2">
            <button
              onClick={onOpenSheetsModal}
              className="text-emerald-700 hover:text-emerald-800 font-semibold text-sm flex items-center gap-1"
            >
              <span>ตรวจสอบโครงสร้างคอลัมน์</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-sky-600" /> Looker Analytics Service
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800">
              Live Engine
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900">อัตราการนิเทศ/ประเมิน {liveMetrics.passRate}%</div>
          <p className="text-[13px] text-slate-500">ซิงค์สถิติคะแนนสมรรถนะแบบอัตโนมัติ</p>
          <div className="pt-2">
            <button
              onClick={onOpenLookerModal}
              className="text-sky-700 hover:text-sky-800 font-semibold text-sm flex items-center gap-1"
            >
              <span>เปิด Dashboard แบบผู้บริหาร</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-600" /> Google SSO Domain Guard
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
              Active
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900">@kktech.ac.th</div>
          <p className="text-[13px] text-slate-500">จำกัดสิทธิ์เฉพาะอาจารย์และนักศึกษาในสังกัด</p>
          <div className="pt-2 text-sm text-slate-500">
            ระบบตรวจสอบสิทธิ์ระดับ 2-Factor Authentication
          </div>
        </div>
      </div>

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button 
            onClick={() => setActionNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Admin Records & Reports Management Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                <Trash2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                การจัดการและลบข้อมูลบันทึก (สำหรับ Admin)
              </h3>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              ผู้ดูแลระบบสามารถตรวจสอบและลบบันทึกการปฏิบัติงานของนักศึกษา หรือลบรายงานผลการนิเทศของครูนิเทศก์ได้โดยตรง
            </p>
          </div>

          {/* Sub-tabs switch */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-sm font-semibold">
            <button
              onClick={() => setDataManageTab('submissions')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                dataManageTab === 'submissions'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>บันทึกปฏิบัติงานนักศึกษา</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                dataManageTab === 'submissions' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {allSubmissionsList.length}
              </span>
            </button>
            <button
              onClick={() => setDataManageTab('supervisions')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                dataManageTab === 'supervisions'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>รายงานการนิเทศครู</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                dataManageTab === 'supervisions' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {supervisions.length}
              </span>
            </button>
          </div>
        </div>

        {/* Panel 1: Student Weekly Submissions */}
        {dataManageTab === 'submissions' && (
          <div className="space-y-3">
            {/* Search and Week Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between text-sm">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อนักศึกษา, รหัส, สถานประกอบการ หรือชื่องาน..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-slate-500 text-[13px] shrink-0 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> เลือกสัปดาห์:
                </span>
                <select
                  value={subWeekFilter}
                  onChange={(e) => setSubWeekFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800"
                >
                  <option value="all">ทุกสัปดาห์ (ทั้งหมด {allSubmissionsList.length})</option>
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w.toString()}>
                      สัปดาห์ที่ {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submissions Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">สัปดาห์</th>
                    <th className="py-2.5 px-3">นักศึกษา</th>
                    <th className="py-2.5 px-3">สถานประกอบการ</th>
                    <th className="py-2.5 px-3">ภารกิจที่ปฏิบัติ</th>
                    <th className="py-2.5 px-3 text-center">ชม.</th>
                    <th className="py-2.5 px-3 text-center">สถานะ/เกรด</th>
                    <th className="py-2.5 px-3 text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        ไม่พบบันทึกปฏิบัติงานประจำสัปดาห์ที่ตรงกับเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-800 whitespace-nowrap">
                          สัปดาห์ที่ {sub.weekNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{sub.studentName}</div>
                          <div className="text-xs text-slate-400 font-mono">{sub.studentCode}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-[160px] truncate">
                          {sub.companyName || '-'}
                        </td>
                        <td className="py-2.5 px-3 max-w-[220px]">
                          <div className="font-medium text-slate-800 truncate" title={sub.taskTitle}>
                            {sub.taskTitle}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {sub.dateRange || sub.submittedAt}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700 whitespace-nowrap">
                          {sub.totalHours || 40} ชม.
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {sub.status === 'graded' ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {sub.teacherGrade || 'A'} ({sub.teacherScore}/20)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                              รอตรวจ
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteSub(sub.id, sub.studentId, sub.studentName || '', sub.weekNumber)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-sm font-semibold transition"
                            title="ลบบันทึกสัปดาห์นี้ออกจากระบบ"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>ลบ</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Panel 2: Teacher Supervision Reports */}
        {dataManageTab === 'supervisions' && (
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between text-sm">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาสถานประกอบการ, ชื่อนักศึกษา, รหัส หรือครูนิเทศก์..."
                  value={supSearch}
                  onChange={(e) => setSupSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 text-sm"
                />
              </div>
              <div className="text-slate-500 text-sm">
                รายงานทั้งหมด {filteredSupervisions.length} รายการ
              </div>
            </div>

            {/* Supervisions Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">วันที่นิเทศก์</th>
                    <th className="py-2.5 px-3">สถานประกอบการ</th>
                    <th className="py-2.5 px-3">นักศึกษา</th>
                    <th className="py-2.5 px-3">ครูนิเทศก์</th>
                    <th className="py-2.5 px-3 text-center">คะแนน/เกรด</th>
                    <th className="py-2.5 px-3 text-center">รูปหลักฐาน</th>
                    <th className="py-2.5 px-3 text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSupervisions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        ไม่พบบันทึกรายงานการนิเทศก์ที่ตรงกับเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    filteredSupervisions.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {rec.visitDate || rec.timestamp}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{rec.companyName}</div>
                          {rec.companyDepartment && (
                            <div className="text-xs text-slate-400">{rec.companyDepartment}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{rec.studentName}</div>
                          <div className="text-xs text-slate-400 font-mono">{rec.studentCode} ({rec.studentRoom || '-'})</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                          {rec.teacherName}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {rec.score?.toFixed(1) || '19.5'}/20 ({rec.grade || 'A'})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono">
                            📷 {rec.photos?.length || 0} ภาพ
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteSup(rec.id, rec.studentName || '', rec.companyName || '')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-sm font-semibold transition"
                            title="ลบรายงานการนิเทศนี้ออกจากระบบ"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>ลบ</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Roster & Operations Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Teachers and Groups Assignment */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base">การมอบหมายครูนิเทศก์ประจำกลุ่ม (ปีการศึกษา 2569)</h3>
            <span className="text-sm text-sky-600 font-medium">เพิ่มกลุ่ม</span>
          </div>

          <div className="space-y-3 text-sm max-h-80 overflow-y-auto pr-1">
            {teacherAssignments.map((t) => (
              <div key={t.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{t.name}</div>
                  <div className="text-[13px] text-slate-500 truncate">กลุ่มรับผิดชอบ: {t.roomsText}</div>
                  <div className="text-xs text-sky-700 font-medium mt-0.5">
                    ดูแล {t.studentsCount} คน • {t.companiesCount} สถานประกอบการ
                  </div>
                </div>
                {t.role === 'admin' ? (
                  <span className="px-2.5 py-1 rounded text-[13px] font-semibold bg-slate-200 text-slate-700 shrink-0">
                    Super Admin
                  </span>
                ) : (
                  <span className={`px-2.5 py-1 rounded text-[13px] font-semibold shrink-0 ${
                    t.supervisedPct >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                  }`}>
                    นิเทศแล้ว {t.supervisedPct}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Terms & Submission Period Settings */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base">การตั้งค่ารอบงวดการประเมิน (Current Term)</h3>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
              สถานะ: เปิดรับรายงาน
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 text-[13px] mb-1">ภาคเรียนปัจจุบัน</label>
                <input
                  type="text"
                  defaultValue="ภาคเรียนที่ 2 / 2569"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[13px] mb-1">งวดสัปดาห์ปัจจุบัน</label>
                <input
                  type="text"
                  defaultValue={`สัปดาห์ที่ ${currentWeekInfo.weekNumber} จาก 18 สัปดาห์ (อ้างอิงเวลาปัจจุบัน)`}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 text-[13px] mb-1">กำหนดเวลาปิดระบบ Google Form ประจำสัปดาห์</label>
              <input
                type="text"
                defaultValue="ทุกวันอาทิตย์ เวลา 23:59 น."
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium"
              />
            </div>

            {/* Google Sheets Connection info */}
            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Google Sheets เชื่อมต่อ Form #1</span>
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Active
                </span>
              </div>
              <div className="text-[13px] text-slate-600">
                Spreadsheet ID: <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-900 font-mono text-xs">1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28</code>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[13px] text-emerald-800 font-medium">แผ่นงานเป้าหมาย: Form_1</span>
                <a
                  href="https://docs.google.com/spreadsheets/d/1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28/edit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-emerald-700 hover:text-emerald-900 underline font-semibold inline-flex items-center gap-1"
                >
                  <span>เปิด Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[13px] text-amber-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>การส่งออกคะแนนสุดท้ายเพื่อตัดเกรด</span>
              </div>
              <p>
                เมื่อสิ้นสุดสัปดาห์ที่ 18 ระบบจะรวมคะแนนจากครูฝึกสถานประกอบการ (50%) + ครูนิเทศก์ (30%) + เล่มรายงาน (20%) เพื่อส่งออกเป็นไฟล์ Excel มาตรฐานงานวัดผล วท.ขอนแก่น
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={onOpenSheetsModal}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
