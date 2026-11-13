import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  Camera, 
  Upload, 
  CheckCircle2, 
  ShieldCheck, 
  Send, 
  Trash2, 
  Plus, 
  Printer, 
  AlertCircle, 
  Zap, 
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';
import { Student, WeeklySubmission, DailyLog, PhotoEvidence, AuthUser } from '../types';
import { WEEKS_1_TO_15, getDefaultDailyLogsForWeek } from '../data/weeksData';
import { saveSubmissionToFirestore } from '../services/firestoreService';

interface WeeklyLogReportViewProps {
  student: Student;
  submissions: WeeklySubmission[];
  initialWeek?: number;
  currentUser?: AuthUser | null;
  onNavigateA4: (weekNum?: number) => void;
  onSubmissionUpdated?: (submission: WeeklySubmission) => void;
  onDeleteSubmission?: (submissionId: string) => Promise<boolean>;
}

export const WeeklyLogReportView: React.FC<WeeklyLogReportViewProps> = ({
  student,
  submissions,
  initialWeek = 8,
  currentUser,
  onNavigateA4,
  onSubmissionUpdated,
  onDeleteSubmission,
}) => {
  const [selectedWeek, setSelectedWeek] = useState<number>(initialWeek);
  const [taskTitle, setTaskTitle] = useState('');
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [photos, setPhotos] = useState<PhotoEvidence[]>([]);
  const [safetyChecklist, setSafetyChecklist] = useState({
    hardHat: true,
    highVoltageGloves: true,
    safetyShoes: true,
    lotoProcedure: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentWeekMeta = WEEKS_1_TO_15.find(w => w.weekNumber === selectedWeek) || WEEKS_1_TO_15[7];
  const existingSubmission = submissions.find(s => s.weekNumber === selectedWeek);

  // When selectedWeek changes, load submission or load default template for that week
  useEffect(() => {
    if (existingSubmission) {
      setTaskTitle(existingSubmission.taskTitle);
      setDailyLogs(existingSubmission.dailyLogs || getDefaultDailyLogsForWeek(selectedWeek));
      setPhotos(existingSubmission.photos || currentWeekMeta.samplePhotos);
      if (existingSubmission.safetyChecklist) {
        setSafetyChecklist(existingSubmission.safetyChecklist);
      }
    } else {
      setTaskTitle(currentWeekMeta.defaultTask);
      setDailyLogs(getDefaultDailyLogsForWeek(selectedWeek));
      setPhotos(currentWeekMeta.samplePhotos);
      setSafetyChecklist({
        hardHat: true,
        highVoltageGloves: true,
        safetyShoes: true,
        lotoProcedure: true,
      });
    }
    setSaveSuccessMessage(null);
    setErrorMessage(null);
  }, [selectedWeek, existingSubmission]);

  // Handle file uploads and convert to compressed data URLs
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Resize image for optimal web performance & Firestore document size
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedUrl = canvas.toDataURL('image/jpeg', 0.75);

            setPhotos(prev => [
              ...prev,
              {
                id: `upload-${Date.now()}-${index}`,
                url: compressedUrl,
                title: file.name.replace(/\.[^/.]+$/, '').slice(0, 35) || `ภาพแนบที่ ${prev.length + 1}`,
                caption: `ภาพถ่ายปฏิบัติงานจริง สัปดาห์ที่ ${selectedWeek}`
              }
            ]);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    // Reset input so user can pick the same file again if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleUpdatePhoto = (photoId: string, field: 'title' | 'caption', value: string) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, [field]: value } : p));
  };

  const handleDailyLogChange = (idx: number, field: keyof DailyLog, value: any) => {
    setDailyLogs(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleSaveToFirestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    const submissionDocId = `sub-${student.id}-w${selectedWeek}`;
    const newSubmission: WeeklySubmission = {
      id: submissionDocId,
      studentId: student.id,
      weekNumber: selectedWeek,
      dateRange: currentWeekMeta.dateRange,
      submittedAt: new Date().toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) + ' ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.',
      status: existingSubmission?.status === 'graded' ? 'graded' : 'pending',
      taskTitle: taskTitle || currentWeekMeta.defaultTask,
      dailyLogs,
      photos,
      totalHours: 40.0,
      mentorRating: existingSubmission?.mentorRating || 5.0,
      mentorComment: existingSubmission?.mentorComment || 'นักศึกษาปฏิบัติตามมาตรฐานความปลอดภัยและขั้นตอนวิศวกรรมไฟฟ้าครบถ้วน',
      mentorName: student.companyRegistration?.mentorName || 'นายชาญชัย มงคลศรี',
      mentorPosition: 'วิศวกรไฟฟ้า / พี่เลี้ยง',
      teacherScore: existingSubmission?.teacherScore || 19.5,
      teacherGrade: existingSubmission?.teacherGrade || 'A',
      teacherName: student.supervisorTeacher || 'นายทักษิณ โสภาปิยะ',
      studentSignature: student.name.replace(/^(นาย|นางสาว)\s*/, ''),
      mentorSignature: 'ชาญชัย มงคลศรี',
      teacherSignature: 'ทักษิณ โสภาปิยะ',
      verifiedHash: `7B8C${student.studentCode}-KKTECH-2569-W${selectedWeek.toString().padStart(2, '0')}-OK`,
      safetyChecklist
    };

    try {
      await saveSubmissionToFirestore(newSubmission);
      setIsSaving(false);
      setSaveSuccessMessage(`บันทึกรายงานสัปดาห์ที่ ${selectedWeek} ลง Firebase Firestore (internship2-2569) สำเร็จเรียบร้อยแล้ว!`);
      if (onSubmissionUpdated) {
        onSubmissionUpdated(newSubmission);
      }
    } catch (err) {
      console.error('Error saving submission to Firestore:', err);
      setIsSaving(false);
      setErrorMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleAdminDeleteThisWeek = async () => {
    if (!existingSubmission || !onDeleteSubmission) return;
    if (!window.confirm(`[ผู้ดูแลระบบ - Admin] คุณต้องการลบบันทึกปฏิบัติงาน สัปดาห์ที่ ${selectedWeek} ของ ${student.name} (${student.studentCode}) ใช่หรือไม่?\n\nข้อมูลและภาพถ่ายของสัปดาห์นี้จะถูกลบออกจากฐานข้อมูล Cloud Firestore ทันที`)) {
      return;
    }
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onDeleteSubmission(existingSubmission.id);
      setSaveSuccessMessage(`ลบบันทึกปฏิบัติงานสัปดาห์ที่ ${selectedWeek} ของ ${student.name} เรียบร้อยแล้ว`);
      // Reset form to default blank week template
      setTaskTitle(currentWeekMeta.title);
      setDailyLogs(getDefaultDailyLogsForWeek(selectedWeek));
      setPhotos([]);
    } catch (err: any) {
      setErrorMessage('เกิดข้อผิดพลาดในการลบบันทึก: ' + (err?.message || String(err)));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800">
                ภาคเรียนที่ 2 ปีการศึกษา 2569
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Firebase: internship2-2569
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              บันทึกการปฏิบัติงานวิชาชีพ & รูปถ่ายหน้างาน
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ระบบบันทึกรายงานรายวัน 5 วัน (40 ชม./สัปดาห์) พร้อมแนบรูปถ่ายปฏิบัติงานจริง จัดเก็บลง Firestore
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentUser?.role === 'admin' && existingSubmission && (
              <button
                type="button"
                onClick={handleAdminDeleteThisWeek}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                title="ลบบันทึกปฏิบัติงานของสัปดาห์นี้ออกจาก Firestore (สิทธิ์ Admin)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{isDeleting ? 'กำลังลบ...' : `ลบบันทึกสัปดาห์ที่ ${selectedWeek} (Admin)`}</span>
              </button>
            )}
            <button
              onClick={() => onNavigateA4(selectedWeek)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>พิมพ์รายงาน A4 สัปดาห์นี้</span>
            </button>
          </div>
        </div>

        {/* Student Context Bar */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-emerald-400 font-bold flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 fill-emerald-400" />
            </div>
            <div>
              <span className="font-bold text-slate-900">{student.name} ({student.studentCode})</span>
              <span className="text-slate-500 block text-[11px]">{student.level} {student.department}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-slate-400 text-[10px] block">สถานประกอบการ:</span>
            <span className="font-semibold text-slate-800">{student.companyName}</span>
          </div>
        </div>
      </div>

      {/* Week Navigation Selector 1-15 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            <h2 className="font-bold text-slate-900 text-xs sm:text-sm">
              เมนูเลือกรายสัปดาห์ (สัปดาห์ที่ 1 - 15)
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200 hidden sm:inline-block">
              เริ่มฝึกงาน สัปดาห์ 1: 19 ต.ค. 2569
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            เลือกสัปดาห์ที่ 1-15 เพื่อบันทึกหรือตรวจสอบ
          </span>
        </div>

        {/* Scrollable Week Pills 1-15 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {WEEKS_1_TO_15.map((w) => {
            const isSelected = selectedWeek === w.weekNumber;
            const sub = submissions.find(s => s.weekNumber === w.weekNumber);
            const isGraded = sub?.status === 'graded';
            const isPending = sub?.status === 'pending';

            return (
              <button
                key={w.weekNumber}
                type="button"
                onClick={() => setSelectedWeek(w.weekNumber)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition flex flex-col items-center gap-0.5 border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-sky-500/40'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>สัปดาห์ที่ {w.weekNumber}</span>
                  {isGraded ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  ) : isPending ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  )}
                </div>
                <span className={`text-[10px] font-normal ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {isGraded ? 'ตรวจแล้ว' : isPending ? 'รอตรวจ' : 'ยังไม่ส่ง'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Week Info Strip */}
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sky-900">
              สัปดาห์ที่ {currentWeekMeta.weekNumber}: {currentWeekMeta.title}
            </span>
            <span className="text-slate-500">({currentWeekMeta.dateRange})</span>
          </div>
          <div>
            {existingSubmission?.status === 'graded' ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ได้รับการประเมินแล้ว: เกรด {existingSubmission.teacherGrade} ({existingSubmission.teacherScore}/20 คะแนน)
              </span>
            ) : existingSubmission?.status === 'pending' ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                ส่งแล้วเมื่อ {existingSubmission.submittedAt} (รอตรวจ)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                ยังไม่มีข้อมูลในระบบ สามารถกรอกและส่งได้ทันที
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Submission Form */}
      <form onSubmit={handleSaveToFirestore} className="space-y-6">
        {/* Success Alert */}
        {saveSuccessMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1 font-medium">{saveSuccessMessage}</div>
            <button
              type="button"
              onClick={() => setSaveSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Section 1: Task Title & Objective */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              1. หัวข้องานและสมรรถนะวิชาชีพประจำสัปดาห์ที่ {selectedWeek}
            </h3>
            <p className="text-xs text-slate-500">ระบุขอบเขตงานทางวิศวกรรมไฟฟ้าที่ได้รับมอบหมาย</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              หัวข้องาน / สมรรถนะวิชาชีพที่ปฏิบัติ
            </label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              placeholder="เช่น งานติดตั้งตู้ Distribution Board (MDB) & Wiring Control..."
              required
            />
          </div>

          {/* Safety Checklist */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              การปฏิบัติตามมาตรฐานความปลอดภัย (Engineering Safety & PPE Checklist)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={safetyChecklist.hardHat}
                  onChange={(e) => setSafetyChecklist({ ...safetyChecklist, hardHat: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="font-medium text-slate-800">หมวกนิรภัย (Hard Hat)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={safetyChecklist.highVoltageGloves}
                  onChange={(e) => setSafetyChecklist({ ...safetyChecklist, highVoltageGloves: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="font-medium text-slate-800">ถุงมือกันกระแสไฟฟ้า</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={safetyChecklist.safetyShoes}
                  onChange={(e) => setSafetyChecklist({ ...safetyChecklist, safetyShoes: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="font-medium text-slate-800">รองเท้าหัวเหล็กเซฟตี้</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={safetyChecklist.lotoProcedure}
                  onChange={(e) => setSafetyChecklist({ ...safetyChecklist, lotoProcedure: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="font-medium text-slate-800">ขั้นตอน Lockout/Tagout</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Photo Evidence Attachment (ช่องแนบไฟล์รูปถ่าย) */}
        <div className="bg-white rounded-2xl border-2 border-sky-600/30 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  2. ช่องแนบไฟล์รูปถ่ายหน้างาน (Photo Evidence)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                แนบไฟล์รูปภาพจากการปฏิบัติงานจริง (ระบบจัดเก็บเข้า Firestore โปรเจกต์ internship2-2569)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-semibold text-xs border border-sky-100">
                แนบแล้ว {photos.length} รูป
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มรูปภาพจากอุปกรณ์</span>
              </button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Drag & Drop Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-2xl p-6 text-center bg-sky-50/40 hover:bg-sky-50/80 transition cursor-pointer space-y-2"
          >
            <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-sky-200 text-sky-600 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-800">
                คลิกเพื่อเลือกไฟล์รูปถ่าย หรือถ่ายภาพจากกล้องมือถือ
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                รองรับไฟล์ภาพ JPG, PNG, WEBP (บีบอัดอัตโนมัติเพื่อบันทึกคลาวด์รวดเร็ว)
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3 h-3" />
              <span>ภาพถ่ายหลักฐาน: ปฏิบัติงานจริง • ตู้ควบคุม • พี่เลี้ยงหน้างาน</span>
            </div>
          </div>

          {/* Photo Gallery Grid */}
          {photos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition space-y-2 flex flex-col justify-between"
                >
                  <div className="relative group">
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="w-full h-36 object-cover bg-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition"
                      title="ลบภาพนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                      รูปที่ {i + 1}
                    </span>
                  </div>

                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between text-xs">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">ชื่อภาพ</label>
                      <input
                        type="text"
                        value={photo.title}
                        onChange={(e) => handleUpdatePhoto(photo.id, 'title', e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500"
                        placeholder="ระบุชื่อภาพ..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">คำบรรยายประกอบ</label>
                      <input
                        type="text"
                        value={photo.caption}
                        onChange={(e) => handleUpdatePhoto(photo.id, 'caption', e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 focus:bg-white focus:ring-1 focus:ring-sky-500"
                        placeholder="คำอธิบายรายละเอียด..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs border border-slate-200 rounded-xl bg-slate-50">
              ยังไม่มีรูปถ่ายแนบสำหรับสัปดาห์นี้ กรุณากดปุ่มเพิ่มรูปภาพด้านบน
            </div>
          )}
        </div>

        {/* Section 3: Daily Logs Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                3. ตารางบันทึกการปฏิบัติงานรายวัน จันทร์ - ศุกร์ (40 ชม.)
              </h3>
              <p className="text-xs text-slate-500">บันทึกเวลาทำงาน 08:30 - 16:30 น. วันละ 8.0 ชั่วโมง</p>
            </div>
            <span className="font-mono font-bold text-xs text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
              รวม: 40.0 ชม./สัปดาห์
            </span>
          </div>

          <div className="space-y-3">
            {dailyLogs.map((log, idx) => (
              <div key={log.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                    วัน{log.day} ({log.date})
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-600">{log.hours} ชม.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="md:col-span-2">
                    <label className="text-[10px] text-slate-500 block mb-0.5">รายละเอียดงานที่ปฏิบัติ</label>
                    <input
                      type="text"
                      value={log.taskDescription}
                      onChange={(e) => handleDailyLogChange(idx, 'taskDescription', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-sky-500"
                      placeholder="ระบุรายละเอียดงาน..."
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">เครื่องมือ / อุปกรณ์</label>
                    <input
                      type="text"
                      value={log.toolsUsed}
                      onChange={(e) => handleDailyLogChange(idx, 'toolsUsed', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-sky-500"
                      placeholder="เครื่องมือ..."
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Submit Bar */}
        <div className="sticky bottom-4 z-20 bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">
                บันทึกรายงานสัปดาห์ที่ {selectedWeek} เข้าฐานข้อมูลคลาวด์
              </div>
              <div className="text-[11px] text-slate-300">
                Firestore Project: <span className="font-mono text-amber-300">internship2-2569</span> • Collection: <span className="font-mono text-amber-300">submissions</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateA4(selectedWeek)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              ดูเอกสาร A4
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>กำลังบันทึกคลาวด์...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>บันทึกลง Firebase Firestore</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
