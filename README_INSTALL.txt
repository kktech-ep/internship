=== คู่มือการติดตั้งระบบบันทึกข้อมูลการฝึกงาน แผนกวิชาช่างไฟฟ้ากำลัง วท.ขอนแก่น บน AppServ / Web Server จริง ===
แพ็กเกจนี้ประกอบด้วยข้อมูลและโค้ดล่าสุด (อัปเดต: 6 พฤศจิกายน 2569 เวลา 09:31:53 | สัปดาห์ที่ 1 - 18)

1. นำไฟล์และโฟลเดอร์ทั้งหมดใน zip นี้ ไปวางในโฟลเดอร์ Web Root ของเซิร์ฟเวอร์
   - สำหรับ AppServ: นำไปวางใน C:\AppServ\www\ หรือ C:\AppServ\www\internship\
   - สำหรับ XAMPP: นำไปวางใน C:\xampp\htdocs\ หรือ C:\xampp\htdocs\internship\
   - สำหรับ Linux / Apache: /var/www/html/

2. เปิดเว็บบราวเซอร์ (Chrome, Edge, Safari) แล้วเรียกใช้งาน:
   - กรณีวางใน root: http://localhost/ หรือ http://[IP_เครื่อง_Server]/
   - กรณีวางในโฟลเดอร์ย่อย: http://localhost/internship/

3. ระบบเชื่อมต่อฐานข้อมูล Google Cloud Firebase Firestore (internship2-2569) แบบออนไลน์ทันที ข้อมูลบันทึกและซิงค์แบบเรียลไทม์
   และมีไฟล์ข้อมูลสำรองล่าสุดเก็บไว้ในโฟลเดอร์ /data/ ครบถ้วน
