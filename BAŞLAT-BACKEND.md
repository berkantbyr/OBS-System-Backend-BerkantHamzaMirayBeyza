# Backend Başlatma Rehberi

## Hızlı Başlatma

### Adım 1: .env Dosyasını Kontrol Edin
Backend klasöründe `.env` dosyası olmalı. Yoksa:
```bash
copy env.example .env
```

### Adım 2: Veritabanı Ayarlarını Kontrol Edin
`.env` dosyasında veritabanı ayarlarınızı kontrol edin:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=campus_db
DB_USER=admin
DB_PASSWORD=securepassword123
```

### Adım 3: Backend'i Başlatın

**Yöntem 1: npm run dev (Önerilen)**
```bash
cd OBS-System-Backend-BerkantHamzaMirayBeyza
npm run dev
```

**Yöntem 2: npm start**
```bash
cd OBS-System-Backend-BerkantHamzaMirayBeyza
npm start
```

### Adım 4: Başarı Kontrolü
Backend başarıyla çalışıyorsa şu mesajları görmelisiniz:
```
✅ Database connection established
🚀 Server running on port 5000
📍 API: http://localhost:5000/api/v1
```

## Sorun Giderme

### Port 5000 Kullanımda
Eğer port 5000 kullanımdaysa:
```bash
npm run kill-port
```
Sonra tekrar başlatın.

### Veritabanı Bağlantı Hatası
1. MySQL/MariaDB servisinin çalıştığından emin olun
2. `.env` dosyasındaki veritabanı bilgilerini kontrol edin
3. Veritabanının var olduğundan emin olun

### Node Modules Eksik
```bash
npm install
```

## Notlar

- Backend çalışırken terminal penceresini kapatmayın
- Backend'i durdurmak için `Ctrl+C` kullanın
- Backend çalışmazsa frontend'e bağlanamaz ve giriş/kayıt yapılamaz

