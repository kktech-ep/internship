import { Student, WeeklySubmission } from '../types';

const PENDING_SUBMISSION_IDS_KEY = 'kktech_pending_submission_ids_v1';

function readPendingIds(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(PENDING_SUBMISSION_IDS_KEY);
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
    localStorage.setItem(PENDING_SUBMISSION_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore quota errors
  }
}

export function markSubmissionPendingSync(subId: string): void {
  if (!subId) return;
  const ids = readPendingIds();
  ids.add(subId);
  writePendingIds(ids);
}

export function markSubmissionSyncedToCloud(subId: string): void {
  if (!subId) return;
  const ids = readPendingIds();
  if (ids.delete(subId)) {
    writePendingIds(ids);
  }
}

export function getCandidateStudentKeys(student?: Pick<Student, 'id' | 'studentCode'> | string | null): string[] {
  if (!student) return [];
  const expandCodeVariants = (raw: string): string[] => {
    const clean = (raw || '').trim();
    if (!clean) return [];
    const stripped = clean.replace(/^std-/, '');
    const noS = stripped.replace(/^s(?=\d{8,})/i, '');
    const withS = /^\d{8,}$/.test(noS) ? `s${noS}` : '';
    return [
      clean,
      stripped,
      `std-${stripped}`,
      noS,
      noS ? `std-${noS}` : '',
      withS,
      withS ? `std-${withS}` : '',
    ].filter(Boolean);
  };
  if (typeof student === 'string') {
    return Array.from(new Set(expandCodeVariants(student)));
  }
  return Array.from(
    new Set([
      ...expandCodeVariants(student.id || ''),
      ...expandCodeVariants(student.studentCode || ''),
    ])
  );
}

export function writeSubmissionToLocalCache(
  sub: WeeklySubmission,
  student?: Pick<Student, 'id' | 'studentCode'> | null,
  markPending = true
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (markPending && sub.id) {
      markSubmissionPendingSync(sub.id);
    }
    const keys = new Set<string>([
      ...getCandidateStudentKeys(student),
      ...getCandidateStudentKeys(sub.studentId),
    ]);
    const serialized = JSON.stringify(sub);
    keys.forEach((k) => {
      try {
        localStorage.setItem(`kktech_submission_${k}_w${sub.weekNumber}`, serialized);
      } catch {
        // Ignore quota errors on single key
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kktech_submissions_updated'));
    }
  } catch {
    // Ignore storage write errors
  }
}

export function removeSubmissionFromLocalCache(studentId: string, weekNumber: number, subId?: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (subId) {
      markSubmissionSyncedToCloud(subId);
    }
    const keys = getCandidateStudentKeys(studentId);
    keys.forEach((k) => {
      localStorage.removeItem(`kktech_submission_${k}_w${weekNumber}`);
    });
    // Also remove any orphaned keys matching subId if weekNumber wasn't matched cleanly
    if (subId) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const storageKey = localStorage.key(i);
        if (!storageKey || !storageKey.startsWith('kktech_submission_')) continue;
        try {
          const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}') as WeeklySubmission;
          if (parsed && parsed.id === subId) {
            localStorage.removeItem(storageKey);
          }
        } catch {
          // ignore
        }
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kktech_submissions_updated'));
    }
  } catch {
    // Ignore storage errors
  }
}

export function readSubmissionFromLocalCache(
  student: Pick<Student, 'id' | 'studentCode'> | string | null | undefined,
  weekNumber: number
): WeeklySubmission | null {
  if (typeof localStorage === 'undefined' || !student) return null;
  try {
    const keys = getCandidateStudentKeys(student);
    for (const k of keys) {
      const raw = localStorage.getItem(`kktech_submission_${k}_w${weekNumber}`);
      if (raw) {
        const parsed = JSON.parse(raw) as WeeklySubmission;
        if (parsed && (parsed.dailyLogs || parsed.photos || parsed.taskTitle)) {
          return parsed;
        }
      }
    }
  } catch {
    // Ignore parse/storage errors
  }
  return null;
}

export function getMergedStudentSubmissions(
  student: Pick<Student, 'id' | 'studentCode'> | string | null | undefined,
  submissionsMap: Record<string, WeeklySubmission[]>
): WeeklySubmission[] {
  if (!student) return [];
  const candidateKeys = getCandidateStudentKeys(student);
  const candidateSet = new Set(candidateKeys);
  const byWeek = new Map<number, WeeklySubmission>();

  const consider = (sub: WeeklySubmission) => {
    const w = Number(sub.weekNumber);
    if (!w || w < 1 || w > 18) return;
    const existing = byWeek.get(w);
    if (!existing) {
      byWeek.set(w, sub);
      return;
    }
    // Prefer 'graded' over 'pending', otherwise prefer newer submission
    if (existing.status !== 'graded' && sub.status === 'graded') {
      byWeek.set(w, sub);
    } else if (existing.status === sub.status) {
      byWeek.set(w, sub);
    }
  };

  // 1. Direct bucket matches
  for (const key of candidateKeys) {
    const arr = submissionsMap[key];
    if (Array.isArray(arr)) {
      arr.forEach(consider);
    }
  }

  // 2. Scan all buckets in case studentId inside record matches candidateSet
  for (const arr of Object.values(submissionsMap)) {
    if (!Array.isArray(arr)) continue;
    for (const sub of arr) {
      if (sub && candidateSet.has(sub.studentId)) {
        consider(sub);
      }
    }
  }

  return Array.from(byWeek.values()).sort((a, b) => b.weekNumber - a.weekNumber);
}

