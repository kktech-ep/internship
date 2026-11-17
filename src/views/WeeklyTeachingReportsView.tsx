import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  Layers,
  Plus,
  Search,
  Sparkles,
  User,
  Users,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import {
  AuthUser,
  CourseDataRow,
  Form3SupervisionRecord,
  SheetTeacher,
  Student,
  TeachingReportRecord,
  WeeklySubmission,
} from '../types';
import { getWeekDates, getCurrentWeekInfo } from '../data/weeksData';
import { getAllLoginSheetTeachers } from '../services/sheetAuthService';
import { getAllTeachersFromData } from '../services/courseDataService';
import { subscribeTeachingReports } from '../services/firestoreService';
import {
  WorkplaceTeachingReportView,
  toSafeTeachingReportId,
} from './WorkplaceTeachingReportView';

interface WeeklyTeachingReportsViewProps {
  currentUser?: AuthUser | null;
  students: Student[];
  form3List: Form3SupervisionRecord[];
  submissions: Record<string, WeeklySubmission[]>;
  courses?: CourseDataRow[];
  teachers?: SheetTeacher[];
  teachingReports?: TeachingReportRecord[];
  initialTeacherFilter?: string;
  initialHighlightWeek?: number;
  onTeachingReportSaved?: (report: TeachingReportRecord) => void;
}

const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

