import React, { useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  RotateCcw,
  Shield,
  Trash2,
} from 'lucide-react';
import {
  Company,
  CourseDataRow,
  Form3SupervisionRecord,
  SheetTeacher,
  Student,
  WeeklySubmission,
} from '../types';
import {
  syncAllLoginSheetRowsToFirebase,
  wipeAndReplaceFirebaseWithSheetData,
  SyncSummary,
} from '../services/sheetFirebaseSyncService';
import { downloadAllWebZip } from '../services/webZipService';
import { formatThaiErrorMessage } from '../utils/thaiErrorUtils';

interface AdminViewProps {
  students: Student[];
  companies: Company[];
  submissions: Record<string, WeeklySubmission[]>;
  form3List: Form3SupervisionRecord[];
  courses: CourseDataRow[];
  teachers: SheetTeacher[];
  onDeleteSubmission: (submissionId: string, studentId: string) => Promise<boolean>;
  onDeleteSupervision: (recordId: string) => Promise<boolean>;
  onOpenSheetsModal: () => void;
  onOpenLookerModal: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  students,
  companies,
  submissions,
  form3List,
  courses,
  teachers,
  onDeleteSubmission,
  onDeleteSupervision,
  onOpenSheetsModal,
  onOpenLookerModal,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null);
  const [deletingForm3Id, setDeletingForm3Id] = useState<string | null>(null);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<{
    type: 'submission' | 'form3';
    id: string;
    studentId?: string;
    label: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allSubmissions = Object.values(submissions).flat().sort((a, b) => b.weekNumber - a.weekNumber);

  const handleSyncSheetToFirestore = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res: SyncSummary = await syncAllLoginSheetRowsToFirebase(true);
      if (res.success) {
        setStatusMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage(
        formatThaiErrorMessage(err, 'ไม่สามารถซิงค์ข้อมูลจาก Google Sheets ได้')
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleWipeAndReplace = async () => {
    setConfirmWipe(false);
    setIsWiping(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await wipeAndReplaceFirebaseWithSheetData();
      if (res.success) {
        setStatusMessage(`รีเซ็ตและซิงค์ข้อมูลใหม่สำเร็จ: ${res.message}`);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage(
        formatThaiErrorMessage(err, 'เกิดข้อผิดพลาดระหว่างรีเซ็ตข้อมูลใน Firestore')
      );
    } finally {
      setIsWiping(false);
    }
  };

  const handleExportZip = async () => {
    setIsDownloadingZip(true);
    setStatusMessage(null);
    setErrorMessage(null);
    const res = await downloadAllWebZip();
    setIsDownloadingZip(false);
    if (res.success) {
      setStatusMessage(res.message);
    } else {
      setErrorMessage(res.message);
    }
  };

  const executeConfirmDelete = async () => {
    if (!confirmDeleteItem) return;
    const item = confirmDeleteItem;
    setConfirmDeleteItem(null);
    setErrorMessage(null);
    setStatusMessage(null);

    if (item.type === 'submission' && item.studentId) {
      setDeletingSubId(item.id);
      try {
        await onDeleteSubmission(item.id, item.studentId);
        setStatusMessage(`ลบบันทึกฝึกงาน "${item.label}" เรียบร้อยแล้ว`);
      } catch (err) {
        setErrorMessage(formatThaiErrorMessage(err, 'ไม่สามารถลบบันทึกฝึกงานได้'));
      } finally {
        setDeletingSubId(null);
      }
    } else if (item.type === 'form3') {
      setDeletingForm3Id(item.id);
      try {
        await onDeleteSupervision(item.id);
        setStatusMessage(`ลบรายงานการนิเทศ "${item.label}" เรียบร้อยแล้ว`);
      } catch (err) {
        setErrorMessage(formatThaiErrorMessage(err, 'ไม่สามารถลบรายงานการนิเทศได้'));
      } finally {
        setDeletingForm3Id(null);
      }
    }
  };

  return (
    <div className="space-y-6 pb-14">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              ศูนย์จัดการระบบ & ฐานข้อมูล (Admin Console)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              จัดการการซิงค์ Google Sheets ⇋ Firebase Firestore และตรวจสอบข้อมูลทั้งหมด
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncSheetToFirestore}
            disabled={isSyncing || isWiping}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ Sheet → Firestore'}</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmWipe(true)}
            disabled={isSyncing || isWiping}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
          >
            <RotateCcw className={`w-4 h-4 ${isWiping ? 'animate-spin' : ''}`} />
            <span>{isWiping ? 'กำลังรีเซ็ต...' : 'รีเซ็ตข้อมูลจาก Sheet ใหม่'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportZip}
            disabled={isDownloadingZip}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
          >
            {isDownloadingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>สำรองข้อมูล (.zip)</span>
          </button>

          <button
            type="button"
            onClick={onOpenSheetsModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>ดูตาราง</span>
          </button>

          <button
            type="button"
            onClick={onOpenLookerModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-indigo-300" />
            <span>Looker</span>
          </button>
        </div>
      </div>

      {/* Inline Confirmations & Status Alerts */}
      {confirmWipe && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>ยืนยันการล้างข้อมูลนักศึกษา/ครู/รายวิชา/บริษัทเดิมใน Firestore และดึงใหม่จาก Google Sheets ทั้งหมด?</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmWipe(false)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-700 font-semibold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleWipeAndReplace}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
            >
              ยืนยันรีเซ็ตข้อมูล
            </button>
          </div>
        </div>
      )}

      {confirmDeleteItem && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <Trash2 className="w-5 h-5 text-rose-600 shrink-0" />
            <span>ยืนยันการลบ "{confirmDeleteItem.label}" ออกจาก Firestore ถาวร?</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteItem(null)}
              className="px-3 py-1.5 rounded-lg border border-rose-200 bg-white text-slate-700 font-semibold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={executeConfirmDelete}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
            >
              ยืนยันการลบ
            </button>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="flex-1">{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2 font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
        </div>
      )}

      {/* Database Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">นักศึกษา</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{students.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">ครูนิเทศก์</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{teachers.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">สถานประกอบการ</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{companies.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">รายวิชา (data)</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{courses.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">บันทึกสัปดาห์ / นิเทศ</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {allSubmissions.length} / {form3List.length}
          </div>
        </div>
      </div>

      {/* Form 3 Supervision Management */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-slate-900 text-sm">
              จัดการรายงานการนิเทศ Form 3 ({form3List.length} รายการ)
            </h2>
          </div>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="p-3">วัน/เวลานิเทศ</th>
                <th className="p-3">นักศึกษา</th>
                <th className="p-3">สถานประกอบการ</th>
                <th className="p-3">ครูนิเทศก์</th>
                <th className="p-3">คะแนน</th>
                <th className="p-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {form3List.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50">
                  <td className="p-3 text-slate-600">{rec.visitDate || rec.timestamp}</td>
                  <td className="p-3 font-semibold text-slate-900 max-w-xs">
                    <div>
                      {rec.studentName}
                      {(rec.studentCount || rec.studentNames?.length || 1) > 1 && (
                        <span className="ml-1.5 inline-block px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">
                          {rec.studentCount || rec.studentNames?.length} คน
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">{rec.studentCode}</div>
                  </td>
                  <td className="p-3 text-slate-700">{rec.companyName}</td>
                  <td className="p-3 text-slate-600">{rec.teacherName}</td>
                  <td className="p-3 font-bold text-emerald-700">
                    {rec.score}/20 ({rec.grade})
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      disabled={deletingForm3Id === rec.id}
                      onClick={() =>
                        setConfirmDeleteItem({
                          type: 'form3',
                          id: rec.id,
                          label: `นิเทศ ${rec.studentName} (${rec.visitDate})`,
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletingForm3Id === rec.id ? 'กำลังลบ...' : 'ลบ'}</span>
                    </button>
                  </td>
                </tr>
              ))}
              {form3List.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    ยังไม่มีรายงานการนิเทศในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly Submissions Management */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-600" />
            <h2 className="font-bold text-slate-900 text-sm">
              จัดการรายงานปฏิบัติงานรายสัปดาห์ ({allSubmissions.length} ฉบับ)
            </h2>
          </div>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="p-3">สัปดาห์</th>
                <th className="p-3">นักศึกษา</th>
                <th className="p-3">หัวข้องาน</th>
                <th className="p-3">ชั่วโมง</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allSubmissions.map((sub) => {
                const st = students.find((s) => s.id === sub.studentId);
                return (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-sky-700">สัปดาห์ที่ {sub.weekNumber}</td>
                    <td className="p-3 font-semibold text-slate-900">
                      {st ? `${st.name} (${st.studentCode})` : sub.studentId}
                    </td>
                    <td className="p-3 text-slate-700 max-w-xs truncate">{sub.taskTitle}</td>
                    <td className="p-3 font-mono">{sub.totalHours} ชม.</td>
                    <td className="p-3">
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
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        disabled={deletingSubId === sub.id}
                        onClick={() =>
                          setConfirmDeleteItem({
                            type: 'submission',
                            id: sub.id,
                            studentId: sub.studentId,
                            label: `${st?.name || sub.studentId} สัปดาห์ที่ ${sub.weekNumber}`,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{deletingSubId === sub.id ? 'กำลังลบ...' : 'ลบ'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {allSubmissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    ยังไม่มีรายงานปฏิบัติงานรายสัปดาห์ในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
