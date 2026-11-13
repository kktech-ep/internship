import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-['Prompt',sans-serif]">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-slate-200 text-center space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                KKTECH Power Portal • การกู้คืนระบบ
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">
                เกิดข้อผิดพลาดในการโหลดหน้าเว็บ
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                ระบบตรวจพบข้อผิดพลาดที่ไม่คาดคิด สามารถกดรีโหลดเพื่อลองใหม่อีกครั้ง
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left overflow-x-auto text-[11px] font-mono text-slate-700 max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                onClick={this.handleReload}
                className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>รีโหลดหน้าเว็บใหม่</span>
              </button>

              <button
                onClick={this.handleResetStorage}
                className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
              >
                <span>ล้างแคชและรีเซ็ตระบบ</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
