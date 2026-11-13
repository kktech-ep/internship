import React from 'react';
import { 
  Zap, 
  ShieldCheck, 
  Database, 
  BarChart3, 
  ExternalLink, 
  ArrowRight, 
  FileText, 
  Printer, 
  Users, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  Calendar, 
  AlertTriangle, 
  Bell, 
  Phone, 
  MessageSquare, 
  ChevronRight,
  Sparkles,
  Download,
  BookOpen
} from 'lucide-react';
import { Announcement, Student, AuthUser } from '../types';
import { getCurrentWeekInfo } from '../data/weeksData';
import { StudentAvatar } from '../components/StudentAvatar';
import { downloadAllWebZip } from '../services/webZipService';

interface HubViewProps {
  onNavigate: (view: string) => void;
  onOpenForm1: () => void;
  onOpenForm2: () => void;
  onOpenForm3: () => void;
  onOpenSheetsModal: () => void;
  onOpenLookerModal: () => void;
  announcements: Announcement[];
  student: Student;
  currentUser?: AuthUser | null;
  onOpenAuthModal?: () => void;
  onUpdateAvatar?: (dataUrl: string) => void;
}

export const HubView: React.FC<HubViewProps> = ({
  onNavigate,
  onOpenForm1,
  onOpenForm2,
  onOpenForm3,
  onOpenSheetsModal,
  onOpenLookerModal,
  announcements,
  student,
  currentUser,
  onOpenAuthModal,
  onUpdateAvatar,
}) => {
  const currentWeekInfo = getCurrentWeekInfo();

  return (
    <div className="space-y-6 pb-12">
      {/* Blue Alert Banner matching screenshot 1 */}
      <div className="bg-[#0f2444] text-white rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-sky-900/60 shadow-md">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-600/30 border border-sky-400/30 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-sky-400 fill-sky-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm text-white">ภาคเรียนที่ 2 ปีการศึกษา 2569</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/20 text-sky-300 border border-sky-400/30">
                รอบฝึกงาน ปวช.3 & ปวส.2
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              ระบบจำกัดการเข้าใช้งานเฉพาะบัญชี Google อีเมลองค์กรวิทยาลัย <span className="font-semibold text-white">@kktech.ac.th</span> เท่านั้น เพื่อความปลอดภัยของข้อมูลวิชาชีพ
            </p>
          </div>
        </div>

        {currentUser?.role !== 'student' && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {currentUser ? (
              <button
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition cursor-pointer"
                title="คลิกเพื่อจัดการบัญชี @kktech.ac.th"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>เข้าใช้งาน: {currentUser.email}</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition cursor-pointer"
              >
                <span>เข้าสู่ระบบ @kktech.ac.th</span>
              </button>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Google SSO
            </span>
          </div>
        )}
      </div>

      {/* Student User Manual Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-indigo-700/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-white">คู่มือการใช้งานระบบสำหรับนักศึกษา (Student Guide)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-400/20 text-sky-300 border border-sky-400/30">
                ดาวน์โหลดไฟล์ .PDF
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              ขั้นตอนการเลือกบทบาท, บันทึกสถานประกอบการ (ฟ.1), ส่งรายงานประจำสัปดาห์ (ฟ.2), แนบรูปภาพหน้างาน และเช็คผลการตรวจนิเทศ พร้อมภาพประกอบหน้าจอจริง
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('guide')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition shrink-0 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>เปิดอ่านคู่มือ & ดาวน์โหลด PDF</span>
        </button>
      </div>

      {/* Hero Section & Right Schedule Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Hero */}
        <div className="lg:col-span-2 space-y-3 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-sky-700 font-semibold text-xs tracking-wide">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Khon Kaen Technical College • Electrical Power Department</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
            ระบบบันทึกข้อมูลการฝึกงาน<br />
            แผนกวิชาช่างไฟฟ้ากำลัง
          </h1>

          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-2xl">
            พอร์ทัลรวมศูนย์การติดตามและประเมินผลการฝึกประสบการณ์วิชาชีพ ช่างไฟฟ้ากำลัง สำหรับนักศึกษาระดับ ปวช. และ ปวส. เชื่อมโยงข้อมูลแบบเรียลไทม์ผ่านแพลตฟอร์ม Google Cloud & Google Workspace
          </p>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              <span>มาตรฐานความปลอดภัยทางวิศวกรรม</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Google Sheets Database 2.0</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Looker Studio Certified Engine</span>
            </div>
          </div>
        </div>

        {/* Right Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>กำหนดการส่งประจำงวด</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
              Active
            </span>
          </div>

          <div className="my-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs text-slate-500">สัปดาห์ที่บันทึกงาน:</span>
                <span className="block text-[11px] text-sky-600 font-medium mt-0.5">
                  (อ้างอิงจากสัปดาห์ของเวลาปัจจุบัน)
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-slate-900">
                  สัปดาห์ที่ {currentWeekInfo.weekNumber} / 18
                </span>
                <span className="block text-[10px] text-slate-400 font-normal">
                  รอบวันที่ {currentWeekInfo.dateRange}
                </span>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-sky-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${currentWeekInfo.progressPercent}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>ความคืบหน้าภาคเรียน</span>
              <span className="font-semibold text-slate-700">{currentWeekInfo.progressPercent}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500">กำหนดส่ง: วันอาทิตย์</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200">
              ก่อน 23:59 น.
            </span>
          </div>
        </div>
      </div>

      {/* Primary Access Portals based on logged in role */}
      {(() => {
        const role = currentUser?.role || 'student';
        const showStudentCard = role === 'student' || role === 'admin';
        const showTeacherCard = role === 'teacher' || role === 'admin';
        const showAdminCard = role === 'admin';

        return (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-sky-600"></span>
              <span>
                {role === 'student'
                  ? 'ระบบงานสำหรับนักศึกษา'
                  : role === 'teacher'
                  ? 'ระบบงานสำหรับครูนิเทศก์'
                  : 'เลือกเข้าใช้ทำงานระบบ (ทุกบทบาท)'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {role === 'student'
                ? 'เมนูบันทึกข้อมูลและส่งรายงานการฝึกงาน'
                : role === 'teacher'
                ? 'เมนูตรวจนิเทศและประเมินผลสมรรถนะ'
                : 'เลือกเข้าใช้ทำงานระบบ'}
            </h2>

            <div className={`grid gap-6 pt-2 ${
              role === 'admin'
                ? 'grid-cols-1 md:grid-cols-3'
                : 'grid-cols-1 max-w-2xl'
            }`}>
              {/* Card 1: Student Intern Portal */}
              {showStudentCard && (
                <div className="bg-white rounded-2xl border-t-4 border-t-sky-500 border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <StudentAvatar
                          student={student}
                          size="md"
                          showUploadButton={true}
                          showUploadLink={true}
                          onAvatarUpdated={onUpdateAvatar}
                        />
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">{student.name}</span>
                          <span className="text-[11px] text-slate-500 block">
                            รหัส: {student.studentCode} • กลุ่ม: {student.room}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                        {student.level || 'ปวช.3 & ปวส.2'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">นักศึกษาฝึกงาน</h3>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        STUDENT INTERN PORTAL
                      </span>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        ลงทะเบียนสถานประกอบการ ส่งบันทึกรายงานการฝึกงานประจำสัปดาห์ พร้อมอัปโหลดรูปภาพปฏิบัติงานจริง ตู้ MDB, PLC และงานภาคสนาม
                      </p>
                    </div>

                    {/* Status pill inside card */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-sky-600" />
                        <span>สัปดาห์ปัจจุบัน: สัปดาห์ที่ {currentWeekInfo.weekNumber} (อ้างอิงเวลาปัจจุบัน)</span>
                      </div>
                      <p className="text-[11px] text-slate-500">ส่งรายงานทันในรอบรออนุมัติ</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-6">
                    <button
                      onClick={onOpenForm1}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-xs cursor-pointer"
                    >
                      <span>1. บันทึกข้อมูลสถานประกอบการ</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={onOpenForm2}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold transition cursor-pointer"
                    >
                      <span>2. ส่งรายงานประจำสัปดาห์ + ภาพ</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onNavigate('weekly-log')}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      <span>3. ดูประวัติบันทึกปฏิบัติงาน & ภาพถ่าย</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Card 2: Supervisor & Faculty */}
              {showTeacherCard && (
                <div className="bg-white rounded-2xl border-t-4 border-t-indigo-600 border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        กำลังเปิดตรวจ
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">ครูผู้ควบคุม / ครูนิเทศก์</h3>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        SUPERVISOR & FACULTY
                      </span>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        ติดตามผลการฝึกงาน บันทึกการลงพื้นที่นิเทศสถานประกอบการ และประเมินผลคะแนนสมรรถนะวิชาชีพตามเกณฑ์มาตรฐาน สอศ.
                      </p>
                    </div>

                    {/* Stats 3 columns */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                      <div>
                        <div className="text-base font-bold text-slate-900">42</div>
                        <div className="text-[10px] text-slate-500">ในความดูแล</div>
                      </div>
                      <div>
                        <div className="text-base font-bold text-emerald-600">38</div>
                        <div className="text-[10px] text-slate-500">ส่งแล้ว</div>
                      </div>
                      <div>
                        <div className="text-base font-bold text-amber-600">4</div>
                        <div className="text-[10px] text-slate-500">รอตรวจ</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-6">
                    <button
                      onClick={onOpenForm3}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-xs cursor-pointer"
                    >
                      <span>1. บันทึกรายงานการนิเทศ</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => onNavigate('a4')}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition cursor-pointer"
                    >
                      <span>2. สรุปผล & พิมพ์ A4 (PDF)</span>
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onNavigate('map')}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      <span>3. แผนที่สถานประกอบการ</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Card 3: Department Head & Admin */}
              {showAdminCard && (
                <div className="bg-white rounded-2xl border-t-4 border-t-rose-600 border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Admin Console
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">ผู้ดูแลระบบ & หัวหน้าแผนก</h3>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        DEPARTMENT HEAD & SYSTEM OPS
                      </span>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        จัดการฐานข้อมูล Google Sheets, มอบหมายครูนิเทศก์, จัดการสิทธิ์การเข้าถึง และตรวจสอบภาพรวมทั้งแผนกวิชา
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>แถวข้อมูลทั้งหมด:</span>
                      </div>
                      <span className="font-bold text-slate-900">2,450 รายการ</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-6">
                    <button
                      type="button"
                      onClick={() => downloadAllWebZip()}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      title="ดาวน์โหลดไฟล์เว็บทั้งหมดเป็น ZIP เพื่อนำไปติดตั้งบน Server จริง (AppServ / Apache)"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลดเว็บลง Server จริง (.zip)</span>
                      </span>
                      <span className="text-[10px] bg-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                        ZIP
                      </span>
                    </button>
                    <button
                      onClick={onOpenSheetsModal}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-xs cursor-pointer"
                    >
                      <span>เปิด Google Sheet ฐานข้อมูลหลัก</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={onOpenLookerModal}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Looker Studio</span>
                      </button>
                      <button
                        onClick={onOpenSheetsModal}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
                      >
                        <span>ส่งออกเกรด</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Google Workspace Enterprise Status */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-sky-600 text-[11px] font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>ระบบเชื่อมต่อคลาวด์วิทยาลัย</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Google Workspace Enterprise Status</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ซิงค์อัตโนมัติทุก 15 นาที
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Forms status */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Google Forms</div>
                <div className="text-[11px] text-slate-500">3 แบบฟอร์มออนไลน์</div>
              </div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                Online
              </span>
              <div className="text-[10px] text-slate-400 mt-1">12 นาทีที่แล้ว</div>
            </div>
          </div>

          {/* Sheets status */}
          <div 
            onClick={onOpenSheetsModal}
            className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Google Sheets</div>
                <div className="text-[11px] text-slate-500 font-mono">Form_1 (1wQWPpmb...)</div>
              </div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                Synced
              </span>
              <div className="text-[10px] text-slate-400 mt-1">2,450 rows</div>
            </div>
          </div>

          {/* Looker status */}
          <div 
            onClick={onOpenLookerModal}
            className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Looker Analytics</div>
                <div className="text-[11px] text-slate-500">สรุปการนิเทศสด</div>
              </div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                Connected
              </span>
              <div className="text-[10px] text-slate-400 mt-1">Live Stream</div>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements & Student Help Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Announcements (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-600" />
              <h3 className="font-bold text-slate-900 text-sm">ประกาศสำคัญสำหรับนักศึกษาฝึกงาน</h3>
            </div>
            <span className="text-xs text-sky-600 hover:text-sky-700 font-medium cursor-pointer">
              ดูประกาศทั้งหมด
            </span>
          </div>

          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    {ann.type === 'urgent' ? (
                      <span className="p-1 rounded bg-rose-100 text-rose-600 shrink-0 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </span>
                    ) : ann.type === 'schedule' ? (
                      <span className="p-1 rounded bg-sky-100 text-sky-600 shrink-0 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="p-1 rounded bg-slate-200 text-slate-600 shrink-0 mt-0.5">
                        <FileText className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{ann.title}</h4>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{ann.content}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{ann.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Help Center (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                <span className="text-xs font-bold">?</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">ศูนย์ช่วยเหลือนักศึกษา</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              มีปัญหาการกรอกฟอร์ม เข้าสู่อีเมล @kktech.ac.th ไม่ได้ หรือต้องการแจ้งเปลี่ยนสถานที่ฝึกงานฉุกเฉิน
            </p>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2">
              <div className="font-semibold text-slate-800">ห้องพักครูแผนกช่างไฟฟ้ากำลัง</div>
              <p className="text-[11px] text-slate-500">อาคาร 3 ชั้น 2 วิทยาลัยเทคนิคขอนแก่น</p>
              <div className="flex items-center gap-2 text-sky-700 font-semibold text-xs pt-1">
                <Phone className="w-3.5 h-3.5" />
                <span>043-009700 ต่อ 214</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
              <div className="flex items-center gap-2 font-semibold text-emerald-800">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>LINE Official: @kktech-power</span>
              </div>
              <p className="text-[11px] text-emerald-700">ตอบกลับในเวลาทำการ 08.30 - 16.30 น.</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
            <div className="font-semibold text-amber-900 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>ฉุกเฉินเหตอุบัติเหตุไฟฟ้า: กดต่อ 101 ตลอด 24 ชม.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
