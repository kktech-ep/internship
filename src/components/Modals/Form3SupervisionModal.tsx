import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Save, 
  Calendar, 
  Clock, 
  Sparkles,
  Search,
  Users,
  Check,
  ChevronDown,
  ChevronUp,
  Building2,
  User,
  RotateCcw,
  FileSpreadsheet,
  GraduationCap,
  Camera,
  UploadCloud,
  Trash2,
  Eye,
  ExternalLink,
  Plus,
  Phone,
  Briefcase,
  AlertCircle,
  CheckSquare,
  Square,
  Layers,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { Student, Company, Form3SupervisionRecord, Form3Photo, SheetTeacher } from '../../types';
import { getAllLoginSheetStudents, getAllLoginSheetTeachers, normalizeTeacherKey } from '../../services/sheetAuthService';
import { StudentAvatar } from '../StudentAvatar';
import { 
  appendForm3ToGoogleSheet,
  appendBatchForm3ToGoogleSheet, 
  GOOGLE_SHEET_CONFIG,
  getLocalForm3Rows 
} from '../../services/googleSheetsService';
import { saveForm3SupervisionToFirestore } from '../../services/firestoreService';
import { getCachedAccessToken } from '../../services/authService';

interface Form3SupervisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  companies: Company[];
  selectedStudentId?: string;
  teacherName?: string;
  teacherEmail?: string;
  onSaveEvaluation?: (evaluationData: {
    studentId?: string;
    studentIds?: string[];
    score: number;
    grade: string;
    comment: string;
    mentorFeedback: string;
    safetyPassed: boolean;
    visitDate?: string;
    record?: Form3SupervisionRecord;
    records?: Form3SupervisionRecord[];
  }) => void;
  onOpenSheetsModal?: () => void;
}

// 4 Standard Vocational Supervision Photo Slots
interface PhotoSlotConfig {
  slotNumber: number;
  label: string;
  subLabel: string;
  defaultTitle: string;
  defaultCaption: string;
  sampleUrl: string;
}

const PHOTO_SLOTS: PhotoSlotConfig[] = [
  {
    slotNumber: 1,
    label: 'รูปที่ 1: ตรวจสอบการปฏิบัติงานจริง / ชิ้นงาน',
    subLabel: 'งานติดตั้ง เดินสาย ขันบัสบาร์ ตู้ MDB หรือระบบควบคุม',
    defaultTitle: 'ตรวจสอบการปฏิบัติงานจริงหน้างานและชิ้นงานระบบไฟฟ้า',
    defaultCaption: 'ตรวจสอบความเรียบร้อยของการเดินสายราง Wireway และการต่อขั้วสาย',
    sampleUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80'
  },
  {
    slotNumber: 2,
    label: 'รูปที่ 2: ถ่ายร่วมกับนักศึกษาและพี่เลี้ยงสถานประกอบการ',
    subLabel: 'ภาพถ่ายร่วมกับวิศวกรควบคุมงาน หรือหัวหน้าฝ่ายซ่อมบำรุง',
    defaultTitle: 'ถ่ายภาพร่วมกับนักศึกษาและพี่เลี้ยงสถานประกอบการ',
    defaultCaption: 'ประชุมสรุปแผนการฝึกอาชีพและแลกเปลี่ยนข้อเสนอแนะกับพี่เลี้ยง',
    sampleUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80'
  },
  {
    slotNumber: 3,
    label: 'รูปที่ 3: ตรวจสอบความปลอดภัย & อุปกรณ์ PPE',
    subLabel: 'หมวกนิรภัย แว่นตา ถุงมือกันไฟฟ้า รองเท้า ESD และป้าย Lockout',
    defaultTitle: 'ตรวจสอบอุปกรณ์ความปลอดภัย PPE และวินัยวิชาชีพ',
    defaultCaption: 'ตรวจเช็คความพร้อมของหมวก รองเท้านิรภัย และขั้นตอนตัดไฟปลอดภัย',
    sampleUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80'
  },
  {
    slotNumber: 4,
    label: 'รูปที่ 4: บรรยากาศฝึกงาน / ตรวจสมุดบันทึก ทว.04',
    subLabel: 'สมุดบันทึกงานรายวัน เอกสารลงเวลา หรือสภาพแวดล้อมหน้างาน',
    defaultTitle: 'ตรวจสอบสมุดบันทึกการฝึกงาน ทว.04 และเวลาปฏิบัติงาน',
    defaultCaption: 'ตรวจสอบการบันทึกงานรายวันและการลงนามรับรองของพี่เลี้ยง',
    sampleUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80'
  }
];

