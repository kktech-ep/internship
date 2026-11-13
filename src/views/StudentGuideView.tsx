import React, { useState } from 'react';
import { 
  BookOpen, 
  Download, 
  Printer, 
  ArrowLeft, 
  CheckCircle2, 
  Smartphone, 
  Laptop, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Camera, 
  FileText, 
  AlertTriangle, 
  HelpCircle, 
  Phone, 
  Building2, 
  UserCheck, 
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
  Loader2,
  Share2
} from 'lucide-react';
import { AuthUser } from '../types';

interface StudentGuideViewProps {
  onNavigate: (view: string) => void;
  currentUser?: AuthUser | null;
}

export const StudentGuideView: React.FC<StudentGuideViewProps> = ({
  onNavigate,
  currentUser
}) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'login' | 'mobile' | 'form1' | 'form2' | 'history' | 'faq'>('all');

  const handleDownloadPDF = async () => {
    const element = document.getElementById('student-guide-pdf-content');
    if (!element) {
      window.print();
      return;
    }

    setIsDownloadingPdf(true);
    try {
      // Wait for all images inside the manual to finish loading
      const imgs = Array.from(element.querySelectorAll('img'));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          });
        })
      );

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
        // Iteratively resolve nested color-mix(...) and oklch(...)/oklab(...)
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

      const canvas = await html2canvas(element, {
        scale: 2.0,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // 1. Rewrite inline <style> tags to strip oklch/oklab/color-mix for html2canvas
          const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
          styleTags.forEach((styleTag) => {
            if (styleTag.textContent) {
              styleTag.textContent = normalizeColorExpr(styleTag.textContent);
            }
          });

          // 2. Inline same-origin <link rel="stylesheet"> rules with normalized colors
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
                  // Skip cross-origin stylesheets safely
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

          // 3. Ensure cloned container has clean white background & desktop layout width
          const clonedRoot = clonedDoc.getElementById('student-guide-pdf-content');
          if (clonedRoot) {
            clonedRoot.style.backgroundColor = '#ffffff';
            clonedRoot.style.boxShadow = 'none';
          }
        }
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add remaining pages
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = 'คู่มือการใช้งานระบบสำหรับนักศึกษา_แผนกช่างไฟฟ้ากำลัง_วท_ขอนแก่น.pdf';
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation error:', err);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16 print:space-y-0 print:pb-0">
      {/* Top Action & Navigation Bar (Hidden during Print) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('hub')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="กลับสู่หน้าแรก"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-100 text-sky-800">
                <BookOpen className="w-4 h-4" />
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                คู่มือการใช้งานระบบสารสนเทศการฝึกงาน (สำหรับนักศึกษา)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              แผนกวิชาช่างไฟฟ้ากำลัง วิทยาลัยเทคนิคขอนแก่น &bull; รองรับการใช้งานทั้งคอมพิวเตอร์และมือถือ
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isDownloadingPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-bold text-xs shadow-md transition disabled:opacity-60 cursor-pointer"
            title="ดาวน์โหลดคู่มือฉบับสมบูรณ์เป็นไฟล์ PDF"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 text-sky-300 animate-spin" />
                <span>กำลังประมวลผล PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-sky-300" />
                <span>ดาวน์โหลดคู่มือ (PDF)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 transition cursor-pointer"
            title="สั่งพิมพ์คู่มือหรือพิมพ์เป็น PDF ผ่านเบราว์เซอร์"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>พิมพ์คู่มือ (Print)</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate(currentUser?.role === 'teacher' ? 'teacher' : 'student')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
          >
            <span>
              {currentUser?.role === 'teacher'
                ? 'ไปที่หน้าส่วนครูนิเทศก์'
                : 'ไปที่หน้าบันทึกงานของฉัน'}
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Topic Filter Pills (Hidden during Print) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden text-xs">
        {[
          { id: 'all', label: 'ทั้งหมด (ฉบับสมบูรณ์)' },
          { id: 'login', label: '1. การเข้าสู่ระบบ' },
          { id: 'mobile', label: '2. โหมดมือถือ' },
          { id: 'form1', label: '3. ข้อมูลสถานประกอบการ (ฟ.1)' },
          { id: 'form2', label: '4. ส่งบันทึกงาน (ฟ.2)' },
          { id: 'history', label: '5. ประวัติ & ตรวจนิเทศ' },
          { id: 'faq', label: '6. ข้อควรระวัง & คำถาม' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* PRINTABLE MANUAL CONTAINER (Will be rendered to PDF)                      */}
      {/* ========================================================================= */}
      <div 
        id="student-guide-pdf-content"
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 lg:p-12 space-y-10 text-slate-800 leading-relaxed font-sans max-w-5xl mx-auto print:shadow-none print:border-none print:rounded-none print:p-0 print:space-y-6"
      >
        {/* Document Header with Logos */}
        <div className="border-b-2 border-slate-900 pb-6 print:break-inside-avoid">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full border-2 border-slate-200 p-1 bg-white shadow-xs overflow-hidden shrink-0">
                <img 
                  src="./assets/aistudio/LogoKKTech.jpg" 
                  alt="ตราวิทยาลัยเทคนิคขอนแก่น" 
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div className="w-16 h-16 rounded-xl border border-slate-200 p-1 bg-white shadow-xs overflow-hidden shrink-0 hidden sm:block print:block">
                <img 
                  src="./assets/aistudio/unnamed_54baf6fc.jpg" 
                  alt="ตราแผนกช่างไฟฟ้ากำลัง" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="inline-block text-[11px] font-bold tracking-wider text-sky-800 uppercase bg-sky-50 px-2 py-0.5 rounded border border-sky-200 mb-1">
                  คู่มือสำหรับนักศึกษาฝึกงานวิชาชีพ &bull; ภาคเรียนที่ 2/2569
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  คู่มือการใช้งานระบบบันทึกข้อมูลการฝึกงานในสถานประกอบการ
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                  แผนกวิชาช่างไฟฟ้ากำลัง วิทยาลัยเทคนิคขอนแก่น
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  อาคาร 8 ชั้น 3 วิทยาลัยเทคนิคขอนแก่น &bull; โทรศัพท์: 043-221290 ต่อ 8002 &bull; บัญชี @kktech.ac.th
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="inline-flex flex-col items-end bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                <span className="text-[10px] text-slate-500 font-medium">เป้าหมายมาตรฐาน</span>
                <span className="text-base font-extrabold text-indigo-700">720 ชั่วโมง</span>
                <span className="text-[10px] text-slate-500">18 สัปดาห์ (40 ชม./สัปดาห์)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Highlights / Overview Box */}
        {(activeTab === 'all') && (
          <div className="bg-gradient-to-r from-sky-50 via-indigo-50/50 to-blue-50 rounded-2xl p-5 border border-sky-100 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sky-950 text-sm">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>ภาพรวมหน้าที่และสิ่งที่นักศึกษาต้องดำเนินการ</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>บันทึกสถานประกอบการ</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  กรอกข้อมูลสัญญา, พิกัด GPS, และชื่อครูพี่เลี้ยงภาคสนาม (แบบ ฟ.1)
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>ส่งบันทึกงานประจำสัปดาห์</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  ลงบันทึกรายวัน จ.-ศ. (วันละ 8 ชม.) แนบภาพหน้างาน 3 ภาพ (แบบ ฟ.2)
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>เช็คผลการตรวจนิเทศ</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  ตรวจเช็คคะแนน เกรด และข้อคิดเห็นจากครูนิเทศก์ในแต่ละสัปดาห์
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-sky-100 shadow-2xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
                  <span>พิมพ์รายงาน A4</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  ส่งออกเอกสารสมุดบันทึกเป็น PDF มาตรฐาน A4 เพื่อส่งแผนกวิชา
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* CHAPTER 1: เข้าสู่ระบบและการเลือกบทบาท                               */}
        {/* ===================================================================== */}
        {(activeTab === 'all' || activeTab === 'login') && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                1
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                การเข้าสู่ระบบและการเลือกบทบาทนักศึกษา (Login & Role Selection)
              </h2>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              เมื่อเปิดหน้าเว็บระบบ จะพบหน้าต่างหลักสำหรับการเข้าใช้งาน <strong>"เลือกบทบาทของคุณเพื่อเริ่มบันทึกและจัดการข้อมูล"</strong> โดยระบบเชื่อมโยงกับฐานข้อมูลวิทยาลัยและบัญชี Google Workspace องค์กร
            </p>

            {/* FIGURE 1: Screenshot Attachment */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 print:break-inside-avoid">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-blue-600" />
                  <span>รูปที่ 1: หน้าจอหลักสำหรับการเลือกบทบาทเข้าสู่ระบบ</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">หน้าจอเข้าสู่ระบบ (Portal Gateway)</span>
              </div>

              {/* Image Frame */}
              <div className="rounded-xl overflow-hidden border border-slate-300 shadow-md bg-slate-900 flex justify-center">
                <img 
                  src="./assets/aistudio/pigture1_8aebca34.jpg" 
                  alt="หน้าจอหลักเลือกบทบาทนักศึกษา"
                  className="max-h-[380px] w-auto object-contain"
                />
              </div>

              {/* Step Explanations for Figure 1 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <div className="font-bold text-blue-700 flex items-center gap-1">
                    <span>จุดที่ 1.1</span> &bull; <span>การ์ดนักศึกษา (ปวช. / ปวส.)</span>
                  </div>
                  <p className="text-slate-600 leading-normal">
                    คลิกเลือกกล่องสีน้ำเงิน <strong>"นักศึกษา"</strong> สำหรับกรอกข้อมูลสถานประกอบการ (ฟ.1) และส่งรายงานบันทึกประจำสัปดาห์ (ฟ.2)
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <div className="font-bold text-blue-700 flex items-center gap-1">
                    <span>จุดที่ 1.2</span> &bull; <span>ปุ่มเข้าใช้งานทันที</span>
                  </div>
                  <p className="text-slate-600 leading-normal">
                    กดปุ่มสีน้ำเงิน <strong>"เข้าใช้งานทันที &rarr;"</strong> หรือคลิกลิงก์ <em>"ระบุรหัสนักศึกษาตนเอง"</em> เพื่อเลือกรหัสประจำตัว 11 หลักของท่าน
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <div className="font-bold text-blue-700 flex items-center gap-1">
                    <span>จุดที่ 1.3</span> &bull; <span>อีเมล @kktech.ac.th</span>
                  </div>
                  <p className="text-slate-600 leading-normal">
                    เพื่อความปลอดภัย นักศึกษาควรล็อกอินด้วยบัญชี Google ของวิทยาลัย เพื่อซิงค์ข้อมูลกับ Google Sheets และบันทึกประวัติการส่งงานโดยตรง
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===================================================================== */}
        {/* CHAPTER 2: การใช้งานผ่านสมาร์ตโฟน (Mobile Mode)                       */}
        {/* ===================================================================== */}
        {(activeTab === 'all' || activeTab === 'mobile') && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                2
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                การใช้งานบนสมาร์ตโฟน (Mobile Mode / Smartphone View)
              </h2>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              ระบบได้รับการออกแบบให้ใช้งานผ่านโทรศัพท์มือถือได้อย่างเต็มรูปแบบ เพื่อให้นักศึกษาสามารถถ่ายรูปการปฏิบัติงานหน้างานและส่งรายงานประจำสัปดาห์ได้สะดวกจากสถานประกอบการจริง
            </p>

            {/* FIGURE 2: Screenshot Attachment */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 print:break-inside-avoid">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>รูปที่ 2: หน้าจอมือถือแสดงข้อมูลส่วนตัว ภารกิจส่งงาน และสถิติชั่วโมงสะสม</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">หน้าจอมือถือ (Student Mobile Screen)</span>
              </div>

              {/* Mobile Mockup & Description Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Image */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="rounded-2xl overflow-hidden border-2 border-slate-800 shadow-xl bg-slate-900 max-w-[280px]">
                    <img 
                      src="./assets/aistudio/pigture2_80b7d2a0.jpg" 
                      alt="หน้าจอมือถือนักศึกษา"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>

                {/* Numbered Callout Explanations */}
                <div className="md:col-span-7 space-y-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">A</span>
                      <span>ส่วนหัวและข้อมูลนักศึกษา (Student Profile)</span>
                    </div>
                    <p className="text-slate-600">
                      แสดงชื่อ-สกุล, ระดับชั้น (ปวส.2), รหัสนักศึกษา (เช่น 68301040105), ห้องเรียน (สอฟ.2/6) และอีเมลองค์กร @kktech.ac.th
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">B</span>
                      <span>สถานประกอบการ & พิกัด GPS</span>
                    </div>
                    <p className="text-slate-600">
                      แสดงชื่อบริษัท/สถานที่ฝึกงาน เช่น <em>"การไฟฟ้าส่วนภูมิภาคจังหวัดขอนแก่น"</em>, ชื่อครูนิเทศก์ประจำกลุ่ม และสถานะ <strong>พิกัด GPS ตรวจยืนยันแล้ว</strong>
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">C</span>
                      <span>แถบสะสมชั่วโมงฝึกงานวิชาชีพ</span>
                    </div>
                    <p className="text-slate-600">
                      แสดงผลชั่วโมงฝึกงานปัจจุบันเปรียบเทียบกับเกณฑ์ <strong>720 ชั่วโมง</strong> เช่น 320 / 720 ชม. (ผ่านไป 8 จาก 18 สัปดาห์ คิดเป็น 80% ตามเกณฑ์)
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">D</span>
                      <span>การ์ดภารกิจส่งงานประจำสัปดาห์ (ฟ.2)</span>
                    </div>
                    <p className="text-slate-600">
                      แถบแจ้งเตือนสัปดาห์ปัจจุบัน (เช่น สัปดาห์ที่ 4) กำหนดเวลาส่งงาน และปุ่มเปิดแบบฟอร์ม <strong>"เปิด Google Form #2 เพื่อส่งงาน"</strong> หรือส่งผ่านระบบออนไลน์
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">E</span>
                      <span>ข้อมูลครูพี่เลี้ยงภาคสนาม (ฟ.1)</span>
                    </div>
                    <p className="text-slate-600">
                      ระบุชื่อครูพี่เลี้ยงประจำสถานประกอบการ วันที่อัปเดตล่าสุด และปุ่ม <strong>"ดูข้อมูล / แก้ไข"</strong> เพื่ออัปเดตข้อมูลได้ตลอดเวลา
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===================================================================== */}
        {/* CHAPTER 3: บันทึกข้อมูลสถานประกอบการ (ฟ.1)                            */}
        {/* ===================================================================== */}
        {(activeTab === 'all' || activeTab === 'form1') && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                3
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                ขั้นตอนการกรอกข้อมูลสถานประกอบการ (แบบฟอร์ม ฟ.1)
              </h2>
            </div>

            <p className="text-sm text-slate-600">
              นักศึกษาทุกคนต้องบันทึกข้อมูลสถานประกอบการในสัปดาห์แรกของการฝึกประสบการณ์วิชาชีพ เพื่อให้ครูนิเทศก์สามารถวางแผนการเข้านิเทศและติดต่อครูพี่เลี้ยงภาคสนามได้ถูกต้อง:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>ข้อมูลที่ต้องระบุในแบบฟอร์ม ฟ.1:</span>
                </h3>
                <ul className="space-y-1.5 text-slate-600 pl-4 list-disc">
                  <li><strong>ชื่อสถานประกอบการ / บริษัท / โรงงาน / กฟภ. / กฟผ.:</strong> ระบุชื่อเต็มอย่างเป็นทางการ</li>
                  <li><strong>แผนก / ฝ่ายที่เข้าฝึก:</strong> เช่น แผนกซ่อมบำรุงไฟฟ้า, ฝ่ายปฏิบัติการระบบควบคุม, แผนกหม้อแปลง</li>
                  <li><strong>ที่อยู่สถานประกอบการ:</strong> เลขที่ ถนน ตำบล อำเภอ และจังหวัดขอนแก่นหรือพื้นที่ใกล้เคียง</li>
                  <li><strong>พิกัดละติจูด/ลองจิจูด (GPS):</strong> สำหรับแสดงบนแผนที่ครูนิเทศก์และการนำทาง Google Maps</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>ข้อมูลครูพี่เลี้ยงภาคสนาม (Mentor):</span>
                </h3>
                <ul className="space-y-1.5 text-slate-600 pl-4 list-disc">
                  <li><strong>ชื่อ-นามสกุลครูพี่เลี้ยง:</strong> เช่น ช่างเอกชัย พลอยงาม</li>
                  <li><strong>ตำแหน่งงาน:</strong> เช่น หัวหน้างานระบบไฟฟ้า, วิศวกรไฟฟ้าอาวุโส</li>
                  <li><strong>เบอร์โทรศัพท์ที่ติดต่อได้:</strong> สำหรับครูนิเทศก์ประสานงานการเข้านิเทศ</li>
                  <li><strong>เบอร์โทรติดต่อฉุกเฉิน (Emergency Phone):</strong> สำหรับกรณีเกิดเหตุฉุกเฉินหรือความปลอดภัย</li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* ===================================================================== */}
        {/* CHAPTER 4: การส่งบันทึกปฏิบัติงานประจำสัปดาห์ (ฟ.2)                    */}
        {/* ===================================================================== */}
        {(activeTab === 'all' || activeTab === 'form2') && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm">
                4
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                ขั้นตอนการส่งบันทึกการปฏิบัติงานประจำสัปดาห์ (แบบฟอร์ม ฟ.2)
              </h2>
            </div>

            <p className="text-sm text-slate-600">
              การส่งบันทึกการปฏิบัติงานต้องดำเนินการเป็นประจำทุกสัปดาห์ (สัปดาห์ที่ 1 - 18) <strong>กำหนดส่งภายในวันอาทิตย์ ก่อนเวลา 23:59 น.</strong> โดยมีข้อกำหนดสำคัญดังต่อไปนี้:
            </p>

            {/* Daily Log Steps */}
            <div className="space-y-3">
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
                <span className="font-bold text-blue-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-700" />
                  <span>1. การลงเวลาและบันทึกงานประจำวัน (Daily Logs)</span>
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  บันทึกรายละเอียดงานที่ทำในแต่ละวัน (จันทร์, อังคาร, พุธ, พฤหัสบดี, ศุกร์ หรือเสาร์) โดยระบุเครื่องมือช่างที่ใช้จริง (เช่น มัลติมิเตอร์, คีมย้ำหางปลา, เมกเกอร์เทสต์, ไขควงวัดไฟ) และจำนวนชั่วโมงทำงานวันละ 8 ชั่วโมง ให้ครบถ้วน <strong>40 ชั่วโมงต่อสัปดาห์</strong>
                </p>
              </div>

              {/* Safety Checklist Box */}
              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                <span className="font-bold text-amber-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>2. รายการตรวจสอบความปลอดภัยส่วนบุคคล (PPE & Safety Checklist)</span>
                </span>
                <p className="text-xs text-slate-700">
                  ก่อนส่งรายงาน นักศึกษาต้องตรวจสอบและทำเครื่องหมายยืนยันการปฏิบัติตามมาตรฐานความปลอดภัยทุกข้อ:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div className="bg-white p-2 rounded-lg border border-amber-200 font-medium text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>หมวกนิรภัย (Hard Hat)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-200 font-medium text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>ถุงมือฉนวนไฟฟ้าแรงสูง</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-200 font-medium text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>รองเท้านิรภัย (Safety Shoes)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-200 font-medium text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>ขั้นตอนตัดแยกไฟ (LOTO)</span>
                  </div>
                </div>
              </div>

              {/* Photo Evidence Box */}
              <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2">
                <span className="font-bold text-purple-900 text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4 text-purple-700" />
                  <span>3. การแนบรูปถ่ายหลักฐานการปฏิบัติงานหน้างาน (อย่างน้อย 3 ภาพต่อสัปดาห์)</span>
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  แนบรูปถ่ายตนเองขณะสวมใส่อุปกรณ์ PPE และกำลังปฏิบัติงานจริง ณ สถานประกอบการ พร้อมพิมพ์ <strong>คำอธิบายภาพ (Caption)</strong> ให้สอดคล้องกับรายวิชาที่เรียน เช่น <em>"การตรวจสอบวงจรตู้ควบคุมไฟฟ้า MDB"</em> หรือ <em>"การวัดค่าความเป็นฉนวนสายป้อนมอเตอร์โรงงาน"</em>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ===================================================================== */}
        {/* CHAPTER 5: การตรวจสอบประวัติและผลการตรวจนิเทศ                          */}
        {/* ===================================================================== */}
        {(activeTab === 'all' || activeTab === 'history') && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                5
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                การตรวจสอบประวัติการส่งงานและผลการตรวจนิเทศก์ (Inspection & Grades)
              </h2>
            </div>

            <p className="text-sm text-slate-600">
              นักศึกษาสามารถตรวจสอบสถานะการส่งงานและผลการตรวจนิเทศก์จากอาจารย์ผู้รับผิดชอบได้ทั้งบนคอมพิวเตอร์และบนหน้าจอมือถือ:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">1. สถานะการตรวจ</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    รอตรวจ / ตรวจแล้ว
                  </span>
                </div>
                <p className="text-slate-600">
                  ระบบจะแสดงป้ายสถานะแจ้งเตือนว่ารายงานสัปดาห์นั้นๆ ได้รับการประเมินจากครูนิเทศก์แล้วหรือไม่
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">2. คะแนนและเกรด</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    คะแนนเต็ม 20
                  </span>
                </div>
                <p className="text-slate-600">
                  แสดงคะแนนสมรรถนะรายสัปดาห์ (เช่น 18.5/20) พร้อมระดับผลการเรียน A, B+, B, C+ ตามเกณฑ์วิทยาลัย
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">3. ข้อคิดเห็นครูนิเทศก์</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    Feedback
                  </span>
                </div>
                <p className="text-slate-600">
                  อ่านข้อเสนอแนะ การปรับปรุงทักษะงานช่าง และคำแนะนำด้านความปลอดภัยเพื่อนำไปพัฒนาตนเองในสัปดาห์ถัดไป
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ===================================================================== */}
        {/* CHAPTER 6: การพิมพ์และส่งออกเอกสารสมุดบันทึก (PDF)                    */}
        {/* ===================================================================== */}
        {(activeTab === 'all' || activeTab === 'form2') && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm">
                6
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                การส่งออกเอกสารและการพิมพ์สมุดบันทึกปฏิบัติงาน (A4 PDF Formatter)
              </h2>
            </div>

            <p className="text-sm text-slate-600">
              เมื่อสิ้นสุดสัปดาห์หรือเมื่อครูนิเทศก์ตรวจเสร็จสิ้น นักศึกษาสามารถแปลงรายงานเป็นเอกสารทางการมาตรฐาน A4 (210mm x 297mm) ได้ทันที:
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700">
              <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-teal-700" />
                <span>วิธีการดาวน์โหลดไฟล์ PDF รายสัปดาห์:</span>
              </div>
              <ol className="list-decimal pl-5 space-y-1.5">
                <li>ไปที่เมนู <strong>"ส่วนนักศึกษา"</strong> หรือ <strong>"บันทึกปฏิบัติงาน & ภาพถ่าย"</strong></li>
                <li>เลือกสัปดาห์ที่ต้องการส่งออก (สัปดาห์ที่ 1 - 18)</li>
                <li>คลิกปุ่ม <strong>"พิมพ์ใบประเมิน A4"</strong> หรือ <strong>"ส่งออกเอกสาร PDF"</strong></li>
                <li>ระบบจะประมวลผลจัดหน้าให้อยู่ในกระดาษ A4 พอดี พร้อมตราสัญลักษณ์วิทยาลัย ลายเซ็นดิจิทัล และรูปภาพหน้างาน</li>
              </ol>
            </div>
          </section>
        )}

        {/* ===================================================================== */}
        {/* CHAPTER 7: คำถามที่พบบ่อยและช่องทางติดต่อ                            */}
        {/* ===================================================================== */}
        {(activeTab === 'all' || activeTab === 'faq') && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="w-7 h-7 rounded-lg bg-rose-700 text-white flex items-center justify-center font-bold text-sm">
                7
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                ข้อควรระวังและแนวทางแก้ไขปัญหาที่พบบ่อย (FAQ & Contact)
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Q: เข้าสู่ระบบไม่ได้ หรือขึ้นข้อความจำกัดสิทธิ์?</span>
                </div>
                <p className="text-slate-600 pl-5">
                  <strong>A:</strong> ให้ตรวจสอบว่าได้ลงชื่อเข้าใช้ด้วยบัญชี Google อีเมลองค์กรวิทยาลัยที่ลงท้ายด้วย <strong>@kktech.ac.th</strong> หรือยัง หากใช้อีเมลส่วนตัวทั่วไป (@gmail.com) ระบบจะไม่เปิดให้เข้าถึงข้อมูล
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Q: ชั่วโมงสะสมไม่ขึ้น หรือจำนวนสัปดาห์ไม่ตรง?</span>
                </div>
                <p className="text-slate-600 pl-5">
                  <strong>A:</strong> ชั่วโมงสะสมจะอัปเดตเมื่อบันทึกการปฏิบัติงานได้รับการอนุมัติและบันทึกลง Google Sheets หากพบข้อมูลคลาดเคลื่อน สามารถแจ้งครูนิเทศก์ประจำกลุ่มเพื่อตรวจสอบได้ทันที
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Q: พิกัด GPS ไม่ตรงกับสถานประกอบการจริง?</span>
                </div>
                <p className="text-slate-600 pl-5">
                  <strong>A:</strong> สามารถเปิดแบบฟอร์ม ฟ.1 แล้วกดปุ่ม <strong>"ระบุพิกัดปัจจุบันจาก GPS มือถือ"</strong> ขณะอยู่ที่สถานประกอบการ เพื่อให้ระบบบันทึกพิกัดละติจูดและลองจิจูดที่แม่นยำ
                </p>
              </div>
            </div>

            {/* Official Contact Box matching user requirements */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 space-y-3 print:break-inside-avoid">
              <div className="flex items-center gap-2 font-bold text-sm text-sky-400">
                <Phone className="w-4 h-4" />
                <span>ศูนย์ประสานงานการฝึกงานและนิเทศก์ แผนกวิชาช่างไฟฟ้ากำลัง</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
                <div>
                  <span className="block text-slate-400 text-[11px]">สถานที่ติดต่อ:</span>
                  <span className="font-semibold text-white">อาคาร 8 ชั้น 3</span>
                  <p className="text-[11px] text-slate-400">วิทยาลัยเทคนิคขอนแก่น</p>
                </div>
                <div>
                  <span className="block text-slate-400 text-[11px]">โทรศัพท์ประสานงาน:</span>
                  <span className="font-semibold text-white">043-221290 ต่อ 8002</span>
                  <p className="text-[11px] text-slate-400">วันจันทร์ - ศุกร์ ในเวลาราชการ</p>
                </div>
                <div>
                  <span className="block text-slate-400 text-[11px]">ระบบอีเมลองค์กร:</span>
                  <span className="font-semibold text-white">@kktech.ac.th</span>
                  <p className="text-[11px] text-slate-400">Google Workspace for Education</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Document Footer */}
        <div className="border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          <p>© 2569 แผนกวิชาช่างไฟฟ้ากำลัง วิทยาลัยเทคนิคขอนแก่น • ระบบบันทึกข้อมูลการฝึกงาน</p>
          <p className="text-[11px] text-slate-400 mt-1">เอกสารฉบับนี้จัดทำขึ้นเพื่อเป็นคู่มือแนะนำการใช้งานระบบสำหรับนักศึกษา แผนกวิชาช่างไฟฟ้ากำลัง</p>
        </div>
      </div>

      {/* Bottom Floating Bar for PDF Download (Print: Hidden) */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl mx-auto print:hidden">
        <div className="flex items-center gap-2.5 text-xs text-slate-700">
          <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
            <BookOpen className="w-4 h-4" />
          </span>
          <span>ต้องการเก็บคู่มือนี้ไว้ในเครื่อง หรือพิมพ์เพื่ออ่านประกอบการฝึกงาน?</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isDownloadingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition disabled:opacity-60 cursor-pointer"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังดาวน์โหลด...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดคู่มือ (ไฟล์ .pdf)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>พิมพ์</span>
          </button>
        </div>
      </div>
    </div>
  );
};
