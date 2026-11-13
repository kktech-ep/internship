import os
import zipfile

def build_zip():
    dist_dir = 'dist'
    zip_path = 'public/appserv_publish.zip'

    # Ensure dist exists
    if not os.path.exists(dist_dir):
        print("dist directory does not exist yet.")
        return

    # Ensure .htaccess in dist
    htaccess_content = """<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
"""
    with open(os.path.join(dist_dir, '.htaccess'), 'w', encoding='utf-8') as f:
        f.write(htaccess_content)

    # README_INSTALL.txt
    readme_content = """=== คู่มือการติดตั้งระบบบันทึกข้อมูลการฝึกงาน แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น บน AppServ / Web Server จริง ===

1. นำไฟล์และโฟลเดอร์ทั้งหมดใน zip นี้ ไปวางในโฟลเดอร์ Web Root ของเซิร์ฟเวอร์
   - สำหรับ AppServ: นำไปวางใน C:\\AppServ\\www\\ หรือ C:\\AppServ\\www\\internship\\
   - สำหรับ XAMPP: นำไปวางใน C:\\xampp\\htdocs\\ หรือ C:\\xampp\\htdocs\\internship\\
   - สำหรับ Linux / Apache: /var/www/html/

2. เปิดเว็บบราวเซอร์ (Chrome, Edge, Safari) แล้วเรียกใช้งาน:
   - กรณีวางใน root: http://localhost/ หรือ http://[IP_เครื่อง_Server]/
   - กรณีวางในโฟลเดอร์ย่อย: http://localhost/internship/

3. ระบบเชื่อมต่อฐานข้อมูล Google Cloud Firebase Firestore (internship2-2569) แบบออนไลน์ทันที ข้อมูลบันทึกและซิงค์แบบเรียลไทม์
"""
    with open(os.path.join(dist_dir, 'README_INSTALL.txt'), 'w', encoding='utf-8') as f:
        f.write(readme_content)

    # Also put in docs directory
    if os.path.exists('docs'):
        with open(os.path.join('docs', '.htaccess'), 'w', encoding='utf-8') as f:
            f.write(htaccess_content)
        with open(os.path.join('docs', 'README_INSTALL.txt'), 'w', encoding='utf-8') as f:
            f.write(readme_content)

    # Write zip file
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                if file == 'appserv_publish.zip':
                    continue
                full_path = os.path.join(root, file)
                arcname = os.path.relpath(full_path, dist_dir)
                zipf.write(full_path, arcname)

    size = os.path.getsize(zip_path)
    print(f"Zip created successfully: {zip_path} ({size:,} bytes)")

    # Also copy zip to docs for GitHub Pages hosting if needed
    if os.path.exists('docs'):
        import shutil
        shutil.copy2(zip_path, 'docs/appserv_publish.zip')
        print("Copied zip to docs/appserv_publish.zip")

if __name__ == '__main__':
    build_zip()
