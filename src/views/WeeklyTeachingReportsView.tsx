import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  UserCheck,
} from 'lucide-react';
import {
  AuthUser,
  CourseDataRow,
  Form3SupervisionRecord,
  SheetTeacher,
  Student,
  TeachingReportRecord,
  UserAvatarRecord,
  WeeklySubmission,
} from '../types';
import { getAllLoginSheetTeachers } from '../services/sheetAuthService';
import { resolveUserAvatarUrl } from '../services/firestoreService';
import { compressImageFile } from '../components/StudentAvatar';
import { getCurrentWeekInfo } from '../data/weeksData';
import {
  WorkplaceTeachingReportView,
  toSafeTeachingReportId,
} from './WorkplaceTeachingReportView';
import { formatThaiErrorMessage } from '../utils/thaiErrorUtils';

interface WeeklyTeachingReportsViewProps {
  currentUser?: AuthUser | null;
  students: Student[];
  form3List: Form3SupervisionRecord[];
  submissions: Record<string, WeeklySubmission[]>;
  courses?: CourseDataRow[];
  teachers?: SheetTeacher[];
  userAvatars?: UserAvatarRecord[];
  onUpdateTeacherAvatar?: (dataUrl: string) => Promise<void> | void;
  teachingReports: TeachingReportRecord[];
  cloudLoadError?: string | null;
  initialTeacherFilter?: string;
  initialHighlightWeek?: number;
  onTeachingReportSaved?: (report: TeachingReportRecord) => void;
}

