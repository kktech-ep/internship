/**
 * Service for fetching and querying Google Sheets tab: "data"
 * Spreadsheet ID: 1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28
 * Sheet Tab: data
 * Columns:
 *  - room (กลุ่มห้อง เช่น สอฟ.2/5, สอฟ.2/8, ...)
 *  - รหัสวิชา (subjectCode เช่น 30000-2005, 30104-2011, ...)
 *  - ชื่อวิชา (subjectName เช่น กิจกรรมในสถานประกอบการ 1, ...)
 *  - ครูนิเทศก์/ประจำวิชา (teacherName เช่น นายทักษิณ โสภาปิยะ, ...)
 *  - นิเทศ1, นิเทศ2, นิเทศ3
 */

import { CourseDataRow } from '../types';
import preloadedCourses from '../data/dataSheetCourses.json';

export const DATA_SHEET_CONFIG = {
  spreadsheetId: '1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28',
  sheetName: 'data',
  pivotSheetName: 'ตาราง Pivot 1',
  csvUrl: 'https://docs.google.com/spreadsheets/d/1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28/gviz/tq?tqx=out:csv&sheet=data',
  pivotCsvUrl: 'https://docs.google.com/spreadsheets/d/1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('ตาราง Pivot 1'),
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1wQWPpmbFof8HFZjofYz9DKWAYWpe9NngeUUCFdVVt28/edit'
};

const STORAGE_KEY = 'kktech_courses_data_sheet_v1';

/**
 * Parse CSV string into array of rows
 */
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Fetch course rows live from Google Sheet tab: data
 */
export async function fetchDataSheetCourses(forceRefresh = false): Promise<CourseDataRow[]> {
  if (!forceRefresh && typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read cached course data:', e);
    }
  }

  try {
    const res = await fetch(DATA_SHEET_CONFIG.csvUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/csv, text/plain, */*' }
    });

    if (res.ok) {
      const csvText = await res.text();
      const rawRows = parseCSV(csvText);
      const courses: CourseDataRow[] = [];

      for (let i = 1; i < rawRows.length; i++) {
        const r = rawRows[i];
        if (!r || !r[0]) continue;
        courses.push({
          room: (r[0] || '').trim(),
          subjectCode: (r[1] || '').trim(),
          subjectName: (r[2] || '').trim(),
          teacherName: (r[3] || '').trim(),
          nites1: (r[4] || '').trim(),
          nites2: (r[5] || '').trim(),
          nites3: (r[6] || '').trim()
        });
      }

      if (courses.length > 0) {
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
          } catch (e) {
            console.warn('LocalStorage course cache note:', e);
          }
        }
        return courses;
      }
    }
  } catch (err) {
    console.warn('Network fetch error for data sheet courses, using preloaded data:', err);
  }

  return preloadedCourses as CourseDataRow[];
}

/**
 * Fetch course rows live from Google Sheet tab: ตาราง Pivot 1
 */
export async function fetchPivotSheetCourses(): Promise<CourseDataRow[]> {
  try {
    const res = await fetch(DATA_SHEET_CONFIG.pivotCsvUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/csv, text/plain, */*' }
    });

    if (res.ok) {
      const csvText = await res.text();
      const rawRows = parseCSV(csvText);
      const courses: CourseDataRow[] = [];
      let currentRoom = '';

      for (let i = 1; i < rawRows.length; i++) {
        const r = rawRows[i];
        if (!r) continue;
        const rRoom = (r[0] || '').trim();
        if (rRoom) currentRoom = rRoom;
        const subjectCode = (r[1] || '').trim();
        const subjectName = (r[2] || '').trim();
        const teacherName = (r[3] || '').trim();

        if (subjectCode && teacherName) {
          courses.push({
            room: currentRoom,
            subjectCode,
            subjectName,
            teacherName,
            nites1: (r[4] || '').trim(),
            nites2: '',
            nites3: ''
          });
        }
      }

      if (courses.length > 0) {
        return courses;
      }
    }
  } catch (err) {
    console.warn('Network fetch error for Pivot 1 sheet, falling back to data courses:', err);
  }

  return fetchDataSheetCourses(false);
}

/**
 * Get courses synchronously from cache or fallback preloaded data
 */
export function getCachedCourses(): CourseDataRow[] {
  if (typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
  }
  return preloadedCourses as CourseDataRow[];
}

/**
 * Get courses for a specific room
 */
export function getCoursesByRoom(room: string, coursesList?: CourseDataRow[]): CourseDataRow[] {
  const all = coursesList || getCachedCourses();
  const cleanRoom = (room || '').trim().toLowerCase();
  return all.filter(c => c.room.toLowerCase() === cleanRoom);
}

/**
 * Get courses supervised by a specific teacher
 */
export function getCoursesByTeacher(teacherName: string, coursesList?: CourseDataRow[]): CourseDataRow[] {
  const all = coursesList || getCachedCourses();
  const cleanTarget = (teacherName || '').trim().toLowerCase().replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, '');
  return all.filter(c => {
    const cleanTeacher = c.teacherName.toLowerCase().replace(/^(นาย|นางสาว|นาง|ว่าที่ร้อยตรี|อาจารย์|ดร\.)\s*/, '');
    return cleanTeacher.includes(cleanTarget) || cleanTarget.includes(cleanTeacher);
  });
}

/**
 * Get rooms supervised by a teacher
 */
export function getRoomsByTeacher(teacherName: string, coursesList?: CourseDataRow[]): string[] {
  const teacherCourses = getCoursesByTeacher(teacherName, coursesList);
  return Array.from(new Set(teacherCourses.map(c => c.room)));
}

/**
 * Get all unique teachers from data sheet
 */
export function getAllTeachersFromData(coursesList?: CourseDataRow[]): string[] {
  const all = coursesList || getCachedCourses();
  const teachers = Array.from(new Set(all.map(c => c.teacherName.trim()).filter(Boolean)));
  return teachers.sort();
}

/**
 * Get all unique subjects from data sheet
 */
export function getAllSubjectsFromData(coursesList?: CourseDataRow[]): { subjectCode: string; subjectName: string; label: string }[] {
  const all = coursesList || getCachedCourses();
  const map = new Map<string, { subjectCode: string; subjectName: string; label: string }>();

  all.forEach(c => {
    const key = c.subjectCode.trim();
    if (key && !map.has(key)) {
      map.set(key, {
        subjectCode: c.subjectCode.trim(),
        subjectName: c.subjectName.trim(),
        label: `${c.subjectCode.trim()} ${c.subjectName.trim()}`
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.subjectCode.localeCompare(b.subjectCode));
}

/**
 * Get all unique rooms across data sheet and login sheet
 */
export function getAllRoomsFromData(coursesList?: CourseDataRow[]): string[] {
  const all = coursesList || getCachedCourses();
  const rooms = Array.from(new Set(all.map(c => c.room.trim()).filter(Boolean)));
  return rooms.sort();
}
