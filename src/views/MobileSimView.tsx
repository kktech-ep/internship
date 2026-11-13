import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  ExternalLink, 
  Clock, 
  ArrowRight, 
  Printer, 
  FileText, 
  Upload, 
  Camera, 
  Calendar, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Eye, 
  Smartphone, 
  HelpCircle, 
  Image as ImageIcon,
  Award,
  Bell,
  User,
  Users,
  Navigation,
  Search,
  BarChart3,
  Home,
  GraduationCap,
  Send,
  History,
  FileSpreadsheet,
  AlertTriangle,
  Star,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FileCheck,
  Sparkles,
  Maximize2,
  Building2,
  Compass,
  Route,
  School,
  Filter,
  BookOpen,
  UserCheck
} from 'lucide-react';
import { Student, Company, WeeklySubmission, Form3SupervisionRecord, Form3Photo, AuthUser, CourseDataRow, SheetTeacher } from '../types';
import { StudentAvatar } from '../components/StudentAvatar';
import { subscribeForm3Supervisions } from '../services/firestoreService';
import { getLocalForm3Rows } from '../services/googleSheetsService';
import {
  getAllLoginSheetStudents,
  getAllLoginSheetTeachers,
  normalizeTeacherKey,
  getInitialsFromName
} from '../services/sheetAuthService';
import {
  fetchDataSheetCourses,
  getCachedCourses,
  getCoursesByTeacher,
  getRoomsByTeacher
} from '../services/courseDataService';
import { getCurrentWeekInfo } from '../data/weeksData';

interface MobileSimViewProps {
  currentRole: 'student' | 'teacher';
  onChangeRole: (role: 'student' | 'teacher') => void;
  currentUser?: AuthUser | null;
  student: Student;
  students?: Student[];
  companies: Company[];
  submissions: Record<string, WeeklySubmission[]>;
  onOpenForm1: () => void;
  onOpenForm2: () => void;
  onOpenForm3: (studentId?: string) => void;
  onNavigateA4: (studentId?: string) => void;
  onOpenSheetsModal: () => void;
  onOpenLookerModal: () => void;
  onNavigateGuide?: () => void;
}

export interface MobileCompanyItem {
  id: string;
  name: string;
  address: string;
  zone: string;
  distanceKm: number;
  sector: 'pea' | 'solar' | 'factory' | 'service';
  sectorLabel: string;
  contactPerson: string;
  phone: string;
  lat: number;
  lng: number;
  mapX: number;
  mapY: number;
  students: Student[];
  studentsCount: number;
  form3Records: Form3SupervisionRecord[];
  latestRecord?: Form3SupervisionRecord;
  supervisingTeachers?: string[];
  allPhotos?: Form3Photo[];
  isSupervised: boolean;
  statusText: string;
  jobScope: string;
}

// Coordinate mapping helper for districts in Khon Kaen & neighboring areas on SVG map (650x550)
function getSvgCoordinates(compName: string, index: number): { x: number; y: number; lat: number; lng: number; zone: string } {
  const lower = compName.toLowerCase();
  
  if (lower.includes('เชียงยืน')) {
    return { x: 490, y: 280, lat: 16.4021, lng: 103.1022, zone: 'อ.เชียงยืน' };
  }
  if (lower.includes('บ้านฝาง')) {
    return { x: 240, y: 280, lat: 16.4522, lng: 102.6321, zone: 'อ.บ้านฝาง' };
  }
  if (lower.includes('ท่าคันโท')) {
    return { x: 490, y: 120, lat: 16.9211, lng: 103.2422, zone: 'อ.ท่าคันโท' };
  }
  if (lower.includes('น้ำหนาว')) {
    return { x: 80, y: 160, lat: 16.7821, lng: 101.7222, zone: 'อ.น้ำหนาว' };
  }
  if (lower.includes('บ้านไผ่')) {
    return { x: 360, y: 460, lat: 16.0592, lng: 102.7301, zone: 'อ.บ้านไผ่' };
  }
  if (lower.includes('ภูเขียว')) {
    return { x: 110, y: 230, lat: 16.3721, lng: 102.1322, zone: 'อ.ภูเขียว' };
  }
  if (lower.includes('หนองเรือ')) {
    return { x: 190, y: 280, lat: 16.4921, lng: 102.4822, zone: 'อ.หนองเรือ' };
  }
  if (lower.includes('น้ำพอง') || lower.includes('มิตรผล')) {
    return { x: 370, y: 130, lat: 16.7112, lng: 102.8711, zone: 'อ.น้ำพอง' };
  }
  if (lower.includes('ชุมแพ')) {
    return { x: 130, y: 290, lat: 16.5411, lng: 102.1011, zone: 'อ.ชุมแพ' };
  }
  if (lower.includes('พระยืน')) {
    return { x: 290, y: 390, lat: 16.3121, lng: 102.6512, zone: 'อ.พระยืน' };
  }
  if (lower.includes('อุบลรัตน์')) {
    return { x: 250, y: 170, lat: 16.7511, lng: 102.6211, zone: 'อ.อุบลรัตน์' };
  }
  if (lower.includes('กระนวน')) {
    return { x: 480, y: 180, lat: 16.7021, lng: 103.0782, zone: 'อ.กระนวน' };
  }
  if (lower.includes('เขาสวนกวาง')) {
    return { x: 390, y: 90, lat: 16.8521, lng: 102.8611, zone: 'อ.เขาสวนกวาง' };
  }
  if (lower.includes('พล') || lower.includes('เมืองพล')) {
    return { x: 330, y: 510, lat: 15.8121, lng: 102.5922, zone: 'อ.เมืองพล' };
  }
  
  // Default: Amphoe Mueang Khon Kaen around center
  const radius = 28 + (index % 5) * 16;
  const angle = (index * 47) % 360;
  const rad = (angle * Math.PI) / 180;
  const x = Math.round(340 + radius * Math.cos(rad));
  const y = Math.round(280 + radius * Math.sin(rad));
  
  return {
    x,
    y,
    lat: 16.4322 + (radius / 1800) * Math.sin(rad),
    lng: 102.8236 + (radius / 1800) * Math.cos(rad),
    zone: 'อ.เมืองขอนแก่น'
  };
}

