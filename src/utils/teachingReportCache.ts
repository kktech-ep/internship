import { TeachingReportRecord } from '../types';

const LOCAL_TEACHING_REPORTS_KEY = 'kktech_teaching_reports_v1';
const PENDING_TEACHING_REPORT_IDS_KEY = 'kktech_pending_teaching_reports_v1';

function readPendingIds(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(PENDING_TEACHING_REPORT_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function writePendingIds(ids: Set<string>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PENDING_TEACHING_REPORT_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore storage quota errors
  }
}

export function getLocalTeachingReports(): TeachingReportRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_TEACHING_REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed.filter((r) => r && r.id) as TeachingReportRecord[]) : [];
  } catch {
    return [];
  }
}

export function writeTeachingReportToLocalCache(
  report: TeachingReportRecord,
  markPending = true
): void {
  if (typeof localStorage === 'undefined' || !report?.id) return;
  try {
    const current = getLocalTeachingReports();
    const next = [report, ...current.filter((r) => r.id !== report.id)];
    localStorage.setItem(LOCAL_TEACHING_REPORTS_KEY, JSON.stringify(next));

    const pending = readPendingIds();
    if (markPending) {
      pending.add(report.id);
    } else {
      pending.delete(report.id);
    }
    writePendingIds(pending);
  } catch {
    // Ignore storage quota errors
  }
}

export function markTeachingReportSynced(reportId: string): void {
  if (!reportId) return;
  const pending = readPendingIds();
  if (pending.delete(reportId)) {
    writePendingIds(pending);
  }
}

export function reconcileTeachingReportsWithCloud(
  cloudReports: TeachingReportRecord[]
): TeachingReportRecord[] {
  const map = new Map<string, TeachingReportRecord>();
  const cloudIds = new Set<string>();

  for (const r of cloudReports) {
    if (r && r.id) {
      cloudIds.add(r.id);
      map.set(r.id, r);
    }
  }

  const pending = readPendingIds();
  const stillPending = new Set<string>();
  const local = getLocalTeachingReports();

  for (const lr of local) {
    if (!lr || !lr.id) continue;
    if (cloudIds.has(lr.id)) {
      const cloudTime = new Date(map.get(lr.id)?.updatedAt || 0).getTime() || 0;
      const localTime = new Date(lr.updatedAt || 0).getTime() || 0;
      if (pending.has(lr.id) && localTime > cloudTime) {
        map.set(lr.id, lr);
        stillPending.add(lr.id);
      }
      continue;
    }
    if (pending.has(lr.id)) {
      stillPending.add(lr.id);
      map.set(lr.id, lr);
    }
  }

  writePendingIds(stillPending);
  const reconciled = Array.from(map.values()).sort((a, b) => {
    const timeDiff = (new Date(b.updatedAt || 0).getTime() || 0) - (new Date(a.updatedAt || 0).getTime() || 0);
    if (timeDiff !== 0) return timeDiff;
    return (Number(b.weekNumber) || 0) - (Number(a.weekNumber) || 0);
  });

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_TEACHING_REPORTS_KEY, JSON.stringify(reconciled));
    } catch {
      // Ignore quota errors
    }
  }

  return reconciled;
}
