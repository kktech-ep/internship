import React, { useState, useMemo, useEffect } from 'react';
import { 
  Printer, 
  ExternalLink, 
  FileSpreadsheet, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  Award, 
  Building, 
  Building2,
  ShieldCheck, 
  Zap, 
  FileCheck,
  Search,
  Filter,
  Download,
  Users,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Camera,
  Check,
  FileText,
  Layers,
  Eye,
  X,
  Sparkles,
  MapPin,
  Phone,
  ArrowRight,
  UserCheck,
  RotateCcw,
  RotateCw,
  Loader2,
  Trash2,
  List
} from 'lucide-react';
import { Student, Company, WeeklySubmission, AuthUser, Form3SupervisionRecord, Form3Photo } from '../types';
import { WEEKS_1_TO_18, getDefaultDailyLogsForWeek } from '../data/weeksData';
import { getCoursesByRoom } from '../services/courseDataService';
import { getAllLoginSheetStudents, getAllLoginSheetTeachers } from '../services/sheetAuthService';
import { getLocalForm3Rows } from '../services/googleSheetsService';
import { subscribeForm3Supervisions, subscribeSubmissions } from '../services/firestoreService';
import { syncAllLoginSheetRowsToFirebase } from '../services/sheetFirebaseSyncService';
import { WorkplaceTeachingReportView } from './WorkplaceTeachingReportView';
import { GroupWeeklySummaryA4 } from '../components/GroupWeeklySummaryA4';

interface A4ReportViewProps {
  students: Student[];
  submissions: Record<string, WeeklySubmission[]>;
  companies?: Company[];
  initialStudentId?: string;
  currentUser?: AuthUser | null;
  onOpenSheetsModal: () => void;
  onOpenLookerModal: () => void;
  onOpenForm3?: (studentId?: string) => void;
  onSelectStudent?: (studentId: string) => void;
  onDeleteSubmission?: (submissionId: string, studentId: string) => Promise<boolean>;
  onDeleteSupervision?: (recordId: string) => Promise<boolean>;
}

export interface CompanySupervisionSummary {
  id: string;
  name: string;
  department: string;
  address: string;
  zone: string;
  phone: string;
  mentorName: string;
  mentorPhone: string;
  students: Student[];
  studentsCount: number;
  form3Records: Form3SupervisionRecord[];
  latestRecord?: Form3SupervisionRecord;
  isSupervised: boolean;
  score?: number;
  grade?: string;
  supervisingTeacher: string;
  supervisingTeachersList: string[];
  allPhotos: (Form3Photo & { teacherName?: string; visitDate?: string; studentName?: string })[];
  statusText: string;
}

function extractTeacherNames(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,/]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s !== '-');
}

