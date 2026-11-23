import { DailyLog, PhotoEvidence } from '../types';

export interface WeekMeta {
  weekNumber: number;
  title: string;
  dateRange: string;
  startDateIso: string;
  endDateIso: string;
  defaultTask: string;
  tools: string;
  samplePhotos: PhotoEvidence[];
}

export interface WeekDayInfo {
  day: string;
  dateStr: string;
  fullDate: string;
  isoDate: string;
}

const THAI_DAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'] as const;
const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;
const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const;

// Semester 2/2569 starts Monday 19 Oct 2026 (19 ต.ค. 2569)
const SEMESTER_START_UTC = Date.UTC(2026, 9, 19);

function formatUtcThaiShort(utcMs: number): string {
  const d = new Date(utcMs);
  const day = d.getUTCDate();
  const month = THAI_MONTHS_SHORT[d.getUTCMonth()];
  const yearBE = d.getUTCFullYear() + 543;
  return `${day} ${month} ${yearBE}`;
}

function formatUtcThaiCompact(utcMs: number): string {
  const d = new Date(utcMs);
  const day = d.getUTCDate();
  const month = THAI_MONTHS_SHORT[d.getUTCMonth()];
  const yearShortBE = String(d.getUTCFullYear() + 543).slice(-2);
  return `${day} ${month} ${yearShortBE}`;
}

function formatUtcThaiFull(utcMs: number): string {
  const d = new Date(utcMs);
  const day = d.getUTCDate();
  const month = THAI_MONTHS_FULL[d.getUTCMonth()];
  const yearBE = d.getUTCFullYear() + 543;
  return `${day} ${month} ${yearBE}`;
}

