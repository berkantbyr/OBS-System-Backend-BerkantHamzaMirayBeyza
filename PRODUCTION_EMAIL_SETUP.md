# Production Email Kurulumu

Bu dokümantasyon, production ortamında (Google Cloud Run) email gönderimini yapılandırmak için gereken adımları açıklar.

## Sorun

Local'de email gönderimi çalışıyor ancak production'da çalışmıyor. Bunun nedeni production'da email environment variables'ların set edilmemiş olmasıdır.

**Etkilenen Özellikler:**
- ✅ Email doğrulama (kayıt sonrası)
- ✅ Şifre sıfırlama (forgot password)
- ✅ Email yeniden gönderme

## Çözüm

### 1. Google Cloud Secret Manager'da Email Secret'larını Oluşturma

```bash
# Gmail App Password'unuzu Secret Manager'a ekleyin
gcloud secrets create EMAIL_USER \
  --data-file=- <<< "your-email@gmail.com"

gcloud secrets create EMAIL_PASS \
  --data-file=- <<< "your-app-password-here"
```

**Not:** Gmail kullanıyorsanız, normal şifreniz yerine [App Password](https://myaccount.google.com/apppasswords) kullanmanız gerekir.

### 2. Cloud Run Servisine Secret Erişimi Verme

```bash
# Cloud Run servisine secret erişimi verin
gcloud run services update obs-api \
  --region europe-west1 \
  --update-secrets EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest
```

### 3. Mevcut Secret'ları Kontrol Etme

```bash
# Tüm secret'ları listeleyin
gcloud secrets list

# Secret değerlerini kontrol edin (sadece okuma)
gcloud secrets versions access latest --secret="EMAIL_USER"
gcloud secrets versions access latest --secret="EMAIL_PASS"
```

### 4. Secret'ları Güncelleme

Eğer email bilgilerini değiştirmeniz gerekirse:

```bash
# Yeni versiyon ekleyin
echo -n "new-email@gmail.com" | gcloud secrets versions add EMAIL_USER --data-file=-
echo -n "new-app-password" | gcloud secrets versions add EMAIL_PASS --data-file=-
```

### 5. Cloud Build ile Otomatik Deploy

`cloudbuild.yaml` dosyası artık email secret'larını otomatik olarak Cloud Run'a ekler:

```yaml
- '--set-secrets'
- 'DB_HOST=DB_HOST:latest,DB_USER=DB_USER:latest,DB_PASSWORD=DB_PASSWORD:latest,DB_NAME=DB_NAME:latest,JWT_SECRET=JWT_SECRET:latest,EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest'
```

### 6. Manuel Deploy (Cloud Build kullanmıyorsanız)

```bash
gcloud run deploy obs-api \
  --image gcr.io/PROJECT_ID/obs-api:latest \
  --region europe-west1 \
  --set-env-vars "NODE_ENV=production,FRONTEND_URL=https://obs-frontend-214391529742.europe-west1.run.app,EMAIL_HOST=smtp.gmail.com,EMAIL_PORT=587" \
  --set-secrets "DB_HOST=DB_HOST:latest,DB_USER=DB_USER:latest,DB_PASSWORD=DB_PASSWORD:latest,DB_NAME=DB_NAME:latest,JWT_SECRET=JWT_SECRET:latest,EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest"
```

## Gmail App Password Oluşturma

1. Google Account'a gidin: https://myaccount.google.com/
2. **Security** (Güvenlik) sekmesine gidin
3. **2-Step Verification** (2 Adımlı Doğrulama) aktif olmalı
4. **App passwords** (Uygulama şifreleri) bölümüne gidin
5. Yeni bir App Password oluşturun
6. Bu şifreyi `EMAIL_PASS` secret'ına ekleyin

## Test Etme

Deploy sonrası email gönderimini test etmek için:

### 1. Email Doğrulama Testi
1. Yeni bir kullanıcı kaydı yapın
2. Email kutunuzu kontrol edin (doğrulama email'i gelmeli)
3. Email'deki linke tıklayarak doğrulamayı tamamlayın

### 2. Şifre Sıfırlama Testi
1. Giriş sayfasında "Şifremi Unuttum" linkine tıklayın
2. Email adresinizi girin
3. Email kutunuzu kontrol edin (şifre sıfırlama token'ı gelmeli)
4. Token'ı kullanarak şifrenizi sıfırlayın

### 3. Log Kontrolü
Cloud Run loglarını kontrol edin:
```bash
# Son 50 log satırını görüntüle
gcloud run services logs read obs-api --region europe-west1 --limit 50

# Email ile ilgili logları filtrele
gcloud run services logs read obs-api --region europe-west1 --limit 100 | grep -i email

# Şifre sıfırlama loglarını kontrol et
gcloud run services logs read obs-api --region europe-west1 --limit 100 | grep -i "password reset"

# Email gönderim hatalarını kontrol et
gcloud run services logs read obs-api --region europe-west1 --limit 100 | grep -i "email send error"
```

### 4. Email Gönderim Hatalarını Kontrol Etme
Loglarda şunları arayın:
- `Email send error` - Email gönderim hatası
- `Email authentication failed` - Email kimlik doğrulama hatası
- `Email service is not configured` - Email servisi yapılandırılmamış
- `PRODUCTION EMAIL SEND FAILURE` - Production'da email gönderim başarısız

## Sorun Giderme

### Email gönderilmiyor

1. **Secret'ların doğru set edildiğini kontrol edin:**
   ```bash
   gcloud run services describe obs-api --region europe-west1 --format="value(spec.template.spec.containers[0].env)"
   ```

2. **Cloud Run loglarını kontrol edin:**
   ```bash
   gcloud run services logs read obs-api --region europe-west1 --limit 100 | grep -i email
   ```

3. **Gmail App Password'un doğru olduğundan emin olun:**
   - App Password'u yeniden oluşturun
   - Secret Manager'da güncelleyin

### "Email authentication failed" hatası

- Gmail App Password kullandığınızdan emin olun (normal şifre değil)
- 2-Step Verification'ın aktif olduğundan emin olun
- Secret'ların doğru set edildiğini kontrol edin

### "Connection timeout" hatası

- `EMAIL_HOST=smtp.gmail.com` olduğundan emin olun
- `EMAIL_PORT=587` olduğundan emin olun
- Cloud Run'un internet erişimi olduğundan emin olun

### Şifre sıfırlama email'i gelmiyor

1. **Secret'ların doğru set edildiğini kontrol edin:**
   ```bash
   gcloud run services describe obs-api --region europe-west1 --format="value(spec.template.spec.containers[0].env)"
   ```
   `EMAIL_USER` ve `EMAIL_PASS` secret'larının listelendiğinden emin olun.

2. **Logları kontrol edin:**
   ```bash
   gcloud run services logs read obs-api --region europe-west1 --limit 200 | grep -A 10 "forgot-password\|password reset"
   ```

3. **Email gönderim hatası var mı kontrol edin:**
   - Loglarda `PRODUCTION EMAIL SEND FAILURE` mesajını arayın
   - `Failed to send password reset email` mesajını kontrol edin

4. **Token'ın oluşturulduğunu kontrol edin:**
   - Loglarda `Password reset requested` mesajını arayın
   - Token'ın oluşturulduğunu ama email'in gönderilmediğini görebilirsiniz

## Önemli Notlar

- **Gmail günlük gönderim limiti:** Gmail hesabı başına günde 500 email gönderebilirsiniz
- **Production için önerilen:** Gmail yerine SendGrid, Mailgun veya AWS SES gibi profesyonel email servisleri kullanın
- **Güvenlik:** App Password'ları düzenli olarak yenileyin
- **Monitoring:** Email gönderim hatalarını Cloud Logging'de izleyin

## Alternatif: Profesyonel Email Servisleri

Gmail yerine profesyonel bir email servisi kullanmak isterseniz:

### SendGrid
```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

### Mailgun
```bash
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=your-mailgun-username
EMAIL_PASS=your-mailgun-password
```

### AWS SES
```bash
EMAIL_HOST=email-smtp.region.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your-aws-access-key
EMAIL_PASS=your-aws-secret-key
```

