@echo off
echo ========================================================
echo  🚀 SKRM AUTO UPDATE TOOL
echo ========================================================
echo.
echo Sedang mengumpulkan file terbaru...
git add .

echo.
echo Sedang menyimpan perubahan...
set "timestamp=%date% %time%"
git commit -m "Auto Update: %timestamp%"

echo.
echo Sedang mengirim ke GitHub...
git push origin main

echo.
if %errorlevel% equ 0 (
    echo ✅ SUKSES! Aplikasi telah terupdate di GitHub.
    echo Vercel akan otomatis mendeteksi dan melakukan deploy dalam 1-2 menit.
) else (
    echo ❌ GAGAL! Periksa koneksi internet atau nama repository Anda.
)
echo.
pause
