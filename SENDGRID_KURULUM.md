# SendGrid HTTP API Kurulum Rehberi

## 📋 Adım 1: SendGrid Hesabı Oluşturma

### 1.1 SendGrid Web Sitesine Gidin

1. Tarayıcınızda https://sendgrid.com adresine gidin
2. Sağ üst köşedeki **"Start for Free"** butonuna tıklayın

### 1.2 Hesap Oluşturun

1. **Email adresinizi** girin
2. **Şifre oluşturun** (güçlü bir şifre seçin)
3. **Hesap bilgilerinizi** doldurun
4. **"Create Account"** butonuna tıklayın

### 1.3 Email Doğrulama

1. Gelen email'i kontrol edin (Spam klasörüne de bakın)
2. Email'deki **"Verify Your Email"** butonuna tıklayın

---

## 📋 Adım 2: SendGrid API Key Oluşturma

### 2.1 SendGrid Dashboard'a Giriş Yapın

1. https://app.sendgrid.com adresine gidin
2. Oluşturduğunuz hesap bilgileriyle giriş yapın

### 2.2 API Keys Bölümüne Gidin

- Sol menüden **Settings** (⚙️) → **"API Keys"** seçin
- Veya direkt URL: https://app.sendgrid.com/settings/api_keys

### 2.3 Yeni API Key Oluşturun

1. **"Create API Key"** butonuna tıklayın
2. **API Key Name** alanına bir isim girin:
   - Örnek: `obs-system-backend` veya `nodejs-email-service`
3. **API Key Permissions** seçeneğini seçin:
   - **"Full Access"** (Önerilen - Tüm işlemler için)
   - Veya **"Restricted Access"** → **"Mail Send"** seçeneğini aktif edin
4. **"Create & View"** butonuna tıklayın

### 2.4 API Key'i Kopyalayın

⚠️ **ÇOK ÖNEMLİ:** API Key sadece bir kez gösterilir! Hemen kopyalayın.

1. Açılan pencerede API Key'inizi görürsünüz
2. Format: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. **"Copy"** butonuna tıklayarak API Key'i kopyalayın
4. Güvenli bir yere kaydedin

---

## 📋 Adım 3: SendGrid "From" Email Adresini Doğrulama

SendGrid, gönderen email adresinin doğrulanmış olmasını gerektirir. Bu adım **zorunludur**.

### 3.1 Sender Authentication Bölümüne Gidin

1. Sol menüden **Settings** (⚙️) → **"Sender Authentication"** seçin
2. Veya direkt URL: https://app.sendgrid.com/settings/sender_auth

### 3.2 Single Sender Verification

**Adım 1:**
1. **"Verify a Single Sender"** butonuna tıklayın
2. **"Create a Sender"** butonuna tıklayın

**Adım 2: Formu Doldurun**
- **From Email Address:** `system.obs1111@gmail.com`
- **From Name:** `Üniversite OBS` veya `OBS System`
- **Reply To:** `system.obs1111@gmail.com`
- **Company Address:** Şirket adresiniz (zorunlu)
- **City:** Şehir
- **State:** İl/Eyalet
- **Country:** Ülke
- **Zip Code:** Posta kodu

**Adım 3:**
1. **"Create"** butonuna tıklayın
2. SendGrid size bir doğrulama emaili gönderecek

**Adım 4: Email'i Doğrulayın**
1. `system.obs1111@gmail.com` email adresini kontrol edin
2. SendGrid'den gelen email'i açın
3. Email içindeki **"Verify Single Sender"** butonuna tıklayın

**Adım 5: Doğrulama Kontrolü**
1. SendGrid Dashboard'a geri dönün
2. **Settings** → **Sender Authentication** → **Single Sender Verification**
3. Email adresinizin yanında **"Verified"** yazısını görmelisiniz

---

## 📋 Adım 4: Local .env Dosyasını Güncelleme

`.env` dosyanızı açın ve şu satırları ekleyin:

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM=system.obs1111@gmail.com
```

**Örnek:**
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM=system.obs1111@gmail.com
```

---

## 📋 Adım 5: Production Secret Manager Kurulumu

### 5.1 SendGrid API Key Secret'ını Oluşturun

```bash
echo -n "SG.your-api-key-here" | gcloud secrets create SENDGRID_API_KEY --data-file=-
```

**Örnek:**
```bash
echo -n "SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" | gcloud secrets create SENDGRID_API_KEY --data-file=-
```

### 5.2 Secret'ı Kontrol Edin

```bash
# Secret'ları listeleyin
gcloud secrets list | grep SENDGRID

# Secret değerini kontrol edin (sadece okuma)
gcloud secrets versions access latest --secret="SENDGRID_API_KEY"
```

### 5.3 Cloud Run'a Secret Erişimi Verin