function formatThaiDateFull(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${THAI_MONTHS_FULL[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function formatThaiDateTime(isoStr?: string): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeTeacherName(name?: string): string {
  return (name || '')
    .replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, '')
    .trim()
    .toLowerCase();
}

export const WeeklyTeachingReportsView: React.FC<WeeklyTeachingReportsViewProps> = ({
  currentUser,
  students,
  form3List,
  submissions,
  courses,
  teachers: propTeachers,
  teachingReports: propTeachingReports,
  initialTeacherFilter,
  initialHighlightWeek,
  onTeachingReportSaved,
}) => {
  const [reports, setReports] = useState<TeachingReportRecord[]>(() => propTeachingReports || []);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(() => !(propTeachingReports && propTeachingReports.length > 0));
  const [loadError, setLoadError] = useState<string | null>(null);

  // Keep synced with App-level teachingReports (instant updates right after saving)
  useEffect(() => {
    if (!propTeachingReports) return;
    setReports((prev) => {
      const map = new Map<string, TeachingReportRecord>();
      prev.forEach((r) => {
        if (r && r.id) map.set(r.id, r);
      });
      propTeachingReports.forEach((r) => {
        if (r && r.id) map.set(r.id, r);
      });
      return Array.from(map.values());
    });
    setIsLoadingReports(false);
  }, [propTeachingReports]);

  // Real-time subscription to Firestore /teaching_reports
  useEffect(() => {
    const unsub = subscribeTeachingReports(
      (items) => {
        setReports((prev) => {
          const map = new Map<string, TeachingReportRecord>();
          prev.forEach((r) => {
            if (r && r.id) map.set(r.id, r);
          });
          items.forEach((r) => {
            if (r && r.id) map.set(r.id, r);
          });
          return Array.from(map.values());
        });
        setIsLoadingReports(false);
        setLoadError(null);
      },
      (err) => {
        setIsLoadingReports(false);
        setLoadError(err.message || 'ไม่สามารถเชื่อมต่อฐานข้อมูลรายงานการสอนได้');
      }
    );
    return () => unsub();
  }, []);

  // Build canonical teacher list matching WorkplaceTeachingReportView
  const allTeachers = useMemo(() => {
    const list =
      propTeachers && propTeachers.length > 0 ? propTeachers : getAllLoginSheetTeachers();
    const sheetTeacherNames = getAllTeachersFromData(
      courses && courses.length > 0 ? courses : undefined
    );
    const map = new Map<string, string>();
    const addName = (raw?: string) => {
      if (!raw) return;
      raw.split(/[,/]+/).forEach((part) => {
        const clean = part.trim();
        if (clean && clean !== '-' && !clean.includes('สุพรรณี')) {
          map.set(clean, clean);
        }
      });
    };
    list.forEach((t) => addName(t.name));
    sheetTeacherNames.forEach((n) => addName(n));
    form3List.forEach((r) => addName(r.teacherName));
    reports.forEach((r) => addName(r.reporterName));
    if (!map.has('นายทักษิณ โสภาปิยะ')) {
      map.set('นายทักษิณ โสภาปิยะ', 'นายทักษิณ โสภาปิยะ');
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'th'));
  }, [propTeachers, courses, form3List, reports]);

  const defaultTeacher = useMemo(() => {
    if (currentUser?.name && !currentUser.name.includes('นักศึกษา')) {
      const cleanCurr = normalizeTeacherName(currentUser.name);
      const exact = allTeachers.find((t) => {
        const cleanT = normalizeTeacherName(t);
        return cleanT === cleanCurr || cleanT.includes(cleanCurr) || cleanCurr.includes(cleanT);
      });
      if (exact) return exact;
    }
    return allTeachers.find((t) => t === 'นายทักษิณ โสภาปิยะ') || allTeachers[0] || 'นายทักษิณ โสภาปิยะ';
  }, [currentUser, allTeachers]);

  const currentWeekNumber = useMemo(() => getCurrentWeekInfo().weekNumber || 1, []);

  // Filters & workspace sub-mode ('overview' | 'editor')
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>(
    () => initialTeacherFilter || defaultTeacher
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'saved' | 'unsaved'>('all');
  const [weekSearch, setWeekSearch] = useState<string>('');
  const [subMode, setSubMode] = useState<'overview' | 'editor'>('overview');
  const [editorState, setEditorState] = useState<{
    teacherName: string;
    weekNumber: number;
    openPreview: boolean;
    sessionKey: number;
  }>(() => ({
    teacherName: initialTeacherFilter || defaultTeacher,
    weekNumber: initialHighlightWeek || currentWeekNumber,
    openPreview: false,
    sessionKey: 0,
  }));

  // Sync teacher filter when navigated immediately after saving a teaching report
  useEffect(() => {
    if (initialTeacherFilter) {
      setSelectedTeacherFilter(initialTeacherFilter);
    }
  }, [initialTeacherFilter]);

  // Keep default teacher aligned once user/teachers load if still at initial fallback
  useEffect(() => {
    if (selectedTeacherFilter !== 'all' && !allTeachers.includes(selectedTeacherFilter)) {
      setSelectedTeacherFilter(defaultTeacher);
    }
  }, [allTeachers, defaultTeacher, selectedTeacherFilter]);

  // Index saved reports by ID and by normalized teacherKey + weekNumber
  const reportsById = useMemo(() => {
    const map = new Map<string, TeachingReportRecord>();
    reports.forEach((r) => {
      if (r && r.id) map.set(r.id, r);
    });
    return map;
  }, [reports]);

  const findSavedReport = (teacherName: string, weekNumber: number): TeachingReportRecord | undefined => {
    const directId = toSafeTeachingReportId(teacherName, weekNumber);
    const byId = reportsById.get(directId);
    if (byId) return byId;

    const cleanTarget = normalizeTeacherName(teacherName);
    return reports.find(
      (r) =>
        Number(r.weekNumber) === weekNumber &&
        (normalizeTeacherName(r.reporterName) === cleanTarget ||
          normalizeTeacherName(r.teacherKey) === cleanTarget)
    );
  };

  // All 18 weeks metadata
  const weeksMeta = useMemo(() => {
    return Array.from({ length: 18 }, (_, idx) => {
      const w = idx + 1;
      const dates = getWeekDates(w);
      const start = dates[0];
      const end = dates[4];
      return {
        weekNumber: w,
        dateRangeLabel: `${start?.dateStr || ''} - ${end?.dateStr || ''}`,
        fullRangeLabel: `${start?.fullDate || ''} ถึง ${end?.fullDate || ''}`,
      };
    });
  }, []);

  // Per-week status rows when a single teacher is selected
  const singleTeacherRows = useMemo(() => {
    if (selectedTeacherFilter === 'all') return [];
    return weeksMeta.map((meta) => {
      const saved = findSavedReport(selectedTeacherFilter, meta.weekNumber);
      return {
        ...meta,
        isSaved: Boolean(saved),
        report: saved,
      };
    });
  }, [selectedTeacherFilter, weeksMeta, reports, reportsById]);

  const filteredSingleTeacherRows = useMemo(() => {
    const q = weekSearch.trim().toLowerCase();
    return singleTeacherRows.filter((row) => {
      if (statusFilter === 'saved' && !row.isSaved) return false;
      if (statusFilter === 'unsaved' && row.isSaved) return false;
      if (q) {
        const courseMatch = (row.report?.courses || []).some(
          (c) =>
            c.subjectCode.toLowerCase().includes(q) ||
            c.subjectName.toLowerCase().includes(q) ||
            (c.room || '').toLowerCase().includes(q)
        );
        const textMatch =
          `สัปดาห์ที่ ${row.weekNumber}`.includes(q) ||
          row.dateRangeLabel.toLowerCase().includes(q) ||
          (row.report?.learningOutcome || '').toLowerCase().includes(q) ||
          (row.report?.reporterName || '').toLowerCase().includes(q);
        if (!courseMatch && !textMatch) return false;
      }
      return true;
    });
  }, [singleTeacherRows, statusFilter, weekSearch]);

  // All saved reports list (for "all teachers" filter mode)
  const filteredAllSavedReports = useMemo(() => {
    const q = weekSearch.trim().toLowerCase();
    return [...reports]
      .filter((r) => {
        if (!q) return true;
        const courseMatch = (r.courses || []).some(
          (c) =>
            c.subjectCode.toLowerCase().includes(q) ||
            c.subjectName.toLowerCase().includes(q) ||
            (c.room || '').toLowerCase().includes(q)
        );
        return (
          (r.reporterName || '').toLowerCase().includes(q) ||
          `สัปดาห์ที่ ${r.weekNumber}`.includes(q) ||
          (r.learningOutcome || '').toLowerCase().includes(q) ||
          courseMatch
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.updatedAt || 0).getTime() || 0;
        const timeB = new Date(b.updatedAt || 0).getTime() || 0;
        return timeB - timeA;
      });
  }, [reports, weekSearch]);

  // Summary KPIs for selected teacher (or department-wide)
  const activeTeacherForStats =
    selectedTeacherFilter === 'all' ? defaultTeacher : selectedTeacherFilter;
  const savedCountForSelected = useMemo(() => {
    return weeksMeta.filter((m) => Boolean(findSavedReport(activeTeacherForStats, m.weekNumber)))
      .length;
  }, [weeksMeta, activeTeacherForStats, reports, reportsById]);

  const latestSavedReport = useMemo(() => {
    const pool =
      selectedTeacherFilter === 'all'
        ? reports
        : singleTeacherRows.map((r) => r.report).filter((r): r is TeachingReportRecord => Boolean(r));
    if (pool.length === 0) return null;
    return [...pool].sort((a, b) => {
      const tA = new Date(a.updatedAt || 0).getTime() || 0;
      const tB = new Date(b.updatedAt || 0).getTime() || 0;
      return tB - tA;
    })[0];
  }, [selectedTeacherFilter, reports, singleTeacherRows]);

  const openEditorForReport = (teacherName: string, weekNumber: number, openPreview: boolean) => {
    setEditorState((prev) => ({
      teacherName,
      weekNumber,
      openPreview,
      sessionKey: prev.sessionKey + 1,
    }));
    setSubMode('editor');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // If in editor mode, render WorkplaceTeachingReportView with top navigation back to overview
  if (subMode === 'editor') {
    return (
      <div className="space-y-4 font-['Prompt',sans-serif]">
        {/* Top Breadcrumb Bar (Hidden when printing) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSubMode('overview')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
              <span>กลับหน้ารายการสถานะรายสัปดาห์</span>
            </button>
            <div className="text-sm text-slate-600 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900">
                รายงานการจัดการเรียนการสอนบูรณาการรายวิชาในสถานประกอบการ
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                สัปดาห์ที่ {editorState.weekNumber}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                {editorState.teacherName}
              </span>
            </div>
          </div>
        </div>

        <WorkplaceTeachingReportView
          key={`editor-${editorState.sessionKey}`}
          currentUser={currentUser}
          students={students}
          form3List={form3List}
          submissions={submissions}
          courses={courses}
          teachers={propTeachers}
          teachingReports={reports}
          initialTeacherName={editorState.teacherName}
          initialWeek={editorState.weekNumber}
          initialOpenPreview={editorState.openPreview}
          onBackToOverview={() => setSubMode('overview')}
          onReportSaved={(saved) => {
            setReports((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
            onTeachingReportSaved?.(saved);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-14 font-['Prompt',sans-serif]">
      {/* Page Header Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                <BookOpen className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                บันทึกรายงานการสอนรายสัปดาห์
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Real-time Cloud DB
              </span>
            </div>
            <p className="text-sm text-slate-500">
              แสดงข้อมูลการรายงานการจัดการเรียนการสอนบูรณาการรายวิชาในสถานประกอบการ รายสัปดาห์ที่บันทึกไว้ สถานะการบันทึก และเปิดดู/แก้ไขเอกสาร
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                openEditorForReport(
                  selectedTeacherFilter === 'all' ? defaultTeacher : selectedTeacherFilter,
                  currentWeekNumber,
                  false
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-sm shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>บันทึกรายงานสัปดาห์ปัจจุบัน (สัปดาห์ที่ {currentWeekNumber})</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-sm">
          {/* 1. Teacher Selector */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-600" />
              <span>ครูผู้สอน / ผู้รายงาน</span>
            </label>
            <select
              value={selectedTeacherFilter}
              onChange={(e) => setSelectedTeacherFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">
                ครูนิเทศก์ทั้งหมด ({reports.length} ฉบับที่บันทึกไว้)
              </option>
              {allTeachers.map((t) => {
                const count = weeksMeta.filter((m) => Boolean(findSavedReport(t, m.weekNumber))).length;
                return (
                  <option key={t} value={t}>
                    {t} (บันทึกแล้ว {count}/18 สัปดาห์)
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Save Status Filter */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-emerald-600" />
              <span>กรองสถานะการบันทึก</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'saved' | 'unsaved')}
              disabled={selectedTeacherFilter === 'all'}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="all">ทั้งหมด (สัปดาห์ที่ 1–18)</option>
              <option value="saved">เฉพาะสัปดาห์ที่บันทึกแล้ว</option>
              <option value="unsaved">เฉพาะสัปดาห์ที่ยังไม่บันทึก</option>
            </select>
          </div>

          {/* 3. Search */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-sky-600" />
              <span>ค้นหารายวิชา / กลุ่มเรียน / สัปดาห์</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={weekSearch}
                onChange={(e) => setWeekSearch(e.target.value)}
                placeholder="เช่น 30000-2005, สอฟ.2/5, สัปดาห์ที่ 3..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-center gap-2.5 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm text-slate-500 font-medium">
              สัปดาห์ที่บันทึกแล้ว ({selectedTeacherFilter === 'all' ? 'ของฉัน' : 'ครูที่เลือก'})
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {savedCountForSelected} / 18
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              คิดเป็น {Math.round((savedCountForSelected / 18) * 100)}% ของภาคเรียน
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm text-slate-500 font-medium">ยังไม่บันทึก</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {18 - savedCountForSelected}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">สัปดาห์ที่รอดำเนินการ</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm text-slate-500 font-medium">
              บันทึกทั้งหมดในฐานข้อมูล
            </span>
            <div className="text-2xl font-bold text-indigo-700 mt-1">{reports.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">ฉบับ (รวมครูนิเทศก์ทุกท่าน)</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-xs sm:text-sm text-slate-500 font-medium">อัปเดตล่าสุด</span>
            <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 truncate">
              {latestSavedReport ? `สัปดาห์ที่ ${latestSavedReport.weekNumber}` : 'ยังไม่มีข้อมูล'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {latestSavedReport ? formatThaiDateTime(latestSavedReport.updatedAt) : '-'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 18-Week Quick Visual Status Matrix (shown when a specific teacher is selected) */}
      {selectedTeacherFilter !== 'all' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-base text-slate-900">
                สรุปสถานะการบันทึกสัปดาห์ที่ 1–18 ({selectedTeacherFilter})
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>บันทึกแล้ว</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                <span>ยังไม่บันทึก</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full ring-2 ring-sky-500 bg-white"></span>
                <span>สัปดาห์ปัจจุบัน</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-2">
            {singleTeacherRows.map((row) => {
              const isCurr = row.weekNumber === currentWeekNumber;
              return (
                <button
                  key={row.weekNumber}
                  type="button"
                  onClick={() =>
                    openEditorForReport(selectedTeacherFilter, row.weekNumber, row.isSaved)
                  }
                  title={
                    row.isSaved
                      ? `สัปดาห์ที่ ${row.weekNumber}: บันทึกแล้ว (คลิกเพื่อเรียกดูหรือแก้ไข)`
                      : `สัปดาห์ที่ ${row.weekNumber}: ยังไม่บันทึก (คลิกเพื่อสร้างรายงาน)`
                  }
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    row.isSaved
                      ? 'bg-emerald-50/90 border-emerald-300 hover:bg-emerald-100 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                  } ${isCurr ? 'ring-2 ring-sky-500 ring-offset-1' : ''}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs sm:text-sm">ส.{row.weekNumber}</span>
                    {row.isSaved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] mt-1 font-medium truncate">
                    {row.isSaved ? 'บันทึกแล้ว' : 'ยังไม่บันทึก'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Weekly Reports Table / Cards */}
      {selectedTeacherFilter !== 'all' ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-base text-slate-900">
                รายละเอียดรายงานการจัดการเรียนรู้รายสัปดาห์ ({filteredSingleTeacherRows.length} สัปดาห์)
              </h2>
            </div>
            {isLoadingReports && (
              <span className="text-xs text-slate-500">กำลังโหลดข้อมูลออนไลน์...</span>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {filteredSingleTeacherRows.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-sm">
                ไม่พบรายการสัปดาห์ที่ตรงกับเงื่อนไขการค้นหา
              </div>
            ) : (
              filteredSingleTeacherRows.map((row) => {
                const rep = row.report;
                const isCurr = row.weekNumber === currentWeekNumber;
                const isJustSaved =
                  Boolean(row.isSaved) &&
                  typeof initialHighlightWeek === 'number' &&
                  row.weekNumber === initialHighlightWeek;
                const photosCount =
                  rep?.photoCount ??
                  rep?.weekPhotos?.filter((p) => Boolean(p.url)).length ??
                  0;

                return (
                  <div
                    key={row.weekNumber}
                    className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition ${
                      isJustSaved
                        ? 'bg-emerald-50/60 ring-2 ring-inset ring-emerald-400'
                        : row.isSaved
                        ? 'bg-white hover:bg-emerald-50/20'
                        : 'bg-slate-50/40 hover:bg-slate-50'
                    }`}
                  >
                    {/* Left: Week info, Status Badge & Saved Content Summary */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-lg font-bold text-sm ${
                            row.isSaved
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          สัปดาห์ที่ {row.weekNumber}
                        </span>
                        <span className="text-sm font-medium text-slate-600">
                          ({row.dateRangeLabel} 2569)
                        </span>
                        {isCurr && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                            สัปดาห์ปัจจุบัน
                          </span>
                        )}
                        {isJustSaved && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                            เพิ่งบันทึกล่าสุด
                          </span>
                        )}
                        {row.isSaved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>บันทึกแล้ว (ออนไลน์)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>ยังไม่บันทึก</span>
                          </span>
                        )}
                      </div>

                      {rep ? (
                        <div className="space-y-1.5 text-sm text-slate-700">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>
                              วันที่รายงาน:{' '}
                              <strong className="text-slate-700">
                                {formatThaiDateFull(rep.reportDate)}
                              </strong>
                            </span>
                            <span>
                              ตำแหน่ง: <strong className="text-slate-700">{rep.position}</strong>
                            </span>
                            <span>
                              บันทึกล่าสุด:{' '}
                              <strong className="text-emerald-700 font-mono">
                                {formatThaiDateTime(rep.updatedAt)}
                              </strong>
                            </span>
                            {photosCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-purple-700 font-medium">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>
                                  {photosCount} ภาพ{rep.hasManualPhotoEdits ? ' (เลือก/แก้ไขเอง)' : ''}
                                </span>
                              </span>
                            )}
                          </div>

                          {/* Courses summary */}
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {(rep.courses || []).map((c, idx) => (
                              <span
                                key={c.id || idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800"
                              >
                                <span className="font-mono font-bold text-indigo-700">
                                  {c.subjectCode}
                                </span>
                                <span>{c.subjectName}</span>
                                {c.room?.trim() && (
                                  <span className="text-slate-600 font-semibold">
                                    กลุ่ม {c.room.trim()}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>

                          {/* Learning outcome snippet */}
                          {rep.learningOutcome && (
                            <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                              <strong className="text-slate-700">ผลที่เกิดจากการจัดการเรียนรู้:</strong>{' '}
                              {rep.learningOutcome}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          ยังไม่มีข้อมูลรายงานการสอนที่บันทึกไว้สำหรับสัปดาห์ที่ {row.weekNumber} ({row.fullRangeLabel})
                        </p>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {row.isSaved ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              openEditorForReport(selectedTeacherFilter, row.weekNumber, true)
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs sm:text-sm transition cursor-pointer"
                            title="เปิดดูเอกสารบันทึกข้อความและรายงาน 3 หน้า A4 พร้อมสั่งพิมพ์/ดาวน์โหลด PDF"
                          >
                            <Eye className="w-4 h-4 text-indigo-600" />
                            <span>เรียกดูเอกสาร</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openEditorForReport(selectedTeacherFilter, row.weekNumber, false)
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer"
                            title="แก้ไขข้อมูลรายวิชา ผลการจัดการเรียนรู้ หรือรูปภาพในรายงานสัปดาห์นี้"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>แก้ไขเอกสาร</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            openEditorForReport(selectedTeacherFilter, row.weekNumber, false)
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs sm:text-sm transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-sky-600" />
                          <span>บันทึกรายงาน</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* All Teachers View: Teacher Completion Summary + All Saved Reports */
        <div className="space-y-6">
          {/* Teacher completion summary */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/70">
              <Users className="w-4 h-4 text-indigo-600" />
              <h2 className="font-bold text-base text-slate-900">
                สรุปสถานะการบันทึกรายงานการสอนแยกตามครูนิเทศก์
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                    <th className="px-4 py-3 font-bold">ชื่อครูผู้สอน / ครูนิเทศก์</th>
                    <th className="px-4 py-3 font-bold text-center">จำนวนสัปดาห์ที่บันทึก</th>
                    <th className="px-4 py-3 font-bold">สัปดาห์ที่บันทึกแล้ว</th>
                    <th className="px-4 py-3 font-bold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allTeachers.map((tName) => {
                    const savedWeeks = weeksMeta
                      .filter((m) => Boolean(findSavedReport(tName, m.weekNumber)))
                      .map((m) => m.weekNumber);
                    return (
                      <tr key={tName} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-semibold text-slate-900">{tName}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              savedWeeks.length > 0
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {savedWeeks.length} / 18 สัปดาห์
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {savedWeeks.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {savedWeeks.map((w) => (
                                <button
                                  key={w}
                                  type="button"
                                  onClick={() => openEditorForReport(tName, w, true)}
                                  className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold cursor-pointer"
                                  title={`คลิกเพื่อเรียกดูเอกสาร สัปดาห์ที่ ${w}`}
                                >
                                  ส.{w}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">ยังไม่มีการบันทึก</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTeacherFilter(tName)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition cursor-pointer"
                          >
                            ดูสถานะ 18 สัปดาห์
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* All Saved Reports List */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h2 className="font-bold text-base text-slate-900">
                  รายการเอกสารที่บันทึกไว้ทั้งหมด ({filteredAllSavedReports.length} ฉบับ)
                </h2>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredAllSavedReports.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-sm">
                  ยังไม่มีรายงานการสอนที่บันทึกไว้ในฐานข้อมูล
                </div>
              ) : (
                filteredAllSavedReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white font-bold text-xs">
                          สัปดาห์ที่ {rep.weekNumber}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {rep.reporterName}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>บันทึกแล้ว</span>
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          อัปเดต: {formatThaiDateTime(rep.updatedAt)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(rep.courses || []).map((c, idx) => (
                          <span
                            key={c.id || idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-800"
                          >
                            <span className="font-mono font-bold text-indigo-700">
                              {c.subjectCode}
                            </span>
                            <span>{c.subjectName}</span>
                            {c.room?.trim() && (
                              <span className="font-semibold text-slate-600">
                                กลุ่ม {c.room.trim()}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                      {rep.learningOutcome && (
                        <p className="text-xs text-slate-600 line-clamp-1">
                          {rep.learningOutcome}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          openEditorForReport(rep.reporterName, Number(rep.weekNumber), true)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-indigo-600" />
                        <span>เรียกดูเอกสาร</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openEditorForReport(rep.reporterName, Number(rep.weekNumber), false)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>แก้ไขเอกสาร</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