function formatUtcIso(utcMs: number): string {
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWeekDates(weekNumber: number): WeekDayInfo[] {
  const clamped = Math.min(18, Math.max(1, Math.round(Number(weekNumber) || 1)));
  const weekStartMs = SEMESTER_START_UTC + (clamped - 1) * 7 * 86400000;
  return THAI_DAYS.map((day, idx) => {
    const ms = weekStartMs + idx * 86400000;
    return {
      day,
      dateStr: formatUtcThaiCompact(ms),
      fullDate: formatUtcThaiFull(ms),
      isoDate: formatUtcIso(ms),
    };
  });
}

const WEEK_TOPIC_TEMPLATES: {
  title: string;
  defaultTask: string;
  tools: string;
}[] = [
  {
    title: 'ปฐมนิเทศความปลอดภัยและศึกษาระบบจำหน่ายไฟฟ้าเบื้องต้น',
    defaultTask: 'อบรมความปลอดภัย PPE มาตรฐานการไฟฟ้า และสำรวจอุปกรณ์หน้างาน',
    tools: 'หมวกนิรภัย, รองเท้านิรภัย, Digital Multimeter',
  },
  {
    title: 'การตรวจเช็กเครื่องมือวัดและการเตรียมวัสดุอุปกรณ์ไฟฟ้า',
    defaultTask: 'ตรวจสอบและจัดเตรียมสายไฟ รางเดินสาย และเครื่องมือวัดทางไฟฟ้า',
    tools: 'Clamp Meter, Insulation Tester, ชุดเครื่องมือช่างไฟฟ้า',
  },
  {
    title: 'การเดินสายไฟฟ้าในท่อ EMT / IMC และราง Wireway',
    defaultTask: 'ดัดท่อโลหะ ร้อยสายไฟฟ้า THW และติดตั้งราง Wireway ตามแบบ',
    tools: 'Pipe Bender, Fish Tape, สว่านไร้สาย, Wire Stripper',
  },
  {
    title: 'การติดตั้งอุปกรณ์สวิตช์ เต้ารับ และระบบแสงสว่าง',
    defaultTask: 'ต่อวงจรแสงสว่าง โคม LED และปลั๊กไฟอุตสาหกรรมพร้อมทดสอบแรงดัน',
    tools: 'คีมย้ำหางปลา, ไขควงวัดไฟ, Digital Multimeter',
  },
  {
    title: 'การประกอบและเดินสายตู้ย่อยโหลดเซ็นเตอร์ (Load Center)',
    defaultTask: 'จัดเรียงลูกเซอร์กิตเบรกเกอร์ เข้าหัวสาย และต่อบัสบาร์นิวทรัล/กราวด์',
    tools: 'ประแจทอร์ค, คีมตัดสายเคเบิล, Thermal Camera',
  },
  {
    title: 'การตรวจสอบระบบสายดิน (Grounding System) และป้องกันฟ้าผ่า',
    defaultTask: 'ตอกหลักดิน วัดค่าความต้านทานดิน และตรวจสอบจุดเชื่อมบอนดิ้ง',
    tools: 'Earth Ground Tester, ชุดเชื่อม Cadweld, Clamp Meter',
  },
  {
    title: 'งานบำรุงรักษาระบบปรับอากาศและเครื่องทำความเย็นอุตสาหกรรม',
    defaultTask: 'ตรวจวัดกระแสคอมเพรสเซอร์ ล้างคอยล์ และตรวจเช็กคอนแทคเตอร์ควบคุม',
    tools: 'Manifold Gauge, Clamp Meter, เทอร์โมมิเตอร์ดิจิทัล',
  },
  {
    title: 'งานติดตั้งตู้ Distribution Board (MDB) & Wiring Control',
    defaultTask: 'ติดตั้งตู้ MDB เข้าสายเมนแรงต่ำ ขันทอร์คบัสบาร์ และตรวจสอบเฟส',
    tools: 'ประแจปอนด์, Insulation Tester, Phase Sequence Meter',
  },
  {
    title: 'การประกอบวงจรควบคุมมอเตอร์ไฟฟ้า 3 เฟส (Magnetic & Overload)',
    defaultTask: 'ประกอบวงจรสตาร์ทมอเตอร์ Star-Delta และทดสอบการทำงานของ Overload Relay',
    tools: 'Digital Multimeter, ไขควงหุ้มฉนวน, เครื่องทดสอบมอเตอร์',
  },
  {
    title: 'การตรวจซ่อมบำรุงหม้อแปลงไฟฟ้าระบบจำหน่ายและสวิตช์เกียร์',
    defaultTask: 'ตรวจสอบระดับน้ำมันฉนวน ซิลิกาเจล และวัดค่าความเป็นฉนวนขดลวด',
    tools: 'Megger 5kV, Infrared Thermometer, อุปกรณ์ LOTO',
  },
  {
    title: 'งานระบบควบคุมอัตโนมัติ PLC และอินเวอร์เตอร์ (VFD)',
    defaultTask: 'ต่อสาย I/O โมดูล PLC และตั้งค่าพารามิเตอร์ Inverter ควบคุมความเร็วมอเตอร์',
    tools: 'Notebook โปรแกรม PLC, Multimeter, ชุดจั๊มเปอร์สายสัญญาณ',
  },
  {
    title: 'งานติดตั้งและบำรุงรักษาระบบผลิตไฟฟ้าพลังงานแสงอาทิตย์ (Solar PV)',
    defaultTask: 'ตรวจวัดแรงดัน DC String เชื่อมต่อ Combiner Box และตรวจเช็ก Inverter',
    tools: 'Solar Clamp Meter, MC4 Crimping Tool, Pyranometer',
  },
  {
    title: 'การตรวจวัดคุณภาพกำลังไฟฟ้า (Power Quality) และคาปาซิเตอร์แบงค์',
    defaultTask: 'วัดค่า Power Factor, Harmonic และตรวจสอบสเต็ปคาปาซิเตอร์แบงค์',
    tools: 'Power Quality Analyzer, Clamp Meter, Thermal Camera',
  },
  {
    title: 'การบำรุงรักษาระบบไฟฟ้าฉุกเฉินและเครื่องกำเนิดไฟฟ้าสำรอง (Generator)',
    defaultTask: 'ทดสอบตู้สลับแหล่งจ่ายอัตโนมัติ (ATS) และตรวจเช็กแบตเตอรี่สตาร์ทเครื่อง',
    tools: 'Battery Tester, Digital Multimeter, เครื่องวัดความถี่',
  },
  {
    title: 'การตรวจสอบระบบแจ้งเหตุเพลิงไหม้ (Fire Alarm) และความปลอดภัยอาคาร',
    defaultTask: 'ทดสอบอุปกรณ์ Smoke Detector และวงจรแจ้งเตือนภัยในพื้นที่ปฏิบัติงาน',
    tools: 'Smoke Tester, Multimeter, ชุดเครื่องมือซ่อมบำรุง',
  },
  {
    title: 'งานตรวจวัดความร้อนด้วยกล้องอินฟราเรด (Thermoscan Preventive Maintenance)',
    defaultTask: 'สแกนจุดต่อสายไฟ ตู้ MDB และขั้วเบรกเกอร์เพื่อป้องกันจุดร้อนผิดปกติ',
    tools: 'Thermal Imaging Camera, Clamp Meter, กล้องบันทึกภาพ',
  },
  {
    title: 'การสรุปผลวิเคราะห์ปัญหาทางเทคนิคและการจัดทำรายงานโครงงานฝึกอาชีพ',
    defaultTask: 'รวบรวมข้อมูลผลการปฏิบัติงาน ทดสอบระบบ และปรับแก้ข้อบกพร่องหน้างาน',
    tools: 'คู่มือซ่อมบำรุง, คอมพิวเตอร์, แบบแปลนไฟฟ้า As-Built',
  },
  {
    title: 'ประเมินผลปลายภาคเรียน ส่งมอบงาน และสรุปสมรรถนะวิชาชีพ (ทว.04)',
    defaultTask: 'ทบทวนมาตรฐานความปลอดภัย ส่งคืนอุปกรณ์ และรับการประเมินจากพี่เลี้ยง',
    tools: 'แบบบันทึก ทว.04, เอกสารประเมินผลสถานประกอบการ',
  },
];

const SAMPLE_PHOTO_URLS = [
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80',
];

export const WEEKS_1_TO_18: WeekMeta[] = WEEK_TOPIC_TEMPLATES.map((tpl, idx) => {
  const weekNumber = idx + 1;
  const startMs = SEMESTER_START_UTC + idx * 7 * 86400000;
  const endMs = startMs + 4 * 86400000;
  const dateRange = `${formatUtcThaiShort(startMs)} - ${formatUtcThaiShort(endMs)}`;

  return {
    weekNumber,
    title: tpl.title,
    dateRange,
    startDateIso: formatUtcIso(startMs),
    endDateIso: formatUtcIso(endMs),
    defaultTask: tpl.defaultTask,
    tools: tpl.tools,
    samplePhotos: [
      {
        id: `sample-w${weekNumber}-1`,
        url: SAMPLE_PHOTO_URLS[idx % SAMPLE_PHOTO_URLS.length],
        title: `ปฏิบัติงานสัปดาห์ที่ ${weekNumber}`,
        caption: `${tpl.title} (${dateRange})`,
      },
      {
        id: `sample-w${weekNumber}-2`,
        url: SAMPLE_PHOTO_URLS[(idx + 1) % SAMPLE_PHOTO_URLS.length],
        title: `ตรวจเช็กมาตรฐานความปลอดภัยหน้างาน`,
        caption: `ใช้เครื่องมือ: ${tpl.tools}`,
      },
    ],
  };
});

export function getCurrentWeekInfo(): {
  weekNumber: number;
  totalWeeks: number;
  dateRange: string;
  title: string;
  progressPercent: number;
} {
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((todayUtc - SEMESTER_START_UTC) / 86400000);
  const rawWeek = Math.floor(diffDays / 7) + 1;
  const weekNumber = Math.min(18, Math.max(1, rawWeek));
  const meta = WEEKS_1_TO_18[weekNumber - 1] || WEEKS_1_TO_18[7];
  return {
    weekNumber,
    totalWeeks: 18,
    dateRange: meta.dateRange,
    title: meta.title,
    progressPercent: Math.round((weekNumber / 18) * 100),
  };
}

export function getDefaultDailyLogsForWeek(weekNumber: number): DailyLog[] {
  const clamped = Math.min(18, Math.max(1, Math.round(Number(weekNumber) || 1)));
  const meta = WEEKS_1_TO_18[clamped - 1] || WEEKS_1_TO_18[0];
  const dates = getWeekDates(clamped);

  const dayActions = [
    `ศึกษาแบบงาน วางแผนปฏิบัติ และตรวจเช็กอุปกรณ์PPE (${meta.title})`,
    `${meta.defaultTask} ส่วนที่ 1 ตามคำแนะนำของพี่เลี้ยง`,
    `ปฏิบัติงานหลักหน้างาน: ${meta.defaultTask} และบันทึกค่าทางไฟฟ้า`,
    `ตรวจสอบความถูกต้อง ทดสอบการทำงานและความปลอดภัยของระบบ`,
    `บำรุงรักษาเครื่องมือ ทำความสะอาดพื้นที่ และสรุปรายงานประจำสัปดาห์`,
  ];

  return dates.map((d, idx) => ({
    id: `dl-w${clamped}-d${idx + 1}`,
    day: d.day,
    date: d.dateStr,
    taskDescription: dayActions[idx] || meta.defaultTask,
    toolsUsed: meta.tools,
    hours: 8,
    evaluation: 'ผ่านเกณฑ์มาตรฐาน',
  }));
}