export const MobileSimView: React.FC<MobileSimViewProps> = ({
  currentRole,
  onChangeRole,
  currentUser,
  student,
  students = [],
  companies,
  submissions,
  onOpenForm1,
  onOpenForm2,
  onOpenForm3,
  onNavigateA4,
  onOpenSheetsModal,
  onOpenLookerModal,
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'student' | 'form' | 'history' | 'help'>('home');
  const [studentSectionTab, setStudentSectionTab] = useState<'submissions' | 'supervision'>('submissions');
  const [teacherSubTab, setTeacherSubTab] = useState<'map' | 'companies' | 'schedule'>('schedule');
  const [selectedSubmission, setSelectedSubmission] = useState<WeeklySubmission | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Form3Photo | null>(null);
  const [supervisions, setSupervisions] = useState<Form3SupervisionRecord[]>(() => getLocalForm3Rows());
  const [courseRows, setCourseRows] = useState<CourseDataRow[]>(() => getCachedCourses());
  
  // Teacher-specific state
  const [teacherScope, setTeacherScope] = useState<'mine' | 'all'>('mine');
  const [teacherAvatarUrl, setTeacherAvatarUrl] = useState<string | null>(null);
  const [selectedTeacherCompanyId, setSelectedTeacherCompanyId] = useState<string | null>(null);
  const [companySearchTerm, setCompanySearchTerm] = useState<string>('');
  const [companyFilterStatus, setCompanyFilterStatus] = useState<'all' | 'supervised' | 'pending'>('all');
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [mapFilter, setMapFilter] = useState<'all' | 'supervised' | 'pending'>('all');

  const remoteSupervisionsRef = useRef<Form3SupervisionRecord[]>([]);

  // Fetch course sheet rows ("data" tab) so teacher rooms/subjects stay up to date
  useEffect(() => {
    fetchDataSheetCourses().then(rows => {
      if (rows && rows.length > 0) setCourseRows(rows);
    });
  }, []);

  // Subscribe to real-time supervision records + local updates
  useEffect(() => {
    const mergeAndSet = (remoteList?: Form3SupervisionRecord[]) => {
      const remote = remoteList !== undefined ? remoteList : remoteSupervisionsRef.current;
      const local = getLocalForm3Rows();
      const map = new Map<string, Form3SupervisionRecord>();
      local.forEach(r => { if (r && r.id) map.set(r.id, r); });
      remote.forEach(r => { if (r && r.id) map.set(r.id, r); });
      const merged = Array.from(map.values()).sort((a, b) => {
        const tA = new Date(a.timestamp || a.visitDate).getTime() || 0;
        const tB = new Date(b.timestamp || b.visitDate).getTime() || 0;
        return tB - tA;
      });
      setSupervisions(merged);
    };

    mergeAndSet();

    const unsub = subscribeForm3Supervisions(
      (remoteRecords) => {
        const recs = remoteRecords || [];
        remoteSupervisionsRef.current = recs;
        mergeAndSet(recs);
      },
      (err) => console.warn('Form3 supervision stream in MobileSimView notice:', err)
    );

    const handleLocalUpdate = () => mergeAndSet();
    window.addEventListener('kktech_form3_updated', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    return () => {
      unsub();
      window.removeEventListener('kktech_form3_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    };
  }, []);

  // Merge propStudents with all 123 students from Google Sheets "login" tab
  const allSheetStudents = useMemo<Student[]>(() => {
    const fromSheet = getAllLoginSheetStudents();
    const map = new Map<string, Student>();
    for (const s of fromSheet) {
      if (s.studentCode) map.set(s.studentCode, s);
    }
    if (students && students.length > 0) {
      for (const s of students) {
        if (s.studentCode) {
          const exist = map.get(s.studentCode);
          map.set(s.studentCode, { ...exist, ...s });
        }
      }
    }
    return Array.from(map.values());
  }, [students]);

  // Build complete list of distinct companies referencing Google Sheets "login" tab
  const sheetCompanies = useMemo<MobileCompanyItem[]>(() => {
    const compGroups = new Map<string, {
      name: string;
      students: Student[];
      firstStudent: Student;
    }>();

    for (const std of allSheetStudents) {
      const cName = (std.companyName || '').trim();
      if (!cName || cName === 'ยังไม่ระบุสถานประกอบการ' || cName === '-') continue;

      if (!compGroups.has(cName)) {
        compGroups.set(cName, {
          name: cName,
          students: [],
          firstStudent: std
        });
      }
      compGroups.get(cName)!.students.push(std);
    }

    const items: MobileCompanyItem[] = [];
    const matchedForm3Ids = new Set<string>();
    let idx = 1;

    const extractTeachersAndPhotos = (records: Form3SupervisionRecord[], fallbackTeacher?: string) => {
      const tSet = new Set<string>();
      records.forEach(r => {
        (r.teacherName || '').split(/[,/]+/).forEach(t => {
          const clean = t.trim();
          if (clean && clean !== '-') tSet.add(clean);
        });
      });
      if (tSet.size === 0 && fallbackTeacher) {
        tSet.add(fallbackTeacher);
      }
      const pMap = new Map<string, Form3Photo>();
      records.forEach(r => {
        (r.photos || []).forEach(p => {
          if (p.url && !pMap.has(p.url)) pMap.set(p.url, p);
        });
      });
      return {
        supervisingTeachers: Array.from(tSet),
        allPhotos: Array.from(pMap.values())
      };
    };

    for (const [name, group] of compGroups.entries()) {
      const compId = `comp-${idx++}`;
      const firstStd = group.firstStudent;
      const reg = firstStd.companyRegistration;
      const coords = getSvgCoordinates(name, idx);

      let sector: 'pea' | 'solar' | 'factory' | 'service' = 'service';
      let sectorLabel = 'ระบบไฟฟ้าและบริการทั่วไป';
      if (name.includes('การไฟฟ้า') || name.includes('กฟภ') || name.includes('กฟผ') || name.includes('PEA') || name.includes('EGAT')) {
        sector = 'pea';
        sectorLabel = 'สถานีไฟฟ้า & สายส่ง PEA';
      } else if (name.includes('โซล่าร์') || name.includes('Solar') || name.includes('พลังงาน')) {
        sector = 'solar';
        sectorLabel = 'ระบบ Solar Rooftop';
      } else if (name.includes('อุตสาหกรรม') || name.includes('ผลิต') || name.includes('มิตซูบิชิ') || name.includes('คูโบต้า') || name.includes('ไทยเพาเวอร์') || name.includes('PLC')) {
        sector = 'factory';
        sectorLabel = 'โรงงานอุตสาหกรรม & ตู้ MDB';
      }

      // Match Form 3 supervision records for this company or its students
      const matchedForm3 = supervisions.filter(f => {
        if (!f) return false;
        const matchName = f.companyName && (
          f.companyName.toLowerCase().includes(name.toLowerCase()) || 
          name.toLowerCase().includes(f.companyName.toLowerCase()) ||
          (name.includes('การไฟฟ้าส่วนภูมิภาค') && f.companyName.includes('การไฟฟ้าส่วนภูมิภาค'))
        );
        const matchStudent = group.students.some(s => 
          (s.studentCode && f.studentCode && s.studentCode === f.studentCode) || 
          s.id === f.studentId || 
          (s.name && f.studentName && s.name === f.studentName)
        );
        return matchName || matchStudent;
      });

      matchedForm3.forEach(f => matchedForm3Ids.add(f.id));
      matchedForm3.sort((a, b) => {
        const tA = new Date(a.timestamp || a.visitDate).getTime() || 0;
        const tB = new Date(b.timestamp || b.visitDate).getTime() || 0;
        return tB - tA;
      });

      const isSupervised = matchedForm3.length > 0;
      const latestRecord = matchedForm3.length > 0 ? matchedForm3[0] : undefined;
      const { supervisingTeachers, allPhotos } = extractTeachersAndPhotos(matchedForm3, firstStd.supervisorTeacher);

      items.push({
        id: compId,
        name,
        address: `${coords.zone} จ.ขอนแก่น`,
        zone: coords.zone,
        distanceKm: Math.round(((coords.lat - 16.4322) ** 2 + (coords.lng - 102.8236) ** 2) * 5000) / 10 + 3.5,
        sector,
        sectorLabel,
        contactPerson: latestRecord?.mentorName || reg?.mentorName || 'วิศวกรผู้ควบคุมงาน / พี่เลี้ยงสถานประกอบการ',
        phone: reg?.emergencyPhone || reg?.mentorPhone || '043-221-xxx',
        lat: reg?.gpsLat || coords.lat,
        lng: reg?.gpsLng || coords.lng,
        mapX: coords.x,
        mapY: coords.y,
        students: group.students,
        studentsCount: group.students.length,
        form3Records: matchedForm3,
        latestRecord,
        supervisingTeachers,
        allPhotos,
        isSupervised,
        statusText: isSupervised ? 'นิเทศแล้ว' : 'รอนิเทศ',
        jobScope: latestRecord?.companyDepartment || reg?.department || 'งานติดตั้ง บำรุงรักษา และควบคุมระบบไฟฟ้ากำลัง'
      });
    }

    // Append any supervised workplaces recorded in Form 3 that are not yet listed in Login sheet
    const extraGroups = new Map<string, Form3SupervisionRecord[]>();
    supervisions.forEach(f => {
      if (!f || matchedForm3Ids.has(f.id)) return;
      const key = (f.companyName || 'สถานประกอบการ (บันทึกการนิเทศ)').trim();
      if (!extraGroups.has(key)) extraGroups.set(key, []);
      extraGroups.get(key)!.push(f);
    });

    for (const [extraName, recs] of extraGroups.entries()) {
      recs.sort((a, b) => {
        const tA = new Date(a.timestamp || a.visitDate).getTime() || 0;
        const tB = new Date(b.timestamp || b.visitDate).getTime() || 0;
        return tB - tA;
      });
      const latest = recs[0];
      const coords = getSvgCoordinates(extraName, idx++);
      const { supervisingTeachers, allPhotos } = extractTeachersAndPhotos(recs);
      const extraStudents: Student[] = recs.map((r, rIdx) => {
        const found = allSheetStudents.find(
          s => (r.studentCode && s.studentCode === r.studentCode) || (r.studentId && s.id === r.studentId)
        );
        if (found) return found;
        return {
          id: r.studentId || `std-extra-${rIdx}`,
          studentCode: r.studentCode || '-',
          name: r.studentName || 'นักศึกษาฝึกงาน',
          initials: (r.studentName || 'นศ').slice(0, 2),
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
          supervisorTeacher: supervisingTeachers.join(', ') || 'ครูนิเทศก์',
          companyRegistration: {
            registeredAt: r.visitDate || r.timestamp,
            department: r.companyDepartment || '-',
            mentorName: r.mentorName || '-',
            mentorPhone: '-',
            emergencyPhone: '-',
            gpsCoordinates: '16.4322, 102.8236',
            gpsLat: 16.4322,
            gpsLng: 102.8236,
            notes: r.companyAddress || ''
          }
        };
      });

      items.push({
        id: `comp-extra-${idx}`,
        name: extraName,
        address: latest?.companyAddress || `${coords.zone} จ.ขอนแก่น`,
        zone: coords.zone,
        distanceKm: Math.round(((coords.lat - 16.4322) ** 2 + (coords.lng - 102.8236) ** 2) * 5000) / 10 + 3.5,
        sector: 'service',
        sectorLabel: 'ระบบไฟฟ้าและบริการทั่วไป',
        contactPerson: latest?.mentorName || 'พี่เลี้ยงสถานประกอบการ',
        phone: '-',
        lat: coords.lat,
        lng: coords.lng,
        mapX: coords.x,
        mapY: coords.y,
        students: extraStudents,
        studentsCount: extraStudents.length,
        form3Records: recs,
        latestRecord: latest,
        supervisingTeachers,
        allPhotos,
        isSupervised: true,
        statusText: 'นิเทศแล้ว',
        jobScope: latest?.companyDepartment || 'งานติดตั้ง บำรุงรักษา และควบคุมระบบไฟฟ้ากำลัง'
      });
    }

    // Default sort: supervised first or by students count
    return items.sort((a, b) => {
      if (a.isSupervised && !b.isSupervised) return -1;
      if (!a.isSupervised && b.isSupervised) return 1;
      if (b.form3Records.length !== a.form3Records.length) {
        return b.form3Records.length - a.form3Records.length;
      }
      return b.studentsCount - a.studentsCount;
    });
  }, [allSheetStudents, supervisions]);

  // Resolve active teacher profile strictly from logged-in user (or student's assigned supervisor when simulating)
  const activeTeacherProfile = useMemo(() => {
    const allTeachers: SheetTeacher[] = getAllLoginSheetTeachers();

    const findMatchedTeacher = (targetName?: string, targetEmail?: string): SheetTeacher | undefined => {
      const cleanEmail = (targetEmail || '').trim().toLowerCase();
      const emailPrefix = cleanEmail.split('@')[0];
      const normTarget = normalizeTeacherKey(targetName || '');

      return allTeachers.find(t => {
        const tEmail = (t.email || '').trim().toLowerCase();
        const tUser = (t.user || '').trim().toLowerCase();
        const tPrefix = tEmail.split('@')[0];
        if (cleanEmail && (tEmail === cleanEmail || tUser === cleanEmail || (emailPrefix && tPrefix === emailPrefix))) {
          return true;
        }
        if (normTarget) {
          const normT = normalizeTeacherKey(t.name);
          if (normT && (normT === normTarget || normT.includes(normTarget) || normTarget.includes(normT))) {
            return true;
          }
        }
        return false;
      });
    };

    const isStaffUser = Boolean(currentUser && currentUser.role !== 'student');
    const matched = isStaffUser
      ? findMatchedTeacher(currentUser?.name, currentUser?.email)
      : findMatchedTeacher(student.supervisorTeacher) || allTeachers[0];

    const name = isStaffUser
      ? (currentUser?.name || matched?.name || 'ครูนิเทศก์')
      : (matched?.name || student.supervisorTeacher || 'ครูนิเทศก์');
    const email = isStaffUser
      ? (currentUser?.email || matched?.email || '')
      : (matched?.email || '');
    const initials = (isStaffUser && currentUser?.initials) ? currentUser.initials : getInitialsFromName(name);
    const status = matched?.status || (
      currentUser?.role === 'admin'
        ? 'ครูนิเทศก์ / ผู้ดูแลระบบ (Admin)'
        : 'ครูประจำวิชา / ครูนิเทศก์'
    );
    const department = (isStaffUser && currentUser?.department)
      ? currentUser.department
      : (matched?.department || 'แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น');
    const phone = matched?.phone || '';

    const teacherCourses = getCoursesByTeacher(name, courseRows);
    const roomsFromCourses = getRoomsByTeacher(name, courseRows);
    const rooms = Array.from(new Set([...roomsFromCourses, ...(matched?.rooms || [])].filter(Boolean)));
    const subjects = teacherCourses.length > 0
      ? Array.from(new Set(teacherCourses.map(c => `${c.subjectCode} ${c.subjectName}`)))
      : (matched?.subjects || []);

    return {
      name,
      email,
      initials,
      status,
      department,
      phone,
      rooms,
      courses: teacherCourses,
      subjects,
      isSimulatedFromStudent: !isStaffUser
    };
  }, [currentUser, student.supervisorTeacher, courseRows]);

  // Sync teacher avatar from localStorage using the logged-in teacher's email
  useEffect(() => {
    const loadAvatar = () => {
      if (typeof localStorage === 'undefined' || !activeTeacherProfile.email) {
        setTeacherAvatarUrl(null);
        return;
      }
      const saved = localStorage.getItem(`kktech_teacher_avatar_${activeTeacherProfile.email}`);
      setTeacherAvatarUrl(saved || null);
    };
    loadAvatar();
    window.addEventListener('storage', loadAvatar);
    return () => window.removeEventListener('storage', loadAvatar);
  }, [activeTeacherProfile.email]);

  // Reset scope and selection when switching logged-in teacher account
  useEffect(() => {
    setTeacherScope('mine');
    setSelectedTeacherCompanyId(null);
    setExpandedCompanyId(null);
  }, [activeTeacherProfile.email, activeTeacherProfile.name]);

  const teacherNormalizedKey = useMemo(
    () => normalizeTeacherKey(activeTeacherProfile.name),
    [activeTeacherProfile.name]
  );

  const teacherRoomSet = useMemo(
    () => new Set(activeTeacherProfile.rooms.map(r => r.trim().toLowerCase()).filter(Boolean)),
    [activeTeacherProfile.rooms]
  );

  const isNameMatchTeacher = (candidateName?: string) => {
    if (!candidateName || !teacherNormalizedKey) return false;
    return candidateName
      .split(/[,/]+/)
      .map(part => normalizeTeacherKey(part))
      .some(k => k && (k === teacherNormalizedKey || k.includes(teacherNormalizedKey) || teacherNormalizedKey.includes(k)));
  };

  // Students under the active teacher's supervision or assigned rooms
  const myStudents = useMemo(() => {
    return allSheetStudents.filter(std => {
      if (isNameMatchTeacher(std.supervisorTeacher)) return true;
      const roomClean = (std.room || '').trim().toLowerCase();
      if (roomClean && teacherRoomSet.has(roomClean)) return true;
      return false;
    });
  }, [allSheetStudents, teacherNormalizedKey, teacherRoomSet]);

  // Supervision records recorded by the active teacher
  const mySupervisions = useMemo(() => {
    return supervisions.filter(rec => rec && isNameMatchTeacher(rec.teacherName));
  }, [supervisions, teacherNormalizedKey]);

  // Companies under the active teacher's responsibility
  const myCompanies = useMemo(() => {
    const myStudentKeySet = new Set(
      myStudents.flatMap(s => [s.id, s.studentCode, s.name].filter(Boolean))
    );
    return sheetCompanies.filter(comp => {
      const hasMyStudent = comp.students.some(
        s => myStudentKeySet.has(s.id) || myStudentKeySet.has(s.studentCode) || myStudentKeySet.has(s.name)
      );
      const hasMySupervision =
        comp.form3Records.some(r => isNameMatchTeacher(r.teacherName)) ||
        (comp.supervisingTeachers || []).some(t => isNameMatchTeacher(t));
      return hasMyStudent || hasMySupervision;
    });
  }, [sheetCompanies, myStudents, teacherNormalizedKey]);

  const scopedStudents = useMemo(() => {
    return teacherScope === 'mine' ? myStudents : allSheetStudents;
  }, [teacherScope, myStudents, allSheetStudents]);

  const scopedCompanies = useMemo(() => {
    return teacherScope === 'mine' ? myCompanies : sheetCompanies;
  }, [teacherScope, myCompanies, sheetCompanies]);

  // Keep selected company valid within the active teacher scope
  useEffect(() => {
    if (scopedCompanies.length === 0) {
      if (selectedTeacherCompanyId !== null) setSelectedTeacherCompanyId(null);
      return;
    }
    const stillExists = selectedTeacherCompanyId && scopedCompanies.some(c => c.id === selectedTeacherCompanyId);
    if (!stillExists) {
      setSelectedTeacherCompanyId(scopedCompanies[0].id);
    }
  }, [scopedCompanies, selectedTeacherCompanyId]);

  const activeCompany = useMemo(() => {
    return scopedCompanies.find(c => c.id === selectedTeacherCompanyId) || scopedCompanies[0] || null;
  }, [scopedCompanies, selectedTeacherCompanyId]);

  // Filtered companies for teacher directory list
  const filteredCompanies = useMemo(() => {
    return scopedCompanies.filter(comp => {
      const matchStatus = 
        companyFilterStatus === 'all' ||
        (companyFilterStatus === 'supervised' && comp.isSupervised) ||
        (companyFilterStatus === 'pending' && !comp.isSupervised);

      const matchSearch = !companySearchTerm || 
        comp.name.toLowerCase().includes(companySearchTerm.toLowerCase()) ||
        comp.zone.toLowerCase().includes(companySearchTerm.toLowerCase()) ||
        comp.students.some(s => 
          s.name.toLowerCase().includes(companySearchTerm.toLowerCase()) ||
          s.studentCode.includes(companySearchTerm)
        );

      return matchStatus && matchSearch;
    });
  }, [scopedCompanies, companyFilterStatus, companySearchTerm]);

  // Companies filtered for the SVG map pins
  const mapCompanies = useMemo(() => {
    return scopedCompanies.filter(c => {
      if (mapFilter === 'all') return true;
      if (mapFilter === 'supervised') return c.isSupervised;
      if (mapFilter === 'pending') return !c.isSupervised;
      return true;
    });
  }, [scopedCompanies, mapFilter]);

  const supervisedCompaniesCount = useMemo(() => {
    return scopedCompanies.filter(c => c.isSupervised).length;
  }, [scopedCompanies]);

  const pendingCompaniesCount = useMemo(() => {
    return scopedCompanies.filter(c => !c.isSupervised).length;
  }, [scopedCompanies]);

  const currentWeekInfo = useMemo(() => getCurrentWeekInfo(), []);

  // Priority supervision targets derived directly from scoped companies
  const priorityTargets = useMemo(() => {
    const pending = scopedCompanies.filter(c => !c.isSupervised);
    const supervised = scopedCompanies.filter(c => c.isSupervised);
    return [...pending, ...supervised].slice(0, 3);
  }, [scopedCompanies]);

  const studentSubs = useMemo(() => {
    return submissions[student.id] || [];
  }, [submissions, student.id]);

  const sortedStudentSubs = useMemo(() => {
    return [...studentSubs].sort((a, b) => b.weekNumber - a.weekNumber);
  }, [studentSubs]);

  // Match supervision records for the active student
  const matchingSupervisions = useMemo(() => {
    return supervisions.filter(r => {
      if (!r) return false;
      const sIdMatch = r.studentId === student.id;
      const sCodeMatch = Boolean(r.studentCode && student.studentCode && r.studentCode.trim() === student.studentCode.trim());
      const compMatch = Boolean(r.companyName && student.companyName && r.companyName.trim().toLowerCase().includes(student.companyName.trim().toLowerCase()));
      return sIdMatch || sCodeMatch || compMatch;
    });
  }, [supervisions, student]);

  const latestSupervision = matchingSupervisions.length > 0 ? matchingSupervisions[0] : null;

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-6 print:hidden">
      {/* Role switch pill for mobile view */}
      <div className="mb-4 flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm text-xs">
        <span className="text-slate-500 font-medium">สลับมุมมองหน้าจอมือถือ:</span>
        <button
          onClick={() => {
            onChangeRole('student');
            setActiveTab('home');
          }}
          className={`px-3 py-1 rounded-full font-bold transition cursor-pointer ${
            currentRole === 'student' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          นักศึกษา (Student View)
        </button>
        <button
          onClick={() => {
            onChangeRole('teacher');
            setActiveTab('home');
          }}
          className={`px-3 py-1 rounded-full font-bold transition cursor-pointer ${
            currentRole === 'teacher' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          ครูนิเทศก์ (Teacher View)
        </button>
      </div>

      {/* Realistic Mobile Device Frame */}
      <div className="w-full max-w-[430px] bg-slate-900 rounded-[44px] p-3 shadow-2xl border-4 border-slate-700 relative">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-50 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-slate-900 mr-3"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
        </div>

        {/* Inner Phone Screen */}
        <div className="w-full bg-slate-50 rounded-[36px] overflow-hidden min-h-[820px] max-h-[850px] flex flex-col justify-between pt-7 relative border border-slate-200 text-slate-800">
          
          {/* Scrollable Screen Content */}
          <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-3.5 text-xs">
            {currentRole === 'student' ? (
              /* =========================================================================
                 STUDENT MOBILE VIEW
                 ========================================================================= */
              <>
                {/* Mobile Top Header */}
                <div className="flex items-center justify-between pt-1 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src="./assets/aistudio/unnamed_54baf6fc.jpg"
                        alt="KKTECH Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-xs leading-none text-slate-900">KKTECH ช่างไฟฟ้า</div>
                      <div className="text-[10px] text-slate-500">@kktech.ac.th</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <button 
                      onClick={() => setActiveTab('history')}
                      className="p-1 rounded-full hover:bg-slate-200 transition"
                      title="ดูประวัติการส่งงานและผลการนิเทศก์"
                    >
                      <Bell className="w-4 h-4 text-slate-600" />
                    </button>
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                      {student.initials || 'นศ'}
                    </div>
                  </div>
                </div>

                {/* If activeTab === 'history', show full dedicated History & Supervision inspection center */}
                {activeTab === 'history' ? (
                  <div className="space-y-3.5">
                    {/* View Header with back to home */}
                    <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          <History className="w-4 h-4 text-sky-600" />
                          <span>ศูนย์ตรวจเช็คประวัติ & ผลนิเทศก์</span>
                        </h3>
                        <p className="text-[10px] text-slate-500">ตรวจสอบความคืบหน้ารายงานและคะแนนประเมินหน้างาน</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('home')}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px] transition"
                      >
                        กลับหน้าแรก
                      </button>
                    </div>

                    {/* Segmented Control Pill */}
                    <div className="grid grid-cols-2 p-1 bg-slate-200/80 rounded-xl gap-1 text-[11px] font-bold">
                      <button
                        onClick={() => setStudentSectionTab('submissions')}
                        className={`py-2 px-2 rounded-lg text-center transition flex items-center justify-center gap-1.5 ${
                          studentSectionTab === 'submissions'
                            ? 'bg-white text-sky-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>รายงานประจำสัปดาห์ ({studentSubs.length})</span>
                      </button>
                      <button
                        onClick={() => setStudentSectionTab('supervision')}
                        className={`py-2 px-2 rounded-lg text-center transition flex items-center justify-center gap-1.5 ${
                          studentSectionTab === 'supervision'
                            ? 'bg-white text-sky-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>ผลตรวจนิเทศก์ ({latestSupervision ? 'ตรวจแล้ว' : 'รอตรวจ'})</span>
                      </button>
                    </div>

                    {/* Tab 1: Weekly Submissions List */}
                    {studentSectionTab === 'submissions' && (
                      <div className="space-y-2.5">
                        {/* Summary Bar */}
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            <div className="text-[10px] text-slate-400">ส่งแล้ว</div>
                            <div className="text-sm font-bold text-sky-700 font-mono">{studentSubs.length} สัปดาห์</div>
                          </div>
                          <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            <div className="text-[10px] text-slate-400">ชั่วโมงสะสม</div>
                            <div className="text-sm font-bold text-emerald-700 font-mono">{student.accumulatedHours} ชม.</div>
                          </div>
                          <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            <div className="text-[10px] text-slate-400">เกรดเฉลี่ย</div>
                            <div className="text-sm font-bold text-amber-700 font-mono">
                              {studentSubs.length > 0 ? (studentSubs[0].teacherGrade || 'A') : '-'}
                            </div>
                          </div>
                        </div>

                        {sortedStudentSubs.length === 0 ? (
                          <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                            <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                            <div className="font-bold text-slate-700 text-xs">ยังไม่มีประวัติการส่งรายงาน</div>
                            <p className="text-[10px] text-slate-400">กรุณาส่งรายงานบันทึกประจำสัปดาห์ผ่านปุ่มส่งงาน</p>
                            <button
                              onClick={onOpenForm2}
                              className="px-3 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs"
                            >
                              ส่งงานสัปดาห์ที่ {student.currentWeek}
                            </button>
                          </div>
                        ) : (
                          sortedStudentSubs.map((sub) => {
                            const isGraded = sub.status === 'graded';
                            return (
                              <div
                                key={sub.id}
                                className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 transition hover:border-sky-300"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 font-bold font-mono text-[11px] flex items-center justify-center">
                                      {sub.weekNumber}
                                    </span>
                                    <div>
                                      <div className="font-bold text-xs text-slate-900">
                                        สัปดาห์ที่ {sub.weekNumber}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        {sub.dateRange || sub.submittedAt}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    {isGraded ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>ตรวจแล้ว: {sub.teacherGrade || 'A'} ({sub.teacherScore}/20)</span>
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-amber-600" />
                                        <span>รอตรวจประเมิน</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700">
                                  <div className="font-medium line-clamp-2">{sub.taskTitle}</div>
                                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                                    <span>⏱️ รวม {sub.totalHours || 40} ชม.</span>
                                    <span>⭐ ครูพี่เลี้ยง: {sub.mentorRating || 5.0}/5.0</span>
                                  </div>
                                </div>

                                {/* Safety checklist badge */}
                                <div className="flex items-center gap-1 text-[9px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>อุปกรณ์ความปลอดภัย: หมวกนิรภัย, ถุงมือแรงสูง, รองเท้า ESD, LOTO ผ่านครบ</span>
                                </div>

                                <div className="flex items-center gap-2 pt-0.5">
                                  <button
                                    onClick={() => setSelectedSubmission(sub)}
                                    className="flex-1 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-[11px] transition text-center border border-sky-200"
                                  >
                                    เปิดดูบันทึกประจำวัน 5 วัน & รูปภาพ →
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Tab 2: Supervision Evaluation Results */}
                    {studentSectionTab === 'supervision' && (
                      <div className="space-y-3">
                        {latestSupervision ? (
                          <>
                            {/* Official Inspected Badge */}
                            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white shadow-md space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>ได้รับการลงพื้นที่ตรวจนิเทศก์แล้ว</span>
                                </span>
                                <span className="text-[10px] text-emerald-300 font-mono">
                                  {latestSupervision.visitDate || latestSupervision.timestamp}
                                </span>
                              </div>

                              <div>
                                <h4 className="font-bold text-sm text-white">{latestSupervision.companyName}</h4>
                                <p className="text-[10px] text-slate-300">
                                  ครูนิเทศก์ผู้ประเมิน: <span className="font-semibold text-white">{latestSupervision.teacherName}</span>
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10 text-center">
                                <div className="p-1.5 rounded-xl bg-white/10">
                                  <div className="text-[10px] text-slate-300">คะแนนประเมิน</div>
                                  <div className="text-base font-bold text-amber-300 font-mono">
                                    {latestSupervision.score?.toFixed(1) || '19.5'} / 20
                                  </div>
                                </div>
                                <div className="p-1.5 rounded-xl bg-white/10">
                                  <div className="text-[10px] text-slate-300">ระดับผลการเรียน</div>
                                  <div className="text-base font-bold text-emerald-300">
                                    เกรด {latestSupervision.grade || 'A'} (ดีเยี่ยม)
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Safety & PPE Compliance */}
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                                <span className="flex items-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                  <span>ผลตรวจมาตรฐานความปลอดภัยหน้างาน (สอศ.)</span>
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  ผ่านเกณฑ์ 100%
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600">
                                <span className="flex items-center gap-1 text-emerald-700">
                                  <Check className="w-3 h-3 text-emerald-600" /> สวมหมวกนิรภัย (Hard Hat)
                                </span>
                                <span className="flex items-center gap-1 text-emerald-700">
                                  <Check className="w-3 h-3 text-emerald-600" /> ถุงมือฉนวนกันไฟฟ้าแรงสูง
                                </span>
                                <span className="flex items-center gap-1 text-emerald-700">
                                  <Check className="w-3 h-3 text-emerald-600" /> รองเท้าเซฟตี้ ESD ป้องกันไฟ
                                </span>
                                <span className="flex items-center gap-1 text-emerald-700">
                                  <Check className="w-3 h-3 text-emerald-600" /> ปฏิบัติตามระบบ LOTO
                                </span>
                              </div>
                            </div>

                            {/* Mentors and Teachers Feedback */}
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                              <div>
                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                  <span>ความคิดเห็นของครูพี่เลี้ยงสถานประกอบการ</span>
                                </div>
                                <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl mt-1 border border-slate-100 italic">
                                  "{latestSupervision.mentorFeedback || 'นักศึกษามีความรับผิดชอบดีมาก ตรงต่อเวลา ปฏิบัติตามกฎความปลอดภัยอย่างเคร่งครัด'}"
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  ผู้ให้ข้อมูล: {latestSupervision.mentorName || 'ช่างเอกชัย พลอยงาม'}
                                </div>
                              </div>

                              <div className="pt-1 border-t border-slate-100">
                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                                  <span>ข้อเสนอแนะของครูนิเทศก์</span>
                                </div>
                                <div className="text-[11px] text-slate-600 bg-sky-50/60 p-2 rounded-xl mt-1 border border-sky-100">
                                  "{latestSupervision.teacherComment || 'ขอให้รักษามาตรฐานการทำงานและฝึกฝนการอ่านแบบวงจรควบคุมไฟฟ้าอุตสาหกรรมเพิ่มเติม'}"
                                </div>
                              </div>
                            </div>

                            {/* Real On-site Photos Gallery */}
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                  <Camera className="w-3.5 h-3.5 text-sky-600" />
                                  <span>ภาพถ่ายหลักฐานการลงพื้นที่นิเทศก์ ({latestSupervision.photos?.length || 0} ภาพ)</span>
                                </span>
                                <span className="text-[10px] text-slate-400">แตะเพื่อขยาย</span>
                              </div>

                              {latestSupervision.photos && latestSupervision.photos.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                  {latestSupervision.photos.map((photo, pIdx) => (
                                    <button
                                      key={photo.id || pIdx}
                                      onClick={() => setSelectedPhoto(photo)}
                                      className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 text-left relative group cursor-pointer"
                                    >
                                      <div className="relative aspect-video w-full overflow-hidden">
                                        <img
                                          src={photo.url}
                                          alt={photo.title || 'รูปถ่ายนิเทศก์'}
                                          className="w-full h-full object-cover group-hover:scale-105 transition"
                                        />
                                        <div className="absolute top-1 right-1 bg-black/60 p-1 rounded-md text-white">
                                          <Maximize2 className="w-2.5 h-2.5" />
                                        </div>
                                      </div>
                                      <div className="p-1.5 bg-white text-[9px] text-slate-700 font-medium truncate">
                                        {photo.title || `รูปหลักฐาน ${pIdx + 1}`}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-slate-400 text-[11px]">
                                  ไม่มีภาพถ่ายแนบในบันทึกนี้
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          /* Pending inspection banner */
                          <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
                            <Clock className="w-10 h-10 text-amber-500 mx-auto" />
                            <div>
                              <h4 className="font-bold text-sm text-slate-900">อยู่ระหว่างรอการลงพื้นที่นิเทศก์</h4>
                              <p className="text-[11px] text-slate-500 mt-1">
                                ครูนิเทศก์ {student.supervisorTeacher} มีกำหนดการลงตรวจนิเทศก์ ณ {student.companyName} ตามปฏิทินแผนกวิชาช่างไฟฟ้ากำลัง
                              </p>
                            </div>
                            <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-[10px] text-left space-y-1 border border-amber-200">
                              <div className="font-bold">คำแนะนำสำหรับนักศึกษา:</div>
                              <div>• สวมใส่อุปกรณ์ PPE (หมวกนิรภัย, เสื้อช็อป, รองเท้าเซฟตี้) ให้พร้อมเสมอ</div>
                              <div>• เตรียมเล่มบันทึกการฝึกงานและเอกสารรายงานให้เป็นปัจจุบัน</div>
                              <div>• ปฏิบัติตามระเบียบของสถานประกอบการอย่างเคร่งครัด</div>
                            </div>
                            <a
                              href="tel:0819876543"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>ติดต่อครูนิเทศก์ ({student.supervisorTeacher})</span>
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Link to Full Printable A4 Report */}
                    <button
                      onClick={() => onNavigateA4(student.id)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-sky-950 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>เปิดเล่มรายงานฉบับสมบูรณ์ A4 (สอศ.)</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                ) : (
                  /* DEFAULT HOME / STUDENT DASHBOARD VIEW */
                  <>
                    {/* Student Profile Card */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center gap-3">
                        <StudentAvatar
                          student={student}
                          size="md"
                          showUploadButton={false}
                        />
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">{student.name}</h3>
                          <div className="text-[10px] text-slate-500">
                            {student.level} • รหัสนักศึกษา: {student.studentCode} • ห้อง {student.room}
                          </div>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-[11px]">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <MapPin className="w-3 h-3 text-sky-600" />
                          <span>{student.companyName}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>ครูนิเทศก์: {student.supervisorTeacher}</span>
                          <span className="text-emerald-700 font-semibold">• พิกัด GPS ตรวจยืนยันแล้ว</span>
                        </div>
                      </div>

                      {/* Hours Progress */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-600" /> สะสมชั่วโมงฝึกงานวิชาชีพ
                          </span>
                          <span className="font-bold text-slate-900 font-mono">
                            {student.accumulatedHours} / {student.requiredHours} ชม.
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-emerald-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (student.accumulatedHours / student.requiredHours) * 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>ผ่านไปแล้ว {student.actualWeeks || 8} จาก 18 สัปดาห์</span>
                          <span className="text-emerald-700 font-semibold">สำเร็จ 80% (ตามเกณฑ์)</span>
                        </div>
                      </div>
                    </div>

                    {/* NEW: Comprehensive History & Supervision Check Banner Card */}
                    <div className="p-3.5 rounded-2xl bg-white border border-sky-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-sky-600" />
                          <span className="font-bold text-slate-900 text-xs">
                            ประวัติส่งรายงาน & ผลการตรวจนิเทศก์
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveTab('history')}
                          className="text-[10px] text-sky-600 hover:text-sky-800 font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>ดูทั้งหมด ({studentSubs.length})</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Quick Toggle Inside Home View */}
                      <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg text-[10px] font-bold">
                        <button
                          onClick={() => setStudentSectionTab('submissions')}
                          className={`flex-1 py-1 rounded-md transition ${
                            studentSectionTab === 'submissions' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                          }`}
                        >
                          รายงานประจำสัปดาห์ ({studentSubs.length})
                        </button>
                        <button
                          onClick={() => setStudentSectionTab('supervision')}
                          className={`flex-1 py-1 rounded-md transition ${
                            studentSectionTab === 'supervision' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                          }`}
                        >
                          ผลการตรวจนิเทศก์ ({latestSupervision ? '✓ มีผลตรวจ' : 'รอตรวจ'})
                        </button>
                      </div>

                      {studentSectionTab === 'submissions' ? (
                        <div className="space-y-1.5 text-[11px]">
                          {sortedStudentSubs.slice(0, 3).map((sub) => (
                            <div
                              key={sub.id}
                              onClick={() => setSelectedSubmission(sub)}
                              className="p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50/60 border border-slate-100 hover:border-sky-200 flex items-center justify-between cursor-pointer transition"
                            >
                              <div>
                                <div className="font-semibold text-slate-800 flex items-center gap-1">
                                  <span>สัปดาห์ที่ {sub.weekNumber}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">({sub.totalHours || 40} ชม.)</span>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate max-w-[190px]">
                                  {sub.taskTitle}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  sub.status === 'graded' 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {sub.status === 'graded' ? (sub.teacherGrade || 'A') : 'รอตรวจ'}
                                </span>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => setActiveTab('history')}
                            className="w-full py-1 text-center text-sky-600 font-semibold text-[11px] hover:underline cursor-pointer"
                          >
                            เปิดดูประวัติส่งงานครบทุกสัปดาห์ →
                          </button>
                        </div>
                      ) : (
                        <div>
                          {latestSupervision ? (
                            <div 
                              onClick={() => setActiveTab('history')}
                              className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1.5 cursor-pointer hover:bg-emerald-100/70 transition"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-emerald-900 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>ได้รับการนิเทศก์เรียบร้อยแล้ว</span>
                                </span>
                                <span className="font-bold text-emerald-800 font-mono text-xs">
                                  {latestSupervision.score?.toFixed(1) || '19.5'}/20 (เกรด {latestSupervision.grade || 'A'})
                                </span>
                              </div>
                              <div className="text-[10px] text-emerald-800">
                                วันที่: {latestSupervision.visitDate || latestSupervision.timestamp} • ครูนิเทศก์: {latestSupervision.teacherName}
                              </div>
                              <div className="text-[10px] text-slate-600 italic truncate">
                                "{latestSupervision.teacherComment || 'การปฏิบัติงานได้ตามมาตรฐานความปลอดภัย'}"
                              </div>
                              <div className="text-[10px] text-sky-700 font-bold pt-0.5">
                                แตะเพื่อดูภาพหน้างาน {latestSupervision.photos?.length || 0} ภาพ & รายละเอียดเต็ม →
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-[11px] text-slate-500 space-y-1">
                              <Clock className="w-4 h-4 text-amber-500 mx-auto" />
                              <div className="font-semibold text-slate-700">อยู่ระหว่างรอกำหนดการตรวจนิเทศก์</div>
                              <div className="text-[10px] text-slate-400">จะแจ้งเตือนเมื่อครูนิเทศก์บันทึกผลการประเมิน</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Current Urgent Task Card */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white shadow-md space-y-3">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                          ภารกิจปัจจุบัน • สัปดาห์ที่ {student.currentWeek}
                        </span>
                        <span className="text-sky-300 font-mono">กำหนดส่งประจำสัปดาห์</span>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-white leading-tight">
                          ส่งบันทึกประจำสัปดาห์ & รูปถ่ายปฏิบัติงาน
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-1">
                          งานติดตั้งตู้ Distribution Board (MDB) & Wiring Control สายวงจรไฟฟ้าโรงงาน
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200">
                          📷 ภาพถ่ายหน้างาน (3 ภาพ)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200">
                          🛡️ เครื่องมือ & อุปกรณ์ PPE
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200">
                          ⏱️ ครบยอด 40 ชม./สัปดาห์
                        </span>
                      </div>

                      <button
                        onClick={onOpenForm2}
                        className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>เปิดแบบฟอร์มเพื่อส่งงาน</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <div className="text-[10px] text-slate-400 text-center">
                        ระบบบันทึกลงฐานข้อมูลวิทยาลัยเทคนิคขอนแก่นเรียลไทม์
                      </div>
                    </div>

                    {/* Company Info Card (Form #1) */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">ข้อมูลสถานประกอบการ</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          ส่งแล้ว
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">สัญญาการฝึกงานและข้อมูลครูพี่เลี้ยงภาคสนาม</p>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                        <div>
                          <div className="text-slate-500 text-[10px]">อัปเดตล่าสุด: ภาคเรียน 2/2569</div>
                          <div className="font-semibold text-slate-800">พี่เลี้ยง: {student.companyRegistration?.mentorName || 'ช่างเอกชัย พลอยงาม'}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={onOpenForm1}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-[10px] transition cursor-pointer"
                          >
                            ดูข้อมูล / แก้ไข
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Photo Guidelines Preview Card */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-sky-600" />
                          <span>ตัวอย่างภาพถ่ายหน้างานที่ถูกต้อง</span>
                        </span>
                        <span className="text-[10px] text-slate-400">เกณฑ์เทคนิคขอนแก่น</span>
                      </div>

                      <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200 text-[10px] text-amber-900">
                        💡 <strong>คำแนะนำ:</strong> ภาพถ่ายต้องเห็นใบหน้าชัดเจนขณะสวมหมวกนิรภัย (Safety Helmet) และแว่นตานิรภัย มองเห็นป้ายชื่อตู้ควบคุมหรือหม้อแปลงชัดเจน
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                          <img
                            src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80"
                            alt="ตัวอย่างภาพ"
                            className="w-full h-20 object-cover"
                          />
                          <div className="p-1 text-[9px] text-slate-700 font-medium">ตัวอย่าง: ตรวจสอบสาย (สวม PPE ครบถ้วน)</div>
                        </div>
                        <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                          <img
                            src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80"
                            alt="ตัวอย่างภาพ"
                            className="w-full h-20 object-cover"
                          />
                          <div className="p-1 text-[9px] text-slate-700 font-medium">ตัวอย่าง: รายละเอียดงาน (เห็นมิเตอร์และฉลาก)</div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons (2 items) */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onNavigateA4(student.id)}
                        className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 text-left transition cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-sky-600 mb-1" />
                        <div className="font-bold text-slate-900 text-xs">พรีวิวเล่มรายงาน A4</div>
                        <div className="text-[10px] text-slate-500">แบบฟอร์ม สอศ. ฉบับทางการ</div>
                      </button>

                      <a
                        href="tel:0891234567"
                        className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 text-left transition"
                      >
                        <Phone className="w-4 h-4 text-emerald-600 mb-1" />
                        <div className="font-bold text-slate-900 text-xs">โทรหาครูนิเทศก์</div>
                        <div className="text-[10px] text-slate-500">{student.supervisorTeacher}</div>
                      </a>
                    </div>

                    {/* PEA Hotline Banner */}
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-900">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-rose-200 text-rose-700">
                          <Zap className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <div className="font-bold text-[11px]">สายด่วนเหตุด่วนไฟฟ้า PEA</div>
                          <div className="text-[9px] text-rose-700">ศูนย์บริการ 24 ชม. กรณีเกิดอุบัติเหตุ</div>
                        </div>
                      </div>
                      <a
                        href="tel:1129"
                        className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs"
                      >
                        โทร 1129
                      </a>
                    </div>
                  </>
                )}
              </>
            ) : (
              /* =========================================================================
                 TEACHER MOBILE VIEW (ENHANCED WITH GPS MAP, SCHEDULE & COMPANIES DIRECTORY)
                 ========================================================================= */
              <>
                {/* Header */}
                <div className="flex items-center justify-between pt-1 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src="./assets/aistudio/unnamed_54baf6fc.jpg"
                        alt="KKTECH Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs leading-none text-slate-900 truncate">
                        {activeTeacherProfile.department}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-medium truncate mt-0.5">
                        {activeTeacherProfile.status}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <button
                      onClick={() => onOpenForm3()}
                      className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="เปิดแบบฟอร์มนิเทศก์"
                    >
                      <Camera className="w-4 h-4 text-sky-700" />
                    </button>
                    {teacherAvatarUrl ? (
                      <img
                        src={teacherAvatarUrl}
                        alt={activeTeacherProfile.name}
                        className="w-6 h-6 rounded-full object-cover border border-slate-300"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                        {activeTeacherProfile.initials}
                      </div>
                    )}
                  </div>
                </div>

                {/* Supervisor Badge (Synced to Logged-in User) */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {teacherAvatarUrl ? (
                        <img
                          src={teacherAvatarUrl}
                          alt={activeTeacherProfile.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-sky-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {activeTeacherProfile.initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 truncate">
                          {activeTeacherProfile.name}
                        </h3>
                        <div className="text-[10px] text-sky-700 font-medium truncate">
                          {activeTeacherProfile.status}
                        </div>
                        {activeTeacherProfile.email && (
                          <div className="text-[9px] text-slate-400 font-mono truncate">
                            {activeTeacherProfile.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                      {activeTeacherProfile.isSimulatedFromStudent ? 'มุมมองจำลอง' : 'ข้อมูลบัญชีจริง'}
                    </span>
                  </div>

                  {/* Rooms & Scope Switcher */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-1 min-w-0">
                      {activeTeacherProfile.rooms.length > 0 ? (
                        activeTeacherProfile.rooms.slice(0, 4).map(rm => (
                          <span key={rm} className="px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 text-[9px] font-semibold">
                            {rm}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] text-slate-400">ทุกกลุ่มห้องเรียนแผนกช่างไฟฟ้า</span>
                      )}
                    </div>
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[9px] font-bold">
                      <button
                        onClick={() => setTeacherScope('mine')}
                        className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                          teacherScope === 'mine' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        ในความรับผิดชอบ ({myCompanies.length})
                      </button>
                      <button
                        onClick={() => setTeacherScope('all')}
                        className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                          teacherScope === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        ทั้งแผนก ({sheetCompanies.length})
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1 pt-1 text-center border-t border-slate-100 font-mono">
                    <div className="p-1 rounded bg-slate-50">
                      <div className="font-bold text-slate-900 text-xs">{scopedStudents.length}</div>
                      <div className="text-[9px] text-slate-400 font-sans">นักศึกษา</div>
                    </div>
                    <div className="p-1 rounded bg-slate-50">
                      <div className="font-bold text-slate-900 text-xs">{scopedCompanies.length}</div>
                      <div className="text-[9px] text-slate-400 font-sans">สถานประกอบการ</div>
                    </div>
                    <div className="p-1 rounded bg-slate-50">
                      <div className="font-bold text-emerald-600 text-xs">{supervisedCompaniesCount}</div>
                      <div className="text-[9px] text-emerald-600 font-sans">นิเทศแล้ว</div>
                    </div>
                    <div className="p-1 rounded bg-slate-50">
                      <div className="font-bold text-amber-600 text-xs">{pendingCompaniesCount}</div>
                      <div className="text-[9px] text-amber-600 font-sans">รอนิเทศ</div>
                    </div>
                  </div>
                </div>

                {/* Teacher Section Segmented Controller (Map / Schedule / Companies Table) */}
                <div className="grid grid-cols-3 p-1 bg-slate-200/90 rounded-xl gap-1 text-[11px] font-bold">
                  <button
                    onClick={() => setTeacherSubTab('map')}
                    className={`py-2 px-1 rounded-lg text-center transition flex items-center justify-center gap-1 cursor-pointer ${
                      teacherSubTab === 'map'
                        ? 'bg-white text-sky-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>แผนที่พิกัด</span>
                  </button>
                  <button
                    onClick={() => setTeacherSubTab('companies')}
                    className={`py-2 px-1 rounded-lg text-center transition flex items-center justify-center gap-1 cursor-pointer ${
                      teacherSubTab === 'companies'
                        ? 'bg-white text-sky-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span>ตารางสถานฯ</span>
                  </button>
                  <button
                    onClick={() => setTeacherSubTab('schedule')}
                    className={`py-2 px-1 rounded-lg text-center transition flex items-center justify-center gap-1 cursor-pointer ${
                      teacherSubTab === 'schedule'
                        ? 'bg-white text-sky-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>ข้อมูลเข้านิเทศ</span>
                  </button>
                </div>

                {/* =========================================================================
                    SUB-TAB 1: MAP VIEW & COMPANY GPS COORDINATES
                    ========================================================================= */}
                {teacherSubTab === 'map' && (
                  <div className="space-y-3">
                    {/* Map Header & Filter */}
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                          <Compass className="w-4 h-4 text-sky-600" />
                          <span>
                            {teacherScope === 'mine' ? 'แผนที่พิกัดในความรับผิดชอบ' : 'แผนที่พิกัดสถานประกอบการทั้งหมด'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {mapCompanies.length} จุดหมุด
                        </span>
                      </div>

                      {/* Map Filter Pills */}
                      <div className="flex gap-1 text-[10px]">
                        <button
                          onClick={() => setMapFilter('all')}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                            mapFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          ทั้งหมด ({scopedCompanies.length})
                        </button>
                        <button
                          onClick={() => setMapFilter('pending')}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                            mapFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          รอนิเทศ ({pendingCompaniesCount})
                        </button>
                        <button
                          onClick={() => setMapFilter('supervised')}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                            mapFilter === 'supervised' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          นิเทศแล้ว ({supervisedCompaniesCount})
                        </button>
                      </div>
                    </div>

                    {/* Interactive SVG Map Container */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-2 shadow-inner relative overflow-hidden">
                      <div className="flex items-center justify-between px-2 py-1 text-[10px] text-slate-400 border-b border-slate-800 mb-1">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                          <span>โซนจังหวัดขอนแก่น & พื้นที่ใกล้เคียง</span>
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">แตะหมุดเพื่อดูพิกัด</span>
                      </div>

                      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
                        <svg
                          viewBox="0 0 650 550"
                          className="w-full h-full select-none"
                        >
                          {/* Radar Grid Circles */}
                          <circle cx="340" cy="280" r="80" fill="none" stroke="#334155" strokeWidth="0.8" strokeDasharray="4 4" />
                          <circle cx="340" cy="280" r="160" fill="none" stroke="#334155" strokeWidth="0.8" strokeDasharray="4 4" />
                          <circle cx="340" cy="280" r="240" fill="none" stroke="#1e293b" strokeWidth="0.8" />

                          {/* Major Highways / Route 2 & 12 lines */}
                          <line x1="340" y1="40" x2="340" y2="520" stroke="#334155" strokeWidth="1.5" strokeDasharray="6 3" />
                          <line x1="60" y1="280" x2="600" y2="280" stroke="#334155" strokeWidth="1.5" strokeDasharray="6 3" />

                          {/* District Waterways / Lake Ubolratana */}
                          <path
                            d="M 230 160 Q 250 140 280 160 T 300 200 Q 260 210 230 160 Z"
                            fill="#0369a1"
                            opacity="0.35"
                          />
                          <text x="245" y="180" fill="#38bdf8" fontSize="10" opacity="0.7">เขื่อนอุบลรัตน์</text>

                          {/* District Labels */}
                          <text x="350" y="80" fill="#64748b" fontSize="11" fontWeight="bold">อ.เขาสวนกวาง</text>
                          <text x="330" y="125" fill="#64748b" fontSize="11" fontWeight="bold">อ.น้ำพอง</text>
                          <text x="460" y="175" fill="#64748b" fontSize="11" fontWeight="bold">อ.กระนวน</text>
                          <text x="110" y="275" fill="#64748b" fontSize="11" fontWeight="bold">อ.ชุมแพ</text>
                          <text x="210" y="265" fill="#64748b" fontSize="11" fontWeight="bold">อ.หนองเรือ</text>
                          <text x="475" y="270" fill="#64748b" fontSize="11" fontWeight="bold">อ.เชียงยืน</text>
                          <text x="355" y="445" fill="#64748b" fontSize="11" fontWeight="bold">อ.บ้านไผ่</text>
                          <text x="320" y="495" fill="#64748b" fontSize="11" fontWeight="bold">อ.เมืองพล</text>

                          {/* College Anchor Center Marker */}
                          <g transform="translate(340, 280)">
                            <circle r="12" fill="#0284c7" opacity="0.3" className="animate-ping" />
                            <circle r="7" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                            <text x="12" y="4" fill="#38bdf8" fontSize="11" fontWeight="bold">
                              ★ วิทยาลัยเทคนิคขอนแก่น (KKTECH)
                            </text>
                          </g>

                          {/* Company Pins */}
                          {mapCompanies.map((c, cIdx) => {
                            const isSelected = activeCompany?.id === c.id;
                            const pinColor = c.isSupervised ? '#10b981' : '#f59e0b';
                            return (
                              <g
                                key={c.id}
                                transform={`translate(${c.mapX}, ${c.mapY})`}
                                onClick={() => setSelectedTeacherCompanyId(c.id)}
                                className="cursor-pointer group"
                              >
                                {isSelected && (
                                  <circle r="14" fill="#38bdf8" opacity="0.4" className="animate-ping" />
                                )}
                                <circle
                                  r={isSelected ? "9" : "6.5"}
                                  fill={isSelected ? '#0284c7' : pinColor}
                                  stroke="#ffffff"
                                  strokeWidth={isSelected ? "2.5" : "1.5"}
                                  className="transition-all duration-200"
                                />
                                {isSelected && (
                                  <text
                                    x="0"
                                    y="-14"
                                    textAnchor="middle"
                                    fill="#ffffff"
                                    fontSize="11"
                                    fontWeight="bold"
                                    className="bg-black/80 px-1"
                                  >
                                    {c.name.slice(0, 16)}...
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Map Legend */}
                      <div className="flex items-center justify-around pt-2 px-1 text-[9px] text-slate-300">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <span>นิเทศแล้ว ({supervisedCompaniesCount})</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          <span>รอนิเทศ ({pendingCompaniesCount})</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                          <span>จุดที่เลือก</span>
                        </span>
                      </div>
                    </div>

                    {/* Selected Company GPS Detail Card */}
                    {activeCompany && (
                      <div className="p-3.5 rounded-2xl bg-white border border-sky-300 shadow-sm space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-800">
                                {activeCompany.sectorLabel}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {activeCompany.distanceKm} กม. จาก วท.ขอนแก่น
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-slate-900 mt-1">
                              {activeCompany.name}
                            </h4>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
                              <span>{activeCompany.address} ({activeCompany.zone})</span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            activeCompany.isSupervised
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {activeCompany.isSupervised ? '✓ นิเทศแล้ว' : '⏳ รอนิเทศ'}
                          </span>
                        </div>

                        {/* GPS Coordinates & Direct Navigation Bar */}
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                          <div>
                            <div className="text-[9px] text-slate-400 font-mono">พิกัดดาวเทียม (GPS Coordinates)</div>
                            <div className="font-mono font-bold text-slate-800 text-[11px]">
                              {activeCompany.lat.toFixed(4)}° N, {activeCompany.lng.toFixed(4)}° E
                            </div>
                          </div>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${activeCompany.lat},${activeCompany.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] shadow-xs transition"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>นำทาง Google Maps</span>
                          </a>
                        </div>

                        {/* Mentor & Student Info */}
                        <div className="space-y-1 text-[11px] text-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">ครูพี่เลี้ยง:</span>
                            <span className="font-semibold text-slate-800">{activeCompany.contactPerson}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">เบอร์ติดต่อ:</span>
                            <a href={`tel:${activeCompany.phone.replace(/[^0-9]/g, '')}`} className="font-mono text-sky-600 font-semibold hover:underline">
                              📞 {activeCompany.phone}
                            </a>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-slate-500">นักศึกษาในสังกัด:</span>
                            <span className="font-bold text-slate-900 font-mono">
                              {activeCompany.studentsCount} คน ({activeCompany.students.map(s => s.name.split(' ')[0]).join(', ')})
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => onOpenForm3(activeCompany.students[0]?.id)}
                            className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 text-amber-400" />
                            <span>บันทึกการนิเทศ ({activeCompany.name.slice(0, 14)}...)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quick Horizontally Scrollable Company GPS Selector */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
                        <span>เลือกสถานประกอบการจากรายการพิกัด</span>
                        <span className="text-[10px] text-slate-400">เลื่อนซ้าย-ขวา</span>
                      </div>
                      {scopedCompanies.length === 0 ? (
                        <div className="p-4 rounded-xl bg-white border border-slate-200 text-center space-y-2">
                          <div className="text-[11px] text-slate-500">
                            ยังไม่มีสถานประกอบการที่ผูกกับห้องหรือรายชื่อของ {activeTeacherProfile.name}
                          </div>
                          {teacherScope === 'mine' && sheetCompanies.length > 0 && (
                            <button
                              onClick={() => setTeacherScope('all')}
                              className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold cursor-pointer"
                            >
                              แสดงสถานประกอบการทั้งแผนก ({sheetCompanies.length} แห่ง)
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2 overflow-x-auto pb-1 text-[10px]">
                          {scopedCompanies.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => setSelectedTeacherCompanyId(c.id)}
                              className={`p-2 rounded-xl border text-left shrink-0 w-36 transition cursor-pointer ${
                                activeCompany?.id === c.id
                                  ? 'bg-sky-50 border-sky-400 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <div className="font-bold text-slate-900 truncate">{c.name}</div>
                              <div className="text-[9px] text-slate-400 mt-0.5">{c.zone} • {c.distanceKm} กม.</div>
                              <div className="mt-1 flex items-center justify-between">
                                <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                                  c.isSupervised ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {c.isSupervised ? 'นิเทศแล้ว' : 'รอนิเทศ'}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono">{c.studentsCount} คน</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* =========================================================================
                    SUB-TAB 2: ALL COMPANIES DIRECTORY & SUPERVISION RECORDS
                    ========================================================================= */}
                {teacherSubTab === 'companies' && (
                  <div className="space-y-3">
                    {/* Header & Search */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-sky-600" />
                          <span>
                            {teacherScope === 'mine'
                              ? 'ตารางสถานประกอบการในความรับผิดชอบ & นิเทศ'
                              : 'ตารางรายชื่อสถานประกอบการทั้งหมด & บันทึกการนิเทศ'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 font-bold">
                          {filteredCompanies.length} แห่ง
                        </span>
                      </div>

                      {/* Search Input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="ค้นหาชื่อสถานประกอบการ, อำเภอ/โซน, หรือชื่อนักศึกษา..."
                          value={companySearchTerm}
                          onChange={(e) => setCompanySearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 placeholder-slate-400"
                        />
                      </div>

                      {/* Status Filter */}
                      <div className="flex gap-1 text-[10px]">
                        <button
                          onClick={() => setCompanyFilterStatus('all')}
                          className={`flex-1 py-1 rounded-lg font-semibold transition cursor-pointer ${
                            companyFilterStatus === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          ทั้งหมด ({scopedCompanies.length})
                        </button>
                        <button
                          onClick={() => setCompanyFilterStatus('pending')}
                          className={`flex-1 py-1 rounded-lg font-semibold transition cursor-pointer ${
                            companyFilterStatus === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          รอนิเทศ ({pendingCompaniesCount})
                        </button>
                        <button
                          onClick={() => setCompanyFilterStatus('supervised')}
                          className={`flex-1 py-1 rounded-lg font-semibold transition cursor-pointer ${
                            companyFilterStatus === 'supervised' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          นิเทศแล้ว ({supervisedCompaniesCount})
                        </button>
                      </div>
                    </div>

                    {/* Companies Cards List */}
                    <div className="space-y-2.5">
                      {filteredCompanies.length === 0 ? (
                        <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
                          <div>ไม่พบข้อมูลสถานประกอบการที่ตรงกับเงื่อนไข</div>
                          {teacherScope === 'mine' && sheetCompanies.length > 0 && !companySearchTerm && (
                            <button
                              onClick={() => setTeacherScope('all')}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-bold cursor-pointer"
                            >
                              ดูข้อมูลสถานประกอบการทั้งแผนก ({sheetCompanies.length} แห่ง)
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredCompanies.map((comp) => {
                          const isExpanded = expandedCompanyId === comp.id;
                          const f3 = comp.latestRecord;

                          return (
                            <div
                              key={comp.id}
                              className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 transition hover:border-sky-300"
                            >
                              {/* Card Header */}
                              <div className="flex items-start justify-between gap-1.5">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                                      {comp.zone}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {comp.distanceKm} กม.
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-xs text-slate-900 mt-0.5">
                                    {comp.name}
                                  </h4>
                                </div>

                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                  comp.isSupervised
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  {comp.isSupervised ? '✓ นิเทศแล้ว' : '⏳ รอนิเทศ'}
                                </span>
                              </div>

                              {/* Students assigned */}
                              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3 text-sky-600" />
                                    <span>นักศึกษาฝึกงาน ({comp.studentsCount} คน):</span>
                                  </span>
                                  <span>{comp.students[0]?.room ? `ห้อง ${comp.students[0].room}` : ''}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {comp.students.map((std) => (
                                    <span
                                      key={std.id}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-800"
                                    >
                                      <span className="font-mono text-slate-400">{std.studentCode.slice(-4)}</span>
                                      <span className="font-medium">{std.name}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Supervision Info / Score if available */}
                              {f3 && (
                                <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[10px] text-emerald-900 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>คะแนนประเมิน: {f3.score?.toFixed(1) || '19.5'}/20 (เกรด {f3.grade || 'A'})</span>
                                    </span>
                                    <span className="font-mono text-[9px] text-emerald-700">
                                      {f3.visitDate || f3.timestamp}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] text-sky-900 font-semibold">
                                    <span className="flex items-center gap-1">
                                      <UserCheck className="w-3 h-3 text-sky-600" />
                                      <span>ครูนิเทศก์: {(comp.supervisingTeachers && comp.supervisingTeachers.length > 0) ? comp.supervisingTeachers.join(', ') : f3.teacherName}</span>
                                    </span>
                                    {comp.form3Records.length > 1 && (
                                      <span className="px-1.5 py-0.2 rounded bg-white text-emerald-800 border border-emerald-200 font-mono">
                                        {comp.form3Records.length} บันทึก
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-slate-600 italic line-clamp-1">
                                    "{f3.teacherComment || 'ปฏิบัติงานตามเกณฑ์มาตรฐานความปลอดภัย สอศ.'}"
                                  </div>
                                </div>
                              )}

                              {/* Action Row */}
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <button
                                  onClick={() => onOpenForm3(comp.students[0]?.id)}
                                  className="flex-1 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                                  title="บันทึกหรือแก้ไขการนิเทศ"
                                >
                                  <Camera className="w-3 h-3" />
                                  <span>บันทึกการนิเทศ</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedTeacherCompanyId(comp.id);
                                    setTeacherSubTab('map');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[10px] flex items-center gap-1 cursor-pointer"
                                  title="ดูพิกัดบนแผนที่"
                                >
                                  <MapPin className="w-3 h-3 text-sky-600" />
                                  <span>พิกัด</span>
                                </button>

                                <button
                                  onClick={() => onNavigateA4(comp.students[0]?.id)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[10px] flex items-center gap-1 cursor-pointer"
                                  title="ดูรายงาน A4"
                                >
                                  <FileText className="w-3 h-3 text-indigo-600" />
                                  <span>A4</span>
                                </button>

                                <button
                                  onClick={() => setExpandedCompanyId(isExpanded ? null : comp.id)}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
                                  title={isExpanded ? 'ย่อรายละเอียด' : 'ดูรายละเอียดเต็ม'}
                                >
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              </div>

                              {/* Expandable Accordion: Full Details & On-site Photos */}
                              {isExpanded && (
                                <div className="pt-2 border-t border-slate-100 space-y-2 text-[10px] text-slate-700">
                                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl">
                                    <div>
                                      <div className="text-slate-400 text-[9px]">ครูพี่เลี้ยงสถานประกอบการ</div>
                                      <div className="font-semibold text-slate-800">{comp.contactPerson}</div>
                                      <a href={`tel:${comp.phone.replace(/[^0-9]/g, '')}`} className="text-sky-600 font-mono">
                                        📞 {comp.phone}
                                      </a>
                                    </div>
                                    <div>
                                      <div className="text-slate-400 text-[9px]">พิกัด GPS & แผนที่</div>
                                      <div className="font-mono text-slate-700">{comp.lat.toFixed(4)}, {comp.lng.toFixed(4)}</div>
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${comp.lat},${comp.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sky-600 underline font-semibold inline-flex items-center gap-0.5"
                                      >
                                        <span>เปิด Google Maps</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    </div>
                                  </div>

                                  {/* All Photos Gallery across all records for this company */}
                                  {((comp.allPhotos && comp.allPhotos.length > 0) || (f3 && f3.photos && f3.photos.length > 0)) && (
                                    <div className="space-y-1">
                                      <div className="font-semibold text-slate-800">
                                        ภาพถ่ายหน้างานจริงทั้งหมด ({(comp.allPhotos || f3?.photos || []).length} รูป):
                                      </div>
                                      <div className="grid grid-cols-3 gap-1">
                                        {(comp.allPhotos || f3?.photos || []).map((p, pIdx) => (
                                          <div
                                            key={p.id || pIdx}
                                            onClick={() => setSelectedPhoto(p)}
                                            className="aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer bg-slate-100"
                                          >
                                            <img src={p.url} alt={p.title} className="w-full h-full object-cover" />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* =========================================================================
                    SUB-TAB 3: SUPERVISION VISIT ITINERARY & TODAY'S SCHEDULE
                    ========================================================================= */}
                {teacherSubTab === 'schedule' && (
                  <div className="space-y-3">
                    {/* Supervision Quick Action Banner */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 text-white shadow-md space-y-2.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-emerald-400 font-semibold uppercase tracking-wide">
                          บันทึกการนิเทศตามมาตรฐาน สอศ.
                        </span>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">บันทึกผลการนิเทศหน้างาน & ประเมินสมรรถนะ</h4>
                        <p className="text-[10px] text-slate-300 mt-0.5">
                          พิกัด GPS อัตโนมัติ • ภาพหน้างาน 3-5 ภาพ • ประเมิน PPE & LOTO
                        </p>
                      </div>
                      <button
                        onClick={() => onOpenForm3()}
                        className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>เปิดแบบฟอร์มนิเทศฝึกงาน</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Dynamic Field Inspection Schedule Based on Logged-in Teacher */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                          <Navigation className="w-3.5 h-3.5 text-sky-600" />
                          <span>แผนลงพื้นที่นิเทศ ({activeTeacherProfile.name})</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          สัปดาห์ที่ {currentWeekInfo.weekNumber}/{currentWeekInfo.totalWeeks}
                        </span>
                      </div>

                      {priorityTargets.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-2">
                          <div className="text-[11px] text-slate-500">
                            ยังไม่มีรายการสถานประกอบการในกลุ่มความรับผิดชอบของ {activeTeacherProfile.name}
                          </div>
                          {teacherScope === 'mine' && sheetCompanies.length > 0 && (
                            <button
                              onClick={() => setTeacherScope('all')}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-bold cursor-pointer"
                            >
                              ดูแผนลงพื้นที่ทั้งแผนก ({sheetCompanies.length} แห่ง)
                            </button>
                          )}
                        </div>
                      ) : (
                        priorityTargets.map((target, tIdx) => {
                          const firstStd = target.students[0];
                          const isPrimary = !target.isSupervised && tIdx === 0;
                          return (
                            <div
                              key={target.id}
                              className={`p-3 rounded-xl border space-y-2 ${
                                isPrimary
                                  ? 'border-sky-300 bg-sky-50/50'
                                  : 'border-slate-200 bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] gap-2">
                                <span className="font-bold text-slate-900">
                                  เป้าหมายที่ {tIdx + 1} ({target.zone})
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                  target.isSupervised
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {target.isSupervised ? '✓ นิเทศแล้ว' : '⏳ รอลงพื้นที่'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-700 space-y-0.5">
                                <div className="font-semibold text-sky-950">{target.name}</div>
                                <div className="text-[10px] text-slate-500">
                                  {firstStd
                                    ? `${firstStd.name}${firstStd.room ? ` • ${firstStd.room}` : ''}${target.studentsCount > 1 ? ` (+${target.studentsCount - 1} คน)` : ''}`
                                    : `นักศึกษา ${target.studentsCount} คน`}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  พิกัด GPS: {target.lat.toFixed(4)}, {target.lng.toFixed(4)} ({target.distanceKm} กม.)
                                </div>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => onOpenForm3(firstStd?.id)}
                                  className={`flex-1 py-1.5 rounded-lg text-white text-[10px] font-bold cursor-pointer ${
                                    isPrimary ? 'bg-sky-600 hover:bg-sky-500' : 'bg-slate-900 hover:bg-slate-800'
                                  }`}
                                >
                                  {target.isSupervised ? 'บันทึกนิเทศเพิ่มเติม' : 'เริ่มบันทึกการนิเทศ'}
                                </button>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${target.lat},${target.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-[10px] flex items-center gap-1"
                                >
                                  <Navigation className="w-3 h-3 text-sky-600" />
                                  <span>นำทาง</span>
                                </a>
                                {firstStd?.id && (
                                  <button
                                    onClick={() => onNavigateA4(firstStd.id)}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-[10px] cursor-pointer"
                                  >
                                    ดู A4
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Assigned Courses & Rooms for Logged-in Teacher */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          <span>รายวิชาและห้องเรียนที่รับผิดชอบ</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {activeTeacherProfile.courses.length} รายการ
                        </span>
                      </div>
                      {activeTeacherProfile.courses.length > 0 ? (
                        <div className="space-y-1.5">
                          {activeTeacherProfile.courses.slice(0, 6).map((c, idx) => (
                            <div
                              key={`${c.room}-${c.subjectCode}-${idx}`}
                              className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 text-[10px]"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate">
                                  {c.subjectCode} {c.subjectName}
                                </div>
                                <div className="text-[9px] text-slate-500 truncate">
                                  ผู้สอน: {c.teacherName}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold shrink-0">
                                {c.room}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {activeTeacherProfile.subjects.length > 0
                            ? activeTeacherProfile.subjects.join(' • ')
                            : 'ดูแลภาพรวมการฝึกอาชีพและนิเทศก์นักศึกษาทั้งแผนก'}
                        </div>
                      )}
                    </div>

                    {/* My Recorded Supervision History */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          <span>ประวัติบันทึกการนิเทศของฉัน</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-700 font-bold">
                          {mySupervisions.length} รายการ
                        </span>
                      </div>

                      {mySupervisions.length === 0 ? (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] text-slate-500 text-center">
                          ยังไม่มีประวัติการบันทึกการนิเทศในชื่อ {activeTeacherProfile.name}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {mySupervisions.slice(0, 5).map((rec) => (
                            <div key={rec.id} className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5 text-[10px]">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900 truncate">{rec.companyName}</span>
                                <span className="px-1.5 py-0.5 rounded bg-white border border-emerald-200 text-emerald-800 font-bold shrink-0">
                                  {rec.score?.toFixed(1) || '19.0'}/20 ({rec.grade || 'A'})
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-slate-600">
                                <span>นศ.: {rec.studentName}</span>
                                <span className="font-mono">{rec.visitDate || rec.timestamp}</span>
                              </div>
                              {rec.teacherComment && (
                                <div className="text-slate-600 italic line-clamp-2">
                                  "{rec.teacherComment}"
                                </div>
                              )}
                              {rec.photos && rec.photos.length > 0 && (
                                <div className="flex gap-1 pt-0.5">
                                  {rec.photos.slice(0, 3).map((p, pIdx) => (
                                    <div
                                      key={p.id || pIdx}
                                      onClick={() => setSelectedPhoto(p)}
                                      className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-200 cursor-pointer bg-white"
                                    >
                                      <img src={p.url} alt={p.title} className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Safety Checklist Standard */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>เกณฑ์ความปลอดภัยทางไฟฟ้า (Safety Checklist สอศ.)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> หมวกนิรภัย (Hard Hat)
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ถุงมือฉนวนแรงสูง
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> รองเท้าเซฟตี้ ESD
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ขั้นตอน Lockout/Tagout
                        </span>
                      </div>
                    </div>

                    {/* Logged-in Teacher & Department Contact Banner */}
                    <div className="p-3 rounded-2xl bg-slate-900 text-white space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold flex items-center gap-1 truncate">
                          <School className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate">{activeTeacherProfile.department}</span>
                        </span>
                        <span className="text-[10px] text-sky-300 shrink-0">วท.ขอนแก่น</span>
                      </div>
                      <p className="text-[10px] text-slate-300">
                        ผู้ใช้งาน: {activeTeacherProfile.name}
                        {activeTeacherProfile.phone ? ` • โทร ${activeTeacherProfile.phone}` : ''}
                        {activeTeacherProfile.email ? ` • ${activeTeacherProfile.email}` : ''}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modal / Overlay: Weekly Submission Details (5 Daily logs + photos) */}
          {selectedSubmission && (
            <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end">
              <div className="bg-white rounded-t-[28px] max-h-[85%] overflow-y-auto p-4 space-y-3 text-xs shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <span className="font-bold text-sm text-slate-900">
                      บันทึกสัปดาห์ที่ {selectedSubmission.weekNumber}
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {selectedSubmission.dateRange || selectedSubmission.submittedAt}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="font-bold text-slate-800 text-xs">{selectedSubmission.taskTitle}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>รวมเวลาปฏิบัติงาน: {selectedSubmission.totalHours || 40} ชม.</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      selectedSubmission.status === 'graded' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedSubmission.status === 'graded' 
                        ? `ตรวจแล้ว: เกรด ${selectedSubmission.teacherGrade || 'A'} (${selectedSubmission.teacherScore}/20)` 
                        : 'รอครูตรวจ'
                      }
                    </span>
                  </div>
                </div>

                {/* 5 Daily Logs */}
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-900 text-[11px]">บันทึกการปฏิบัติงานรายวัน (5 วัน):</div>
                  {selectedSubmission.dailyLogs && selectedSubmission.dailyLogs.length > 0 ? (
                    selectedSubmission.dailyLogs.map((log, idx) => (
                      <div key={log.id || idx} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px] space-y-0.5">
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span>วัน{log.day} ({log.date})</span>
                          <span className="text-sky-700 font-mono">{log.hours || 8} ชม.</span>
                        </div>
                        <div className="text-slate-600">{log.taskDescription}</div>
                        {log.toolsUsed && (
                          <div className="text-slate-400 text-[9px]">เครื่องมือ: {log.toolsUsed}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 text-[10px] italic">ไม่มีข้อมูลบันทึกรายวันย่อย</div>
                  )}
                </div>

                {/* Photo Evidence */}
                {selectedSubmission.photos && selectedSubmission.photos.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-bold text-slate-900 text-[11px]">ภาพถ่ายปฏิบัติงาน:</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {selectedSubmission.photos.map((p, idx) => (
                        <div
                          key={p.id || idx}
                          onClick={() => setSelectedPhoto({ id: p.id, url: p.url, title: p.title, caption: p.caption, uploadedAt: '' })}
                          className="aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer bg-slate-100"
                        >
                          <img src={p.url} alt={p.title} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mentor Feedback */}
                {selectedSubmission.mentorComment && (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[10px] text-amber-900">
                    <div className="font-bold">ความคิดเห็นครูพี่เลี้ยง (คะแนน {selectedSubmission.mentorRating || 5.0}/5.0):</div>
                    <div className="italic mt-0.5">"{selectedSubmission.mentorComment}"</div>
                  </div>
                )}

                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="w-full py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          )}

          {/* Modal / Lightbox: Full Photo Preview */}
          {selectedPhoto && (
            <div className="absolute inset-0 bg-black/90 z-50 flex flex-col justify-center p-3">
              <div className="relative max-w-full space-y-2">
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/40 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="rounded-2xl overflow-hidden border border-white/20 max-h-[60vh] bg-black flex items-center justify-center">
                  <img src={selectedPhoto.url} alt={selectedPhoto.title} className="max-h-[60vh] w-auto object-contain" />
                </div>
                <div className="text-white text-center">
                  <div className="font-bold text-xs">{selectedPhoto.title || 'ภาพถ่ายหลักฐาน'}</div>
                  {selectedPhoto.caption && (
                    <div className="text-[10px] text-slate-300 mt-0.5">{selectedPhoto.caption}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Mobile Navigation Bar */}
          <div className="bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-around text-[10px] font-medium text-slate-500 shrink-0">
            <button
              onClick={() => {
                setActiveTab('home');
                if (currentRole === 'teacher') setTeacherSubTab('schedule');
              }}
              className={`flex flex-col items-center gap-0.5 cursor-pointer ${
                activeTab === 'home' ? 'text-sky-600 font-bold' : 'hover:text-slate-800'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>{currentRole === 'student' ? 'หน้าแรก' : 'แผนวันนี้'}</span>
            </button>
            <button
              onClick={() => {
                if (currentRole === 'student') {
                  setActiveTab('student');
                } else {
                  setActiveTab('student');
                  setTeacherSubTab('companies');
                }
              }}
              className={`flex flex-col items-center gap-0.5 cursor-pointer ${
                activeTab === 'student' ? 'text-sky-600 font-bold' : 'hover:text-slate-800'
              }`}
            >
              {currentRole === 'student' ? <GraduationCap className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
              <span>{currentRole === 'student' ? 'ส่วนนักศึกษา' : 'ตารางสถานฯ'}</span>
            </button>
            <button
              onClick={currentRole === 'student' ? onOpenForm2 : () => onOpenForm3()}
              className="flex flex-col items-center gap-0.5 text-white bg-slate-900 rounded-full p-2 -mt-4 shadow-md hover:bg-slate-800 transition cursor-pointer"
              title={currentRole === 'student' ? 'ส่งบันทึกงานประจำสัปดาห์' : 'เปิดฟอร์มนิเทศก์'}
            >
              <Send className="w-4 h-4 text-amber-400" />
            </button>
            <button
              onClick={() => {
                if (currentRole === 'student') {
                  setActiveTab('history');
                } else {
                  setActiveTab('history');
                  setTeacherSubTab('map');
                }
              }}
              className={`flex flex-col items-center gap-0.5 cursor-pointer ${
                activeTab === 'history' ? 'text-sky-600 font-bold' : 'hover:text-slate-800'
              }`}
            >
              {currentRole === 'student' ? <History className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              <span>{currentRole === 'student' ? 'ประวัติ/ผลนิเทศก์' : 'แผนที่พิกัด'}</span>
            </button>
            <button
              onClick={onOpenSheetsModal}
              className={`flex flex-col items-center gap-0.5 cursor-pointer ${
                activeTab === 'help' ? 'text-sky-600 font-bold' : 'hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ชีตข้อมูล</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
