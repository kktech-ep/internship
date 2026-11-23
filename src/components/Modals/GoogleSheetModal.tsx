import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Database,
  ExternalLink,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react';
import {
  CourseDataRow,
  Form3SupervisionRecord,
  Student,
  WeeklySubmission,
} from '../../types';
import { GOOGLE_SHEET_CONFIG } from '../../services/googleSheetsService';
import {
  syncAllLoginSheetRowsToFirebase,
  SyncSummary,
} from '../../services/sheetFirebaseSyncService';
import { formatThaiErrorMessage } from '../../utils/thaiErrorUtils';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  submissions: Record<string, WeeklySubmission[]>;
  form3List: Form3SupervisionRecord[];
  courses: CourseDataRow[];
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  students,
  submissions,
  form3List,
  courses,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'form2' | 'form3' | 'data'>('login');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncSummary | null>(null);

  if (!isOpen) return null;

  const allSubmissions = Object.values(submissions).flat();
  const q = searchQuery.trim().toLowerCase();

  const filteredStudents = students.filter(
    (s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.studentCode.toLowerCase().includes(q) ||
      s.companyName.toLowerCase().includes(q) ||
      s.room.toLowerCase().includes(q)
  );

  const filteredSubmissions = allSubmissions.filter((sub) => {
    if (!q) return true;
    const st = students.find((s) => s.id === sub.studentId);
    return (
      sub.taskTitle.toLowerCase().includes(q) ||
      (st?.name || '').toLowerCase().includes(q) ||
      (st?.studentCode || '').includes(q)
    );
  });

  const filteredForm3 = form3List.filter(
    (r) =>
      !q ||
      r.studentName.toLowerCase().includes(q) ||
      (r.studentCode || '').toLowerCase().includes(q) ||
      r.companyName.toLowerCase().includes(q) ||
      r.teacherName.toLowerCase().includes(q)
  );

  const filteredCourses = courses.filter(
    (c) =>
      !q ||
      c.subjectCode.toLowerCase().includes(q) ||
      c.subjectName.toLowerCase().includes(q) ||
      c.teacherName.toLowerCase().includes(q) ||
      c.room.toLowerCase().includes(q)
  );

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncAllLoginSheetRowsToFirebase(true);
      setSyncResult(res);
    } catch (err) {
      setSyncResult({
        success: false,
        message: formatThaiErrorMessage(err, 'ซิงค์ข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'),
        studentsCount: 0,
        teachersCount: 0,
        coursesCount: 0,
        companiesCount: 0,
        syncedAt: new Date().toISOString(),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                ฐานข้อมูลเชื่อมโยง Google Sheets ⇋ Firebase Firestore
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                Sheet ID: {GOOGLE_SHEET_CONFIG.spreadsheetId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์จาก Sheet เดี๋ยวนี้'}</span>
            </button>
            <a
              href={GOOGLE_SHEET_CONFIG.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
            >
              <span>เปิด Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Banner */}
        {syncResult && (
          <div
            className={`px-5 py-3 border-b text-xs flex items-center gap-2 ${
              syncResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {syncResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{syncResult.message}</span>
          </div>
        )}

        {/* Tabs & Search */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>แผ่นงาน login ({students.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('form2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'form2'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>บันทึกประจำสัปดาห์ ({allSubmissions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('form3')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'form3'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>แผ่นงาน Form_3 ({form3List.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'data'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>แผ่นงาน data รายวิชา ({courses.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาในตาราง..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'login' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="p-2.5">รหัสนักศึกษา</th>
                  <th className="p-2.5">ชื่อ-สกุล</th>
                  <th className="p-2.5">ห้อง/ระดับ</th>
                  <th className="p-2.5">สถานประกอบการ</th>
                  <th className="p-2.5">พี่เลี้ยง</th>
                  <th className="p-2.5">พิกัด GPS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.slice(0, 100).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono font-semibold text-slate-800">{s.studentCode}</td>
                    <td className="p-2.5 font-semibold text-slate-900">{s.name}</td>
                    <td className="p-2.5 text-slate-600">{s.room} ({s.level})</td>
                    <td className="p-2.5 text-slate-700">{s.companyName}</td>
                    <td className="p-2.5 text-slate-600">{s.companyRegistration?.mentorName || '-'}</td>
                    <td className="p-2.5 font-mono text-[11px] text-slate-500">
                      {s.companyRegistration?.gpsCoordinates || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'form2' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="p-2.5">สัปดาห์</th>
                  <th className="p-2.5">นักศึกษา</th>
                  <th className="p-2.5">หัวข้องาน</th>
                  <th className="p-2.5">ชั่วโมง</th>
                  <th className="p-2.5">สถานะ</th>
                  <th className="p-2.5">คะแนน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.slice(0, 100).map((sub) => {
                  const st = students.find((s) => s.id === sub.studentId);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-sky-700">ส.{sub.weekNumber}</td>
                      <td className="p-2.5 font-semibold text-slate-900">
                        {st ? `${st.name} (${st.studentCode})` : sub.studentId}
                      </td>
                      <td className="p-2.5 text-slate-700">{sub.taskTitle}</td>
                      <td className="p-2.5 font-mono">{sub.totalHours} ชม.</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.status === 'graded'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {sub.status === 'graded' ? 'ตรวจแล้ว' : 'รอตรวจ'}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-bold">
                        {sub.status === 'graded' ? `${sub.teacherScore}/20 (${sub.teacherGrade})` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'form3' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="p-2.5">วันที่นิเทศ</th>
                  <th className="p-2.5">นักศึกษา</th>
                  <th className="p-2.5">สถานประกอบการ</th>
                  <th className="p-2.5">ครูนิเทศก์</th>
                  <th className="p-2.5">คะแนน</th>
                  <th className="p-2.5">รูปถ่าย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredForm3.slice(0, 100).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-2.5 text-slate-600">{r.visitDate || r.timestamp}</td>
                    <td className="p-2.5 font-semibold text-slate-900 max-w-xs">
                      <div>{r.studentName}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {r.studentCode}
                        {(r.studentCount || r.studentNames?.length || 1) > 1 && (
                          <span className="ml-1 text-sky-700 font-bold">
                            ({r.studentCount || r.studentNames?.length} คน)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2.5 text-slate-700">{r.companyName}</td>
                    <td className="p-2.5 text-slate-600">{r.teacherName}</td>
                    <td className="p-2.5 font-bold text-emerald-700">
                      {r.score}/20 ({r.grade})
                    </td>
                    <td className="p-2.5 font-mono text-slate-500">{r.photos?.length || 0} รูป</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'data' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="p-2.5">กลุ่มห้อง</th>
                  <th className="p-2.5">รหัสวิชา</th>
                  <th className="p-2.5">ชื่อรายวิชา</th>
                  <th className="p-2.5">ครูผู้สอน / นิเทศก์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map((c, idx) => (
                  <tr key={`${c.room}-${c.subjectCode}-${idx}`} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono font-semibold text-sky-700">{c.room}</td>
                    <td className="p-2.5 font-mono text-slate-700">{c.subjectCode}</td>
                    <td className="p-2.5 font-medium text-slate-900">{c.subjectName}</td>
                    <td className="p-2.5 text-slate-700">{c.teacherName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
