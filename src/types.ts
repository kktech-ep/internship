export interface DailyLog {
  id: string;
  day: string; // จันทร์, อังคาร, พุธ, พฤหัสบดี, ศุกร์
  date: string; // 10 มิ.ย. 67
  taskDescription: string;
  toolsUsed: string;
  hours: number;
  evaluation: string;
}

export interface PhotoEvidence {
  id: string;
  url: string;
  title: string;
  caption: string;
}

export interface WeeklySubmission {
  id: string;
  studentId: string;
  weekNumber: number;
  dateRange: string; // "10 มิ.ย. 2567 - 14 มิ.ย. 2567"
  submittedAt: string;
  status: 'pending' | 'graded' | 'draft';
  taskTitle: string;
  dailyLogs: DailyLog[];
  photos: PhotoEvidence[];
  totalHours: number;
  mentorRating: number; // 5.0
  mentorComment: string;
  mentorName: string;
  mentorPosition: string;
  teacherScore: number; // out of 20
  teacherGrade: string; // A, B+, B, etc.
  teacherComment?: string;
  teacherName: string;
  studentSignature: string;
  mentorSignature: string;
  teacherSignature: string;
  verifiedHash: string;
  safetyChecklist: {
    hardHat: boolean;
    highVoltageGloves: boolean;
    safetyShoes: boolean;
    lotoProcedure: boolean;
  };
}

export interface Student {
  id: string;
  studentCode: string; // 65301040018
  name: string;
  initials: string;
  level: string; // ปวส.2
  department: string; // แผนกช่างไฟฟ้าและระบบควบคุม
  room: string; // 2/1
  email: string;
  avatarUrl?: string;
  companyId: string;
  companyName: string;
  supervisorTeacher: string;
  accumulatedHours: number;
  requiredHours: number;
  actualWeeks: number;
  totalWeeks: number;
  currentWeek: number;
  companyRegistration: {
    registeredAt: string;
    department: string;
    mentorName: string;
    mentorPhone: string;
    emergencyPhone: string;
    gpsCoordinates: string;
    gpsLat: number;
    gpsLng: number;
    notes?: string;
  };
  courses?: CourseDataRow[];
}

export interface CourseDataRow {
  room: string;
  subjectCode: string;
  subjectName: string;
  teacherName: string;
  nites1?: string;
  nites2?: string;
  nites3?: string;
}

export interface Company {
  id: string;
  name: string;
  shortName: string;
  address: string;
  zone: string; // อ.เมือง, อ.น้ำพอง, อ.บ้านไผ่, อ.ชุมแพ
  distanceKm: number;
  sector: 'high-voltage' | 'factory' | 'solar' | 'building';
  sectorLabel: string;
  contactPerson: string;
  phone: string;
  lat: number;
  lng: number;
  studentsCount: number;
  status: 'completed' | 'scheduled_today' | 'scheduled_soon' | 'pending';
  statusText: string;
  visitSchedule?: string;
  assignedTeacher: string;
  assignedStudents: {
    studentId: string;
    studentName: string;
    studentCode: string;
    level: string;
    latestWeekStatus: string;
  }[];
  jobScope: string;
  lastScore?: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'urgent' | 'schedule' | 'general';
  target: string;
}

export interface Form3Photo {
  id: string;
  url: string; // base64 data url or external url
  title: string;
  caption?: string;
  uploadedAt: string;
}

export interface Form3SupervisionRecord {
  id: string;
  timestamp: string; // e.g. 21/10/2569 14:30:00
  visitDate: string; // Formatted Thai date e.g. 21 ต.ค. 2569 (13:30 น.)
  visitTime?: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  studentRoom: string;
  levelDepartment: string;
  companyId?: string;
  companyName: string;
  companyDepartment?: string;
  companyAddress?: string;
  teacherName: string;
  teacherEmail?: string;
  mentorName: string;
  mentorFeedback: string;
  safetyPassed: boolean;
  score: number;
  grade: string;
  teacherComment: string;
  photos: Form3Photo[];
  status: string;
  syncedToGoogleSheet?: boolean;
}

export interface AuthUser {
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  initials: string;
  department: string;
  studentId?: string;
  provider: 'google' | 'sso';
}

export interface SheetTeacher {
  id: string;
  name: string;
  user: string;
  email: string;
  status: string;
  role: 'teacher' | 'admin';
  phone?: string;
  department?: string;
  rooms?: string[];
  subjects?: string[];
}
