# Production Email Kontrol Scripti
# Bu script, production'da email gönderiminin çalışıp çalışmadığını kontrol eder

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PRODUCTION EMAIL KONTROL SCRIPTI" -ForegroundColor Cyan
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
            
            # Secret değerlerini kontrol et (sadece varlığını, içeriğini değil)
            try {
                $emailUserValue = gcloud secrets versions access latest --secret="EMAIL_USER" 2>&1
                if ($LASTEXITCODE -eq 0 -and $emailUserValue -notmatch "error") {
                    Write-Host "   ✓ EMAIL_USER değeri set edilmiş" -ForegroundColor Green
                } else {
                    Write-Host "   ⚠ EMAIL_USER değeri boş olabilir" -ForegroundColor Yellow
                    $warnings += "EMAIL_USER değeri kontrol edilmeli"
                }
            } catch {
                Write-Host "   ⚠ EMAIL_USER değeri okunamadı" -ForegroundColor Yellow
            }
            
            try {
                $emailPassValue = gcloud secrets versions access latest --secret="EMAIL_PASS" 2>&1
                if ($LASTEXITCODE -eq 0 -and $emailPassValue -notmatch "error" -and $emailPassValue.Length -gt 0) {
                    Write-Host "   ✓ EMAIL_PASS değeri set edilmiş" -ForegroundColor Green
                } else {
                    Write-Host "   ⚠ EMAIL_PASS değeri boş olabilir" -ForegroundColor Yellow
                    $warnings += "EMAIL_PASS değeri kontrol edilmeli"
                }
            } catch {
                Write-Host "   ⚠ EMAIL_PASS değeri okunamadı" -ForegroundColor Yellow
            }
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

# 2. Cloud Run Secret Erişimi Kontrolü
Write-Host "`n2. Cloud Run Secret Erisimi Kontrolu..." -ForegroundColor Yellow
try {
    $serviceInfo = gcloud run services describe obs-api --region europe-west1 --format="yaml(spec.template.spec.containers[0].env)" 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($serviceInfo -match "EMAIL_USER" -or $serviceInfo -match "EMAIL_PASS") {
            Write-Host "   ✓ Email secret'ları Cloud Run'da görünüyor" -ForegroundColor Green
            $success += "Email secret'ları Cloud Run'da mevcut"
        } else {
            Write-Host "   ✗ Email secret'ları Cloud Run'da bulunamadi!" -ForegroundColor Red
            $errors += "Email secret'ları Cloud Run'a eklenmeli"
        }
        
        # Environment variables kontrolü
        if ($serviceInfo -match "EMAIL_HOST") {
            Write-Host "   ✓ EMAIL_HOST environment variable mevcut" -ForegroundColor Green
        } else {
            Write-Host "   ⚠ EMAIL_HOST environment variable bulunamadi" -ForegroundColor Yellow
            $warnings += "EMAIL_HOST environment variable eksik olabilir"
        }
        
        if ($serviceInfo -match "EMAIL_PORT") {
            Write-Host "   ✓ EMAIL_PORT environment variable mevcut" -ForegroundColor Green
        } else {
            Write-Host "   ⚠ EMAIL_PORT environment variable bulunamadi" -ForegroundColor Yellow
            $warnings += "EMAIL_PORT environment variable eksik olabilir"
        }
    } else {
        Write-Host "   ⚠ Cloud Run servisi bilgisi alinamadi" -ForegroundColor Yellow
        $warnings += "Cloud Run servisi kontrol edilemedi"
    }
} catch {
    Write-Host "   ⚠ Cloud Run kontrolu yapilamadi" -ForegroundColor Yellow
    $warnings += "Cloud Run kontrolü yapılamadı"
}

