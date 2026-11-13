import React, { useState } from 'react';
import { AuthUser } from '../types';
import { 
  FileSpreadsheet, 
  User, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { 
  authenticateWithGoogleSheet
} from '../services/sheetAuthService';
import { saveAuthUser } from '../services/authService';

interface LoginGatewayViewProps {
  onSelectRole: (role: 'student' | 'teacher' | 'admin') => void;
  onDirectLogin?: (user: AuthUser) => void;
  onOpenGuide?: () => void;
}

export const LoginGatewayView: React.FC<LoginGatewayViewProps> = ({
  onSelectRole,
  onDirectLogin,
  onOpenGuide,
}) => {
  const [userInput, setUserInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleInlineLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const result = await authenticateWithGoogleSheet(userInput, passInput);
      if (!result.success || !result.user) {
        setIsLoading(false);
        setErrorMsg(result.error || 'ชื่อผู้ใช้ (user) หรือรหัสผ่าน (pass) ไม่ถูกต้อง');
        return;
      }

      saveAuthUser(result.user);
      setIsLoading(false);
      if (onDirectLogin) {
        onDirectLogin(result.user);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์กับ Google Sheets');
    }
  };

  return (
    <div className="min-h-screen bg-[#edf2f7] flex flex-col font-['Prompt',sans-serif] text-slate-800 antialiased selection:bg-sky-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="bg-[#0c2340] w-full px-4 sm:px-6 lg:px-8 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* KKTech Electrical Power Round Emblem */}
            <div className="w-10 h-10 rounded-full bg-white p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
              <img
                src="./assets/aistudio/unnamed_54baf6fc.jpg"
                alt="ตราสัญลักษณ์แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น"
                className="w-full h-full object-contain"
              />
            </div>
            {/* Title & Department Subtitle */}
            <div className="flex flex-col">
              <h1 className="text-white font-bold text-base sm:text-lg leading-tight tracking-tight">
                ระบบบันทึกข้อมูลการฝึกงาน
              </h1>
              <p className="text-slate-300 text-xs sm:text-xs font-normal">
                สาขาไฟฟ้ากำลัง วิทยาลัยเทคนิคขอนแก่น
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="hidden sm:inline">ระบบออนไลน์ • เชื่อมต่อชีต login</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col justify-center">
        {/* Hero Banner Card */}
        <section className="bg-[#0f2444] rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-12 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl z-10 text-left">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug sm:leading-tight">
              เลือกบทบาทของคุณเพื่อเริ่ม<br />
              บันทึกข้อมูล
            </h2>
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm lg:text-base text-slate-300 leading-relaxed font-normal">
              ศูนย์รวมแบบฟอร์มและรายงานการฝึกงาน ใช้ได้ทั้งมือถือ<br className="hidden sm:inline" /> และคอมพิวเตอร์
            </p>
          </div>

          {/* Logo KKTech Official Emblem */}
          <div className="shrink-0 flex items-center justify-center sm:pr-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full bg-white/10 p-2 sm:p-2.5 border-2 border-white/20 shadow-2xl backdrop-blur-xs flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
              <img
                src="./assets/aistudio/LogoKKTech.jpg"
                alt="ตราสัญลักษณ์วิทยาลัยเทคนิคขอนแก่น"
                className="w-full h-full object-contain rounded-full shadow-inner"
              />
            </div>
          </div>
        </section>

        {/* 3 Role Selection Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mt-6 sm:mt-8">
          {/* 1. นักศึกษา Card */}
          <div
            onClick={() => onSelectRole('student')}
            className="relative bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-200/80 hover:border-blue-300 transition-all duration-200 cursor-pointer group flex flex-col justify-center min-h-[120px] sm:min-h-[130px] p-6 pl-7 overflow-hidden transform hover:-translate-y-1"
          >
            {/* Blue Left Accent Stripe */}
            <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#2563eb] rounded-l-2xl group-hover:w-3 transition-all" />
            
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
              นักศึกษา
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1.5 leading-relaxed">
              ปวช. / ปวส. — กรอกข้อมูลและส่ง<br />
              รายงานประจำสัปดาห์
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              <span>คลิกเพื่อเข้าสู่ระบบ</span>
              <span>&rarr;</span>
            </div>
          </div>

          {/* 2. ครูนิเทศ Card */}
          <div
            onClick={() => onSelectRole('teacher')}
            className="relative bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-200/80 hover:border-amber-300 transition-all duration-200 cursor-pointer group flex flex-col justify-center min-h-[120px] sm:min-h-[130px] p-6 pl-7 overflow-hidden transform hover:-translate-y-1"
          >
            {/* Yellow / Amber Left Accent Stripe */}
            <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#f59e0b] rounded-l-2xl group-hover:w-3 transition-all" />
            
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
              ครูนิเทศ
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1.5 leading-relaxed">
              บันทึกการนิเทศและดูสรุปรายงาน
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              <span>คลิกเพื่อเข้าสู่ระบบ</span>
              <span>&rarr;</span>
            </div>
          </div>

          {/* 3. ผู้ดูแลระบบ Card */}
          <div
            onClick={() => onSelectRole('admin')}
            className="relative bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-200/80 hover:border-slate-400 transition-all duration-200 cursor-pointer group flex flex-col justify-center min-h-[120px] sm:min-h-[130px] p-6 pl-7 overflow-hidden transform hover:-translate-y-1"
          >
            {/* Dark Navy Left Accent Stripe */}
            <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-[#0f2444] rounded-l-2xl group-hover:w-3 transition-all" />
            
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-slate-800 transition-colors">
              ผู้ดูแลระบบ
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1.5 leading-relaxed">
              จัดการแบบฟอร์ม ข้อมูล และแดช<br />
              บอร์ด
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              <span>คลิกเพื่อเข้าสู่ระบบ</span>
              <span>&rarr;</span>
            </div>
          </div>
        </section>

        {/* Student User Guide Quick Action Banner */}
        {onOpenGuide && (
          <div className="mt-6 bg-gradient-to-r from-[#0f2444] via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-lg border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>คู่มือการใช้งานระบบสำหรับนักศึกษา</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-300 font-semibold border border-sky-400/30">
                    ดาวน์โหลด PDF
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  แนะนำขั้นตอนการเลือกบทบาทนักศึกษา การลงบันทึกงานประจำสัปดาห์ (ฟ.2) การแนบภาพถ่ายหน้างาน และการเช็คชั่วโมงสะสม 720 ชม.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenGuide}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-200" />
              <span>เปิดอ่านคู่มือ & ดาวน์โหลด PDF</span>
            </button>
          </div>
        )}

        {/* Direct Google Sheets User & Pass Login Card */}
        <section className="mt-8 bg-white rounded-2xl sm:rounded-3xl shadow-md border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              เข้าสู่ระบบด้วย User & Pass
            </h3>
          </div>

          <form onSubmit={handleInlineLoginSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  User (ชื่อผู้ใช้ / รหัสนักศึกษา / อีเมล)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="เช่น 68301040105 หรือ thaksinso@kktech.ac.th"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pass (รหัสผ่าน)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={passInput}
                    onChange={(e) => setPassInput(e.target.value)}
                    placeholder="รหัสผ่าน เช่น 68301040105 หรือ 123456"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>กำหนดสิทธิ์การแสดงผลตามคอลัมน์ <strong>status</strong> (นักศึกษา / ครูนิเทศ / admin)</span>
              </div>
              <button
                type="submit"
                disabled={isLoading || !userInput.trim() || !passInput.trim()}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังตรวจสอบ...</span>
                  </>
                ) : (
                  <>
                    <span>เข้าสู่ระบบ (Sign in)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </main>

      {/* Simple Footer */}
      <footer className="text-center py-4 text-xs text-slate-400">
        ระบบบันทึกข้อมูลการฝึกงาน • แผนกวิชาช่างไฟฟ้ากำลัง วิทยาลัยเทคนิคขอนแก่น
      </footer>
    </div>
  );
};
