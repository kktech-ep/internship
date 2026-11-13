import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Camera, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Upload, 
  Trash2, 
  Plus, 
  Calendar,
  Database
} from 'lucide-react';
import { Student, WeeklySubmission, DailyLog, PhotoEvidence } from '../../types';
import { WEEKS_1_TO_15, getDefaultDailyLogsForWeek } from '../../data/weeksData';

interface Form2WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  currentWeek: number;
  onSubmit: (submission: Partial<WeeklySubmission>) => void;
}

export const Form2WeeklyReportModal: React.FC<Form2WeeklyReportModalProps> = ({
  isOpen,
  onClose,
  student,
  currentWeek = 8,
  onSubmit,
}) => {
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek || 8);
  const [taskTitle, setTaskTitle] = useState('');
  const [dailyTasks, setDailyTasks] = useState<DailyLog[]>([]);
  const [photos, setPhotos] = useState<PhotoEvidence[]>([]);
  const [safetyChecklist, setSafetyChecklist] = useState({
    hardHat: true,
    highVoltageGloves: true,
    safetyShoes: true,
    lotoProcedure: true,
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentWeekMeta = WEEKS_1_TO_15.find(w => w.weekNumber === selectedWeek) || WEEKS_1_TO_15[7];

  // Update fields when selectedWeek or modal open state changes
  useEffect(() => {
    if (isOpen) {
      setSelectedWeek(currentWeek || 8);
      const meta = WEEKS_1_TO_15.find(w => w.weekNumber === (currentWeek || 8)) || WEEKS_1_TO_15[7];
      setTaskTitle(meta.defaultTask);
      setDailyTasks(getDefaultDailyLogsForWeek(currentWeek || 8));
      setPhotos(meta.samplePhotos);
    }
  }, [isOpen, currentWeek]);

  // When user switches week dropdown inside modal
  const handleSelectWeek = (weekNum: number) => {
    setSelectedWeek(weekNum);
    const meta = WEEKS_1_TO_15.find(w => w.weekNumber === weekNum) || WEEKS_1_TO_15[0];
    setTaskTitle(meta.defaultTask);
    setDailyTasks(getDefaultDailyLogsForWeek(weekNum));
    setPhotos(meta.samplePhotos);
  };

  if (!isOpen) return null;

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
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
                id: `p-upload-${Date.now()}-${index}`,
                url: compressedUrl,
                title: file.name.replace(/\.[^/.]+$/, '').slice(0, 30) || `ภาพแนบที่ ${prev.length + 1}`,
                caption: `ภาพถ่ายสัปดาห์ที่ ${selectedWeek} สถานประกอบการ ${student.companyName}`
              }
            ]);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleTaskChange = (index: number, field: keyof DailyLog, value: any) => {
    const updated = [...dailyTasks];
    updated[index] = { ...updated[index], [field]: value };
    setDailyTasks(updated);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      weekNumber: selectedWeek,
      dateRange: currentWeekMeta.dateRange,
      taskTitle,
      dailyLogs: dailyTasks,
      totalHours: 40.0,
      safetyChecklist,
      photos,
      status: 'pending',
      submittedAt: new Date().toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) + ' ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center font-bold text-sm">
              #2
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wide">
                  บันทึกการปฏิบัติงานวิชาชีพ & รูปถ่ายหน้างาน
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  สัปดาห์ที่ {selectedWeek} (1-15)
                </span>
              </div>
              <h3 className="text-base font-bold text-white">บันทึกการปฏิบัติงานวิชาชีพ & รูปถ่ายหน้างาน</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-12 text-center space-y-3">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-lg font-bold text-slate-800">
              บันทึกและซิงค์ข้อมูลสัปดาห์ที่ {selectedWeek} สำเร็จ!
            </h4>
            <p className="text-xs text-slate-600 font-medium">
              ข้อมูลถูกจัดเก็บลง <span className="font-bold text-amber-700">Firebase Firestore (internship2-2569)</span> เรียบร้อยแล้ว
            </p>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            {/* Student & Week Selector Banner */}
            <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900">{student.name} ({student.studentCode})</span>
                <p className="text-[11px] text-slate-600">สถานประกอบการ: {student.companyName}</p>
              </div>

              {/* Week Dropdown Selector 1-15 */}
              <div className="flex items-center gap-2">
                <label className="font-semibold text-slate-700 text-xs flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  <span>เลือกสัปดาห์ (เริ่ม 19 ต.ค. 2569):</span>
                </label>
                <select
                  value={selectedWeek}
                  onChange={(e) => handleSelectWeek(parseInt(e.target.value))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                >
                  {WEEKS_1_TO_15.map((w) => (
                    <option key={w.weekNumber} value={w.weekNumber}>
                      สัปดาห์ที่ {w.weekNumber} ({w.dateRange})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Task Title */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                หัวข้องานหลักประจำสัปดาห์ที่ {selectedWeek}
              </label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden font-medium"
                placeholder="ระบุหัวข้องานปฏิบัติการ..."
                required
              />
            </div>

            {/* Daily Tasks (5 days) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span>บันทึกการปฏิบัติงานรายวัน จันทร์ - ศุกร์ (40 ชม.)</span>
                </label>
                <span className="text-[10px] text-slate-500">วันละ 8.0 ชั่วโมง (08:30 - 16:30 น.)</span>
              </div>

              <div className="space-y-2">
                {dailyTasks.map((task, idx) => (
                  <div key={task.id || idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {task.day} ({task.date})
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">{task.hours} ชม.</span>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={task.taskDescription}
                        onChange={(e) => handleTaskChange(idx, 'taskDescription', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500"
                        placeholder="รายละเอียดงานและสมรรถนะวิชาชีพ"
                        required
                      />
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={task.toolsUsed}
                        onChange={(e) => handleTaskChange(idx, 'toolsUsed', e.target.value)}
                        className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded text-[11px]"
                        placeholder="เครื่องมือ / อุปกรณ์ที่ใช้"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photo Evidence Upload Box (ช่องแนบไฟล์รูปถ่าย) */}
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Camera className="w-4 h-4 text-sky-600" />
                    <span>ช่องแนบไฟล์รูปถ่ายหน้างาน (Photo Evidence)</span>
                  </label>
                  <span className="text-[10px] text-slate-500">
                    แนบไฟล์รูปถ่ายจากเครื่องหรือถ่ายจากกล้องมือถือ (จัดเก็บเข้า Firebase Firestore)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>แนบไฟล์ภาพ</span>
                </button>
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

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-xl p-4 text-center bg-sky-50/50 hover:bg-sky-50 transition cursor-pointer space-y-1"
              >
                <Upload className="w-5 h-5 text-sky-600 mx-auto" />
                <p className="font-semibold text-[11px] text-slate-800">
                  คลิกเพื่อเลือกไฟล์รูปภาพจากอุปกรณ์
                </p>
                <p className="text-[10px] text-slate-500">
                  รองรับ JPG, PNG (รูปภาพจะถูกบีบอัดและแนบเข้าเอกสารสัปดาห์ที่ {selectedWeek})
                </p>
              </div>

              {/* Photos Gallery */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {photos.map((photo, i) => (
                  <div key={photo.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs relative group">
                    <img src={photo.url} alt={photo.title} className="w-full h-28 object-cover bg-slate-100" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-rose-600/90 text-white flex items-center justify-center hover:bg-rose-700 transition"
                      title="ลบภาพนี้"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="p-2 space-y-1">
                      <input
                        type="text"
                        value={photo.title}
                        onChange={(e) => {
                          const updated = [...photos];
                          updated[i].title = e.target.value;
                          setPhotos(updated);
                        }}
                        placeholder="ชื่อภาพ..."
                        className="w-full font-semibold text-[11px] text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={photo.caption}
                        onChange={(e) => {
                          const updated = [...photos];
                          updated[i].caption = e.target.value;
                          setPhotos(updated);
                        }}
                        placeholder="คำบรรยาย..."
                        className="w-full text-[10px] text-slate-500 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-amber-600" />
                <span>ซิงค์ตรงเข้า Firebase Firestore (internship2-2569)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-sm transition inline-flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>บันทึกลง Firestore (สัปดาห์ที่ {selectedWeek})</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