export function computeSubmissionTotalHours(sub?: Partial<WeeklySubmission> | null): number {
  if (!sub) return 40.0;
  if (Array.isArray(sub.dailyLogs) && sub.dailyLogs.length > 0) {
    const summed = sub.dailyLogs.reduce((acc, log) => acc + (Number(log.hours) || 0), 0);
    if (summed > 0) return summed;
  }
  return Number(sub.totalHours) || 40.0;
}

/**
 * Reconcile authoritative Cloud Firestore submissions with localStorage cache:
 * - Keeps all live Firestore submissions
 * - Preserves only pending offline/optimistic local writes not yet reflected in Firestore
 * - Purges deleted submissions from localStorage so they never resurrect across refreshes or browsers
 */
export function reconcileSubmissionsWithCloud(
  cloudSubs: WeeklySubmission[]
): Record<string, WeeklySubmission[]> {
  const cloudById = new Map<string, WeeklySubmission>();
  const cloudStudentWeekKeys = new Set<string>();
  const grouped: Record<string, WeeklySubmission[]> = {};

  for (const sub of cloudSubs) {
    if (!sub || !sub.studentId || !sub.weekNumber) continue;
    if (sub.id) cloudById.set(sub.id, sub);
    cloudStudentWeekKeys.add(`${sub.studentId}::w${sub.weekNumber}`);
    if (!grouped[sub.studentId]) grouped[sub.studentId] = [];
    const existingIdx = grouped[sub.studentId].findIndex((x) => x.weekNumber === sub.weekNumber);
    if (existingIdx < 0) {
      grouped[sub.studentId].push(sub);
    } else if (grouped[sub.studentId][existingIdx].status === 'graded' && sub.status !== 'graded') {
      // Keep graded record over ungraded duplicate
    } else {
      grouped[sub.studentId][existingIdx] = sub;
    }
  }

  if (typeof localStorage !== 'undefined') {
    const pendingIds = readPendingIds();
    const stillPendingIds = new Set<string>();
    const keysToDelete: string[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (!storageKey || !storageKey.startsWith('kktech_submission_')) continue;
        const raw = localStorage.getItem(storageKey);
        if (!raw) continue;
        try {
          const localSub = JSON.parse(raw) as WeeklySubmission;
          if (!localSub || !localSub.studentId || !localSub.weekNumber) {
            keysToDelete.push(storageKey);
            continue;
          }
          const inCloud = Boolean(localSub.id && cloudById.has(localSub.id));
          if (inCloud) {
            // Synced to cloud cleanly — keep cache refreshed with cloud copy
            const cloudCopy = cloudById.get(localSub.id)!;
            if (cloudCopy.status === 'graded' && localSub.status !== 'graded') {
              localStorage.setItem(storageKey, JSON.stringify(cloudCopy));
            }
          } else if (localSub.id && pendingIds.has(localSub.id)) {
            // Unsynced optimistic/offline write — preserve and include in grouped map
            stillPendingIds.add(localSub.id);
            const bucket = grouped[localSub.studentId] || [];
            if (!bucket.some((x) => x.weekNumber === localSub.weekNumber)) {
              grouped[localSub.studentId] = [...bucket, localSub];
            }
          } else {
            // Removed from cloud (e.g., deleted by Admin) — purge local copy so it cannot resurrect
            keysToDelete.push(storageKey);
          }
        } catch {
          keysToDelete.push(storageKey);
        }
      }
      keysToDelete.forEach((k) => localStorage.removeItem(k));
      writePendingIds(stillPendingIds);
    } catch {
      // Ignore storage scan errors
    }
  }

  return grouped;
}

export function mergeSubmissionsWithLocalCache(
  submissionsMap: Record<string, WeeklySubmission[]>,
  cloudAuthoritative = false
): Record<string, WeeklySubmission[]> {
  if (cloudAuthoritative) {
    return reconcileSubmissionsWithCloud(Object.values(submissionsMap).flat());
  }

  const merged: Record<string, WeeklySubmission[]> = {};
  for (const [k, arr] of Object.entries(submissionsMap)) {
    if (Array.isArray(arr)) {
      merged[k] = [...arr];
    }
  }

  if (typeof localStorage !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (!storageKey || !storageKey.startsWith('kktech_submission_')) continue;
        const raw = localStorage.getItem(storageKey);
        if (!raw) continue;
        const sub = JSON.parse(raw) as WeeklySubmission;
        if (!sub || !sub.studentId || !sub.weekNumber) continue;
        const bucket = merged[sub.studentId] || [];
        const existingIdx = bucket.findIndex((x) => x.weekNumber === sub.weekNumber);
        if (existingIdx < 0) {
          merged[sub.studentId] = [...bucket, sub];
        } else if (bucket[existingIdx].status !== 'graded' && sub.status === 'graded') {
          const updated = [...bucket];
          updated[existingIdx] = sub;
          merged[sub.studentId] = updated;
        }
      }
    } catch {
      // Ignore storage scan errors
    }
  }

  return merged;
}
