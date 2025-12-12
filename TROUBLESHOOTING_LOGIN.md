# Giriş Hatalarını Giderme Rehberi

Bu rehber, giriş yaparken karşılaşılan hataları tespit etmek ve çözmek için hazırlanmıştır.

## 🔍 Hızlı Kontrol Listesi

### 1. Backend Sunucusu Çalışıyor mu?

**Kontrol:**
```bash
# Backend dizinine gidin
cd OBS-System-Backend-BerkantHamzaMirayBeyza

# Backend'in çalıştığını kontrol edin
# Terminal'de şu mesajı görmelisiniz:
# "Server is running on 0.0.0.0:5000"
# "Database connection established successfully"
```

**Çözüm:**
- Backend çalışmıyorsa:
  ```bash
  npm run dev
  ```
- Port 5000 kullanımda hatası alıyorsanız, başka bir uygulama portu kullanıyor olabilir.

### 2. Veritabanı Bağlantısı

**Kontrol:**
Backend loglarında şu mesajı görmelisiniz:
```
✅ Database connection established successfully
```

**Çözüm:**
- `.env` dosyasını kontrol edin:
  ```env
  DB_HOST=localhost
  DB_PORT=3306
  DB_NAME=campus_db
  DB_USER=admin
  DB_PASSWORD=password
  ```
- MySQL/MariaDB servisinin çalıştığından emin olun
- Docker kullanıyorsanız:
  ```bash
  docker-compose up -d
  ```

### 3. Frontend-Backend Bağlantısı

**Kontrol:**
- Browser console'da (F12) şu logları kontrol edin:
  ```
  🔗 API URL: /api/v1
  📤 Request: POST /api/v1/auth/login
  ```

**Hata Mesajları:**
- `Network Error` veya `Connection refused`: Backend çalışmıyor
- `CORS policy violation`: CORS ayarları yanlış
- `404 Not Found`: API endpoint yanlış

**Çözüm:**
- Backend'in `http://localhost:5000` adresinde çalıştığından emin olun
- Vite proxy ayarlarını kontrol edin (`vite.config.js`)

### 4. Kullanıcı ve Şifre Kontrolü

**Kontrol:**
- Kullanıcının veritabanında kayıtlı olduğundan emin olun
- Şifrenin doğru olduğundan emin olun

**Test:**
```sql
-- MySQL'de kullanıcıyı kontrol edin
SELECT id, email, role, is_active, is_verified 
FROM users 
WHERE LOWER(email) = LOWER('nuran.ergenc@university.edu');
```

**Çözüm:**
- Kullanıcı yoksa kayıt olun
- Şifre yanlışsa şifre sıfırlama özelliğini kullanın

## 🐛 Yaygın Hata Senaryoları

### Senaryo 1: "Giriş yapılırken bir hata oluştu" (Genel Hata)

**Olası Nedenler:**
1. Backend sunucusu çalışmıyor
2. Veritabanı bağlantı hatası
3. Network/CORS hatası

**Çözüm:**
1. Backend loglarını kontrol edin
2. Browser console'daki hata mesajlarını inceleyin
3. Network tab'ında isteğin durumunu kontrol edin

### Senaryo 2: "E-posta veya şifre hatalı"

**Olası Nedenler:**
1. Kullanıcı veritabanında yok
2. Şifre yanlış
3. E-posta adresi yanlış yazılmış

**Çözüm:**
1. E-posta adresini kontrol edin (büyük/küçük harf duyarlı değil)
2. Şifreyi doğru yazdığınızdan emin olun
3. Veritabanında kullanıcının varlığını kontrol edin

### Senaryo 3: "Veritabanı bağlantı hatası"

**Olası Nedenler:**
1. MySQL servisi çalışmıyor
2. `.env` dosyasındaki veritabanı bilgileri yanlış
3. Veritabanı erişim izinleri yanlış

**Çözüm:**
1. MySQL servisini başlatın
2. `.env` dosyasını kontrol edin
3. Veritabanı kullanıcısının yetkilerini kontrol edin

### Senaryo 4: Network Error / Connection Refused

**Olası Nedenler:**
1. Backend sunucusu çalışmıyor
2. Port 5000 başka bir uygulama tarafından kullanılıyor
3. Firewall portu engelliyor

**Çözüm:**
1. Backend'i başlatın: `npm run dev`
2. Port 5000'in kullanımda olup olmadığını kontrol edin
3. Firewall ayarlarını kontrol edin

## 📋 Debug Adımları

### 1. Backend Loglarını İnceleyin

Backend terminalinde şu logları arayın:
```
🔐 Login attempt for: [email]
✅ User found: [user-id] ([email])
🔍 Comparing password...
✅ Password verified successfully
```

Hata durumunda:
```
❌ User not found: [email]
❌ Password comparison failed
❌ Database connection error
```

### 2. Browser Console'u Kontrol Edin

F12 tuşuna basın ve Console tab'ını açın. Şu logları arayın:
```
🔐 AuthService: Login attempt for: [email]
🔗 AuthService: API URL: /api/v1
📤 Request: POST /api/v1/auth/login
```

### 3. Network Tab'ını Kontrol Edin

F12 > Network tab'ında:
- `/api/v1/auth/login` isteğini bulun
- Status code'u kontrol edin:
  - `200`: Başarılı
  - `400`: Doğrulama hatası
  - `401`: Yetkilendirme hatası
  - `500`: Sunucu hatası
  - `0` veya `ERR_*`: Bağlantı hatası

### 4. Veritabanını Kontrol Edin

```sql
-- Kullanıcıyı bulun
SELECT * FROM users WHERE LOWER(email) = LOWER('nuran.ergenc@university.edu');

-- Şifre hash'inin varlığını kontrol edin
SELECT id, email, LENGTH(password_hash) as hash_length 
FROM users 
WHERE LOWER(email) = LOWER('nuran.ergenc@university.edu');
```

## 🔧 Hızlı Çözümler

### Backend'i Yeniden Başlatma
```bash
cd OBS-System-Backend-BerkantHamzaMirayBeyza
# Ctrl+C ile durdurun
npm run dev
```

### Frontend'i Yeniden Başlatma
```bash
cd OBS-System-Frontend-BerkantHamzaMirayBeyza
# Ctrl+C ile durdurun
npm run dev
```

### Veritabanını Kontrol Etme
```bash
# Docker kullanıyorsanız
docker-compose ps
docker-compose logs db

# MySQL'e bağlanma
mysql -u admin -p -h localhost -P 3306 campus_db
```

## 📞 Daha Fazla Yardım

Eğer sorun devam ediyorsa:
1. Backend loglarının tamamını kaydedin
2. Browser console'daki tüm hata mesajlarını kaydedin
3. Network tab'ındaki istek/yanıt detaylarını kaydedin
4. `.env` dosyasındaki hassas bilgileri gizleyerek yapılandırmayı paylaşın

## ✅ Başarılı Giriş İşaretleri

Giriş başarılı olduğunda şunları görmelisiniz:

**Backend:**
```
✅ Login successful for: [email]
```

**Frontend Console:**
```
✅ AuthService: Login response: {success: true, ...}
✅ AuthContext: User authenticated successfully
✅ LoginPage: Login successful, navigating...
```

**Browser:**
- Dashboard sayfasına yönlendirme
- "Giriş başarılı!" toast mesajı

