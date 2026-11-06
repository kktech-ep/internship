@echo off
chcp 65001 >nul
title KKTECH Internship Web Server Launcher
echo ========================================================
echo   KKTECH Power Internship Web Portal
echo   ระบบสารสนเทศการฝึกงานและนิเทศ แผนกวิชาช่างไฟฟ้ากำลัง
echo ========================================================
echo.
echo กำลังเริ่มต้น Web Server ภายในเครื่องของคุณ...
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] ตรวจพบ Node.js - เริ่มรัน server.cjs บนพอร์ต 80 หรือ 3000
    node server.cjs
    goto end
)

where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] ตรวจพบ Python - เริ่มรัน HTTP Server บนพอร์ต 80
    python -m http.server 80 2>nul || python -m http.server 8080
    goto end
)

echo [คำแนะนำ] กรุณาวางโฟลเดอร์นี้ใน C:\AppServ\www\ หรือ C:\xampp\htdocs\ เพื่อเปิดใช้งาน
pause

:end
