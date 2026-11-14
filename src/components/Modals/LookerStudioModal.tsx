import React, { useMemo } from 'react';
import { X, ExternalLink, BarChart3, TrendingUp, CheckCircle } from 'lucide-react';
import { Student, Company, WeeklySubmission, Form3SupervisionRecord } from '../../types';
import { getCurrentWeekInfo } from '../../data/weeksData';

interface LookerStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  students?: Student[];
  companies?: Company[];
  submissions?: Record<string, WeeklySubmission[]>;
  form3List?: Form3SupervisionRecord[];
}

export const LookerStudioModal: React.FC<LookerStudioModalProps> = ({
  isOpen,
  onClose,
  students = [],
  companies = [],
  submissions = {},
  form3List = [],
}) => {
  const analytics = useMemo(() => {
    const totalStudents = students.length;
    const allSubs = Object.values(submissions).flat();

    // Level breakdown
    const pvs2Count = students.filter(s => (s.level || '').includes('ปวส.2') || (s.room || '').includes('2/')).length;
    const pvs1Count = students.filter(s => (s.level || '').includes('ปวส.1') || (s.room || '').includes('1/')).length;
    const otherLevelCount = Math.max(0, totalStudents - pvs2Count - pvs1Count);

    // Distinct active companies from students (fallback to companies collection)
    const companyGroups = new Map<string, { studentsCount: number; sectorKey: 'pea' | 'factory' | 'solar' | 'building' }>();
    students.forEach((s) => {
      const cName = (s.companyName || '').trim();
      if (!cName || cName === 'ยังไม่ระบุสถานประกอบการ' || cName === '-') return;
      if (!companyGroups.has(cName)) {
        let sectorKey: 'pea' | 'factory' | 'solar' | 'building' = 'building';
        if (cName.includes('การไฟฟ้า') || cName.includes('กฟภ') || cName.includes('กฟผ') || cName.includes('PEA') || cName.includes('EGAT')) {
          sectorKey = 'pea';
        } else if (cName.includes('โซล่าร์') || cName.includes('Solar') || cName.includes('พลังงาน')) {
          sectorKey = 'solar';
        } else if (cName.includes('อุตสาหกรรม') || cName.includes('ผลิต') || cName.includes('มิตซูบิชิ') || cName.includes('คูโบต้า') || cName.includes('น้ำตาล') || cName.includes('โรงงาน')) {
          sectorKey = 'factory';
        }
        companyGroups.set(cName, { studentsCount: 0, sectorKey });
      }
      companyGroups.get(cName)!.studentsCount++;
    });

    const totalCompanies = companyGroups.size > 0 ? companyGroups.size : companies.length;

    // Sector aggregation
    const sectors = {
      pea: { label: 'สถานีไฟฟ้าแรงสูง / PEA / EGAT', companies: 0, students: 0, color: 'bg-sky-600' },
      factory: { label: 'โรงงานอุตสาหกรรม / ตู้ MDB / PLC', companies: 0, students: 0, color: 'bg-indigo-600' },
      solar: { label: 'Solar Cell & พลังงานแสงอาทิตย์', companies: 0, students: 0, color: 'bg-amber-500' },
      building: { label: 'งานติดตั้งระบบไฟฟ้าอาคาร & บริการ', companies: 0, students: 0, color: 'bg-emerald-600' },
    };
    companyGroups.forEach((info) => {
      sectors[info.sectorKey].companies += 1;
      sectors[info.sectorKey].students += info.studentsCount;
    });

    const sectorRows = Object.values(sectors).map((sec) => ({
      ...sec,
      percent: totalCompanies > 0 ? Math.round((sec.companies / totalCompanies) * 100) : 0,
    }));

    // Supervised students & average competency score
    const supervisedStudentKeys = new Set<string>();
    form3List.forEach(r => {
      if (r.studentId) supervisedStudentKeys.add(r.studentId);
      if (r.studentCode) supervisedStudentKeys.add(r.studentCode);
    });
    const submittedStudentIds = new Set<string>();
    allSubs.forEach(sub => {
      if (sub.studentId) submittedStudentIds.add(sub.studentId);
    });

    const engagedStudentsCount = students.filter(
      s => supervisedStudentKeys.has(s.id) || supervisedStudentKeys.has(s.studentCode) || submittedStudentIds.has(s.id)
    ).length;

    const activityRate = totalStudents > 0
      ? Math.round((engagedStudentsCount / totalStudents) * 1000) / 10
      : 0;

    // Average score from Form 3 records + graded submissions
    const allScores: number[] = [];
    form3List.forEach(r => { if (typeof r.score === 'number' && r.score > 0) allScores.push(r.score); });
    allSubs.forEach(sub => { if (sub.status === 'graded' && typeof sub.teacherScore === 'number' && sub.teacherScore > 0) allScores.push(sub.teacherScore); });
    const avgScore = allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
      : 0;
    const avgGrade = avgScore >= 18 ? 'ดีเยี่ยม (A)' : avgScore >= 16 ? 'ดีมาก (B+)' : avgScore >= 14 ? 'ดี (B)' : avgScore > 0 ? 'ผ่านเกณฑ์' : 'รอข้อมูลประเมิน';

    // Weekly activity bars (W1 - W8 or up to current week)
    const currentWeekNum = Math.max(8, getCurrentWeekInfo().weekNumber || 8);
    const startWeek = Math.max(1, currentWeekNum - 7);
    const weeklyBars = Array.from({ length: 8 }, (_, idx) => {
      const w = startWeek + idx;
      const count = allSubs.filter(s => s.weekNumber === w).length;
      const pct = totalStudents > 0 ? Math.min(100, Math.round((count / totalStudents) * 100)) : 0;
      return {
        w: `W${w}`,
        count,
        val: Math.max(8, pct),
        label: count > 0 ? `${count} รายการ` : '0',
        active: w === currentWeekNum
      };
    });

    const ppePassedCount = form3List.filter(r => r.safetyPassed).length;
    const ppePercent = form3List.length > 0 ? Math.round((ppePassedCount / form3List.length) * 100) : 100;

    return {
      totalStudents,
      pvs2Count,
      pvs1Count,
      otherLevelCount,
      totalCompanies,
      activityRate,
      engagedStudentsCount,
      allSubsCount: allSubs.length,
      avgScore,
      avgGrade,
      sectorRows,
      weeklyBars,
      ppePercent,
      form3Count: form3List.length,
    };
  }, [students, companies, submissions, form3List]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-950 text-white p-4 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Looker Studio Enterprise Dashboard</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Firestore Synced
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                แดชบอร์ดสรุปผลการนิเทศและติดตามสมรรถนะนักศึกษา แผนกวิชาช่างไฟฟ้ากำลัง ขอนแก่น
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 text-xs">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-[11px]">ความครอบคลุมส่งงาน/นิเทศ</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{analytics.activityRate}%</div>
              <div className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                <TrendingUp className="w-3 h-3" />
                <span>{analytics.engagedStudentsCount}/{analytics.totalStudents} คน ({analytics.allSubsCount} บันทึกสัปดาห์)</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-[11px]">นักศึกษาในระบบทั้งหมด</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{analytics.totalStudents} คน</div>
              <div className="text-[10px] text-slate-500 mt-1">
                ปวส.2: {analytics.pvs2Count} | ปวส.1: {analytics.pvs1Count}{analytics.otherLevelCount > 0 ? ` | อื่นๆ: ${analytics.otherLevelCount}` : ''}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-[11px]">สถานประกอบการฝึกจริง</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{analytics.totalCompanies} แห่ง</div>
              <div className="text-[10px] text-sky-600 mt-1">นิเทศแล้ว {analytics.form3Count} รายการ</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-[11px]">คะแนนสมรรถนะเฉลี่ย</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {analytics.avgScore > 0 ? `${analytics.avgScore.toFixed(1)} / 20` : '- / 20'}
              </div>
              <div className="text-[10px] text-emerald-600 mt-1">{analytics.avgGrade}</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1: Sector Breakdown */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800">การกระจายตัวสายงานไฟฟ้าที่ฝึกจริง</span>
                <span className="text-[11px] text-slate-400">{analytics.totalCompanies} สถานประกอบการ</span>
              </div>
              <div className="space-y-2.5">
                {analytics.sectorRows.map((sec) => (
                  <div key={sec.label}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600">{sec.label} ({sec.percent}%)</span>
                      <span className="font-semibold text-slate-800">{sec.companies} แห่ง ({sec.students} คน)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className={`${sec.color} h-2.5 rounded-full transition-all`} style={{ width: `${sec.percent}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Weekly Submission Progress */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800">สถิติการส่งบันทึกการฝึกงานรายสัปดาห์ (ข้อมูลจริง)</span>
                <span className="text-[11px] text-emerald-600 font-medium">รวม {analytics.allSubsCount} รายการ</span>
              </div>
              <div className="flex items-end gap-2 h-36 pt-4 px-2">
                {analytics.weeklyBars.map((bar) => (
                  <div key={bar.w} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[9px] text-slate-500 font-mono">{bar.count}</span>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        bar.active ? 'bg-amber-500' : bar.count > 0 ? 'bg-sky-600' : 'bg-slate-200'
                      }`}
                      style={{ height: `${bar.val}%` }}
                    ></div>
                    <span className="text-[10px] font-semibold text-slate-700 mt-1">{bar.w}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Safety Compliance Metric */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">การปฏิบัติตามมาตรฐานความปลอดภัย PPE & LOTO: {analytics.ppePercent}%</div>
                <div className="text-[11px] text-slate-400">
                  ประมวลผลสดจากบันทึกการนิเทศทั้งหมด {analytics.form3Count} รายการในฐานข้อมูล Firestore
                </div>
              </div>
            </div>
            <a
              href="https://lookerstudio.google.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition"
            >
              <span>เปิดดู Looker Studio แบบเต็มหน้าจอ</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
