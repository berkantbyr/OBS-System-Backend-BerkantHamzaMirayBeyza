@echo off
chcp 65001 >nul
echo ========================================
echo   Backend Başlatma
echo ========================================
echo.

REM .env dosyası kontrolü
if not exist .env (
    echo [1/3] .env dosyası oluşturuluyor...
    if exist env.example (
        copy env.example .env >nul
        echo ✅ .env dosyası oluşturuldu
        echo ⚠️  Lütfen .env dosyasındaki veritabanı ayarlarını kontrol edin!
    ) else (
        echo ❌ env.example dosyası bulunamadı!
        pause
        exit /b 1
    )
) else (
    echo ✅ .env dosyası mevcut
)

REM Node modules kontrolü
if not exist node_modules (
    echo [2/3] node_modules yükleniyor...
    call npm install
    if errorlevel 1 (
        echo ❌ npm install başarısız!
        pause
        exit /b 1
    )
) else (
    echo ✅ node_modules mevcut
)

echo [3/3] Backend başlatılıyor...
echo.
echo 📍 Backend http://localhost:5000 adresinde çalışacak
echo 📍 API: http://localhost:5000/api/v1
echo.
echo ⚠️  Backend'i durdurmak için Ctrl+C tuşlarına basın
echo.

REM Backend'i başlat
call npm run dev

pause

