# Giriş Sorunları - Sorun Giderme Rehberi

## Hızlı Çözüm Adımları

### 1. Backend'in Çalışıp Çalışmadığını Kontrol Edin

Backend'in çalışıp çalışmadığını kontrol etmek için:

```bash
# Backend klasörüne gidin
cd OBS-System-Backend-BerkantHamzaMirayBeyza

# Backend'i başlatın
npm run dev
```

Backend başarıyla çalışıyorsa şu mesajı görmelisiniz:
```
✅ Database connection established
🚀 Server running on port 5000
```

### 2. Veritabanı Bağlantısını Kontrol Edin

`.env` dosyasının var olduğundan ve doğru ayarlara sahip olduğundan emin olun:

```bash
# .env dosyası oluşturun (eğer yoksa)
cp env.example .env
```

`.env` dosyasında şu ayarlar olmalı:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=campus_db
DB_USER=admin
DB_PASSWORD=securepassword123
```

### 3. Superadmin Kullanıcısını Oluşturun

Backend çalışıyorken, yeni bir terminal açın ve:

```bash
cd OBS-System-Backend-BerkantHamzaMirayBeyza
node scripts/create-superadmin.js
```

Bu script `superadmin@test.com` kullanıcısını oluşturur veya varsa şifresini günceller.

### 4. Seed Dosyasını Çalıştırın (Alternatif)

Eğer tüm test kullanıcılarını oluşturmak istiyorsanız:

```bash
cd OBS-System-Backend-BerkantHamzaMirayBeyza
node src/seeders/seedPart2Data.js
```

Bu script şu kullanıcıları oluşturur:
- Super Admin: `superadmin@test.com` / `Admin123!`
- Admin: `admin@university.edu.tr` / `Test123!`

## Yaygın Hatalar ve Çözümleri

### Hata: "Backend sunucusuna bağlanılamadı"
**Çözüm:** Backend'in çalıştığından emin olun (port 5000)

### Hata: "Veritabanı bağlantı hatası"
**Çözüm:** 
1. MySQL/MariaDB servisinin çalıştığından emin olun
2. `.env` dosyasındaki veritabanı ayarlarını kontrol edin
3. Veritabanının var olduğundan emin olun

### Hata: "E-posta veya şifre hatalı"
**Çözüm:**
1. Kullanıcının veritabanında var olduğundan emin olun
2. `create-superadmin.js` script'ini çalıştırın
3. Doğru email ve şifre kullandığınızdan emin olun:
   - Email: `superadmin@test.com`
   - Şifre: `Admin123!`

## Test Etme

Backend'in çalışıp çalışmadığını test etmek için:

```bash
# Health check endpoint'ini test edin
curl http://localhost:5000/api/v1/health
```

Başarılı yanıt:
```json
{
  "success": true,
  "message": "API is running",
  "version": "4.0.0"
}
```

## Giriş Bilgileri

Script'leri çalıştırdıktan sonra şu bilgilerle giriş yapabilirsiniz:

- **Email:** `superadmin@test.com`
- **Şifre:** `Admin123!`

Veya:

- **Email:** `admin@university.edu.tr`
- **Şifre:** `Test123!`

