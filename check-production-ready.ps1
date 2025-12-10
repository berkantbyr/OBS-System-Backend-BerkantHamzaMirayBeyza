# Production Deploy Öncesi Kontrol Scripti
# Bu script, production'a deploy etmeden önce gerekli kontrolleri yapar

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PRODUCTION DEPLOY KONTROL SCRIPTI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()
$success = @()

# 1. Secret Manager Kontrolü
Write-Host "1. Secret Manager Kontrolu..." -ForegroundColor Yellow
try {
    $secrets = gcloud secrets list --format="value(name)" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $emailUserExists = $secrets -contains "EMAIL_USER"
        $emailPassExists = $secrets -contains "EMAIL_PASS"
        
        if ($emailUserExists -and $emailPassExists) {
            Write-Host "   ✓ EMAIL_USER secret mevcut" -ForegroundColor Green
            Write-Host "   ✓ EMAIL_PASS secret mevcut" -ForegroundColor Green
            $success += "Email secret'ları mevcut"
        } else {
            if (-not $emailUserExists) {
                Write-Host "   ✗ EMAIL_USER secret bulunamadi!" -ForegroundColor Red
                $errors += "EMAIL_USER secret'ı oluşturulmalı"
            }
            if (-not $emailPassExists) {
                Write-Host "   ✗ EMAIL_PASS secret bulunamadi!" -ForegroundColor Red
                $errors += "EMAIL_PASS secret'ı oluşturulmalı"
            }
        }
    } else {
        Write-Host "   ⚠ gcloud komutu calistirilamadi" -ForegroundColor Yellow
        $warnings += "gcloud komutu çalıştırılamadı - manuel kontrol gerekli"
    }
} catch {
    Write-Host "   ⚠ Secret Manager kontrolu yapilamadi" -ForegroundColor Yellow
    $warnings += "Secret Manager kontrolü yapılamadı"
}

# 2. cloudbuild.yaml Kontrolü
Write-Host "`n2. cloudbuild.yaml Kontrolu..." -ForegroundColor Yellow
if (Test-Path "cloudbuild.yaml") {
    $cloudbuildContent = Get-Content "cloudbuild.yaml" -Raw
    if ($cloudbuildContent -match "EMAIL_USER=EMAIL_USER:latest") {
        Write-Host "   ✓ EMAIL_USER cloudbuild.yaml'da var" -ForegroundColor Green
        $success += "EMAIL_USER cloudbuild.yaml'da mevcut"
    } else {
        Write-Host "   ✗ EMAIL_USER cloudbuild.yaml'da yok!" -ForegroundColor Red
        $errors += "EMAIL_USER cloudbuild.yaml'a eklenmeli"
    }
    
    if ($cloudbuildContent -match "EMAIL_PASS=EMAIL_PASS:latest") {
        Write-Host "   ✓ EMAIL_PASS cloudbuild.yaml'da var" -ForegroundColor Green
        $success += "EMAIL_PASS cloudbuild.yaml'da mevcut"
    } else {
        Write-Host "   ✗ EMAIL_PASS cloudbuild.yaml'da yok!" -ForegroundColor Red
        $errors += "EMAIL_PASS cloudbuild.yaml'a eklenmeli"
    }
    
    if ($cloudbuildContent -match "EMAIL_HOST=smtp.gmail.com") {
        Write-Host "   ✓ EMAIL_HOST cloudbuild.yaml'da var" -ForegroundColor Green
        $success += "EMAIL_HOST cloudbuild.yaml'da mevcut"
    } else {
        Write-Host "   ⚠ EMAIL_HOST cloudbuild.yaml'da yok" -ForegroundColor Yellow
        $warnings += "EMAIL_HOST cloudbuild.yaml'da yok (opsiyonel)"
    }
} else {
    Write-Host "   ✗ cloudbuild.yaml dosyasi bulunamadi!" -ForegroundColor Red
    $errors += "cloudbuild.yaml dosyası bulunamadı"
}

