import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Filter,
  Loader2,
  Printer,
  Search,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  AuthUser,
  Company,
  CourseDataRow,
  Form3SupervisionRecord,
  SheetTeacher,
  Student,
  UserAvatarRecord,
  WeeklySubmission,
} from '../types';
import { StudentAvatar, compressImageFile } from '../components/StudentAvatar';
import { resolveUserAvatarUrl } from '../services/firestoreService';
import { getCoursesByTeacher } from '../services/courseDataService';
import { getStudentEvaluationSummary, matchesStudentRecord } from '../utils/dataUnifier';
import { formatThaiErrorMessage } from '../utils/thaiErrorUtils';

interface TeacherViewProps {
  students: Student[];
  companies: Company[];
  submissions: Record<string, WeeklySubmission[]>;
  form3List: Form3SupervisionRecord[];
  courses: CourseDataRow[];
  teachers: SheetTeacher[];
  userAvatars: UserAvatarRecord[];
  currentUser: AuthUser | null;
  onUpdateTeacherAvatar: (dataUrl: string) => Promise<void> | void;
  onOpenForm3: (stdId?: string) => void;
  onNavigateA4: (stdId?: string) => void;
  onOpenSheetsModal: () => void;
  onOpenLookerModal: () => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({
  students,
  companies,
  submissions,
  form3List,
  courses,
  teachers,
  userAvatars,
  currentUser,
  onUpdateTeacherAvatar,
  onOpenForm3,
  onNavigateA4,
  onOpenSheetsModal,
  onOpenLookerModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'supervised' | 'pending'>('all');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const activeTeacher = useMemo<SheetTeacher>(() => {
    const email = (currentUser?.email || '').toLowerCase();
    const name = currentUser?.name || '';
    return (
      teachers.find(
        (t) =>
          (t.email && t.email.toLowerCase() === email) ||
          (name && t.name === name)
      ) || {
        id: 'tch-current',
        name: currentUser?.name || 'นายทักษิณ โสภาปิยะ',
        user: currentUser?.email || 'thaksinso@kktech.ac.th',
        email: currentUser?.email || 'thaksinso@kktech.ac.th',
        status: currentUser?.role === 'admin' ? 'ผู้ดูแลระบบ / ครูนิเทศก์' : 'ครูนิเทศก์',
        role: currentUser?.role === 'admin' ? 'admin' : 'teacher',
        department: currentUser?.department || 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น',
        avatarUrl: undefined,
      }
    );
  }, [teachers, currentUser]);

  const teacherAvatarUrl = useMemo(() => {
    return (
      resolveUserAvatarUrl(userAvatars, {
        email: activeTeacher.email,
        name: activeTeacher.name,
      }) || activeTeacher.avatarUrl
    );
  }, [userAvatars, activeTeacher]);

  const roomOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.room) set.add(s.room.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [students]);

  const studentRows = useMemo(() => {
    return students.map((std) => {
      const evalSummary = getStudentEvaluationSummary(std, submissions, form3List);
      const hasForm3 = form3List.some((r) => matchesStudentRecord(r, std));
      return {
        student: std,
        evalSummary,
        hasForm3,
      };
    });
  }, [students, submissions, form3List]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return studentRows.filter(({ student, hasForm3 }) => {
      const matchSearch =
        !q ||
        student.name.toLowerCase().includes(q) ||
        student.studentCode.toLowerCase().includes(q) ||
        student.companyName.toLowerCase().includes(q) ||
        student.room.toLowerCase().includes(q);
      const matchRoom = roomFilter === 'all' || student.room.trim() === roomFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'supervised' && hasForm3) ||
        (statusFilter === 'pending' && !hasForm3);
      return matchSearch && matchRoom && matchStatus;
    });
  }, [studentRows, searchQuery, roomFilter, statusFilter]);

  const supervisedStudentsCount = studentRows.filter((r) => r.hasForm3).length;
  const totalSubmissionsCount = Object.values(submissions).flat().length;
  const teacherCoursesBreakdown = useMemo(() => {
    const courseSource = courses && courses.length > 0 ? courses : undefined;
    const rawCourses = getCoursesByTeacher(activeTeacher.name, courseSource);

    const normalizeRoom = (r?: string) => (r || '').replace(/\s+/g, '').trim().toLowerCase();
    const roomCounts = new Map<string, number>();
    students.forEach((s) => {
      const key = normalizeRoom(s.room);
      if (key) {
        roomCounts.set(key, (roomCounts.get(key) || 0) + 1);
      }
    });

    const subjectMap = new Map<
      string,
      {
        subjectCode: string;
        subjectName: string;
        roomsMap: Map<string, number>;
      }
    >();
    const uniqueRooms = new Map<string, string>();

    rawCourses.forEach((c) => {
      const code = (c.subjectCode || '').trim();
      const name = (c.subjectName || '').trim();
      const room = (c.room || '').trim();
      if (!code && !name) return;

      const key = `${code}__${name}`;
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          subjectCode: code || '-',
          subjectName: name || '-',
          roomsMap: new Map<string, number>(),
        });
      }
      if (room) {
        const normRoom = normalizeRoom(room);
        const count = roomCounts.get(normRoom) || 0;
        subjectMap.get(key)!.roomsMap.set(room, count);
        if (!uniqueRooms.has(normRoom)) {
          uniqueRooms.set(normRoom, room);
        }
      }
    });

    const subjects = Array.from(subjectMap.values())
      .map((item) => {
        const rooms = Array.from(item.roomsMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0], 'th'))
          .map(([roomName, count]) => ({ room: roomName, count }));
        const totalStudents = rooms.reduce((sum, r) => sum + r.count, 0);
        return {
          subjectCode: item.subjectCode,
          subjectName: item.subjectName,
          rooms,
          totalStudents,
        };
      })
      .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode));

    let totalUniqueStudents = 0;
    uniqueRooms.forEach((_, normRoom) => {
      totalUniqueStudents += roomCounts.get(normRoom) || 0;
    });

    return {
      rawCount: rawCourses.length,
      subjects,
      totalRooms: uniqueRooms.size,
      totalUniqueStudents,
    };
  }, [courses, activeTeacher.name, students]);

  const teacherCoursesCount = teacherCoursesBreakdown.rawCount;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    setAvatarError(null);
    setAvatarNotice(null);
    try {
      const compressed = await compressImageFile(file, 400, 0.85);
      await onUpdateTeacherAvatar(compressed);
      setAvatarNotice('อัปเดตรูปภาพประจำตัวลงฐานข้อมูลออนไลน์สำเร็จ');
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
    <div className="space-y-6 pb-14">
      {/* Supervisor Profile Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
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
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {activeTeacher.status || 'ครูนิเทศก์'}
                </span>
                <span className="text-xs font-mono text-sky-300">{activeTeacher.email}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold">{activeTeacher.name}</h1>
              <p className="text-xs sm:text-sm text-slate-300">
                {activeTeacher.department || 'แผนกวิชาช่างไฟฟ้ากำลัง วิทยาลัยเทคนิคขอนแก่น'} • รายวิชาที่รับผิดชอบ {teacherCoursesCount} กลุ่มเรียน
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenForm3(undefined)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>บันทึกรายงานการนิเทศ (Form 3)</span>
            </button>
            <button
              type="button"
              onClick={onOpenSheetsModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold border border-white/15 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Google Sheets</span>
            </button>
            <button
              type="button"
              onClick={onOpenLookerModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold border border-white/15 transition cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-indigo-300" />
              <span>Looker Analytics</span>
            </button>
          </div>
        </div>

        {teacherCoursesBreakdown.subjects.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
                <BookOpen className="w-4 h-4 text-sky-300 shrink-0" />
                <span>รายวิชาและกลุ่มนักศึกษาที่ครูนิเทศก์รับผิดชอบ</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-sky-200 border border-white/15">
                  {teacherCoursesBreakdown.subjects.length} รายวิชา
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-indigo-200 border border-white/15">
                  {teacherCoursesBreakdown.totalRooms} กลุ่มนักศึกษา
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-bold">
                  รวม {teacherCoursesBreakdown.totalUniqueStudents} คน
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl bg-slate-950/35 border border-white/10">
              <table className="w-full text-left text-xs sm:text-[13px] border-collapse">
                <thead className="bg-white/5 text-slate-300 font-semibold border-b border-white/10">
                  <tr>
                    <th className="py-2 px-3 w-[130px] whitespace-nowrap">รหัสวิชา</th>
                    <th className="py-2 px-3">ชื่อรายวิชา</th>
                    <th className="py-2 px-3">กลุ่มนักศึกษา</th>
                    <th className="py-2 px-3 text-right w-[120px] whitespace-nowrap">จำนวนนักศึกษา</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {teacherCoursesBreakdown.subjects.map((subj) => (
                    <tr key={`${subj.subjectCode}-${subj.subjectName}`} className="hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-sky-300 whitespace-nowrap">
                        {subj.subjectCode}
                      </td>
                      <td className="py-2 px-3 font-semibold text-white">
                        {subj.subjectName}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1">
                          {subj.rooms.map((r) => (
                            <span
                              key={r.room}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-slate-100 border border-white/15 text-xs font-medium"
                            >
                              <span>{r.room}</span>
                              <span className="text-sky-200 font-mono">({r.count} คน)</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-300 whitespace-nowrap">
                        {subj.totalStudents} คน
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(avatarNotice || avatarError) && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              avatarError
                ? 'bg-rose-500/20 border border-rose-400/40 text-rose-100'
                : 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-100'
            }`}
          >
            {avatarError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{avatarError || avatarNotice}</span>
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>นักศึกษาในระบบ</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{students.length} คน</div>
          <div className="text-[11px] text-slate-500 mt-0.5">นิเทศแล้ว {supervisedStudentsCount} คน</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>สถานประกอบการ</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{companies.length} แห่ง</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
            นิเทศแล้ว {companies.filter((c) => c.status === 'completed').length} แห่ง
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>รายงานสัปดาห์ทั้งหมด</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalSubmissionsCount} ฉบับ</div>
          <div className="text-[11px] text-slate-500 mt-0.5">อัปเดตเรียลไทม์จาก Firestore</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>ประวัติการนิเทศ (Form 3)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{form3List.length} ครั้ง</div>
          <div className="text-[11px] text-slate-500 mt-0.5">ซิงค์แผ่นงาน Form_3</div>
        </div>
      </div>

      {/* Filters & Student List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-600" />
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">
              รายชื่อนักศึกษาและสถานะการนิเทศ ({filteredRows.length} คน)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, รหัส, บริษัท..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>

            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white text-slate-700 cursor-pointer"
            >
              <option value="all">ทุกกลุ่มห้อง ({students.length})</option>
              {roomOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'supervised' | 'pending')}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white text-slate-700 cursor-pointer"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="supervised">นิเทศแล้ว</option>
              <option value="pending">รอนิเทศ</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs">
                <th className="p-3.5">นักศึกษา</th>
                <th className="p-3.5">กลุ่มห้อง</th>
                <th className="p-3.5">สถานประกอบการ</th>
                <th className="p-3.5 text-center">ส่งงาน / ชั่วโมง</th>
                <th className="p-3.5 text-center">สถานะนิเทศ</th>
                <th className="p-3.5 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(({ student, evalSummary, hasForm3 }) => (
                <tr key={student.id} className="hover:bg-sky-50/30 transition">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <StudentAvatar student={student} size="sm" showUploadButton={false} />
                      <div>
                        <div className="font-bold text-slate-900">{student.name}</div>
                        <div className="text-xs font-mono text-slate-500">{student.studentCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-xs font-semibold text-sky-800">
                    {student.room}
                  </td>
                  <td className="p-3.5 text-xs text-slate-700 max-w-xs">
                    <div className="font-semibold text-slate-900 truncate">{student.companyName}</div>
                    <div className="text-[11px] text-slate-500">
                      พี่เลี้ยง: {student.companyRegistration?.mentorName || '-'}
                    </div>
                  </td>
                  <td className="p-3.5 text-center text-xs">
                    <div className="font-bold text-slate-900">
                      {evalSummary.submittedWeeksCount}/18 สัปดาห์
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {evalSummary.effectiveAccumulatedHours} ชม.
                    </div>
                  </td>
                  <td className="p-3.5 text-center">
                    {hasForm3 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {evalSummary.evaluationScore !== null
                            ? `${evalSummary.evaluationScore}/20`
                            : 'นิเทศแล้ว'}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>รอนิเทศ</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenForm3(student.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        บันทึกนิเทศ
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigateA4(student.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>ทว.04</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                    ไม่พบรายชื่อนักศึกษาตามเงื่อนไขที่ค้นหา
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
