import {
  Company,
  Form3Photo,
  Form3SupervisionRecord,
  Student,
  WeeklySubmission,
} from '../types';
import {
  computeSubmissionTotalHours,
  getCandidateStudentKeys,
  getMergedStudentSubmissions,
} from './submissionUtils';

/**
 * Normalize bachelor's level/department when room contains ทลฟ.
 */
export function normalizeStudentAcademicInfo(student: Student): Student {
  if ((student.room || '').includes('ทลฟ')) {
    return {
      ...student,
      level: 'ปริญญาตรี',
      department: 'ภาควิชาเทคโนโลยีไฟฟ้า',
    };
  }
  return student;
}

/**
 * Check whether a supervision/submission record belongs to a student across id/code/name variants.
 */
export function matchesStudentRecord(
  record: { studentId?: string; studentCode?: string; studentName?: string } | null | undefined,
  student: Pick<Student, 'id' | 'studentCode' | 'name'> | null | undefined
): boolean {
  if (!record || !student) return false;
  const candidateSet = new Set(getCandidateStudentKeys(student));
  if (record.studentId && candidateSet.has(record.studentId.trim())) return true;
  if (record.studentCode && candidateSet.has(record.studentCode.trim())) return true;
  const rName = (record.studentName || '').trim();
  const sName = (student.name || '').trim();
  if (rName && sName && rName === sName) return true;
  return false;
}

export function getGradeFromScore(score: number): string {
  if (score >= 18) return 'A';
  if (score >= 16) return 'B+';
  if (score >= 14) return 'B';
  if (score >= 12) return 'C+';
  if (score >= 10) return 'C';
  return 'D';
}

export interface StudentEvaluationSummary {
  submissions: WeeklySubmission[];
  submittedWeeksCount: number;
  gradedWeeksCount: number;
  pendingWeeksCount: number;
  effectiveActualWeeks: number;
  effectiveAccumulatedHours: number;
  matchingForm3: Form3SupervisionRecord[];
  latestForm3?: Form3SupervisionRecord;
  isGraded: boolean;
  evaluationScore: number | null;
  evaluationGrade: string | null;
  scoreText: string;
  gradeLabel: string;
}

/**
 * Canonical calculator used identically by StudentView, TeacherView, A4ReportView,
 * GroupWeeklySummaryA4, HubView, MobileSimView, LookerStudioModal, and AdminView.
 */
export function getStudentEvaluationSummary(
  student: Student,
  submissionsMap: Record<string, WeeklySubmission[]>,
  form3List: Form3SupervisionRecord[]
): StudentEvaluationSummary {
  const subs = getMergedStudentSubmissions(student, submissionsMap);
  const gradedSubs = subs.filter((s) => s.status === 'graded');
  const pendingWeeksCount = subs.filter((s) => s.status === 'pending').length;

  const submittedHoursSum = subs.reduce((sum, s) => sum + computeSubmissionTotalHours(s), 0);
  const effectiveActualWeeks = subs.length > 0 ? subs.length : student.actualWeeks;
  const effectiveAccumulatedHours = subs.length > 0 ? submittedHoursSum : student.accumulatedHours;

  const matchingForm3 = [...form3List]
    .filter((f) => matchesStudentRecord(f, student))
    .sort((a, b) => {
      const tA = new Date(a.timestamp || a.visitDate).getTime() || 0;
      const tB = new Date(b.timestamp || b.visitDate).getTime() || 0;
      return tB - tA;
    });

  const latestForm3 = matchingForm3[0];
  const latestGradedSub = gradedSubs[0];

  const weeklyScores = gradedSubs
    .map((s) => Number(s.teacherScore))
    .filter((n) => !isNaN(n) && n > 0);
  const avgWeeklyScore =
    weeklyScores.length > 0
      ? Number((weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length).toFixed(1))
      : null;

  const form3Score =
    latestForm3 && typeof latestForm3.score === 'number' && !isNaN(latestForm3.score) && latestForm3.score > 0
      ? Number(latestForm3.score.toFixed(1))
      : null;

  const evaluationScore = form3Score ?? avgWeeklyScore;
  const evaluationGrade =
    latestForm3?.grade ||
    latestGradedSub?.teacherGrade ||
    (evaluationScore !== null ? getGradeFromScore(evaluationScore) : null);

  const isGraded = Boolean(latestForm3) || gradedSubs.length > 0;

  let scoreText = 'รอประเมิน';
  let gradeLabel = 'รอตรวจ';
  if (evaluationScore !== null) {
    scoreText = `${evaluationScore.toFixed(1)}/20`;
    gradeLabel = evaluationGrade || getGradeFromScore(evaluationScore);
  } else if (subs.length > 0) {
    scoreText = `ส่งแล้ว ${subs.length} สัปดาห์`;
    gradeLabel = 'รอตรวจ';
  }

  return {
    submissions: subs,
    submittedWeeksCount: subs.length,
    gradedWeeksCount: gradedSubs.length,
    pendingWeeksCount,
    effectiveActualWeeks,
    effectiveAccumulatedHours,
    matchingForm3,
    latestForm3,
    isGraded,
    evaluationScore,
    evaluationGrade,
    scoreText,
    gradeLabel,
  };
}

