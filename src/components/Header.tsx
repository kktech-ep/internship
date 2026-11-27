import React from 'react';
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Eye,
  FileText,
  GraduationCap,
  Home,
  LogOut,
  MapPin,
  Printer,
  Shield,
  Smartphone,
  UserCheck,
  Users,
} from 'lucide-react';
import { AuthUser } from '../types';

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
  userAvatarUrl?: string | null;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  totalVisits?: number | null;
  onlineUsersCount?: number | null;
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
  userAvatarUrl,
  onOpenAuthModal,
  onSignOut,
  totalVisits = null,
  onlineUsersCount = 1,
}) => {
  const role = currentUser?.role || currentRole;

  const navItems: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    roles: Array<'student' | 'teacher' | 'admin'>;
  }> = [
    {
      id: 'hub',
      label: 'หน้าหลัก',
      icon: <Home className="w-4 h-4" />,
      roles: ['student', 'teacher', 'admin'],
    },
    {
      id: 'student',
      label: 'ข้อมูลนักศึกษา',
      icon: <GraduationCap className="w-4 h-4" />,
      roles: ['student', 'admin'],
    },
    {
      id: 'weekly-log',
      label: 'บันทึกฝึกงาน 1-18 สัปดาห์',
      icon: <FileText className="w-4 h-4" />,
      roles: ['student', 'admin'],
    },
    {
      id: 'teacher',
      label: 'ครูนิเทศก์',
      icon: <Users className="w-4 h-4" />,
      roles: ['teacher', 'admin'],
    },
    {
      id: 'teaching-reports',
      label: 'รายงานการสอน',
      icon: <ClipboardCheck className="w-4 h-4" />,
      roles: ['teacher', 'admin'],
    },
    {
      id: 'map',
      label: 'แผนที่สถานประกอบการ',
      icon: <MapPin className="w-4 h-4" />,
      roles: ['teacher', 'admin'],
    },
    {
      id: 'a4',
      label: 'สรุปรายงานการนิเทศ',
      icon: <Printer className="w-4 h-4" />,
      roles: ['student', 'teacher', 'admin'],
    },
    {
      id: 'guide',
      label: 'คู่มือใช้งาน',
      icon: <BookOpen className="w-4 h-4" />,
      roles: ['student', 'teacher', 'admin'],
    },
    {
      id: 'admin',
      label: 'จัดการระบบ',
      icon: <Shield className="w-4 h-4" />,
      roles: ['admin'],
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 py-2 gap-3">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => onNavigate('hub')}
            className="flex items-center gap-3 text-left group cursor-pointer shrink-0"
          >
            <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm border border-sky-400/30 shrink-0">
              <img
                src="./assets/aistudio/unnamed_54baf6fc.jpg"
                alt="KKTECH Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[17px] leading-tight tracking-tight text-white group-hover:text-sky-300 transition">
                  KKTECH Power Portal
                </span>
                <span className="px-2 py-0.5 rounded-md text-[12px] leading-tight font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  2/2569
                </span>
              </div>
              <p className="text-[13px] leading-snug text-slate-400">
                ระบบบริหารจัดการฝึกอาชีพ แผนกวิชาช่างไฟฟ้ากำลัง
              </p>
            </div>
          </button>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Page Views & Live Online Users Stats */}
            <div
              className="inline-flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800/85 border border-slate-700/80 text-[12.5px] sm:text-[13.5px] whitespace-nowrap shrink-0"
              title="สถิติจำนวนผู้เข้าชมเว็บเพจและผู้ที่กำลังใช้งานออนไลน์"
            >
              <span
                className="inline-flex items-center gap-1.5 text-slate-200"
                title="จำนวนผู้เข้าชมเว็บเพจทั้งหมด"
              >
                <Eye className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="hidden sm:inline text-slate-400">ผู้เข้าชม:</span>
                <span className="font-bold text-white tabular-nums">
                  {typeof totalVisits === 'number' ? totalVisits.toLocaleString('th-TH') : '—'}
                </span>
                <span className="hidden lg:inline text-slate-400 text-[12px]">ครั้ง</span>
              </span>
              <span className="h-3.5 w-px bg-slate-700" aria-hidden="true" />
              <span
                className="inline-flex items-center gap-1.5 text-slate-200"
                title="จำนวนผู้ที่กำลังใช้งานออนไลน์ขณะนี้"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="hidden sm:inline text-slate-400">ออนไลน์:</span>
                <span className="font-bold text-emerald-300 tabular-nums">
                  {(onlineUsersCount ?? 1).toLocaleString('th-TH')}
                </span>
                <span className="hidden lg:inline text-slate-400 text-[12px]">คน</span>
              </span>
            </div>

            {/* Looker Studio Analytics */}
            <button
              type="button"
              onClick={onOpenLookerModal}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[14.5px] font-semibold transition cursor-pointer"
              title="เปิดรายงานสถิติ Looker Studio"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Looker</span>
            </button>

            {/* Admin Role Preview Switcher */}
            {currentUser?.role === 'admin' && (
              <select
                value={currentRole}
                onChange={(e) => onChangeRole(e.target.value as 'student' | 'teacher' | 'admin')}
                className="hidden lg:block px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[14.5px] text-amber-300 font-semibold cursor-pointer"
                title="สลับสิทธิ์จำลองมุมมอง"
              >
                <option value="admin">สิทธิ์: Admin</option>
                <option value="teacher">มุมมอง: ครูนิเทศก์</option>
                <option value="student">มุมมอง: นักศึกษา</option>
              </select>
            )}

            {/* Sign Out */}
            {currentUser && (
              <div className="flex items-center gap-2 md:pl-2 md:border-l md:border-slate-700">
                <button
                  type="button"
                  onClick={onSignOut}
                  className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-2.5 pt-1 scrollbar-thin">
          {visibleNavItems.map((item) => {
            const active = !isMobileMode && currentView === item.id;
            return (
              <React.Fragment key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14.5px] font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                    active
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>

                {item.id === 'guide' && (
                  <>
                    {/* Mobile Sim Toggle */}
                    <button
                      type="button"
                      onClick={onToggleMobileMode}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14.5px] font-semibold border whitespace-nowrap shrink-0 transition cursor-pointer ${
                        isMobileMode
                          ? 'bg-sky-600 text-white border-sky-500 shadow-xs'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                      title="สลับมุมมองแอปพลิเคชันมือถือ"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>{isMobileMode ? 'มุมมองเดสก์ท็อป' : 'มุมมองมือถือ'}</span>
                    </button>

                    {/* User Pill */}
                    {currentUser && (
                      <button
                        type="button"
                        onClick={onOpenAuthModal}
                        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 whitespace-nowrap shrink-0 transition cursor-pointer"
                        title="สลับบัญชีผู้ใช้งาน"
                      >
                        {userAvatarUrl ? (
                          <img
                            src={userAvatarUrl}
                            alt={currentUser.name}
                            className="w-6 h-6 rounded-full object-cover border border-sky-400 shrink-0"
                          />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold text-[13px] flex items-center justify-center shrink-0">
                            {currentUser.initials}
                          </span>
                        )}
                        <span className="text-[14.5px] font-semibold text-slate-100 max-w-[160px] truncate">
                          {currentUser.name}
                        </span>
                        <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      </button>
                    )}
                  </>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
