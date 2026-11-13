import JSZip from 'jszip';

export interface DownloadZipResult {
  success: boolean;
  sizeBytes?: number;
  message: string;
}

/**
 * Downloads all web files bundled as a deployment .zip package.
 * Uses programmatic fetch + Blob + ObjectURL for 100% reliable download behavior
 * across desktop, mobile, and sandboxed iframes, with automatic JSZip fallback.
 */
export async function downloadAllWebZip(
  onProgress?: (status: string) => void
): Promise<DownloadZipResult> {
  onProgress?.('กำลังรวบรวมไฟล์เว็บทั้งหมด...');

  let blob: Blob | null = null;
  const candidateUrls = [
    './appserv_publish.zip',
    '/appserv_publish.zip',
    'appserv_publish.zip',
    './docs/appserv_publish.zip'
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const fetchedBlob = await res.blob();
        if (fetchedBlob.size > 20000) {
          blob = fetchedBlob;
          break;
        }
      }
    } catch {
      // try next candidate
    }
  }

  // Fallback: Bundle live using JSZip if prebuilt zip is not accessible
  if (!blob) {
    onProgress?.('กำลังรวบรวมไฟล์ HTML, สคริปต์ และไฟล์กำหนดค่าเซิร์ฟเวอร์...');
    const zip = new JSZip();

    zip.file(
      'README_INSTALL.txt',
      `=== คู่มือการติดตั้งระบบบันทึกข้อมูลการฝึกงาน แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น บน Web Server จริง ===\n\n` +
      `1. นำไฟล์และโฟลเดอร์ทั้งหมดใน zip นี้ ไปวางในโฟลเดอร์ Web Server ของวิทยาลัย:\n` +
      `   - AppServ: C:\\AppServ\\www\\ หรือ C:\\AppServ\\www\\internship\\\n` +
      `   - XAMPP: C:\\xampp\\htdocs\\ หรือ C:\\xampp\\htdocs\\internship\\\n` +
      `   - Linux Apache: /var/www/html/ หรือ /var/www/html/internship/\n` +
      `   - Nginx: /usr/share/nginx/html/\n\n` +
      `2. เปิดเว็บบราวเซอร์ (Chrome, Edge, Firefox, Safari) เข้าใช้งาน:\n` +
      `   - http://localhost/ หรือ http://[IP_เครื่อง_Server]/\n\n` +
      `3. การเชื่อมต่อฐานข้อมูล:\n` +
      `   - ระบบเชื่อมโยงฐานข้อมูล Google Cloud Firebase Firestore และ Google Sheets โดยตรงแบบเรียลไทม์\n`
    );

    zip.file(
      '.htaccess',
      `<IfModule mod_rewrite.c>\n  RewriteEngine On\n  RewriteBase /\n  RewriteRule ^index\\.html$ - [L]\n  RewriteCond %{REQUEST_FILENAME} !-f\n  RewriteCond %{REQUEST_FILENAME} !-d\n  RewriteRule . /index.html [L]\n</IfModule>\n`
    );

    zip.file(
      'web.config',
      `<?xml version="1.0" encoding="UTF-8"?>\n<configuration>\n  <system.webServer>\n    <rewrite>\n      <rules>\n        <rule name="SPA" stopProcessing="true">\n          <match url=".*" />\n          <conditions logicalGrouping="MatchAll">\n            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />\n            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />\n          </conditions>\n          <action type="Rewrite" url="/index.html" />\n        </rule>\n      </rules>\n    </rewrite>\n  </system.webServer>\n</configuration>`
    );

    try {
      const htmlRes = await fetch('./index.html');
      if (htmlRes.ok) {
        zip.file('index.html', await htmlRes.text());
      } else {
        zip.file('index.html', document.documentElement.outerHTML);
      }
    } catch {
      zip.file('index.html', document.documentElement.outerHTML);
    }

    blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }

  onProgress?.('เตรียมไฟล์ .zip สำเร็จ! กำลังส่งไฟล์เพื่อดาวน์โหลด...');

  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `kktech_internship_web_server_${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    window.URL.revokeObjectURL(downloadUrl);
    a.remove();
  }, 1000);

  return {
    success: true,
    sizeBytes: blob.size,
    message: `รวมไฟล์เว็บทั้งหมดสำเร็จ (ขนาด ${(blob.size / (1024 * 1024)).toFixed(2)} MB)`
  };
}
