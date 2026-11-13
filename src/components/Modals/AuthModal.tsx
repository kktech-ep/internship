import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2
} from 'lucide-react';
import { AuthUser } from '../../types';
import { 
  authenticateWithGoogleSheet
} from '../../services/sheetAuthService';
import { saveAuthUser } from '../../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onLoginSuccess: (user: AuthUser) => void;
  initialRole?: 'student' | 'teacher' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  initialRole = 'student',
}) => {
  const [userInput, setUserInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successUser, setSuccessUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessUser(null);
      setUserInput('');
      setPassInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle User & Pass authentication against Google Sheet login tab
  const handleSheetLoginSubmit = async (e: React.FormEvent) => {
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

      const user = result.user;
      saveAuthUser(user);
      setSuccessUser(user);

      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(user);
        onClose();
      }, 700);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
    }
  };

  const roleInfo = {
    student: {
      label: 'นักศึกษาฝึกงาน',
      color: 'bg-blue-500/25 text-blue-300 border-blue-400/40',
    },
    teacher: {
      label: 'ครูนิเทศก์',
      color: 'bg-amber-500/25 text-amber-300 border-amber-400/40',
    },
    admin: {
      label: 'ผู้ดูแลระบบ',
      color: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40',
    },
  }[initialRole || 'student'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md shrink-0">
              <img
                src="./assets/aistudio/unnamed_54baf6fc.jpg"
                alt="KKTECH Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>เข้าสู่ระบบ</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              </h3>
              <p className="text-xs text-slate-300 font-normal mt-0.5">
                สาขาไฟฟ้ากำลัง วิทยาลัยเทคนิคขอนแก่น
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Current Logged-in Banner if exists */}
          {currentUser && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  {currentUser.initials}
                </span>
                <div>
                  <div className="font-bold text-slate-900">{currentUser.name}</div>
                  <div className="text-[10px] text-emerald-700 font-medium">เข้าใช้งานอยู่: {currentUser.email} ({currentUser.role})</div>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-200/60 text-emerald-800">
                สถานะเชื่อมต่อ
              </span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Success Banner */}
          {successUser && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-sm">เข้าสู่ระบบสำเร็จ!</div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  ยินดีต้อนรับ {successUser.name} • สถานะ: <strong className="text-emerald-700">{successUser.role}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Form for user and pass from Google Sheet */}
          <form onSubmit={handleSheetLoginSubmit} className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                User (ชื่อผู้ใช้ / รหัสนักศึกษา / อีเมล)
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="เช่น 68301040105 หรือ thaksinso@kktech.ac.th"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Pass (รหัสผ่าน)
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  placeholder="ระบุรหัสผ่าน เช่น 68301040105 หรือ 123456"
                  className="w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !userInput.trim() || !passInput.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <>
                  <span>เข้าสู่ระบบ</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
