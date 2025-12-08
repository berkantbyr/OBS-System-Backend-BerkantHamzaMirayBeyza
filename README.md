# University OBS Backend API

Üniversite Öğrenci Bilgi Sistemi - Backend API servisi.

## Teknolojiler

- **Node.js** - Runtime
- **Express.js** - Web framework
- **MySQL** - Veritabanı
- **Sequelize** - ORM
- **JWT** - Authentication
- **Docker** - Containerization

## Gereksinimler

- Docker & Docker Compose
- Node.js 18+ (lokal geliştirme için)

## Kurulum

### Docker ile Çalıştırma (Önerilen)

1. `.env` dosyasını oluşturun:
```bash
cp .env.example .env
```

2. `.env` dosyasını düzenleyin ve gerekli değerleri girin.

3. Docker container'larını başlatın:
```bash
docker-compose up -d
```

4. Logları kontrol edin:
```bash
docker-compose logs -f backend
```

### Lokal Geliştirme

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. `.env` dosyasını oluşturun ve yapılandırın:
```bash
cp .env.example .env
```

3. MySQL veritabanını başlatın (Docker ile):
```bash
docker-compose up -d mysql
```

4. Uygulamayı başlatın:
```bash
npm run dev
```

## API Endpoints

### Auth Routes
- `POST /api/v1/auth/register` - Kullanıcı kaydı
- `POST /api/v1/auth/login` - Giriş
- `POST /api/v1/auth/logout` - Çıkış
- `POST /api/v1/auth/refresh-token` - Token yenileme
- `POST /api/v1/auth/forgot-password` - Şifre sıfırlama isteği
- `POST /api/v1/auth/reset-password` - Şifre sıfırlama
- `GET /api/v1/auth/verify-email/:token` - Email doğrulama

### User Routes
- `GET /api/v1/users/profile` - Profil bilgisi
- `PUT /api/v1/users/profile` - Profil güncelleme
- `PUT /api/v1/users/change-password` - Şifre değiştirme
- `POST /api/v1/users/upload-photo` - Profil fotoğrafı yükleme

## Ortam Değişkenleri

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| NODE_ENV | Ortam | development |
| PORT | API portu | 5000 |
| DB_HOST | MySQL host | mysql |
| DB_PORT | MySQL port | 3306 |
| DB_NAME | Veritabanı adı | campus_db |
| DB_USER | Veritabanı kullanıcısı | admin |
| DB_PASSWORD | Veritabanı şifresi | password |
| JWT_SECRET | JWT secret key | - |
| JWT_ACCESS_EXPIRY | Access token süresi | 15m |
| JWT_REFRESH_EXPIRY | Refresh token süresi | 7d |
| FRONTEND_URL | Frontend URL | http://localhost:3000 |

## Testler

```bash
# Tüm testleri çalıştır
npm test

# Watch modunda testleri çalıştır
npm run test:watch
```

## Proje Yapısı

```
backend/
├── src/
│   ├── app.js              # Ana uygulama dosyası
│   ├── config/             # Yapılandırma dosyaları
│   ├── controllers/        # Route controller'ları
│   ├── middleware/         # Express middleware'leri
│   ├── models/             # Sequelize modelleri
│   ├── routes/             # API route'ları
│   ├── services/           # İş mantığı servisleri
│   ├── seeders/            # Veritabanı seed'leri
│   └── utils/              # Yardımcı fonksiyonlar
├── tests/                  # Test dosyaları
├── database/               # SQL dosyaları
├── uploads/                # Yüklenen dosyalar
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Docker Komutları

```bash
# Container'ları başlat
docker-compose up -d

# Container'ları durdur
docker-compose down

# Logları izle
docker-compose logs -f

# Container'a bağlan
docker exec -it obs_backend sh

# Veritabanını sıfırla
docker-compose down -v
docker-compose up -d
```

## Lisans

ISC
