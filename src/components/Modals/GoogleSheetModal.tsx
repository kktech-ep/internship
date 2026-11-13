import React, { useState, useEffect } from 'react';
import { 
  X, 
  Table, 
  Download, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink,
  FileSpreadsheet,
  Building,
  Calendar,
  KeyRound,
  Users,
  BookOpen,
  Camera
} from 'lucide-react';
import { Student, CourseDataRow, Form3SupervisionRecord } from '../../types';
import { 
  getLocalForm1Rows, 
  fetchGoogleSheetForm1Rows, 
  getLocalForm3Rows,
  fetchGoogleSheetForm3Rows,
  GOOGLE_SHEET_CONFIG, 
  Form1RowData 
} from '../../services/googleSheetsService';
import { 
  fetchSheetLoginAccounts, 
  SheetLoginAccount,
  LOGIN_SHEET_CONFIG 
} from '../../services/sheetAuthService';
import { 
  fetchDataSheetCourses, 
  getCachedCourses,
  DATA_SHEET_CONFIG 
} from '../../services/courseDataService';
import { syncAllLoginSheetRowsToFirebase } from '../../services/sheetFirebaseSyncService';
import { getCachedAccessToken, requestGoogleSheetsAccessToken } from '../../services/authService';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  students,
}) => {
  const [activeTab, setActiveTab] = useState<'form1' | 'form2' | 'login' | 'data' | 'form3'>('login');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWeek, setFilterWeek] = useState('all');
  const [form1Rows, setForm1Rows] = useState<Form1RowData[]>([]);
  const [loginAccounts, setLoginAccounts] = useState<SheetLoginAccount[]>([]);
  const [dataCourses, setDataCourses] = useState<CourseDataRow[]>(() => getCachedCourses());
  const [form3Rows, setForm3Rows] = useState<Form3SupervisionRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [firebaseSyncNotice, setFirebaseSyncNotice] = useState<string | null>(null);

  const handleSyncWithFirebase = async () => {
    setIsSyncingFirebase(true);
    setFirebaseSyncNotice('กำลังเชื่อมโยงข้อมูล Google Sheet แผ่นงาน login สู่ Firebase: internship2-2569...');
    try {
      const summary = await syncAllLoginSheetRowsToFirebase();
      setFirebaseSyncNotice(summary.message);
      const freshAccs = await fetchSheetLoginAccounts(true);
      setLoginAccounts(freshAccs);
    } catch (e) {
      setFirebaseSyncNotice('เกิดข้อผิดพลาดในการเชื่อมโยง: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setForm1Rows(getLocalForm1Rows());
      setForm3Rows(getLocalForm3Rows());
      fetchSheetLoginAccounts().then(accs => setLoginAccounts(accs));
      fetchDataSheetCourses().then(c => setDataCourses(c));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Generate simulated sheet rows for Form #2 (Weekly Reports)
  const mockForm2Rows = [
    {
      timestamp: '14/06/2024 17:30:15',
      studentCode: '65301040018',
      studentName: 'นายธนากร สุริยะแสง',
      company: 'การไฟฟ้าส่วนภูมิภาค สาขาขอนแก่น (PEA)',
      week: 'สัปดาห์ที่ 8',
      hours: '40',
      task: 'ติดตั้งตู้ MDB & Wiring Control',
      tools: 'ประแจปอนด์, เครื่องเป่าลม, Megger Test',
      groundResistance: '3.84 Ω',
      ppeStatus: 'ผ่าน 100%',
      mentorScore: '5.0',
      teacherScore: '19.5',
      grade: 'A',
      inspector: 'นายทักษิณ โสภาปิยะ',
      status: 'อนุมัติแล้ว'
    },
    {
      timestamp: '14/06/2024 16:45:20',
      studentCode: '66301040012',
      studentName: 'นายกิตติศักดิ์ เจริญศรี',
      company: 'การไฟฟ้าส่วนภูมิภาค สาขาขอนแก่น (PEA)',
      week: 'สัปดาห์ที่ 8',
      hours: '40',
      task: 'บำรุงรักษาสถานีไฟฟ้า 115 kV',
      tools: 'Earth Tester, Clamp Meter',
      groundResistance: '3.10 Ω',
      ppeStatus: 'ผ่าน 100%',
      mentorScore: '5.0',
      teacherScore: '19.5',
      grade: 'A',
      inspector: 'นายทักษิณ โสภาปิยะ',
      status: 'อนุมัติแล้ว'
    },
    {
      timestamp: '14/06/2024 18:10:02',
      studentCode: '66301040018',
      studentName: 'นายชนาภัทร สมบูรณ์ผล',
      company: 'บจก. ไทยเพาเวอร์ คอนโทรล ขอนแก่น',
      week: 'สัปดาห์ที่ 8',
      hours: '40',
      task: 'งานประกอบตู้ควบคุม MDB & PLC',
      tools: 'คีมย้ำหางปลา, โน้ตบุ๊กทดสอบ PLC',
      groundResistance: '4.20 Ω',
      ppeStatus: 'ผ่าน 100%',
      mentorScore: '4.8',
      teacherScore: '18.0',
      grade: 'B+',
      inspector: 'นายทักษิณ โสภาปิยะ',
      status: 'รอประเมิน'
    },
    {
      timestamp: '13/06/2024 15:20:44',
      studentCode: '66301040024',
      studentName: 'นางสาวสุจิตรา วรรณดี',
      company: 'บจก. สยามคูโบต้า คอร์ปอเรชั่น',
      week: 'สัปดาห์ที่ 8',
      hours: '40',
      task: 'ฝ่ายระบบไฟฟ้ายานยนต์และมอเตอร์ขับเคลื่อน',
      tools: 'Multimeter, Battery Tester',
      groundResistance: '2.95 Ω',
      ppeStatus: 'ผ่าน 100%',
      mentorScore: '4.9',
      teacherScore: '18.0',
      grade: 'B+',
      inspector: 'นายทักษิณ โสภาปิยะ',
      status: 'อนุมัติแล้ว'
    },
    {
      timestamp: '13/06/2024 14:15:10',
      studentCode: '66301040033',
      studentName: 'นายอนุรักษ์ โพธิ์แก้ว',
      company: 'บจก. อีสานโซลาร์เอนเนอร์ยี ขอนแก่น',
      week: 'สัปดาห์ที่ 8',
      hours: '40',
      task: 'ติดตั้งระบบ Solar Rooftop & อินเวอร์เตอร์ 3 เฟส',
      tools: 'PV Clamp, Torque Wrench, MC4 Crimper',
      groundResistance: '3.60 Ω',
      ppeStatus: 'ผ่าน 100%',
      mentorScore: '4.7',
      teacherScore: '17.5',
      grade: 'B',
      inspector: 'นายทักษิณ โสภาปิยะ',
      status: 'อนุมัติแล้ว'
    }
  ];

  // Refresh live rows from Google Sheets API
  const handleRefreshLive = async () => {
    setIsRefreshing(true);
    setStatusNotice(null);

    // Refresh login accounts and data courses
    const accs = await fetchSheetLoginAccounts(true);
    setLoginAccounts(accs);
    const crs = await fetchDataSheetCourses(true);
    setDataCourses(crs);

    let token = getCachedAccessToken();
    if (!token) {
      try {
        token = await requestGoogleSheetsAccessToken();
      } catch (e) {
        console.warn('OAuth request note:', e);
      }
    }

    if (token) {
      const res = await fetchGoogleSheetForm1Rows(token);
      setForm1Rows(res.rows);
      setStatusNotice('ซิงค์ข้อมูลล่าสุดจาก Google Sheets (login, data, Form_1) สำเร็จ!');
    } else {
      setForm1Rows(getLocalForm1Rows());
      setStatusNotice(`ซิงค์ข้อมูลตาราง login (${accs.length} บัญชี) และ data (${crs.length} วิชา) สำเร็จ`);
    }
    setIsRefreshing(false);
  };

  const filteredLoginRows = loginAccounts.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.user.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      r.pass.includes(q)
    );
  });

  const filteredDataCourses = dataCourses.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.room.toLowerCase().includes(q) ||
      c.subjectCode.toLowerCase().includes(q) ||
      c.subjectName.toLowerCase().includes(q) ||
      c.teacherName.toLowerCase().includes(q)
    );
  });

  const filteredForm1Rows = form1Rows.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.studentName.toLowerCase().includes(q) ||
      r.studentCode.includes(q) ||
      r.companyName.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.mentorName.toLowerCase().includes(q)
    );
  });

  const filteredForm2Rows = mockForm2Rows.filter((r) => {
    const matchesSearch = 
      r.studentName.includes(searchTerm) ||
      r.studentCode.includes(searchTerm) ||
      r.company.includes(searchTerm) ||
      r.task.includes(searchTerm);
    const matchesWeek = filterWeek === 'all' || r.week.includes(filterWeek);
    return matchesSearch && matchesWeek;
  });

  const filteredForm3Rows = form3Rows.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.studentName.toLowerCase().includes(q) ||
      r.studentCode.toLowerCase().includes(q) ||
      r.companyName.toLowerCase().includes(q) ||
      r.teacherName.toLowerCase().includes(q) ||
      r.mentorName.toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    if (activeTab === 'login') {
      const headers = 'user,pass,name,status\n';
      const csvContent = filteredLoginRows.map(r => 
        `"${r.user}","${r.pass}","${r.name}","${r.status}"`
      ).join('\n');
      
      const blob = new Blob(['\uFEFF' + headers + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GoogleSheets_login_accounts_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeTab === 'data') {
      const headers = 'room,รหัสวิชา,ชื่อวิชา,ครูนิเทศก์/ประจำวิชา\n';
      const csvContent = filteredDataCourses.map(c => 
        `"${c.room}","${c.subjectCode}","${c.subjectName}","${c.teacherName}"`
      ).join('\n');
      
      const blob = new Blob(['\uFEFF' + headers + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GoogleSheets_data_courses_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeTab === 'form1') {
      const headers = 'Timestamp,StudentCode,StudentName,Level,CompanyName,Department,MentorName,MentorPhone,EmergencyPhone,GPS,Notes,Status\n';
      const csvContent = filteredForm1Rows.map(r => 
        `"${r.timestamp}","${r.studentCode}","${r.studentName}","${r.level}","${r.companyName}","${r.department}","${r.mentorName}","${r.mentorPhone}","${r.emergencyPhone}","${r.gpsCoordinates}","${r.notes}","${r.status || 'บันทึกสำเร็จ'}"`
      ).join('\n');
      
      const blob = new Blob(['\uFEFF' + headers + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GoogleSheets_${GOOGLE_SHEET_CONFIG.form1SheetName}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = 'Timestamp,StudentCode,Name,Company,Week,Hours,Task,GroundResistance,PPE,MentorScore,TeacherScore,Grade,Inspector,Status\n';
      const csvContent = filteredForm2Rows.map(r => 
        `"${r.timestamp}","${r.studentCode}","${r.studentName}","${r.company}","${r.week}","${r.hours}","${r.task}","${r.groundResistance}","${r.ppeStatus}","${r.mentorScore}","${r.teacherScore}","${r.grade}","${r.inspector}","${r.status}"`
      ).join('\n');
      
      const blob = new Blob(['\uFEFF' + headers + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'KKTECH_Internship_Form2_Reports.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-emerald-900 text-white p-4 px-6 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm text-white">Google Sheets Master Data ⇋ Firebase Unified</span>
                <span className="font-mono text-[10px] bg-emerald-800/80 px-2 py-0.5 rounded border border-emerald-700 text-emerald-200">
                  ID: {GOOGLE_SHEET_CONFIG.spreadsheetId}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  แผ่นงาน: login & Form_1
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/30 text-amber-200 border border-amber-400/40 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  Firebase: internship2-2569
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                ฐานข้อมูลเดียวกัน: เชื่อมโยงบัญชีและข้อมูลสถานประกอบการจากแผ่นงาน login สู่ Firebase Firestore แบบเรียลไทม์
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncWithFirebase}
              disabled={isSyncingFirebase}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
              title="ซิงค์ข้อมูลแถวทั้งหมดจาก Google Sheet แผ่นงาน login เข้าสู่ Firebase: internship2-2569"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFirebase ? 'animate-spin' : ''}`} />
              <span>{isSyncingFirebase ? 'กำลังซิงค์ Firebase...' : 'ซิงค์สด Sheet ⇋ Firebase'}</span>
            </button>
            <a
              href={GOOGLE_SHEET_CONFIG.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs shadow-xs transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดชีตจริง</span>
            </a>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Result Notice Banner */}
        {firebaseSyncNotice && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{firebaseSyncNotice}</span>
            </div>
            <button 
              onClick={() => setFirebaseSyncNotice(null)} 
              className="text-amber-700 hover:text-amber-900 text-[11px] font-bold"
            >
              ✕ ปิด
            </button>
          </div>
        )}

        {/* Tab Selector */}
        <div className="bg-emerald-950/20 border-b border-slate-200 px-6 pt-2 flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('login')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>แผ่นงาน: login (user, pass, name, status)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                {loginAccounts.length} บัญชี
              </span>
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'data'
                  ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-600" />
              <span>แผ่นงาน: data (room, รหัสวิชา, ชื่อวิชา, ครูนิเทศก์)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-sky-100 text-sky-800 font-mono">
                {dataCourses.length} รายการ
              </span>
            </button>

            <button
              onClick={() => setActiveTab('form1')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'form1'
                  ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              <span>แผ่นงาน: Form_1 (ข้อมูลสถานประกอบการ)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                {form1Rows.length} รายการ
              </span>
            </button>

            <button
              onClick={() => setActiveTab('form2')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'form2'
                  ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>แผ่นงาน: Form_2 (รายงานประจำสัปดาห์)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-sky-100 text-sky-800">
                {mockForm2Rows.length} รายการ
              </span>
            </button>

            <button
              onClick={() => setActiveTab('form3')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'form3'
                  ? 'bg-white text-emerald-800 border-emerald-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>แผ่นงาน: รายงานการนิเทศ & รูปถ่าย 3-4 รูป</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-mono">
                {form3Rows.length} รายการ
              </span>
            </button>
          </div>

          <a
            href={GOOGLE_SHEET_CONFIG.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline inline-flex items-center gap-1 py-1"
          >
            <span>docs.google.com/spreadsheets/d/{GOOGLE_SHEET_CONFIG.spreadsheetId}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Toolbar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={
                  activeTab === 'login'
                    ? 'ค้นหา user, pass, name, หรือ status...'
                    : activeTab === 'form1'
                    ? 'ค้นหาชื่อนักศึกษา, รหัส, สถานประกอบการ, พี่เลี้ยง...'
                    : 'ค้นหาชื่อ, รหัสนักศึกษา, หรืองาน...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {activeTab === 'form2' && (
              <select
                value={filterWeek}
                onChange={(e) => setFilterWeek(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">ทุกสัปดาห์</option>
                <option value="8">สัปดาห์ที่ 8</option>
                <option value="7">สัปดาห์ที่ 7</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshLive}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>ซิงค์ดึงข้อมูลสด</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก CSV</span>
            </button>
          </div>
        </div>

        {statusNotice && (
          <div className="bg-emerald-50 text-emerald-800 px-5 py-2 text-xs flex items-center justify-between border-b border-emerald-200">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {statusNotice}
            </span>
            <button onClick={() => setStatusNotice(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-auto text-xs">
          {activeTab === 'login' ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="p-2.5 pl-4 w-12 text-center">#</th>
                  <th className="p-2.5">user (ชื่อผู้ใช้ / รหัส / อีเมล)</th>
                  <th className="p-2.5">pass (รหัสผ่าน)</th>
                  <th className="p-2.5">name (ชื่อ-นามสกุล)</th>
                  <th className="p-2.5 pr-4">status (บทบาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredLoginRows.map((row, i) => {
                  const isAdmin = row.status.toLowerCase().includes('admin');
                  const isTeacher = row.status.toLowerCase().includes('teacher') || row.status.includes('ครู');
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition text-[11px]">
                      <td className="p-2.5 pl-4 text-slate-400 font-mono text-center">{i + 1}</td>
                      <td className="p-2.5 font-bold font-mono text-slate-900">{row.user}</td>
                      <td className="p-2.5 font-mono text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {row.pass}
                        </span>
                      </td>
                      <td className="p-2.5 font-medium whitespace-nowrap text-slate-900">{row.name}</td>
                      <td className="p-2.5 pr-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          isAdmin 
                            ? 'bg-slate-100 text-slate-800 border-slate-300'
                            : isTeacher
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : activeTab === 'data' ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="p-2.5 pl-4 w-12 text-center">#</th>
                  <th className="p-2.5 font-mono">กลุ่มเรียน (room)</th>
                  <th className="p-2.5 font-mono">รหัสวิชา</th>
                  <th className="p-2.5">ชื่อวิชา</th>
                  <th className="p-2.5">ครูนิเทศก์ / ประจำวิชา</th>
                  <th className="p-2.5 pr-4 text-center">จำนวน นศ. ในห้อง (login)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredDataCourses.map((row, i) => {
                  const studentCount = students.filter(s => s.room === row.room).length;
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition text-[11px]">
                      <td className="p-2.5 pl-4 text-slate-400 font-mono text-center">{i + 1}</td>
                      <td className="p-2.5">
                        <span className="font-mono font-bold text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded border border-sky-200 text-xs">
                          {row.room}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">{row.subjectCode}</td>
                      <td className="p-2.5 font-medium text-slate-900">{row.subjectName}</td>
                      <td className="p-2.5 font-semibold text-emerald-800">{row.teacherName}</td>
                      <td className="p-2.5 pr-4 text-center font-mono font-bold text-slate-700">
                        {studentCount} คน
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : activeTab === 'form1' ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="p-2.5 pl-4">วัน-เวลาบันทึก</th>
                  <th className="p-2.5">รหัสนักศึกษา</th>
                  <th className="p-2.5">ชื่อ-นามสกุล</th>
                  <th className="p-2.5">ระดับชั้น/แผนก</th>
                  <th className="p-2.5">สถานประกอบการ</th>
                  <th className="p-2.5">หน่วยงาน/แผนก</th>
                  <th className="p-2.5">ชื่อพี่เลี้ยง</th>
                  <th className="p-2.5">เบอร์ติดต่อ</th>
                  <th className="p-2.5">พิกัด GPS</th>
                  <th className="p-2.5">จุดสังเกต/หมายเหตุ</th>
                  <th className="p-2.5 pr-4">สถานะชีต</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredForm1Rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition text-[11px]">
                    <td className="p-2.5 pl-4 text-slate-500 whitespace-nowrap font-mono">{row.timestamp}</td>
                    <td className="p-2.5 font-bold text-slate-900 font-mono">{row.studentCode}</td>
                    <td className="p-2.5 font-medium whitespace-nowrap">{row.studentName}</td>
                    <td className="p-2.5 text-slate-600 whitespace-nowrap">{row.level}</td>
                    <td className="p-2.5 font-semibold text-slate-900 max-w-xs">{row.companyName}</td>
                    <td className="p-2.5 text-slate-700">{row.department}</td>
                    <td className="p-2.5 text-slate-800 whitespace-nowrap">{row.mentorName}</td>
                    <td className="p-2.5 text-sky-700 font-mono whitespace-nowrap">{row.mentorPhone}</td>
                    <td className="p-2.5 text-emerald-700 font-mono whitespace-nowrap">{row.gpsCoordinates}</td>
                    <td className="p-2.5 text-slate-500 max-w-xs truncate">{row.notes || '-'}</td>
                    <td className="p-2.5 pr-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        Form_1 ซิงค์แล้ว
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="p-2.5 pl-4">Timestamp</th>
                  <th className="p-2.5">รหัสนักศึกษา</th>
                  <th className="p-2.5">ชื่อ-นามสกุล</th>
                  <th className="p-2.5">สถานประกอบการ</th>
                  <th className="p-2.5">งวด/สัปดาห์</th>
                  <th className="p-2.5">ชม.</th>
                  <th className="p-2.5">หัวข้องาน</th>
                  <th className="p-2.5">ค่ากราวด์</th>
                  <th className="p-2.5">PPE</th>
                  <th className="p-2.5">คะแนน/20</th>
                  <th className="p-2.5 pr-4">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredForm2Rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition text-[11px]">
                    <td className="p-2.5 pl-4 text-slate-500 whitespace-nowrap font-mono">{row.timestamp}</td>
                    <td className="p-2.5 font-bold text-slate-900 font-mono">{row.studentCode}</td>
                    <td className="p-2.5 font-medium whitespace-nowrap">{row.studentName}</td>
                    <td className="p-2.5 text-slate-600 max-w-xs truncate">{row.company}</td>
                    <td className="p-2.5 whitespace-nowrap">{row.week}</td>
                    <td className="p-2.5">{row.hours}</td>
                    <td className="p-2.5 text-slate-700 max-w-xs truncate">{row.task}</td>
                    <td className="p-2.5 text-sky-700 font-mono">{row.groundResistance}</td>
                    <td className="p-2.5 text-emerald-700">{row.ppeStatus}</td>
                    <td className="p-2.5 font-bold text-sky-700">{row.teacherScore} ({row.grade})</td>
                    <td className="p-2.5 pr-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Tab 5: รายงานการนิเทศ & รูปถ่าย 3-4 รูป */}
          {activeTab === 'form3' && (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 text-[10px] uppercase font-bold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="p-2.5 pl-4 whitespace-nowrap">ประทับเวลา</th>
                  <th className="p-2.5 whitespace-nowrap">วันและเวลานิเทศก์</th>
                  <th className="p-2.5 whitespace-nowrap">รหัสนักศึกษา</th>
                  <th className="p-2.5 whitespace-nowrap">ชื่อ-สกุล</th>
                  <th className="p-2.5 whitespace-nowrap">กลุ่ม (room)</th>
                  <th className="p-2.5 whitespace-nowrap">สถานประกอบการ</th>
                  <th className="p-2.5 whitespace-nowrap">ครูนิเทศก์</th>
                  <th className="p-2.5 whitespace-nowrap">พี่เลี้ยง</th>
                  <th className="p-2.5 whitespace-nowrap">ความปลอดภัย PPE</th>
                  <th className="p-2.5 whitespace-nowrap">คะแนน /20</th>
                  <th className="p-2.5 whitespace-nowrap">รูปการนิเทศ (3-4 รูป)</th>
                  <th className="p-2.5 pr-4 whitespace-nowrap">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredForm3Rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition text-[11px]">
                    <td className="p-2.5 pl-4 text-slate-500 whitespace-nowrap font-mono">{row.timestamp}</td>
                    <td className="p-2.5 font-semibold text-slate-800 whitespace-nowrap">{row.visitDate}</td>
                    <td className="p-2.5 font-bold text-sky-800 font-mono">{row.studentCode}</td>
                    <td className="p-2.5 font-medium whitespace-nowrap">{row.studentName}</td>
                    <td className="p-2.5 whitespace-nowrap font-mono text-[10px] text-indigo-700 font-bold">{row.studentRoom}</td>
                    <td className="p-2.5 text-slate-700 max-w-xs truncate" title={row.companyName}>{row.companyName}</td>
                    <td className="p-2.5 text-slate-700 whitespace-nowrap">{row.teacherName}</td>
                    <td className="p-2.5 text-slate-600 whitespace-nowrap">{row.mentorName}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        row.safetyPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {row.safetyPassed ? 'ผ่าน PPE 100%' : 'ต้องปรับปรุง'}
                      </span>
                    </td>
                    <td className="p-2.5 font-bold text-sky-700">
                      {row.score.toFixed(1)} <span className="text-[10px] text-slate-500">({row.grade})</span>
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        {row.photos && row.photos.length > 0 ? (
                          row.photos.map((photo, pIdx) => (
                            <a
                              key={pIdx}
                              href={photo.url}
                              target="_blank"
                              rel="noreferrer"
                              className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-emerald-500 transition block shrink-0"
                              title={`${photo.title}: ${photo.caption || ''}`}
                            >
                              <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
                            </a>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[10px]">- ไม่มีรูป -</span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono ml-1">
                          ({row.photos?.length || 0}/4 รูป)
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5 pr-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Google Sheets: <strong className="font-mono text-slate-800">1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28</strong> • แผ่นงาน <strong className="text-emerald-800">login</strong> & <strong className="text-emerald-800">Form_1</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={GOOGLE_SHEET_CONFIG.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:text-emerald-900 font-semibold underline inline-flex items-center gap-1"
            >
              <span>เปิดสเปรดชีต Google Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
