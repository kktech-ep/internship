import { Student, Company, WeeklySubmission, Announcement } from '../types';

export const mockStudents: Student[] = [
  {
    id: 'std-1',
    studentCode: '65301040018',
    name: 'นายธนากร สุริยะแสง',
    initials: 'ธส',
    level: 'ปวส.2',
    department: 'แผนกช่างไฟฟ้าและระบบควบคุม',
    room: '2/1',
    email: 'thanakorn.s@kktech.ac.th',
    companyId: 'comp-1',
    companyName: 'การไฟฟ้าส่วนภูมิภาค สาขาขอนแก่น (PEA Khon Kaen)',
    supervisorTeacher: 'นายทักษิณ โสภาปิยะ',
    accumulatedHours: 320,
    requiredHours: 400,
    actualWeeks: 14,
    totalWeeks: 18,
    currentWeek: 8,
    companyRegistration: {
      registeredAt: '15 ต.ค. 2569 (10:42 น.)',
      department: 'แผนกปฏิบัติการและบำรุงรักษา',
      mentorName: 'นายสุรชัย มั่นคงดี (วิศวกรไฟฟ้า)',
      mentorPhone: '043-221-987 (ต่อ 104)',
      emergencyPhone: '043-221-987 (ต่อ 104)',
      gpsCoordinates: '16.4322, 102.8236',
      gpsLat: 16.4322,
      gpsLng: 102.8236,
      notes: 'อยู่ใกล้ศูนย์ราชการจังหวัดขอนแก่น สวมหมวกนิรภัยและบัตรประจำตัวทุกครั้งที่เข้าพื้นที่สถานีไฟฟ้า'
    }
  },
  {
    id: 'std-2',
    studentCode: '66301040012',
    name: 'นายกิตติศักดิ์ เจริญศรี',
    initials: 'กศ',
    level: 'ปวส.2',
    department: 'แผนกช่างไฟฟ้าและระบบควบคุม',
    room: '2/1',
    email: 'kittisak.c@kktech.ac.th',
    companyId: 'comp-1',
    companyName: 'การไฟฟ้าส่วนภูมิภาค จังหวัดขอนแก่น',
    supervisorTeacher: 'นายทักษิณ โสภาปิยะ',
    accumulatedHours: 360,
    requiredHours: 400,
    actualWeeks: 14,
    totalWeeks: 18,
    currentWeek: 8,
    companyRegistration: {
      registeredAt: '14 ต.ค. 2569',
      department: 'แผนกปฏิบัติการบำรุงรักษาสถานีไฟฟ้า',
      mentorName: 'นายชาญชัย มงคลศรี (วิศวกรไฟฟ้า)',
      mentorPhone: '043-221-987',
      emergencyPhone: '043-221-987',
      gpsCoordinates: '16.4322, 102.8236',
      gpsLat: 16.4322,
      gpsLng: 102.8236
    }
  },
  {
    id: 'std-3',
    studentCode: '66301040018',
    name: 'นายชนาภัทร สมบูรณ์ผล',
    initials: 'ชน',
    level: 'ปวส.2',
    department: 'แผนกช่างไฟฟ้าและระบบควบคุม',
    room: '2/1',
    email: 'chanapat.s@kktech.ac.th',
    companyId: 'comp-2',
    companyName: 'บจก. ไทยเพาเวอร์ คอนโทรล ขอนแก่น',
    supervisorTeacher: 'นายทักษิณ โสภาปิยะ',
    accumulatedHours: 320,
    requiredHours: 400,
    actualWeeks: 14,
    totalWeeks: 18,
    currentWeek: 8,
    companyRegistration: {
      registeredAt: '16 ต.ค. 2569',
      department: 'งานประกอบตู้ควบคุม MDB & PLC',
      mentorName: 'นายสมบัติ ศรีสุวรรณ (หัวหน้าช่าง)',
      mentorPhone: '043-345-889',
      emergencyPhone: '081-998-7766',
      gpsCoordinates: '16.4678, 102.8451',
      gpsLat: 16.4678,
      gpsLng: 102.8451
    }
  },
  {
    id: 'std-4',
    studentCode: '66301040024',
    name: 'นางสาวสุจิตรา วรรณดี',
    initials: 'สจ',
    level: 'ปวส.2',
    department: 'แผนกช่างไฟฟ้าและระบบควบคุม',
    room: '2/2',
    email: 'sujitra.w@kktech.ac.th',
    companyId: 'comp-3',
    companyName: 'บจก. สยามคูโบต้า คอร์ปอเรชั่น (ศูนย์ซ่อม)',
    supervisorTeacher: 'นายทักษิณ โสภาปิยะ',
    accumulatedHours: 340,
    requiredHours: 400,
    actualWeeks: 14,
    totalWeeks: 18,
    currentWeek: 8,
    companyRegistration: {
      registeredAt: '12 ต.ค. 2569',
      department: 'ฝ่ายระบบไฟฟ้ายานยนต์และมอเตอร์ขับเคลื่อน',
      mentorName: 'นายประเวศ สุวรรณฉัตร (วิศวกรซ่อมบำรุง)',
      mentorPhone: '043-412-300',
      emergencyPhone: '089-112-4455',
      gpsCoordinates: '16.4891, 102.8123',
      gpsLat: 16.4891,
      gpsLng: 102.8123
    }
  },
  {
    id: 'std-5',
    studentCode: '66301040033',
    name: 'นายอนุรักษ์ โพธิ์แก้ว',
    initials: 'อร',
    level: 'ปวส.2',
    department: 'แผนกช่างไฟฟ้าและระบบควบคุม',
    room: '2/2',
    email: 'anurak.p@kktech.ac.th',
    companyId: 'comp-4',
    companyName: 'บจก. อีสานโซลาร์เอนเนอร์ยี ขอนแก่น',
    supervisorTeacher: 'นายทักษิณ โสภาปิยะ',
    accumulatedHours: 310,
    requiredHours: 400,
    actualWeeks: 14,
    totalWeeks: 18,
    currentWeek: 8,
    companyRegistration: {
      registeredAt: '18 ต.ค. 2569',
      department: 'งานติดตั้งระบบ Solar Rooftop & อินเวอร์เตอร์',
      mentorName: 'นายพงษ์ศักดิ์ รัตนแสง (ผู้จัดการฝ่ายเทคนิค)',
      mentorPhone: '043-987-112',
      emergencyPhone: '084-556-9900',
      gpsCoordinates: '16.6800, 102.8150',
      gpsLat: 16.6800,
      gpsLng: 102.8150
    }
  }
];

