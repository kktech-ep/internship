import React from 'react';
import { ShieldCheck, Cloud, FileText, Phone, Mail, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 text-xs border-t border-slate-800 print:hidden mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1 */}
          <div className="md:col-span-1 space-y-3">
            <h3 className="text-white text-sm font-semibold tracking-tight">แผนกวิชาช่างไฟฟ้ากำลัง</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              อาคาร 8 ชั้น 3 วิทยาลัยเทคนิคขอนแก่น
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-emerald-400 text-[11px] border border-slate-700">
              <Cloud className="w-3.5 h-3.5" />
              <span>ระบบซิงค์อัตโนมัติกับ Google Workspace</span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2.5">
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider text-slate-400">บริการเชื่อมโยง</h4>
            <ul className="space-y-1.5 text-slate-300">
              <li><a href="#sheets" className="hover:text-sky-400 transition">Google Sheets ฐานข้อมูล</a></li>
              <li><a href="#forms" className="hover:text-sky-400 transition">Google Forms บันทึกวัน</a></li>
              <li><a href="#looker" className="hover:text-sky-400 transition">Looker Dashboard</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2.5">
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider text-slate-400">เอกสารดาวน์โหลด</h4>
            <ul className="space-y-1.5 text-slate-300">
              <li><span className="hover:text-sky-400 cursor-pointer">แบบฟอร์ม มรฐ. 01-05</span></li>
              <li><span className="hover:text-sky-400 cursor-pointer">คู่มือเกณฑ์การประเมิน</span></li>
              <li><span className="hover:text-sky-400 cursor-pointer">ปฏิทินนิเทศฝึกงาน</span></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-2.5">
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider text-slate-400">ฝ่ายประสานงาน</h4>
            <div className="space-y-1 text-slate-300 text-xs">
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>โทร: 043-221290 ต่��� 8002</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>อีเมล: electric@kktech.ac.th</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-slate-400 text-[11px] gap-2">
          <p>© 2025 Electrical Power Department, Khon Kaen Technical College. All rights reserved.</p>
          <p>ระบบสารสนเทศเพื่อการฝึกงานและนิเทศงานวิชาชีพ</p>
        </div>
      </div>
    </footer>
  );
};
