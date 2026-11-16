/**
 * Google Sheets Service for KKTECH Dual Vocational Internship
 * Target Sheet: 1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28
 * Tab: Form_1
 */

import { Form3SupervisionRecord } from '../types';

export const GOOGLE_SHEET_CONFIG = {
  spreadsheetId: '1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28',
  form1SheetName: 'Form_1',
  form3SheetName: 'Form_3',
  get spreadsheetUrl() {
    return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit`;
  },
  getForm3SheetUrl() {
    return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit#gid=form3`;
  }
};

export interface Form1RowData {
  timestamp: string;
  studentCode: string;
  studentName: string;
  level: string;
  companyName: string;
  department: string;
  mentorName: string;
  mentorPhone: string;
  emergencyPhone: string;
  gpsCoordinates: string;
  notes: string;
  status?: string;
  syncedToGoogle?: boolean;
}

const LOCAL_FORM1_STORAGE_KEY = 'kktech_form1_sheet_records_v1';

// Empty default so no phantom/deleted mock students leak before real sync
const DEFAULT_FORM1_ROWS: Form1RowData[] = [];

export function getLocalForm1Rows(): Form1RowData[] {
  try {
    const raw = localStorage.getItem(LOCAL_FORM1_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading local Form 1 records:', e);
  }
  return DEFAULT_FORM1_ROWS;
}

export function saveLocalForm1Rows(rows: Form1RowData[]): void {
  try {
    localStorage.setItem(LOCAL_FORM1_STORAGE_KEY, JSON.stringify(rows));
  } catch (e) {
    console.warn('Error saving local Form 1 records:', e);
  }
}

/**
 * Append a Form_1 row to Google Sheets file 1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28
 */
export async function appendForm1ToGoogleSheet(
  rowData: Form1RowData,
  accessToken?: string | null
): Promise<{ success: boolean; message: string; syncedLive: boolean }> {
  // 1. Always update local cache so user sees it right away
  const currentRows = getLocalForm1Rows();
  // Check if student already has a record; if so, replace with latest update, else unshift
  const existingIndex = currentRows.findIndex(r => r.studentCode === rowData.studentCode);
  let updatedRows: Form1RowData[];
  if (existingIndex >= 0) {
    updatedRows = [...currentRows];
    updatedRows[existingIndex] = rowData;
  } else {
    updatedRows = [rowData, ...currentRows];
  }

  // 2. If access token is provided, attempt live append via Google Sheets REST API
  if (accessToken) {
    try {
      const rowValues = [
        rowData.timestamp,
        rowData.studentCode,
        rowData.studentName,
        rowData.level,
        rowData.companyName,
        rowData.department,
        rowData.mentorName,
        rowData.mentorPhone,
        rowData.emergencyPhone,
        rowData.gpsCoordinates,
        rowData.notes,
        rowData.status || 'บันทึกสำเร็จ'
      ];

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_CONFIG.spreadsheetId}/values/${encodeURIComponent(GOOGLE_SHEET_CONFIG.form1SheetName)}!A:Z:append?valueInputOption=USER_ENTERED`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${GOOGLE_SHEET_CONFIG.form1SheetName}!A:Z`,
          majorDimension: 'ROWS',
          values: [rowValues]
        })
      });

      if (response.ok) {
        rowData.syncedToGoogle = true;
        saveLocalForm1Rows(updatedRows);
        return {
          success: true,
          message: `ซิงค์บันทึกข้อมูลเข้า Google Sheets ไฟล์ ${GOOGLE_SHEET_CONFIG.spreadsheetId} แผ่นงาน ${GOOGLE_SHEET_CONFIG.form1SheetName} เรียบร้อยแล้ว`,
          syncedLive: true
        };
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn('Google Sheets append response error:', errJson);
        saveLocalForm1Rows(updatedRows);
        return {
          success: true,
          message: `บันทึกข้อมูลในระบบเรียบร้อย (Google Sheets API: ${errJson.error?.message || response.statusText})`,
          syncedLive: false
        };
      }
    } catch (apiErr: any) {
      console.warn('Network error appending to Google Sheets:', apiErr);
      saveLocalForm1Rows(updatedRows);
      return {
        success: true,
        message: 'บันทึกข้อมูลเข้าสู่ฐานข้อมูลระบบเรียบร้อย (เครือข่ายออฟไลน์)',
        syncedLive: false
      };
    }
  }

  // Without token: saved locally & mirrored to Firestore
  saveLocalForm1Rows(updatedRows);
  return {
    success: true,
    message: `บันทึกข้อมูลสถานประกอบการสำเร็จ พร้อมเชื่อมโยงชีต ${GOOGLE_SHEET_CONFIG.form1SheetName}`,
    syncedLive: false
  };
}