export const mockCompanies: Company[] = [
  {
    id: 'comp-1',
    name: 'การไฟฟ้าส่วนภูมิภาค สาขาขอนแก่น (PEA Khon Kaen)',
    shortName: 'กฟภ. ขอนแก่น (PEA)',
    address: 'ถ.ประชาสโมสร อ.เมือง จ.ขอนแก่น (4.2 กม.)',
    zone: 'อ.เมือง',
    distanceKm: 4.2,
    sector: 'high-voltage',
    sectorLabel: 'สถานีไฟฟ้าแรงสูง/PEA/EGAT',
    contactPerson: 'นายชาญชัย มงคลศรี (วิศวกรไฟฟ้าชำนาญการ)',
    phone: '043-221-987 ต่อ 104',
    lat: 16.4367,
    lng: 102.8415,
    studentsCount: 2,
    status: 'scheduled_today',
    statusText: 'รอตรวจ 13:30 น. วันนี้',
    visitSchedule: 'นัดหมาย 13:30 น.',
    assignedTeacher: 'นายทักษิณ โสภาปิยะ',
    assignedStudents: [
      {
        studentId: 'std-1',
        studentName: 'นายธนากร สุริยะแสง',
        studentCode: '65301040018',
        level: 'ปวส.2/1 ไฟฟ้า',
        latestWeekStatus: 'บันทึกสัปดาห์ 8 รอประเมิน'
      },
      {
        studentId: 'std-2',
        studentName: 'นายกิตติศักดิ์ เจริญศรี',
        studentCode: '66301040012',
        level: 'ปวส.2/1 ไฟฟ้า',
        latestWeekStatus: 'บันทึกสัปดาห์ 8 ตรวจแล้ว (19.5/20)'
      }
    ],
    jobScope: 'ตรวจสอบหม้อแปลงไฟฟ้าจำหน่ายและการประกอบตู้ควบคุม MDB และบำรุงรักษาสถานีไฟฟ้า',
    lastScore: 19.5
  },
  {
    id: 'comp-2',
    name: 'บจก. ไทยเพาเวอร์ คอนโทรล ขอนแก่น',
    shortName: 'บจก. ไทยเพาเวอร์ คอนโทรล',
    address: 'ต.ศิลา อ.เมือง จ.ขอนแก่น (ใกล้เลี่ยงเมือง) (8.5 กม.)',
    zone: 'อ.เมือง',
    distanceKm: 8.5,
    sector: 'factory',
    sectorLabel: 'โรงงานอุตสาหกรรม/MDB/PLC',
    contactPerson: 'นายสมบัติ ศรีสุวรรณ',
    phone: '043-345-889',
    lat: 16.4678,
    lng: 102.8451,
    studentsCount: 1,
    status: 'scheduled_today',
    statusText: 'รอตรวจ 15:30 น. วันนี้',
    visitSchedule: 'นัดหมาย 15:30 น.',
    assignedTeacher: 'นายทักษิณ โสภาปิยะ',
    assignedStudents: [
      {
        studentId: 'std-3',
        studentName: 'นายชนาภัทร สมบูรณ์ผล',
        studentCode: '66301040018',
        level: 'ปวส.2/1 ไฟฟ้า',
        latestWeekStatus: 'รอครูนิเทศก์ลงคะแนน'
      }
    ],
    jobScope: 'งานประกอบตู้ควบคุม MDB & ตู้คอนโทรล PLC โรงงานอุตสาหกรรม'
  },
  {
    id: 'comp-3',
    name: 'บจก. สยามคูโบต้า คอร์ปอเรชั่น (ศูนย์ซ่อมขอนแก่น)',
    shortName: 'บจก. สยามคูโบต้า',
    address: 'ถ.มิตรภาพ ต.สำราญ อ.เมือง จ.ขอนแก่น (11.0 กม.)',
    zone: 'อ.เมือง',
    distanceKm: 11.0,
    sector: 'factory',
    sectorLabel: 'โรงงานอุตสาหกรรม/MDB/PLC',
    contactPerson: 'นายประเวศ สุวรรณฉัตร',
    phone: '043-412-300',
    lat: 16.4950,
    lng: 102.8290,
    studentsCount: 1,
    status: 'completed',
    statusText: 'นิเทศเสร็จแล้ว (คะแนน 18.0/20)',
    visitSchedule: 'ตรวจแล้ว 12 มิ.ย.',
    assignedTeacher: 'นายทักษิณ โสภาปิยะ',
    assignedStudents: [
      {
        studentId: 'std-4',
        studentName: 'นางสาวสุจิตรา วรรณดี',
        studentCode: '66301040024',
        level: 'ปวส.2/2 ไฟฟ้า',
        latestWeekStatus: 'ตรวจประเมินแล้ว (18.0/20)'
      }
    ],
    jobScope: 'ฝ่ายระบบไฟฟ้ายานยนต์และมอเตอร์ขับเคลื่อน',
    lastScore: 18.0
  },
  {
    id: 'comp-4',
    name: 'บจก. อีสานโซลาร์เอนเนอร์ยี ขอนแก่น',
    shortName: 'บจก. อีสานโซลาร์เอนเนอร์ยี',
    address: 'ต.สะอาด อ.น้ำพอง จ.ขอนแก่น (28.0 กม.)',
    zone: 'อ.น้ำพอง',
    distanceKm: 28.0,
    sector: 'solar',
    sectorLabel: 'Solar Cell & พลังงานทดแทน',
    contactPerson: 'นายพงษ์ศักดิ์ รัตนแสง',
    phone: '043-987-112',
    lat: 16.6900,
    lng: 102.8750,
    studentsCount: 3,
    status: 'completed',
    statusText: 'นิเทศเสร็จแล้ว (คะแนน 17.5/20)',
    visitSchedule: 'ตรวจแล้ว 10 มิ.ย.',
    assignedTeacher: 'นายทักษิณ โสภาปิยะ',
    assignedStudents: [
      {
        studentId: 'std-5',
        studentName: 'นายอนุรักษ์ โพธิ์แก้ว',
        studentCode: '66301040033',
        level: 'ปวส.2/2 ไฟฟ้า',
        latestWeekStatus: 'ตรวจประเมินแล้ว (17.5/20)'
      }
    ],
    jobScope: 'งานติดตั้งระบบ Solar Rooftop & อินเวอร์เตอร์ 3 เฟส',
    lastScore: 17.5
  },
  {
    id: 'comp-5',
    name: 'สถานีไฟฟ้าแรงสูงขอนแก่น 2 (กฟผ. ท่าพระ)',
    shortName: 'สถานีไฟฟ้าแรงสูงขอนแก่น 2 (กฟผ.)',
    address: 'ต.ท่าพระ อ.เมือง จ.ขอนแก่น (ระบบ 115/230 kV) (16.0 กม.)',
    zone: 'อ.เมือง',
    distanceKm: 16.0,
    sector: 'high-voltage',
    sectorLabel: 'สถานีไฟฟ้าแรงสูง/PEA/EGAT',
    contactPerson: 'นายเกรียงไกร ชัยมงคล',
    phone: '043-261-002',
    lat: 16.3245,
    lng: 102.7981,
    studentsCount: 2,
    status: 'scheduled_soon',
    statusText: 'รอตรวจ พฤหัสนี้ (10:00 น.)',
    visitSchedule: 'นัดหมาย พฤหัสบดี 10:00 น.',
    assignedTeacher: 'อ.ประสิทธิ์ วงศ์วิริยะ',
    assignedStudents: [
      {
        studentId: 'std-6',
        studentName: 'นายปัญญาวุฒิ ขวัญแก้ว',
        studentCode: '66301040045',
        level: 'ปวส.2/1 ไฟฟ้า',
        latestWeekStatus: 'รอส่งรายงานสัปดาห์ 8'
      }
    ],
    jobScope: 'บำรุงรักษาสถานีไฟฟ้าแรงสูง 115/230 kV และระบบสวิตช์เกียร์ GIS'
  },
  {
    id: 'comp-6',
    name: 'โรงพยาบาลศูนย์ขอนแก่น (แผนกวิศวกรรมการแพทย์และไฟฟ้าอาคาร)',
    shortName: 'รพ.ศูนย์ขอนแก่น',
    address: 'ถ.ศรีจันทร์ อ.เมือง จ.ขอนแก่น (3.8 กม.)',
    zone: 'อ.เมือง',
    distanceKm: 3.8,
    sector: 'building',
    sectorLabel: 'ติดตั้งไฟฟ้าอาคาร',
    contactPerson: 'นายวิเชียร กองเกิด',
    phone: '043-042-888 ต่อ 1109',
    lat: 16.4290,
    lng: 102.8499,
    studentsCount: 2,
    status: 'completed',
    statusText: 'นิเทศเสร็จแล้ว',
    assignedTeacher: 'นายทักษิณ โสภาปิยะ',
    assignedStudents: [],
    jobScope: 'ระบบไฟฟ้าฉุกเฉิน Generator, UPS สำรองไฟห้องผ่าตัด และระบบหม้อแปลง 800 kVA'
  },
  {
    id: 'comp-7',
    name: 'โรงงานน้ำตาลมิตรผล ภูเวียง (ระบบ Cogeneration)',
    shortName: 'น้ำตาลมิตรผล ภูเวียง',
    address: 'อ.ชุมแพ - หนองเรือ จ.ขอนแก่น (54.0 กม.)',
    zone: 'อ.ชุมแพ',
    distanceKm: 54.0,
    sector: 'factory',
    sectorLabel: 'โรงงานอุตสาหกรรม/MDB/PLC',
    contactPerson: 'นายณรงค์ ศิริโสภณ',
    phone: '043-431-299',
    lat: 16.5412,
    lng: 102.3211,
    studentsCount: 3,
    status: 'scheduled_soon',
    statusText: 'รอตรวจ สัปดาห์หน้า',
    assignedTeacher: 'อ.ประสิทธิ์ วงศ์วิริยะ',
    assignedStudents: [],
    jobScope: 'ระบบผลิตไฟฟ้าจากชานอ้อย Generator 15 MW และระบบ SCADA ควบคุมไฟฟ้า'
  },
  {
    id: 'comp-8',
    name: 'สหกรณ์การเกษตรบ้านไผ่ จำกัด (ระบบโซลาร์ปั๊มน้ำ & ห้องเย็น)',
    shortName: 'สหกรณ์การเกษตรบ้านไผ่',
    address: 'อ.บ้านไผ่ จ.ขอนแก่น (44.0 กม.)',
    zone: 'อ.บ้านไผ่',
    distanceKm: 44.0,
    sector: 'solar',
    sectorLabel: 'Solar Cell & พลังงานทดแทน',
    contactPerson: 'นางกนกพร เลิศฤทธิ์',
    phone: '043-272-105',
    lat: 16.0592,
    lng: 102.7301,
    studentsCount: 2,
    status: 'completed',
    statusText: 'นิเทศเสร็จแล้ว',
    assignedTeacher: 'นายทักษิณ โสภาปิยะ',
    assignedStudents: [],
    jobScope: 'ระบบอินเวอร์เตอร์พลังงานแสงอาทิตย์ และมอเตอร์คอมเพรสเซอร์ห้องเย็น 3 เฟส'
  }
];