# 3. Son Loglar Kontrolü
Write-Host "`n3. Son Loglar Kontrolu..." -ForegroundColor Yellow
Write-Host "   (Son 50 log satırı kontrol ediliyor...)" -ForegroundColor Gray
try {
    $logs = gcloud run services logs read obs-api --region europe-west1 --limit 50 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($logs -match "EMAIL CONFIGURATION DEBUG") {
            Write-Host "   ✓ Email konfigürasyon logları bulundu" -ForegroundColor Green
            
            # Email konfigürasyon durumunu kontrol et
            if ($logs -match "EMAIL_USER.*SET") {
                Write-Host "   ✓ EMAIL_USER loglarda SET olarak görünüyor" -ForegroundColor Green
            } else {
                Write-Host "   ✗ EMAIL_USER loglarda SET olarak görünmüyor!" -ForegroundColor Red
                $errors += "EMAIL_USER secret'ı Cloud Run'da çalışmıyor"
            }
            
            if ($logs -match "EMAIL_PASS.*SET") {
                Write-Host "   ✓ EMAIL_PASS loglarda SET olarak görünüyor" -ForegroundColor Green
            } else {
                Write-Host "   ✗ EMAIL_PASS loglarda SET olarak görünmüyor!" -ForegroundColor Red
                $errors += "EMAIL_PASS secret'ı Cloud Run'da çalışmıyor"
            }
        } else {
            Write-Host "   ⚠ Email konfigürasyon logları bulunamadi" -ForegroundColor Yellow
            $warnings += "Email konfigürasyon logları görünmüyor - servis yeniden başlatılmalı"
        }
        
        # Email gönderim hatalarını kontrol et
        if ($logs -match "EMAIL SEND FAILURE" -or $logs -match "EMAIL_NOT_CONFIGURED" -or $logs -match "Email service is not configured") {
            Write-Host "   ✗ Email gönderim hatası loglarda görünüyor!" -ForegroundColor Red
            $errors += "Email gönderim hatası var - secret'ları kontrol edin"
        } elseif ($logs -match "Email sent successfully") {
            Write-Host "   ✓ Email gönderim başarılı logları görünüyor" -ForegroundColor Green
            $success += "Email gönderimi çalışıyor"
        }
    } else {
        Write-Host "   ⚠ Loglar okunamadi" -ForegroundColor Yellow
        $warnings += "Loglar okunamadı"
    }
} catch {
    Write-Host "   ⚠ Log kontrolu yapilamadi" -ForegroundColor Yellow
    $warnings += "Log kontrolü yapılamadı"
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
    Write-Host "EMAIL GONDERIMI CALISMIYOR!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Yapmaniz gerekenler:" -ForegroundColor Yellow
    Write-Host "  1. Secret'ları oluşturun:" -ForegroundColor White
    Write-Host "     echo -n 'obs.system.university@gmail.com' | gcloud secrets create EMAIL_USER --data-file=-" -ForegroundColor Gray
    Write-Host "     echo -n 'your-app-password' | gcloud secrets create EMAIL_PASS --data-file=-" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Cloud Run'a ekleyin:" -ForegroundColor White
    Write-Host "     gcloud run services update obs-api --region europe-west1 --update-secrets EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Yeni deploy yapın veya servisi yeniden başlatın" -ForegroundColor White
    exit 1
} else {
    if ($warnings.Count -eq 0) {
        Write-Host "✓ TUM KONTROLLER BASARILI!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Email gonderimi production'da calisiyor olmali." -ForegroundColor Green
        Write-Host ""
        Write-Host "Test etmek icin:" -ForegroundColor Cyan
        Write-Host "  1. Production'da yeni kullanıcı kaydı yapın" -ForegroundColor White
        Write-Host "  2. Email kutunuzu kontrol edin" -ForegroundColor White
        Write-Host "  3. Logları kontrol edin:" -ForegroundColor White
        Write-Host "     gcloud run services logs read obs-api --region europe-west1 --limit 100 | grep -i email" -ForegroundColor Gray
    } else {
        Write-Host "⚠ Bazı uyarılar var ama email gönderimi çalışıyor olabilir." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Test etmek icin production'da kayıt yapın ve email'i kontrol edin." -ForegroundColor Cyan
    }
    exit 0
}

