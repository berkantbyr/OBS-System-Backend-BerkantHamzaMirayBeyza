# DKÜ OBS - Deployment Rehberi (DEPLOYMENT_GUIDE.md)

## 1. Gereksinimler

### 1.1 Yazılım Gereksinimleri
| Yazılım | Minimum Versiyon | Önerilen |
|---------|------------------|----------|
| Node.js | 18.x | 20.x LTS |
| npm | 9.x | 10.x |
| PostgreSQL | 14.x | 15.x |
| Docker | 20.x | 24.x |
| Docker Compose | 2.x | 2.20+ |
| Git | 2.x | 2.40+ |

### 1.2 Donanım Gereksinimleri (Production)
| Kaynak | Minimum | Önerilen |
|--------|---------|----------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 20 GB SSD | 50 GB SSD |
| Network | 100 Mbps | 1 Gbps |

---

## 2. Hızlı Başlangıç (Docker)

### 2.1 Tek Komutla Çalıştırma
```bash
# 1. Repository'yi klonla
git clone https://github.com/your-repo/OBS-System-Backend.git
cd OBS-System-Backend

# 2. Environment dosyasını oluştur
cp env.example .env
# .env dosyasını düzenle (aşağıdaki konfigürasyona bak)

# 3. Docker Compose ile başlat
docker-compose up -d

# 4. Veritabanı seed
docker-compose exec backend npm run seed
```

### 2.2 Servisleri Kontrol Et
```bash
# Tüm container'ları görüntüle
docker-compose ps

# Backend loglarını izle
docker-compose logs -f backend

# Veritabanı bağlantısını test et
docker-compose exec backend npm run db:test
```

---

## 3. Environment Değişkenleri

### 3.1 Backend (.env)
```env
# Server
NODE_ENV=production
PORT=5000
API_PREFIX=/api/v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campus_db
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_SSL=true

# JWT
JWT_SECRET=your-very-long-and-secure-jwt-secret-key-at-least-64-chars
JWT_EXPIRES_IN=24h

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=DKÜ OBS <noreply@dku.edu.tr>

# Frontend URL (CORS)
FRONTEND_URL=https://obs.dku.edu.tr

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### 3.2 Frontend (.env)
```env
VITE_API_URL=https://api.obs.dku.edu.tr/api/v1
VITE_WS_URL=wss://api.obs.dku.edu.tr
```

---

## 4. Manuel Kurulum (Development)

### 4.1 Backend Kurulumu
```bash
# 1. Bağımlılıkları yükle
cd backend
npm install

# 2. Veritabanını oluştur
createdb campus_db

# 3. Tabloları oluştur (Sequelize sync)
npm run db:sync

# 4. Seed verilerini yükle
npm run seed

# 5. Geliştirme sunucusunu başlat
npm run dev
```

### 4.2 Frontend Kurulumu
```bash
# 1. Bağımlılıkları yükle
cd frontend
npm install

# 2. Geliştirme sunucusunu başlat
npm run dev

# 3. Production build
npm run build
```

---

## 5. Docker Konfigürasyonu

### 5.1 Dockerfile (Backend)
```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
```

### 5.2 docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: campus_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

## 6. Veritabanı Yönetimi

### 6.1 Migration
```bash
# Migration oluştur
npm run migration:generate -- --name add-new-table

# Migration çalıştır
npm run migration:up

# Migration geri al
npm run migration:down
```

### 6.2 Backup & Restore
```bash
# Backup
pg_dump -h localhost -U postgres -d campus_db > backup.sql

# Restore
psql -h localhost -U postgres -d campus_db < backup.sql

# Docker ile backup
docker-compose exec postgres pg_dump -U postgres campus_db > backup.sql
```

---

## 7. Production Deployment

### 7.1 Google Cloud Run
```bash
# 1. Google Cloud SDK kurulu olmalı
gcloud auth login

# 2. Proje seç
gcloud config set project YOUR_PROJECT_ID

# 3. Deploy
gcloud run deploy obs-backend \
  --source . \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production"
```

### 7.2 CI/CD (Cloud Build)
```yaml
# cloudbuild.yaml
steps:
  # Build
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/obs-backend', '.']
  
  # Push
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/obs-backend']
  
  # Deploy
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'obs-backend'
      - '--image'
      - 'gcr.io/$PROJECT_ID/obs-backend'
      - '--region'
      - 'europe-west1'
```

---

## 8. Health Checks

### 8.1 Backend Health Endpoint
```
GET /api/v1/health

Response:
{
  "status": "healthy",
  "timestamp": "2024-12-24T00:00:00Z",
  "database": "connected",
  "uptime": 3600
}
```

### 8.2 Docker Health Check
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/api/v1/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## 9. Troubleshooting

| Sorun | Çözüm |
|-------|-------|
| DB bağlantı hatası | `DB_HOST` ve `DB_PORT` kontrol et |
| CORS hatası | `FRONTEND_URL` doğru mu kontrol et |
| JWT hatası | `JWT_SECRET` minimum 32 karakter olmalı |
| Port çakışması | `PORT` değişkenini değiştir |
| Permission hatası | `uploads/` klasör izinlerini kontrol et |

---

## 10. Güvenlik Kontrol Listesi

- [ ] `.env` dosyası `.gitignore`'da
- [ ] JWT_SECRET en az 64 karakter
- [ ] HTTPS aktif
- [ ] Rate limiting yapılandırıldı
- [ ] CORS sadece izinli origin'ler
- [ ] Veritabanı şifresi güçlü
- [ ] SSL/TLS sertifikası geçerli
- [ ] Backup sistemi kurulu

---

*Son Güncelleme: 24 Aralık 2024*
