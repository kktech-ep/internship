import React, { useMemo, useState } from 'react';
import {
  Printer,
  Download,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Award,
  FileText,
  Calendar,
  Loader2,
  Eye,
  Filter
} from 'lucide-react';
import { Student, WeeklySubmission, Form3SupervisionRecord, AuthUser } from '../types';
import { WEEKS_1_TO_18, getCurrentWeekInfo } from '../data/weeksData';

interface GroupWeeklySummaryA4Props {
  students: Student[];
  roomList: string[];
  mergedSubmissions: Record<string, WeeklySubmission[]>;
  form3List: Form3SupervisionRecord[];
  currentUser?: AuthUser | null;
  onSelectStudentForA4: (studentId: string, weekNum?: number) => void;
}

interface StudentWeekEvalSummary {
  student: Student;
  weekMap: Record<number, WeeklySubmission>;
  submittedWeeksCount: number;
  gradedWeeksCount: number;
  pendingWeeksCount: number;
  accumulatedHours: number;
  latestForm3?: Form3SupervisionRecord;
  avgWeeklyScore: number | null;
  evaluationScore: number | null;
  evaluationGrade: string | null;
  mentorRating: number | null;
}

function getGradeFromScore(score: number): string {
  if (score >= 18) return 'A';
  if (score >= 16) return 'B+';
  if (score >= 14) return 'B';
  if (score >= 12) return 'C+';
  if (score >= 10) return 'C';
  return 'D';
}

