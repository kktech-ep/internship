import React, { useState } from 'react';
import { 
  Smartphone, 
  Monitor, 
  UserCheck, 
  LogOut,
  ExternalLink,
  ChevronDown,
  User,
  LogIn,
  Download,
  BookOpen
} from 'lucide-react';
import { AuthUser } from '../types';
import { downloadAllWebZip } from '../services/webZipService';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isMobileMode: boolean;
  onToggleMobileMode: () => void;
  currentRole: 'student' | 'teacher' | 'admin';
  onChangeRole: (role: 'student' | 'teacher' | 'admin') => void;
  onOpenSheetsModal?: () => void;
  onOpenLookerModal: () => void;
  currentUser: AuthUser | null;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  isMobileMode,
  onToggleMobileMode,
  currentRole,
  onChangeRole,
  onOpenLookerModal,
  currentUser,
  onOpenAuthModal,
  onSignOut,
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const userRole = currentUser?.role || currentRole;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs print:hidden">
      {/* Top micro bar */}
      <div className="bg-[#0f172a] text-slate-200 text-[15px] px-4 py-2 flex flex-wrap items-center justify-between border-b border-slate-800 gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-slate-300 hidden sm:inline">
            รอบการประเมิน 2/2569 | ศูนย์ประสานงานช่างไฟฟ้ากำลัง
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <button
            onClick={() => onNavigate('guide')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-[15px] font-semibold transition cursor-pointer whitespace-nowrap ${
              currentView === 'guide'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 hover:bg-indigo-500/30 hover:text-white'
            }`}
            title="ดูคู่มือการใช้งานระบบสำหรับนักศึกษา พร้อมดาวน์โหลด PDF"
          >
            <BookOpen className="w-4 h-4" />
            <span>คู่มือใช้งาน (PDF)</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {/* Mobile view toggle */}
          <button
            onClick={onToggleMobileMode}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[15px] transition cursor-pointer ${
              isMobileMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700'
            }`}
            title="จำลองมุมมองแอปมือถือ"
          >
            {isMobileMode ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            <span>{isMobileMode ? 'โหมดมือถือ' : 'สลับดูโหมดมือถือ'}</span>
          </button>

          {/* User Account / Role Switcher Menu */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-2 text-slate-200 hover:text-white transition py-1 px-2.5 rounded-lg hover:bg-slate-800 border border-slate-700/60 cursor-pointer"
                title="คลิกเพื่อสลับบทบาทหรือจัดการบัญชี"
              >
                <span className={`w-6 h-6 rounded-full text-[12.5px] font-bold flex items-center justify-center text-white ${
                  currentRole === 'teacher' ? 'bg-indigo-600' : currentRole === 'admin' ? 'bg-amber-600' : 'bg-sky-600'
                }`}>
                  {currentUser.initials}
                </span>
                <span className="text-[15px] font-medium max-w-[230px] truncate">
                  {currentUser.email}
                </span>
                <span className="px-2 py-0.5 rounded text-[11.5px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hidden md:inline">
                  {currentRole === 'student' ? 'นักศึกษา' : currentRole === 'teacher' ? 'ครูนิเทศก์' : 'Admin'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div 
                  className="absolute right-0 mt-1.5 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 text-slate-800 text-[15px] z-50 animate-in fade-in"
                  onMouseLeave={() => setRoleMenuOpen(false)}
                >
                  {/* Account Header */}
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-[15px]">{currentUser.name}</span>
                      <span className="px-2 py-0.5 rounded text-[11.5px] font-bold bg-emerald-100 text-emerald-800">
                        @kktech.ac.th
                      </span>
                    </div>
                    <p className="text-[14px] text-slate-500 font-mono mt-0.5">{currentUser.email}</p>
                    <p className="text-[12.5px] text-slate-400 mt-0.5">{currentUser.department}</p>
                  </div>

                  {/* Switch Role Section - Only for Admin */}
                  {userRole === 'admin' && (
                    <>
                      <div className="px-4 py-1.5 text-[12.5px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                        สลับบทบาทการใช้งาน (แอดมิน)
                      </div>

                      <button
                        onClick={() => {
                          onChangeRole('student');
                          setRoleMenuOpen(false);
                          onNavigate('student');
                        }}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                          currentRole === 'student' ? 'text-sky-600 font-semibold bg-sky-50/60' : ''
                        }`}
                      >
                        <div>
                          <div className="font-medium">1. นักศึกษา (Student)</div>
                          <div className="text-[12.5px] text-slate-500">บันทึกงานรายวัน แนบภาพ และดูความก้าวหน้า</div>
                        </div>
                        {currentRole === 'student' && <UserCheck className="w-5 h-5 text-sky-600" />}
                      </button>

                      <button
                        onClick={() => {
                          onChangeRole('teacher');
                          setRoleMenuOpen(false);
                          onNavigate('teacher');
                        }}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                          currentRole === 'teacher' ? 'text-sky-600 font-semibold bg-sky-50/60' : ''
                        }`}
                      >
                        <div>
                          <div className="font-medium">2. ครูนิเทศก์ (Supervisor)</div>
                          <div className="text-[12.5px] text-slate-500">ตรวจนิเทศ ให้คะแนนสมรรถนะรายสัปดาห์</div>
                        </div>
                        {currentRole === 'teacher' && <UserCheck className="w-5 h-5 text-sky-600" />}
                      </button>

                      <button
                        onClick={() => {
                          onChangeRole('admin');
                          setRoleMenuOpen(false);
                          onNavigate('admin');
                        }}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                          currentRole === 'admin' ? 'text-sky-600 font-semibold bg-sky-50/60' : ''
                        }`}
                      >
                        <div>
                          <div className="font-medium">3. ผู้ดูแลระบบ (Admin)</div>
                          <div className="text-[12.5px] text-slate-500">จัดการระบบ ดู Google Sheets และ Looker</div>
                        </div>
                        {currentRole === 'admin' && <UserCheck className="w-5 h-5 text-sky-600" />}
                      </button>
                    </>
                  )}

                  {/* Actions */}
                  <div className="border-t border-slate-100 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setRoleMenuOpen(false);
                        onOpenAuthModal();
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sky-700 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-sky-600" />
                      <span>สลับบัญชี @kktech.ac.th</span>
                    </button>
                    <button
                      onClick={() => {
                        setRoleMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>ออกจากระบบ (กลับหน้าเลือกระบบ)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[15px] font-bold transition shadow-sm cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>เข้าสู่ระบบด้วย @kktech.ac.th</span>
            </button>
          )}
        </div>
      </div>

      {/* Main navigation row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 min-h-14">
          {/* Navigation Links */}
          <nav className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => onNavigate('hub')}
              className={`px-3.5 py-2 text-[15px] font-semibold rounded-lg transition cursor-pointer ${
                currentView === 'hub'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              หน้าแรก
            </button>

            {/* Student Menus: Shown for student and admin */}
            {(userRole === 'student' || userRole === 'admin') && (
              <>
                <button
                  onClick={() => onNavigate('student')}
                  className={`px-3.5 py-2 text-[15px] font-semibold rounded-lg transition cursor-pointer ${
                    currentView === 'student'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  ส่วนนักศึกษา
                </button>
                <button
                  onClick={() => onNavigate('weekly-log')}
                  className={`px-3.5 py-2 text-[15px] font-semibold rounded-lg transition cursor-pointer ${
                    currentView === 'weekly-log'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  บันทึกปฏิบัติงาน & ภาพถ่าย
                </button>
              </>
            )}

            {/* Teacher Menus: Shown for teacher and admin */}
            {(userRole === 'teacher' || userRole === 'admin') && (
              <>
                <button
                  onClick={() => onNavigate('teacher')}
                  className={`px-3.5 py-2 text-[15px] font-semibold rounded-lg transition cursor-pointer ${
                    currentView === 'teacher'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  ส่วนครูนิเทศก์
                </button>
                <button
                  onClick={() => onNavigate('map')}
                  className={`px-3.5 py-2 text-[15px] font-semibold rounded-lg transition cursor-pointer ${
                    currentView === 'map'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  แผนที่สถานประกอบการ
                </button>
                <button
                  onClick={() => onNavigate('a4')}
                  className={`px-3.5 py-2 text-[15px] font-semibold rounded-lg transition cursor-pointer ${
                    currentView === 'a4'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  สรุปรายงานการนิเทศ
                </button>
              </>
            )}

            {/* Admin Menu: Only shown for admin */}
            {userRole === 'admin' && (
              <button
                onClick={() => onNavigate('admin')}
                className={`px-3.5 py-2 text-[15px] font-semibold rounded-lg transition cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                ผู้ดูแลระบบ
              </button>
            )}
          </nav>

          {/* Quick External Integration Links */}
          {(userRole === 'admin' || userRole === 'teacher') && (
            <div className="flex items-center gap-2">
              {userRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => downloadAllWebZip()}
                  className="hidden sm:inline-flex items-center gap-1.5 text-[15px] px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition cursor-pointer font-bold shadow-2xs"
                  title="ดาวน์โหลดไฟล์เว็บทั้งหมดเป็น ZIP เพื่อนำไปติดตั้งบน AppServ หรือ Web Server จริง"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>โหลดเว็บลง Server</span>
                </button>
              )}

              <button
                onClick={onOpenLookerModal}
                className="hidden lg:inline-flex items-center gap-1.5 text-[15px] px-3 py-2 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition cursor-pointer font-medium"
                title="เปิด Looker Studio Dashboard"
              >
                <span>Looker Analytics</span>
                <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