export function extractTeacherNames(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,/]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '-');
}

export function deriveCompanyZoneAndSector(companyName: string): {
  zone: string;
  sector: 'pea' | 'solar' | 'factory' | 'service';
  sectorLabel: string;
} {
  const lower = companyName.toLowerCase();
  let zone = 'อ.เมืองขอนแก่น';
  if (lower.includes('เชียงยืน')) zone = 'อ.เชียงยืน';
  else if (lower.includes('บ้านฝาง')) zone = 'อ.บ้านฝาง';
  else if (lower.includes('ท่าคันโท')) zone = 'อ.ท่าคันโท';
  else if (lower.includes('น้ำหนาว')) zone = 'อ.น้ำหนาว';
  else if (lower.includes('บ้านไผ่')) zone = 'อ.บ้านไผ่';
  else if (lower.includes('ภูเขียว')) zone = 'อ.ภูเขียว';
  else if (lower.includes('หนองเรือ')) zone = 'อ.หนองเรือ';
  else if (lower.includes('น้ำพอง') || lower.includes('มิตรผล')) zone = 'อ.น้ำพอง';
  else if (lower.includes('ชุมแพ')) zone = 'อ.ชุมแพ';
  else if (lower.includes('พระยืน')) zone = 'อ.พระยืน';
  else if (lower.includes('อุบลรัตน์')) zone = 'อ.อุบลรัตน์';
  else if (lower.includes('กระนวน')) zone = 'อ.กระนวน';
  else if (lower.includes('เขาสวนกวาง')) zone = 'อ.เขาสวนกวาง';
  else if (lower.includes('พล') || lower.includes('เมืองพล')) zone = 'อ.เมืองพล';
  else if (lower.includes('ท่าพระ') || lower.includes('230kv') || lower.includes('กฟผ.')) zone = 'ต.ท่าพระ';
  else if (lower.includes('ศิลา') || lower.includes('kkp')) zone = 'ต.ศิลา';
  else if (lower.includes('มิตซูบิชิ') || lower.includes('แอร์') || lower.includes('consumer')) zone = 'นิคมอุตสาหกรรม';

  let sector: 'pea' | 'solar' | 'factory' | 'service' = 'service';
  let sectorLabel = 'งานติดตั้งระบบไฟฟ้า & บริการ';
  if (
    companyName.includes('การไฟฟ้า') ||
    companyName.includes('กฟภ') ||
    companyName.includes('กฟผ') ||
    companyName.includes('PEA') ||
    companyName.includes('EGAT')
  ) {
    sector = 'pea';
    sectorLabel = 'สถานีไฟฟ้า & สายส่ง PEA/EGAT';
  } else if (
    companyName.includes('โซล่าร์') ||
    lower.includes('solar') ||
    companyName.includes('พลังงาน')
  ) {
    sector = 'solar';
    sectorLabel = 'ระบบพลังงานทดแทน & Solar Rooftop';
  } else if (
    companyName.includes('อุตสาหกรรม') ||
    companyName.includes('ผลิต') ||
    companyName.includes('มิตซูบิชิ') ||
    companyName.includes('คูโบต้า') ||
    companyName.includes('ไทยเพาเวอร์') ||
    companyName.includes('น้ำตาล') ||
    companyName.includes('โรงงาน') ||
    companyName.includes('PLC')
  ) {
    sector = 'factory';
    sectorLabel = 'โรงงานอุตสาหกรรม / ตู้ MDB & PLC';
  }

  return { zone, sector, sectorLabel };
}

export interface UnifiedCompanySummary {
  id: string;
  name: string;
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
  allPhotos: (Form3Photo & { teacherName?: string; visitDate?: string; studentName?: string })[];
  statusText: string;
  jobScope: string;
}

