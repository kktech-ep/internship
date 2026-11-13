import React, { useState, useMemo, useEffect } from 'react';
import { 
  MapPin, 
  Search, 
  Filter, 
  Navigation, 
  ExternalLink, 
  Download, 
  Plus, 
  Phone, 
  Users, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Zap, 
  ChevronRight, 
  Route, 
  Compass, 
  Eye,
  Layers,
  ZoomIn,
  ZoomOut,
  FileText,
  Camera,
  Award,
  ShieldCheck,
  AlertCircle,
  Calendar,
  ChevronDown,
  UserCheck,
  Image as ImageIcon,
  Check,
  Sparkles,
  School
} from 'lucide-react';
import { Company, Student, Form3SupervisionRecord, Form3Photo } from '../types';
import { getAllLoginSheetStudents } from '../services/sheetAuthService';
import { getLocalForm3Rows } from '../services/googleSheetsService';
import { subscribeForm3Supervisions } from '../services/firestoreService';

interface CompanyMapViewProps {
  companies: Company[];
  students: Student[];
  onOpenForm1: () => void;
  onOpenForm3: (studentId?: string) => void;
}

export interface SheetCompanyItem {
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
  isSupervised: boolean;
  statusText: string;
  jobScope: string;
}

// Coordinate mapping helper for districts in Khon Kaen & neighboring areas on SVG map (800x650)
function getSvgCoordinates(compName: string, index: number): { x: number; y: number; lat: number; lng: number; zone: string } {
  const lower = compName.toLowerCase();
  
  if (lower.includes('เชียงยืน')) {
    return { x: 580, y: 310, lat: 16.4021, lng: 103.1022, zone: 'อ.เชียงยืน' };
  }
  if (lower.includes('บ้านฝาง')) {
    return { x: 300, y: 315, lat: 16.4522, lng: 102.6321, zone: 'อ.บ้านฝาง' };
  }
  if (lower.includes('ท่าคันโท')) {
    return { x: 570, y: 140, lat: 16.9211, lng: 103.2422, zone: 'อ.ท่าคันโท' };
  }
  if (lower.includes('น้ำหนาว')) {
    return { x: 120, y: 180, lat: 16.7821, lng: 101.7222, zone: 'อ.น้ำหนาว' };
  }
  if (lower.includes('บ้านไผ่')) {
    return { x: 430, y: 520, lat: 16.0592, lng: 102.7301, zone: 'อ.บ้านไผ่' };
  }
  if (lower.includes('ภูเขียว')) {
    return { x: 160, y: 260, lat: 16.3721, lng: 102.1322, zone: 'อ.ภูเขียว' };
  }
  if (lower.includes('หนองเรือ')) {
    return { x: 250, y: 310, lat: 16.4921, lng: 102.4822, zone: 'อ.หนองเรือ' };
  }
  if (lower.includes('น้ำพอง') || lower.includes('มิตรผล')) {
    return { x: 460, y: 110, lat: 16.7112, lng: 102.8711, zone: 'อ.น้ำพอง' };
  }
  if (lower.includes('ชุมแพ')) {
    return { x: 180, y: 320, lat: 16.5411, lng: 102.1011, zone: 'อ.ชุมแพ' };
  }
  if (lower.includes('ท่าพระ') || lower.includes('230kv') || lower.includes('กฟผ.')) {
    return { x: 420, y: 470, lat: 16.3211, lng: 102.8011, zone: 'ต.ท่าพระ' };
  }
  if (lower.includes('ศิลา') || lower.includes('โซล่าร์') || lower.includes('kkp')) {
    return { x: 450, y: 190, lat: 16.4821, lng: 102.8422, zone: 'ต.ศิลา' };
  }
  if (lower.includes('มิตซูบิชิ') || lower.includes('แอร์') || lower.includes('consumer')) {
    return { x: 530, y: 370, lat: 16.4111, lng: 102.8922, zone: 'นิคมอุตสาหกรรม' };
  }

  // Central Khon Kaen city spread with deterministic offset based on index
  const angle = (index * 37) % 360;
  const rad = (angle * Math.PI) / 180;
  const dist = 30 + ((index * 19) % 75);
  const baseX = 440;
  const baseY = 290;
  const x = Math.round(baseX + Math.cos(rad) * dist);
  const y = Math.round(baseY + Math.sin(rad) * dist);
  const lat = 16.4322 + (Math.sin(rad) * dist * 0.001);
  const lng = 102.8236 + (Math.cos(rad) * dist * 0.001);

  return { x, y, lat: parseFloat(lat.toFixed(4)), lng: parseFloat(lng.toFixed(4)), zone: 'อ.เมืองขอนแก่น' };
}

