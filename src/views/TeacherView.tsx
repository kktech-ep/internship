import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ExternalLink, 
  BarChart3, 
  Printer, 
  Search, 
  Download, 
  UserCheck, 
  Camera, 
  ChevronLeft, 
  ChevronRight, 
  Database,
  Calendar,
  Sparkles,
  Award,
  BookOpen,
  Filter,
  RotateCcw,
  GraduationCap,
  Layers,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from 'lucide-react';
import { Student, Company, WeeklySubmission, AuthUser, CourseDataRow } from '../types';
import { LOGIN_SHEET_CONFIG } from '../services/sheetAuthService';
import { 
  DATA_SHEET_CONFIG,
  fetchDataSheetCourses,
  getCachedCourses,
  getAllTeachersFromData,
  getAllSubjectsFromData,
  getAllRoomsFromData,
  getCoursesByRoom
} from '../services/courseDataService';

interface TeacherViewProps {
  students: Student[];
  companies: Company[];
  submissions: Record<string, WeeklySubmission[]>;
  currentUser?: AuthUser | null;
  onOpenForm3: (studentId?: string) => void;
  onNavigateA4: (studentId?: string) => void;
  onOpenSheetsModal: () => void;
  onOpenLookerModal: () => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({
  students,
  companies,
  submissions,
  currentUser,
  onOpenForm3,
  onNavigateA4,
  onOpenSheetsModal,
  onOpenLookerModal,
}) => {
  // Course data state from Google Sheet "data" tab
  const [courses, setCourses] = useState<CourseDataRow[]>(() => getCachedCourses());
  const [activeTab, setActiveTab] = useState<'students' | 'coursesMatrix'>('students');

  // Filters connected to BOTH login sheet and data sheet
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'graded' | 'pending'>('all');
  
  // Expanded student course cards
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Teacher avatar handling
  const fileInputRef = useRef<HTMLInputElement>(null);
  const teacherEmail = currentUser?.email || 'thaksinso@kktech.ac.th';
  const teacherStorageKey = `kktech_teacher_avatar_${teacherEmail}`;
  const [teacherAvatar, setTeacherAvatar] = useState<string | null>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(teacherStorageKey) || null;
    }
    return null;
  });

  // Fetch courses from Google Sheets data tab on mount
  useEffect(() => {
    fetchDataSheetCourses().then(res => {
      if (res && res.length > 0) setCourses(res);
    });
  }, []);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(`kktech_teacher_avatar_${teacherEmail}`);
      if (saved) setTeacherAvatar(saved);
    }
  }, [teacherEmail]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setTeacherAvatar(compressed);
          try {
            localStorage.setItem(teacherStorageKey, compressed);
          } catch (err) {
            console.warn('LocalStorage teacher avatar save note:', err);
          }
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Extract master lists from Google Sheet data tab
  const allRooms = useMemo(() => {
    const dataRooms = getAllRoomsFromData(courses);
    const loginRooms = Array.from(new Set(students.map(s => s.room).filter(Boolean)));
    const merged = Array.from(new Set([...dataRooms, ...loginRooms]));
    return merged.sort();
  }, [courses, students]);

  const allTeachers = useMemo(() => {
    return getAllTeachersFromData(courses);
  }, [courses]);

  const allSubjects = useMemo(() => {
    return getAllSubjectsFromData(courses);
  }, [courses]);

  // Check if current user is one of the teachers
  const currentUserName = currentUser?.name || '';
  const matchedLoggedInTeacher = useMemo(() => {
    if (!currentUserName) return null;
    const cleanCurrent = currentUserName.toLowerCase().replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, '');
    return allTeachers.find(t => {
      const cleanT = t.toLowerCase().replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, '');
      return cleanT.includes(cleanCurrent) || cleanCurrent.includes(cleanT);
    }) || null;
  }, [currentUserName, allTeachers]);

  // Master Filter Logic linking BOTH login sheet & data sheet
  const filteredStudents = useMemo(() => {
    return students.filter((std, idx) => {
      const studentRoom = (std.room || '').trim();

      // 1. Filter by room (แผ่นงาน login & data)
      if (selectedRoom !== 'all' && studentRoom !== selectedRoom) {
        return false;
      }

      // 2. Filter by teacher (แผ่นงาน data)
      if (selectedTeacher !== 'all') {
        const studentCourses = std.courses || getCoursesByRoom(studentRoom, courses);
        const teachesStudent = studentCourses.some(c => {
          const cleanTarget = selectedTeacher.toLowerCase().replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, '');
          const cleanT = c.teacherName.toLowerCase().replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, '');
          return cleanT.includes(cleanTarget) || cleanTarget.includes(cleanT);
        });

        // Also check if primary supervisor matches
        const primarySupervisor = (std.supervisorTeacher || '').toLowerCase();
        const cleanTarget = selectedTeacher.toLowerCase().replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, '');
        const matchesPrimary = primarySupervisor.includes(cleanTarget);

        if (!teachesStudent && !matchesPrimary) {
          return false;
        }
      }

      // 3. Filter by subject (แผ่นงาน data)
      if (selectedSubject !== 'all') {
        const studentCourses = std.courses || getCoursesByRoom(studentRoom, courses);
        const hasSubject = studentCourses.some(c => c.subjectCode === selectedSubject);
        if (!hasSubject) {
          return false;
        }
      }

      // 4. Filter by status
      const isGraded = idx % 3 !== 1;
      if (selectedStatus === 'graded' && !isGraded) return false;
      if (selectedStatus === 'pending' && isGraded) return false;

      // 5. Filter by search term
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const studentCourses = std.courses || getCoursesByRoom(studentRoom, courses);
        const subjectMatch = studentCourses.some(c => 
          c.subjectCode.toLowerCase().includes(q) ||
          c.subjectName.toLowerCase().includes(q) ||
          c.teacherName.toLowerCase().includes(q)
        );

        const basicMatch = 
          std.name.toLowerCase().includes(q) ||
          std.studentCode.toLowerCase().includes(q) ||
          std.companyName.toLowerCase().includes(q) ||
          (std.room && std.room.toLowerCase().includes(q)) ||
          (std.companyRegistration?.department && std.companyRegistration.department.toLowerCase().includes(q)) ||
          (std.supervisorTeacher && std.supervisorTeacher.toLowerCase().includes(q));

        if (!basicMatch && !subjectMatch) return false;
      }

      return true;
    });
  }, [students, courses, selectedRoom, selectedTeacher, selectedSubject, selectedStatus, searchTerm]);

  // Count students under logged in teacher
  const myStudentsCount = useMemo(() => {
    if (!matchedLoggedInTeacher) return 0;
    return students.filter(s => {
      const sCourses = s.courses || getCoursesByRoom(s.room, courses);
      return sCourses.some(c => {
        const cleanT = c.teacherName.toLowerCase().replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, '');
        const cleanMy = matchedLoggedInTeacher.toLowerCase().replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, '');
        return cleanT.includes(cleanMy) || cleanMy.includes(cleanT);
      });
    }).length;
  }, [students, courses, matchedLoggedInTeacher]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedRoom('all');
    setSelectedTeacher('all');
    setSelectedSubject('all');
    setSelectedStatus('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const startIndex = (currentPageSafe - 1) * pageSize;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + pageSize);

  // Statistics
  const uniqueCompanies = useMemo(() => {
    const set = new Set<string>();
    filteredStudents.forEach((s) => {
      if (s.companyName && s.companyName !== 'ยังไม่ระบุสถานประกอบการ') {
        set.add(s.companyName);
      }
    });
    return Array.from(set);
  }, [filteredStudents]);

  const gradedCount = useMemo(() => {
    return filteredStudents.filter((s, idx) => idx % 3 !== 1).length;
  }, [filteredStudents]);

  const pendingCount = Math.max(0, filteredStudents.length - gradedCount);
  const progressPercent = filteredStudents.length > 0 ? Math.round((gradedCount / filteredStudents.length) * 100) : 0;

  // Teacher display name
  const teacherName = currentUser?.name || matchedLoggedInTeacher || 'นายทักษิณ โสภาปิยะ';
  const teacherInitials = currentUser?.initials || 'ทส';
  const teacherDepartment = currentUser?.department || 'แผนกวิชาช่างไฟฟ้ากำลัง วิทยาลัยเทคนิคขอนแก่น';

  const hasActiveFilters = selectedRoom !== 'all' || selectedTeacher !== 'all' || selectedSubject !== 'all' || selectedStatus !== 'all' || searchTerm.trim() !== '';

  return (
    <div className="space-y-6 pb-12 font-['Prompt',sans-serif]">
      {/* Top Header Card matching logged-in User and Connected Sheets */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            {/* Teacher Profile Photo / Avatar with Upload Button */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 p-0.5 shadow-md overflow-hidden flex items-center justify-center">
                {teacherAvatar ? (
                  <img
                    src={teacherAvatar}
                    alt={teacherName}
                    className="w-full h-full object-cover rounded-[14px]"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white rounded-[14px]">
                    <span className="font-bold text-lg sm:text-xl tracking-tight">{teacherInitials}</span>
                    <span className="text-[9px] text-sky-300 font-medium mt-0.5">ครูนิเทศก์</span>
                  </div>
                )}
              </div>

              {/* Upload Photo Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="คลิกเพื่ออัปโหลดหรือเปลี่ยนรูปภาพครูนิเทศก์"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center shadow-md transition transform hover:scale-110 cursor-pointer border-2 border-white"
              >
                <Camera className="w-3 h-3" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* Teacher Details */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  {teacherName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ครูนิเทศก์ประจำวิชา & ที่ปรึกษา
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                  {courses.length} รายวิชาเชื่อมโยง
                </span>
              </div>

              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>สิทธิ์: ครูนิเทศก์ผู้สอน (Teacher/Supervisor)</span>
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="font-mono text-slate-600">{teacherEmail}</span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-slate-600">{teacherDepartment}</span>
              </div>
            </div>
          </div>

          {/* Database Link and Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="text-xs text-slate-600 space-y-0.5 hidden xl:block">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>ชีต: <strong className="font-mono text-emerald-700">login</strong> ({students.length}) • <strong className="font-mono text-sky-700">data</strong> ({courses.length})</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <FileSpreadsheet className="w-3 h-3 text-amber-600 shrink-0" />
                <span>บันทึกนิเทศ: <strong className="font-mono text-amber-700">บันทึกการนิเทศ</strong></span>
              </div>
            </div>

            {/* Primary Action: บันทึกรายงานการนิเทศ */}
            <button
              onClick={() => onOpenForm3()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
              title="บันทึกรายงานการนิเทศ ค้นหานักศึกษา เลือกสถานประกอบการ และบันทึกรูป 3-4 รูป"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>บันทึกรายงานการนิเทศ</span>

            </button>

            <button
              onClick={onOpenSheetsModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
              title="เปิดดูชีตฐานข้อมูลกลางทั้งหมด (login, data, Form_1)"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>เปิดชีตฐานข้อมูล</span>
            </button>
          </div>
        </div>
      </div>

      {/* PRIMARY DATA FILTER BAR: Linked to Google Sheets "login" & "data" */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border-2 border-sky-500/20 shadow-md p-5 sm:p-6 space-y-4">
        {/* Filter Title & Quick Toggles */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <span>ตัวกรองข้อมูลหลักจาก Google Sheets</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Tab: login & data
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                เชื่อมโยง <strong>room</strong>, <strong>รหัสวิชา</strong>, <strong>ชื่อวิชา</strong>, และ <strong>ครูนิเทศก์/ประจำวิชา</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick button for current teacher's students if matched */}
            {matchedLoggedInTeacher && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTeacher(matchedLoggedInTeacher);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedTeacher === matchedLoggedInTeacher
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>เฉพาะในกลุ่มนิเทศก์ของฉัน ({myStudentsCount} คน)</span>
              </button>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Main Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. Filter: room (from login & data) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-sky-600" />
                <span>1. กลุ่มเรียน (room)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">login & data</span>
            </label>
            <select
              value={selectedRoom}
              onChange={(e) => {
                setSelectedRoom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              <option value="all">ทุกกลุ่มเรียน (ทั้งหมด {students.length} คน)</option>
              {allRooms.map((room) => {
                const count = students.filter(s => s.room === room).length;
                return (
                  <option key={room} value={room}>
                    กลุ่ม {room} ({count} คน)
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Filter: ครูนิเทศก์/ประจำวิชา (from data tab) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. ครูนิเทศก์ / ประจำวิชา</span>
              </span>
              <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1 rounded font-mono">แผ่นงาน data</span>
            </label>
            <select
              value={selectedTeacher}
              onChange={(e) => {
                setSelectedTeacher(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              <option value="all">ครูนิเทศก์ทั้งหมด ({allTeachers.length} ท่าน)</option>
              {allTeachers.map((teacher) => (
                <option key={teacher} value={teacher}>
                  {teacher}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filter: รหัสวิชา / ชื่อวิชา (from data tab) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. รายวิชา (รหัสวิชา - ชื่อวิชา)</span>
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded font-mono">แผ่นงาน data</span>
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              <option value="all">ทุกรายวิชา ({allSubjects.length} วิชา)</option>
              {allSubjects.map((sub) => (
                <option key={sub.subjectCode} value={sub.subjectCode}>
                  {sub.subjectCode} {sub.subjectName}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Filter: สถานะการตรวจประเมิน */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>4. สถานะการตรวจรายงาน</span>
              </span>
              <span className="text-[10px] text-slate-400">ประเมินผล</span>
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              <option value="all">ทั้งหมด (รอตรวจ & ตรวจแล้ว)</option>
              <option value="graded">ตรวจประเมินแล้ว</option>
              <option value="pending">รอตรวจประเมิน</option>
            </select>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ-นามสกุล, รหัสนักศึกษา, สถานประกอบการ, หรือชื่อวิชาในแผ่นงาน..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-hidden transition"
          />
        </div>

        {/* Filter Summary & Active Badges */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-medium">ผลการกรอง:</span>
            <span className="font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
              พบ {filteredStudents.length} คน
            </span>
            <span className="text-slate-400">จากทั้งหมด {students.length} คนในแผ่นงาน login</span>

            {selectedRoom !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px]">
                กลุ่ม: <strong>{selectedRoom}</strong>
                <button onClick={() => setSelectedRoom('all')} className="hover:text-rose-600">×</button>
              </span>
            )}

            {selectedTeacher !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[11px] border border-indigo-200">
                ครู: <strong>{selectedTeacher}</strong>
                <button onClick={() => setSelectedTeacher('all')} className="hover:text-rose-600">×</button>
              </span>
            )}

            {selectedSubject !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] border border-emerald-200">
                วิชา: <strong>{selectedSubject}</strong>
                <button onClick={() => setSelectedSubject('all')} className="hover:text-rose-600">×</button>
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            สถานประกอบการที่เกี่ยวข้อง: <strong>{uniqueCompanies.length}</strong> แห่ง
          </div>
        </div>
      </section>

      {/* 4 Stat Cards dynamically calculated from Filtered Data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Companies */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">สถานประกอบการ</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{uniqueCompanies.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">แห่งในผลการกรอง</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Students in Care */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">นักศึกษาในผลการกรอง</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{filteredStudents.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">จากทั้งหมด {students.length} คน</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Graded / Inspected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">ตรวจนิเทศแล้ว</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {gradedCount} <span className="text-xs text-slate-400 font-normal">/ {filteredStudents.length} คน</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">ความคืบหน้ารวม {progressPercent}%</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Pending inspection */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">รอลงพื้นที่ตรวจ</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</div>
            <div className="text-[11px] text-amber-700 font-medium mt-1">รอครูนิเทศก์ประเมินผล</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* VIEW MODE TOGGLE TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'students'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>รายชื่อนักศึกษาฝึกงาน ({filteredStudents.length} คน)</span>
        </button>

        <button
          onClick={() => setActiveTab('coursesMatrix')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'coursesMatrix'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>ผังเชื่อมโยงรายวิชา & ครูนิเทศก์ประจำกลุ่ม (แผ่นงาน data - {courses.length} รายการ)</span>
        </button>
      </div>

      {/* TAB 1: STUDENT ASSESSMENT LIST TABLE */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                ตารางบันทึกการฝึกงานและข้อมูลรายวิชานิเทศก์
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              แสดง {filteredStudents.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, filteredStudents.length)} จาก {filteredStudents.length} คน
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">รหัสนักศึกษา / ชื่อ-นามสกุล</th>
                  <th className="py-3 px-4">กลุ่ม (room) & วิชาฝึกอาชีพ (data)</th>
                  <th className="py-3 px-4">สถานประกอบการ</th>
                  <th className="py-3 px-4">สถานะการตรวจ</th>
                  <th className="py-3 px-4">คะแนน</th>
                  <th className="py-3 px-4 text-center">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {paginatedStudents.map((std, idx) => {
                  const studentRoom = std.room || '';
                  const studentCourses = std.courses || getCoursesByRoom(studentRoom, courses);
                  const isExpanded = expandedStudentId === std.id;
                  
                  const realIdx = startIndex + idx;
                  const isGraded = realIdx % 3 !== 1;
                  const score = realIdx % 4 === 0 ? '19.5' : realIdx % 4 === 1 ? '18.0' : realIdx % 4 === 2 ? '17.5' : '16.5';
                  const gradeLabel = realIdx % 4 === 0 ? 'ระดับดีเยี่ยม (A)' : realIdx % 4 === 1 ? 'ระดับดีมาก (B+)' : 'ระดับดีมาก (B)';

                  // Highlight matching course for filter
                  const matchingCourse = selectedSubject !== 'all' 
                    ? studentCourses.find(c => c.subjectCode === selectedSubject)
                    : studentCourses.find(c => c.subjectCode.startsWith('30000')) || studentCourses[0];

                  return (
                    <React.Fragment key={std.id}>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {std.avatarUrl ? (
                              <img
                                src={std.avatarUrl}
                                alt={std.name}
                                className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 shadow-2xs"
                              />
                            ) : (
                              <span className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {std.initials}
                              </span>
                            )}
                            <div>
                              <div className="font-bold text-slate-900">{std.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                รหัส {std.studentCode}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Room & Enrolled Courses from data tab */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 font-mono">
                              กลุ่ม {studentRoom || 'สอฟ.2/1'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              ({studentCourses.length} รายวิชา)
                            </span>
                          </div>

                          {matchingCourse ? (
                            <div className="text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded-lg border border-slate-200/70 max-w-xs">
                              <div className="font-mono text-[10px] text-sky-700 font-semibold">{matchingCourse.subjectCode} {matchingCourse.subjectName}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <span>ครูนิเทศก์:</span>
                                <strong className="text-emerald-700">{matchingCourse.teacherName}</strong>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">ไม่พบข้อมูลรายวิชา</span>
                          )}

                          {studentCourses.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedStudentId(isExpanded ? null : std.id)}
                              className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold mt-1 inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>{isExpanded ? 'ซ่อนผังวิชา' : `ดูทั้งหมด ${studentCourses.length} รายวิชา`}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900">{std.companyName || 'ยังไม่ระบุ'}</div>
                          <div className="text-[10px] text-sky-700">{std.companyRegistration?.department || '-'}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isGraded ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              ตรวจประเมินแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              รอครูนิเทศก์ลงคะแนน
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isGraded ? (
                            <div>
                              <span className="font-bold text-slate-900 text-sm">{score}</span>
                              <span className="text-[10px] text-slate-400">/20</span>
                              <div className="text-[10px] text-sky-700 font-semibold">{gradeLabel}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">- รอการประเมิน -</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onNavigateA4(std.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium transition cursor-pointer"
                            >
                              <Printer className="w-3 h-3 text-slate-500" />
                              <span>พิมพ์ A4</span>
                            </button>
                            <button
                              onClick={() => onOpenForm3(std.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-2xs"
                              title={`บันทึกรายงานการนิเทศ & รูปถ่าย 3-4 รูป สำหรับ ${std.name}`}
                            >
                              <Camera className="w-3 h-3" />
                              <span>บันทึกการนิเทศ</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable row: All courses for this room from data sheet */}
                      {isExpanded && (
                        <tr className="bg-sky-50/40">
                          <td colSpan={6} className="px-6 py-3 border-y border-sky-100">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-sky-950 flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-sky-700" />
                                  <span>ผังรายวิชาฝึกอาชีพและครูนิเทศก์ประจำกลุ่ม {studentRoom} (เชื่อมข้อมูลแผ่นงาน data):</span>
                                </span>
                                <span className="text-[11px] text-slate-500">รวม {studentCourses.length} รายวิชา</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {studentCourses.map((c, cIdx) => (
                                  <div key={cIdx} className="p-2.5 bg-white rounded-xl border border-sky-200/80 shadow-2xs text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-[10px] text-sky-700 font-bold">{c.subjectCode}</span>
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">กลุ่ม {c.room}</span>
                                    </div>
                                    <div className="font-semibold text-slate-900 text-[11px] line-clamp-1">{c.subjectName}</div>
                                    <div className="text-[10px] text-slate-600 flex items-center gap-1 pt-1 border-t border-slate-100">
                                      <span className="text-slate-400">ครูนิเทศก์:</span>
                                      <strong className="text-emerald-800">{c.teacherName}</strong>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {paginatedStudents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                      ไม่พบข้อมูลนักศึกษาตามเงื่อนไขที่เลือก (กรุณาลองปรับหรือล้างตัวกรอง)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              แสดงรายการ {filteredStudents.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, filteredStudents.length)} จากทั้งหมด {filteredStudents.length} คน (หน้า {currentPageSafe} จาก {totalPages})
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPageSafe <= 1}
                className="px-2.5 py-1 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-0.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>ย้อนกลับ</span>
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPageSafe <= 3) {
                  pageNum = i + 1;
                } else if (currentPageSafe >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPageSafe - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                      currentPageSafe === pageNum
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPageSafe >= totalPages}
                className="px-2.5 py-1 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-0.5"
              >
                <span>ถัดไป</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COURSE & TEACHER MATRIX (GOOGLE SHEETS DATA TAB) */}
      {activeTab === 'coursesMatrix' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>ตารางข้อมูลรายวิชาและครูนิเทศก์ประจำกลุ่ม (Google Sheet แผ่นงาน: data)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ฐานข้อมูลเชื่อมโยง {courses.length} แผนการสอนและนิเทศก์ประจำภาคเรียน
              </p>
            </div>

            <a
              href={DATA_SHEET_CONFIG.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline inline-flex items-center gap-1 shrink-0"
            >
              <span>เปิดชีต data ใน Google Sheets</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-700 text-[11px] font-semibold border-y border-slate-200">
                <tr>
                  <th className="py-3 px-4">กลุ่มเรียน (room)</th>
                  <th className="py-3 px-4">รหัสวิชา</th>
                  <th className="py-3 px-4">ชื่อวิชา</th>
                  <th className="py-3 px-4">ครูนิเทศก์ / ประจำวิชา</th>
                  <th className="py-3 px-4 text-center">นักศึกษาในห้อง</th>
                  <th className="py-3 px-4 text-center">กรองดูนักศึกษา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {courses.map((course, idx) => {
                  const studentCount = students.filter(s => s.room === course.room).length;
                  const isCurrentTeacherCourse = teacherName && course.teacherName.includes(teacherName.replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, ''));

                  return (
                    <tr 
                      key={`${course.room}-${course.subjectCode}-${idx}`} 
                      className={`hover:bg-slate-50 transition ${
                        isCurrentTeacherCourse ? 'bg-sky-50/50' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-sky-800 px-2 py-0.5 rounded bg-sky-100/80 border border-sky-200 text-xs">
                          {course.room}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {course.subjectCode}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-900">
                        {course.subjectName}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-emerald-800">{course.teacherName}</span>
                          {isCurrentTeacherCourse && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                              ของคุณ
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                        {studentCount} คน
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoom(course.room);
                            setSelectedSubject(course.subjectCode);
                            setActiveTab('students');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold border border-sky-200 transition cursor-pointer"
                        >
                          ดูกลุ่มนี้ &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Cards (Supervision & A4 Report Print) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Supervise */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  <Camera className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-semibold text-emerald-800">แบบฟอร์มการตรวจนิเทศก์</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                ระบบบันทึกการนิเทศ
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">บันทึกรายงานการนิเทศ & ประเมินสมรรถนะ</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                ค้นหาและเลือกนักศึกษา, ระบุสถานประกอบการที่เข้ารับการนิเทศ พร้อมบันทึกภาพถ่ายการลงพื้นที่ 3-4 รูป และบันทึกข้อมูลจัดเก็บไว้ในระบบ
              </p>
            </div>

            {/* Checklist */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <div className="font-semibold text-slate-800 text-[11px] flex items-center justify-between">
                <span>ครูนิเทศก์ผู้ประเมิน: <strong>{teacherName}</strong></span>
                <span className="text-[10px] text-emerald-700 font-mono">พร้อมบันทึกลงระบบ</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 text-[11px]">
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ค้นหา/เลือกนักศึกษา (แผ่นงาน login)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ระบุสถานประกอบการที่นิเทศ
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> แนบรูปการนิเทศ 3-4 รูป
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> บันทึกเข้าชีตและ Firebase
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onOpenForm3()}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>เปิดบันทึกรายงานการนิเทศ & แนบรูป 3-4 รูป</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
          </button>
        </div>

        {/* Right: Print & Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                  4
                </span>
                <span className="text-[11px] font-semibold text-slate-500">ระบบวิเคราะห์ & พิมพ์เอกสาร</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800">
                A4 Standard
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">พิมพ์ / สรุปรายงานประจำสัปดาห์ (A4)</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                ดึงข้อมูลสถิติเวลาปฏิบัติงานและสมุดบันทึกรายวันของนักศึกษา พร้อมพิมพ์เอกสารรายงาน A4 ที่มีชื่อและลายมือชื่อครูนิเทศก์ ({teacherName}) อัตโนมัติ
              </p>
            </div>

            {/* Radial metric */}
            <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">อัตราการส่งบันทึกประจำสัปดาห์</span>
                <div className="text-2xl font-bold text-slate-900 mt-0.5">{progressPercent}%</div>
                <div className="text-[11px] text-emerald-700 font-medium">ตรวจประเมินแล้ว {gradedCount} จาก {filteredStudents.length} คน</div>
              </div>
              {/* Ring meter */}
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle cx="32" cy="32" r="26" stroke="#e2e8f0" strokeWidth="6" fill="transparent" />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke="#0284c7"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={163.3}
                    strokeDashoffset={163.3 * (1 - (progressPercent / 100))}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute font-bold text-xs text-sky-900 font-mono">W-12</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
              <span className="px-2.5 py-1 rounded-md bg-slate-100">ฟอร์แมต A4 สอศ. มาตรฐาน</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100">อัปเดตอัตโนมัติ Real-time</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigateA4()}
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>พิมพ์รายงาน A4</span>
            </button>
            <button
              onClick={onOpenLookerModal}
              className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              <span>Looker Studio</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
