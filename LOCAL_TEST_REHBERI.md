# Local Test Rehberi - Email Doğrulama ve Şifre Sıfırlama

Bu rehber, email doğrulama ve şifre sıfırlama özelliklerini local'de test etmek için gereken adımları açıklar.

## Ön Hazırlık

### 1. Backend'i Başlatma

```bash
cd OBS-System-Backend-BerkantHamzaMirayBeyza
npm run dev
```

Backend'in başarıyla başladığını kontrol edin:
- Terminal'de `Server is running on 0.0.0.0:5000` mesajını görmelisiniz
- `Database connection established successfully` mesajını görmelisiniz

### 2. Frontend'i Başlatma

Yeni bir terminal açın:

```bash
cd OBS-System-Frontend-BerkantHamzaMirayBeyza
npm run dev
```

Frontend'in başarıyla başladığını kontrol edin:
- Terminal'de `Local: http://localhost:5173` mesajını görmelisiniz
- Tarayıcıda `http://localhost:5173` adresine gidebilmelisiniz

### 3. Email Konfigürasyonu Kontrolü

`.env` dosyasında şu ayarların olduğundan emin olun:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Not:** Gmail kullanıyorsanız, normal şifreniz yerine [App Password](https://myaccount.google.com/apppasswords) kullanmanız gerekir.

## Test Senaryoları

### Test 1: Email Doğrulama (Yeni Kullanıcı Kaydı)

1. **Frontend'de kayıt sayfasına gidin:**
   - `http://localhost:5173/register` veya kayıt butonuna tıklayın

2. **Yeni bir kullanıcı kaydedin:**
   - Email adresinizi girin (gerçek bir email adresi kullanın)
   - Şifre, ad, soyad vb. bilgileri doldurun
   - Kayıt butonuna tıklayın

3. **Backend loglarını kontrol edin:**
   ```
   Terminal'de şu mesajları görmelisiniz:
   - "New user registered: your-email@example.com"
   - "Verification email sent to: your-email@example.com"
   - "✅ Email sent successfully to your-email@example.com"
   ```

4. **Email kutunuzu kontrol edin:**
   - Email'inizde "E-posta Adresinizi Doğrulayın" konulu bir email görmelisiniz
   - Email'de bir doğrulama linki olmalı

5. **Doğrulama linkine tıklayın:**
   - Email'deki linke tıklayın
   - Veya linki kopyalayıp tarayıcıya yapıştırın
   - "E-posta adresiniz başarıyla doğrulandı" mesajını görmelisiniz

6. **Giriş yapmayı deneyin:**
   - Doğrulama sonrası giriş yapabilmelisiniz
   - Doğrulama yapmadan giriş yapmayı denerseniz hata almalısınız

### Test 2: Şifre Sıfırlama (Forgot Password)

1. **Giriş sayfasına gidin:**
   - `http://localhost:5173/login`

2. **"Şifremi Unuttum" linkine tıklayın:**
   - Giriş formunun altında "Şifremi Unuttum" linkini bulun
   - Linke tıklayın

3. **Email adresinizi girin:**
   - Kayıtlı email adresinizi girin
   - "Gönder" butonuna tıklayın

4. **Backend loglarını kontrol edin:**
   ```
   Terminal'de şu mesajları görmelisiniz:
   - "Password reset requested - User login: your-email@example.com"
   - "🔐 ŞİFRE SIFIRLAMA KODU (Development Mode)"
   - "Token: [token-here]"
   - "✅ Email sent successfully to your-email@example.com"
   ```

5. **Email kutunuzu kontrol edin:**
   - Email'inizde "Şifre Sıfırlama Talebi" konulu bir email görmelisiniz
   - Email'de bir token (kod) olmalı
   - Email'de bir şifre sıfırlama linki olmalı

6. **Token'ı kullanarak şifre sıfırlayın:**
   - Email'deki token'ı kopyalayın
   - Şifre sıfırlama sayfasına gidin (email'deki linke tıklayın veya manuel gidin)
   - Token'ı girin
   - Yeni şifrenizi girin
   - Şifrenizi sıfırlayın

7. **Yeni şifreyle giriş yapın:**
   - Giriş sayfasına gidin
   - Email adresinizi ve yeni şifrenizi girin
   - Başarıyla giriş yapabilmelisiniz

### Test 3: Email Yeniden Gönderme (Resend Verification)

1. **Doğrulanmamış bir kullanıcıyla giriş yapmayı deneyin:**
   - Email doğrulaması yapılmamış bir kullanıcıyla giriş yapmayı deneyin
   - "E-posta adresinizi doğrulamanız gerekiyor" gibi bir mesaj görmelisiniz

2. **"Email'i yeniden gönder" linkine tıklayın:**
   - Veya doğrudan `/resend-verification` sayfasına gidin

3. **Email adresinizi girin:**
   - Email adresinizi girin
   - "Gönder" butonuna tıklayın

4. **Backend loglarını kontrol edin:**
   ```
   Terminal'de şu mesajları görmelisiniz:
   - "Verification email resent to: your-email@example.com"
   - "✅ Email sent successfully to your-email@example.com"
   ```

5. **Email kutunuzu kontrol edin:**
   - Yeni bir doğrulama email'i görmelisiniz

## Beklenen Davranışlar

### ✅ Başarılı Senaryolar

- **Email gönderimi başarılı:**
  - Backend loglarında `✅ Email sent successfully` mesajı görünür
  - Email kutunuzda email gelir
  - Email'de token/link bulunur

- **Email doğrulama başarılı:**
  - Doğrulama linkine tıkladıktan sonra "E-posta adresiniz başarıyla doğrulandı" mesajı görünür
  - Artık giriş yapabilirsiniz

- **Şifre sıfırlama başarılı:**
  - Token'ı kullanarak şifre sıfırlayabilirsiniz
  - Yeni şifreyle giriş yapabilirsiniz

### ⚠️ Hata Senaryoları

- **Email gönderilemedi:**
  - Backend loglarında `Email send error` mesajı görünür
  - Hata detayları loglanır
  - Email kutunuzda email gelmez

- **Email konfigürasyonu yok:**
  - Backend loglarında `Email not configured` mesajı görünür
  - Development modunda token console'da görünür (email gönderilmez)

## Sorun Giderme

### Email gelmiyor

1. **Backend loglarını kontrol edin:**
   ```bash
   # Backend terminalinde şu mesajları arayın:
   - "Email send error"
   - "Email authentication failed"
   - "Email not configured"
   ```

2. **Email konfigürasyonunu kontrol edin:**
   - `.env` dosyasında `EMAIL_USER` ve `EMAIL_PASS` olduğundan emin olun
   - Gmail kullanıyorsanız App Password kullandığınızdan emin olun

3. **Gmail App Password kontrolü:**
   - [Google Account](https://myaccount.google.com/) → Security → App passwords
   - App Password'un doğru olduğundan emin olun
   - 2-Step Verification'ın aktif olduğundan emin olun

### Token görünmüyor (Development Mode)

Development modunda email gönderilemezse, token backend loglarında görünür:

```
═══════════════════════════════════════════════════════
🔐 ŞİFRE SIFIRLAMA KODU (Development Mode)
═══════════════════════════════════════════════════════
E-posta: your-email@example.com
Token: [token-here]
Reset URL: http://localhost:5173/reset-password?token=[token-here]
═══════════════════════════════════════════════════════
```

Bu token'ı kopyalayıp şifre sıfırlama sayfasında kullanabilirsiniz.

### Backend çalışmıyor

1. **Port 5000'in kullanımda olup olmadığını kontrol edin:**
   ```bash
   netstat -ano | findstr :5000
   ```

2. **MySQL'in çalıştığından emin olun:**
   ```bash
   docker ps --filter "name=obs-mysql"
   ```

3. **Backend'i yeniden başlatın:**
   ```bash
   npm run dev
   ```

### Frontend çalışmıyor

1. **Port 5173'in kullanımda olup olmadığını kontrol edin:**
   ```bash
   netstat -ano | findstr :5173
   ```

2. **Frontend'i yeniden başlatın:**
   ```bash
   npm run dev
   ```

## Test Checklist

Test etmeden önce kontrol edin:

- [ ] Backend çalışıyor (port 5000)
- [ ] Frontend çalışıyor (port 5173)
- [ ] MySQL çalışıyor (Docker container)
- [ ] `.env` dosyasında email ayarları var
- [ ] Gmail App Password doğru (eğer Gmail kullanıyorsanız)
- [ ] Email adresiniz hazır (test için)

Test sonrası kontrol edin:

- [ ] Yeni kullanıcı kaydı yapılabiliyor
- [ ] Doğrulama email'i geliyor
- [ ] Doğrulama linki çalışıyor
- [ ] Şifre sıfırlama email'i geliyor
- [ ] Şifre sıfırlama token'ı çalışıyor
- [ ] Yeni şifreyle giriş yapılabiliyor

## Production'a Deploy Etmeden Önce

Local'de tüm testler başarılı olduktan sonra:

1. **Değişiklikleri commit edin:**
   ```bash
   git add .
   git commit -m "Email doğrulama ve şifre sıfırlama düzeltmeleri"
   git push
   ```

2. **Production'da Secret Manager'da email secret'larını oluşturun:**
   - `PRODUCTION_EMAIL_SETUP.md` dosyasındaki adımları takip edin

3. **Deploy edin:**
   - Cloud Build ile otomatik deploy veya manuel deploy

4. **Production'da test edin:**
   - Production'da da aynı test senaryolarını çalıştırın