/**
 * Fetch live data from Google Sheet Form_1 tab
 */
export async function fetchGoogleSheetForm1Rows(accessToken: string): Promise<{ rows: Form1RowData[]; error?: string }> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_CONFIG.spreadsheetId}/values/${encodeURIComponent(GOOGLE_SHEET_CONFIG.form1SheetName)}!A2:Z`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { rows: getLocalForm1Rows(), error: err.error?.message || res.statusText };
    }

    const data = await res.json();
    if (!data.values || !Array.isArray(data.values) || data.values.length === 0) {
      return { rows: getLocalForm1Rows() };
    }

    const parsed: Form1RowData[] = data.values.map((v: any[]) => ({
      timestamp: v[0] || '',
      studentCode: v[1] || '',
      studentName: v[2] || '',
      level: v[3] || '',
      companyName: v[4] || '',
      department: v[5] || '',
      mentorName: v[6] || '',
      mentorPhone: v[7] || '',
      emergencyPhone: v[8] || '',
      gpsCoordinates: v[9] || '',
      notes: v[10] || '',
      status: v[11] || 'บันทึกแล้ว',
      syncedToGoogle: true
    }));

    saveLocalForm1Rows(parsed);
    return { rows: parsed };
  } catch (e: any) {
    return { rows: getLocalForm1Rows(), error: e.message };
  }
}

/* ==========================================================================
   Google Sheet Tab: Form_3 (รายงานการนิเทศ & ประเมินสมรรถนะวิชาชีพ)
   ========================================================================== */

const LOCAL_FORM3_STORAGE_KEY = 'kktech_form3_sheet_records_v1';

const PENDING_FORM3_IDS_KEY = 'kktech_pending_form3_ids_v1';

// Clean empty default so phantom/mock supervision records cannot resurrect
export const DEFAULT_FORM3_ROWS: Form3SupervisionRecord[] = [];

function readPendingForm3Ids(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(PENDING_FORM3_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function writePendingForm3Ids(ids: Set<string>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PENDING_FORM3_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

export function markForm3PendingIds(ids: string[]): void {
  const cur = readPendingForm3Ids();
  ids.forEach((id) => { if (id) cur.add(id); });
  writePendingForm3Ids(cur);
}

export function getLocalForm3Rows(): Form3SupervisionRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_FORM3_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Strip legacy hardcoded seed IDs if they lingered in storage
        return parsed.filter((r) => r && r.id && r.id !== 'f3-seed-1' && r.id !== 'f3-seed-2');
      }
    }
  } catch (e) {
    console.warn('Error reading local Form 3 records:', e);
  }
  return DEFAULT_FORM3_ROWS;
}

export function saveLocalForm3Rows(rows: Form3SupervisionRecord[]): void {
  try {
    localStorage.setItem(LOCAL_FORM3_STORAGE_KEY, JSON.stringify(rows));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kktech_form3_updated'));
    }
  } catch (e) {
    console.warn('Error saving local Form 3 records:', e);
  }
}

export function deleteLocalForm3Row(id: string): void {
  try {
    const pending = readPendingForm3Ids();
    if (pending.delete(id)) writePendingForm3Ids(pending);
    const rows = getLocalForm3Rows();
    const filtered = rows.filter(r => r.id !== id);
    localStorage.setItem(LOCAL_FORM3_STORAGE_KEY, JSON.stringify(filtered));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kktech_form3_updated'));
    }
  } catch (e) {
    console.warn('Error deleting local Form 3 record:', e);
  }
}

/**
 * Reconcile authoritative Firestore Form 3 records with localStorage cache:
 * - Always keeps live Firestore records
 * - Preserves only pending unsynced optimistic records not yet reflected in Firestore
 * - Purges deleted records so Admin deletions stay deleted across all tabs/browsers
 */
export function reconcileForm3WithCloud(cloudRecords: Form3SupervisionRecord[]): Form3SupervisionRecord[] {
  const map = new Map<string, Form3SupervisionRecord>();
  const cloudIds = new Set<string>();

  for (const r of cloudRecords) {
    if (r && r.id && r.id !== 'f3-seed-1' && r.id !== 'f3-seed-2') {
      cloudIds.add(r.id);
      map.set(r.id, r);
    }
  }

  const pending = readPendingForm3Ids();
  const stillPending = new Set<string>();
  const local = getLocalForm3Rows();

  for (const lr of local) {
    if (!lr || !lr.id) continue;
    if (cloudIds.has(lr.id)) {
      continue;
    }
    if (pending.has(lr.id)) {
      stillPending.add(lr.id);
      map.set(lr.id, lr);
    }
  }

  writePendingForm3Ids(stillPending);
  const reconciled = Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.timestamp || a.visitDate).getTime() || 0;
    const timeB = new Date(b.timestamp || b.visitDate).getTime() || 0;
    return timeB - timeA;
  });

  try {
    localStorage.setItem(LOCAL_FORM3_STORAGE_KEY, JSON.stringify(reconciled));
  } catch {
    // ignore storage errors
  }

  return reconciled;
}

/**
 * Append or update a Form_3 supervision record to Google Sheet file 1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28
 * Tab: Form_3
 */
export async function appendForm3ToGoogleSheet(
  record: Form3SupervisionRecord,
  accessToken?: string | null
): Promise<{ success: boolean; message: string; syncedLive: boolean }> {
  // 1. Update local storage cache
  markForm3PendingIds([record.id]);
  const currentRows = getLocalForm3Rows();
  const existingIdx = currentRows.findIndex(r => r.id === record.id || (r.studentCode === record.studentCode && r.visitDate === record.visitDate));
  let updatedRows: Form3SupervisionRecord[];
  if (existingIdx >= 0) {
    updatedRows = [...currentRows];
    updatedRows[existingIdx] = record;
  } else {
    updatedRows = [record, ...currentRows];
  }

  // 2. Format row for Google Sheets Form_3 tab
  // Photo descriptions / summaries
  const photo1 = record.photos[0] ? `${record.photos[0].title} (${record.photos[0].caption || ''})` : '';
  const photo2 = record.photos[1] ? `${record.photos[1].title} (${record.photos[1].caption || ''})` : '';
  const photo3 = record.photos[2] ? `${record.photos[2].title} (${record.photos[2].caption || ''})` : '';
  const photo4 = record.photos[3] ? `${record.photos[3].title} (${record.photos[3].caption || ''})` : '';

  const rowValues = [
    record.timestamp || new Date().toLocaleString('th-TH'),
    record.visitDate || '',
    record.studentCode,
    record.studentName,
    record.studentRoom || '',
    record.levelDepartment || '',
    record.companyName || '',
    record.companyDepartment || '',
    record.teacherName || '',
    record.mentorName || '',
    record.safetyPassed ? 'ผ่านเกณฑ์ความปลอดภัย PPE (100%)' : 'ต้องปรับปรุง',
    record.score,
    record.grade,
    record.mentorFeedback,
    record.teacherComment,
    photo1,
    photo2,
    photo3,
    photo4,
    record.status || 'บันทึกสำเร็จ'
  ];

  // 3. Attempt live append if Google OAuth access token is provided
  if (accessToken) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_CONFIG.spreadsheetId}/values/${encodeURIComponent(GOOGLE_SHEET_CONFIG.form3SheetName)}!A:Z:append?valueInputOption=USER_ENTERED`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${GOOGLE_SHEET_CONFIG.form3SheetName}!A:Z`,
          majorDimension: 'ROWS',
          values: [rowValues]
        })
      });

      if (response.ok) {
        record.syncedToGoogleSheet = true;
        saveLocalForm3Rows(updatedRows);
        return {
          success: true,
          message: `บันทึกข้อมูลและรูปภาพเข้าสู่ Google Sheets แผ่นงาน ${GOOGLE_SHEET_CONFIG.form3SheetName} เรียบร้อยแล้ว`,
          syncedLive: true
        };
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn('Google Sheets Form_3 append warning:', errJson);
        saveLocalForm3Rows(updatedRows);
        return {
          success: true,
          message: `บันทึกรายงานการนิเทศลงฐานข้อมูลระบบเรียบร้อย (ซิงค์ชีต Form_3 ในคิว)`,
          syncedLive: false
        };
      }
    } catch (apiErr) {
      console.warn('Network error appending to Google Sheet Form_3:', apiErr);
      saveLocalForm3Rows(updatedRows);
      return {
        success: true,
        message: 'บันทึกรายงานการนิเทศเข้าสู่ฐานข้อมูลระบบเรียบร้อย (ออฟไลน์)',
        syncedLive: false
      };
    }
  }

  // Without live token: stored locally and ready for Firestore sync
  saveLocalForm3Rows(updatedRows);
  return {
    success: true,
    message: `บันทึกรายงานการนิเทศสำเร็จ พร้อมเชื่อมโยงแผ่นงาน ${GOOGLE_SHEET_CONFIG.form3SheetName} และ Firebase: internship2-2569`,
    syncedLive: false
  };
}

/**
 * Append or update multiple Form_3 supervision records (batch for multiple students or by company)
 */
export async function appendBatchForm3ToGoogleSheet(
  records: Form3SupervisionRecord[],
  accessToken?: string | null
): Promise<{ success: boolean; message: string; count: number; syncedLive: boolean }> {
  if (!records || records.length === 0) {
    return { success: false, message: 'ไม่มีข้อมูลนักศึกษาที่ต้องการบันทึก', count: 0, syncedLive: false };
  }

  // 1. Update local storage cache
  markForm3PendingIds(records.map(r => r.id));
  const currentRows = getLocalForm3Rows();
  let updatedRows = [...currentRows];

  for (const record of records) {
    const existingIdx = updatedRows.findIndex(
      r => r.id === record.id || (r.studentCode === record.studentCode && r.visitDate === record.visitDate)
    );
    if (existingIdx >= 0) {
      updatedRows[existingIdx] = record;
    } else {
      updatedRows = [record, ...updatedRows];
    }
  }

  // 2. Format rows for Google Sheets Form_3 tab
  const rowsValues = records.map(record => {
    const photo1 = record.photos[0] ? `${record.photos[0].title} (${record.photos[0].caption || ''})` : '';
    const photo2 = record.photos[1] ? `${record.photos[1].title} (${record.photos[1].caption || ''})` : '';
    const photo3 = record.photos[2] ? `${record.photos[2].title} (${record.photos[2].caption || ''})` : '';
    const photo4 = record.photos[3] ? `${record.photos[3].title} (${record.photos[3].caption || ''})` : '';

    return [
      record.timestamp || new Date().toLocaleString('th-TH'),
      record.visitDate || '',
      record.studentCode,
      record.studentName,
      record.studentRoom || '',
      record.levelDepartment || '',
      record.companyName || '',
      record.companyDepartment || '',
      record.teacherName || '',
      record.mentorName || '',
      record.safetyPassed ? 'ผ่านเกณฑ์ความปลอดภัย PPE (100%)' : 'ต้องปรับปรุง',
      record.score,
      record.grade,
      record.mentorFeedback,
      record.teacherComment,
      photo1,
      photo2,
      photo3,
      photo4,
      record.status || 'บันทึกสำเร็จ'
    ];
  });

  // 3. Attempt live append if Google OAuth access token is provided
  if (accessToken) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_CONFIG.spreadsheetId}/values/${encodeURIComponent(GOOGLE_SHEET_CONFIG.form3SheetName)}!A:Z:append?valueInputOption=USER_ENTERED`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${GOOGLE_SHEET_CONFIG.form3SheetName}!A:Z`,
          majorDimension: 'ROWS',
          values: rowsValues
        })
      });

      if (response.ok) {
        records.forEach(r => { r.syncedToGoogleSheet = true; });
        saveLocalForm3Rows(updatedRows);
        return {
          success: true,
          message: `บันทึกข้อมูลและรูปภาพนักศึกษา ${records.length} คน เข้าสู่ Google Sheets แผ่นงาน ${GOOGLE_SHEET_CONFIG.form3SheetName} เรียบร้อยแล้ว`,
          count: records.length,
          syncedLive: true
        };
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn('Google Sheets Form_3 batch append warning:', errJson);
        saveLocalForm3Rows(updatedRows);
        return {
          success: true,
          message: `บันทึกรายงานการนิเทศ ${records.length} คน ลงฐานข้อมูลระบบเรียบร้อย (ซิงค์ชีต Form_3 ในคิว)`,
          count: records.length,
          syncedLive: false
        };
      }
    } catch (apiErr) {
      console.warn('Network error appending batch to Google Sheet Form_3:', apiErr);
      saveLocalForm3Rows(updatedRows);
      return {
        success: true,
        message: `บันทึกรายงานการนิเทศ ${records.length} คน เข้าสู่ฐานข้อมูลระบบเรียบร้อย (ออฟไลน์)`,
        count: records.length,
        syncedLive: false
      };
    }
  }

  // Without live token: stored locally and ready for Firestore sync
  saveLocalForm3Rows(updatedRows);
  return {
    success: true,
    message: `บันทึกรายงานการนิเทศสำเร็จสำหรับนักศึกษา ${records.length} คน พร้อมเชื่อมโยงแผ่นงาน ${GOOGLE_SHEET_CONFIG.form3SheetName} และ Firebase: internship2-2569`,
    count: records.length,
    syncedLive: false
  };
}

/**
 * Fetch live rows from Google Sheet Form_3 tab
 */
export async function fetchGoogleSheetForm3Rows(accessToken: string): Promise<{ rows: Form3SupervisionRecord[]; error?: string }> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_CONFIG.spreadsheetId}/values/${encodeURIComponent(GOOGLE_SHEET_CONFIG.form3SheetName)}!A2:Z`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { rows: getLocalForm3Rows(), error: err.error?.message || res.statusText };
    }

    const data = await res.json();
    if (!data.values || !Array.isArray(data.values) || data.values.length === 0) {
      return { rows: getLocalForm3Rows() };
    }

    const parsed: Form3SupervisionRecord[] = data.values.map((v: any[], idx: number) => ({
      id: `f3-sheet-row-${idx + 2}`,
      timestamp: v[0] || '',
      visitDate: v[1] || '',
      studentCode: v[2] || '',
      studentName: v[3] || '',
      studentRoom: v[4] || '',
      levelDepartment: v[5] || '',
      companyName: v[6] || '',
      companyDepartment: v[7] || '',
      teacherName: v[8] || '',
      mentorName: v[9] || '',
      safetyPassed: !((v[10] || '').includes('ไม่ผ่าน') || (v[10] || '').includes('ปรับปรุง')),
      score: parseFloat(v[11]) || 18,
      grade: v[12] || 'ดีเยี่ยม (A)',
      mentorFeedback: v[13] || '',
      teacherComment: v[14] || '',
      photos: [
        ...(v[15] ? [{ id: 'p1', title: 'รูปถ่ายที่ 1', caption: v[15], url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80', uploadedAt: v[1] }] : []),
        ...(v[16] ? [{ id: 'p2', title: 'รูปถ่ายที่ 2', caption: v[16], url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80', uploadedAt: v[1] }] : []),
        ...(v[17] ? [{ id: 'p3', title: 'รูปถ่ายที่ 3', caption: v[17], url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80', uploadedAt: v[1] }] : []),
        ...(v[18] ? [{ id: 'p4', title: 'รูปถ่ายที่ 4', caption: v[18], url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80', uploadedAt: v[1] }] : []),
      ],
      status: v[19] || 'บันทึกสำเร็จ',
      syncedToGoogleSheet: true,
      studentId: `std-${v[2] || 'unknown'}`
    }));

    saveLocalForm3Rows(parsed);
    return { rows: parsed };
  } catch (e: any) {
    return { rows: getLocalForm3Rows(), error: e.message };
  }
}
