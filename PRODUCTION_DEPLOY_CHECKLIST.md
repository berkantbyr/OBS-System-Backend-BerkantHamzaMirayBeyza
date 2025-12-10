# Production Deploy Checklist - Email Özellikleri

Bu checklist, email doğrulama ve şifre sıfırlama özelliklerini production'a deploy etmeden önce kontrol etmeniz gereken adımları içerir.

## ✅ Pre-Deploy Kontrolleri

### 1. Local Test Başarılı mı?

- [ ] Email doğrulama local'de çalışıyor
- [ ] Şifre sıfırlama local'de çalışıyor
- [ ] Email yeniden gönderme local'de çalışıyor
- [ ] Tüm test senaryoları başarılı

### 2. Secret Manager'da Email Secret'ları Var mı?

```bash
# Secret'ları kontrol edin
gcloud secrets list | grep EMAIL
```

**Gerekli Secret'lar:**
- [ ] `EMAIL_USER` secret'ı mevcut
- [ ] `EMAIL_PASS` secret'ı mevcut

**Eğer yoksa oluşturun:**
```bash
# EMAIL_USER oluştur
echo -n "obs.system.university@gmail.com" | gcloud secrets create EMAIL_USER --data-file=-

# EMAIL_PASS oluştur (Gmail App Password)
echo -n "your-app-password-here" | gcloud secrets create EMAIL_PASS --data-file=-
```

### 3. Secret Değerleri Doğru mu?

```bash
# EMAIL_USER değerini kontrol et (sadece okuma)
gcloud secrets versions access latest --secret="EMAIL_USER"

# EMAIL_PASS değerini kontrol et (sadece okuma)
gcloud secrets versions access latest --secret="EMAIL_PASS"
```

**Kontrol:**
- [ ] EMAIL_USER doğru email adresi
- [ ] EMAIL_PASS Gmail App Password (normal şifre değil!)

### 4. cloudbuild.yaml Güncel mi?

`cloudbuild.yaml` dosyasında email secret'ları ekli olmalı:

```yaml
- '--set-secrets'
- 'DB_HOST=DB_HOST:latest,DB_USER=DB_USER:latest,DB_PASSWORD=DB_PASSWORD:latest,DB_NAME=DB_NAME:latest,JWT_SECRET=JWT_SECRET:latest,EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest'
```

- [ ] `EMAIL_USER=EMAIL_USER:latest` var
- [ ] `EMAIL_PASS=EMAIL_PASS:latest` var

### 5. Environment Variables Doğru mu?

`cloudbuild.yaml` dosyasında email environment variables ekli olmalı:

```yaml
- '--set-env-vars'
- 'NODE_ENV=production,FRONTEND_URL=https://obs-frontend-214391529742.europe-west1.run.app,EMAIL_HOST=smtp.gmail.com,EMAIL_PORT=587'
```

- [ ] `EMAIL_HOST=smtp.gmail.com` var
- [ ] `EMAIL_PORT=587` var
- [ ] `FRONTEND_URL` doğru production URL

## 🚀 Deploy Adımları

### 1. Değişiklikleri Commit ve Push Edin

```bash
git add .
git commit -m "Email doğrulama ve şifre sıfırlama production düzeltmeleri"
git push origin main
```

### 2. Cloud Build ile Deploy

```bash
# Cloud Build tetikle (eğer otomatik değilse)
gcloud builds submit --config cloudbuild.yaml
```

**Veya GitHub'a push yaptıysanız otomatik deploy başlayacak.**

### 3. Deploy Sonrası Kontroller

#### 3.1. Cloud Run Servis Durumu

```bash
# Servis durumunu kontrol et
gcloud run services describe obs-api --region europe-west1 --format="value(status.conditions)"
```

- [ ] Servis çalışıyor
- [ ] Hata yok

#### 3.2. Secret'ların Cloud Run'a Eklendiğini Kontrol Et

```bash
# Cloud Run environment variables ve secrets'ı kontrol et
gcloud run services describe obs-api --region europe-west1 --format="yaml(spec.template.spec.containers[0].env)" | grep -i email
```

- [ ] `EMAIL_USER` secret'ı Cloud Run'da görünüyor
- [ ] `EMAIL_PASS` secret'ı Cloud Run'da görünüyor
- [ ] `EMAIL_HOST` environment variable var
- [ ] `EMAIL_PORT` environment variable var

#### 3.3. İlk Log Kontrolü

```bash
# Son logları kontrol et
gcloud run services logs read obs-api --region europe-west1 --limit 50
```

**Aranacak mesajlar:**
- [ ] `Server is running` mesajı var
- [ ] `Database connection established` mesajı var
- [ ] Email konfigürasyon hatası yok