export const WeeklyTeachingReportsView: React.FC<WeeklyTeachingReportsViewProps> = ({
  currentUser,
  students,
  form3List,
  submissions,
  courses = [],
  teachers: propTeachers,
  userAvatars = [],
  onUpdateTeacherAvatar,
  teachingReports,
  cloudLoadError,
  initialTeacherFilter,
  initialHighlightWeek,
  onTeachingReportSaved,
}) => {
  const teacherList = useMemo(() => {
    const base = propTeachers && propTeachers.length > 0 ? propTeachers : getAllLoginSheetTeachers();
    const cleanMap = new Map<string, SheetTeacher>();
    base.forEach((t) => {
      if (t && t.name && !t.name.includes('สุพรรณี')) {
        cleanMap.set(t.name.trim(), t);
      }
    });
    return Array.from(cleanMap.values());
  }, [propTeachers]);

  const defaultTeacherName = useMemo(() => {
    if (initialTeacherFilter) return initialTeacherFilter;
    if (currentUser?.name && !currentUser.name.includes('นักศึกษา')) {
      const matched = teacherList.find(
        (t) => t.name.includes(currentUser.name) || currentUser.name.includes(t.name)
      );
      if (matched) return matched.name;
    }
    return teacherList[0]?.name || 'นายทักษิณ โสภาปิยะ';
  }, [initialTeacherFilter, currentUser, teacherList]);

  const [selectedTeacherName, setSelectedTeacherName] = useState<string>(defaultTeacherName);
  const [selectedWeek, setSelectedWeek] = useState<number>(
    () => initialHighlightWeek || getCurrentWeekInfo().weekNumber || 1
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const activeTeacher = useMemo<SheetTeacher>(() => {
    return (
      teacherList.find((t) => t.name === selectedTeacherName) || {
        id: 'tch-selected',
        name: selectedTeacherName,
        user: currentUser?.email || 'thaksinso@kktech.ac.th',
        email: currentUser?.email || 'thaksinso@kktech.ac.th',
        status: currentUser?.role === 'admin' ? 'ครูนิเทศก์ / ผู้ดูแลระบบ' : 'ครูนิเทศก์',
        role: currentUser?.role === 'admin' ? 'admin' : 'teacher',
        department: 'แผนกวิชาช่างไฟฟ้ากำลัง วิทยาลัยเทคนิคขอนแก่น',
        rooms: [],
        subjects: [],
        avatarUrl: undefined,
      }
    );
  }, [teacherList, selectedTeacherName, currentUser]);

  const teacherAvatarUrl = useMemo(() => {
    return (
      resolveUserAvatarUrl(userAvatars, {
        email: activeTeacher.email,
        name: activeTeacher.name,
      }) || activeTeacher.avatarUrl
    );
  }, [userAvatars, activeTeacher]);

  const savedWeeksSet = useMemo(() => {
    const cleanTarget = activeTeacher.name
      .replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, '')
      .trim()
      .toLowerCase();
    const set = new Set<number>();
    for (let w = 1; w <= 18; w++) {
      const id = toSafeTeachingReportId(activeTeacher.name, w);
      if (teachingReports.some((r) => r.id === id)) {
        set.add(w);
      }
    }
    teachingReports.forEach((r) => {
      const recTeacher = (r.reporterName || r.teacherKey || '')
        .replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, '')
        .trim()
        .toLowerCase();
      if (recTeacher && cleanTarget && recTeacher === cleanTarget && r.weekNumber >= 1 && r.weekNumber <= 18) {
        set.add(Number(r.weekNumber));
      }
    });
    return set;
  }, [teachingReports, activeTeacher.name]);

  const progressPct = Math.round((savedWeeksSet.size / 18) * 100);

  const teacherCoursesCount = useMemo(() => {
    const cleanTarget = activeTeacher.name
      .replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, '')
      .trim();
    return courses.filter((c) => cleanTarget && c.teacherName.includes(cleanTarget)).length;
  }, [courses, activeTeacher.name]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateTeacherAvatar) return;
    setIsUploadingAvatar(true);
    setAvatarError(null);
    setAvatarNotice(null);
    try {
      const compressed = await compressImageFile(file, 400, 0.85);
      await onUpdateTeacherAvatar(compressed);
      setAvatarNotice('บันทึกรูปภาพประจำตัวลงฐานข้อมูลออนไลน์เรียบร้อยแล้ว');
      setTimeout(() => setAvatarNotice(null), 3500);
    } catch (err) {
      setAvatarError(
        formatThaiErrorMessage(err, 'ไม่สามารถอัปโหลดรูปประจำตัวได้ กรุณาลองใหม่อีกครั้ง')
      );
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-14 print:space-y-0 print:pb-0">
      {/* Supervisor Teacher Profile Header Card (hidden on print) */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md space-y-5 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Teacher Avatar */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-sky-400/60 bg-slate-800 flex items-center justify-center shadow-lg">
                {teacherAvatarUrl ? (
                  <img
                    src={teacherAvatarUrl}
                    alt={activeTeacher.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCheck className="w-8 h-8 text-sky-300" />
                )}
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  </div>
                )}
              </div>

              {onUpdateTeacherAvatar && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-sky-500 hover:bg-sky-400 text-white border-2 border-slate-900 shadow-md transition cursor-pointer"
                    title="เปลี่ยนรูปโปรไฟล์ครูนิเทศก์"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>{activeTeacher.status || 'ครูนิเทศก์'}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/30">
                  <BookOpen className="w-3 h-3" />
                  <span>{teacherCoursesCount} รายวิชา / กลุ่มเรียน</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold">{activeTeacher.name}</h1>
              <p className="text-xs sm:text-sm text-slate-300">
                {activeTeacher.email} • {activeTeacher.department || 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น'}
              </p>
            </div>
          </div>

          {/* Teacher Selector + Progress Summary */}
          <div className="flex flex-col sm:items-end gap-2.5">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-300 font-medium">เลือกครูผู้สอน:</label>
              <select
                value={selectedTeacherName}
                onChange={(e) => setSelectedTeacherName(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white cursor-pointer focus:ring-2 focus:ring-sky-500"
              >
                {teacherList.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-64 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">ความคืบหน้ารายงานการสอน</span>
                <span className="font-bold text-emerald-300">
                  {savedWeeksSet.size}/18 สัปดาห์ ({progressPct}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {(avatarNotice || avatarError) && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              avatarError
                ? 'bg-rose-500/20 border border-rose-400/40 text-rose-100'
                : 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-100'
            }`}
          >
            {avatarError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{avatarError || avatarNotice}</span>
          </div>
        )}

        {/* Weeks 1-18 Overview Matrix (labeled สัปดาห์ที่ 1 – สัปดาห์ที่ 18) */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="text-xs text-slate-300 font-semibold">
            ภาพรวมสถานะรายงานการสอนรายสัปดาห์ (คลิกเพื่อเปิดแก้ไข / พิมพ์):
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-1.5">
            {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => {
              const isSaved = savedWeeksSet.has(w);
              const isSelected = selectedWeek === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedWeek(w)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer border ${
                    isSelected
                      ? 'bg-sky-500 text-white border-sky-300 shadow-sm ring-2 ring-sky-300/40'
                      : isSaved
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30 hover:bg-emerald-500/30'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/15'
                  }`}
                >
                  <span>สัปดาห์ที่ {w}</span>
                  {isSaved && <CheckCircle2 className="w-3 h-3 text-emerald-300 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cloud Stream Notice if any */}
      {cloudLoadError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center gap-2 font-medium print:hidden">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{cloudLoadError}</span>
        </div>
      )}

      {/* Direct Workplace Teaching Report Form & A4 Preview */}
      <WorkplaceTeachingReportView
        currentUser={currentUser}
        students={students}
        form3List={form3List}
        submissions={submissions}
        courses={courses}
        teachers={teacherList}
        teachingReports={teachingReports}
        initialTeacherName={selectedTeacherName}
        initialWeek={selectedWeek}
        onReportSaved={onTeachingReportSaved}
      />
    </div>
  );
};
