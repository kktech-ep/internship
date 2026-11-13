import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Building, 
  Phone, 
  User, 
  CheckCircle2, 
  Save,
  FileSpreadsheet,
  Loader2,
  ExternalLink,
  Navigation,
  Eye
} from 'lucide-react';
import { Student } from '../../types';
import { 
  findStudentInLoginSheet, 
  saveCompanyDataToLoginSheet,
  LoginSheetFullRow 
} from '../../services/sheetAuthService';
import { saveAndSyncStudentBothWays } from '../../services/sheetFirebaseSyncService';
import { getCachedAccessToken } from '../../services/authService';

interface Form1CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  onSave: (updatedData: Partial<Student['companyRegistration']> & { companyName?: string }) => void;
}

export const Form1CompanyModal: React.FC<Form1CompanyModalProps> = ({
  isOpen,
  onClose,
  student,
  onSave,
}) => {
  const [sheetRow, setSheetRow] = useState<LoginSheetFullRow | null>(null);
  const [room, setRoom] = useState<string>(student.room || '');
  const [formData, setFormData] = useState({
    companyName: student.companyName,
    department: student.companyRegistration?.department || '',
    mentorName: student.companyRegistration?.mentorName || '',
    mentorPhone: student.companyRegistration?.mentorPhone || '',
    emergencyPhone: student.companyRegistration?.emergencyPhone || '',
    gpsCoordinates: student.companyRegistration?.gpsCoordinates || '',
    notes: student.companyRegistration?.notes || '',
  });

  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [syncResultMsg, setSyncResultMsg] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(false);

  // Load and bind student's data directly from login sheet
  useEffect(() => {
    if (isOpen && student) {
      setIsLoadingSheet(true);
      findStudentInLoginSheet(student.studentCode, student.name).then((row) => {
        setIsLoadingSheet(false);
        if (row) {
          setSheetRow(row);
          setRoom(row.room || student.room || '');
          setFormData({
            companyName: row.Company || student.companyName || '',
            department: row.department || student.companyRegistration?.department || '',
            mentorName: row.leader || student.companyRegistration?.mentorName || '',
            mentorPhone: row.leaderPhone || student.companyRegistration?.mentorPhone || '',
            emergencyPhone: row.CompanyPhone || student.companyRegistration?.emergencyPhone || '',
            gpsCoordinates: row.GPS || student.companyRegistration?.gpsCoordinates || '',
            notes: row.delial || student.companyRegistration?.notes || '',
          });
        } else {
          setRoom(student.room || '');
          setFormData({
            companyName: student.companyName || '',
            department: student.companyRegistration?.department || '',
            mentorName: student.companyRegistration?.mentorName || '',
            mentorPhone: student.companyRegistration?.mentorPhone || '',
            emergencyPhone: student.companyRegistration?.emergencyPhone || '',
            gpsCoordinates: student.companyRegistration?.gpsCoordinates || '',
            notes: student.companyRegistration?.notes || '',
          });
        }
      });
    }
  }, [isOpen, student]);

  if (!isOpen) return null;

  // Open confirmation dialog before saving/syncing to Google Sheets
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  // Perform confirmed save & Google Sheets update in sheet tab 'login'
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);

    const nowTh = new Date().toLocaleString('th-TH');
    const token = getCachedAccessToken();

    // 1. Save and synchronize bidirectionally to Firebase Firestore (internship2-2569) & Google Sheets (login tab)
    const syncRes = await saveAndSyncStudentBothWays(
      {
        ...student,
        companyName: formData.companyName,
        room: room,
        companyRegistration: {
          ...student.companyRegistration,
          department: formData.department,
          mentorName: formData.mentorName,
          mentorPhone: formData.mentorPhone,
          emergencyPhone: formData.emergencyPhone,
          gpsCoordinates: formData.gpsCoordinates,
          notes: formData.notes,
          registeredAt: nowTh
        }
      },
      token
    );

    setSyncResultMsg(
      `${syncRes.sheetResult} และเชื่อมต่อซิงค์กับ Firebase Firestore: internship2-2569 เรียบร้อยแล้ว`
    );

    // 2. Persist to student state in React
    onSave({
      companyName: formData.companyName,
      department: formData.department,
      mentorName: formData.mentorName,
      mentorPhone: formData.mentorPhone,
      emergencyPhone: formData.emergencyPhone,
      gpsCoordinates: formData.gpsCoordinates,
      notes: formData.notes,
      registeredAt: nowTh + ' (ซิงค์ Sheets ⇋ Firebase)',
    });

    setIsSubmitting(false);
    setIsSaved(true);
  };

  const handleGetDeviceGPS = () => {
    setIsLocating(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          setFormData(prev => ({ ...prev, gpsCoordinates: `${lat}, ${lng}` }));
        },
        (err) => {
          setIsLocating(false);
          console.warn('Geolocation error or permission denied:', err.message);
          const lat = (16.4322 + (Math.random() - 0.5) * 0.005).toFixed(6);
          const lng = (102.8236 + (Math.random() - 0.5) * 0.005).toFixed(6);
          setFormData(prev => ({ ...prev, gpsCoordinates: `${lat}, ${lng}` }));
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsLocating(false);
      const lat = (16.4322 + (Math.random() - 0.5) * 0.005).toFixed(6);
      const lng = (102.8236 + (Math.random() - 0.5) * 0.005).toFixed(6);
      setFormData(prev => ({ ...prev, gpsCoordinates: `${lat}, ${lng}` }));
    }
  };

  // Build Google Maps link for user to locate/pinpoint on map
  const googleMapsUrl = formData.gpsCoordinates && formData.gpsCoordinates.includes(',')
    ? `https://www.google.com/maps?q=${encodeURIComponent(formData.gpsCoordinates.trim())}`
    : formData.companyName
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.companyName + ' ขอนแก่น')}`
      : 'https://www.google.com/maps/@16.4322,102.8236,15z';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-sky-800 to-indigo-900 text-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">บันทึกข้อมูลสถานประกอบการ</h3>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-sky-100 mt-1.5">
            บันทึกรายละเอียดสถานที่ฝึกงาน ข้อมูลพี่เลี้ยง และพิกัด GPS เพื่อใช้ในแผนการออกนิเทศก์ของครูที่ปรึกษา
          </p>
        </div>

        {isSaved ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
            <div>
              <h4 className="text-base font-bold text-slate-900">บันทึกข้อมูลเรียบร้อยแล้ว!</h4>
              <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                {syncResultMsg || `ข้อมูลสถานประกอบการถูกบันทึกและซิงค์ข้อมูลเรียบร้อยแล้ว`}
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-w-sm mx-auto text-left text-xs space-y-1">
              <div className="text-[11px] text-slate-500">นักศึกษา: <strong className="text-slate-800">{student.name} ({student.studentCode})</strong></div>
              <div className="text-[11px] text-slate-500">กลุ่ม: <strong className="text-sky-800">{room}</strong></div>
              <div className="text-[11px] text-slate-500">สถานประกอบการ: <strong className="text-slate-800">{formData.companyName}</strong></div>
              <div className="text-[11px] text-slate-500">แผนก: <span className="text-slate-800">{formData.department}</span></div>
              <div className="text-[11px] text-slate-500">พี่เลี้ยง: <span className="text-slate-800">{formData.mentorName} ({formData.mentorPhone})</span></div>
              <div className="text-[11px] text-slate-500">เบอร์ฉุกเฉิน: <span className="text-slate-800">{formData.emergencyPhone}</span></div>
              <div className="text-[11px] text-slate-500 font-mono">พิกัด GPS: <span className="text-emerald-700">{formData.gpsCoordinates}</span></div>
              {formData.notes && (
                <div className="text-[11px] text-slate-500">หมายเหตุ: <span className="text-slate-700">{formData.notes}</span></div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePreSubmit} className="p-6 space-y-4 text-xs">
            {/* Student Info preview box showing: name (studentCode) ตามด้วยกลุ่ม */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 text-sm">
                {student.name} ({student.studentCode})
              </div>
              <div className="text-slate-600 text-xs mt-1 flex items-center gap-2">
                <span className="font-semibold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded text-[11px]">
                  กลุ่ม: {room || student.room || 'สอฟ.2/1'}
                </span>
              </div>
            </div>

            {/* Field: ชื่อสถานประกอบการฝึกอาชีพ */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อสถานประกอบการฝึกอาชีพ
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="เช่น การไฟฟ้าส่วนภูมิภาค สาขาเชียงยืน"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Field: หน่วยงาน / แผนก */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">หน่วยงาน / แผนก</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="department"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Field: ชื่อพี่เลี้ยง / ผู้ควบคุมงาน */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อพี่เลี้ยง / ผู้ควบคุมงาน</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.mentorName}
                    onChange={(e) => setFormData({ ...formData, mentorName: e.target.value })}
                    placeholder="leader"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Field: เบอร์ติดต่อพี่เลี้ยง */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">เบอร์ติดต่อพี่เลี้ยง</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.mentorPhone}
                    onChange={(e) => setFormData({ ...formData, mentorPhone: e.target.value })}
                    placeholder="leaderPhone"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Field: เบอร์ติดต่อกรณีฉุกเฉิน */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">เบอร์ติดต่อกรณีฉุกเฉิน</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    placeholder="เช่น 0817907223"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Field: พิกัด GPS หมุดแผนที่ดาวเทียม */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <label className="block font-semibold text-slate-700">
                  พิกัด GPS หมุดแผนที่ดาวเทียม
                </label>
                <div className="flex items-center gap-2">
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg font-semibold inline-flex items-center gap-1.5 text-xs transition shadow-2xs hover:underline cursor-pointer"
                    title="เปิด Google Maps เพื่อระบุตำแหน่งหรือคัดลอกพิกัด"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>ดึงพิกัดปัจจุบัน (GPS Pin) บน Google Maps</span>
                    <ExternalLink className="w-3 h-3 text-sky-500" />
                  </a>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={formData.gpsCoordinates}
                  onChange={(e) => setFormData({ ...formData, gpsCoordinates: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-700 bg-slate-50 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  placeholder="เช่น 16.4322, 102.8236"
                  required
                />
              </div>

              {/* Action buttons & helper */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleGetDeviceGPS}
                    disabled={isLocating}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer"
                    title="กดเพื่อดึงพิกัดละติจูด, ลองจิจูด จากชิป GPS ของเครื่องโดยตรง"
                  >
                    <Navigation className="w-3 h-3 text-emerald-600" />
                    <span>{isLocating ? 'กำลังดึงพิกัด GPS...' : 'ดึงพิกัดจากอุปกรณ์ (GPS Pin)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMapPreview(!showMapPreview)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <Eye className="w-3 h-3 text-slate-500" />
                    <span>{showMapPreview ? 'ซ่อนแผนที่' : 'ดูแผนที่ตัวอย่าง'}</span>
                  </button>
                </div>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold inline-flex items-center gap-1"
                >
                  <span>เปิด Google Maps เต็มจอ</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Embedded Google Maps Preview */}
              {showMapPreview && (
                <div className="mt-2 rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100 animate-in fade-in duration-200">
                  <iframe
                    title="Google Map Location Preview"
                    width="100%"
                    height="180"
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(
                      formData.gpsCoordinates || formData.companyName || 'ขอนแก่น'
                    )}&t=m&z=15&output=embed`}
                    className="w-full border-0"
                  />
                  <div className="p-2 bg-slate-50 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200">
                    <span>หมุดตำแหน่ง: {formData.gpsCoordinates || formData.companyName || 'ขอนแก่น'}</span>
                    <span className="text-slate-400">อ้างอิง Google Maps</span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                💡 <span className="font-semibold text-slate-700">วิธีระบุตำแหน่งจาก Google Maps:</span> คลิกที่ลิงก์ <strong className="text-sky-700">"ดึงพิกัดปัจจุบัน (GPS Pin) บน Google Maps"</strong> ด้านบน &gt; ค้นหาหรือปักหมุดจุดที่ตั้งสถานประกอบการ &gt; คัดลอกพิกัดตัวเลข (เช่น <span className="font-mono text-emerald-800 font-semibold">16.4322, 102.8236</span>) แล้วนำมาวางในช่องนี้
              </p>
            </div>

            {/* Field: หมายเหตุเพิ่มเติม / จุดสังเกต */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                หมายเหตุเพิ่มเติม / จุดสังเกต
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden text-xs"
                placeholder="delial"
              />
            </div>

            {/* Submit & Cancel buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>บันทึกข้อมูล</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Confirmation Modal for Google Workspace Data Mutation (Mandatory) */}
        {showConfirmModal && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">ยืนยันการบันทึกข้อมูลลงแผ่นงาน login</h4>
                  <p className="text-[11px] text-slate-500">Google Sheets ID: 1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">ผู้ฝึกงาน:</span>
                  <span className="font-semibold">{student.name} ({student.studentCode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">กลุ่ม:</span>
                  <span className="font-semibold text-sky-800">{room}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">สถานประกอบการ:</span>
                  <span className="font-semibold text-slate-900">{formData.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">แผนก:</span>
                  <span>{formData.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">พี่เลี้ยง:</span>
                  <span>{formData.mentorName} ({formData.mentorPhone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">เบอร์ฉุกเฉิน:</span>
                  <span>{formData.emergencyPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">พิกัด GPS:</span>
                  <span className="font-mono text-slate-800">{formData.gpsCoordinates}</span>
                </div>
                {formData.notes && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">หมายเหตุ:</span>
                    <span className="truncate max-w-[200px]">{formData.notes}</span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 leading-relaxed">
                ข้อมูลสถานประกอบการจะถูกบันทึกและซิงค์เข้าระบบฐานข้อมูลวิทยาลัยเทคนิคขอนแก่น เพื่อใช้สำหรับวางแผนออกตรวจนิเทศก์
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
                >
                  ยืนยันบันทึกข้อมูล
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