export const mockWeeklySubmissions: Record<string, WeeklySubmission[]> = {
  'std-1': [
    {
      id: 'sub-w8',
      studentId: 'std-1',
      weekNumber: 8,
      dateRange: '7 ธ.ค. 2569 - 11 ธ.ค. 2569',
      submittedAt: '11 ธ.ค. 2569 17:30 น.',
      status: 'pending',
      taskTitle: 'งานติดตั้งตู้ Distribution Board (MDB) & Wiring Control สายวงจรไฟฟ้าโรงงาน',
      totalHours: 40.0,
      mentorRating: 5.0,
      mentorComment: 'นักศึกษาตั้งใจปฏิบัติงาน สวมใส่อุปกรณ์คุ้มครองความปลอดภัย (PPE) ครบถ้วน มีความละเอียดรอบคอบในการขันบัสบาร์',
      mentorName: 'นายชาญชัย มงคลศรี',
      mentorPosition: 'วิศวกรไฟฟ้า / พี่เลี้ยงประจำสถานประกอบการ',
      teacherScore: 19.5,
      teacherGrade: 'A',
      teacherComment: 'บันทึกข้อมูลเรียบร้อย ภาพหลักฐานชัดเจน มีการคำนวณและระบุค่าทดสอบความต้านทานดินตรงตามเกณฑ์มาตรฐาน วสท.',
      teacherName: 'นายทักษิณ โสภาปิยะ',
      studentSignature: 'ธนากร สุริยะแสง',
      mentorSignature: 'ชาญชัย มงคลศรี',
      teacherSignature: 'ทักษิณ โสภาปิยะ',
      verifiedHash: '7B8C40018-KKTECH-2569-W08-OK',
      safetyChecklist: {
        hardHat: true,
        highVoltageGloves: true,
        safetyShoes: true,
        lotoProcedure: true
      },
      dailyLogs: [
        {
          id: 'log-1',
          day: 'จันทร์',
          date: '7 ธ.ค. 69',
          taskDescription: 'ตรวจสอบและซ่อมบำรุงตู้ MDB และ Main Circuit Breaker ตรวจขันจุดต่อสาย Busbar 400A, ทำความสะอาดตู้ และทดสอบระบบ Shunt Trip',
          toolsUsed: 'ประแจปอนด์, เครื่องเป่าลม',
          hours: 8.0,
          evaluation: 'ผ่าน (ดีเยี่ยม)'
        },
        {
          id: 'log-2',
          day: 'อังคาร',
          date: '8 ธ.ค. 69',
          taskDescription: 'เดินท่อร้อยสายไฟ EMT และดึงสาย THW สำหรับระบบส่องสว่าง ดัดท่อ EMT ขนาด 3/4" โค้ง 90 องศา และดึงสาย THW 2.5 sq.mm เข้าโคมไฟ LED High Bay',
          toolsUsed: 'Hickey Bender, Fish Tape',
          hours: 8.0,
          evaluation: 'ผ่าน (ดีเยี่ยม)'
        },
        {
          id: 'log-3',
          day: 'พุธ',
          date: '9 ธ.ค. 69',
          taskDescription: 'ทดสอบค่าความต้านทานดินระบบ Grounding (Ground Resistance Test) วัดค่าแท่งกราวด์ร็อดหม้อแปลงไฟฟ้า ได้ค่า 3.84 โอห์ม (มาตรฐาน วสท. กำหนดไม่เกิน 5 โอห์ม)',
          toolsUsed: 'Earth Tester, หมุดเสริม',
          hours: 8.0,
          evaluation: 'ผ่าน (ดีเยี่ยม)'
        },
        {
          id: 'log-4',
          day: 'พฤหัสบดี',
          date: '10 ธ.ค. 69',
          taskDescription: 'ติดตั้งและตั้งค่าโปรแกรมวงจรควบคุมมอเตอร์ 3 เฟส ด้วย PLC ต่อวงจร Magnetic Contactor ร่วมกับเซ็นเซอร์วัดอุณหภูมิ และเขียน Ladder Logic สำหรับระบบระบายความร้อน',
          toolsUsed: 'โน้ตบุ๊กทดสอบ, Clamp meter',
          hours: 8.0,
          evaluation: 'ผ่าน (ดีมาก)'
        },
        {
          id: 'log-5',
          day: 'ศุกร์',
          date: '11 ธ.ค. 69',
          taskDescription: 'สรุปงานประจำสัปดาห์และการปฏิบัติการความปลอดภัย (LOTO) ฝึกการทำ Lockout/Tagout ปลดสับระบบหม้อแปลง 22KV อย่างปลอดภัย และทำ 5ส. แผนกซ่อมบำรุง',
          toolsUsed: 'กุญแจ LOTO, ป้ายเตือน',
          hours: 8.0,
          evaluation: 'ผ่าน (ดีเยี่ยม)'
        }
      ],
      photos: [
        {
          id: 'p1',
          url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
          title: 'ภาพที่ 1: ตรวจสอบและขันแน่น Busbar MDB',
          caption: 'งานบำรุงรักษาเชิงป้องกันตู้ไฟฟ้าหลัก'
        },
        {
          id: 'p2',
          url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
          title: 'ภาพที่ 2: ตรวจวัดค่าความต้านทานดิน',
          caption: 'Earth Resistance Testing ได้ผล 3.84 Ω'
        },
        {
          id: 'p3',
          url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
          title: 'ภาพที่ 3: รับมอบหมายงานและทบทวน LOTO',
          caption: 'ร่วมกับนายชาญชัย มงคลศรี (พี่เลี้ยงประจำสถานประกอบการ)'
        }
      ]
    },
    {
      id: 'sub-w7',
      studentId: 'std-1',
      weekNumber: 7,
      dateRange: '3 มิ.ย. 2567 - 7 มิ.ย. 2567',
      submittedAt: '7 ก.ค. 2567 (19:15 น.)',
      status: 'graded',
      taskTitle: 'การตรวจสอบหม้อแปลงไฟฟ้าจำหน่ายและการทดสอบ Insulation Resistance',
      totalHours: 40.0,
      mentorRating: 5.0,
      mentorComment: 'ปฏิบัติงานได้คล่องแคล่ว',
      mentorName: 'นายชาญชัย มงคลศรี',
      mentorPosition: 'วิศวกรไฟฟ้า',
      teacherScore: 19.5,
      teacherGrade: 'ดีเยี่ยม (A)',
      teacherName: 'นายทักษิณ โสภาปิยะ',
      studentSignature: 'ธนากร สุริยะแสง',
      mentorSignature: 'ชาญชัย มงคลศรี',
      teacherSignature: 'ทักษิณ โสภาปิยะ',
      verifiedHash: '7B8C40018-KKTECH-2024-W07-OK',
      safetyChecklist: {
        hardHat: true,
        highVoltageGloves: true,
        safetyShoes: true,
        lotoProcedure: true
      },
      dailyLogs: [],
      photos: []
    },
    {
      id: 'sub-w6',
      studentId: 'std-1',
      weekNumber: 6,
      dateRange: '27 พ.ค. 2567 - 31 พ.ค. 2567',
      submittedAt: '30 มิ.ย. 2567 (20:00 น.)',
      status: 'graded',
      taskTitle: 'งานเดินท่อร้อยสายไฟฟ้า IMC และการดัดท่อ 90 องศา ระบบ Sub-Panel',
      totalHours: 40.0,
      mentorRating: 4.8,
      mentorComment: 'รอยดัดท่อสวยงาม งานตรงตามแบบ',
      mentorName: 'นายชาญชัย มงคลศรี',
      mentorPosition: 'วิศวกรไฟฟ้า',
      teacherScore: 18.0,
      teacherGrade: 'ดีมาก (B+)',
      teacherName: 'นายทักษิณ โสภาปิยะ',
      studentSignature: 'ธนากร สุริยะแสง',
      mentorSignature: 'ชาญชัย มงคลศรี',
      teacherSignature: 'ทักษิณ โสภาปิยะ',
      verifiedHash: '7B8C40018-KKTECH-2024-W06-OK',
      safetyChecklist: {
        hardHat: true,
        highVoltageGloves: true,
        safetyShoes: true,
        lotoProcedure: true
      },
      dailyLogs: [],
      photos: []
    },
    {
      id: 'sub-w5',
      studentId: 'std-1',
      weekNumber: 5,
      dateRange: '20 พ.ค. 2567 - 24 พ.ค. 2567',
      submittedAt: '23 มิ.ย. 2567 (18:40 น.)',
      status: 'graded',
      taskTitle: 'การติดตั้ง Magnetic Contactor และ Overload Relay ในวงจรสตาร์ทมอเตอร์ Star-Delta',
      totalHours: 40.0,
      mentorRating: 5.0,
      mentorComment: 'ต่อวงจรได้ถูกต้องตั้งแต่ครั้งแรก',
      mentorName: 'นายชาญชัย มงคลศรี',
      mentorPosition: 'วิศวกรไฟฟ้า',
      teacherScore: 18.5,
      teacherGrade: 'ดีเยี่ยม (A)',
      teacherName: 'นายทักษิณ โสภาปิยะ',
      studentSignature: 'ธนากร สุริยะแสง',
      mentorSignature: 'ชาญชัย มงคลศรี',
      teacherSignature: 'ทักษิณ โสภาปิยะ',
      verifiedHash: '7B8C40018-KKTECH-2024-W05-OK',
      safetyChecklist: {
        hardHat: true,
        highVoltageGloves: true,
        safetyShoes: true,
        lotoProcedure: true
      },
      dailyLogs: [],
      photos: []
    }
  ]
};