export const GroupWeeklySummaryA4: React.FC<GroupWeeklySummaryA4Props> = ({
  students,
  roomList,
  mergedSubmissions,
  form3List,
  currentUser,
  onSelectStudentForA4,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<string>(() => roomList[0] || 'all');
  const [summaryMode, setSummaryMode] = useState<'matrix' | 'weekly'>('matrix');
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(() => getCurrentWeekInfo().weekNumber || 8);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [evalFilter, setEvalFilter] = useState<'all' | 'submitted' | 'evaluated' | 'missing'>('all');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const selectedWeekMeta = useMemo(
    () => WEEKS_1_TO_18.find((w) => w.weekNumber === selectedWeekNum) || WEEKS_1_TO_18[0],
    [selectedWeekNum]
  );

  // Index all submissions by student id / code for fast O(1) lookup
  const submissionsByStudentKey = useMemo(() => {
    const idx = new Map<string, WeeklySubmission[]>();
    const pushSub = (key: string, sub: WeeklySubmission) => {
      if (!key) return;
      const list = idx.get(key) || [];
      list.push(sub);
      idx.set(key, list);
    };

    for (const [mapKey, subs] of Object.entries(mergedSubmissions)) {
      if (!Array.isArray(subs)) continue;
      for (const sub of subs) {
        if (!sub) continue;
        pushSub(mapKey, sub);
        if (sub.studentId) {
          pushSub(sub.studentId, sub);
          pushSub(sub.studentId.replace(/^std-/, ''), sub);
        }
      }
    }
    return idx;
  }, [mergedSubmissions]);

  // Index Form 3 supervision records by studentCode / studentId / name
  const form3ByStudent = useMemo(() => {
    const byCode = new Map<string, Form3SupervisionRecord>();
    const byId = new Map<string, Form3SupervisionRecord>();
    const byName = new Map<string, Form3SupervisionRecord>();

    // form3List is sorted newest-first, so keep the first encountered (latest)
    for (const r of form3List) {
      if (r.studentCode && !byCode.has(r.studentCode)) byCode.set(r.studentCode, r);
      if (r.studentId && !byId.has(r.studentId)) byId.set(r.studentId, r);
      if (r.studentName && !byName.has(r.studentName.trim())) byName.set(r.studentName.trim(), r);
    }
    return { byCode, byId, byName };
  }, [form3List]);

  // Filter students belonging to the selected room (sorted by studentCode)
  const roomStudents = useMemo(() => {
    const list =
      selectedRoom === 'all'
        ? students
        : students.filter((s) => (s.room || '').trim() === selectedRoom.trim());

    return [...list].sort((a, b) => (a.studentCode || '').localeCompare(b.studentCode || ''));
  }, [students, selectedRoom]);

  // Build weekly submission matrix + evaluation summary per student
  const studentSummaries = useMemo<StudentWeekEvalSummary[]>(() => {
    return roomStudents.map((student) => {
      const candidateKeys = Array.from(
        new Set(
          [
            student.id,
            student.studentCode,
            `std-${student.studentCode}`,
            student.id?.replace(/^std-/, '')
          ].filter(Boolean) as string[]
        )
      );

      const weekMap: Record<number, WeeklySubmission> = {};

      for (const key of candidateKeys) {
        const found = submissionsByStudentKey.get(key) || [];
        for (const sub of found) {
          const w = Number(sub.weekNumber);
          if (w >= 1 && w <= 18) {
            const existing = weekMap[w];
            // Prefer 'graded' over 'pending'
            if (!existing || (existing.status !== 'graded' && sub.status === 'graded')) {
              weekMap[w] = sub;
            }
          }
        }
      }

      // Also check localStorage saved submissions for weeks 1..18
      try {
        for (let w = 1; w <= 18; w++) {
          if (weekMap[w]) continue;
          const k1 = `kktech_submission_${student.id}_w${w}`;
          const k2 = `kktech_submission_${student.studentCode}_w${w}`;
          const raw = localStorage.getItem(k1) || localStorage.getItem(k2);
          if (raw) {
            const parsed = JSON.parse(raw) as WeeklySubmission;
            if (parsed && (parsed.dailyLogs || parsed.photos || parsed.taskTitle)) {
              weekMap[w] = parsed;
            }
          }
        }
      } catch {
        // Ignore storage read errors
      }

      const weekSubs = Object.values(weekMap);
      const submittedWeeksCount = weekSubs.length;
      const gradedSubs = weekSubs.filter((s) => s.status === 'graded');
      const gradedWeeksCount = gradedSubs.length;
      const pendingWeeksCount = weekSubs.filter((s) => s.status === 'pending').length;

      const accumulatedHours = weekSubs.reduce((acc, s) => acc + (Number(s.totalHours) || 40), 0);

      const latestForm3 =
        (student.studentCode && form3ByStudent.byCode.get(student.studentCode)) ||
        (student.id && form3ByStudent.byId.get(student.id)) ||
        (student.name && form3ByStudent.byName.get(student.name.trim())) ||
        undefined;

      const weeklyScores = gradedSubs
        .map((s) => Number(s.teacherScore))
        .filter((n) => !isNaN(n) && n > 0);

      const avgWeeklyScore =
        weeklyScores.length > 0
          ? Number((weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length).toFixed(1))
          : null;

      const form3Score =
        latestForm3 && typeof latestForm3.score === 'number' && !isNaN(latestForm3.score)
          ? Number(latestForm3.score.toFixed(1))
          : null;

      const evaluationScore = avgWeeklyScore ?? form3Score;
      const evaluationGrade =
        gradedSubs[0]?.teacherGrade ||
        latestForm3?.grade ||
        (evaluationScore !== null ? getGradeFromScore(evaluationScore) : null);

      const mentorRatings = weekSubs
        .map((s) => Number(s.mentorRating))
        .filter((n) => !isNaN(n) && n > 0);
      const mentorRating =
        mentorRatings.length > 0
          ? Number((mentorRatings.reduce((a, b) => a + b, 0) / mentorRatings.length).toFixed(1))
          : null;

      return {
        student,
        weekMap,
        submittedWeeksCount,
        gradedWeeksCount,
        pendingWeeksCount,
        accumulatedHours,
        latestForm3,
        avgWeeklyScore,
        evaluationScore,
        evaluationGrade,
        mentorRating
      };
    });
  }, [roomStudents, submissionsByStudentKey, form3ByStudent]);

  // Apply search + status filter
  const filteredSummaries = useMemo(() => {
    return studentSummaries.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (item.student.name || '').toLowerCase().includes(q) ||
          (item.student.studentCode || '').toLowerCase().includes(q) ||
          (item.student.companyName || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      if (summaryMode === 'weekly') {
        const weekSub = item.weekMap[selectedWeekNum];
        if (evalFilter === 'submitted' && !weekSub) return false;
        if (evalFilter === 'evaluated' && weekSub?.status !== 'graded' && !item.latestForm3) return false;
        if (evalFilter === 'missing' && Boolean(weekSub)) return false;
      } else {
        if (evalFilter === 'submitted' && item.submittedWeeksCount === 0) return false;
        if (evalFilter === 'evaluated' && item.evaluationScore === null) return false;
        if (evalFilter === 'missing' && item.submittedWeeksCount > 0) return false;
      }
      return true;
    });
  }, [studentSummaries, searchQuery, evalFilter, summaryMode, selectedWeekNum]);

  // Overall group KPIs
  const groupKpis = useMemo(() => {
    const totalStudents = filteredSummaries.length;
    const studentsWithSubmissions =
      summaryMode === 'weekly'
        ? filteredSummaries.filter((s) => Boolean(s.weekMap[selectedWeekNum])).length
        : filteredSummaries.filter((s) => s.submittedWeeksCount > 0).length;

    const evaluatedStudents =
      summaryMode === 'weekly'
        ? filteredSummaries.filter((s) => s.weekMap[selectedWeekNum]?.status === 'graded' || Boolean(s.latestForm3)).length
        : filteredSummaries.filter((s) => s.evaluationScore !== null).length;

    const totalSubmissionsCount = filteredSummaries.reduce((sum, s) => sum + s.submittedWeeksCount, 0);

    const scoredList = filteredSummaries
      .map((s) => (summaryMode === 'weekly' ? s.weekMap[selectedWeekNum]?.teacherScore ?? s.latestForm3?.score : s.evaluationScore))
      .filter((n): n is number => typeof n === 'number' && !isNaN(n) && n > 0);

    const avgScore =
      scoredList.length > 0
        ? (scoredList.reduce((a, b) => a + b, 0) / scoredList.length).toFixed(1)
        : '-';

    return {
      totalStudents,
      studentsWithSubmissions,
      evaluatedStudents,
      totalSubmissionsCount,
      avgScore
    };
  }, [filteredSummaries, summaryMode, selectedWeekNum]);

  const groupSupervisors = useMemo(() => {
    const set = new Set<string>();
    filteredSummaries.forEach((s) => {
      if (s.student.supervisorTeacher && s.student.supervisorTeacher !== '-') {
        set.add(s.student.supervisorTeacher);
      }
    });
    if (set.size === 0 && currentUser?.name && currentUser.role !== 'student') {
      set.add(currentUser.name);
    }
    return Array.from(set).join(', ') || 'ครูนิเทศก์แผนกวิชาช่างไฟฟ้ากำลัง';
  }, [filteredSummaries, currentUser]);

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('group-summary-a4-printable');
    if (!element) {
      window.print();
      return;
    }

    setIsExportingPdf(true);
    try {
      const imgs = Array.from(element.querySelectorAll('img'));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          });
        })
      );

      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = await import('jspdf');

      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = 1;
      colorCanvas.height = 1;
      const colorCtx = colorCanvas.getContext('2d');

      const normalizeColorExpr = (cssText: string): string => {
        if (!colorCtx || (!cssText.includes('oklch') && !cssText.includes('oklab') && !cssText.includes('color-mix'))) {
          return cssText;
        }
        let result = cssText;
        for (let pass = 0; pass < 3; pass++) {
          const prev = result;
          result = result.replace(/(?:oklch|oklab|color-mix)\([^()]*(?:\([^()]*\)[^()]*)*\)/g, (match) => {
            try {
              colorCtx.fillStyle = 'rgba(0, 0, 0, 0)';
              colorCtx.fillStyle = match;
              return colorCtx.fillStyle || '#1e293b';
            } catch {
              return '#1e293b';
            }
          });
          if (result === prev) break;
        }
        return result;
      };

      const canvas = await html2canvas(element, {
        scale: 2.0,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
          styleTags.forEach((tag) => {
            if (tag.textContent) tag.textContent = normalizeColorExpr(tag.textContent);
          });

          const linkTags = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
          if (linkTags.length > 0) {
            try {
              const combinedRules: string[] = [];
              Array.from(document.styleSheets).forEach((sheet) => {
                try {
                  if (sheet.href && sheet.cssRules) {
                    const text = Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
                    combinedRules.push(normalizeColorExpr(text));
                  }
                } catch {
                  // skip cross-origin
                }
              });
              if (combinedRules.length > 0) {
                const injected = clonedDoc.createElement('style');
                injected.textContent = combinedRules.join('\n');
                clonedDoc.head.appendChild(injected);
                linkTags.forEach((lnk) => {
                  const href = lnk.getAttribute('href') || '';
                  if (!href.startsWith('http') || href.startsWith(window.location.origin)) {
                    lnk.remove();
                  }
                });
              }
            } catch {
              // ignore
            }
          }

          const clonedRoot = clonedDoc.getElementById('group-summary-a4-printable');
          if (clonedRoot) {
            clonedRoot.style.width = '210mm';
            clonedRoot.style.maxWidth = '210mm';
            clonedRoot.style.minWidth = '0px';
            clonedRoot.style.minHeight = '0px';
            clonedRoot.style.height = 'auto';
            clonedRoot.style.padding = '8mm';
            clonedRoot.style.margin = '0px';
            clonedRoot.style.backgroundColor = '#ffffff';
            clonedRoot.style.boxShadow = 'none';
            clonedRoot.style.border = 'none';
            clonedRoot.querySelectorAll('.print\\:hidden').forEach((el) => {
              (el as HTMLElement).style.display = 'none';
            });
          }
        }
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      const pageHeightPx = (pageHeight * canvas.width) / pageWidth;

      // Helper: verify slice contains drawn content so trailing white margin never adds a blank page
      const sliceHasInk = (startYPx: number, endYPx: number): boolean => {
        const y0 = Math.max(0, Math.floor(startYPx));
        const y1 = Math.min(canvas.height, Math.ceil(endYPx));
        if (y1 - y0 < 8) return false;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return true;
        const data = ctx.getImageData(0, y0, canvas.width, y1 - y0).data;
        // Sample pixels for speed while detecting any non-white content
        for (let i = 0; i < data.length; i += 16) {
          if (data[i] < 248 || data[i + 1] < 248 || data[i + 2] < 248) {
            return true;
          }
        }
        return false;
      };

      const imgData = canvas.toDataURL('image/jpeg', 0.96);

      // Always render Page 1
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

      // Add subsequent pages only when remaining band actually contains visible content
      let pageIndex = 1;
      while (pageIndex * pageHeight < imgHeight - 4) {
        const startYPx = pageIndex * pageHeightPx;
        const endYPx = (pageIndex + 1) * pageHeightPx;
        if (!sliceHasInk(startYPx, endYPx)) break;

        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -(pageIndex * pageHeight), imgWidth, imgHeight);
        pageIndex++;
      }

      const safeRoom = (selectedRoom === 'all' ? 'ทุกกลุ่ม' : selectedRoom).replace(/[/\\:*?"<>|]/g, '-');
      const scopeSuffix = summaryMode === 'weekly' ? `สัปดาห์ที่${selectedWeekNum}` : '18สัปดาห์';
      pdf.save(`สรุปการส่งงานและคะแนนประเมิน_กลุ่ม_${safeRoom}_${scopeSuffix}.pdf`);
    } catch (err) {
      console.warn('PDF export notice, opening print dialog:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const todayThai = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="space-y-5 print:space-y-0">
      {/* Control Panel (hidden when printing) */}
      <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-4 space-y-3.5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              <span>สรุปการส่งบันทึกปฏิบัติงานประจำสัปดาห์ & คะแนนประเมินตามกลุ่มเรียน</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              เรียกดูสถานะการส่งงานครบ 18 สัปดาห์ (720 ชม.) และผลคะแนนประเมินของนักศึกษาทุกคนในกลุ่มเรียน พร้อมสั่งพิมพ์ A4
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBrowserPrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>สั่งพิมพ์รายงาน (A4)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังสร้าง PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs items-end">
          {/* Room / Group Selector */}
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              กลุ่มเรียน (ห้องเรียน)
            </label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500"
            >
              {roomList.map((r) => {
                const count = students.filter((s) => (s.room || '').trim() === r).length;
                return (
                  <option key={r} value={r}>
                    กลุ่ม {r} ({count} คน)
                  </option>
                );
              })}
              <option value="all">ทุกกลุ่มเรียนทั้งหมด ({students.length} คน)</option>
            </select>
          </div>

          {/* Summary Mode Toggle */}
          <div className="lg:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              รูปแบบตารางสรุป
            </label>
            <div className="inline-flex w-full p-1 bg-slate-200/80 rounded-lg">
              <button
                type="button"
                onClick={() => setSummaryMode('matrix')}
                className={`flex-1 py-1.5 px-2.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  summaryMode === 'matrix'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                สรุปครบ 18 สัปดาห์ (1-18)
              </button>
              <button
                type="button"
                onClick={() => setSummaryMode('weekly')}
                className={`flex-1 py-1.5 px-2.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                  summaryMode === 'weekly'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                รายละเอียดรายสัปดาห์
              </button>
            </div>
          </div>

          {/* Week Picker (for weekly mode) OR Search */}
          {summaryMode === 'weekly' && (
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-sky-600" />
                <span>เลือกสัปดาห์</span>
              </label>
              <select
                value={selectedWeekNum}
                onChange={(e) => setSelectedWeekNum(parseInt(e.target.value, 10))}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500"
              >
                {WEEKS_1_TO_18.map((w) => (
                  <option key={w.weekNumber} value={w.weekNumber}>
                    สัปดาห์ที่ {w.weekNumber}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className={summaryMode === 'weekly' ? 'lg:col-span-3' : 'lg:col-span-2'}>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-500" />
              <span>สถานะ</span>
            </label>
            <select
              value={evalFilter}
              onChange={(e) => setEvalFilter(e.target.value as any)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">ทั้งหมด</option>
              <option value="submitted">ส่งบันทึกแล้ว</option>
              <option value="evaluated">ตรวจประเมินแล้ว</option>
              <option value="missing">ยังไม่ส่งบันทึก</option>
            </select>
          </div>

          {/* Search box (only when matrix mode has 3 cols left, or full width below) */}
          {summaryMode === 'matrix' && (
            <div className="lg:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                ค้นหานักศึกษา / สถานประกอบการ
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="รหัส หรือ ชื่อนักศึกษา..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Printable A4 Sheet */}
      <div className="w-full overflow-x-auto pb-2 flex lg:justify-center print:overflow-visible print:block print:pb-0 group-summary-scroll-wrap">
        <div
          id="group-summary-a4-printable"
          className="bg-white min-w-[740px] print:min-w-0 w-full max-w-[210mm] print:max-w-none min-h-[297mm] print:min-h-0 p-[10mm] print:p-0 shadow-2xl print:shadow-none rounded-sm border print:border-none border-slate-300 text-slate-900 font-sarabun text-[11px] leading-snug shrink-0"
          style={{ boxSizing: 'border-box' }}
        >
          {/* Official Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2.5 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full p-0.5 flex items-center justify-center bg-white shrink-0 overflow-hidden border border-slate-200">
                <img
                  src="./assets/aistudio/LogoKKTech_f25116a9.jpg"
                  alt="ตราสัญลักษณ์ วิทยาลัยเทคนิคขอนแก่น"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950 leading-tight">
                  วิทยาลัยเทคนิคขอนแก่น • แผนกวิชาช่างไฟฟ้ากำลัง
                </h2>
                <p className="text-[12px] font-bold text-slate-800 mt-0.5">
                  แบบสรุปการส่งบันทึกการปฏิบัติงานประจำสัปดาห์ และผลการประเมินการฝึกงานของนักศึกษา
                </p>
                <p className="text-[10px] text-slate-600">
                  {summaryMode === 'weekly'
                    ? `ประจำสัปดาห์ที่ ${selectedWeekNum} (${selectedWeekMeta.dateRange}) • ภาคเรียนที่ 2 ปีการศึกษา 2569`
                    : 'สรุปผลการปฏิบัติงานสะสมตลอดหลักสูตร 18 สัปดาห์ (720 ชั่วโมง) • ภาคเรียนที่ 2 ปีการศึกษา 2569'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block px-2.5 py-0.5 rounded bg-slate-900 text-white font-bold text-[11px]">
                {selectedRoom === 'all' ? 'ทุกกลุ่มเรียน' : `กลุ่มเรียน ${selectedRoom}`}
              </span>
              <div className="text-[10px] text-slate-600 mt-1">
                นักศึกษา: <strong>{groupKpis.totalStudents}</strong> คน
              </div>
            </div>
          </div>

          {/* Group Metadata & Summary KPI Strip */}
          <div className="grid grid-cols-4 gap-2 mb-3 text-[10px]">
            <div className="border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50/70">
              <div className="text-slate-500">จำนวนนักศึกษา</div>
              <div className="font-bold text-slate-900 text-xs">{groupKpis.totalStudents} คน</div>
            </div>
            <div className="border border-slate-300 rounded px-2.5 py-1.5 bg-sky-50/60">
              <div className="text-sky-800">
                {summaryMode === 'weekly' ? `ส่งงานสัปดาห์ที่ ${selectedWeekNum}` : 'มีบันทึกส่งงานแล้ว'}
              </div>
              <div className="font-bold text-sky-900 text-xs">
                {groupKpis.studentsWithSubmissions} / {groupKpis.totalStudents} คน
                {summaryMode === 'matrix' && ` (${groupKpis.totalSubmissionsCount} ครั้ง)`}
              </div>
            </div>
            <div className="border border-slate-300 rounded px-2.5 py-1.5 bg-emerald-50/60">
              <div className="text-emerald-800">ตรวจประเมินผลแล้ว</div>
              <div className="font-bold text-emerald-900 text-xs">
                {groupKpis.evaluatedStudents} / {groupKpis.totalStudents} คน
              </div>
            </div>
            <div className="border border-slate-300 rounded px-2.5 py-1.5 bg-amber-50/60">
              <div className="text-amber-800">คะแนนประเมินเฉลี่ย</div>
              <div className="font-bold text-amber-900 text-xs">
                {groupKpis.avgScore === '-' ? '-' : `${groupKpis.avgScore} / 20`}
              </div>
            </div>
          </div>

          {/* Main Summary Table */}
          {summaryMode === 'matrix' ? (
            <table className="w-full border-collapse border border-slate-800 text-[9.5px]">
              <thead className="bg-slate-100 text-slate-900 font-bold">
                <tr>
                  <th rowSpan={2} className="border border-slate-800 px-1 py-1 text-center w-[7mm]">
                    ที่
                  </th>
                  <th rowSpan={2} className="border border-slate-800 px-1 py-1 text-center w-[21mm]">
                    รหัสนักศึกษา
                  </th>
                  <th rowSpan={2} className="border border-slate-800 px-1.5 py-1 text-left">
                    ชื่อ - สกุล / สถานประกอบการ
                  </th>
                  <th colSpan={18} className="border border-slate-800 px-1 py-0.5 text-center">
                    สถานะส่งบันทึกปฏิบัติงานประจำสัปดาห์ (สัปดาห์ที่ 1 - 18)
                  </th>
                  <th rowSpan={2} className="border border-slate-800 px-1 py-1 text-center w-[11mm]">
                    ส่ง<br />(18)
                  </th>
                  <th rowSpan={2} className="border border-slate-800 px-1 py-1 text-center w-[12mm]">
                    ชม.<br />(720)
                  </th>
                  <th rowSpan={2} className="border border-slate-800 px-1 py-1 text-center w-[16mm]">
                    คะแนน<br />ประเมิน
                  </th>
                  <th rowSpan={2} className="border border-slate-800 px-1 py-1 text-center w-[14mm] print:hidden">
                    ทว.04
                  </th>
                </tr>
                <tr>
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                    <th key={w} className="border border-slate-800 p-0 text-center w-[4.4mm] text-[8.5px]">
                      {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={25} className="border border-slate-800 py-8 text-center text-slate-500 text-xs">
                      ไม่พบรายชื่อนักศึกษาในกลุ่มเรียนที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((item, idx) => (
                    <tr key={item.student.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                      <td className="border border-slate-800 px-1 py-1 text-center font-mono">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-800 px-1 py-1 text-center font-mono">
                        {item.student.studentCode}
                      </td>
                      <td className="border border-slate-800 px-1.5 py-1">
                        <div className="font-bold text-slate-900 leading-tight">{item.student.name}</div>
                        <div className="text-[8px] text-slate-500 truncate max-w-[38mm]">
                          {item.student.companyName || '-'}
                        </div>
                      </td>

                      {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => {
                        const sub = item.weekMap[w];
                        if (!sub) {
                          return (
                            <td
                              key={w}
                              className="border border-slate-800 p-0 text-center text-slate-300"
                              title={`สัปดาห์ที่ ${w}: ยังไม่ส่ง`}
                            >
                              -
                            </td>
                          );
                        }
                        if (sub.status === 'graded') {
                          return (
                            <td
                              key={w}
                              className="border border-slate-800 p-0 text-center font-bold bg-emerald-50 text-emerald-700"
                              title={`สัปดาห์ที่ ${w}: ตรวจแล้ว (${sub.teacherScore}/20)`}
                            >
                              ✓
                            </td>
                          );
                        }
                        return (
                          <td
                            key={w}
                            className="border border-slate-800 p-0 text-center font-bold bg-amber-50 text-amber-700"
                            title={`สัปดาห์ที่ ${w}: ส่งแล้ว (รอตรวจ)`}
                          >
                            ร
                          </td>
                        );
                      })}

                      <td className="border border-slate-800 px-1 py-1 text-center font-mono font-bold">
                        {item.submittedWeeksCount}/18
                      </td>
                      <td className="border border-slate-800 px-1 py-1 text-center font-mono">
                        {item.accumulatedHours}
                      </td>
                      <td className="border border-slate-800 px-1 py-1 text-center font-bold">
                        {item.evaluationScore !== null ? (
                          <span className="text-slate-900">
                            {item.evaluationScore.toFixed(1)}
                            {item.evaluationGrade ? ` (${item.evaluationGrade})` : ''}
                          </span>
                        ) : item.pendingWeeksCount > 0 ? (
                          <span className="text-amber-700 text-[8.5px]">รอตรวจ</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="border border-slate-800 px-1 py-1 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => onSelectStudentForA4(item.student.id)}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[9px] font-semibold cursor-pointer"
                          title={`เปิดดูใบ ทว.04 ของ ${item.student.name}`}
                        >
                          <Eye className="w-2.5 h-2.5" />
                          <span>ดู</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* Detailed Weekly Table for Selected Week */
            <table className="w-full border-collapse border border-slate-800 text-[10px]">
              <thead className="bg-slate-100 text-slate-900 font-bold">
                <tr>
                  <th className="border border-slate-800 px-1.5 py-1.5 text-center w-[8mm]">ที่</th>
                  <th className="border border-slate-800 px-1.5 py-1.5 text-center w-[24mm]">รหัสนักศึกษา</th>
                  <th className="border border-slate-800 px-2 py-1.5 text-left w-[42mm]">ชื่อ - สกุล</th>
                  <th className="border border-slate-800 px-2 py-1.5 text-left">สถานประกอบการ / งานที่ปฏิบัติ</th>
                  <th className="border border-slate-800 px-1.5 py-1.5 text-center w-[22mm]">สถานะส่งงาน</th>
                  <th className="border border-slate-800 px-1.5 py-1.5 text-center w-[13mm]">ชั่วโมง</th>
                  <th className="border border-slate-800 px-1.5 py-1.5 text-center w-[16mm]">พี่เลี้ยง</th>
                  <th className="border border-slate-800 px-1.5 py-1.5 text-center w-[22mm]">คะแนน / เกรด</th>
                  <th className="border border-slate-800 px-1.5 py-1.5 text-center w-[14mm] print:hidden">ทว.04</th>
                </tr>
              </thead>
              <tbody>
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="border border-slate-800 py-8 text-center text-slate-500 text-xs">
                      ไม่พบรายชื่อนักศึกษาตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((item, idx) => {
                    const sub = item.weekMap[selectedWeekNum];
                    const score = sub?.teacherScore ?? item.latestForm3?.score ?? null;
                    const grade =
                      sub?.teacherGrade ||
                      item.latestForm3?.grade ||
                      (score !== null ? getGradeFromScore(score) : null);

                    return (
                      <tr key={item.student.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                        <td className="border border-slate-800 px-1.5 py-1.5 text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-800 px-1.5 py-1.5 text-center font-mono">
                          {item.student.studentCode}
                        </td>
                        <td className="border border-slate-800 px-2 py-1.5 font-bold text-slate-900">
                          {item.student.name}
                          {selectedRoom === 'all' && (
                            <span className="block text-[8.5px] font-normal text-slate-500">
                              กลุ่ม {item.student.room}
                            </span>
                          )}
                        </td>
                        <td className="border border-slate-800 px-2 py-1.5">
                          <div className="font-semibold text-slate-800">{item.student.companyName || '-'}</div>
                          {sub?.taskTitle && (
                            <div className="text-[9px] text-slate-600 line-clamp-1">{sub.taskTitle}</div>
                          )}
                        </td>
                        <td className="border border-slate-800 px-1.5 py-1.5 text-center">
                          {sub ? (
                            sub.status === 'graded' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[9px]">
                                <CheckCircle2 className="w-2.5 h-2.5" /> ตรวจแล้ว
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-[9px]">
                                <Clock className="w-2.5 h-2.5" /> รอตรวจ
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 text-[9px]">ยังไม่ส่ง</span>
                          )}
                        </td>
                        <td className="border border-slate-800 px-1.5 py-1.5 text-center font-mono">
                          {sub ? `${(sub.totalHours || 40).toFixed(0)} ชม.` : '-'}
                        </td>
                        <td className="border border-slate-800 px-1.5 py-1.5 text-center font-mono">
                          {sub?.mentorRating ? `${sub.mentorRating.toFixed(1)}/5` : '-'}
                        </td>
                        <td className="border border-slate-800 px-1.5 py-1.5 text-center font-bold">
                          {score !== null ? (
                            <span className="text-slate-900">
                              {score.toFixed(1)}/20 {grade ? `(${grade})` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="border border-slate-800 px-1.5 py-1.5 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => onSelectStudentForA4(item.student.id, selectedWeekNum)}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[9px] font-semibold cursor-pointer"
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>ดู</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* Legend & Official Signature Block */}
          <div className="break-inside-avoid">
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[9.5px] text-slate-600 border-b border-slate-300 pb-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-slate-800">คำอธิบายสัญลักษณ์:</span>
                <span className="inline-flex items-center gap-1">
                  <span className="px-1.5 py-0.2 bg-emerald-50 border border-emerald-300 text-emerald-700 font-bold rounded-xs">✓</span>
                  <span>ส่งบันทึก & ตรวจประเมินแล้ว</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="px-1.5 py-0.2 bg-amber-50 border border-amber-300 text-amber-700 font-bold rounded-xs">ร</span>
                  <span>ส่งบันทึกแล้ว (รอครูนิเทศก์ตรวจ)</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="px-1.5 py-0.2 bg-white border border-slate-300 text-slate-400 font-bold rounded-xs">-</span>
                  <span>ยังไม่ส่งบันทึก</span>
                </span>
              </div>
              <div>พิมพ์เมื่อวันที่ {todayThai}</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-8 text-center text-[11px] break-inside-avoid">
              <div className="space-y-1">
                <div>ลงชื่อ.......................................................................ครูนิเทศก์</div>
                <div className="font-bold">({groupSupervisors})</div>
                <div className="text-[10px] text-slate-600">ครูผู้รับผิดชอบกลุ่มเรียน {selectedRoom === 'all' ? 'ทั้งหมด' : selectedRoom}</div>
              </div>
              <div className="space-y-1">
                <div>ลงชื่อ.......................................................................หัวหน้าแผนกวิชา</div>
                <div className="font-bold">(นายกิตติศักดิ์ ทิพบุญชู)</div>
                <div className="text-[10px] text-slate-600">หัวหน้าแผนกวิชาช่างไฟฟ้ากำลัง วิทยาลัยเทคนิคขอนแก่น</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