/**
 * Single authoritative builder deriving live workplace summaries from current students + Form 3 supervisions.
 */
export function buildUnifiedCompanies(
  students: Student[],
  form3List: Form3SupervisionRecord[]
): UnifiedCompanySummary[] {
  const compMap = new Map<string, { name: string; students: Student[]; firstStudent: Student }>();

  for (const std of students) {
    const cName = (std.companyName || '').trim();
    if (!cName || cName === 'ยังไม่ระบุสถานประกอบการ' || cName === '-') continue;
    if (!compMap.has(cName)) {
      compMap.set(cName, { name: cName, students: [], firstStudent: std });
    }
    compMap.get(cName)!.students.push(std);
  }

  const matchedForm3Ids = new Set<string>();
  const results: UnifiedCompanySummary[] = [];
  let idx = 1;

  const extractTeachersAndPhotos = (records: Form3SupervisionRecord[], fallbackTeacher?: string) => {
    const teacherSet = new Set<string>();
    records.forEach((r) => extractTeacherNames(r.teacherName).forEach((t) => teacherSet.add(t)));
    if (teacherSet.size === 0 && fallbackTeacher) {
      extractTeacherNames(fallbackTeacher).forEach((t) => teacherSet.add(t));
    }
    if (teacherSet.size === 0) {
      teacherSet.add('นายทักษิณ โสภาปิยะ');
    }
    const supervisingTeachersList = Array.from(teacherSet);

    const photoMap = new Map<string, Form3Photo & { teacherName?: string; visitDate?: string; studentName?: string }>();
    records.forEach((r) => {
      (r.photos || []).forEach((p) => {
        if (p.url && !photoMap.has(p.url)) {
          photoMap.set(p.url, {
            ...p,
            teacherName: r.teacherName,
            visitDate: r.visitDate || r.timestamp,
            studentName: r.studentName,
          });
        }
      });
    });

    return {
      supervisingTeachersList,
      supervisingTeacher: supervisingTeachersList.join(', '),
      allPhotos: Array.from(photoMap.values()),
    };
  };

  for (const [cName, group] of compMap.entries()) {
    const compId = `comp-${idx++}`;
    const firstStd = group.firstStudent;
    const reg = firstStd.companyRegistration;
    const { zone, sector, sectorLabel } = deriveCompanyZoneAndSector(cName);
    const normComp = cName.toLowerCase().trim();

    const matchedForm3 = form3List
      .filter((f) => {
        if (!f) return false;
        const normFormComp = (f.companyName || '').toLowerCase().trim();
        const compMatches =
          normFormComp &&
          (normFormComp.includes(normComp) ||
            normComp.includes(normFormComp) ||
            (normComp.includes('pea') && normFormComp.includes('pea')) ||
            (normComp.includes('การไฟฟ้าส่วนภูมิภาค') && f.companyName.includes('การไฟฟ้าส่วนภูมิภาค')) ||
            (normComp.includes('มิตรผล') && normFormComp.includes('มิตรผล')) ||
            (normComp.includes('โซล่าร์') && normFormComp.includes('โซล่าร์')));
        const studentMatches = group.students.some((s) => matchesStudentRecord(f, s));
        return compMatches || studentMatches;
      })
      .sort((a, b) => {
        const tA = new Date(a.timestamp || a.visitDate).getTime() || 0;
        const tB = new Date(b.timestamp || b.visitDate).getTime() || 0;
        return tB - tA;
      });

    matchedForm3.forEach((f) => matchedForm3Ids.add(f.id));
    const latestRecord = matchedForm3[0];
    const isSupervised = matchedForm3.length > 0;
    const { supervisingTeachersList, supervisingTeacher, allPhotos } = extractTeachersAndPhotos(
      matchedForm3,
      firstStd.supervisorTeacher
    );

    const lat = reg?.gpsLat || 16.4322;
    const lng = reg?.gpsLng || 102.8236;
    const distanceKm = Math.round(((lat - 16.4322) ** 2 + (lng - 102.8236) ** 2) * 5000) / 10 + 3.5;

    results.push({
      id: compId,
      name: cName,
      department: latestRecord?.companyDepartment || reg?.department || 'แผนกซ่อมบำรุงและระบบไฟฟ้า',
      address: reg?.notes || `${zone} จ.ขอนแก่น`,
      zone,
      distanceKm,
      sector,
      sectorLabel,
      contactPerson:
        latestRecord?.mentorName ||
        (reg?.mentorName && reg.mentorName !== '-' ? reg.mentorName : 'วิศวกรผู้ควบคุมงาน / พี่เลี้ยงสถานประกอบการ'),
      phone: reg?.emergencyPhone || reg?.mentorPhone || '-',
      lat,
      lng,
      students: group.students,
      studentsCount: group.students.length,
      form3Records: matchedForm3,
      latestRecord,
      isSupervised,
      score: latestRecord?.score,
      grade: latestRecord?.grade,
      supervisingTeacher,
      supervisingTeachersList,
      allPhotos,
      statusText: isSupervised ? 'นิเทศแล้ว' : 'รอนิเทศ',
      jobScope: latestRecord?.companyDepartment || reg?.department || 'งานติดตั้ง บำรุงรักษา และควบคุมระบบไฟฟ้ากำลัง',
    });
  }

  // Append any supervised workplaces in Form 3 not yet matching a student's companyName
  const extraGroups = new Map<string, Form3SupervisionRecord[]>();
  form3List.forEach((f) => {
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
    const { zone, sector, sectorLabel } = deriveCompanyZoneAndSector(extraName);
    const { supervisingTeachersList, supervisingTeacher, allPhotos } = extractTeachersAndPhotos(recs);
    const extraStudents: Student[] = recs.map((r, rIdx) => {
      const found = students.find((s) => matchesStudentRecord(r, s));
      if (found) return found;
      return normalizeStudentAcademicInfo({
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
        supervisorTeacher: supervisingTeacher || 'ครูนิเทศก์',
        companyRegistration: {
          registeredAt: r.visitDate || r.timestamp,
          department: r.companyDepartment || '-',
          mentorName: r.mentorName || '-',
          mentorPhone: '-',
          emergencyPhone: '-',
          gpsCoordinates: '16.4322, 102.8236',
          gpsLat: 16.4322,
          gpsLng: 102.8236,
          notes: r.companyAddress || '',
        },
      });
    });

    results.push({
      id: `comp-extra-${idx++}`,
      name: extraName,
      department: latest?.companyDepartment || 'แผนกซ่อมบำรุงและระบบไฟฟ้า',
      address: latest?.companyAddress || `${zone} จ.ขอนแก่น`,
      zone,
      distanceKm: 5.5,
      sector,
      sectorLabel,
      contactPerson: latest?.mentorName || 'พี่เลี้ยงสถานประกอบการ',
      phone: '-',
      lat: 16.4322,
      lng: 102.8236,
      students: extraStudents,
      studentsCount: extraStudents.length,
      form3Records: recs,
      latestRecord: latest,
      isSupervised: true,
      score: latest?.score,
      grade: latest?.grade,
      supervisingTeacher,
      supervisingTeachersList,
      allPhotos,
      statusText: 'นิเทศแล้ว',
      jobScope: latest?.companyDepartment || 'งานติดตั้ง บำรุงรักษา และควบคุมระบบไฟฟ้ากำลัง',
    });
  }

  return results.sort((a, b) => {
    if (a.isSupervised && !b.isSupervised) return -1;
    if (!a.isSupervised && b.isSupervised) return 1;
    if (b.form3Records.length !== a.form3Records.length) {
      return b.form3Records.length - a.form3Records.length;
    }
    return b.studentsCount - a.studentsCount;
  });
}

/**
 * Convert UnifiedCompanySummary entries to Firestore Company documents for persistence sync.
 */
export function toFirestoreCompanies(unified: UnifiedCompanySummary[]): Company[] {
  return unified.map((u) => ({
    id: u.id,
    name: u.name,
    shortName: u.name.slice(0, 30),
    address: u.address,
    zone: u.zone,
    distanceKm: u.distanceKm,
    sector: u.sector === 'pea' ? 'high-voltage' : u.sector === 'service' ? 'building' : u.sector,
    sectorLabel: u.sectorLabel,
    contactPerson: u.contactPerson,
    phone: u.phone,
    lat: u.lat,
    lng: u.lng,
    studentsCount: u.studentsCount,
    status: u.isSupervised ? 'completed' : 'pending',
    statusText: u.statusText,
    assignedTeacher: u.supervisingTeacher,
    assignedStudents: u.students.map((cs) => ({
      studentId: cs.id,
      studentName: cs.name,
      studentCode: cs.studentCode,
      level: cs.level,
      latestWeekStatus: `สัปดาห์ที่ ${cs.currentWeek}`,
    })),
    jobScope: u.jobScope,
    ...(typeof u.score === 'number' ? { lastScore: u.score } : {}),
  }));
}
