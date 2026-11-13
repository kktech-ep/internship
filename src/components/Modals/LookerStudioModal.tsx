import React from 'react';
import { X, ExternalLink, BarChart3, TrendingUp, Users, CheckCircle, PieChart, ShieldAlert } from 'lucide-react';

interface LookerStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LookerStudioModal: React.FC<LookerStudioModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-950 text-white p-4 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Looker Studio Enterprise Dashboard</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Stream Synced
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                แดชบอร์ดสรุปผลการนิเทศและติดตามสมรรถนะนักศึกษา แผนกวิชาช่างไฟฟ้ากำลัง ขอนแก่น
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 text-xs">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-[11px]">อัตราการส่งบันทึกงาน</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">92.4%</div>
              <div className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                <TrendingUp className="w-3 h-3" />
                <span>สูงกว่าเกณฑ์มาตรฐาน (80%)</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-[11px]">นักศึกษาในระบบทั้งหมด</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">42 คน</div>
              <div className="text-[10px] text-slate-500 mt-1">ปวส.2: 28 | ปวช.3: 14</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-[11px]">สถานประกอบการ MOU</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">24 แห่ง</div>
              <div className="text-[10px] text-sky-600 mt-1">ครอบคลุม 4 โซนรอบเมือง</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-[11px]">คะแนนสมรรถนะเฉลี่ย</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">18.6 / 20</div>
              <div className="text-[10px] text-emerald-600 mt-1">ระดับดีเยี่ยม (Grade A)</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1: Sector Breakdown */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800">การกระจายตัวสายงานไฟฟ้าที่ฝึกจริง</span>
                <span className="text-[11px] text-slate-400">24 สถานประกอบการ</span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600">สถานีไฟฟ้าแรงสูง / PEA / EGAT (35%)</span>
                    <span className="font-semibold text-slate-800">8 แห่ง (14 คน)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-sky-600 h-2.5 rounded-full" style={{ width: '35%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600">โรงงานอุตสาหกรรม / ตู้ MDB / PLC (40%)</span>
                    <span className="font-semibold text-slate-800">10 แห่ง (18 คน)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600">Solar Cell & พลังงานแสงอาทิตย์ (15%)</span>
                    <span className="font-semibold text-slate-800">4 แห่ง (6 คน)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600">งานติดตั้งระบบไฟฟ้าอาคาร & รพ. (10%)</span>
                    <span className="font-semibold text-slate-800">2 แห่ง (4 คน)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: '10%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 2: Weekly On-site Inspection Progress */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800">ความคืบหน้าการลงพื้นที่นิเทศก์ (สัปดาห์ 1-8)</span>
                <span className="text-[11px] text-emerald-600 font-medium">ตรวจแล้ว 75%</span>
              </div>
              <div className="flex items-end gap-2 h-36 pt-4 px-2">
                {[
                  { w: 'W1', val: 100, label: '100%' },
                  { w: 'W2', val: 95, label: '95%' },
                  { w: 'W3', val: 92, label: '92%' },
                  { w: 'W4', val: 88, label: '88%' },
                  { w: 'W5', val: 94, label: '94%' },
                  { w: 'W6', val: 90, label: '90%' },
                  { w: 'W7', val: 96, label: '96%' },
                  { w: 'W8', val: 75, label: '75%', active: true },
                ].map((bar, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[9px] text-slate-500 font-mono">{bar.label}</span>
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        bar.active ? 'bg-amber-500' : 'bg-sky-600'
                      }`}
                      style={{ height: `${bar.val}%` }}
                    ></div>
                    <span className="text-[10px] font-semibold text-slate-700 mt-1">{bar.w}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Safety Compliance Metric */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">การปฏิบัติตามมาตรฐานความปลอดภัย PPE & LOTO: 100%</div>
                <div className="text-[11px] text-slate-400">
                  นักศึกษาทุกคนสวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลครบถ้วน ไม่มีอุบัติเหตุเกิดขึ้นในงวดนี้
                </div>
              </div>
            </div>
            <a
              href="https://lookerstudio.google.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition"
            >
              <span>เปิดดู Looker Studio แบบเต็มหน้าจอ</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
