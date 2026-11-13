import { DailyLog, PhotoEvidence, WeeklySubmission } from '../types';

export interface WeekMeta {
  weekNumber: number;
  dateRange: string;
  title: string;
  defaultTask: string;
  tools: string;
  samplePhotos: PhotoEvidence[];
}

export const INTERNSHIP_START_DATE = '19 ต.ค. 2569';
export const ACADEMIC_TERM = 'ภาคเรียนที่ 2 ปีการศึกษา 2569';

export const WEEKS_1_TO_15: WeekMeta[] = [
  {
    weekNumber: 1,
    dateRange: '19 ต.ค. 2569 - 23 ต.ค. 2569',
    title: 'ปฐมนิเทศความปลอดภัย & กฎระเบียบโรงงาน',
    defaultTask: 'ปฐมนิเทศความปลอดภัยโรงงาน เรียนรู้ขั้นตอน Lockout/Tagout (LOTO) และการใช้อุปกรณ์ PPE',
    tools: 'หมวกนิรภัย, แว่นตานิรภัย, รองเท้าเซฟตี้, ชุดกุญแจ LOTO',
    samplePhotos: [
      {
        id: 'p-w1-1',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: การปฐมนิเทศความปลอดภัย',
        caption: 'รับฟังการอบรมความปลอดภัยทางวิศวกรรมร่วมกับหัวหน้าฝ่ายความปลอดภัย'
      },
      {
        id: 'p-w1-2',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: ตรวจเช็กอุปกรณ์ป้องกันภัย PPE',
        caption: 'ตรวจสอบความพร้อมของหมวก รองเท้าเซฟตี้ และถุงมือกันกระแสไฟฟ้า'
      },
      {
        id: 'p-w1-3',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: สาธิตขั้นตอน LOTO',
        caption: 'ฝึกการล็อกและแขวนป้ายเตือนระบบไฟฟ้ากำลัง'
      }
    ]
  },
  {
    weekNumber: 2,
    dateRange: '26 ต.ค. 2569 - 30 ต.ค. 2569',
    title: 'งานตรวจเช็กเครื่องมือวัดทางไฟฟ้า',
    defaultTask: 'ตรวจสอบและสอบเทียบเครื่องมือวัดไฟฟ้า มัลติมิเตอร์ แคลมป์มิเตอร์ และเครื่องวัดความเป็นฉนวน',
    tools: 'Digital Multimeter, Clamp Meter, Insulation Tester',
    samplePhotos: [
      {
        id: 'p-w2-1',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: ตรวจสอบความถูกต้องเครื่องวัด',
        caption: 'เทียบค่าแรงดันไฟฟ้ากับแหล่งจ่ายอ้างอิงมาตรฐาน'
      },
      {
        id: 'p-w2-2',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: ใช้แคลมป์มิเตอร์วัดกระแส',
        caption: 'วัดกระแสโหลดของมอเตอร์ปั๊มน้ำในกระบวนการผลิต'
      },
      {
        id: 'p-w2-3',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: บันทึกผลการสอบเทียบ',
        caption: 'ลงบันทึกในแบบฟอร์มตรวจสอบเครื่องมือประจำเดือน'
      }
    ]
  },
  {
    weekNumber: 3,
    dateRange: '2 พ.ย. 2569 - 6 พ.ย. 2569',
    title: 'งานเดินท่อร้อยสายไฟฟ้า EMT และดัดท่อ',
    defaultTask: 'ดัดท่อร้อยสายไฟฟ้า EMT ขนาด 1/2" และ 3/4" ด้วย Hickey Bender ร้อยสายไฟ THW สำหรับแสงสว่าง',
    tools: 'Hickey Bender, Fish Tape, คีมตัดสาย, ระดับน้ำ',
    samplePhotos: [
      {
        id: 'p-w3-1',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: ดัดท่อ EMT โค้ง 90 องศา',
        caption: 'คำนวณและดัดท่อตามแบบแปลนระบบไฟฟ้าโรงงาน'
      },
      {
        id: 'p-w3-2',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: ยึดแคลมป์ท่อกับผนังคอนกรีต',
        caption: 'ติดตั้งแคลมป์ประกับจับท่อตามมาตรฐานระยะยึดไม่เกิน 1 เมตร'
      },
      {
        id: 'p-w3-3',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: ดึงสาย THW เข้าท่อ',
        caption: 'ใช้ฟิชเทปร้อยสายไฟ 3 เส้นเข้าท่ออย่างเรียบร้อย'
      }
    ]
  },
  {
    weekNumber: 4,
    dateRange: '9 พ.ย. 2569 - 13 พ.ย. 2569',
    title: 'งานติดตั้งโคมไฟ LED High Bay & วงจรสวิตช์',
    defaultTask: 'ติดตั้งโคมไฟ LED High Bay 150W บนโครงหลังคาโรงงาน พร้อมเดินสายต่อวงจรสวิตช์ควบคุม',
    tools: 'สว่านไร้สาย, บันไดทรง A, ไขควงลองไฟ, ไขควงหุ้มฉนวน',
    samplePhotos: [
      {
        id: 'p-w4-1',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: ประกอบชุดแขวนโคมไฟ',
        caption: 'ยึดสายสลิงและขั้วต่อกันน้ำ IP65'
      },
      {
        id: 'p-w4-2',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: ต่อสายเข้ากล่อง Junction Box',
        caption: 'ต่อสายไฟด้วย Wire Nut และพันเทปละลายกันความชื้น'
      },
      {
        id: 'p-w4-3',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: ทดสอบเปิดใช้งานวงจร',
        caption: 'ตรวจวัดความสว่างตามเกณฑ์มาตรฐานความปลอดภัย'
      }
    ]
  },
  {
    weekNumber: 5,
    dateRange: '16 พ.ย. 2569 - 20 พ.ย. 2569',
    title: 'งานประกอบและไวร์ริ่งตู้ Consumer Unit',
    defaultTask: 'ติดตั้งเมนเบรกเกอร์ 2P และลูกย่อย RCBO สำหรับวงจรเต้ารับและเครื่องปรับอากาศ',
    tools: 'ไขควงฉนวน VDE, คีมปอกสายไฟ, คีมย้ำหางปลา',
    samplePhotos: [
      {
        id: 'p-w5-1',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: จัดเรียงลูกย่อยเบรกเกอร์',
        caption: 'แบ่งบาลานซ์โหลดแต่ละเฟสอย่างเหมาะสม'
      },
      {
        id: 'p-w5-2',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: ย้ำหางปลาขั้วต่อสาย',
        caption: 'เข้าสายดิน (PE) และสายนิวทรัล (N) แน่นหนา'
      },
      {
        id: 'p-w5-3',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: ตรวจสอบป้ายชื่อวงจร (Directory)',
        caption: 'ติดป้ายบอกหน้าที่ของลูกย่อยเบรกเกอร์แต่ละตัว'
      }
    ]
  },
  {
    weekNumber: 6,
    dateRange: '23 พ.ย. 2569 - 27 พ.ย. 2569',
    title: 'งานทดสอบความเป็นฉนวน (Insulation Test)',
    defaultTask: 'ใช้เครื่องวัดฉนวน Megger 1000V ทดสอบความต้านทานฉนวนระหว่างเฟสและระหว่างเฟสกับกราวด์',
    tools: 'Insulation Resistance Tester 1000V, ถุงมือยางกันไฟฟ้า',
    samplePhotos: [
      {
        id: 'p-w6-1',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: ต่อสายทดสอบของเมกเกอร์',
        caption: 'คีบสายวัดเข้ากับขั้วบัสบาร์ของตู้สวิตช์บอร์ด'
      },
      {
        id: 'p-w6-2',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: อ่านค่าความต้านทานฉนวน',
        caption: 'ได้ค่ามากกว่า 50 Mega-ohms ตามมาตรฐาน วสท.'
      },
      {
        id: 'p-w6-3',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: บันทึกรายงานการทดสอบฉนวน',
        caption: 'ลงลายมือชื่อร่วมกับวิศวกรผู้ควบคุม'
      }
    ]
  },
  {
    weekNumber: 7,
    dateRange: '30 พ.ย. 2569 - 4 ธ.ค. 2569',
    title: 'งานทดสอบความต้านทานดินระบบ Grounding',
    defaultTask: 'ตอกหมุดวัดค่าความต้านทานหลักดินด้วย Earth Tester ตรวจสอบค่าความต้านทานหม้อแปลง',
    tools: 'Earth Resistance Tester, หมุดเสริม P และ C, ค้อนตอกหมุด',
    samplePhotos: [
      {
        id: 'p-w7-1',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: ตอกหมุดหลักดินเสริมระยะ 5m และ 10m',
        caption: 'ตั้งหมุดแนวเส้นตรงตามหลักการ Fall-of-Potential'
      },
      {
        id: 'p-w7-2',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: วัดค่าความต้านทานดินได้ 3.84 โอห์ม',
        caption: 'ผ่านเกณฑ์มาตรฐานการไฟฟ้า (ไม่เกิน 5 โอห์ม)'
      },
      {
        id: 'p-w7-3',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: ตรวจขันจุดเชื่อมต่อสายดินหม้อแปลง',
        caption: 'ทาน้ำยาป้องกันการกัดกร่อนจุดต่อแท่งกราวด์'
      }
    ]
  },
  {
    weekNumber: 8,
    dateRange: '7 ธ.ค. 2569 - 11 ธ.ค. 2569',
    title: 'งานติดตั้งตู้ Distribution Board (MDB)',
    defaultTask: 'งานติดตั้งตู้ Distribution Board (MDB) & Wiring Control สายวงจรไฟฟ้าโรงงาน ขันแน่นบัสบาร์ 400A',
    tools: 'ประแจปอนด์, เครื่องเป่าลม, โคมไฟส่องตรวจ, Megger Test',
    samplePhotos: [
      {
        id: 'p-w8-1',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: ตรวจสอบและขันแน่น Busbar MDB',
        caption: 'งานบำรุงรักษาเชิงป้องกันตู้ไฟฟ้าหลัก'
      },
      {
        id: 'p-w8-2',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: ตรวจวัดค่าความต้านทานดิน',
        caption: 'Earth Resistance Testing ได้ผล 3.84 Ω'
      },
      {
        id: 'p-w8-3',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: รับมอบหมายงานและทบทวน LOTO',
        caption: 'ร่วมกับนายชาญชัย มงคลศรี พี่เลี้ยงประจำสถานประกอบการ'
      }
    ]
  },
  {
    weekNumber: 9,
    dateRange: '14 ธ.ค. 2569 - 18 ธ.ค. 2569',
    title: 'งานต่อวงจรควบคุมมอเตอร์ Star-Delta',
    defaultTask: 'ต่อสายวงจรควบคุม Magnetic Contactor 3 ตัว สำหรับการสตาร์ทมอเตอร์ 3 เฟสแบบลดกระแส',
    tools: 'ไขควงวัดไฟ, คีมย้ำหางปลา, มัลติมิเตอร์, Timer Relay',
    samplePhotos: [
      {
        id: 'p-w9-1',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: ต่อสายวงจรกำลัง Main-Star-Delta',
        caption: 'เดินสายไฟขนาด 16 sq.mm เข้าแมกเนติกคอนแทกเตอร์'
      },
      {
        id: 'p-w9-2',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: ตั้งเวลาทรานซิชัน Timer Relay',
        caption: 'กำหนดเวลาสลับจาก Star เป็น Delta 5 วินาที'
      },
      {
        id: 'p-w9-3',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: ทดสอบการหมุนของมอเตอร์',
        caption: 'ตรวจสอบทิศทางการหมุนตามลูกศรกำหนด'
      }
    ]
  },
  {
    weekNumber: 10,
    dateRange: '21 ธ.ค. 2569 - 25 ธ.ค. 2569',
    title: 'งานติดตั้ง Magnetic & Overload Relay',
    defaultTask: 'คำนวณและตั้งค่ากระแสตัดวงจรของ Thermal Overload Relay ป้องกันมอเตอร์ไหม้',
    tools: 'ประแจขัน, ไขควงปรับสเกล, แคลมป์มิเตอร์',
    samplePhotos: [
      {
        id: 'p-w10-1',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: ตั้งค่ากระแสพิกัดโอเวอร์โหลด',
        caption: 'ตั้งค่าที่ 1.15 เท่าของกระแสพิกัด Full Load'
      },
      {
        id: 'p-w10-2',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: ทดสอบการทริปจำลอง (Trip Test)',
        caption: 'กดปุ่ม Test เพื่อทดสอบกลไกตัดวงจรหน้าสัมผัส NC'
      },
      {
        id: 'p-w10-3',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: ตรวจสอบหลอดไฟแสดงสถานะ Overload',
        caption: 'ไฟสีเหลืองแสดงสถานะทำงานถูกต้อง'
      }
    ]
  },
  {
    weekNumber: 11,
    dateRange: '28 ธ.ค. 2569 - 1 ม.ค. 2570',
    title: 'งานเขียนโปรแกรมควบคุม PLC สายพานลำเลียง',
    defaultTask: 'เขียนบันไดลอจิก (Ladder Logic) เชื่อมต่อ Input/Output เข้ากับบอร์ด PLC และทดสอบการทำงาน',
    tools: 'โน้ตบุ๊กเขียนโปรแกรม PLC, สาย USB-RS485, ดิจิทัลมัลติมิเตอร์',
    samplePhotos: [
      {
        id: 'p-w11-1',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: ออนไลน์ดาวน์โหลดโปรแกรมลง PLC',
        caption: 'ต่อสายสื่อสารส่งโค้ดคำสั่งเข้าหน่วยประมวลผล'
      },
      {
        id: 'p-w11-2',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: ตรวจสัญญาณดิจิทัล Input/Output',
        caption: 'ทดสอบเซ็นเซอร์จับชิ้นงานบนสายพาน'
      },
      {
        id: 'p-w11-3',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: ซิวมูเลชันการทำงานจริง',
        caption: 'จำลองสภาวะขัดข้องและตรวจสอบระบบหยุดฉุกเฉิน E-Stop'
      }
    ]
  },
  {
    weekNumber: 12,
    dateRange: '4 ม.ค. 2570 - 8 ม.ค. 2570',
    title: 'งานติดตั้งเซ็นเซอร์อุตสาหกรรม (Sensors)',
    defaultTask: 'ติดตั้งเซ็นเซอร์ตรวจจับแบบ Photoelectric และ Inductive Proximity พร้อมตั้งระยะตรวจจับ',
    tools: 'ประแจปากตาย, ไขควงปรับ Potentiometer, แหล่งจ่าย 24VDC',
    samplePhotos: [
      {
        id: 'p-w12-1',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: ยึดขาจับเซ็นเซอร์ Proximity',
        caption: 'ตั้งระยะห่างจากชิ้นงานโลหะ 8 มิลลิเมตร'
      },
      {
        id: 'p-w12-2',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: ต่อสายไฟเลี้ยงเซ็นเซอร์ 3 สาย',
        caption: 'เชื่อมต่อสาย Brown (+), Blue (-), และ Black (Signal)'
      },
      {
        id: 'p-w12-3',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: ปรับแต่งความไวในการตรวจจับ',
        caption: 'ทดสอบกับชิ้นงานจริงความเร็วรอบปกติ'
      }
    ]
  },
  {
    weekNumber: 13,
    dateRange: '11 ม.ค. 2570 - 15 ม.ค. 2570',
    title: 'งานตรวจเช็ก Capacitor Bank & Power Factor',
    defaultTask: 'ตรวจเช็กชุดคาปาซิเตอร์แบงก์ วัดค่ากระแสแต่ละเฟส และตรวจสอบการทำงานของคอนโทรลเลอร์ PF',
    tools: 'True RMS Clamp Meter, Infrared Thermometer, คีมด้ามฉนวน',
    samplePhotos: [
      {
        id: 'p-w13-1',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: ตรวจความร้อนสะสมด้วยกล้องอินฟราเรด',
        caption: 'ไม่พบจุด Overheating ที่ขั้วต่อสายคาปาซิเตอร์'
      },
      {
        id: 'p-w13-2',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: วัดกระแสไหลผ่านแต่ละสเต็ป',
        caption: 'ตรวจสอบค่ากระแสว่าสมดุลทั้ง 3 เฟส'
      },
      {
        id: 'p-w13-3',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: อ่านค่า Power Factor รวม',
        caption: 'ได้ค่า 0.96 อยู่ในเกณฑ์มาตรฐานไม่เสียค่าปรับ กฟภ.'
      }
    ]
  },
  {
    weekNumber: 14,
    dateRange: '18 ม.ค. 2570 - 22 ม.ค. 2570',
    title: 'งานติดตั้งระบบ Solar Rooftop & อินเวอร์เตอร์',
    defaultTask: 'ตรวจสอบแผงโซลาร์เซลล์ วัดแรงดัน Voc และ Isc เข้าตู้ Combiner Box และอินเวอร์เตอร์ 3 เฟส',
    tools: 'PV Multimeter, คีมย้ำหัว MC4, ประแจปอนด์ยึดแคลมป์',
    samplePhotos: [
      {
        id: 'p-w14-1',
        url: 'https://images.unsplash.com/photo-1508873696983-2df57046475b?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: ตรวจสอบหัวต่อสาย MC4 Connector',
        caption: 'ย้ำขั้วสายและตรวจสอบการกันน้ำระดับ IP67'
      },
      {
        id: 'p-w14-2',
        url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: วัดแรงดันเปิดวงจร Voc แต่ละสตริง',
        caption: 'วัดแรงดันได้ 680VDC สม่ำเสมอทุกสตริง'
      },
      {
        id: 'p-w14-3',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: สตาร์ทเครื่องอินเวอร์เตอร์ Grid-Tied',
        caption: 'ตรวจสอบสถานะการขนานไฟเข้าสู่ระบบโรงงาน'
      }
    ]
  },
  {
    weekNumber: 15,
    dateRange: '25 ม.ค. 2570 - 29 ม.ค. 2570',
    title: 'งานทดสอบระบบไฟฟ้าทั้งระบบ (Commissioning)',
    defaultTask: 'ทดสอบการทำงานของระบบไฟฟ้าทั้งหมด สรุปบันทึกเวลาฝึกงานครบ 400 ชม. และจัดทำเอกสารส่งมอบ',
    tools: 'ชุดเครื่องมือวิศวกรรมไฟฟ้าครบชุด, แฟ้มสรุปผลงาน',
    samplePhotos: [
      {
        id: 'p-w15-1',
        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 1: ตรวจสอบความเรียบร้อยของตู้ควบคุม',
        caption: 'ตรวจเช็กจุดต่อสายทุกจุดและทำความสะอาดครั้งสุดท้าย'
      },
      {
        id: 'p-w15-2',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 2: สรุปผลการประเมินกับพี่เลี้ยง',
        caption: 'รับฟังคำแนะนำและข้อเสนอแนะในการปฏิบัติงานวิชาชีพ'
      },
      {
        id: 'p-w15-3',
        url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
        title: 'ภาพที่ 3: ถ่ายภาพความสำเร็จร่วมกับทีมวิศวกร',
        caption: 'เสร็จสิ้นการฝึกประสบการณ์วิชาชีพช่างไฟฟ้ากำลัง แผนกวิชาช่างไฟฟ้ากำลัง'
      }
    ]
  }
];

