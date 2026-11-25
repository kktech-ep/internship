import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileCheck,
  GraduationCap,
  MapPin,
  Printer,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { AuthUser } from '../types';

interface StudentGuideViewProps {
  onNavigate: (view: string) => void;
  currentUser: AuthUser | null;
}

export const StudentGuideView: React.FC<StudentGuideViewProps> = ({
  onNavigate,
  currentUser,
}) => {
  const isTeacherOrAdmin = currentUser?.role === 'teacher' || currentUser?.role === 'admin';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-14 print:max-w-none print:pb-0">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              คู่มือการใช้งานระบบฝึกอาชีพทวิภาคี KKTECH
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              แผนกวิชาช่างไฟฟ้ากำลัง วิทยาลัยเทคนิคขอนแก่น • ภาคเรียนที่ 2/2569
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate(isTeacherOrAdmin ? 'teacher' : 'hub')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{currentUser ? 'กลับหน้าหลักระบบ' : 'กลับหน้าเข้าสู่ระบบ'}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>พิมพ์คู่มือ / บันทึกเป็น PDF</span>
          </button>
        </div>
      </div>

      {/* Guide Document Body */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8 print:border-0 print:shadow-none print:p-0">
        {/* Intro Banner */}
        <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="./assets/aistudio/unnamed_54baf6fc.jpg"
              alt="KKTECH"
              className="w-14 h-14 object-contain rounded-xl border border-slate-200 p-1 bg-white"
            />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                แนวทางปฏิบัติสำหรับนักศึกษาและครูนิเทศก์ (ภาคเรียนที่ 2/2569)
              </h2>
              <p className="text-xs text-slate-600">
                ระยะเวลาฝึกอาชีพ 18 สัปดาห์ (720 ชั่วโมง) เริ่ม 19 ตุลาคม 2569 — กุมภาพันธ์ 2570
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold self-start">
            อัปเดตล่าสุด: ระบบฐานข้อมูลออนไลน์ Real-time
          </span>
        </div>

        {/* Section 1: Student Steps */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sky-800">
            <GraduationCap className="w-5 h-5" />
            <h3 className="text-base sm:text-lg font-bold">ส่วนที่ 1: ขั้นตอนสำหรับนักศึกษาฝึกอาชีพ</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs">1</span>
                <span>เข้าสู่ระบบด้วยรหัสนักศึกษา</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                ใช้รหัสนักศึกษา (User) และรหัสผ่าน (Pass) ตามข้อมูลในระบบ Google Sheet เพื่อเข้าใช้งานพอร์ทัลส่วนตัวและอัปโหลดรูปภาพประจำตัว
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs">2</span>
                <span>กรอกข้อมูลสถานประกอบการ (แบบฟอร์ม #1)</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                ตรวจสอบและบันทึกชื่อสถานประกอบการ แผนก ชื่อ-เบอร์โทรพี่เลี้ยง พร้อมกดปุ่ม <strong className="text-slate-800">ดึงพิกัด GPS</strong> หน้างานจริงเพื่อให้ครูนิเทศก์เดินทางได้ถูกต้อง
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs">3</span>
                <span>บันทึกการปฏิบัติงานรายสัปดาห์ (สัปดาห์ที่ 1–18)</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                ระบุรายละเอียดงานรายวัน จันทร์–ศุกร์ (วันละ 8 ชั่วโมง / 40 ชั่วโมงต่อสัปดาห์) เช็กลิสต์ความปลอดภัย PPE/LOTO และกดปุ่ม <strong className="text-slate-800">บันทึกลงฐานข้อมูล</strong>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <span className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs">4</span>
                <span>แนบรูปถ่ายหน้างาน & พิมพ์แบบ ทว.04 (A4)</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                แนบภาพถ่ายขณะปฏิบัติงานจริงอย่างน้อย 2–3 ภาพต่อสัปดาห์ ระบบจะจัดรูปแบบเอกสาร ทว.04 ขนาด A4 พร้อมพิมพ์ส่งเมื่อสิ้นสุดการฝึกงาน
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Teacher Steps */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-800">
            <Users className="w-5 h-5" />
            <h3 className="text-base sm:text-lg font-bold">ส่วนที่ 2: ขั้นตอนสำหรับครูนิเทศก์และครูประจำวิชา</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>วางแผนเส้นทางนิเทศ</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                ใช้เมนู <strong>แผนที่สถานประกอบการ</strong> เพื่อตรวจสอบโซนพื้นที่ จำนวนนักศึกษา และสถานะการนิเทศของสถานประกอบการแต่ละแห่ง
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>บันทึกรายงานการนิเทศ</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                เลือกสถานประกอบการและนักศึกษาที่เข้ารับการนิเทศ ระบุคะแนนประเมิน (เต็ม 20) ความคิดเห็นพี่เลี้ยง และแนบภาพถ่าย 4 ช่องมาตรฐาน
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                <span>รายงานการสอนในสถานประกอบการ</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                บันทึกสรุปผลการจัดการเรียนรู้อาชีวศึกษาทวิภาคีรายสัปดาห์ (สัปดาห์ที่ 1–18) พร้อมภาพประกอบ 6 ภาพ เพื่อสั่งพิมพ์หรือส่งออก PDF
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Safety & Verification */}
        <div className="p-5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm space-y-1">
              <div className="font-bold">ข้อแนะนำด้านความปลอดภัยและข้อมูล</div>
              <p className="text-slate-300">
                ทุกครั้งที่กรอกข้อมูลในหน้าแบบฟอร์ม กรุณากดปุ่ม <strong>บันทึก</strong> ทุกครั้งก่อนปิดหน้าต่าง ระบบจะจัดเก็บลงฐานข้อมูลคลาวด์ทันที
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-xs text-emerald-300 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>พร้อมใช้งานตลอด 24 ชม.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