export const Form3SupervisionModal: React.FC<Form3SupervisionModalProps> = ({
  isOpen,
  onClose,
  students,
  companies,
  selectedStudentId,
  teacherName = 'นายทักษิณ โสภาปิยะ',
  teacherEmail = 'thaksinso@kktech.ac.th',
  onSaveEvaluation,
  onOpenSheetsModal
}) => {
  // Combine props students with complete records from Google Sheets "login" tab
  const allStudents = useMemo(() => {
    const list = [...students];
    const sheetStudents = getAllLoginSheetStudents();
    for (const std of sheetStudents) {
      if (!list.some(s => s.studentCode === std.studentCode || s.id === std.id)) {
        list.push(std);
      }
    }
    return list;
  }, [students]);

  // Group all students by Company from login sheet (ตาราง Company)
  const companyGroups = useMemo(() => {
    const map = new Map<string, Student[]>();
    allStudents.forEach(std => {
      const compName = (std.companyName || '').trim() || 'ยังไม่ระบุสถานประกอบการ';
      if (!map.has(compName)) {
        map.set(compName, []);
      }
      map.get(compName)!.push(std);
    });

    return Array.from(map.entries())
      .map(([name, stdList]) => ({
        name,
        students: stdList,
        count: stdList.length,
        department: stdList[0]?.companyRegistration?.department || '',
        mentorName: stdList[0]?.companyRegistration?.mentorName && stdList[0].companyRegistration.mentorName !== '-'
          ? stdList[0].companyRegistration.mentorName
          : '',
        mentorPhone: stdList[0]?.companyRegistration?.mentorPhone && stdList[0].companyRegistration.mentorPhone !== '-'
          ? stdList[0].companyRegistration.mentorPhone
          : ''
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [allStudents]);

  // Selection Mode: 'company' (เลือกตามสถานประกอบการ) or 'individual' (ค้นหารายบุคคล)
  const [selectionMode, setSelectionMode] = useState<'company' | 'individual'>('company');

  // Multi-Student Selection State: Array of selected student IDs
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(() => {
    const initId = selectedStudentId || (students[0]?.id) || 'std-68301040105';
    return [initId];
  });

  // Active Company Filter / Selection for Company mode
  const [activeCompanyName, setActiveCompanyName] = useState<string>('');

  // Keep selected students in sync when selectedStudentId changes from outside
  useEffect(() => {
    if (selectedStudentId) {
      setSelectedStudentIds(prev => {
        if (prev.includes(selectedStudentId)) return prev;
        return [selectedStudentId, ...prev];
      });

      const matchedStd = allStudents.find(s => s.id === selectedStudentId || s.studentCode === selectedStudentId);
      if (matchedStd?.companyName) {
        setActiveCompanyName(matchedStd.companyName);
      }
    }
  }, [selectedStudentId, isOpen, allStudents]);

  // Initialize active company once data is loaded
  useEffect(() => {
    if (!activeCompanyName && companyGroups.length > 0) {
      const firstValidComp = companyGroups.find(c => c.name !== 'ยังไม่ระบุสถานประกอบการ') || companyGroups[0];
      setActiveCompanyName(firstValidComp.name);
    }
  }, [companyGroups, activeCompanyName]);

  // List of full Student objects for all currently selected student IDs
  const selectedStudents = useMemo(() => {
    return selectedStudentIds
      .map(id => allStudents.find(s => s.id === id || s.studentCode === id))
      .filter(Boolean) as Student[];
  }, [allStudents, selectedStudentIds]);

  // Current primary student (for default display)
  const primaryStudent = useMemo(() => {
    return selectedStudents[0] || allStudents[0];
  }, [selectedStudents, allStudents]);

  // Students in currently active company
  const currentCompanyStudents = useMemo(() => {
    if (!activeCompanyName) return [];
    const group = companyGroups.find(c => c.name === activeCompanyName);
    return group ? group.students : [];
  }, [companyGroups, activeCompanyName]);

  // Search & Filter State for Individual Student Selector
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('all');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Workplace / Company fields (editable & auto-filled from company / students)
  const [companyName, setCompanyName] = useState('');
  const [companyDepartment, setCompanyDepartment] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [mentorPhone, setMentorPhone] = useState('');

  // Auto-fill workplace info whenever active company changes or when primary student changes
  useEffect(() => {
    if (activeCompanyName && activeCompanyName !== 'ยังไม่ระบุสถานประกอบการ') {
      const grp = companyGroups.find(c => c.name === activeCompanyName);
      setCompanyName(activeCompanyName);
      if (grp?.department) setCompanyDepartment(grp.department);
      if (grp?.mentorName) setMentorName(grp.mentorName);
      if (grp?.mentorPhone) setMentorPhone(grp.mentorPhone);
    } else if (primaryStudent) {
      setCompanyName(primaryStudent.companyName || 'การไฟฟ้าส่วนภูมิภาค สาขาขอนแก่น (PEA)');
      setCompanyDepartment(primaryStudent.companyRegistration?.department || 'แผนกติดตั้งและบำรุงรักษาระบบไฟฟ้า');
      setMentorName(primaryStudent.companyRegistration?.mentorName && primaryStudent.companyRegistration.mentorName !== '-' 
        ? primaryStudent.companyRegistration.mentorName 
        : 'วิศวกรผู้ควบคุมงาน');
      setMentorPhone(primaryStudent.companyRegistration?.mentorPhone || '081-987-6543');
    }
  }, [activeCompanyName, companyGroups, primaryStudent]);

  // Teachers from Google Sheets "login" tab & "data" tab
  const teachersFromSheet = useMemo(() => {
    return getAllLoginSheetTeachers();
  }, []);

  // Supervision Multi-Teacher Selection State: Array of selected teacher IDs
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>(() => {
    const matched = teachersFromSheet.find(t => 
      t.name === teacherName || 
      t.email === teacherEmail || 
      normalizeTeacherKey(t.name) === normalizeTeacherKey(teacherName)
    );
    return [matched?.id || teachersFromSheet[0]?.id || 'tch-thaksin'];
  });

  // Keep primary teacher synced if teacher props change from outside
  useEffect(() => {
    if (teacherName || teacherEmail) {
      const match = teachersFromSheet.find(t => 
        (teacherName && (t.name === teacherName || normalizeTeacherKey(t.name) === normalizeTeacherKey(teacherName))) ||
        (teacherEmail && t.email === teacherEmail)
      );
      if (match) {
        setSelectedTeacherIds(prev => {
          if (prev.includes(match.id)) return prev;
          return [match.id, ...prev];
        });
      }
    }
  }, [teacherName, teacherEmail, isOpen, teachersFromSheet]);

  const [teacherSearchQuery, setTeacherSearchQuery] = useState<string>('');

  // Toggle selection of a teacher
  const handleToggleTeacher = (tId: string) => {
    setSelectedTeacherIds(prev => {
      if (prev.includes(tId)) {
        return prev.filter(id => id !== tId);
      } else {
        return [...prev, tId];
      }
    });
  };

  // Select all filtered teachers
  const handleSelectAllTeachers = () => {
    const ids = filteredTeachers.map(t => t.id);
    setSelectedTeacherIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  // Clear all selected teachers
  const handleClearAllTeachers = () => {
    setSelectedTeacherIds([]);
  };

  // Quick select teachers who teach in the primary student's room (e.g. สอฟ.2/5)
  const handleSelectRoomTeachers = () => {
    const room = primaryStudent?.room;
    if (!room) return;
    const roomTeachers = teachersFromSheet.filter(t => t.rooms?.includes(room));
    if (roomTeachers.length > 0) {
      const rIds = roomTeachers.map(t => t.id);
      setSelectedTeacherIds(prev => Array.from(new Set([...prev, ...rIds])));
    }
  };

  // Filtered teachers list based on search input
  const filteredTeachers = useMemo(() => {
    const q = teacherSearchQuery.trim().toLowerCase();
    if (!q) return teachersFromSheet;
    return teachersFromSheet.filter(t => 
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q) ||
      t.rooms?.some(r => r.toLowerCase().includes(q)) ||
      t.subjects?.some(s => s.toLowerCase().includes(q))
    );
  }, [teachersFromSheet, teacherSearchQuery]);

  // Selected full SheetTeacher objects
  const selectedTeachers = useMemo(() => {
    return selectedTeacherIds
      .map(id => teachersFromSheet.find(t => t.id === id))
      .filter(Boolean) as SheetTeacher[];
  }, [teachersFromSheet, selectedTeacherIds]);

  // Combined string for teacher names & emails (comma-separated for Form_3 spreadsheet & displays)
  const combinedTeacherNames = useMemo(() => {
    if (selectedTeachers.length === 0) return teacherName;
    return selectedTeachers.map(t => t.name).join(', ');
  }, [selectedTeachers, teacherName]);

  const combinedTeacherEmails = useMemo(() => {
    if (selectedTeachers.length === 0) return teacherEmail;
    return selectedTeachers.map(t => t.email).join(', ');
  }, [selectedTeachers, teacherEmail]);

  // Evaluation Fields
  const [score, setScore] = useState(19.5);
  const [grade, setGrade] = useState('ดีเยี่ยม (A)');
  const [safetyPassed, setSafetyPassed] = useState(true);
  const [mentorFeedback, setMentorFeedback] = useState('นักศึกษาปฏิบัติงานตรงต่อเวลา มีความรอบคอบในการทำงานกับระบบไฟฟ้าแรงดันสูง');
  const [comment, setComment] = useState('ตรวจหลักฐานภาพถ่ายครบถ้วน งานต่อสายและขันบัสบาร์ถูกต้องตามหลักวิศวกรรมไฟฟ้า');
  
  // Date and Time with calendar selection
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [selectedTime, setSelectedTime] = useState('13:30');
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Photos State: 4 slots
  const [photos, setPhotos] = useState<Record<number, Form3Photo | null>>({
    1: null,
    2: null,
    3: null,
    4: null
  });

  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedRecords, setSavedRecords] = useState<Form3SupervisionRecord[] | null>(null);
  const [sheetSyncStatus, setSheetSyncStatus] = useState<string>('');

  // Available room groups from student data
  const availableRooms = useMemo(() => {
    const rooms = new Set<string>();
    allStudents.forEach(s => {
      if (s.room && s.room.trim()) rooms.add(s.room.trim());
    });
    return Array.from(rooms).sort();
  }, [allStudents]);

  // Filter matching students for individual search
  const matchingStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allStudents.filter(s => {
      if (selectedRoomFilter !== 'all' && (s.room || '').trim() !== selectedRoomFilter) {
        return false;
      }
      if (!q) return true;
      const codeMatch = (s.studentCode || '').toLowerCase().includes(q);
      const nameMatch = (s.name || '').toLowerCase().includes(q);
      const compMatch = (s.companyName || '').toLowerCase().includes(q);
      const roomMatch = (s.room || '').toLowerCase().includes(q);
      return codeMatch || nameMatch || compMatch || roomMatch;
    });
  }, [allStudents, searchQuery, selectedRoomFilter]);

  // Filter company list in company search
  const filteredCompanyGroups = useMemo(() => {
    const q = companySearchQuery.trim().toLowerCase();
    if (!q) return companyGroups;
    return companyGroups.filter(c => c.name.toLowerCase().includes(q));
  }, [companyGroups, companySearchQuery]);

  if (!isOpen) return null;

  // Toggle student selection
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      if (prev.includes(studentId)) {
        // Remove if more than 1, or remove completely
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  // Select all students at current company
  const handleSelectAllAtCurrentCompany = () => {
    const companyStudentIds = currentCompanyStudents.map(s => s.id);
    setSelectedStudentIds(prev => {
      const merged = new Set([...prev, ...companyStudentIds]);
      return Array.from(merged);
    });
  };

  // Deselect all students at current company
  const handleDeselectAllAtCurrentCompany = () => {
    const companyStudentIds = new Set(currentCompanyStudents.map(s => s.id));
    setSelectedStudentIds(prev => prev.filter(id => !companyStudentIds.has(id)));
  };

  // Select all in current search results
  const handleSelectAllInSearch = () => {
    const searchStudentIds = matchingStudents.map(s => s.id);
    setSelectedStudentIds(prev => {
      const merged = new Set([...prev, ...searchStudentIds]);
      return Array.from(merged);
    });
  };

  // Clear all selections
  const handleClearAllSelections = () => {
    setSelectedStudentIds([]);
  };

  const handleScoreChange = (newScore: number) => {
    setScore(newScore);
    if (newScore >= 18) setGrade('ดีเยี่ยม (A)');
    else if (newScore >= 15) setGrade('ดีมาก (B+)');
    else if (newScore >= 12) setGrade('ปานกลาง (B)');
    else setGrade('ผ่านเกณฑ์ขั้นต่ำ (C)');
  };

  const getThaiDateFormatted = (dateStr: string, timeStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const beYear = year + 543;
    return `${day} ${thaiMonths[month - 1]} ${beYear} (${timeStr || '00:00'} น.)`;
  };

  // Image Upload & Canvas Compression Handler for a specific slot
  const handlePhotoFileUpload = (slotNumber: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const slotDef = PHOTO_SLOTS.find(s => s.slotNumber === slotNumber);
    const reader = new FileReader();

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 720; // Safe size for Firestore 1MB doc limit & sheets
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.72);
          setPhotos(prev => ({
            ...prev,
            [slotNumber]: {
              id: `p-${slotNumber}-${Date.now()}`,
              title: slotDef?.defaultTitle || `รูปถ่ายการนิเทศที่ ${slotNumber}`,
              caption: slotDef?.defaultCaption || '',
              url: compressed,
              uploadedAt: new Date().toLocaleString('th-TH')
            }
          }));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = (slotNumber: number) => {
    setPhotos(prev => ({
      ...prev,
      [slotNumber]: null
    }));
  };

  const handleUpdatePhotoCaption = (slotNumber: number, caption: string) => {
    setPhotos(prev => {
      const existing = prev[slotNumber];
      if (!existing) return prev;
      return {
        ...prev,
        [slotNumber]: {
          ...existing,
          caption
        }
      };
    });
  };

  // Load sample photos preset (instantly fills 4 standard vocational photos)
  const handleLoadSamplePhotos = () => {
    const newPhotos: Record<number, Form3Photo> = {};
    PHOTO_SLOTS.forEach(slot => {
      newPhotos[slot.slotNumber] = {
        id: `sample-p-${slot.slotNumber}-${Date.now()}`,
        title: slot.defaultTitle,
        caption: slot.defaultCaption,
        url: slot.sampleUrl,
        uploadedAt: new Date().toLocaleString('th-TH')
      };
    });
    setPhotos(newPhotos);
  };

  // Count active photos
  const uploadedPhotosCount = Object.values(photos).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedStudents.length === 0) {
      alert('กรุณาเลือกนักศึกษาอย่างน้อย 1 คน เพื่อบันทึกผลการนิเทศ');
      return;
    }

    if (selectedTeachers.length === 0) {
      alert('กรุณาเลือกครูนิเทศก์หรือครูประจำวิชาอย่างน้อย 1 คน');
      return;
    }

    setIsSubmitting(true);

    const formattedVisitDateTime = getThaiDateFormatted(selectedDate, selectedTime);
    const activePhotosList: Form3Photo[] = Object.values(photos).filter(Boolean) as Form3Photo[];

    // Construct a Form3SupervisionRecord for each selected student
    const recordsToSave: Form3SupervisionRecord[] = selectedStudents.map((std, idx) => ({
      id: `f3-${std.studentCode || 'std'}-${Date.now()}-${idx}`,
      timestamp: new Date().toLocaleString('th-TH'),
      visitDate: formattedVisitDateTime,
      visitTime: selectedTime,
      studentId: std.id,
      studentCode: std.studentCode || '',
      studentName: std.name || '',
      studentRoom: std.room || 'สอฟ.2/8',
      levelDepartment: `${std.level || 'ปวส.2'} ${std.department || 'แผนกช่างไฟฟ้ากำลัง'}`,
      companyName: companyName.trim() || std.companyName || 'ยังไม่ระบุ',
      companyDepartment: companyDepartment.trim() || std.companyRegistration?.department || 'แผนกปฏิบัติการระบบไฟฟ้า',
      teacherName: combinedTeacherNames.trim() || teacherName,
      teacherEmail: combinedTeacherEmails.trim() || teacherEmail,
      mentorName: mentorName.trim() || std.companyRegistration?.mentorName || 'วิศวกรผู้ควบคุมงาน',
      mentorFeedback: mentorFeedback.trim(),
      safetyPassed: safetyPassed,
      score: score,
      grade: grade,
      teacherComment: comment.trim(),
      photos: activePhotosList,
      status: 'บันทึกสำเร็จ'
    }));

    try {
      // 1. Save all records in batch to Google Sheets Form_3 tab & Local Storage
      const token = getCachedAccessToken();
      const sheetResult = await appendBatchForm3ToGoogleSheet(recordsToSave, token);
      setSheetSyncStatus(sheetResult.message);

      // 2. Save each record to Firebase Firestore collection /form3_supervisions/{recordId}
      for (const rec of recordsToSave) {
        await saveForm3SupervisionToFirestore(rec);
      }

      // 3. Trigger parent callback to update student weekly submissions
      if (onSaveEvaluation) {
        onSaveEvaluation({
          studentIds: recordsToSave.map(r => r.studentId),
          studentId: recordsToSave[0]?.studentId,
          score: score,
          grade: grade,
          comment: comment.trim(),
          mentorFeedback: mentorFeedback.trim(),
          safetyPassed: safetyPassed,
          visitDate: formattedVisitDateTime,
          records: recordsToSave,
          record: recordsToSave[0]
        });
      }

      setSavedRecords(recordsToSave);
    } catch (err) {
      console.error('Error saving Form 3 supervision batch:', err);
      setSheetSyncStatus(`บันทึกข้อมูลนักศึกษา ${recordsToSave.length} คน เรียบร้อยในระบบออฟไลน์`);
      setSavedRecords(recordsToSave);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNewRecord = () => {
    setSavedRecords(null);
    setPhotos({ 1: null, 2: null, 3: null, 4: null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-['Prompt',sans-serif]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-sm shadow-md text-white">
              <Camera className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">
                  ระบบบันทึกรายงานการนิเทศ & แนบรูปภาพ
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  ภาคเรียนที่ 2/2569
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 font-mono">
                  ตารางบันทึกการนิเทศ & ข้อมูลสถานประกอบการ
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>บันทึกรายงานการนิเทศ & ประเมินสมรรถนะวิชาชีพ</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-normal bg-white/10 text-emerald-300">
                  เลือกหลายคน / ตามสถานประกอบการ
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {savedRecords && savedRecords.length > 0 ? (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-center animate-in fade-in duration-200">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                บันทึกผลการนิเทศและรูปถ่ายลงระบบสำเร็จ!
              </h3>
              <p className="text-xs text-slate-600 max-w-lg mx-auto mt-1 leading-relaxed">
                {sheetSyncStatus || `บันทึกข้อมูลนักศึกษาทั้งหมด ${savedRecords.length} คน พร้อมรูปถ่ายการนิเทศ ${savedRecords[0]?.photos.length || 0} รูปลงใน Google Spreadsheet และบันทึกข้อมูลเรียบร้อยแล้ว`}
              </p>
            </div>

            {/* Saved Summary Card: List of all evaluated students */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left max-w-2xl mx-auto space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800 text-xs">
                    นักศึกษาที่ได้รับการประเมินนิเทศ ({savedRecords.length} คน):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-600 text-sm">{savedRecords[0]?.score.toFixed(1)} / 20</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    {savedRecords[0]?.grade}
                  </span>
                </div>
              </div>

              {/* List of saved students */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {savedRecords.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{r.studentName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {r.studentCode} • กลุ่ม {r.studentRoom}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                      สำเร็จ
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-slate-600 text-[11px] pt-2 border-t border-slate-200/80">
                <div>
                  <span className="text-slate-400 block">สถานประกอบการ:</span>
                  <strong className="text-slate-800">{savedRecords[0]?.companyName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">วันและเวลานิเทศก์:</span>
                  <strong className="text-slate-800">{savedRecords[0]?.visitDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">ครูนิเทศก์ผู้ประเมิน:</span>
                  <strong className="text-slate-800">{savedRecords[0]?.teacherName}</strong>
                  {savedRecords[0]?.teacherEmail && (
                    <span className="block text-[10px] text-slate-500 font-mono">
                      {savedRecords[0].teacherEmail}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block">พี่เลี้ยงสถานประกอบการ:</span>
                  <strong className="text-slate-800">{savedRecords[0]?.mentorName}</strong>
                </div>
              </div>

              {/* Photos Gallery Preview */}
              {savedRecords[0]?.photos && savedRecords[0].photos.length > 0 && (
                <div className="pt-3 border-t border-slate-200/80 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-sky-600" />
                    <span>รูปถ่ายการนิเทศที่บันทึกร่วมกัน ({savedRecords[0].photos.length} รูป):</span>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {savedRecords[0].photos.map((p, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xs group relative">
                        <img src={p.url} alt={p.title} className="w-full h-20 object-cover" />
                        <div className="p-1.5 text-[9px] text-slate-600 truncate bg-white font-medium">
                          {p.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={GOOGLE_SHEET_CONFIG.getForm3SheetUrl()}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>เปิดแผ่นงานบันทึกการนิเทศใน Google Sheets</span>
                <ExternalLink className="w-3 h-3 text-white/70" />
              </a>

              {onOpenSheetsModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSheetsModal();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>ดูตารางข้อมูลในระบบ</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleResetForNewRecord}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>บันทึกการนิเทศกลุ่มใหม่</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
            
            {/* 1. STUDENT MULTI-SELECTION & WORKPLACE GROUPING */}
            <div className="rounded-2xl border-2 border-sky-500/20 bg-slate-50/70 p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-900 text-xs">
                      1. ค้นหาและเลือกนักศึกษาที่เข้ารับการนิเทศ (เลือกได้มากกว่า 1 คน)
                    </label>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                      <span>อ้างอิงจาก Google Sheets แผ่นงาน <strong className="font-mono text-emerald-700">Login</strong> ในตาราง <strong className="text-sky-800 font-semibold">Company</strong></span>
                    </span>
                  </div>
                </div>

                {/* Mode Selector Buttons */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setSelectionMode('company')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      selectionMode === 'company'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>เลือกตามสถานประกอบการ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode('individual');
                      setTimeout(() => searchInputRef.current?.focus(), 80);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      selectionMode === 'individual'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>ค้นหารายบุคคล</span>
                  </button>
                </div>
              </div>

              {/* MODE 1: SELECT BY COMPANY / WORKPLACE (นักศึกษาฝึกงานในที่เดียวกัน) */}
              {selectionMode === 'company' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span>เลือกสถานประกอบการ (ตาราง Company ในแผ่นงาน Login):</span>
                      </label>
                      <span className="text-[10px] text-slate-500">
                        มีทั้งหมด {companyGroups.length} สถานประกอบการ
                      </span>
                    </div>

                    {/* Company Dropdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <select
                          value={activeCompanyName}
                          onChange={(e) => setActiveCompanyName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-sky-500 cursor-pointer"
                        >
                          {companyGroups.map(c => (
                            <option key={c.name} value={c.name}>
                              🏢 {c.name} ({c.count} คน)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Filter/Search company input */}
                      <div>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            value={companySearchQuery}
                            onChange={(e) => setCompanySearchQuery(e.target.value)}
                            placeholder="ค้นหาชื่อบริษัท..."
                            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs text-slate-700 bg-white focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Filtered company pills */}
                    {companySearchQuery && (
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                        {filteredCompanyGroups.slice(0, 8).map(c => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => {
                              setActiveCompanyName(c.name);
                              setCompanySearchQuery('');
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition cursor-pointer ${
                              activeCompanyName === c.name
                                ? 'bg-sky-600 text-white border-sky-600'
                                : 'bg-slate-50 text-slate-700 hover:bg-sky-50 border-slate-200'
                            }`}
                          >
                            {c.name} ({c.count} คน)
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Students in Current Company Section */}
                  <div className="bg-sky-50/50 p-3.5 rounded-xl border border-sky-200/80 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-sky-600" />
                          <span>นักศึกษาที่ฝึกงานในสถานที่เดียวกัน ({currentCompanyStudents.length} คน):</span>
                        </span>
                        <span className="font-mono text-[10px] text-sky-800 bg-sky-100 px-2 py-0.5 rounded-md font-bold">
                          {activeCompanyName}
                        </span>
                      </div>

                      {/* Quick Select All / Deselect All for this company */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSelectAllAtCurrentCompany}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition cursor-pointer flex items-center gap-1"
                          title="เลือกนักศึกษาทั้งหมดในสถานประกอบการนี้พร้อมกัน"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>เลือกทั้งหมดในที่นี้ ({currentCompanyStudents.length} คน)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAllAtCurrentCompany}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                        >
                          ยกเลิกในที่นี้
                        </button>
                      </div>
                    </div>

                    {/* Students Grid at this company */}
                    {currentCompanyStudents.length === 0 ? (
                      <p className="text-slate-500 text-center py-3 text-xs">
                        ไม่พบข้อมูลนักศึกษาที่ระบุสถานประกอบการนี้
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentCompanyStudents.map(std => {
                          const isSelected = selectedStudentIds.includes(std.id);
                          return (
                            <div
                              key={std.id}
                              onClick={() => handleToggleStudent(std.id)}
                              className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-white border-sky-500 ring-2 ring-sky-400/20 shadow-xs'
                                  : 'bg-white/80 hover:bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition ${
                                  isSelected ? 'bg-sky-600 text-white' : 'border border-slate-300 bg-white text-transparent'
                                }`}>
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                                <StudentAvatar
                                  student={std}
                                  size="sm"
                                  showUploadButton={false}
                                  className="shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 text-xs truncate">
                                    {std.name}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                                    <span>รหัส {std.studentCode}</span>
                                    {std.room && <span>• {std.room}</span>}
                                  </div>
                                </div>
                              </div>

                              {isSelected ? (
                                <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded shrink-0">
                                  เลือกแล้ว
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                                  + คลิกเลือก
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MODE 2: INDIVIDUAL SEARCH & FILTER (ค้นหารายบุคคล / ค้นหาอิสระ) */}
              {selectionMode === 'individual' && (
                <div className="space-y-2.5 animate-in fade-in duration-150">
                  <div className="bg-white rounded-xl border border-sky-300/70 shadow-xs p-3 space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5 text-sky-600" />
                          <span>พิมพ์ค้นหาจาก รหัสนักศึกษา หรือ ชื่อ-สกุล หรือ สถานประกอบการ (แผ่นงาน Login)</span>
                        </span>
                        <span className="text-[10px] text-slate-400">ค้นหาได้หลายคน</span>
                      </label>

                      <div className="relative flex items-center">
                        <Search className="w-4 h-4 text-sky-600 absolute left-3 pointer-events-none" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="พิมพ์ค้นหา เช่น 68301040105 หรือ เดชฎากรณ์, การไฟฟ้า, ซีพี..."
                          className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-hidden bg-sky-50/20"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                            title="ล้างคำค้นหา"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Room Quick Filters & Bulk Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                      <div className="flex flex-wrap items-center gap-1 text-[11px]">
                        <span className="text-slate-500 text-[10px] mr-1 font-medium">กลุ่มห้อง:</span>
                        <button
                          type="button"
                          onClick={() => setSelectedRoomFilter('all')}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition cursor-pointer ${
                            selectedRoomFilter === 'all'
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          ทั้งหมด ({allStudents.length})
                        </button>
                        {availableRooms.map((room) => {
                          const countInRoom = allStudents.filter(s => (s.room || '').trim() === room).length;
                          return (
                            <button
                              key={room}
                              type="button"
                              onClick={() => setSelectedRoomFilter(room)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition cursor-pointer ${
                                selectedRoomFilter === room
                                  ? 'bg-sky-600 text-white font-bold'
                                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-100'
                              }`}
                            >
                              {room} ({countInRoom})
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSelectAllInSearch}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 hover:bg-sky-200 cursor-pointer"
                        >
                          เลือกทุกคนในผลการค้นหา ({matchingStudents.length})
                        </button>
                      </div>
                    </div>

                    {/* Search Results Scrollable List */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                      {matchingStudents.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 space-y-1">
                          <p>ไม่พบข้อมูลนักศึกษาที่ตรงกับคำค้นหา "{searchQuery}"</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedRoomFilter('all');
                            }}
                            className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-medium cursor-pointer"
                          >
                            แสดงทั้งหมด ({allStudents.length} คน)
                          </button>
                        </div>
                      ) : (
                        matchingStudents.map((std) => {
                          const isSelected = selectedStudentIds.includes(std.id);
                          return (
                            <div
                              key={std.id}
                              onClick={() => handleToggleStudent(std.id)}
                              className={`w-full text-left p-2.5 transition flex items-center justify-between gap-3 cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-sky-50/80 hover:bg-sky-100/90 text-sky-950 font-medium border-l-4 border-l-sky-600'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition ${
                                  isSelected ? 'bg-sky-600 text-white' : 'border border-slate-300 bg-white text-transparent'
                                }`}>
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                                <StudentAvatar
                                  student={std}
                                  size="sm"
                                  showUploadButton={false}
                                  className="shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 text-xs truncate">{std.name}</span>
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-800">
                                      {std.studentCode}
                                    </span>
                                    {std.room && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 font-mono">
                                        {std.room}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                    🏢 {std.companyName || 'ยังไม่ระบุสถานประกอบการ'}
                                  </div>
                                </div>
                              </div>
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-600 text-white shrink-0">
                                  <Check className="w-3 h-3" />
                                  <span>เลือกแล้ว</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded shrink-0">
                                  + คลิกเพื่อเลือก
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SELECTED STUDENTS BADGE & CHIP SUMMARY BAR */}
              <div className="bg-white p-3 rounded-xl border border-sky-300/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-sky-600" />
                    <span className="font-bold text-slate-900 text-xs">
                      นักศึกษาที่เลือกรับการนิเทศในครั้งนี้:
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                      {selectedStudents.length} คน
                    </span>
                  </div>
                  {selectedStudents.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllSelections}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                    >
                      ล้างการเลือกทั้งหมด
                    </button>
                  )}
                </div>

                {selectedStudents.length === 0 ? (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ยังไม่ได้เลือกนักศึกษา กรุณาคลิกเลือกนักศึกษาจากรายการด้านบนอย่างน้อย 1 คน</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {selectedStudents.map(std => (
                      <div
                        key={std.id}
                        className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-xs transition"
                      >
                        <StudentAvatar
                          student={std}
                          size="sm"
                          showUploadButton={false}
                          className="shrink-0 !w-5 !h-5 text-[9px]"
                        />
                        <div className="flex items-center gap-1">
                          <span className="font-bold">{std.name}</span>
                          <span className="font-mono text-[10px] text-slate-500 font-medium">({std.studentCode})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleStudent(std.id)}
                          className="p-0.5 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition cursor-pointer ml-0.5"
                          title="ลบนักศึกษาคนนี้ออกจากการเลือก"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. WORKPLACE / COMPANY SELECTION & DETAILS */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-900 text-xs">
                      2. ข้อมูลสถานประกอบการที่เข้ารับการนิเทศ
                    </label>
                    <span className="text-[10px] text-slate-500">
                      ข้อมูลจะถูกนำไปบันทึกสำหรับนักศึกษาที่เลือกทุกคน ({selectedStudents.length} คน)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (primaryStudent) {
                        setCompanyName(primaryStudent.companyName || '');
                        setCompanyDepartment(primaryStudent.companyRegistration?.department || '');
                        setMentorName(primaryStudent.companyRegistration?.mentorName || '');
                        setMentorPhone(primaryStudent.companyRegistration?.mentorPhone || '');
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-sky-700 hover:bg-sky-50 border border-sky-200 bg-white cursor-pointer inline-flex items-center gap-1"
                    title="คืนค่าเดิมจากประวัตินักศึกษา"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>ใช้ข้อมูลเดิมของนักศึกษา</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Company Name Selector or Input */}
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 text-[11px]">
                    ชื่อสถานประกอบการ:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="เช่น การไฟฟ้าส่วนภูมิภาค สาขาขอนแก่น (PEA)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      required
                    />
                  </div>
                  {/* Quick Pick from registered companies */}
                  {companies.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px]">
                      <span className="text-slate-400">เลือกด่วน:</span>
                      {companies.slice(0, 4).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCompanyName(c.name);
                            if (c.contactPerson) setMentorName(c.contactPerson);
                            if (c.phone) setMentorPhone(c.phone);
                            if (c.jobScope) setCompanyDepartment(c.jobScope);
                          }}
                          className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 truncate max-w-[140px] cursor-pointer"
                          title={c.name}
                        >
                          {c.shortName || c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Department / Job Scope */}
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 text-[11px]">
                    แผนก / ฝ่าย / ลักษณะงานที่นิเทศ:
                  </label>
                  <input
                    type="text"
                    value={companyDepartment}
                    onChange={(e) => setCompanyDepartment(e.target.value)}
                    placeholder="เช่น ฝ่ายวิศวกรรมไฟฟ้า & งานควบคุมมอเตอร์ MDB"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Mentor Name */}
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 text-[11px] flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ชื่อพี่เลี้ยง / ผู้ควบคุมงานสถานประกอบการ:</span>
                  </label>
                  <input
                    type="text"
                    value={mentorName}
                    onChange={(e) => setMentorName(e.target.value)}
                    placeholder="เช่น นายเอกชัย พลอยงาม (วิศวกรไฟฟ้า 6)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    required
                  />
                </div>

                {/* Mentor Phone */}
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 text-[11px] flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>เบอร์โทรศัพท์ติดต่อพี่เลี้ยง / สถานประกอบการ:</span>
                  </label>
                  <input
                    type="text"
                    value={mentorPhone}
                    onChange={(e) => setMentorPhone(e.target.value)}
                    placeholder="เช่น 081-987-6543"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* 3. SUPERVISING TEACHERS / COURSE INSTRUCTORS (MULTI-SELECT FROM LOGIN SHEET) */}
            <div className="rounded-2xl border-2 border-indigo-500/25 bg-slate-50/70 p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="block font-bold text-slate-900 text-xs">
                        3. ครูนิเทศก์ / ครูประจำวิชา (เลือกได้มากกว่า 1 คน)
                      </label>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                        เลือกแล้ว {selectedTeachers.length} ท่าน
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                      <span>อ้างอิงบัญชีผู้ใช้จาก Google Sheets แผ่นงาน <strong className="font-mono text-emerald-700">Login</strong> และ <strong className="font-mono text-sky-700">Data</strong></span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {primaryStudent?.room && (
                    <button
                      type="button"
                      onClick={handleSelectRoomTeachers}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 bg-white cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                      title={`เลือกครูประจำวิชาของห้อง ${primaryStudent.room}`}
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>เลือกครูห้อง {primaryStudent.room}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSelectAllTeachers}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 bg-white cursor-pointer inline-flex items-center gap-1"
                  >
                    <CheckSquare className="w-3 h-3 text-indigo-600" />
                    <span>เลือกทั้งหมด ({teachersFromSheet.length})</span>
                  </button>
                  {selectedTeachers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllTeachers}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 bg-white cursor-pointer"
                    >
                      ล้างการเลือก
                    </button>
                  )}
                </div>
              </div>

              {/* Selected Teachers Chips Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <span>ครูนิเทศก์และผู้ประเมินที่ร่วมลงนาม:</span>
                    <span className="text-indigo-700 font-mono font-bold">({selectedTeachers.length} ท่าน)</span>
                  </span>
                </div>

                {selectedTeachers.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ยังไม่ได้เลือกครูนิเทศก์ กรุณาคลิกเลือกครูนิเทศก์หรือครูประจำวิชาจากรายการด้านล่างอย่างน้อย 1 ท่าน</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200/90 max-h-36 overflow-y-auto">
                    {selectedTeachers.map((t, idx) => (
                      <div
                        key={t.id}
                        className="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-xl bg-white border border-indigo-300 shadow-2xs text-xs text-slate-800 group hover:border-indigo-400 transition"
                      >
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 leading-tight truncate">
                            {t.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono leading-tight truncate">
                            {t.status}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleTeacher(t.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition cursor-pointer"
                          title="นำครูท่านนี้ออกจากการเลือก"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Search and Teachers Grid */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={teacherSearchQuery}
                      onChange={(e) => setTeacherSearchQuery(e.target.value)}
                      placeholder="พิมพ์ค้นหาชื่อครู, อีเมล, วิชา, หรือกลุ่มห้อง เช่น ทักษิณ, พุฒิพงศ์, สอฟ.2/5..."
                      className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    {teacherSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTeacherSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    แสดง {filteredTeachers.length} จาก {teachersFromSheet.length} ท่าน (คลิกเพื่อเลือกหรือยกเลิก)
                  </span>
                </div>

                {/* Teachers Checkbox Card Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {filteredTeachers.map(t => {
                    const isSelected = selectedTeacherIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleToggleTeacher(t.id)}
                        className={`p-3 rounded-xl border transition flex items-start gap-2.5 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-indigo-50/90 border-indigo-400 text-indigo-950 shadow-2xs ring-2 ring-indigo-200'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="pt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="font-bold text-xs truncate text-slate-900">
                              {t.name}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium shrink-0 ${
                              isSelected ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {t.status}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                            {t.email}
                          </div>

                          {t.rooms && t.rooms.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <span className="text-[9px] text-slate-400">ห้อง:</span>
                              {t.rooms.map(rm => (
                                <span key={rm} className="px-1 py-0.1 rounded bg-slate-100 text-slate-700 font-mono text-[9px]">
                                  {rm}
                                </span>
                              ))}
                            </div>
                          )}

                          {t.subjects && t.subjects.length > 0 && (
                            <div className="text-[9px] text-slate-500 truncate mt-0.5 line-clamp-1" title={t.subjects.join(', ')}>
                              วิชา: {t.subjects[0]}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. SUPERVISION PHOTOS: 3-4 PHOTOS SECTION */}
            <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/20 p-4 sm:p-5 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                        4. บันทึกรูปการนิเทศ (3 - 4 รูป)
                      </h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                        uploadedPhotosCount >= 3 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        แนบแล้ว {uploadedPhotosCount}/4 รูป {uploadedPhotosCount >= 3 ? '(ครบเกณฑ์ สอศ.)' : '(แนะนำ 3-4 รูป)'}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5">
                      บันทึกภาพถ่ายหลักฐานการลงพื้นที่นิเทศนำเก็บไว้ในฐานข้อมูลและการนิเทศออนไลน์
                    </p>
                  </div>
                </div>

                {/* Preset sample photo button */}
                <button
                  type="button"
                  onClick={handleLoadSamplePhotos}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold shadow-2xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  title="ใส่รูปภาพตัวอย่างการนิเทศ 4 รูปสำหรับทดสอบระบบ"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>โหลดรูปตัวอย่างการนิเทศ 4 รูป</span>
                </button>
              </div>

              {/* 4 Photo Upload Slots Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PHOTO_SLOTS.map((slot) => {
                  const currentPhoto = photos[slot.slotNumber];
                  const fileInputId = `photo-upload-slot-${slot.slotNumber}`;

                  return (
                    <div 
                      key={slot.slotNumber}
                      className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between space-y-2 relative group hover:border-emerald-400 transition"
                    >
                      {/* Slot Header */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] flex items-center justify-center font-bold">
                              {slot.slotNumber}
                            </span>
                            <span>{slot.label.split(':')[0]}</span>
                          </span>
                          {currentPhoto ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> พร้อม
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-mono">ว่าง</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1" title={slot.subLabel}>
                          {slot.subLabel}
                        </p>
                      </div>

                      {/* Photo Thumbnail or Upload Placeholder */}
                      {currentPhoto ? (
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-4/3 group/img">
                          <img
                            src={currentPhoto.url}
                            alt={currentPhoto.title}
                            className="w-full h-full object-cover"
                          />
                          {/* Image Action Overlay */}
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center gap-2 p-2">
                            <button
                              type="button"
                              onClick={() => setActivePreviewImage(currentPhoto.url)}
                              className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white text-xs transition cursor-pointer"
                              title="ดูรูปขยาย"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <label
                              htmlFor={fileInputId}
                              className="p-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 text-xs transition cursor-pointer"
                              title="เปลี่ยนรูปภาพ"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(slot.slotNumber)}
                              className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs transition cursor-pointer"
                              title="ลบรูปภาพนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor={fileInputId}
                          className="rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 aspect-4/3 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition"
                        >
                          <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1 transition" />
                          <span className="font-semibold text-slate-700 text-[11px] group-hover:text-emerald-700">
                            คลิกเพื่ออัปโหลด
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            กล้อง / แกลเลอรี
                          </span>
                        </label>
                      )}

                      {/* Hidden File Input */}
                      <input
                        id={fileInputId}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoFileUpload(slot.slotNumber, e)}
                        className="hidden"
                      />

                      {/* Caption / Note input */}
                      <div>
                        <input
                          type="text"
                          value={currentPhoto?.caption ?? slot.defaultCaption}
                          onChange={(e) => handleUpdatePhotoCaption(slot.slotNumber, e.target.value)}
                          placeholder="คำอธิบายภาพ..."
                          className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded-md text-slate-700 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                          title="คำอธิบายภาพนิเทศ"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {uploadedPhotosCount < 3 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    ตามเกณฑ์ สอศ. กำหนดให้บันทึกภาพถ่ายการลงพื้นที่นิเทศ <strong>3 ถึง 4 รูป</strong> (สามารถกดปุ่ม "โหลดรูปตัวอย่างการนิเทศ 4 รูป" ด้านบนเพื่อทดสอบได้ทันที)
                  </span>
                </div>
              )}
            </div>

            {/* 5. VISIT DATE & TIME PICKER */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200/80 pb-2">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <span>5. วันและเวลานิเทศก์:</span>
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-slate-400">ปุ่มด่วน:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const y = now.getFullYear();
                      const m = String(now.getMonth() + 1).padStart(2, '0');
                      const d = String(now.getDate()).padStart(2, '0');
                      const hh = String(now.getHours()).padStart(2, '0');
                      const mm = String(now.getMinutes()).padStart(2, '0');
                      setSelectedDate(`${y}-${m}-${d}`);
                      setSelectedTime(`${hh}:${mm}`);
                    }}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-medium cursor-pointer"
                  >
                    ใช้วันและเวลาปัจจุบัน
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    เลือกวันที่ลงพื้นที่นิเทศ:
                  </label>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    รูปแบบภาษาไทย: {getThaiDateFormatted(selectedDate, selectedTime)}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>เวลาที่ลงพื้นที่ (น.):</span>
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 6. PPE SAFETY CHECKLIST */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl transition ${safetyPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-xs">
                    6. ตรวจสอบความปลอดภัย & อุปกรณ์ PPE มาตรฐาน
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    หมวกนิรภัย, ถุงมือกันไฟฟ้า, รองเท้านิรภัย และขั้นตอนตัดไฟปลอดภัย (Lockout/Tagout)
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={safetyPassed}
                  onChange={(e) => setSafetyPassed(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-2 text-xs font-bold text-slate-700">
                  {safetyPassed ? 'ผ่านเกณฑ์ 100%' : 'ต้องปรับปรุง'}
                </span>
              </label>
            </div>

            {/* 7. COMPETENCY EVALUATION SCORE */}
            <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    7. ผลการประเมินสมรรถนะวิชาชีพ (คะแนนเต็ม 20)
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    ประเมินทักษะช่างไฟฟ้า ความปลอดภัย และวินัยในการทำงานร่วมกับผู้อื่น
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-sky-900 font-mono">
                    {score.toFixed(1)} <span className="text-xs font-normal text-slate-500">/ 20</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                    เกรด {grade}
                  </span>
                </div>
              </div>

              {/* Score Slider */}
              <input
                type="range"
                min="10"
                max="20"
                step="0.5"
                value={score}
                onChange={(e) => handleScoreChange(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />

              {/* Quick score buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[20, 19.5, 19, 18.5, 18, 17, 16].map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => handleScoreChange(sc)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      score === sc
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {sc} คะแนน
                  </button>
                ))}
              </div>
            </div>

            {/* 8. MENTOR FEEDBACK */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                8. ความเห็นและข้อเสนอแนะจากพี่เลี้ยงสถานประกอบการ
              </label>
              <textarea
                rows={2}
                value={mentorFeedback}
                onChange={(e) => setMentorFeedback(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-xs"
                placeholder="ระบุข้อเสนอแนะจากพี่เลี้ยงสถานประกอบการ"
                required
              />
            </div>

            {/* 9. TEACHER COMMENT */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                9. ความเห็นและคำแนะนำของครูนิเทศก์ (ลงเล่มรายงาน ทว.04)
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-xs"
                placeholder="ข้อสังเกตและคำแนะนำเพื่อพัฒนางานสัปดาห์ถัดไป"
                required
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 max-w-md truncate">
                ครูนิเทศก์ผู้ลงนาม ({selectedTeachers.length} ท่าน):{' '}
                <strong className="text-indigo-900 font-bold">{combinedTeacherNames}</strong>{' '}
                <span className="font-mono text-slate-500 text-[10px]">({combinedTeacherEmails})</span>
              </span>
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedStudents.length === 0 || selectedTeachers.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSubmitting 
                      ? 'กำลังบันทึกข้อมูลและรูปภาพ...' 
                      : `บันทึกรายงานการนิเทศ (${selectedStudents.length} คน)`}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Full Image Preview Lightbox */}
        {activePreviewImage && (
          <div 
            onClick={() => setActivePreviewImage(null)}
            className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="max-w-3xl max-h-[90vh] relative">
              <img 
                src={activePreviewImage} 
                alt="รูปขยาย" 
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/20" 
              />
              <button
                type="button"
                onClick={() => setActivePreviewImage(null)}
                className="absolute top-2 right-2 bg-slate-900/80 text-white p-2 rounded-full hover:bg-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
