import {
  Company,
  Form3Photo,
  Form3SupervisionRecord,
  Student,
  WeeklySubmission,
} from '../types';
import { getCandidateStudentKeys, getMergedStudentSubmissions } from './submissionUtils';

export interface UnifiedCompanySummary {
  id: string;
  name: string;
  shortName: string;
  department: string;
  address: string;
  zone: string;
  distanceKm: number;
  sector: 'pea' | 'solar' | 'factory' | 'service';
  sectorLabel: string;
  contactPerson: string;
  phone: string;
  lat: number;
  lng: number;
  students: Student[];
  studentsCount: number;
  form3Records: Form3SupervisionRecord[];
  latestRecord?: Form3SupervisionRecord;
  isSupervised: boolean;
  score?: number;
  grade?: string;
  supervisingTeacher: string;
  supervisingTeachersList: string[];
  allPhotos: Form3Photo[];
  statusText: string;
  jobScope: string;
}

export interface StudentEvaluationSummary {
  submissions: WeeklySubmission[];
  submittedWeeksCount: number;
  gradedWeeksCount: number;
  pendingWeeksCount: number;
  effectiveActualWeeks: number;
  effectiveAccumulatedHours: number;
  latestForm3?: Form3SupervisionRecord;
  evaluationScore: number | null;
  evaluationGrade: string | null;
  scoreText: string;
}

