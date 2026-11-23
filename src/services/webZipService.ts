import JSZip from 'jszip';
import { getAllLoginSheetStudents, getAllLoginSheetTeachers } from './sheetAuthService';
import { getCachedCourses } from './courseDataService';
import { getLocalForm1Rows, getLocalForm3Rows } from './googleSheetsService';
import { WEEKS_1_TO_18 } from '../data/weeksData';
import { formatThaiErrorMessage } from '../utils/thaiErrorUtils';

export async function downloadAllWebZip(): Promise<{
  success: boolean;
  message: string;
  fileCount?: number;
}> {
  try {
    const zip = new JSZip();
    const students = getAllLoginSheetStudents();
    const teachers = getAllLoginSheetTeachers();
    const courses = getCachedCourses();
    const form1Rows = getLocalForm1Rows();
    const form3Rows = getLocalForm3Rows();

    const exportDate = new Date().toISOString();

    zip.file(
      'README.txt',
      [
        'KKTECH Dual Vocational Internship System (ภาคเรียนที่ 2/2569)',
        'แผนกวิชาช่างไฟฟ้ากำลัง วิทยาลัยเทคนิคขอนแก่น',
        `วันที่ส่งออกชุดข้อมูลสำรอง: ${new Date().toLocaleString('th-TH')}`,
        `จำนวนนักศึกษา: ${students.length} คน`,
        `จำนวนครูนิเทศก์: ${teachers.length} ท่าน`,
        `จำนวนรายวิชา: ${courses.length} รายการ`,
        `รายงานการนิเทศ (Form 3): ${form3Rows.length} รายการ`,
      ].join('\n')
    );

    zip.file('data/students.json', JSON.stringify(students, null, 2));
    zip.file('data/teachers.json', JSON.stringify(teachers, null, 2));
    zip.file('data/courses.json', JSON.stringify(courses, null, 2));
    zip.file('data/form1_companies.json', JSON.stringify(form1Rows, null, 2));
    zip.file('data/form3_supervisions.json', JSON.stringify(form3Rows, null, 2));
    zip.file('data/weeks_1_to_18.json', JSON.stringify(WEEKS_1_TO_18, null, 2));

    zip.file(
      'manifest.json',
      JSON.stringify(
        {
          system: 'KKTECH Power Internship Portal',
          semester: '2/2569',
          exportedAt: exportDate,
          counts: {
            students: students.length,
            teachers: teachers.length,
            courses: courses.length,
            form1: form1Rows.length,
            form3: form3Rows.length,
          },
        },
        null,
        2
      )
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kktech-internship-2569-backup-${exportDate.slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return {
      success: true,
      message: 'ดาวน์โหลดไฟล์สำรองข้อมูลระบบ (.zip) เรียบร้อยแล้ว',
      fileCount: 8,
    };
  } catch (err) {
    return {
      success: false,
      message: formatThaiErrorMessage(err, 'ไม่สามารถสร้างไฟล์สำรองข้อมูล .zip ได้'),
    };
  }
}