# 3. Kod Değişiklikleri Kontrolü
Write-Host "`n3. Kod Degisiklikleri Kontrolu..." -ForegroundColor Yellow
if (Test-Path "src/services/authService.js") {
    $authServiceContent = Get-Content "src/services/authService.js" -Raw
    if ($authServiceContent -match "sendVerificationEmail") {
        Write-Host "   ✓ Email doğrulama kodu mevcut" -ForegroundColor Green
        $success += "Email doğrulama kodu mevcut"
    } else {
        Write-Host "   ✗ Email doğrulama kodu bulunamadi!" -ForegroundColor Red
        $errors += "Email doğrulama kodu eksik"
    }
    
    if ($authServiceContent -match "sendPasswordResetEmail") {
        Write-Host "   ✓ Şifre sıfırlama kodu mevcut" -ForegroundColor Green
        $success += "Şifre sıfırlama kodu mevcut"
    } else {
        Write-Host "   ✗ Şifre sıfırlama kodu bulunamadi!" -ForegroundColor Red
        $errors += "Şifre sıfırlama kodu eksik"
    }
} else {
    Write-Host "   ✗ authService.js dosyasi bulunamadi!" -ForegroundColor Red
    $errors += "authService.js dosyası bulunamadı"
}

# 4. Local .env Kontrolü
Write-Host "`n4. Local .env Kontrolu..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "EMAIL_USER=") {
        Write-Host "   ✓ EMAIL_USER .env'de var" -ForegroundColor Green
        $success += "EMAIL_USER .env'de mevcut"
    } else {
        Write-Host "   ⚠ EMAIL_USER .env'de yok" -ForegroundColor Yellow
        $warnings += "EMAIL_USER .env'de yok (local test için)"
    }
    
    if ($envContent -match "EMAIL_PASS=") {
        Write-Host "   ✓ EMAIL_PASS .env'de var" -ForegroundColor Green
        $success += "EMAIL_PASS .env'de mevcut"
    } else {
        Write-Host "   ⚠ EMAIL_PASS .env'de yok" -ForegroundColor Yellow
        $warnings += "EMAIL_PASS .env'de yok (local test için)"
    }
} else {
    Write-Host "   ⚠ .env dosyasi bulunamadi" -ForegroundColor Yellow
    $warnings += ".env dosyası bulunamadı (local test için)"
}

# Özet
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "OZET" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($success.Count -gt 0) {
    Write-Host "✓ Basarili Kontroller ($($success.Count)):" -ForegroundColor Green
    foreach ($item in $success) {
        Write-Host "   - $item" -ForegroundColor White
    }
    Write-Host ""
}

if ($warnings.Count -gt 0) {
    Write-Host "⚠ Uyarilar ($($warnings.Count)):" -ForegroundColor Yellow
    foreach ($item in $warnings) {
        Write-Host "   - $item" -ForegroundColor White
    }
    Write-Host ""
}

if ($errors.Count -gt 0) {
    Write-Host "✗ Hatalar ($($errors.Count)):" -ForegroundColor Red
    foreach ($item in $errors) {
        Write-Host "   - $item" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "LUTFEN HATALARI DUZELTIN VE TEKRAR CALISTIRIN!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Detayli bilgi icin PRODUCTION_DEPLOY_CHECKLIST.md dosyasina bakin." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✓ TUM KONTROLLER BASARILI!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Simdi deploy edebilirsiniz:" -ForegroundColor Cyan
    Write-Host "  1. git add ." -ForegroundColor White
    Write-Host "  2. git commit -m 'Email doğrulama ve şifre sıfırlama production düzeltmeleri'" -ForegroundColor White
    Write-Host "  3. git push origin main" -ForegroundColor White
    Write-Host ""
    Write-Host "Veya manuel deploy:" -ForegroundColor Cyan
    Write-Host "  gcloud builds submit --config cloudbuild.yaml" -ForegroundColor White
    Write-Host ""
    Write-Host "Deploy sonrasi test icin PRODUCTION_DEPLOY_CHECKLIST.md dosyasina bakin." -ForegroundColor Yellow
    exit 0
}

