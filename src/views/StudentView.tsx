import React from 'react';
import { 
  Zap, 
  CheckCircle2, 
  ExternalLink, 
  Clock, 
  ArrowRight, 
  Printer, 
  FileText, 
  Upload, 
  Camera, 
  Calendar, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Eye, 
  Smartphone, 
  HelpCircle, 
  Image as ImageIcon,
  Award,
  FileSpreadsheet,
  BookOpen
} from 'lucide-react';
import { Student, WeeklySubmission } from '../types';
import { StudentAvatar } from '../components/StudentAvatar';

interface StudentViewProps {
  student: Student;
  submissions: WeeklySubmission[];
  onOpenForm1: () => void;
  onOpenForm2: () => void;
  onNavigateA4: () => void;
  onNavigateWeeklyLog?: (weekNum?: number) => void;
  onNavigateGuide?: () => void;
  isMobileLayout?: boolean;
  onUpdateAvatar?: (dataUrl: string) => void;
}

export const StudentView: React.FC<StudentViewProps> = ({
  student,
  submissions,
  onOpenForm1,
  onOpenForm2,
  onNavigateA4,
  onNavigateWeeklyLog,
  onNavigateGuide,
  isMobileLayout = false,
  onUpdateAvatar,
}) => {
  const currentSubmission = submissions.find(s => s.weekNumber === student.currentWeek);

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb & Actions Bar */}
      {!isMobileLayout && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span>หน้าหลัก</span>
            <span>&gt;</span>
            <span className="font-semibold text-slate-900">ส่วนของนักศึกษา (Student Workspace)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Google Form Real-time Sync Active
            </span>
            {onNavigateGuide && (
              <button
                type="button"
                onClick={onNavigateGuide}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-xs shadow-2xs transition cursor-pointer"
                title="ดูคู่มือการใช้งานระบบสำหรับนักศึกษา (PDF)"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>คู่มือใช้งาน (PDF)</span>
              </button>
            )}
            <button
              onClick={onNavigateA4}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium text-xs shadow-2xs transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>พิมพ์ใบประเมิน A4</span>
            </button>
          </div>
        </div>
      )}

      {/* Student Profile Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Student Avatar with Gender Silhouette and Upload */}
            <StudentAvatar
              student={student}
              size="lg"
              showUploadButton={true}
              showUploadLink={true}
              onAvatarUpdated={onUpdateAvatar}
            />

            <div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
                <span>{student.level}</span>
                <span>•</span>
                <span>{student.department}</span>
                <span>•</span>
                <span className="font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-[11px]">
                  กลุ่ม: {student.room}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">{student.name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600">
                <span className="font-mono font-medium">รหัส: {student.studentCode}</span>
                <span>•</span>
                <span className="text-slate-500">{student.email}</span>
                <span>•</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ฐานข้อมูล Google Sheet login
                </span>
              </div>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6 space-y-1.5 text-xs">
            <div className="flex items-start gap-2 text-slate-700">
              <span className="text-slate-400">สถานประกอบการฝึกอาชีพ:</span>
              <span className="font-semibold text-slate-900">{student.companyName || 'ยังไม่ระบุ'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="text-slate-400">กลุ่มห้องเรียน:</span>
              <span className="font-semibold text-sky-800">{student.room}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className="text-slate-400">ครูนิเทศก์ประจำกลุ่ม:</span>
              <span className="font-semibold text-sky-700">{student.supervisorTeacher}</span>
            </div>
          </div>
        </div>

        {/* Enrolled Courses & Assigned Teachers from Google Sheets data tab */}
        {student.courses && student.courses.length > 0 && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                <span>รายวิชาที่ลงทะเบียนฝึกอาชีพ & ครูนิเทศก์ประจำวิชา (กลุ่ม {student.room}):</span>
              </span>
              <span className="text-[10px] text-emerald-800 font-semibold px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 font-mono">
                เชื่อมข้อมูลแผ่นงาน data ({student.courses.length} รายวิชา)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
              {student.courses.map((course, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-sky-700 font-bold">{course.subjectCode}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 font-medium">กลุ่ม {course.room}</span>
                  </div>
                  <div className="font-semibold text-slate-900 text-[11px] line-clamp-1">{course.subjectName}</div>
                  <div className="text-[10px] text-slate-600 pt-1 border-t border-slate-100 flex items-center gap-1">
                    <span className="text-slate-400">ครูนิเทศก์:</span>
                    <strong className="text-emerald-800">{course.teacherName}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar & Hours */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span className="font-bold text-slate-800">ความก้าวหน้าการฝึกงานตามหลักสูตร</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">สะสม:</span>
              <span className="text-base font-bold text-slate-900">
                {student.accumulatedHours} / {student.requiredHours} ชม.
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                {Math.round((student.accumulatedHours / student.requiredHours) * 100)}% ครบตามเกณฑ์
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(student.accumulatedHours / student.requiredHours) * 100}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>สัปดาห์ที่ฝึกจริง: {student.actualWeeks} สัปดาห์</span>
            <div className="flex items-center gap-2">
              <span>กำหนดทั้งหมด {student.totalWeeks} สัปดาห์ (เหลืออีก {student.totalWeeks - student.actualWeeks} สัปดาห์)</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-emerald-700 font-medium">
                <Award className="w-3.5 h-3.5" />
                <span>เกณฑ์ชั่วโมงขั้นต่ำ พร้อมจบการศึกษา</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Action Cards (Form #1 and Form #2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Step 1 Form #1 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                ขั้นตอนที่ 1 • แบบฟอร์มแรกเข้า
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                บันทึกแล้ว
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">บันทึกข้อมูลสถานประกอบการ</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                บันทึกรายละเอียดสถานที่ฝึกงาน ข้อมูลหัวหน้างาน/พี่เลี้ยง ช่องทางการติดต่อฉุกเฉิน และพิกัด GPS เพื่อใช้ในแผนการออกนิเทศก์ของครูที่ปรึกษา
              </p>
            </div>

            {/* Registered Info Preview */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-[11px] pb-1 border-b border-slate-200">
                <span>สถานะบันทึกล่าสุด:</span>
                <span className="text-sky-700 font-semibold">{student.companyRegistration.registeredAt}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block">สถานประกอบการ:</span>
                  <span className="font-semibold text-slate-900">{student.companyName || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">กลุ่มห้องเรียน:</span>
                  <span className="font-semibold text-sky-800">{student.room}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">หน่วยงาน / แผนก:</span>
                  <span className="font-semibold">{student.companyRegistration.department || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">พี่เลี้ยง/ผู้ควบคุมงาน:</span>
                  <span className="font-semibold">{student.companyRegistration.mentorName || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">เบอร์ติดต่อพี่เลี้ยง / ฉุกเฉิน:</span>
                  <span className="font-semibold text-sky-700">
                    {student.companyRegistration.mentorPhone && student.companyRegistration.mentorPhone !== '-'
                      ? student.companyRegistration.mentorPhone
                      : student.companyRegistration.emergencyPhone || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">พิกัด GPS หมุดแผนที่:</span>
                  <span className="font-mono text-emerald-700 font-semibold flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    {student.companyRegistration.gpsCoordinates || '-'}
                  </span>
                </div>
              </div>

              {/* Checkmarks */}
              <div className="pt-2 border-t border-slate-200/80 flex flex-wrap gap-2 text-[10px] text-slate-600">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> ชื่อสถานประกอบการ
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> แผนกงาน
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> ชื่อพี่เลี้ยง
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> พิกัด Google Maps
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenForm1}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
              <span>ดูข้อมูล / อัปเดตข้อมูลสถานประกอบการ</span>
            </button>
          </div>
        </div>

        {/* Right: Step 2 Form #2 */}
        <div className="bg-white rounded-2xl border-2 border-sky-600/80 p-6 shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                กำหนดส่งภายในวันอาทิตย์นี้
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                สัปดาห์ที่ {student.currentWeek} รอดำเนินการ
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">ส่งบันทึกปฏิบัติงานประจำสัปดาห์</h3>
              <p className="text-xs font-semibold text-sky-800 mt-1">
                สัปดาห์ที่ 8: งานติดตั้งตู้ Distribution Board (MDB) & Wiring Control สายวงจรไฟฟ้าโรงงาน
              </p>
            </div>

            {/* Checklist */}
            <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 text-xs space-y-2.5">
              <div className="font-semibold text-slate-800 text-[11px]">
                ข้อกำหนดในการกรอก Google Form ประจำสัปดาห์:
              </div>
              <ul className="space-y-2 text-slate-700 text-[11px]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>รายละเอียดงาน & Safety:</strong> เครื่องมือที่ใช้ (Multimeter, Megger Test, Hand Tools) พร้อมมาตรการสวมใส่อุปกรณ์ PPE ครบชุด
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>อัปโหลดภาพถ่ายหลักฐาน (ขั้นต่ำ 3 รูป):</strong> ภาพขณะปฏิบัติงานจริง, ภาพตู้ควบคุม/วงจรที่ประกอบ, และภาพคู่กับหัวหน้างาน/พี่เลี้ยง
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>บันทึกเวลาปฏิบัติงาน:</strong> ครบ 40 ชั่วโมง/สัปดาห์ (จันทร์-ศุกร์ 08:30 - 16:30 น.)
                  </span>
                </li>
              </ul>

              <div className="p-2.5 rounded-lg bg-white border border-sky-200 text-[10px] text-slate-600 flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>ภาพถ่ายจะถูกซิงค์ตรงเข้าแฟ้ม Google Drive ประจำตัวนักศึกษา โดยอัตโนมัติ</span>
              </div>
            </div>
          </div>

            <div className="space-y-2 pt-2">
            <button
              onClick={() => onNavigateWeeklyLog ? onNavigateWeeklyLog(student.currentWeek) : onOpenForm2()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <span>เปิดหน้าบันทึกการปฏิบัติงาน & แนบรูปถ่าย (สัปดาห์ 1 - 15)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenForm2}
              className="w-full py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-sky-600" />
              <span>ส่งผ่านแบบฟอร์มป๊อปอัปด่วน (Form #2)</span>
            </button>
            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-1">
              <span>จัดเก็บลง Firebase Firestore (internship2-2569)</span>
              <span>ปิดรอบประเมิน: วันอาทิตย์ 23:59 น.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submission History Table (ประวัติการส่งรายงานและผลการตรวจนิเทศก์) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-sm">ประวัติการส่งรายงานและผลการตรวจนิเทศก์</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            สถานะ: ตรวจผ่าน 7 รายการ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">สัปดาห์</th>
                <th className="py-3 px-4">หัวข้องานปฏิบัติการ</th>
                <th className="py-3 px-3 text-center">ชั่วโมงฝึก</th>
                <th className="py-3 px-3 text-center">รูปภาพแนบ</th>
                <th className="py-3 px-4">สถานะการตรวจ</th>
                <th className="py-3 px-4">ลายเซ็นครูนิเทศก์</th>
                <th className="py-3 px-3 text-center">เอกสาร</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                    สัปดาห์ที่ {sub.weekNumber}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{sub.taskTitle}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">ส่งเมื่อ {sub.submittedAt}</div>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-900 whitespace-nowrap">
                    {sub.totalHours} ชม.
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100 text-[10px] font-medium">
                      <Camera className="w-3 h-3" />
                      <span>{sub.photos?.length || 4} รูป</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {sub.status === 'graded' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ตรวจผ่านแล้ว ({sub.teacherGrade})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" />
                        <span>รอตรวจประเมิน</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs font-sarabun italic text-slate-700">
                    {sub.teacherSignature}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={onNavigateA4}
                      className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 text-xs font-medium cursor-pointer"
                      title="เปิดดูรายงานฉบับสมบูรณ์"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>เรียกดู</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help & Info Row (3 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs">
            <Smartphone className="w-4 h-4" />
            <span>คำแนะนำสำหรับผู้ใช้มือถือ</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            หากเปิด Google Form ในสมาร์ตโฟน แนะนำให้ล็อกอินบัญชี @kktech.ac.th บนเบราว์เซอร์ Chrome ก่อน เพื่อให้ซิงค์รูปถ่ายได้ทันที
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
            <Camera className="w-4 h-4" />
            <span>เทคนิคการถ่ายภาพหน้างาน</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            เน้นแสงสว่างเพียงพอ หลีกเลี่ยงมุมย้อนแสง ควรถ่ายให้เห็นป้ายชื่อตู้ควบคุม มิเตอร์วัดค่าชัดเจน และสวมหมวกนิรภัย PPE ครบ
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
            <HelpCircle className="w-4 h-4" />
            <span>พบปัญหาการซิงค์ข้อมูล</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            หากส่ง Google Form แล้วสถานะในหน้านี้ยังไม่อัปเดตภายใน 5 นาที ให้กดปุ่มรีเฟรช Sync ด้านบน หรือแจ้งผู้ดูแลระบบแผนกวิชา
          </p>
        </div>
      </div>
    </div>
  );
};