/**
 * Computes exact daily dates for each day of the week (Monday - Friday)
 * based on internship start date: 19 ต.ค. 2569 (Monday, October 19, 2026)
 */
export function getWeekDates(weekNum: number): { day: string; dateStr: string; fullDate: string }[] {
  // Start date: Monday, October 19, 2026 (Month index 9 is October)
  const baseStart = new Date(2026, 9, 19);
  const weekStart = new Date(baseStart.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
  
  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

  return days.map((day, idx) => {
    const d = new Date(weekStart.getTime() + idx * 24 * 60 * 60 * 1000);
    const dayNum = d.getDate();
    const monthStr = thaiMonthsShort[d.getMonth()];
    const yearBE = d.getFullYear() + 543;
    const yearShort = (yearBE % 100).toString().padStart(2, '0');
    return {
      day,
      dateStr: `${dayNum} ${monthStr} ${yearShort}`,
      fullDate: `${dayNum} ${monthStr} ${yearBE}`
    };
  });
}

export function getDefaultDailyLogsForWeek(weekNum: number): DailyLog[] {
  const meta = WEEKS_1_TO_15.find(w => w.weekNumber === weekNum) || WEEKS_1_TO_15[0];
  const dates = getWeekDates(weekNum);

  return dates.map((d, idx) => ({
    id: `log-w${weekNum}-${idx + 1}`,
    day: d.day,
    date: d.dateStr,
    taskDescription: `${meta.defaultTask} (ส่วนที่ ${idx + 1}/5)`,
    toolsUsed: meta.tools,
    hours: 8.0,
    evaluation: 'ผ่าน (ดีเยี่ยม)'
  }));
}

/**
 * คำนวณสัปดาห์ฝึกงานปัจจุบัน (1 - 18) อ้างอิงจากสัปดาห์ของเวลาปัจจุบัน (Real-time Date)
 */
export function getCurrentWeekInfo(currentDate: Date = new Date()) {
  const now = new Date(currentDate);
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth(); // 0 = Jan, 9 = Oct

  // กำหนดวันเริ่มต้นของภาคเรียน (เทอม 1 หรือ เทอม 2)
  let baseTermStart: Date;
  let termLabel = '';

  if (nowMonth >= 4 && nowMonth <= 8) {
    // ภาคเรียนที่ 1 (พฤษภาคม - กันยายน)
    baseTermStart = new Date(nowYear, 4, 18);
    const day = baseTermStart.getDay();
    const diff = baseTermStart.getDate() - day + (day === 0 ? -6 : 1);
    baseTermStart.setDate(diff);
    baseTermStart.setHours(0, 0, 0, 0);
    termLabel = `ภาคเรียนที่ 1/${nowYear + 543}`;
  } else {
    // ภาคเรียนที่ 2 (ตุลาคม - มีนาคม)
    const termYear = nowMonth <= 3 ? nowYear - 1 : nowYear;
    baseTermStart = new Date(termYear, 9, 19); // 19 ต.ค. (วันจันทร์)
    const day = baseTermStart.getDay();
    const diff = baseTermStart.getDate() - day + (day === 0 ? -6 : 1);
    baseTermStart.setDate(diff);
    baseTermStart.setHours(0, 0, 0, 0);
    termLabel = `ภาคเรียนที่ 2/${termYear + 543}`;
  }

  // คำนวณจำนวนสัปดาห์ที่ผ่านไปจากวันเริ่มต้น
  const diffMs = now.getTime() - baseTermStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  let calculatedWeek = Math.floor(diffDays / 7) + 1;

  // จำกัดขอบเขตให้อยู่ในช่วง 1 - 18 สัปดาห์
  if (calculatedWeek < 1) calculatedWeek = 1;
  if (calculatedWeek > 18) calculatedWeek = 18;

  // คำนวณวันที่เริ่มต้นและสิ้นสุดของสัปดาห์นี้
  const weekStart = new Date(baseTermStart.getTime() + (calculatedWeek - 1) * 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 4 * 24 * 60 * 60 * 1000); // วันศุกร์

  const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const startDay = weekStart.getDate();
  const startMonth = thaiMonthsShort[weekStart.getMonth()];
  const endDay = weekEnd.getDate();
  const endMonth = thaiMonthsShort[weekEnd.getMonth()];
  const yearBE = weekEnd.getFullYear() + 543;

  const dateRangeStr = `${startDay} ${startMonth} - ${endDay} ${endMonth} ${yearBE}`;
  const progressPercent = Math.min(100, Math.round((calculatedWeek / 18) * 100));

  return {
    weekNumber: calculatedWeek,
    totalWeeks: 18,
    dateRange: dateRangeStr,
    termLabel,
    progressPercent,
  };
}