export const CompanyMapView: React.FC<CompanyMapViewProps> = ({
  companies: _propCompanies,
  students: propStudents,
  onOpenForm1,
  onOpenForm3,
}) => {
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCompanyId, setActiveCompanyId] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedPhoto, setSelectedPhoto] = useState<Form3Photo | null>(null);
  const [form3List, setForm3List] = useState<Form3SupervisionRecord[]>(() => getLocalForm3Rows());

  // Listen to Firestore real-time Form 3 supervision records and merge with local
  useEffect(() => {
    const unsub = subscribeForm3Supervisions(
      (remoteRecords) => {
        if (remoteRecords && remoteRecords.length > 0) {
          const local = getLocalForm3Rows();
          const map = new Map<string, Form3SupervisionRecord>();
          local.forEach(r => map.set(r.id, r));
          remoteRecords.forEach(r => map.set(r.id, r));
          setForm3List(Array.from(map.values()));
        }
      },
      (err) => console.warn('Form 3 stream notice:', err)
    );
    return () => unsub();
  }, []);

  // Merge propStudents with complete Google Sheets "login" tab students
  const allSheetStudents = useMemo<Student[]>(() => {
    const fromSheet = getAllLoginSheetStudents();
    const map = new Map<string, Student>();
    
    // Fill from preloaded/cached sheet rows
    for (const s of fromSheet) {
      if (s.studentCode) map.set(s.studentCode, s);
    }
    // Merge props
    for (const s of propStudents) {
      if (s.studentCode) {
        const exist = map.get(s.studentCode);
        map.set(s.studentCode, { ...exist, ...s });
      }
    }
    return Array.from(map.values());
  }, [propStudents]);

  // Build complete list of distinct companies referencing Google Sheets "login" tab Company column
  const sheetCompanies = useMemo<SheetCompanyItem[]>(() => {
    const compGroups = new Map<string, {
      name: string;
      students: Student[];
      firstStudent: Student;
    }>();

    // Group students by Company
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

    const items: SheetCompanyItem[] = [];
    let idx = 1;

    for (const [name, group] of compGroups.entries()) {
      const compId = `comp-${idx++}`;
      const firstStd = group.firstStudent;
      const reg = firstStd.companyRegistration;
      const coords = getSvgCoordinates(name, idx);

      // Determine sector
      let sector: 'pea' | 'solar' | 'factory' | 'service' = 'service';
      let sectorLabel = 'ระบบไฟฟ้าและบริการทั่วไป';
      if (name.includes('การไฟฟ้า') || name.includes('กฟภ') || name.includes('กฟผ') || name.includes('PEA') || name.includes('EGAT')) {
        sector = 'pea';
        sectorLabel = 'สถานีไฟฟ้า & สายส่ง PEA/EGAT';
      } else if (name.includes('โซล่าร์') || name.includes('Solar') || name.includes('พลังงาน')) {
        sector = 'solar';
        sectorLabel = 'ระบบพลังงานทดแทน & Solar Rooftop';
      } else if (name.includes('อุตสาหกรรม') || name.includes('ผลิต') || name.includes('มิตซูบิชิ') || name.includes('คูโบต้า') || name.includes('ไทยเพาเวอร์') || name.includes('PLC')) {
        sector = 'factory';
        sectorLabel = 'โรงงานอุตสาหกรรม / ตู้ MDB & PLC';
      }

      // Match Form 3 supervision records for this company or its students
      const matchedForm3 = form3List.filter(f => {
        const matchName = f.companyName && (
          f.companyName.includes(name) || 
          name.includes(f.companyName) ||
          (name.includes('การไฟฟ้าส่วนภูมิภาค') && f.companyName.includes('การไฟฟ้าส่วนภูมิภาค'))
        );
        const matchStudent = group.students.some(s => 
          s.studentCode === f.studentCode || 
          s.id === f.studentId || 
          s.name === f.studentName
        );
        return matchName || matchStudent;
      });

      const isSupervised = matchedForm3.length > 0;
      const statusText = isSupervised ? 'นิเทศแล้ว' : 'รอนิเทศ';

      items.push({
        id: compId,
        name: name,
        address: `${coords.zone} จ.ขอนแก่น (เชื่อมโยงจากแผ่นงาน Login)`,
        zone: coords.zone,
        distanceKm: Math.round(((coords.lat - 16.4322) ** 2 + (coords.lng - 102.8236) ** 2) * 5000) / 10 + 3.5,
        sector,
        sectorLabel,
        contactPerson: reg?.mentorName || 'วิศวกรผู้ควบคุมงาน / ผู้จัดการฝ่าย',
        phone: reg?.emergencyPhone || reg?.mentorPhone || '043-221-xxx',
        lat: reg?.gpsLat || coords.lat,
        lng: reg?.gpsLng || coords.lng,
        mapX: coords.x,
        mapY: coords.y,
        students: group.students,
        studentsCount: group.students.length,
        form3Records: matchedForm3,
        isSupervised,
        statusText,
        jobScope: reg?.department || 'งานติดตั้ง บำรุงรักษา และควบคุมระบบไฟฟ้ากำลัง'
      });
    }

    // Sort by student count descending (places with more students appear first)
    return items.sort((a, b) => b.studentsCount - a.studentsCount);
  }, [allSheetStudents, form3List]);

  // Set default active company to first company if unset
  useEffect(() => {
    if (sheetCompanies.length > 0 && !activeCompanyId) {
      setActiveCompanyId(sheetCompanies[0].id);
    }
  }, [sheetCompanies, activeCompanyId]);

  // Filter companies based on search, zone, sector, and status
  const filteredCompanies = useMemo(() => {
    return sheetCompanies.filter((c) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term ||
        c.name.toLowerCase().includes(term) ||
        c.address.toLowerCase().includes(term) ||
        c.contactPerson.toLowerCase().includes(term) ||
        c.zone.toLowerCase().includes(term) ||
        c.students.some(s => s.name.toLowerCase().includes(term) || s.studentCode.includes(term));

      const matchesZone = selectedZone === 'all' || c.zone.includes(selectedZone);
      const matchesSector = selectedSector === 'all' || c.sector === selectedSector;
      const matchesStatus = selectedStatus === 'all' || 
        (selectedStatus === 'completed' && c.isSupervised) ||
        (selectedStatus === 'pending' && !c.isSupervised);

      return matchesSearch && matchesZone && matchesSector && matchesStatus;
    });
  }, [sheetCompanies, searchTerm, selectedZone, selectedSector, selectedStatus]);

  // Current active company object
  const activeCompany = useMemo(() => {
    return sheetCompanies.find((c) => c.id === activeCompanyId) || sheetCompanies[0] || null;
  }, [sheetCompanies, activeCompanyId]);

  // Latest Form 3 record of active company
  const latestForm3 = useMemo(() => {
    if (!activeCompany || activeCompany.form3Records.length === 0) return null;
    return activeCompany.form3Records[0];
  }, [activeCompany]);

  // Export KML file
  const handleExportKML = () => {
    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>KKTECH Electrical Internship Companies 2569</name>
    ${filteredCompanies.map(c => `
    <Placemark>
      <name>${c.name} (${c.studentsCount} คน)</name>
      <description><![CDATA[
        <b>สถานประกอบการ:</b> ${c.name}<br/>
        <b>ที่อยู่:</b> ${c.address}<br/>
        <b>ผู้ติดต่อ:</b> ${c.contactPerson} (${c.phone})<br/>
        <b>นักศึกษา:</b><br/>
        ${c.students.map((s, idx) => `${idx + 1}. ${s.studentCode} ${s.name} (${s.room})`).join('<br/>')}
      ]]></description>
      <Point>
        <coordinates>${c.lng},${c.lat},0</coordinates>
      </Point>
    </Placemark>`).join('')}
  </Document>
</kml>`;

    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'KKTECH_Company_Map_LoginSheet.kml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Open Google Maps navigation
  const handleOpenGoogleMaps = (company: SheetCompanyItem) => {
    const query = encodeURIComponent(`${company.name} ${company.zone} ขอนแก่น`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const totalStudentsInSystem = allSheetStudents.length;
  const totalCompaniesCount = sheetCompanies.length;
  const supervisedCount = sheetCompanies.filter(c => c.isSupervised).length;
  const pendingCount = totalCompaniesCount - supervisedCount;

  return (
    <div className="space-y-6 pb-12 font-['Prompt',sans-serif]">
      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-3 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <div className="font-bold text-sm text-slate-900">{selectedPhoto.title}</div>
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center">
              <img 
                src={selectedPhoto.url} 
                alt={selectedPhoto.title} 
                className="max-h-[70vh] w-auto object-contain" 
              />
            </div>
            {selectedPhoto.caption && (
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {selectedPhoto.caption}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top Banner & Stats Overview */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-800">
                Google Sheets แผ่นงาน Login (คอลัมน์ Company) ⇋ ข้อมูลเข้านิเทศ Form 3
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500">อ้างอิงฐานข้อมูลจริง 2569</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              แผนที่พิกัดสถานประกอบการ & ข้อมูลการเข้านิเทศ (Company Map & Form 3 Roster)
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              เลือกสถานประกอบการเพื่อแสดงนักศึกษาที่เข้าฝึกงานในสถานที่เดียวกันทั้งหมด พร้อมตรวจสอบข้อมูลและหลักฐานการนิเทศจาก Form 3
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportKML}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition cursor-pointer"
              title="ส่งออกพิกัดสถานประกอบการทั้งหมดเป็นไฟล์ KML / Google Earth"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>ส่งออกพิกัด (KML)</span>
            </button>
            <a
              href="https://maps.google.com/?q=Khon+Kaen"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>เปิด Google Maps</span>
            </a>
            <button
              onClick={onOpenForm1}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>บันทึกข้อมูลสถานประกอบการ</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">สถานประกอบการทั้งหมด (Sheet)</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {totalCompaniesCount} <span className="text-xs font-normal text-slate-500">แห่ง</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">อ้างอิงแผ่นงาน Login</div>
            </div>
            <Building2 className="w-6 h-6 text-sky-600/70" />
          </div>

          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-emerald-700 font-medium">ตรวจนิเทศแล้ว</span>
              <div className="text-xl font-bold text-emerald-700 mt-0.5">
                {supervisedCount} <span className="text-xs font-normal text-emerald-600">แห่ง ({totalCompaniesCount > 0 ? Math.round((supervisedCount / totalCompaniesCount) * 100) : 0}%)</span>
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">มีบันทึกรายงาน & รูปภาพ</div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>

          <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-amber-700 font-medium">รอนิเทศงาน</span>
              <div className="text-xl font-bold text-amber-700 mt-0.5">
                {pendingCount} <span className="text-xs font-normal text-amber-600">แห่ง</span>
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5">รออาจารย์นิเทศก์ลงพื้นที่</div>
            </div>
            <Clock className="w-6 h-6 text-amber-600" />
          </div>

          <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-indigo-700 font-medium">นักศึกษาในสถานประกอบการ</span>
              <div className="text-xl font-bold text-indigo-800 mt-0.5">
                {totalStudentsInSystem} <span className="text-xs font-normal text-indigo-600">คน (ครบ 100%)</span>
              </div>
              <div className="text-[10px] text-indigo-700 mt-0.5">แผนกวิชาช่างไฟฟ้ากำลัง</div>
            </div>
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        {/* Company Quick Selector Dropdown & Filter Controls */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Direct Company Selection Dropdown referencing Google Sheets Company column */}
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                <span>เลือกสถานประกอบการ (แสดงนักศึกษาที่ฝึกงานในที่เดียวกันทั้งหมด):</span>
              </label>
              <div className="relative">
                <select
                  value={activeCompanyId}
                  onChange={(e) => setActiveCompanyId(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-xs font-semibold border border-sky-300 rounded-lg bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-2xs"
                >
                  {filteredCompanies.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} — [นักศึกษา {comp.studentsCount} คน] ({comp.zone}) {comp.isSupervised ? '✓ นิเทศแล้ว' : '⏱ รอนิเทศ'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Search Input */}
            <div className="lg:w-80">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                พิมพ์ค้นหา (ชื่อบริษัท, รหัส/ชื่อนักศึกษา):
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อบริษัท, รหัสหรือชื่อนักศึกษา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-xs">
            {/* Zone filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-medium mr-1">พื้นที่:</span>
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'อ.เมือง', label: 'อ.เมืองขอนแก่น' },
                { id: 'อ.บ้านฝาง', label: 'อ.บ้านฝาง' },
                { id: 'อ.น้ำพอง', label: 'อ.น้ำพอง' },
                { id: 'อ.บ้านไผ่', label: 'อ.บ้านไผ่' },
                { id: 'อ.ภูเขียว', label: 'อ.ภูเขียว/ชุมแพ' },
              ].map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZone(zone.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    selectedZone === zone.id
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {zone.label}
                </button>
              ))}
            </div>

            {/* Status filters */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-medium mr-1">สถานะการนิเทศ:</span>
              {[
                { id: 'all', label: `ทั้งหมด (${sheetCompanies.length})` },
                { id: 'completed', label: `นิเทศแล้ว (${supervisedCount})` },
                { id: 'pending', label: `รอนิเทศ (${pendingCount})` },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSelectedStatus(st.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    selectedStatus === st.id
                      ? 'bg-sky-700 text-white font-bold'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout: Interactive Map (7 cols) + Selected Company Detail & Students & Form 3 (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Map Container (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-3 shadow-sm relative overflow-hidden flex flex-col">
          {/* Map canvas wrapper */}
          <div className="relative w-full h-[540px] bg-[#dbeafe] rounded-xl overflow-hidden border border-slate-200 shadow-inner select-none">
            {/* SVG Interactive Map of Khon Kaen */}
            <svg
              viewBox="0 0 800 650"
              className="w-full h-full object-cover transition-transform duration-300"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* Background terrain */}
              <rect width="800" height="650" fill="#eaf2ec" />

              {/* Water bodies */}
              <ellipse cx="460" cy="380" rx="45" ry="32" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="2" />
              <text x="430" y="385" fontSize="10" fill="#0284c7" fontWeight="bold">บึงแก่นนคร</text>

              <ellipse cx="490" cy="240" rx="35" ry="25" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="2" />
              <text x="465" y="245" fontSize="9" fill="#0284c7" fontWeight="bold">บึงทุ่งสร้าง</text>

              {/* District boundaries & labels */}
              <text x="380" y="320" fontSize="16" fill="#cbd5e1" fontWeight="bold" letterSpacing="4">
                KHON KAEN
              </text>
              <text x="400" y="340" fontSize="11" fill="#64748b" fontWeight="600">
                ตำบลในเมือง (NAI MUEANG)
              </text>
              <text x="270" y="300" fontSize="10" fill="#64748b" fontWeight="500">
                บ้านเป็ด / บ้านฝาง
              </text>
              <text x="390" y="160" fontSize="11" fill="#64748b" fontWeight="600">
                ต.ศิลา / อ.น้ำพอง
              </text>
              <text x="390" y="520" fontSize="11" fill="#64748b" fontWeight="600">
                ต.ท่าพระ / อ.บ้านไผ่
              </text>

              {/* Highway 2 (Mittraphap - North to South) */}
              <line x1="430" y1="20" x2="430" y2="630" stroke="#fcd34d" strokeWidth="8" />
              <line x1="430" y1="20" x2="430" y2="630" stroke="#f59e0b" strokeWidth="4" />
              <circle cx="430" cy="80" r="10" fill="#dc2626" />
              <text x="427" y="84" fontSize="9" fill="white" fontWeight="bold">2</text>
              <circle cx="430" cy="580" r="10" fill="#dc2626" />
              <text x="427" y="584" fontSize="9" fill="white" fontWeight="bold">2</text>

              {/* Highway 12 (Maliwan - West to East) */}
              <line x1="20" y1="320" x2="780" y2="320" stroke="#fcd34d" strokeWidth="6" />
              <line x1="20" y1="320" x2="780" y2="320" stroke="#f59e0b" strokeWidth="3" />
              <circle cx="100" cy="320" r="9" fill="#dc2626" />
              <text x="95" y="323" fontSize="8" fill="white" fontWeight="bold">12</text>

              {/* Outer Ring Road (230) */}
              <ellipse cx="430" cy="330" rx="280" ry="240" fill="none" stroke="#cbd5e1" strokeWidth="4" strokeDasharray="8,4" />
              <text x="560" y="115" fontSize="9" fill="#64748b" fontWeight="bold">ถนนเลี่ยงเมือง (230)</text>

              {/* Origin Marker: Khon Kaen Technical College (วท.ขอนแก่น) */}
              <g transform="translate(400, 310)">
                <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#ffffff" strokeWidth="3" />
                <path d="M-6 2 L0 -10 L6 2 Z" fill="#38bdf8" />
                <circle cx="0" cy="0" r="4" fill="#fbbf24" />
                <text x="-40" y="26" fontSize="10" fill="#0f172a" fontWeight="bold">
                  วท.ขอนแก่น (ศูนย์กลาง)
                </text>
              </g>

              {/* Route lines connecting to active company */}
              {activeCompany && (
                <line
                  x1="400"
                  y1="310"
                  x2={activeCompany.mapX}
                  y2={activeCompany.mapY}
                  stroke="#0284c7"
                  strokeWidth="3"
                  strokeDasharray="6,4"
                  className="animate-pulse"
                />
              )}

              {/* Dynamic Company Pins from Google Sheets Login Tab */}
              {filteredCompanies.map((comp) => {
                const isSelected = comp.id === activeCompany?.id;
                const isSupervised = comp.isSupervised;

                // Pin color scheme:
                // Emerald = Supervised via Form 3
                // Amber = Pending supervision
                // Sky = PEA / EGAT
                const pinColor = isSupervised 
                  ? '#059669' 
                  : (comp.sector === 'pea' ? '#0284c7' : '#d97706');

                return (
                  <g
                    key={comp.id}
                    transform={`translate(${comp.mapX}, ${comp.mapY})`}
                    className="cursor-pointer group"
                    onClick={() => setActiveCompanyId(comp.id)}
                  >
                    {/* Selected pulse animation */}
                    {isSelected && (
                      <circle cx="0" cy="0" r="24" fill={pinColor} opacity="0.3" className="animate-ping" />
                    )}

                    {/* Outer circle */}
                    <circle 
                      cx="0" 
                      cy="0" 
                      r={isSelected ? 18 : 13} 
                      fill={pinColor} 
                      stroke="#ffffff" 
                      strokeWidth={isSelected ? 3 : 2} 
                      className="drop-shadow-md transition-all duration-200" 
                    />

                    {/* Student count badge inside pin */}
                    <text 
                      x="0" 
                      y={isSelected ? 4 : 3} 
                      textAnchor="middle" 
                      fontSize={isSelected ? 10 : 8} 
                      fill="#ffffff" 
                      fontWeight="bold"
                    >
                      {comp.studentsCount}
                    </text>

                    {/* Label */}
                    <text 
                      x="16" 
                      y="4" 
                      fontSize={isSelected ? 11 : 9} 
                      fill={isSelected ? '#0f172a' : '#334155'} 
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      className="pointer-events-none"
                    >
                      {comp.name.length > 25 ? comp.name.slice(0, 25) + '...' : comp.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Top Left GPS indicator badge */}
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>ขอนแก่น & ปริมณฑล</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                แสดงผล {filteredCompanies.length} แห่ง ({allSheetStudents.length} นักศึกษา)
              </div>
            </div>

            {/* Map Controls */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-white/90 backdrop-blur-xs p-1 rounded-lg border border-slate-200 shadow-xs">
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 1.8))}
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                title="ขยาย"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.8))}
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                title="ย่อ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
                title="รีเซ็ตตำแหน่ง"
              >
                <Compass className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Map Legend */}
            <div className="absolute bottom-2 left-3 right-3 flex flex-wrap items-center justify-between text-[10px] text-slate-600 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-md border border-slate-200">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> 
                  <span>นิเทศแล้ว ({supervisedCount})</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> 
                  <span>รอนิเทศ ({pendingCount})</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span> 
                  <span>PEA / กฟผ.</span>
                </span>
              </div>
              <span className="text-slate-500 font-medium">ตัวเลขบนหมุด = จำนวนนักศึกษาที่ฝึกงานในที่นั้น</span>
            </div>
          </div>

          {/* Cluster Loop Navigation Bar */}
          {activeCompany && (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <Route className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">
                    เส้นทางเดินทางไปยัง {activeCompany.name}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    จาก วท.ขอนแก่น → {activeCompany.address} ({activeCompany.distanceKm} กม.) • มีนักศึกษา {activeCompany.studentsCount} คน
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleOpenGoogleMaps(activeCompany)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>นำทาง Google Maps</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Selected Company Detail + All Students in Same Location + Form 3 Supervision (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {activeCompany ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      activeCompany.isSupervised 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {activeCompany.statusText}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      โซน: {activeCompany.zone}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 leading-snug">
                    {activeCompany.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeCompany.address}
                  </p>
                </div>

                <button
                  onClick={() => handleOpenGoogleMaps(activeCompany)}
                  className="p-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 transition shrink-0"
                  title="เปิดตำแหน่งใน Google Maps"
                >
                  <Navigation className="w-4 h-4" />
                </button>
              </div>

              {/* Mentor / Contact Info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-medium">พี่เลี้ยงประจำสถานที่</div>
                  <div className="font-bold text-slate-800 text-xs mt-0.5 truncate">
                    {activeCompany.contactPerson}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-medium">เบอร์ติดต่อสถานประกอบการ</div>
                  <div className="font-bold text-sky-700 text-xs mt-0.5 font-mono">
                    {activeCompany.phone}
                  </div>
                </div>
              </div>

              {/* 1. All Students interning at this same location (นักศึกษาที่ฝึกงานในที่เดียวกันทั้งหมด) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>นักศึกษาฝึกงานในที่เดียวกันทั้งหมด ({activeCompany.studentsCount} คน):</span>
                  </div>
                  <span className="text-[10px] text-slate-400">อ้างอิงแผ่นงาน Login</span>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {activeCompany.students.map((std, i) => {
                    const stdForm3 = form3List.find(f => f.studentCode === std.studentCode || f.studentId === std.id);
                    return (
                      <div
                        key={std.id || i}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-sky-300 transition flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center shrink-0 text-xs">
                            {std.initials || 'นศ'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {i + 1}. {std.name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              รหัส: <span className="font-mono">{std.studentCode}</span> • ห้อง: <span className="font-semibold text-slate-700">{std.room}</span> ({std.level})
                            </div>
                            {std.companyRegistration?.emergencyPhone && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                โทร: {std.companyRegistration.emergencyPhone}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {stdForm3 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{stdForm3.score ? `${stdForm3.score} คะแนน (${stdForm3.grade})` : 'นิเทศแล้ว'}</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => onOpenForm3(std.id)}
                              className="px-2 py-1 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[10px] border border-sky-200 transition cursor-pointer"
                            >
                              บันทึกนิเทศ
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Supervision Information (แสดงข้อมูลการเข้านิเทศ) */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>ข้อมูลการเข้านิเทศ & ประเมินสมรรถนะ</span>
                  </div>
                  {latestForm3 && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ตรวจนิเทศแล้ว
                    </span>
                  )}
                </div>

                {latestForm3 ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs space-y-2.5">
                    {/* Header info */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-emerald-200/60">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="font-bold text-emerald-950">
                          วันที่เข้าตรวจ: {latestForm3.visitDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px]">
                        <Award className="w-3 h-3" />
                        <span>คะแนน: {latestForm3.score}/20 (เกรด {latestForm3.grade})</span>
                      </div>
                    </div>

                    {/* Teacher & Mentor */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500">อาจารย์ผู้นิเทศก์:</span>
                        <div className="font-semibold text-slate-800">{latestForm3.teacherName || 'นายทักษิณ โสภาปิยะ'}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">พี่เลี้ยงผู้ให้ข้อมูล:</span>
                        <div className="font-semibold text-slate-800">{latestForm3.mentorName}</div>
                      </div>
                    </div>

                    {/* Safety Assessment */}
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium bg-white p-2 rounded-lg border border-emerald-100">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>มาตรฐานความปลอดภัย PPE: {latestForm3.safetyPassed ? 'ผ่านเกณฑ์ สอศ. 100%' : 'ต้องปรับปรุง'}</span>
                    </div>

                    {/* Teacher comments */}
                    {latestForm3.teacherComment && (
                      <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="font-semibold text-slate-800">ข้อเสนอแนะอาจารย์นิเทศก์: </span>
                        {latestForm3.teacherComment}
                      </div>
                    )}

                    {/* Mentor feedback */}
                    {latestForm3.mentorFeedback && (
                      <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="font-semibold text-slate-800">ความคิดเห็นพี่เลี้ยง: </span>
                        {latestForm3.mentorFeedback}
                      </div>
                    )}

                    {/* Photos from Form 3 (3-4 รูป) */}
                    {latestForm3.photos && latestForm3.photos.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-slate-600" />
                          <span>รูปภาพการนิเทศงาน (คลิกเพื่อดูภาพขยาย):</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {latestForm3.photos.map((photo, pIdx) => (
                            <div
                              key={photo.id || pIdx}
                              onClick={() => setSelectedPhoto(photo)}
                              className="group relative aspect-4/3 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-2xs hover:opacity-90 transition"
                              title={photo.title}
                            >
                              <img
                                src={photo.url}
                                alt={photo.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                    <Clock className="w-6 h-6 text-amber-500 mx-auto" />
                    <div className="font-bold text-xs text-slate-800">
                      ยังไม่มีบันทึกการนิเทศในสถานประกอบการนี้
                    </div>
                    <p className="text-[11px] text-slate-500">
                      สามารถกดปุ่มด้านล่างเพื่อบันทึกรายงานการนิเทศงาน (Form 3) พร้อมรูปถ่าย 3-4 รูป
                    </p>
                  </div>
                )}

                {/* Supervision Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => onOpenForm3(activeCompany.students[0]?.id)}
                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>บันทึกการนิเทศ</span>
                  </button>
                  <button
                    onClick={() => handleOpenGoogleMaps(activeCompany)}
                    className="py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 text-sky-600" />
                    <span>เปิดนำทาง GPS</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <div className="font-bold text-sm">กรุณาเลือกสถานประกอบการจากรายการ</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