export const mockAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'มาตรการความปลอดภัยการปฏิบัติงานใกล้ระบบไฟฟ้าแรงสูง (PPE 100%)',
    content: 'ให้นักศึกษาทุกคนสวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล (ถุงมือยางกันไฟฟ้าแรงสูง, รองเท้าหัวเหล็ก ESD, หมวกนิรภัย มอก.) โดยเด็ดขาดขณะเข้าสถานีหม้อแปลงและสวิตช์เกียร์',
    date: '1 วันที่แล้ว',
    type: 'urgent',
    target: 'นักศึกษาทุกคน'
  },
  {
    id: 'ann-2',
    title: 'กำหนดการลงพื้นที่นิเทศรอบที่ 2 (โซน อ.น้ำพอง - ขอนแก่น)',
    content: 'ครูนิเทศก์จะเริ่มลงพื้นที่ตรวจสอบหน้างาน ณ สถานีไฟฟ้าแรงสูง กฟผ. และโรงงานอุตสาหกรรม วันที่ 15-20 พฤศจิกายนนี้ ขอให้นักศึกษาเตรียมเอกสาร มรฐ.02 ให้พร้อม',
    date: '3 วันที่แล้ว',
    type: 'schedule',
    target: 'นักศึกษาโซนน้ำพอง'
  },
  {
    id: 'ann-3',
    title: 'แจ้งปิดรอบบันทึกข้อมูลสัปดาห์ที่ 7 เรียบร้อยแล้ว',
    content: 'เจ้าหน้าที่ได้ทำการดึงข้อมูลเข้าสู่ Looker Studio สำหรับนักศึกษาที่มีข้อผิดพลาดในการแนบลิงก์ภาพ ให้ติดต่อครูที่ปรึกษาเพื่อปลดล็อกฟอร์ม',
    date: '5 วันที่แล้ว',
    type: 'general',
    target: 'ปวช.3 และ ปวส.2'
  }
];
