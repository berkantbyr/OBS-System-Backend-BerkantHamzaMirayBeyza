# 🚀 Production Deploy Checklist

## Sorun
Production'da courses endpoint'i **401 Unauthorized** hatası veriyor çünkü backend henüz güncellenmemiş.

## Yapılan Değişiklikler
✅ Courses endpoint'i tamamen public yapıldı (authentication gerektirmiyor)
✅ Departments endpoint'i zaten public
✅ Route'lar doğru sıralandı (`/departments` → `/` → `/:id`)

## Deploy Adımları

### 1. Değişiklikleri Commit Edin
```bash
cd OBS-System-Backend-BerkantHamzaMirayBeyza
git add src/routes/courseRoutes.js
git commit -m "feat: Make courses endpoint public for catalog browsing"
git push
```

### 2. Cloud Build ile Deploy
```bash
# Google Cloud Build'i tetikle
gcloud builds submit --config cloudbuild.yaml
```

### 3. Veya Manuel Docker Build & Deploy
```bash
# Build
docker build -t gcr.io/PROJECT_ID/obs-api:latest .

# Push
docker push gcr.io/PROJECT_ID/obs-api:latest

# Deploy to Cloud Run
gcloud run deploy obs-api \
  --image gcr.io/PROJECT_ID/obs-api:latest \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --port 5000
```

### 4. Deploy Sonrası Test
```bash
# Health check
curl https://obs-api-214391529742.europe-west1.run.app/api/v1/health

# Courses endpoint (public - no auth required)
curl https://obs-api-214391529742.europe-west1.run.app/api/v1/courses?limit=1

# Departments endpoint
curl https://obs-api-214391529742.europe-west1.run.app/api/v1/courses/departments
```

## Beklenen Sonuç
- ✅ Health check: 200 OK
- ✅ Courses endpoint: 200 OK (401 değil!)
- ✅ Departments endpoint: 200 OK

## Not
Deploy sonrası frontend'i yeniden build etmenize gerek yok, sadece backend'i deploy etmeniz yeterli.