## 🧪 Production Test Senaryoları

### Test 1: Email Doğrulama

1. **Production frontend'de yeni kullanıcı kaydı yapın:**
   - `https://obs-frontend-214391529742.europe-west1.run.app/register`
   - Gerçek bir email adresi kullanın

2. **Email kutunuzu kontrol edin:**
   - [ ] Doğrulama email'i geldi
   - [ ] Email'de doğrulama linki var

3. **Doğrulama linkine tıklayın:**
   - [ ] Doğrulama başarılı
   - [ ] Giriş yapabiliyorsunuz

4. **Logları kontrol edin:**
   ```bash
   gcloud run services logs read obs-api --region europe-west1 --limit 100 | grep -i "verification\|email sent"
   ```
   - [ ] `Verification email sent` mesajı var
   - [ ] `Email sent successfully` mesajı var
   - [ ] Hata yok

### Test 2: Şifre Sıfırlama

1. **Production frontend'de "Şifremi Unuttum" kullanın:**
   - `https://obs-frontend-214391529742.europe-west1.run.app/login`
   - "Şifremi Unuttum" linkine tıklayın
   - Email adresinizi girin

2. **Email kutunuzu kontrol edin:**
   - [ ] Şifre sıfırlama email'i geldi
   - [ ] Email'de token var
   - [ ] Email'de şifre sıfırlama linki var

3. **Token'ı kullanarak şifre sıfırlayın:**
   - [ ] Token çalışıyor
   - [ ] Şifre sıfırlama başarılı

4. **Yeni şifreyle giriş yapın:**
   - [ ] Giriş başarılı

5. **Logları kontrol edin:**
   ```bash
   gcloud run services logs read obs-api --region europe-west1 --limit 100 | grep -i "password reset\|forgot"
   ```
   - [ ] `Password reset requested` mesajı var
   - [ ] `Email sent successfully` mesajı var
   - [ ] `PRODUCTION EMAIL SEND FAILURE` mesajı yok

### Test 3: Email Yeniden Gönderme

1. **Doğrulanmamış kullanıcıyla giriş yapmayı deneyin**
2. **"Email'i yeniden gönder" linkine tıklayın**
3. **Email kutunuzu kontrol edin:**
   - [ ] Yeni doğrulama email'i geldi

## ❌ Sorun Giderme

### Email gelmiyor

1. **Secret'ları kontrol edin:**
   ```bash
   gcloud secrets list | grep EMAIL
   gcloud run services describe obs-api --region europe-west1 --format="yaml(spec.template.spec.containers[0].env)"
   ```

2. **Logları kontrol edin:**
   ```bash
   gcloud run services logs read obs-api --region europe-west1 --limit 200 | grep -i "email\|PRODUCTION EMAIL SEND FAILURE"
   ```

3. **Olası sorunlar:**
   - Secret'lar Cloud Run'a eklenmemiş → `gcloud run services update` komutunu çalıştırın
   - Gmail App Password yanlış → Secret'ı güncelleyin
   - Email servisi yapılandırılmamış → Loglarda `Email service is not configured` mesajı görünür

### "Email service is not configured" hatası

Bu hata, `EMAIL_USER` veya `EMAIL_PASS` secret'larının Cloud Run'da olmadığını gösterir.

**Çözüm:**
```bash
# Secret'ları Cloud Run'a ekleyin
gcloud run services update obs-api \
  --region europe-west1 \
  --update-secrets EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest
```

### "Email authentication failed" hatası

Gmail App Password yanlış veya 2-Step Verification kapalı.

**Çözüm:**
1. Gmail App Password'u yeniden oluşturun
2. Secret'ı güncelleyin:
   ```bash
   echo -n "new-app-password" | gcloud secrets versions add EMAIL_PASS --data-file=-
   ```
3. Cloud Run'ı yeniden deploy edin

## ✅ Deploy Başarılı Kontrol Listesi

Tüm testler başarılı olduktan sonra:

- [ ] Email doğrulama production'da çalışıyor
- [ ] Şifre sıfırlama production'da çalışıyor
- [ ] Email yeniden gönderme production'da çalışıyor
- [ ] Loglarda hata yok
- [ ] Tüm test senaryoları başarılı

## 📝 Notlar

- **Gmail günlük limiti:** Günde 500 email gönderebilirsiniz
- **Production için önerilen:** Gmail yerine SendGrid, Mailgun veya AWS SES kullanın
- **Monitoring:** Email gönderim hatalarını Cloud Logging'de izleyin
- **Secret güvenliği:** Secret'ları düzenli olarak yenileyin