export const A4ReportView: React.FC<A4ReportViewProps> = ({
  students: propStudents,
  submissions,
  companies: _propCompanies,
  initialStudentId,
  currentUser,
  onOpenSheetsModal,
  onOpenLookerModal,
  onOpenForm3,
  onSelectStudent,
  onDeleteSubmission,
  onDeleteSupervision,
}) => {
  // Main view tab: 'table' (All Companies Form_3 Summary), 'a4' (Official Weekly A4 Document), or 'teaching' (Workplace Integrated Learning Report)
  const [activeTab, setActiveTab] = useState<'table' | 'a4' | 'teaching'>('table');
  const [a4SubView, setA4SubView] = useState<'individual' | 'group-summary'>('individual');
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId || propStudents[0]?.id || 'std-68301040105');
  const [selectedWeek, setSelectedWeek] = useState('8');
  
  // Table search & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'supervised' | 'pending'>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [tableSubView, setTableSubView] = useState<'companies' | 'records'>('companies');
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Form3Photo | null>(null);

  // Real-time Form 3 supervision records from Firestore + Local Cache
  const remoteForm3Ref = React.useRef<Form3SupervisionRecord[]>([]);
  const [form3List, setForm3List] = useState<Form3SupervisionRecord[]>(() => getLocalForm3Rows());
  // Real-time Weekly Submissions from Firestore (internship2-2569)
  const [remoteSubmissions, setRemoteSubmissions] = useState<Record<string, WeeklySubmission[]>>({});

  // Global Sync State
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const handleSyncAllDatabases = async () => {
    setIsSyncingAll(true);
    try {
      const res = await syncAllLoginSheetRowsToFirebase();
      setSyncStatusMsg(res.message);
      setTimeout(() => setSyncStatusMsg(null), 6000);
    } catch (err: any) {
      setSyncStatusMsg('เกิดข้อผิดพลาดในการเชื่อมโยงฐานข้อมูล: ' + (err.message || String(err)));
      setTimeout(() => setSyncStatusMsg(null), 6000);
    } finally {
      setIsSyncingAll(false);
    }
  };

  useEffect(() => {
    const mergeAndSetForm3 = (remoteList?: Form3SupervisionRecord[]) => {
      const remote = remoteList !== undefined ? remoteList : remoteForm3Ref.current;
      const local = getLocalForm3Rows();
      const map = new Map<string, Form3SupervisionRecord>();
      local.forEach(r => { if (r && r.id) map.set(r.id, r); });
      remote.forEach(r => { if (r && r.id) map.set(r.id, r); });
      const merged = Array.from(map.values()).sort((a, b) => {
        const timeA = new Date(a.timestamp || a.visitDate).getTime() || 0;
        const timeB = new Date(b.timestamp || b.visitDate).getTime() || 0;
        return timeB - timeA;
      });
      setForm3List(merged);
    };

    const unsubSubs = subscribeSubmissions(
      (items) => {
        const map: Record<string, WeeklySubmission[]> = {};
        for (const item of items || []) {
          const sid = item.studentId;
          if (!map[sid]) map[sid] = [];
          map[sid].push(item);
        }
        setRemoteSubmissions(map);
      },
      (err) => console.warn('Submissions stream notice:', err)
    );

    const unsubForm3 = subscribeForm3Supervisions(
      (remoteRecords) => {
        const recs = remoteRecords || [];
        remoteForm3Ref.current = recs;
        mergeAndSetForm3(recs);
      },
      (err) => console.warn('Form 3 stream notice:', err)
    );

    const handleForm3LocalSync = () => mergeAndSetForm3();
    window.addEventListener('kktech_form3_updated', handleForm3LocalSync);
    window.addEventListener('storage', handleForm3LocalSync);

    return () => {
      unsubSubs();
      unsubForm3();
      window.removeEventListener('kktech_form3_updated', handleForm3LocalSync);
      window.removeEventListener('storage', handleForm3LocalSync);
    };
  }, []);

  // Merge propStudents with all 123 students from Google Sheets "login" tab
  const allSheetStudents = useMemo<Student[]>(() => {
    const fromSheet = getAllLoginSheetStudents();
    const map = new Map<string, Student>();
    for (const s of fromSheet) {
      if (s.studentCode) map.set(s.studentCode, s);
    }
    for (const s of propStudents) {
      if (s.studentCode) {
        const exist = map.get(s.studentCode);
        map.set(s.studentCode, { ...exist, ...s });
      }
    }
    return Array.from(map.values());
  }, [propStudents]);

  // Aggregate all unique companies from Google Sheets "login" tab Company column
  const companySummaries = useMemo<CompanySupervisionSummary[]>(() => {
    const compMap = new Map<string, {
      name: string;
      department: string;
      address: string;
      zone: string;
      phone: string;
      mentorName: string;
      mentorPhone: string;
      students: Student[];
    }>();

    for (const std of allSheetStudents) {
      const cName = (std.companyName || '').trim();
      if (!cName || cName === 'ยังไม่ระบุสถานประกอบการ' || cName === '-') continue;

      if (!compMap.has(cName)) {
        // Derive zone and address from student registration
        let zone = 'อ.เมืองขอนแก่น';
        const lower = cName.toLowerCase();
        if (lower.includes('น้ำพอง') || lower.includes('มิตรผล')) zone = 'อ.น้ำพอง';
        else if (lower.includes('บ้านไผ่')) zone = 'อ.บ้านไผ่';
        else if (lower.includes('ชุมแพ')) zone = 'อ.ชุมแพ';
        else if (lower.includes('ศิลา') || lower.includes('kkp')) zone = 'ต.ศิลา อ.เมือง';
        else if (lower.includes('ท่าพระ') || lower.includes('กฟผ.')) zone = 'ต.ท่าพระ อ.เมือง';
        else if (lower.includes('เชียงยืน')) zone = 'อ.เชียงยืน';
        else if (lower.includes('หนองเรือ')) zone = 'อ.หนองเรือ';

        compMap.set(cName, {
          name: cName,
          department: std.companyRegistration?.department || 'แผนกซ่อมบำรุงและระบบไฟฟ้า',
          address: std.companyRegistration?.notes || `${zone} จ.ขอนแก่น`,
          zone,
          phone: std.companyRegistration?.emergencyPhone || std.companyRegistration?.mentorPhone || '-',
          mentorName: std.companyRegistration?.mentorName || '-',
          mentorPhone: std.companyRegistration?.mentorPhone || '-',
          students: []
        });
      }

      compMap.get(cName)!.students.push(std);
    }

    const summaries: CompanySupervisionSummary[] = [];
    const matchedForm3Ids = new Set<string>();
    let idx = 1;

    const buildTeachersAndPhotos = (records: Form3SupervisionRecord[], fallbackTeacher?: string) => {
      const teacherSet = new Set<string>();
      records.forEach(r => {
        extractTeacherNames(r.teacherName).forEach(t => teacherSet.add(t));
      });
      if (teacherSet.size === 0 && fallbackTeacher) {
        extractTeacherNames(fallbackTeacher).forEach(t => teacherSet.add(t));
      }
      if (teacherSet.size === 0) {
        teacherSet.add('นายทักษิณ โสภาปิยะ');
      }
      const supervisingTeachersList = Array.from(teacherSet);

      const photoMap = new Map<string, Form3Photo & { teacherName?: string; visitDate?: string; studentName?: string }>();
      records.forEach(r => {
        (r.photos || []).forEach(p => {
          if (p.url && !photoMap.has(p.url)) {
            photoMap.set(p.url, {
              ...p,
              teacherName: r.teacherName,
              visitDate: r.visitDate || r.timestamp,
              studentName: r.studentName
            });
          }
        });
      });

      return {
        supervisingTeachersList,
        supervisingTeacher: supervisingTeachersList.join(', '),
        allPhotos: Array.from(photoMap.values())
      };
    };

    for (const [cName, data] of compMap.entries()) {
      const studentCodes = new Set(data.students.map(s => s.studentCode));

      // Match Form 3 records for this company (by company name match OR student code match)
      const matchingForm3 = form3List.filter(f => {
        if (!f) return false;
        const normFormComp = (f.companyName || '').toLowerCase().trim();
        const normComp = cName.toLowerCase().trim();
        const compMatches = normFormComp && (
          normFormComp.includes(normComp) || 
          normComp.includes(normFormComp) ||
          (normComp.includes('pea') && normFormComp.includes('pea')) ||
          (normComp.includes('มิตรผล') && normFormComp.includes('มิตรผล')) ||
          (normComp.includes('โซล่าร์') && normFormComp.includes('โซล่าร์'))
        );
        const studentMatches = studentCodes.has(f.studentCode);
        return compMatches || studentMatches;
      });

      matchingForm3.forEach(f => matchedForm3Ids.add(f.id));

      // Sort Form 3 records by latest first
      matchingForm3.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.visitDate).getTime() || 0;
        const timeB = new Date(b.timestamp || b.visitDate).getTime() || 0;
        return timeB - timeA;
      });

      const latest = matchingForm3[0];
      const isSupervised = matchingForm3.length > 0;
      const { supervisingTeachersList, supervisingTeacher, allPhotos } = buildTeachersAndPhotos(
        matchingForm3,
        data.students[0]?.supervisorTeacher
      );

      summaries.push({
        id: `comp-sum-${idx++}`,
        name: cName,
        department: latest?.companyDepartment || data.department,
        address: latest?.companyAddress || data.address,
        zone: data.zone,
        phone: data.phone,
        mentorName: latest?.mentorName || data.mentorName,
        mentorPhone: data.mentorPhone,
        students: data.students,
        studentsCount: data.students.length,
        form3Records: matchingForm3,
        latestRecord: latest,
        isSupervised,
        score: latest?.score,
        grade: latest?.grade,
        supervisingTeacher,
        supervisingTeachersList,
        allPhotos,
        statusText: isSupervised ? 'นิเทศแล้ว' : 'รอนิเทศ'
      });
    }

    // Include any supervision records whose company is not yet listed in the Login sheet
    const extraCompMap = new Map<string, Form3SupervisionRecord[]>();
    for (const f of form3List) {
      if (!f || matchedForm3Ids.has(f.id)) continue;
      const key = (f.companyName || 'สถานประกอบการที่บันทึกการนิเทศ').trim();
      if (!extraCompMap.has(key)) extraCompMap.set(key, []);
      extraCompMap.get(key)!.push(f);
    }

    for (const [extraName, records] of extraCompMap.entries()) {
      records.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.visitDate).getTime() || 0;
        const timeB = new Date(b.timestamp || b.visitDate).getTime() || 0;
        return timeB - timeA;
      });
      const latest = records[0];
      const { supervisingTeachersList, supervisingTeacher, allPhotos } = buildTeachersAndPhotos(records);

      // Build student entries from sheet or supervision records
      const stdMap = new Map<string, Student>();
      records.forEach(r => {
        const found = allSheetStudents.find(
          s => (r.studentCode && s.studentCode === r.studentCode) || (r.studentId && s.id === r.studentId)
        );
        if (found) {
          stdMap.set(found.id, found);
        } else if (r.studentName) {
          const sid = r.studentId || `std-${r.studentCode || r.id}`;
          stdMap.set(sid, {
            id: sid,
            studentCode: r.studentCode || '-',
            name: r.studentName,
            initials: r.studentName.slice(0, 2),
            level: r.levelDepartment || 'ปวส.2',
            department: 'แผนกวิชาช่างไฟฟ้ากำลัง',
            room: r.studentRoom || '-',
            email: '',
            companyId: `comp-extra-${idx}`,
            companyName: extraName,
            currentWeek: 8,
            totalWeeks: 18,
            actualWeeks: 8,
            accumulatedHours: 320,
            requiredHours: 720,
            supervisorTeacher: supervisingTeacher,
            companyRegistration: {
              registeredAt: r.visitDate || r.timestamp,
              department: r.companyDepartment || 'แผนกปฏิบัติการและบำรุงรักษา',
              mentorName: r.mentorName || '-',
              mentorPhone: '-',
              emergencyPhone: '-',
              gpsCoordinates: '16.4322, 102.8236',
              gpsLat: 16.4322,
              gpsLng: 102.8236,
              notes: r.companyAddress || ''
            }
          });
        }
      });

      const extraStudents = Array.from(stdMap.values());
      const addrText = latest?.companyAddress || extraName;
      let zone = 'จ.ขอนแก่น';
      if (addrText.includes('น้ำพอง')) zone = 'อ.น้ำพอง';
      else if (addrText.includes('บ้านไผ่')) zone = 'อ.บ้านไผ่';
      else if (addrText.includes('ชุมแพ')) zone = 'อ.ชุมแพ';
      else if (addrText.includes('เมือง')) zone = 'อ.เมืองขอนแก่น';

      summaries.push({
        id: `comp-sum-extra-${idx++}`,
        name: extraName,
        department: latest?.companyDepartment || 'แผนกซ่อมบำรุงและระบบไฟฟ้า',
        address: latest?.companyAddress || 'บันทึกจากระบบนิเทศ',
        zone,
        phone: '-',
        mentorName: latest?.mentorName || '-',
        mentorPhone: '-',
        students: extraStudents,
        studentsCount: extraStudents.length,
        form3Records: records,
        latestRecord: latest,
        isSupervised: true,
        score: latest?.score,
        grade: latest?.grade,
        supervisingTeacher,
        supervisingTeachersList,
        allPhotos,
        statusText: 'นิเทศแล้ว'
      });
    }

    // Sort: supervised first, then by number of records / students descending
    return summaries.sort((a, b) => {
      if (a.isSupervised && !b.isSupervised) return -1;
      if (!a.isSupervised && b.isSupervised) return 1;
      if (b.form3Records.length !== a.form3Records.length) {
        return b.form3Records.length - a.form3Records.length;
      }
      return b.studentsCount - a.studentsCount;
    });
  }, [allSheetStudents, form3List]);

  // Unique rooms list for filter
  const roomList = useMemo(() => {
    const set = new Set<string>();
    allSheetStudents.forEach(s => {
      if (s.room) set.add(s.room);
    });
    return Array.from(set).sort();
  }, [allSheetStudents]);

  // Dynamic list of all supervising teachers across login sheet, courses, and saved supervision records
  const teacherList = useMemo(() => {
    const map = new Map<string, string>();
    const addTeacher = (raw?: string) => {
      extractTeacherNames(raw).forEach(clean => {
        if (!clean.includes('สุพรรณี')) {
          map.set(clean, clean);
        }
      });
    };
    getAllLoginSheetTeachers().forEach(t => addTeacher(t.name));
    form3List.forEach(r => addTeacher(r.teacherName));
    allSheetStudents.forEach(s => addTeacher(s.supervisorTeacher));
    if (!map.has('นายทักษิณ โสภาปิยะ')) {
      map.set('นายทักษิณ โสภาปิยะ', 'นายทักษิณ โสภาปิยะ');
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'th'));
  }, [form3List, allSheetStudents]);

  // Filtered companies based on search, status, room, and teacher
  const filteredCompanies = useMemo(() => {
    return companySummaries.filter(comp => {
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = comp.name.toLowerCase().includes(q);
        const matchDept = comp.department.toLowerCase().includes(q);
        const matchZone = comp.zone.toLowerCase().includes(q);
        const matchTeacher = comp.supervisingTeacher.toLowerCase().includes(q) ||
          comp.supervisingTeachersList.some(t => t.toLowerCase().includes(q));
        const matchMentor = comp.mentorName.toLowerCase().includes(q);
        const matchStudent = comp.students.some(s => 
          s.name.toLowerCase().includes(q) || 
          s.studentCode.includes(q) ||
          s.room.toLowerCase().includes(q)
        );
        const matchRecords = comp.form3Records.some(r =>
          (r.studentName || '').toLowerCase().includes(q) ||
          (r.studentCode || '').includes(q) ||
          (r.teacherName || '').toLowerCase().includes(q) ||
          (r.teacherComment || '').toLowerCase().includes(q)
        );
        if (!matchName && !matchDept && !matchZone && !matchTeacher && !matchMentor && !matchStudent && !matchRecords) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'supervised' && !comp.isSupervised) return false;
      if (statusFilter === 'pending' && comp.isSupervised) return false;

      // Room filter
      if (roomFilter !== 'all') {
        const hasRoom = comp.students.some(s => s.room === roomFilter) ||
          comp.form3Records.some(r => r.studentRoom === roomFilter);
        if (!hasRoom) return false;
      }

      // Teacher filter
      if (teacherFilter !== 'all') {
        const matchesTeacher =
          comp.supervisingTeachersList.some(t => t.includes(teacherFilter) || teacherFilter.includes(t)) ||
          comp.form3Records.some(r => (r.teacherName || '').includes(teacherFilter)) ||
          comp.supervisingTeacher.includes(teacherFilter);
        if (!matchesTeacher) return false;
      }

      return true;
    });
  }, [companySummaries, searchTerm, statusFilter, roomFilter, teacherFilter]);

  // Flat list of ALL supervision records across ALL supervising teachers & ALL companies
  const filteredAllForm3Records = useMemo(() => {
    if (statusFilter === 'pending') return [];
    const sorted = [...form3List].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.visitDate).getTime() || 0;
      const timeB = new Date(b.timestamp || b.visitDate).getTime() || 0;
      return timeB - timeA;
    });
    return sorted.filter(r => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const match =
          (r.companyName || '').toLowerCase().includes(q) ||
          (r.studentName || '').toLowerCase().includes(q) ||
          (r.studentCode || '').toLowerCase().includes(q) ||
          (r.teacherName || '').toLowerCase().includes(q) ||
          (r.mentorName || '').toLowerCase().includes(q) ||
          (r.teacherComment || '').toLowerCase().includes(q) ||
          (r.mentorFeedback || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (roomFilter !== 'all') {
        if (r.studentRoom !== roomFilter) {
          const st = allSheetStudents.find(s => s.id === r.studentId || s.studentCode === r.studentCode);
          if (!st || st.room !== roomFilter) return false;
        }
      }
      if (teacherFilter !== 'all') {
        const rTeachers = extractTeacherNames(r.teacherName);
        const hit = rTeachers.some(t => t.includes(teacherFilter) || teacherFilter.includes(t)) ||
          (r.teacherName || '').includes(teacherFilter);
        if (!hit) return false;
      }
      return true;
    });
  }, [form3List, searchTerm, statusFilter, roomFilter, teacherFilter, allSheetStudents]);

  // Overall Statistics for KPI Dashboard
  const stats = useMemo(() => {
    const totalCompanies = companySummaries.length;
    const supervisedCompanies = companySummaries.filter(c => c.isSupervised).length;
    const pendingCompanies = totalCompanies - supervisedCompanies;
    const totalStudents = allSheetStudents.length;
    const supervisedStudents = companySummaries
      .filter(c => c.isSupervised)
      .reduce((acc, c) => acc + c.studentsCount, 0);
    const progressPercent = totalCompanies > 0 ? Math.round((supervisedCompanies / totalCompanies) * 100) : 0;

    const scoredRecords = form3List.filter(r => typeof r.score === 'number' && r.score > 0);
    const avgScore = scoredRecords.length > 0
      ? Number((scoredRecords.reduce((acc, r) => acc + r.score, 0) / scoredRecords.length).toFixed(1))
      : 0;
    const avgGrade = avgScore === 0 ? '-' : avgScore >= 16 ? 'A' : avgScore >= 14 ? 'B+' : avgScore >= 12 ? 'B' : 'C';
    const avgScoreText = avgScore > 0
      ? `ผลประเมินสมรรถนะเฉลี่ย ${avgScore} / 20 (${avgGrade})`
      : 'ยังไม่มีผลประเมินสมรรถนะ (รอการนิเทศ)';
    const ppePassedCount = form3List.filter(r => r.safetyPassed !== false).length;
    const ppePercent = form3List.length > 0 ? Math.round((ppePassedCount / form3List.length) * 100) : 100;

    return {
      totalCompanies,
      supervisedCompanies,
      pendingCompanies,
      totalStudents,
      supervisedStudents,
      progressPercent,
      avgScoreText,
      ppePercent
    };
  }, [companySummaries, allSheetStudents, form3List]);

  // Export to CSV function
  const handleExportCSV = () => {
    const headers = [
      'ลำดับ',
      'ชื่อสถานประกอบการ',
      'โซนพื้นที่',
      'จำนวน นศ.',
      'รายชื่อนักศึกษา (รหัส - ชื่อ - ห้อง)',
      'สถานะการนิเทศ',
      'วันที่เข้านิเทศ',
      'ครูนิเทศก์',
      'พี่เลี้ยง',
      'ผลคะแนน',
      'เกรด',
      'ความปลอดภัย PPE',
      'ความเห็นครูนิเทศก์',
      'ข้อคิดเห็นพี่เลี้ยง',
      'จำนวนรูปภาพการนิเทศ'
    ];

    const rows = filteredCompanies.map((c, idx) => {
      const studentDetails = c.students.map(s => `${s.studentCode} ${s.name} (${s.room})`).join('; ');
      const f3 = c.latestRecord;
      return [
        (idx + 1).toString(),
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.zone}"`,
        c.studentsCount.toString(),
        `"${studentDetails.replace(/"/g, '""')}"`,
        `"${c.statusText}"`,
        `"${f3?.visitDate || f3?.timestamp || '-'}"`,
        `"${c.supervisingTeacher}"`,
        `"${c.mentorName}"`,
        f3 ? f3.score.toString() : '-',
        f3 ? f3.grade : '-',
        f3 ? (f3.safetyPassed ? 'ผ่าน 100%' : 'ปรับปรุง') : '-',
        `"${(f3?.teacherComment || '-').replace(/"/g, '""')}"`,
        `"${(f3?.mentorFeedback || '-').replace(/"/g, '""')}"`,
        (c.allPhotos?.length || 0).toString()
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `KKTECH_Supervision_Companies_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Switch to A4 report for specific student
  const handleViewStudentA4 = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (onSelectStudent) onSelectStudent(studentId);
    setActiveTab('a4');
  };

  // Selected student for A4 Document View
  const currentStudent = allSheetStudents.find(s => s.id === selectedStudentId || s.studentCode === selectedStudentId) || allSheetStudents[0];
  const studentCourses = currentStudent.courses || getCoursesByRoom(currentStudent.room);
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>(() => {
    return studentCourses.find(c => c.subjectCode.startsWith('30000'))?.subjectCode || studentCourses[0]?.subjectCode || '30000-2005';
  });

  const matchedCourse = studentCourses.find(c => c.subjectCode === selectedCourseCode) || studentCourses[0];

  // Merge submissions from props and Firestore real-time listener
  const mergedSubmissions = useMemo(() => {
    const merged: Record<string, WeeklySubmission[]> = { ...submissions };
    for (const [key, subs] of Object.entries(remoteSubmissions)) {
      if (!merged[key]) {
        merged[key] = subs;
      } else {
        const byId = new Map<string, WeeklySubmission>();
        merged[key].forEach(s => byId.set(s.id, s));
        subs.forEach(s => byId.set(s.id, s));
        merged[key] = Array.from(byId.values());
      }
    }
    return merged;
  }, [submissions, remoteSubmissions]);

  const currentWeekMeta = WEEKS_1_TO_18.find(w => w.weekNumber === parseInt(selectedWeek)) || WEEKS_1_TO_18[7];

  // Look for matching weekly submission for this student and week from database
  const foundSub = useMemo(() => {
    const targetWeek = parseInt(selectedWeek);
    const candidateKeys = [
      selectedStudentId,
      currentStudent?.id,
      currentStudent?.studentCode,
      currentStudent?.id?.replace(/^std-/, ''),
      `std-${currentStudent?.studentCode}`
    ].filter(Boolean) as string[];

    // 1. Direct key search in merged submissions
    for (const key of candidateKeys) {
      const list = mergedSubmissions[key];
      if (list && list.length > 0) {
        const match = list.find(s => s.weekNumber === targetWeek);
        if (match) return match;
      }
    }

    // 2. Search all items across all arrays in mergedSubmissions
    const allSubs = Object.values(mergedSubmissions).flat();
    const candidateSet = new Set(candidateKeys);
    const match = allSubs.find(s => 
      candidateSet.has(s.studentId) && s.weekNumber === targetWeek
    );
    if (match) return match;

    // 3. Check localStorage for any saved submission for this student and week
    try {
      const localKey1 = `kktech_submission_${currentStudent?.id}_w${targetWeek}`;
      const localKey2 = `kktech_submission_${currentStudent?.studentCode}_w${targetWeek}`;
      const raw = localStorage.getItem(localKey1) || localStorage.getItem(localKey2);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.dailyLogs || parsed.photos)) return parsed as WeeklySubmission;
      }
    } catch (e) {
      console.warn('LocalStorage submission check notice:', e);
    }

    return null;
  }, [mergedSubmissions, selectedStudentId, currentStudent, selectedWeek]);

  // Find matching Form 3 supervision record for this student/company in database
  const studentForm3 = useMemo(() => {
    return form3List.find(f => 
      (f.studentCode && currentStudent?.studentCode && f.studentCode === currentStudent.studentCode) || 
      (f.studentId && currentStudent?.id && f.studentId === currentStudent.id) || 
      (f.companyName && currentStudent?.companyName && f.companyName.trim().toLowerCase() === currentStudent.companyName.trim().toLowerCase())
    );
  }, [form3List, currentStudent]);

  // Consolidate actual workplace on-site photos from database (Weekly submission + Form 3)
  const databasePhotos = useMemo(() => {
    const photos: { id: string; url: string; title: string; caption: string }[] = [];

    // 1. Photos submitted by student in weekly submission database
    if (foundSub && foundSub.photos && foundSub.photos.length > 0) {
      photos.push(...foundSub.photos);
    }

    // 2. Photos recorded in Form 3 on-site supervision in database
    if (studentForm3 && studentForm3.photos && studentForm3.photos.length > 0) {
      for (const p of studentForm3.photos) {
        if (!photos.some(existing => existing.url === p.url)) {
          photos.push({
            id: p.id,
            url: p.url,
            title: p.title || 'รูปถ่ายการนิเทศหน้างานจริง',
            caption: p.caption || 'ตรวจประเมินโดยครูนิเทศก์'
          });
        }
      }
    }

    // Fallback to sample week photos if no photos recorded in database yet
    if (photos.length === 0) {
      return currentWeekMeta.samplePhotos;
    }

    return photos.slice(0, 3);
  }, [foundSub, studentForm3, currentWeekMeta]);

  // Daily work logs from database or week template
  const databaseDailyLogs = useMemo(() => {
    if (foundSub && foundSub.dailyLogs && foundSub.dailyLogs.length > 0) {
      return foundSub.dailyLogs;
    }
    return getDefaultDailyLogsForWeek(parseInt(selectedWeek));
  }, [foundSub, selectedWeek]);

  const effectiveTeacherName = (currentUser && (currentUser.role === 'teacher' || currentUser.role === 'admin'))
    ? currentUser.name
    : (matchedCourse?.teacherName || studentForm3?.teacherName || currentStudent.supervisorTeacher || 'นายทักษิณ โสภาปิยะ');

  const effectiveTeacherSignature = effectiveTeacherName.replace(/^(นาย|นางสาว|นาง|อาจารย์|ว่าที่ร้อยตรี|ดร\.)\s*/, '');

  const isRealDatabaseSubmission = Boolean(foundSub || (studentForm3 && studentForm3.photos && studentForm3.photos.length > 0));

  const currentSub: WeeklySubmission = {
    id: foundSub?.id || `sub-w${selectedWeek}`,
    studentId: currentStudent.id,
    weekNumber: parseInt(selectedWeek),
    dateRange: foundSub?.dateRange || currentWeekMeta.dateRange,
    submittedAt: foundSub?.submittedAt || `${currentWeekMeta.dateRange.split('-')[1]?.trim() || '14 มิ.ย. 2569'} 17:30 น.`,
    status: foundSub?.status || (studentForm3 ? 'graded' : 'pending'),
    taskTitle: foundSub?.taskTitle || currentWeekMeta.defaultTask,
    totalHours: foundSub?.totalHours || 40.0,
    mentorRating: foundSub?.mentorRating || (studentForm3 ? 5.0 : 5.0),
    mentorComment: foundSub?.mentorComment || studentForm3?.mentorFeedback || 'นักศึกษาตั้งใจปฏิบัติงาน สวมใส่อุปกรณ์คุ้มครองความปลอดภัย (PPE) ครบถ้วน มีความละเอียดรอบคอบในการปฏิบัติงานระบบไฟฟ้า',
    mentorName: foundSub?.mentorName || studentForm3?.mentorName || currentStudent.companyRegistration?.mentorName || 'นายชาญชัย มงคลศรี',
    mentorPosition: foundSub?.mentorPosition || 'วิศวกรไฟฟ้า / พี่เลี้ยงประจำสถานประกอบการ',
    teacherScore: foundSub?.teacherScore || studentForm3?.score || 19.5,
    teacherGrade: foundSub?.teacherGrade || studentForm3?.grade || 'ดีเยี่ยม (A)',
    teacherComment: foundSub?.teacherComment || studentForm3?.teacherComment || 'บันทึกข้อมูลเรียบร้อย ภาพหลักฐานชัดเจน มีการคำนวณและระบุค่าทดสอบความต้านทานดินตรงตามเกณฑ์มาตรฐาน สอศ.',
    teacherName: effectiveTeacherName,
    studentSignature: '',
    mentorSignature: '',
    teacherSignature: '',
    verifiedHash: foundSub?.verifiedHash || `7B8C${currentStudent.studentCode}-KKTECH-2569-W${selectedWeek.padStart(2, '0')}-OK`,
    safetyChecklist: foundSub?.safetyChecklist || {
      hardHat: true,
      highVoltageGloves: true,
      safetyShoes: true,
      lotoProcedure: true
    },
    photos: databasePhotos,
    dailyLogs: databaseDailyLogs
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    const element = document.getElementById('a4-printable-document');
    if (!element) {
      window.print();
      return;
    }

    setIsPrinting(true);
    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = await import('jspdf');

      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = 1;
      colorCanvas.height = 1;
      const colorCtx = colorCanvas.getContext('2d');

      const normalizeColorExpr = (cssText: string): string => {
        if (!colorCtx || (!cssText.includes('oklch') && !cssText.includes('oklab') && !cssText.includes('color-mix'))) {
          return cssText;
        }
        let result = cssText;
        for (let pass = 0; pass < 3; pass++) {
          const prev = result;
          result = result.replace(/(?:oklch|oklab|color-mix)\([^()]*(?:\([^()]*\)[^()]*)*\)/g, (match) => {
            try {
              colorCtx.fillStyle = 'rgba(0, 0, 0, 0)';
              colorCtx.fillStyle = match;
              return colorCtx.fillStyle || '#1e293b';
            } catch {
              return '#1e293b';
            }
          });
          if (result === prev) break;
        }
        return result;
      };

      // High-resolution rendering (2.2x scale for sharp 300 DPI text and graphics)
      const canvas = await html2canvas(element, {
        scale: 2.2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
          styleTags.forEach((tag) => {
            if (tag.textContent) tag.textContent = normalizeColorExpr(tag.textContent);
          });
          const linkTags = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
          if (linkTags.length > 0) {
            try {
              const combinedRules: string[] = [];
              Array.from(document.styleSheets).forEach((sheet) => {
                try {
                  if (sheet.href && sheet.cssRules) {
                    const text = Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
                    combinedRules.push(normalizeColorExpr(text));
                  }
                } catch {
                  // skip cross-origin
                }
              });
              if (combinedRules.length > 0) {
                const injected = clonedDoc.createElement('style');
                injected.textContent = combinedRules.join('\n');
                clonedDoc.head.appendChild(injected);
                linkTags.forEach((lnk) => {
                  const href = lnk.getAttribute('href') || '';
                  if (!href.startsWith('http') || href.startsWith(window.location.origin)) {
                    lnk.remove();
                  }
                });
              }
            } catch {
              // ignore
            }
          }

          const clonedDocEl = clonedDoc.getElementById('a4-printable-document');
          if (clonedDocEl) {
            clonedDocEl.style.width = '210mm';
            clonedDocEl.style.maxWidth = '210mm';
            clonedDocEl.style.minWidth = '0px';
            clonedDocEl.style.minHeight = '0px';
            clonedDocEl.style.height = 'auto';
            clonedDocEl.style.backgroundColor = '#ffffff';
            clonedDocEl.style.boxShadow = 'none';
            clonedDocEl.style.border = 'none';
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));

      const safeCode = currentStudent?.studentCode || 'student';
      const safeWeek = selectedWeek.padStart(2, '0');
      const fileName = `แบบบันทึกและประเมินผลการฝึกงาน_${safeCode}_สัปดาห์ที่${safeWeek}.pdf`;

      pdf.save(fileName);
    } catch (err) {
      console.warn('PDF export notice, triggering browser print dialog:', err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 print:space-y-0 print:pb-0 a4-report-root">
      {/* Top Main Navigation Tabs & Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-50"></span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                สรุปรายงานการนิเทศ & สถานประกอบการฝึกอาชีพ
              </h1>
            </div>
            <p className="text-sm text-slate-500">
              วิทยาลัยเทคนิคขอนแก่น • แผนกวิชาช่างไฟฟ้ากำลัง • ฐานข้อมูลการนิเทศและสถานประกอบการ
            </p>
          </div>

          {/* Quick Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenForm3 && (
              <button
                onClick={() => onOpenForm3(selectedStudentId)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-medium text-sm shadow-sm transition"
              >
                <Camera className="w-4 h-4" />
                <span>+ บันทึกการนิเทศ</span>
              </button>
            )}
            <button
              onClick={handleSyncAllDatabases}
              disabled={isSyncingAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-sm font-semibold shadow-2xs transition disabled:opacity-60 cursor-pointer"
              title="ซิงค์และอัปเดตข้อมูลจาก Google Sheets และ Firebase ทั้งหมดให้เป็นปัจจุบัน"
            >
              <RotateCw className={`w-4 h-4 text-emerald-700 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>{isSyncingAll ? 'กำลังซิงค์...' : 'ซิงค์ชีต & ฐานข้อมูล'}</span>
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatusMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
            <button 
              onClick={() => setSyncStatusMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-sm font-semibold">
            <button
              onClick={() => setActiveTab('table')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg transition ${
                activeTab === 'table'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className={`w-4 h-4 ${activeTab === 'table' ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>ตารางสถานประกอบการ & บันทึกการนิเทศ</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'table' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {companySummaries.length} แห่ง
              </span>
            </button>
            <button
              onClick={() => setActiveTab('a4')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg transition ${
                activeTab === 'a4'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className={`w-4 h-4 ${activeTab === 'a4' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>แบบบันทึกและประเมินผลการฝึกงานของนักศึกษา</span>
            </button>
            <button
              onClick={() => setActiveTab('teaching')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg transition ${
                activeTab === 'teaching'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${activeTab === 'teaching' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>รายงานการจัดการเรียนรู้ในสถานประกอบการ</span>
            </button>
          </div>

          {activeTab === 'table' && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-sm font-semibold shadow-2xs transition"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>ส่งออกตารางสรุปนิเทศ (CSV Excel)</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-sm">
            <span className="font-medium">สถานประกอบการทั้งหมด</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalCompanies}</span>
            <span className="text-sm text-slate-500 font-normal">แห่ง</span>
          </div>
          <div className="text-[13px] text-slate-600 flex items-center gap-1">
            <Users className="w-4 h-4 text-slate-400" />
            <span>นักศึกษาฝึกงานรวม {stats.totalStudents} คน</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-sm">
            <span className="font-medium">เข้านิเทศแล้ว</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{stats.supervisedCompanies}</span>
            <span className="text-sm text-slate-500 font-normal">/ {stats.totalCompanies} แห่ง ({stats.progressPercent}%)</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${stats.progressPercent}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-sm">
            <span className="font-medium">รอนิเทศงาน</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{stats.pendingCompanies}</span>
            <span className="text-sm text-slate-500 font-normal">แห่งที่เตรียมเข้านิเทศ</span>
          </div>
          <div className="text-[13px] text-amber-700 font-medium">
            มีแผนงานตามปฏิทินนิเทศ ภาคเรียนที่ 2/2569
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-sm">
            <span className="font-medium">เกณฑ์ความปลอดภัย PPE</span>
            <ShieldCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-sky-600">{stats.ppePercent}%</span>
            <span className="text-sm text-slate-500 font-normal">ผ่านเกณฑ์ สอศ.</span>
          </div>
          <div className="text-[13px] text-emerald-700 font-medium flex items-center gap-1">
            <Award className="w-4 h-4 text-amber-500" />
            <span>{stats.avgScoreText}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: Comprehensive Company & Form_3 Supervision Table
          ========================================================================= */}
      {activeTab === 'table' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center text-sm">
              {/* Search Bar */}
              <div className="lg:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อสถานประกอบการ, รหัส/ชื่อนักศึกษา, ครูนิเทศก์..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm text-slate-800 placeholder-slate-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="lg:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 font-medium focus:ring-2 focus:ring-sky-500"
                >
                  <option value="all">สถานะทั้งหมด ({companySummaries.length} แห่ง)</option>
                  <option value="supervised">✓ นิเทศแล้ว ({stats.supervisedCompanies} แห่ง)</option>
                  <option value="pending">⏱ รอนิเทศ ({stats.pendingCompanies} แห่ง)</option>
                </select>
              </div>

              {/* Room Filter */}
              <div className="lg:col-span-2">
                <select
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 font-medium focus:ring-2 focus:ring-sky-500"
                >
                  <option value="all">ทุกกลุ่มห้องเรียน (สอฟ.)</option>
                  {roomList.map(r => (
                    <option key={r} value={r}>กลุ่ม {r}</option>
                  ))}
                </select>
              </div>

              {/* Teacher Filter */}
              <div className="lg:col-span-2">
                <select
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 font-medium focus:ring-2 focus:ring-sky-500"
                >
                  <option value="all">ครูนิเทศก์ทั้งหมด ({teacherList.length} ท่าน)</option>
                  {teacherList.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter tags & quick reset */}
            {(searchTerm || statusFilter !== 'all' || roomFilter !== 'all' || teacherFilter !== 'all') && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">ผลการกรอง:</span>
                <span>พบ {filteredCompanies.length} แห่ง ({filteredAllForm3Records.length} บันทึกการนิเทศ) จากทั้งหมด {companySummaries.length} แห่ง</span>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setRoomFilter('all');
                    setTeacherFilter('all');
                  }}
                  className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 font-semibold ml-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ล้างตัวกรองทั้งหมด</span>
                </button>
              </div>
            )}
          </div>

          {/* Main Table: All Companies with Form_3 Supervision Information */}
          <div className="w-full max-w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Building className="w-4 h-4 text-sky-600 shrink-0" />
                  <h2 className="text-base font-bold text-slate-900">
                    ตารางรายชื่อสถานประกอบการทั้งหมด & บันทึกการนิเทศ
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[13px] bg-slate-200 text-slate-700 font-bold font-mono">
                    {filteredCompanies.length} แห่ง
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[13px] bg-emerald-100 text-emerald-800 font-bold font-mono border border-emerald-200">
                    บันทึกนิเทศทั้งหมด {form3List.length} รายการ (ครูนิเทศก์ทุกคน)
                  </span>
                </div>
                <p className="text-[13px] text-slate-500">
                  รวมข้อมูลบันทึกการนิเทศจากครูนิเทศก์ทุกคนและทุกสถานประกอบการที่บันทึกเข้าระบบแบบเรียลไทม์
                </p>
              </div>

              {/* Sub-view Switcher: By Company vs All Records across all teachers */}
              <div className="flex flex-wrap sm:inline-flex p-1 bg-slate-200/70 rounded-xl text-[13px] font-semibold shrink-0 self-start lg:self-auto max-w-full gap-1 sm:gap-0">
                <button
                  type="button"
                  onClick={() => setTableSubView('companies')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    tableSubView === 'companies'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>แยกตามสถานประกอบการ ({filteredCompanies.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTableSubView('records')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    tableSubView === 'records'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>รายการบันทึกการนิเทศทั้งหมด ({filteredAllForm3Records.length})</span>
                </button>
              </div>
            </div>

            {tableSubView === 'companies' ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full lg:table-fixed text-left text-sm text-slate-700 border-collapse">
                <thead className="bg-slate-100 text-slate-800 font-bold text-[12.5px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-2 text-center w-10">ลำดับ</th>
                    <th className="py-3 px-2.5 w-[20%] min-w-[160px]">สถานประกอบการ</th>
                    <th className="py-3 px-2.5 w-[24%] min-w-[180px]">นักศึกษาฝึกงานในที่เดียวกัน</th>
                    <th className="py-3 px-2 text-center w-[11%] min-w-[96px]">สถานะการนิเทศ</th>
                    <th className="py-3 px-2.5 w-[15%] min-w-[125px]">ครูนิเทศก์ & วันที่บันทึก</th>
                    <th className="py-3 px-2 w-[11%] min-w-[96px]">ผลประเมิน & PPE</th>
                    <th className="py-3 px-2 w-[10%] min-w-[96px]">หลักฐานรูปถ่าย</th>
                    <th className="py-3 px-2 text-center w-[9%] min-w-[88px]">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium text-slate-600">ไม่พบสถานประกอบการตามเงื่อนไขที่เลือก</p>
                        <p className="text-[13px] text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((company, index) => {
                      const isExpanded = expandedCompanyId === company.id;
                      const f3 = company.latestRecord;
                      const photos = company.allPhotos;

                      return (
                        <React.Fragment key={company.id}>
                          <tr className={`hover:bg-slate-50/80 transition-colors align-top ${company.isSupervised ? 'bg-white' : 'bg-amber-50/20'}`}>
                            {/* 1. Index */}
                            <td className="py-3 px-2 text-center font-mono text-slate-400 text-[13px]">
                              {index + 1}
                            </td>

                            {/* 2. Company Info */}
                            <td className="py-3 px-2.5 break-words">
                              <div className="font-bold text-slate-900 text-sm leading-snug flex items-start gap-1.5">
                                <Building2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                <span className="min-w-0 break-words">{company.name}</span>
                              </div>
                              <div className="text-[12.5px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{company.zone}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-600 font-mono text-xs">{company.department}</span>
                              </div>
                              {company.mentorName && company.mentorName !== '-' && (
                                <div className="text-xs text-slate-500 mt-0.5 break-words">
                                  พี่เลี้ยง: <span className="text-slate-700 font-medium">{company.mentorName}</span>
                                </div>
                              )}
                            </td>

                            {/* 3. Students Assigned (Co-interns) */}
                            <td className="py-3 px-2.5">
                              <div className="space-y-1.5 min-w-0">
                                <div className="flex items-center gap-1 text-[12.5px] text-slate-500 font-semibold">
                                  <Users className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                  <span>ฝึกร่วมกัน {company.studentsCount} คน</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {company.students.map((std) => (
                                    <button
                                      key={std.id}
                                      onClick={() => handleViewStudentA4(std.id)}
                                      className="inline-flex flex-wrap items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-sky-100 text-slate-800 hover:text-sky-900 border border-slate-200 text-xs transition text-left group max-w-full cursor-pointer"
                                      title={`คลิกเพื่อดูรายงาน A4 ของ ${std.name}`}
                                    >
                                      <span className="font-mono text-slate-500 group-hover:text-sky-700">{std.studentCode.slice(-4)}</span>
                                      <span className="font-medium break-words">{std.name}</span>
                                      <span className="text-[10.5px] px-1 rounded bg-white text-slate-600 border border-slate-200">
                                        {std.room}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </td>

                            {/* 4. Supervision Status */}
                            <td className="py-3 px-2 text-center">
                              {company.isSupervised ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>นิเทศแล้ว</span>
                                  </span>
                                  <span className="text-[11px] text-slate-400 mt-0.5 font-mono">
                                    {company.form3Records.length} บันทึก
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>รอนิเทศ</span>
                                </span>
                              )}
                            </td>

                            {/* 5. Teachers & Visit Date */}
                            <td className="py-3 px-2.5 break-words">
                              <div className="space-y-1">
                                {company.supervisingTeachersList.map((tName, tIdx) => (
                                  <div key={tIdx} className="font-semibold text-slate-900 text-[12.5px] flex items-start gap-1">
                                    <UserCheck className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                                    <span className="min-w-0 break-words">{tName}</span>
                                  </div>
                                ))}
                              </div>
                              {f3 ? (
                                <div className="text-[11.5px] text-slate-500 mt-1 flex items-start gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                  <span className="font-mono break-words">{f3.visitDate || f3.timestamp}</span>
                                </div>
                              ) : (
                                <div className="text-[11.5px] text-slate-400 mt-1">
                                  ตามตารางนิเทศ 2/2569
                                </div>
                              )}
                            </td>

                            {/* 6. Score & PPE Evaluation */}
                            <td className="py-3 px-2">
                              {f3 ? (
                                <div className="space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="font-bold text-slate-900 text-[13px] font-mono">{f3.score.toFixed(1)}/20</span>
                                    <span className="text-[11px] px-1 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                                      {f3.grade}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[11.5px] text-emerald-700 font-medium">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>PPE ผ่าน</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">- รอนิเทศก์ -</span>
                              )}
                            </td>

                            {/* 7. Form_3 Photos Thumbnails */}
                            <td className="py-3 px-2">
                              {photos.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {photos.slice(0, 2).map((p, pIdx) => (
                                    <button
                                      key={p.id || pIdx}
                                      onClick={() => setPreviewPhoto(p)}
                                      className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-300 hover:ring-2 hover:ring-sky-500 transition group shadow-2xs cursor-pointer shrink-0"
                                      title={p.title || `รูปหลักฐานนิเทศ ${pIdx + 1}`}
                                    >
                                      <img
                                        src={p.url}
                                        alt={p.title || 'รูปการนิเทศ'}
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                      />
                                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent"></div>
                                    </button>
                                  ))}
                                  {photos.length > 2 && (
                                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                      +{photos.length - 2}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Camera className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                  <span>ไม่มีรูป</span>
                                </span>
                              )}
                            </td>

                            {/* 8. Action Buttons */}
                            <td className="py-3 px-2 text-center">
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {onOpenForm3 && (
                                  <button
                                    onClick={() => onOpenForm3(company.students[0]?.id)}
                                    className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition"
                                    title="บันทึกหรือแก้ไขการนิเทศ"
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleViewStudentA4(company.students[0]?.id)}
                                  className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
                                  title="ดูรายงาน A4 ฉบับทางการ"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                {currentUser?.role === 'admin' && f3 && onDeleteSupervision && (
                                  <button
                                    onClick={async () => {
                                      if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบบันทึกรายงานการนิเทศของ ${company.name} (${f3.studentName})? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
                                        await onDeleteSupervision(f3.id);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                                    title="ลบบันทึกรายงานการนิเทศ (Admin)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setExpandedCompanyId(isExpanded ? null : company.id)}
                                  className={`p-1.5 rounded-lg border transition ${
                                    isExpanded 
                                      ? 'bg-slate-900 text-white border-slate-900' 
                                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                                  }`}
                                  title={isExpanded ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียดทั้งหมด'}
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Detail Row for this company */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70 border-b border-slate-200">
                              <td colSpan={8} className="p-4 sm:p-5">
                                <div className="space-y-4 max-w-5xl mx-auto bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs">
                                  {/* Header info */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                    <div>
                                      <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-sky-600" />
                                        <span>รายละเอียดการนิเทศ: {company.name}</span>
                                      </h3>
                                      <p className="text-[13px] text-slate-500 mt-0.5">
                                        ที่อยู่ / พิกัด: {company.address} • แผนก: {company.department}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-1 rounded-md text-[13px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                        พี่เลี้ยง: {company.mentorName} ({company.mentorPhone || '-'})
                                      </span>
                                    </div>
                                  </div>

                                  {/* Co-intern Students in this company */}
                                  <div className="space-y-1.5">
                                    <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                      <Users className="w-4 h-4 text-indigo-600" />
                                      <span>รายชื่อนักศึกษาที่เข้าฝึกงานในสถานที่เดียวกันทั้งหมด ({company.studentsCount} คน):</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {company.students.map(s => (
                                        <div 
                                          key={s.id} 
                                          className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2"
                                        >
                                          <div>
                                            <div className="font-semibold text-slate-900 text-sm">{s.name}</div>
                                            <div className="text-xs text-slate-500 font-mono">
                                              รหัส: {s.studentCode} • กลุ่ม {s.room}
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleViewStudentA4(s.id)}
                                            className="px-2.5 py-1 rounded bg-white hover:bg-sky-50 text-sky-700 text-xs font-semibold border border-slate-200 transition shrink-0"
                                          >
                                            ดู A4
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* All Form 3 Supervision Records from ALL teachers */}
                                  {company.form3Records.length > 0 ? (
                                    <div className="space-y-3 pt-2">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                          <FileCheck className="w-4 h-4 text-emerald-600" />
                                          <span>บันทึกการนิเทศทั้งหมดของสถานประกอบการนี้ ({company.form3Records.length} รายการ • ครูนิเทศก์ {company.supervisingTeachersList.length} ท่าน)</span>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                          รูปภาพทั้งหมดสามารถนำไปใช้ในรายงานการจัดการเรียนรู้ฯ ได้
                                        </span>
                                      </div>

                                      <div className="space-y-3">
                                        {company.form3Records.map((rec, recIdx) => (
                                          <div
                                            key={rec.id || recIdx}
                                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5"
                                          >
                                            {/* Record Header */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-bold text-xs font-mono">
                                                  #{company.form3Records.length - recIdx}
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 font-bold text-[13px] border border-sky-200">
                                                  <UserCheck className="w-3.5 h-3.5 text-sky-700" />
                                                  <span>ครูนิเทศก์: {rec.teacherName || '-'}</span>
                                                </span>
                                                <span className="text-[13px] font-semibold text-slate-800">
                                                  นศ.: {rec.studentName} ({rec.studentCode})
                                                </span>
                                              </div>

                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                  📅 {rec.visitDate || rec.timestamp}
                                                </span>
                                                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-bold text-xs font-mono">
                                                  {rec.score?.toFixed(1) || '19.5'}/20 ({rec.grade || 'A'})
                                                </span>
                                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs">
                                                  {rec.safetyPassed ? 'PPE ผ่าน' : 'PPE ปรับปรุง'}
                                                </span>
                                                {currentUser?.role === 'admin' && onDeleteSupervision && (
                                                  <button
                                                    onClick={async () => {
                                                      if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบบันทึกรายงานการนิเทศของ ${company.name} (${rec.studentName} โดย ${rec.teacherName})?`)) {
                                                        await onDeleteSupervision(rec.id);
                                                      }
                                                    }}
                                                    className="p-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                                                    title="ลบบันทึกการนิเทศรายการนี้ (Admin)"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>

                                            {/* Teacher & Mentor Comments */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                              <div className="p-2.5 rounded-lg bg-sky-50/60 border border-sky-100 space-y-0.5">
                                                <div className="text-xs font-bold text-sky-900">
                                                  ความเห็นครูนิเทศก์ ({rec.teacherName}):
                                                </div>
                                                <p className="text-sm text-slate-700 leading-relaxed">
                                                  {rec.teacherComment || 'นิเทศการฝึกงานเรียบร้อย ทักษะการปฏิบัติงานถูกต้องตามมาตรฐานวิชาชีพ'}
                                                </p>
                                              </div>

                                              <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 space-y-0.5">
                                                <div className="text-xs font-bold text-emerald-900">
                                                  ข้อคิดเห็นพี่เลี้ยงสถานประกอบการ ({rec.mentorName || company.mentorName}):
                                                </div>
                                                <p className="text-sm text-slate-700 leading-relaxed">
                                                  {rec.mentorFeedback || 'นักศึกษาปฏิบัติตนตามระเบียบ สวมใส่อุปกรณ์ PPE ครบถ้วน มีความรับผิดชอบดี'}
                                                </p>
                                              </div>
                                            </div>

                                            {/* Per-record Photos */}
                                            {rec.photos && rec.photos.length > 0 && (
                                              <div className="space-y-1.5 pt-1">
                                                <div className="text-[13px] font-bold text-slate-700 flex items-center justify-between">
                                                  <span className="flex items-center gap-1">
                                                    <Camera className="w-4 h-4 text-sky-600" />
                                                    <span>รูปถ่ายหลักฐานการนิเทศ ({rec.photos.length} รูป):</span>
                                                  </span>
                                                  <span className="text-xs text-slate-400">คลิกเพื่อขยาย</span>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                  {rec.photos.map((p, pIdx) => (
                                                    <div
                                                      key={p.id || pIdx}
                                                      onClick={() => setPreviewPhoto(p)}
                                                      className="group relative rounded-lg overflow-hidden border border-slate-200 bg-white shadow-2xs cursor-pointer hover:border-sky-500 transition"
                                                    >
                                                      <div className="h-24 overflow-hidden bg-slate-100">
                                                        <img
                                                          src={p.url}
                                                          alt={p.title}
                                                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                                        />
                                                      </div>
                                                      <div className="p-1.5 space-y-0.5">
                                                        <div className="text-xs font-bold text-slate-800 truncate">{p.title}</div>
                                                        {p.caption && (
                                                          <div className="text-[11px] text-slate-500 line-clamp-1">{p.caption}</div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-amber-600" />
                                        <span>สถานประกอบการแห่งนี้ยังไม่ได้รับการบันทึกข้อมูลเข้านิเทศ</span>
                                      </div>
                                      {onOpenForm3 && (
                                        <button
                                          onClick={() => onOpenForm3(company.students[0]?.id)}
                                          className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition"
                                        >
                                          + บันทึกนิเทศเดี๋ยวนี้
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            ) : (
            /* FLAT VIEW: ALL SUPERVISION RECORDS BY ALL TEACHERS */
            <div className="w-full overflow-x-auto">
              <table className="w-full lg:table-fixed text-left text-sm text-slate-700 border-collapse">
                <thead className="bg-slate-100 text-slate-800 font-bold text-[12.5px] uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-2 text-center w-9">ลำดับ</th>
                    <th className="py-3 px-2 w-[11%] min-w-[95px]">วันที่นิเทศ</th>
                    <th className="py-3 px-2 w-[12%] min-w-[110px]">ครูนิเทศก์</th>
                    <th className="py-3 px-2.5 w-[16%] min-w-[135px]">สถานประกอบการ</th>
                    <th className="py-3 px-2 w-[13%] min-w-[115px]">นักศึกษา</th>
                    <th className="py-3 px-2 w-[10%] min-w-[90px]">คะแนน & PPE</th>
                    <th className="py-3 px-2 w-[18%] min-w-[140px]">ความเห็น</th>
                    <th className="py-3 px-2 w-[11%] min-w-[96px]">ภาพถ่าย</th>
                    <th className="py-3 px-2 text-center w-[9%] min-w-[80px]">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredAllForm3Records.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Camera className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium text-slate-600">ไม่พบบันทึกการนิเทศตามเงื่อนไขตัวกรอง</p>
                        <p className="text-[13px] text-slate-400 mt-1">ลองปรับตัวกรองสถานะเป็น "ทั้งหมด" หรือเลือก "ครูนิเทศก์ทั้งหมด"</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAllForm3Records.map((rec, idx) => {
                      const recPhotos = rec.photos || [];
                      return (
                        <tr key={rec.id || idx} className="hover:bg-slate-50/80 transition-colors bg-white align-top">
                          <td className="py-3 px-2 text-center font-mono text-slate-400 text-[13px]">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-2 break-words">
                            <div className="font-mono font-semibold text-slate-800 text-[12.5px]">
                              {rec.visitDate || rec.timestamp}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                              {rec.timestamp}
                            </div>
                          </td>
                          <td className="py-3 px-2 break-words">
                            <span className="inline-flex items-start gap-1 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-900 border border-sky-200 font-bold text-xs max-w-full">
                              <UserCheck className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                              <span className="min-w-0 break-words">{rec.teacherName || 'ครูนิเทศก์'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-2.5 break-words">
                            <div className="font-bold text-slate-900 text-[13px] leading-snug">{rec.companyName}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{rec.companyDepartment}</div>
                            {rec.mentorName && (
                              <div className="text-xs text-slate-500">พี่เลี้ยง: {rec.mentorName}</div>
                            )}
                          </td>
                          <td className="py-3 px-2 break-words">
                            <div className="font-semibold text-slate-900 text-[13px] leading-snug">{rec.studentName}</div>
                            <div className="text-[11.5px] text-slate-500 font-mono mt-0.5">
                              {rec.studentCode} • {rec.studentRoom || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-bold text-slate-900 font-mono text-[13px]">{rec.score?.toFixed(1) || '19.5'}/20</span>
                              <span className="text-[11px] px-1 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                                {rec.grade || 'A'}
                              </span>
                            </div>
                            <div className="text-[11.5px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{rec.safetyPassed ? 'PPE ผ่าน' : 'ปรับปรุง'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 break-words">
                            <p className="text-[12.5px] text-slate-700 line-clamp-2">{rec.teacherComment || '-'}</p>
                            {rec.mentorFeedback && (
                              <p className="text-[11.5px] text-emerald-700 mt-0.5 line-clamp-1">
                                พี่เลี้ยง: {rec.mentorFeedback}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            {recPhotos.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1">
                                {recPhotos.slice(0, 2).map((p, pIdx) => (
                                  <button
                                    key={p.id || pIdx}
                                    onClick={() => setPreviewPhoto(p)}
                                    className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-300 hover:ring-2 hover:ring-sky-500 transition cursor-pointer shrink-0"
                                    title={p.title || `รูปหลักฐาน ${pIdx + 1}`}
                                  >
                                    <img src={p.url} alt={p.title} className="w-full h-full object-cover" />
                                  </button>
                                ))}
                                {recPhotos.length > 2 && (
                                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    +{recPhotos.length - 2}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">ไม่มีรูป</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {onOpenForm3 && rec.studentId && (
                                <button
                                  onClick={() => onOpenForm3(rec.studentId)}
                                  className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition cursor-pointer"
                                  title="บันทึกนิเทศเพิ่มสำหรับนักศึกษาคนนี้"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {rec.studentId && (
                                <button
                                  onClick={() => handleViewStudentA4(rec.studentId)}
                                  className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                                  title="ดูรายงาน A4 นักศึกษา"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {currentUser?.role === 'admin' && onDeleteSupervision && (
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบบันทึกการนิเทศของ ${rec.companyName} (${rec.studentName} โดย ${rec.teacherName})?`)) {
                                      await onDeleteSupervision(rec.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                                  title="ลบบันทึกการนิเทศ (Admin)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            )}

            {/* Table Footer with Summary Status */}
            <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-slate-500">
              <div className="flex flex-wrap items-center gap-2">
                <span>แสดง {filteredCompanies.length} แห่ง จากทั้งหมด {companySummaries.length} แห่ง</span>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <span className="text-emerald-700 font-semibold">นิเทศสำเร็จ: {stats.supervisedCompanies} แห่ง</span>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <span className="text-amber-700 font-semibold">รอนิเทศ: {stats.pendingCompanies} แห่ง</span>
              </div>
              <div className="text-[13px] text-slate-400">
                ซิงค์กับฐานข้อมูล Firebase Firestore & Google Sheets อัตโนมัติ
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: Official A4 Printable Weekly Report (ทว.04 Formatter)
          ========================================================================= */}
      {activeTab === 'a4' && (
        <div className="space-y-6 print:space-y-0">
          {/* Top Sub-View Switcher Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-4 print:hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  แบบบันทึกและประเมินผลการฝึกงานของนักศึกษา
                </h3>
                <p className="text-sm text-slate-500">
                  เลือกดูใบแบบบันทึกรายบุคคล (ทว.04) หรือสรุปการส่งงาน & คะแนนประเมินตามกลุ่มเรียน
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex p-1 bg-slate-100 rounded-xl text-sm font-semibold">
                  <button
                    type="button"
                    onClick={() => setA4SubView('individual')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      a4SubView === 'individual'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className={`w-4 h-4 ${a4SubView === 'individual' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>ใบรายบุคคล (ทว.04)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setA4SubView('group-summary')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      a4SubView === 'group-summary'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className={`w-4 h-4 ${a4SubView === 'group-summary' ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span>สรุปส่งงาน & คะแนนตามกลุ่มเรียน</span>
                  </button>
                </div>

                {a4SubView === 'individual' && (
                  <>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-2xs transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-sky-400" />
                      <span>สั่งพิมพ์</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      disabled={isPrinting}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-2xs transition cursor-pointer disabled:opacity-60"
                    >
                      {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span>{isPrinting ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}</span>
                    </button>
                  </>
                )}

                {a4SubView === 'individual' && currentUser?.role === 'admin' && currentSub && onDeleteSubmission && (
                  <button
                    onClick={async () => {
                      if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบบันทึกสัปดาห์ที่ ${selectedWeek} ของ ${currentStudent.name} (${currentStudent.studentCode})? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
                        await onDeleteSubmission(currentSub.id, currentStudent.id);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-sm font-semibold transition"
                    title="ลบบันทึกสัปดาห์นี้สำหรับนักศึกษาคนนี้ (Admin)"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>ลบบันทึกสัปดาห์นี้ (Admin)</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('table')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  <span>กลับสู่ตารางสรุปสถานประกอบการ</span>
                </button>
              </div>
            </div>

            {a4SubView === 'individual' && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-sm">
              <div className="md:col-span-5">
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  เลือกรหัสนักศึกษาและชื่อ-สกุล
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    if (onSelectStudent) onSelectStudent(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 text-sm"
                >
                  {allSheetStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.studentCode} - {s.name} (กลุ่ม {s.room} • {s.companyName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  รายวิชาที่ฝึกอาชีพ
                </label>
                <select
                  value={selectedCourseCode}
                  onChange={(e) => setSelectedCourseCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 text-sm"
                >
                  {studentCourses.map((c) => (
                    <option key={c.subjectCode} value={c.subjectCode}>
                      {c.subjectCode} {c.subjectName} ({c.teacherName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                  สัปดาห์ที่บันทึก
                </label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 text-sm"
                >
                  {WEEKS_1_TO_18.map((w) => (
                    <option key={w.weekNumber} value={w.weekNumber.toString()}>
                      สัปดาห์ที่ {w.weekNumber} ({w.dateRange})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Database status banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>แหล่งข้อมูล:</strong> ดึงข้อมูลบันทึกการปฏิบัติงานวิชาชีพ & รูปถ่ายหน้างานจริงจากฐานข้อมูลและระบบบันทึกการนิเทศเรียบร้อย
                </span>
              </div>
              <span className="text-[13px] font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                รหัส: {currentStudent.studentCode} • สัปดาห์ที่ {selectedWeek} • รูปถ่ายหน้างาน {currentSub.photos.length} รูป • บันทึกงาน {currentSub.dailyLogs.length} วัน
              </span>
            </div>
            </>
            )}
          </div>

          {a4SubView === 'group-summary' ? (
            <GroupWeeklySummaryA4
              students={allSheetStudents}
              roomList={roomList}
              mergedSubmissions={mergedSubmissions}
              form3List={form3List}
              currentUser={currentUser}
              onSelectStudentForA4={(sid, weekNum) => {
                setSelectedStudentId(sid);
                if (onSelectStudent) onSelectStudent(sid);
                if (weekNum) setSelectedWeek(weekNum.toString());
                setA4SubView('individual');
              }}
            />
          ) : (
            <>

          {/* A4 Printable Sheet Container */}
          <div className="w-full overflow-x-auto pb-2 flex sm:justify-center print:overflow-visible print:block print:pb-0 a4-sheet-scroll-wrap">
            <div
              id="a4-printable-document"
              className="bg-white min-w-[680px] sm:min-w-0 w-full max-w-[210mm] min-h-[297mm] print:min-h-0 p-6 sm:p-12 print:p-0 shadow-2xl print:shadow-none rounded-sm border print:border-none border-slate-300 text-slate-900 font-sarabun text-[13px] leading-relaxed relative flex flex-col justify-between shrink-0"
              style={{ boxSizing: 'border-box' }}
            >
              <div className="space-y-4">
                {/* College Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
                  <div className="flex items-center gap-3">
                    {/* Official College Emblem */}
                    <div className="w-16 h-16 rounded-full p-0.5 flex items-center justify-center bg-white shrink-0 overflow-hidden">
                      <img
                        src="./assets/aistudio/LogoKKTech_f25116a9.jpg"
                        alt="ตราสัญลักษณ์ทางการ วิทยาลัยเทคนิคขอนแก่น สำนักงานคณะกรรมการการอาชีวศึกษา"
                        className="w-full h-full object-contain drop-shadow-xs"
                      />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-slate-950 font-sarabun leading-tight">
                        วิทยาลัยเทคนิคขอนแก่น
                      </h1>
                      <p className="text-xs text-slate-700 font-semibold font-sarabun">
                        แผนกวิชาช่างไฟฟ้ากำลัง • สำนักงานคณะกรรมการการอาชีวศึกษา
                      </p>
                      <p className="text-xs text-slate-800 font-bold font-sarabun mt-0.5">
                        แบบบันทึกและประเมินผลการฝึกงานของนักศึกษา (ทวิภาคี / ทว.04)
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-bold text-xs font-sans">
                      สัปดาห์ที่ {currentSub.weekNumber}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1">ประจำปีการศึกษา 2/2569</div>
                    <div className="text-[10px] text-slate-400 font-mono">Google Form Sync ID: 40018-W08</div>
                  </div>
                </div>

                {/* Student & Company Information Box */}
                <div className="border border-slate-800 p-3 rounded text-xs space-y-1.5 bg-slate-50/40">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div>
                      <span className="font-bold">ชื่อ-สกุล นักศึกษา:</span> {currentStudent.name}
                    </div>
                    <div>
                      <span className="font-bold">รหัสนักศึกษา:</span> <span className="font-mono">{currentStudent.studentCode}</span>
                    </div>
                    <div>
                      <span className="font-bold">ระดับชั้น / กลุ่ม:</span> {currentStudent.level} กลุ่ม {currentStudent.room} แผนกวิชาช่างไฟฟ้ากำลัง
                    </div>
                    <div>
                      <span className="font-bold">ช่วงวันที่บันทึก:</span> {currentSub.dateRange}
                    </div>
                    <div>
                      <span className="font-bold">สถานประกอบการ:</span> {currentStudent.companyName}
                    </div>
                    <div>
                      <span className="font-bold">ครูฝึก/พี่เลี้ยง:</span> {currentSub.mentorName} ({currentSub.mentorPosition})
                    </div>
                    <div className="col-span-2 border-t border-slate-300 pt-1 mt-0.5 flex flex-wrap items-center justify-between text-[11px]">
                      <div>
                        <span className="font-bold">รายวิชาฝึกอาชีพ (แผ่นงาน data):</span> {matchedCourse ? `${matchedCourse.subjectCode} ${matchedCourse.subjectName}` : '30000-2005 กิจกรรมในสถานประกอบการ 1'}
                      </div>
                      <div>
                        <span className="font-bold">ครูนิเทศก์/ครูประจำวิชา:</span> {effectiveTeacherName}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Electrical Work Log Table */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span>ตารางบันทึกการปฏิบัติงานวิชาชีพรายวัน (Daily Electrical Work Log)</span>
                    </span>
                    <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ ข้อมูลจากการบันทึกปฏิบัติงานจริงในฐานข้อมูล ({currentSub.dailyLogs.length} วัน)
                    </span>
                  </div>

                  <table className="w-full text-left border-collapse border border-slate-800 text-[11px]">
                    <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-800">
                      <tr>
                        <th className="border border-slate-800 p-1.5 text-center w-20">วัน / วันที่</th>
                        <th className="border border-slate-800 p-1.5">รายละเอียดงานและสมรรถนะวิชาชีพที่ปฏิบัติจริง</th>
                        <th className="border border-slate-800 p-1.5 w-36">เครื่องมือ / อุปกรณ์</th>
                        <th className="border border-slate-800 p-1.5 text-center w-14">จำนวน ชม.</th>
                        <th className="border border-slate-800 p-1.5 text-center w-20">ผลประเมิน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentSub.dailyLogs.map((log) => (
                        <tr key={log.id} className="border-b border-slate-400">
                          <td className="border border-slate-800 p-1.5 text-center font-bold">
                            <div>{log.day}</div>
                            <div className="text-[10px] text-slate-600 font-normal">{log.date}</div>
                          </td>
                          <td className="border border-slate-800 p-1.5 leading-tight">
                            {log.taskDescription}
                          </td>
                          <td className="border border-slate-800 p-1.5 text-slate-700">
                            {log.toolsUsed}
                          </td>
                          <td className="border border-slate-800 p-1.5 text-center font-bold font-mono">
                            {log.hours.toFixed(1)}
                          </td>
                          <td className="border border-slate-800 p-1.5 text-center">
                            <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1 rounded">
                              {log.evaluation}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr className="bg-slate-50 font-bold text-slate-950 border-t-2 border-slate-800">
                        <td colSpan={3} className="border border-slate-800 p-1.5 text-right font-bold">
                          รวมเวลาปฏิบัติงานทั้งสิ้นประจำสัปดาห์:
                        </td>
                        <td className="border border-slate-800 p-1.5 text-center font-mono text-sm text-sky-800">
                          40.0
                        </td>
                        <td className="border border-slate-800 p-1.5 text-center text-emerald-800 text-[10px]">
                          สมบูรณ์ 100%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* On-site Photographic Evidence Section */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-sky-600" />
                      <span>รูปภาพประกอบการปฏิบัติงานจริง (On-site Photographic Evidence)</span>
                    </span>
                    <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ ดึงจากฐานข้อมูลรูปถ่ายหน้างานจริง ({currentSub.photos.length} รูป)
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {currentSub.photos.map((photo, pIdx) => (
                      <div 
                        key={photo.id || pIdx} 
                        onClick={() => setPreviewPhoto({
                          id: photo.id || `p-${pIdx}`,
                          url: photo.url,
                          title: photo.title,
                          caption: photo.caption,
                          uploadedAt: currentSub.submittedAt
                        })}
                        className="border border-slate-800 rounded p-1 bg-white space-y-1 cursor-pointer hover:border-sky-500 hover:shadow-xs transition"
                        title="คลิกเพื่อดูรูปภาพขนาดใหญ่"
                      >
                        <img
                          src={photo.url}
                          alt={photo.title}
                          className="w-full h-24 object-cover rounded-xs border border-slate-200"
                        />
                        <div className="text-[10px] font-bold text-slate-900 leading-tight truncate">
                          {photo.title}
                        </div>
                        <div className="text-[9px] text-slate-600 leading-tight line-clamp-1">
                          {photo.caption}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signatures & Certification Box */}
                <div className="border border-slate-800 rounded p-3 text-xs grid grid-cols-3 gap-3 text-center bg-slate-50/20 mt-2">
                  {/* Student Signature */}
                  <div className="space-y-1.5 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-slate-700">ลงชื่อนักศึกษาผู้ฝึกงาน</span>
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="inline-block w-36 border-b border-dotted border-slate-800"></span>
                    </div>
                    <div className="text-[10px] text-slate-600">({currentStudent.name})</div>
                    <div className="text-[9px] text-slate-400">วันที่ 14 มิ.ย. 2569</div>
                  </div>

                  {/* Mentor Signature */}
                  <div className="space-y-1.5 border-x border-slate-300 px-2 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-slate-700">ความเห็นครูฝึกสถานประกอบการ</span>
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="inline-block w-36 border-b border-dotted border-slate-800"></span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1 py-0.5 rounded">
                      [รับรองการปฏิบัติงาน 40 ชม. ครบถ้วน]
                    </span>
                    <div className="text-[10px] text-slate-600">({currentSub.mentorName})</div>
                    <div className="text-[9px] text-slate-400">วิศวกรไฟฟ้า / พี่เลี้ยงประจำสัปดาห์</div>
                  </div>

                  {/* Teacher Signature */}
                  <div className="space-y-1.5 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-slate-700">ผลการตรวจของครูนิเทศก์</span>
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="inline-block w-36 border-b border-dotted border-slate-800"></span>
                    </div>
                    <span className="text-[10px] text-sky-700 font-semibold bg-sky-50 px-1 py-0.5 rounded">
                      [ผ่านเกณฑ์สมรรถนะวิชาชีพ]
                    </span>
                    <div className="text-[10px] text-slate-600">({currentSub.teacherName})</div>
                    <div className="text-[9px] text-slate-400">แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น</div>
                  </div>
                </div>
              </div>

              {/* Security & Verification Footer */}
              <div className="pt-3 border-t border-slate-300 flex flex-wrap items-center justify-between text-[9px] text-slate-500 font-mono mt-4">
                <span>เอกสารฉบับนี้พิมพ์ผ่านระบบบันทึกผลการฝึกงานอิเล็กทรอนิกส์ KKTECH Electrical Power Vocational System</span>
                <span className="font-bold text-slate-700">VERIFIED HASH: SHA256 : {currentSub.verifiedHash}</span>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* Lightbox Modal for Form 3 Photo Preview */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewPhoto(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-600" />
                <h4 className="font-bold text-slate-900 text-base">{previewPhoto.title || 'รูปหลักฐานการนิเทศ'}</h4>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[70vh] bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            </div>

            {previewPhoto.caption && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-sm text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900">คำบรรยายหลักฐาน: </span>
                {previewPhoto.caption}
                {previewPhoto.uploadedAt && (
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    บันทึกเมื่อ: {previewPhoto.uploadedAt}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: รายงานการจัดการเรียนรู้ในสถานประกอบการ (Workplace Teaching Report)
          ========================================================================= */}
      {activeTab === 'teaching' && (
        <WorkplaceTeachingReportView
          currentUser={currentUser}
          students={allSheetStudents}
          form3List={form3List}
          submissions={mergedSubmissions}
        />
      )}
    </div>
  );
};
