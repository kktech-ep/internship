import { Student, WeeklySubmission } from '../types';

export function getCandidateStudentKeys(student?: Pick<Student, 'id' | 'studentCode'> | string | null): string[] {
  if (!student) return [];
  if (typeof student === 'string') {
    const clean = student.trim();
    if (!clean) return [];
    const stripped = clean.replace(/^std-/, '');
    return Array.from(new Set([clean, stripped, `std-${stripped}`].filter(Boolean)));
  }
  const code = (student.studentCode || '').trim();
  const id = (student.id || '').trim();
  const strippedId = id.replace(/^std-/, '');
  return Array.from(
    new Set(
      [
        id,
        code,
        code ? `std-${code}` : '',
        strippedId,
        strippedId ? `std-${strippedId}` : '',
      ].filter(Boolean)
    )
  );
}

export function writeSubmissionToLocalCache(
  sub: WeeklySubmission,
  student?: Pick<Student, 'id' | 'studentCode'> | null
): void {
  if (typeof localStorage === 'undefined') return;
  try {
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

export function removeSubmissionFromLocalCache(studentId: string, weekNumber: number): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keys = getCandidateStudentKeys(studentId);
    keys.forEach((k) => {
      localStorage.removeItem(`kktech_submission_${k}_w${weekNumber}`);
    });
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

  // 3. Fallback to localStorage for weeks 1..18
  for (let w = 1; w <= 18; w++) {
    if (!byWeek.has(w)) {
      const localSub = readSubmissionFromLocalCache(student, w);
      if (localSub) {
        consider(localSub);
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

export function mergeSubmissionsWithLocalCache(
  submissionsMap: Record<string, WeeklySubmission[]>
): Record<string, WeeklySubmission[]> {
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