export function normalizeCompanyNameKey(name: string): string {
  return (name || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeStudentAcademicInfo(student: Student): Student {
  const room = (student.room || '').trim();
  const isTechDept = room.includes('ทลฟ') || (student.level || '').includes('ปริญญาตรี');
  const level = isTechDept
    ? 'ปริญญาตรี'
    : room.includes('1/')
    ? 'ปวส.1'
    : room.includes('2/')
    ? 'ปวส.2'
    : student.level || 'ปวส.2';
  const department = isTechDept ? 'ภาควิชาเทคโนโลยีไฟฟ้า' : 'แผนกวิชาช่างไฟฟ้ากำลัง';

  return {
    ...student,
    level,
    department,
  };
}

export function extractTeacherNames(raw?: string): string[] {
  if (!raw) return [];
  const parts = raw
    .split(/[,/\n]+/)
    .map((p) => p.trim())
    .filter((p) => p && p !== '-' && p !== 'ยังไม่ระบุ');
  return Array.from(new Set(parts));
}

export function matchesStudentRecord(record: Form3SupervisionRecord, student: Student): boolean {
  if (!record || !student) return false;
  const studentKeys = new Set(getCandidateStudentKeys(student).map((k) => k.toLowerCase()));

  if (record.studentId && studentKeys.has(record.studentId.trim().toLowerCase())) {
    return true;
  }

  if (Array.isArray(record.studentIds)) {
    for (const id of record.studentIds) {
      if (id && studentKeys.has(String(id).trim().toLowerCase())) {
        return true;
      }
    }
  }

  const stdCode = (student.studentCode || '').trim().replace(/^s/i, '').toLowerCase();
  if (stdCode) {
    if (Array.isArray(record.studentCodes)) {
      for (const code of record.studentCodes) {
        if (String(code || '').trim().replace(/^s/i, '').toLowerCase() === stdCode) {
          return true;
        }
      }
    }
    const rawCodes = (record.studentCode || '').split(/[,;\n]+/);
    for (const rawCode of rawCodes) {
      const recCode = rawCode.trim().replace(/^s/i, '').toLowerCase();
      if (recCode && recCode === stdCode) {
        return true;
      }
    }
  }

  const stdName = (student.name || '').replace(/\s+/g, '').trim();
  if (stdName) {
    if (Array.isArray(record.studentNames)) {
      for (const n of record.studentNames) {
        const cleanN = String(n || '').replace(/\s+/g, '').trim();
        if (cleanN && (cleanN === stdName || cleanN.includes(stdName) || stdName.includes(cleanN))) {
          return true;
        }
      }
    }
    const rawNames = (record.studentName || '').split(/[,;\n]+/);
    for (const rawName of rawNames) {
      const recName = rawName.replace(/\s+/g, '').trim();
      if (recName && (recName === stdName || recName.includes(stdName) || stdName.includes(recName))) {
        return true;
      }
    }
  }

  return false;
}

export function getGradeFromScore(score: number): string {
  const s = Number(score) || 0;
  if (s >= 18) return 'ดีเยี่ยม (A)';
  if (s >= 16) return 'ดีมาก (B+)';
  if (s >= 14) return 'ดี (B)';
  if (s >= 12) return 'ปานกลาง (C+)';
  if (s >= 10) return 'พอใช้ (C)';
  return 'ควรปรับปรุง';
}

export function parseThaiOrIsoDateTimeMs(raw?: string | null): number {
  if (!raw || typeof raw !== 'string') return 0;
  const thaiDigits = '๐๑๒๓๔๕๖๗๘๙';
  const normalized = raw
    .replace(/[๐-๙]/g, (d) => String(thaiDigits.indexOf(d)))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized || normalized === '-') return 0;

  // 1. Thai / numeric D/M/YYYY or DD-MM-YYYY with optional time & AM/PM
  const dmyMatch = normalized.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(?:เวลา\s*)?(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?(?:\s*น\.?)?)?/i
  );
  if (dmyMatch) {
    let p1 = Number(dmyMatch[1]);
    let p2 = Number(dmyMatch[2]);
    let year = Number(dmyMatch[3]);
    let hour = dmyMatch[4] !== undefined ? Number(dmyMatch[4]) : 0;
    const min = dmyMatch[5] !== undefined ? Number(dmyMatch[5]) : 0;
    const sec = dmyMatch[6] !== undefined ? Number(dmyMatch[6]) : 0;
    const meridiem = (dmyMatch[7] || '').toUpperCase();

    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;

    // Handle US MM/DD/YYYY if second part exceeds 12
    if (p2 > 12 && p1 <= 12) {
      const tmp = p1;
      p1 = p2;
      p2 = tmp;
    }

    if (year >= 2400) year -= 543;
    const ms = new Date(year, p2 - 1, p1, hour, min, sec).getTime();
    if (Number.isFinite(ms) && ms > 0) return ms;
  }

  // 2. Thai formatted month names e.g. "21 ต.ค. 2569 (13:30 น.)"
  const thaiMonthMap: Record<string, number> = {
    'ม.ค.': 0, 'มกราคม': 0,
    'ก.พ.': 1, 'กุมภาพันธ์': 1,
    'มี.ค.': 2, 'มีนาคม': 2,
    'เม.ย.': 3, 'เมษายน': 3,
    'พ.ค.': 4, 'พฤษภาคม': 4,
    'มิ.ย.': 5, 'มิถุนายน': 5,
    'ก.ค.': 6, 'กรกฎาคม': 6,
    'ส.ค.': 7, 'สิงหาคม': 7,
    'ก.ย.': 8, 'กันยายน': 8,
    'ต.ค.': 9, 'ตุลาคม': 9,
    'พ.ย.': 10, 'พฤศจิกายน': 10,
    'ธ.ค.': 11, 'ธันวาคม': 11,
  };
  const thaiTextMatch = normalized.match(
    /(\d{1,2})\s+(ม\.ค\.|มกราคม|ก\.พ\.|กุมภาพันธ์|มี\.ค\.|มีนาคม|เม\.ย\.|เมษายน|พ\.ค\.|พฤษภาคม|มิ\.ย\.|มิถุนายน|ก\.ค\.|กรกฎาคม|ส\.ค\.|สิงหาคม|ก\.ย\.|กันยายน|ต\.ค\.|ตุลาคม|พ\.ย\.|พฤศจิกายน|ธ\.ค\.|ธันวาคม)\s+(\d{2,4})(?:[^0-9]*?(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (thaiTextMatch) {
    const day = Number(thaiTextMatch[1]);
    const monthIdx = thaiMonthMap[thaiTextMatch[2]];
    let year = Number(thaiTextMatch[3]);
    const hour = thaiTextMatch[4] !== undefined ? Number(thaiTextMatch[4]) : 0;
    const min = thaiTextMatch[5] !== undefined ? Number(thaiTextMatch[5]) : 0;
    const sec = thaiTextMatch[6] !== undefined ? Number(thaiTextMatch[6]) : 0;

    if (year < 100) year += 2500;
    if (year >= 2400) year -= 543;
    if (monthIdx !== undefined) {
      const ms = new Date(year, monthIdx, day, hour, min, sec).getTime();
      if (Number.isFinite(ms) && ms > 0) return ms;
    }
  }

  // 3. ISO YYYY-MM-DD (including BE year like 2569-11-22)
  const ymdMatch = normalized.match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (ymdMatch) {
    let year = Number(ymdMatch[1]);
    if (year >= 2400) {
      year -= 543;
      const month = Number(ymdMatch[2]);
      const day = Number(ymdMatch[3]);
      const hour = ymdMatch[4] !== undefined ? Number(ymdMatch[4]) : 0;
      const min = ymdMatch[5] !== undefined ? Number(ymdMatch[5]) : 0;
      const sec = ymdMatch[6] !== undefined ? Number(ymdMatch[6]) : 0;
      const ms = new Date(year, month - 1, day, hour, min, sec).getTime();
      if (Number.isFinite(ms) && ms > 0) return ms;
    }
  }

  // 4. Native Date.parse fallback (ISO 8601 Z, RFC strings, etc.)
  const nativeMs = Date.parse(normalized);
  return Number.isFinite(nativeMs) && nativeMs > 0 ? nativeMs : 0;
}

export function extractForm3IdEpochMs(id?: string): number {
  if (!id) return 0;
  const match = id.match(/f3-visit-(\d{12,15})/);
  if (!match) return 0;
  const ms = Number(match[1]);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

export function getForm3RecordTimestampMs(rec?: Partial<Form3SupervisionRecord> | null): number {
  if (!rec) return 0;
  const tsMs = parseThaiOrIsoDateTimeMs(rec.timestamp);
  if (tsMs > 0) return tsMs;

  const idMs = extractForm3IdEpochMs(rec.id);
  if (idMs > 0) return idMs;

  const visitMs = parseThaiOrIsoDateTimeMs(rec.visitDate);
  if (visitMs > 0) return visitMs;

  return 0;
}

export function compareForm3RecordsDesc(
  a: Partial<Form3SupervisionRecord>,
  b: Partial<Form3SupervisionRecord>
): number {
  const timeA = getForm3RecordTimestampMs(a);
  const timeB = getForm3RecordTimestampMs(b);
  if (timeB !== timeA) return timeB - timeA;

  const idTimeA = extractForm3IdEpochMs(a.id);
  const idTimeB = extractForm3IdEpochMs(b.id);
  if (idTimeB !== idTimeA) return idTimeB - idTimeA;

  const visitA = parseThaiOrIsoDateTimeMs(a.visitDate);
  const visitB = parseThaiOrIsoDateTimeMs(b.visitDate);
  return visitB - visitA;
}

export function getStudentEvaluationSummary(
  student: Student,
  submissionsMap: Record<string, WeeklySubmission[]>,
  form3List: Form3SupervisionRecord[]
): StudentEvaluationSummary {
  const subs = getMergedStudentSubmissions(student, submissionsMap);
  const submittedWeeksCount = subs.length;
  const gradedSubs = subs.filter((s) => s.status === 'graded');
  const gradedWeeksCount = gradedSubs.length;
  const pendingWeeksCount = Math.max(0, submittedWeeksCount - gradedWeeksCount);

  const computedHours = subs.reduce((sum, s) => sum + (Number(s.totalHours) || 40), 0);
  const effectiveActualWeeks =
    submittedWeeksCount > 0 ? submittedWeeksCount : Number(student.actualWeeks) || 0;
  const effectiveAccumulatedHours =
    submittedWeeksCount > 0 ? computedHours : Number(student.accumulatedHours) || 0;

  const matchedForm3 = form3List
    .filter((r) => matchesStudentRecord(r, student))
    .sort(compareForm3RecordsDesc);

  const latestForm3 = matchedForm3[0] || undefined;

  let evaluationScore: number | null = null;
  let evaluationGrade: string | null = null;

  if (latestForm3 && typeof latestForm3.score === 'number' && latestForm3.score > 0) {
    evaluationScore = latestForm3.score;
    evaluationGrade = latestForm3.grade || getGradeFromScore(latestForm3.score);
  } else if (gradedSubs.length > 0) {
    const scores = gradedSubs.map((s) => Number(s.teacherScore)).filter((n) => !isNaN(n) && n > 0);
    if (scores.length > 0) {
      const avg = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
      evaluationScore = avg;
      evaluationGrade = gradedSubs[0].teacherGrade || getGradeFromScore(avg);
    }
  }

  const scoreText =
    evaluationScore !== null
      ? `${evaluationScore.toFixed(1)}/20${evaluationGrade ? ` • ${evaluationGrade}` : ''}`
      : 'รอการประเมิน';

  return {
    submissions: subs,
    submittedWeeksCount,
    gradedWeeksCount,
    pendingWeeksCount,
    effectiveActualWeeks,
    effectiveAccumulatedHours,
    latestForm3,
    evaluationScore,
    evaluationGrade,
    scoreText,
  };
}

function detectCompanySector(name: string): {
  sector: 'pea' | 'solar' | 'factory' | 'service';
  sectorLabel: string;
} {
  const lower = (name || '').toLowerCase();
  if (lower.includes('ไฟฟ้า') || lower.includes('pea') || lower.includes('กฟภ') || lower.includes('egat')) {
    return { sector: 'pea', sectorLabel: 'ระบบจำหน่ายและไฟฟ้ากำลัง' };
  }
  if (lower.includes('โซลาร์') || lower.includes('solar') || lower.includes('พลังงานทดแทน')) {
    return { sector: 'solar', sectorLabel: 'พลังงานแสงอาทิตย์' };
  }
  if (
    lower.includes('โรงงาน') ||
    lower.includes('อุตสาหกรรม') ||
    lower.includes('ซีพี') ||
    lower.includes('น้ำตาล') ||
    lower.includes('เบทาโกร') ||
    lower.includes('พานาโซนิค')
  ) {
    return { sector: 'factory', sectorLabel: 'ระบบไฟฟ้าโรงงานอุตสาหกรรม' };
  }
  return { sector: 'service', sectorLabel: 'ติดตั้งและบำรุงรักษาระบบไฟฟ้า' };
}

function detectCompanyZone(name: string, address: string): string {
  const combined = `${name} ${address}`;
  const zones = ['น้ำพอง', 'บ้านไผ่', 'ชุมแพ', 'กระนวน', 'พล', 'มัญจาคีรี', 'อุบลรัตน์', 'พระยืน', 'หนองเรือ'];
  for (const z of zones) {
    if (combined.includes(z)) return `อ.${z} จ.ขอนแก่น`;
  }
  if (combined.includes('อุดร')) return 'จ.อุดรธานี';
  if (combined.includes('มหาสารคาม')) return 'จ.มหาสารคาม';
  if (combined.includes('ร้อยเอ็ด')) return 'จ.ร้อยเอ็ด';
  if (combined.includes('กรุงเทพ')) return 'กรุงเทพมหานคร';
  return 'อ.เมือง จ.ขอนแก่น';
}

export function buildUnifiedCompanies(
  students: Student[],
  form3List: Form3SupervisionRecord[]
): UnifiedCompanySummary[] {
  const groupMap = new Map<
    string,
    {
      displayName: string;
      students: Student[];
      records: Form3SupervisionRecord[];
    }
  >();

  const ensureGroup = (rawName: string) => {
    const cleanName = (rawName || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanName || cleanName === 'ยังไม่ระบุสถานประกอบการ' || cleanName === 'ยังไม่ระบุ' || cleanName === '-') {
      return null;
    }
    const key = normalizeCompanyNameKey(cleanName);
    if (!groupMap.has(key)) {
      groupMap.set(key, { displayName: cleanName, students: [], records: [] });
    }
    return groupMap.get(key)!;
  };

  students.forEach((rawStd) => {
    const std = normalizeStudentAcademicInfo(rawStd);
    const grp = ensureGroup(std.companyName);
    if (grp) {
      grp.students.push(std);
    }
  });

  form3List.forEach((rec) => {
    if (!rec) return;
    let matchedGroup = rec.companyName ? groupMap.get(normalizeCompanyNameKey(rec.companyName)) : undefined;
    if (!matchedGroup) {
      for (const grp of groupMap.values()) {
        if (grp.students.some((s) => matchesStudentRecord(rec, s))) {
          matchedGroup = grp;
          break;
        }
      }
    }
    if (!matchedGroup && rec.companyName) {
      matchedGroup = ensureGroup(rec.companyName) || undefined;
    }
    if (matchedGroup) {
      matchedGroup.records.push(rec);
    }
  });

  return Array.from(groupMap.values())
    .map((grp, idx) => {
      const sortedRecords = [...grp.records].sort(compareForm3RecordsDesc);
      const latestRecord = sortedRecords[0] || undefined;
      const isSupervised = sortedRecords.length > 0;
      const firstStudent = grp.students[0];
      const lat = firstStudent?.companyRegistration?.gpsLat || 16.4322;
      const lng = firstStudent?.companyRegistration?.gpsLng || 102.8236;
      const distanceKm =
        Math.round((Math.hypot(lat - 16.4322, lng - 102.8236) * 111 + 2.5) * 10) / 10;

      const { sector, sectorLabel } = detectCompanySector(grp.displayName);
      const department =
        latestRecord?.companyDepartment ||
        firstStudent?.companyRegistration?.department ||
        'แผนกปฏิบัติการและบำรุงรักษาระบบไฟฟ้า';
      const address = firstStudent?.companyRegistration?.notes || department || grp.displayName;
      const zone = detectCompanyZone(grp.displayName, address);

      const teacherSet = new Set<string>();
      sortedRecords.forEach((r) => extractTeacherNames(r.teacherName).forEach((t) => teacherSet.add(t)));
      grp.students.forEach((s) => extractTeacherNames(s.supervisorTeacher).forEach((t) => teacherSet.add(t)));
      const supervisingTeachersList = Array.from(teacherSet);
      const supervisingTeacher =
        latestRecord?.teacherName ||
        supervisingTeachersList[0] ||
        firstStudent?.supervisorTeacher ||
        'นายทักษิณ โสภาปิยะ';

      const allPhotos: Form3Photo[] = [];
      const seenPhotoUrls = new Set<string>();
      sortedRecords.forEach((r) => {
        (r.photos || []).forEach((p) => {
          if (p?.url && !seenPhotoUrls.has(p.url)) {
            seenPhotoUrls.add(p.url);
            allPhotos.push(p);
          }
        });
      });

      const score = latestRecord && typeof latestRecord.score === 'number' ? latestRecord.score : undefined;
      const grade = latestRecord?.grade || (score !== undefined ? getGradeFromScore(score) : undefined);

      const rawPhone =
        firstStudent?.companyRegistration?.mentorPhone &&
        firstStudent.companyRegistration.mentorPhone !== '-'
          ? firstStudent.companyRegistration.mentorPhone
          : firstStudent?.companyRegistration?.emergencyPhone || '-';

      let nameHash = 0;
      for (let i = 0; i < grp.displayName.length; i++) {
        nameHash = ((nameHash << 5) - nameHash + grp.displayName.charCodeAt(i)) | 0;
      }

      return {
        id: `comp-${idx + 1}-${Math.abs(nameHash).toString(36)}`,
        name: grp.displayName,
        shortName: grp.displayName.slice(0, 28),
        department,
        address,
        zone,
        distanceKm,
        sector,
        sectorLabel,
        contactPerson:
          latestRecord?.mentorName ||
          (firstStudent?.companyRegistration?.mentorName &&
          firstStudent.companyRegistration.mentorName !== '-'
            ? firstStudent.companyRegistration.mentorName
            : 'หัวหน้าแผนก / พี่เลี้ยง'),
        phone: rawPhone,
        lat,
        lng,
        students: grp.students,
        studentsCount: grp.students.length,
        form3Records: sortedRecords,
        latestRecord,
        isSupervised,
        score,
        grade,
        supervisingTeacher,
        supervisingTeachersList,
        allPhotos,
        statusText: isSupervised ? 'นิเทศแล้ว' : 'รอนิเทศ',
        jobScope: department,
      };
    })
    .sort((a, b) => b.studentsCount - a.studentsCount || a.name.localeCompare(b.name, 'th'));
}

export function toFirestoreCompanies(unifiedList: UnifiedCompanySummary[]): Company[] {
  return unifiedList.map((u) => {
    const mappedSector: Company['sector'] =
      u.sector === 'pea'
        ? 'high-voltage'
        : u.sector === 'service'
        ? 'building'
        : u.sector;
    return {
      id: u.id,
      name: u.name,
      shortName: u.shortName,
      address: u.address,
      zone: u.zone,
      distanceKm: u.distanceKm,
      sector: mappedSector,
      sectorLabel: u.sectorLabel,
    contactPerson: u.contactPerson,
    phone: u.phone,
    lat: u.lat,
    lng: u.lng,
    studentsCount: u.studentsCount,
    status: u.isSupervised ? 'completed' : 'pending',
    statusText: u.statusText,
    visitSchedule: u.latestRecord?.visitDate || undefined,
    assignedTeacher: u.supervisingTeacher,
    assignedStudents: u.students.map((s) => ({
      studentId: s.id,
      studentName: s.name,
      studentCode: s.studentCode,
      level: s.level,
      latestWeekStatus: u.isSupervised ? 'นิเทศแล้ว' : 'กำลังฝึกอาชีพ',
    })),
    jobScope: u.jobScope,
    ...(u.score !== undefined ? { lastScore: u.score } : {}),
  };
  });
}
