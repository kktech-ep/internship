import React from 'react';
import {
  Award,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  GraduationCap,
  X,
} from 'lucide-react';
import {
  Company,
  Form3SupervisionRecord,
  Student,
  WeeklySubmission,
} from '../../types';
import { getStudentEvaluationSummary } from '../../utils/dataUnifier';

interface LookerStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  companies: Company[];
  submissions: Record<string, WeeklySubmission[]>;
  form3List: Form3SupervisionRecord[];
}

export const LookerStudioModal: React.FC<LookerStudioModalProps> = ({
  isOpen,
  onClose,
  students,
  companies,
  submissions,
  form3List,
}) => {
  if (!isOpen) return null;

  const supervisedCompaniesCount = companies.filter((c) => c.status === 'completed').length;
  const supervisionPercent =
    companies.length > 0 ? Math.round((supervisedCompaniesCount / companies.length) * 100) : 0;

  const allSubs = Object.values(submissions).flat();
  const gradedCount = allSubs.filter((s) => s.status === 'graded').length;
  const pendingCount = allSubs.filter((s) => s.status === 'pending').length;

  const evaluatedStudents = students.filter((s) => {
    const summary = getStudentEvaluationSummary(s, submissions, form3List);
    return summary.evaluationScore !== null;
  });

  const avgScore =
    form3List.length > 0
      ? (
          form3List.reduce((acc, r) => acc + (Number(r.score) || 0), 0) / form3List.length
        ).toFixed(2)
      : '-';

  // Group counts by room
  const roomMap = new Map<string, { total: number; supervised: number }>();
  students.forEach((s) => {
    const r = s.room || 'ไม่ระบุห้อง';
    const cur = roomMap.get(r) || { total: 0, supervised: 0 };
    cur.total++;
    const summary = getStudentEvaluationSummary(s, submissions, form3List);
    if (summary.latestForm3) cur.supervised++;
    roomMap.set(r, cur);
  });
  const roomStats = Array.from(roomMap.entries()).sort((a, b) => a[0].localeCompare(b[0], 'th'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-sky-950 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                Looker Studio Analytics — สรุปผลการฝึกอาชีพ & การนิเทศ 2/2569
              </h3>
              <p className="text-xs text-slate-300">
                รายงานสถิติแบบเรียลไทม์จาก Firebase Firestore & Google Sheets
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-1">
              <div className="flex items-center justify-between text-sky-700 text-xs font-semibold">
                <span>นักศึกษาทั้งหมด</span>
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{students.length} คน</div>
              <div className="text-[11px] text-slate-500">
                นิเทศประเมินแล้ว {evaluatedStudents.length} คน
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
                <span>สถานประกอบการ</span>
                <Building2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{companies.length} แห่ง</div>
              <div className="text-[11px] text-emerald-700 font-medium">
                นิเทศแล้ว {supervisedCompaniesCount} แห่ง ({supervisionPercent}%)
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
              <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
                <span>รายงานสัปดาห์</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{allSubs.length} ฉบับ</div>
              <div className="text-[11px] text-slate-600">
                ตรวจแล้ว {gradedCount} • รอตรวจ {pendingCount}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1">
              <div className="flex items-center justify-between text-indigo-700 text-xs font-semibold">
                <span>คะแนนนิเทศเฉลี่ย</span>
                <Award className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{avgScore} / 20</div>
              <div className="text-[11px] text-indigo-700 font-medium">
                จากบันทึก Form 3 ทั้งหมด {form3List.length} รายการ
              </div>
            </div>
          </div>

          {/* Supervision Coverage Bar */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">
                ความคืบหน้าการออกนิเทศสถานประกอบการ
              </span>
              <span className="text-sm font-bold text-emerald-700">{supervisionPercent}%</span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${supervisionPercent}%` }}
              />
            </div>
          </div>

          {/* Room Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600" />
              <span>สรุปการนิเทศจำแนกตามกลุ่มห้องเรียน</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roomStats.map(([room, stat]) => {
                const pct = stat.total > 0 ? Math.round((stat.supervised / stat.total) * 100) : 0;
                return (
                  <div
                    key={room}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{room}</span>
                      <span className="text-slate-600">
                        นิเทศแล้ว {stat.supervised}/{stat.total} คน ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
