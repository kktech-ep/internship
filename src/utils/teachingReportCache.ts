import { TeachingReportRecord } from '../types';

const STORAGE_REPORTS_KEY = 'kktech_teaching_reports_local_v1';
const STORAGE_PENDING_IDS_KEY = 'kktech_teaching_reports_pending_sync_v1';

export function getLocalTeachingReports(): TeachingReportRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TeachingReportRecord[]) : [];
  } catch {
    return [];
  }
}

function saveLocalTeachingReportsList(list: TeachingReportRecord[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(list));
  } catch {
    // If localStorage is full due to base64 photos, store lightweight copies without inline data-URLs
    try {
      const compact = list.map((rep) => ({
        ...rep,
        weekPhotos: (rep.weekPhotos || []).map((p) => ({
          ...p,
          url: p.url && p.url.startsWith('data:') ? '' : p.url,
        })),
      }));
      localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(compact));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }
}

export function getPendingTeachingReportIds(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_PENDING_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function writeTeachingReportToLocalCache(
  report: TeachingReportRecord,
  isSyncedToCloud: boolean
): void {
  if (!report || !report.id) return;
  const current = getLocalTeachingReports();
  const next = [report, ...current.filter((r) => r.id !== report.id)];
  saveLocalTeachingReportsList(next);

  if (typeof localStorage === 'undefined') return;
  try {
    const pending = new Set(getPendingTeachingReportIds());
    if (isSyncedToCloud) {
      pending.delete(report.id);
    } else {
      pending.add(report.id);
    }
    localStorage.setItem(STORAGE_PENDING_IDS_KEY, JSON.stringify(Array.from(pending)));
  } catch {
    // Ignore storage errors
  }
}

export function markTeachingReportSynced(reportId: string): void {
  if (!reportId || typeof localStorage === 'undefined') return;
  try {
    const pending = getPendingTeachingReportIds().filter((id) => id !== reportId);
    localStorage.setItem(STORAGE_PENDING_IDS_KEY, JSON.stringify(pending));
  } catch {
    // Ignore storage errors
  }
}

export function reconcileTeachingReportsWithCloud(
  remoteReports: TeachingReportRecord[]
): TeachingReportRecord[] {
  const localReports = getLocalTeachingReports();
  const pendingIds = new Set(getPendingTeachingReportIds());
  const map = new Map<string, TeachingReportRecord>();

  localReports.forEach((r) => {
    if (r && r.id) map.set(r.id, r);
  });

  remoteReports.forEach((remote) => {
    if (!remote || !remote.id) return;
    const local = map.get(remote.id);
    if (!local) {
      map.set(remote.id, remote);
      return;
    }

    const remoteTime = new Date(remote.updatedAt || 0).getTime() || 0;
    const localTime = new Date(local.updatedAt || 0).getTime() || 0;

    if (pendingIds.has(remote.id) && localTime >= remoteTime) {
      // Keep newer unsynced local edit until cloud sync finishes
      return;
    }

    if (remoteTime >= localTime) {
      map.set(remote.id, remote);
      pendingIds.delete(remote.id);
    }
  });

  const merged = Array.from(map.values());
  saveLocalTeachingReportsList(merged);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_PENDING_IDS_KEY, JSON.stringify(Array.from(pendingIds)));
    } catch {
      // Ignore
    }
  }
  return merged;
}