```bash
gcloud run services update obs-api \
  --region europe-west1 \
  --update-secrets SENDGRID_API_KEY=SENDGRID_API_KEY:latest
```

**Not:** `cloudbuild.yaml` dosyası zaten güncellendi, yeni deploy'da otomatik eklenir.

---

## 📋 Adım 6: Paketi Yükleyin

```bash
cd OBS-System-Backend-BerkantHamzaMirayBeyza
npm install
```

Bu komut `@sendgrid/mail` paketini yükleyecektir.

---

## 🧪 Adım 7: Test Etme

### 7.1 Local Test

1. `.env` dosyasını güncelleyin (yukarıdaki adımlar)
2. Backend'i başlatın: `npm run dev`
3. Yeni kullanıcı kaydı yapın
4. `system.obs1111@gmail.com` email adresini kontrol edin

### 7.2 Production Test

1. Secret'ları oluşturun ve Cloud Run'a ekleyin
2. Deploy edin
3. Production'da yeni kullanıcı kaydı yapın
4. Email'i kontrol edin

### 7.3 Log Kontrolü

```bash
# Email gönderim loglarını kontrol edin
gcloud run services logs read obs-api --region europe-west1 --limit 100 | grep -i "email\|sendgrid"
```

**Beklenen çıktı:**
```
Email Provider: sendgrid
SENDGRID_API_KEY: SET (SG.****)
✅ Email sent successfully via SendGrid to system.obs1111@gmail.com
```

---

## ✅ Kontrol Listesi

- [ ] SendGrid hesabı oluşturuldu
- [ ] API Key oluşturuldu ve kopyalandı
- [ ] `system.obs1111@gmail.com` email adresi SendGrid'de doğrulandı
- [ ] Local `.env` dosyası güncellendi
- [ ] `npm install` çalıştırıldı
- [ ] Local test başarılı
- [ ] Production'da `SENDGRID_API_KEY` secret'ı oluşturuldu
- [ ] Cloud Run'a secret erişimi verildi
- [ ] Production'da test başarılı

---

## ❌ Sorun Giderme

### "SendGrid API Key is not configured" hatası

1. `.env` dosyasında `SENDGRID_API_KEY` var mı kontrol edin
2. API Key doğru mu kontrol edin (SG. ile başlamalı)
3. Production'da secret'ı kontrol edin:
   ```bash
   gcloud secrets versions access latest --secret="SENDGRID_API_KEY"
   ```

### "SendGrid authentication failed" hatası

- API Key'in doğru olduğundan emin olun
- API Key'in "Mail Send" izni olduğundan emin olun
- SendGrid Dashboard'da API Key'i kontrol edin

### "From email is not verified" hatası

- `system.obs1111@gmail.com` email adresini SendGrid'de doğrulayın
- SendGrid Dashboard → Settings → Sender Authentication
- Email adresinin "Verified" olduğundan emin olun

### Email gönderilmiyor

1. Logları kontrol edin:
   ```bash
   gcloud run services logs read obs-api --region europe-west1 --limit 200 | grep -i sendgrid
   ```
2. SendGrid Dashboard'da Activity Feed'i kontrol edin
3. API Key izinlerini kontrol edin

---

## 📝 Özet Komutlar

### Local Kurulum

```bash
# 1. Paketi yükle
npm install

# 2. .env dosyasını güncelle
# EMAIL_PROVIDER=sendgrid
# SENDGRID_API_KEY=SG.your-api-key
# SENDGRID_FROM=system.obs1111@gmail.com
```

### Production Kurulum

```bash
# 1. Secret'ı oluştur
echo -n "SG.your-api-key" | gcloud secrets create SENDGRID_API_KEY --data-file=-

# 2. Cloud Run'a ekle
gcloud run services update obs-api \
  --region europe-west1 \
  --update-secrets SENDGRID_API_KEY=SENDGRID_API_KEY:latest

# 3. Deploy et (cloudbuild.yaml zaten güncellendi)
git add .
git commit -m "SendGrid entegrasyonu"
git push
```

---

## 🎯 Avantajlar

- ✅ **Firewall Sorunu Yok**: HTTPS (443) portu her zaman açıktır
- ✅ **Daha Hızlı**: HTTP API, SMTP'den daha hızlıdır
- ✅ **Daha Güvenilir**: Modern email servisleri HTTP API kullanır
- ✅ **Daha İyi Tracking**: Email açılma, tıklama istatistikleri
- ✅ **Kolay Entegrasyon**: RESTful API, kolay kullanım
- ✅ **Ücretsiz Plan**: Günde 100 email ücretsiz

---

## 📞 Destek

SendGrid ile ilgili sorunlar için:
- SendGrid Dashboard: https://app.sendgrid.com
- SendGrid Dokümantasyon: https://docs.sendgrid.com
- SendGrid Support: https://support.sendgrid.com

