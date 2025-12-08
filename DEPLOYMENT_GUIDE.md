# 🚀 Google Cloud Deployment Rehberi

Bu rehber, OBS Backend API'sini Docker ile paketleyip Google Cloud'a deploy etme adımlarını içerir.

---

## 📋 İçindekiler

1. [Ön Gereksinimler](#1-ön-gereksinimler)
2. [Google Cloud Hesap Kurulumu](#2-google-cloud-hesap-kurulumu)
3. [Veritabanı Kurulumu (Cloud SQL)](#3-veritabanı-kurulumu-cloud-sql)
4. [Docker Image Oluşturma](#4-docker-image-oluşturma)
5. [Cloud Run'a Deploy Etme](#5-cloud-runa-deploy-etme)
6. [Environment Variables Ayarlama](#6-environment-variables-ayarlama)
7. [Domain ve SSL Ayarlama](#7-domain-ve-ssl-ayarlama)
8. [CI/CD Pipeline Kurulumu](#8-cicd-pipeline-kurulumu)

---

## 1. Ön Gereksinimler

### Yerel Bilgisayarınızda Kurulu Olması Gerekenler:

```bash
# Docker Desktop (Windows/Mac)
# https://www.docker.com/products/docker-desktop adresinden indirin

# Google Cloud SDK
# https://cloud.google.com/sdk/docs/install adresinden indirin

# Docker'ın kurulu olduğunu kontrol edin
docker --version

# Google Cloud SDK'nın kurulu olduğunu kontrol edin
gcloud --version
```

---

## 2. Google Cloud Hesap Kurulumu

### Adım 2.1: Google Cloud Console'a Giriş
1. [Google Cloud Console](https://console.cloud.google.com/) adresine gidin
2. Google hesabınızla giriş yapın
3. Ücretsiz deneme için $300 kredi alabilirsiniz (ilk kullanıcılar için)

### Adım 2.2: Yeni Proje Oluşturma
```bash
# Terminal'de Google Cloud'a giriş yapın
gcloud auth login

# Yeni proje oluşturun (proje-id benzersiz olmalı)
gcloud projects create obs-backend-proje --name="OBS Backend"

# Projeyi aktif olarak ayarlayın
gcloud config set project obs-backend-proje

# Faturalandırmayı etkinleştirin (Console'dan yapılması gerekebilir)
# https://console.cloud.google.com/billing
```

### Adım 2.3: Gerekli API'leri Etkinleştirme
```bash
# Cloud Run API'sini etkinleştirin
gcloud services enable run.googleapis.com

# Container Registry API'sini etkinleştirin
gcloud services enable containerregistry.googleapis.com

# Cloud Build API'sini etkinleştirin
gcloud services enable cloudbuild.googleapis.com

# Cloud SQL Admin API'sini etkinleştirin
gcloud services enable sqladmin.googleapis.com

# Secret Manager API'sini etkinleştirin
gcloud services enable secretmanager.googleapis.com
```

---

## 3. Veritabanı Kurulumu (Cloud SQL)

### Adım 3.1: Cloud SQL MySQL Instance Oluşturma

```bash
# MySQL instance oluşturun (bu işlem 5-10 dakika sürebilir)
gcloud sql instances create obs-mysql \
    --database-version=MYSQL_8_0 \
    --tier=db-f1-micro \
    --region=europe-west1 \
    --root-password=GucluSifre123! \
    --storage-type=SSD \
    --storage-size=10GB \
    --availability-type=zonal
```

### Adım 3.2: Veritabanı ve Kullanıcı Oluşturma

```bash
# Veritabanı oluşturun
gcloud sql databases create campus_db --instance=obs-mysql

# Uygulama kullanıcısı oluşturun
gcloud sql users create obs_user \
    --instance=obs-mysql \
    --password=AppSifre456!
```

### Adım 3.3: Connection Name'i Kaydedin
```bash
# Connection name'i alın (Cloud Run bağlantısı için gerekli)
gcloud sql instances describe obs-mysql --format="value(connectionName)"
# Çıktı örneği: obs-backend-proje:europe-west1:obs-mysql
```

---

## 4. Docker Image Oluşturma

### Adım 4.1: Lokalde Test Etme (Opsiyonel)

```bash
# Proje dizinine gidin
cd "c:\Users\berka\OneDrive\Desktop\OBS-System-Backend-BerkantHamzaMirayBeyza"

# Docker image'ı oluşturun
docker build -t obs-api:latest .

# Lokalde test edin (sadece API, veritabanı olmadan)
docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=3306 \
  -e DB_NAME=campus_db \
  -e DB_USER=admin \
  -e DB_PASSWORD=password \
  -e JWT_SECRET=test-secret \
  obs-api:latest
```

### Adım 4.2: Docker Compose ile Tam Test (Veritabanı Dahil)

```bash
# Tüm servisleri başlatın
docker-compose up -d

# Logları kontrol edin
docker-compose logs -f api

# Test ettikten sonra durdurun
docker-compose down
```

### Adım 4.3: Google Container Registry'ye Push Etme

```bash
# Docker'ı Google Cloud ile yapılandırın
gcloud auth configure-docker

# Image'ı Google Container Registry için etiketleyin
docker tag obs-api:latest gcr.io/obs-backend-proje/obs-api:latest

# Image'ı push edin
docker push gcr.io/obs-backend-proje/obs-api:latest
```

**Alternatif: Cloud Build ile Otomatik Build**
```bash
# Cloud Build ile build edin (daha hızlı, Google sunucularında)
gcloud builds submit --tag gcr.io/obs-backend-proje/obs-api:latest
```

---

## 5. Cloud Run'a Deploy Etme

### Adım 5.1: İlk Deployment

```bash
# Cloud Run'a deploy edin
gcloud run deploy obs-api \
    --image gcr.io/obs-backend-proje/obs-api:latest \
    --platform managed \
    --region europe-west1 \
    --allow-unauthenticated \
    --port 5000 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --add-cloudsql-instances obs-backend-proje:europe-west1:obs-mysql \
    --set-env-vars "NODE_ENV=production" \
    --set-env-vars "PORT=5000" \
    --set-env-vars "DB_HOST=/cloudsql/obs-backend-proje:europe-west1:obs-mysql" \
    --set-env-vars "DB_PORT=3306" \
    --set-env-vars "DB_NAME=campus_db" \
    --set-env-vars "DB_USER=obs_user" \
    --set-env-vars "DB_PASSWORD=AppSifre456!" \
    --set-env-vars "JWT_SECRET=cok-guclu-jwt-secret-degistir-bunu" \
    --set-env-vars "JWT_EXPIRES_IN=7d"
```

### Adım 5.2: Deployment URL'ini Alın
```bash
# Servis URL'ini görüntüleyin
gcloud run services describe obs-api --region europe-west1 --format="value(status.url)"
# Çıktı örneği: https://obs-api-abc123-ew.a.run.app
```

---

## 6. Environment Variables Ayarlama

### Secret Manager ile Hassas Bilgileri Saklama (Önerilen)

```bash
# JWT Secret oluşturun
echo -n "cok-guclu-jwt-secret-uretilen" | gcloud secrets create jwt-secret --data-file=-

# DB Password oluşturun
echo -n "AppSifre456!" | gcloud secrets create db-password --data-file=-

# Email Password oluşturun
echo -n "email-app-password" | gcloud secrets create email-password --data-file=-

# Cloud Run servis hesabına secret erişimi verin
gcloud secrets add-iam-policy-binding jwt-secret \
    --member="serviceAccount:obs-backend-proje@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding db-password \
    --member="serviceAccount:obs-backend-proje@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### Secret'ları Cloud Run'a Bağlama

```bash
gcloud run services update obs-api \
    --region europe-west1 \
    --update-secrets=JWT_SECRET=jwt-secret:latest \
    --update-secrets=DB_PASSWORD=db-password:latest
```

---

## 7. Domain ve SSL Ayarlama

### Adım 7.1: Custom Domain Ekleme (Opsiyonel)

```bash
# Domain mapping ekleyin
gcloud run domain-mappings create \
    --service obs-api \
    --domain api.sizindomain.com \
    --region europe-west1
```

### Adım 7.2: DNS Ayarları
- Domain sağlayıcınızda (GoDaddy, Namecheap vb.) CNAME kaydı ekleyin
- Google'ın verdiği değerleri DNS'e ekleyin
- SSL sertifikası otomatik olarak sağlanır

---

## 8. CI/CD Pipeline Kurulumu

### GitHub ile Otomatik Deploy

1. **Cloud Build'i GitHub'a Bağlayın:**
   - [Cloud Build Console](https://console.cloud.google.com/cloud-build/triggers)'a gidin
   - "Connect Repository" butonuna tıklayın
   - GitHub'ı seçin ve repo'nuzu bağlayın

2. **Trigger Oluşturun:**
```bash
gcloud builds triggers create github \
    --repo-name=OBS-System-Backend-BerkantHamzaMirayBeyza \
    --repo-owner=YOUR_GITHUB_USERNAME \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml
```

3. **Her `main` branch'e push'ta otomatik deploy olacak!**

---

## 🔧 Faydalı Komutlar

### Logları Görüntüleme
```bash
# Cloud Run loglarını görüntüle
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=obs-api" --limit=50

# Canlı log takibi
gcloud beta run services logs tail obs-api --region europe-west1
```

### Servis Durumu
```bash
# Servis bilgilerini görüntüle
gcloud run services describe obs-api --region europe-west1

# Revision listesi
gcloud run revisions list --service obs-api --region europe-west1
```

### Güncelleme ve Rollback
```bash
# Yeni versiyon deploy et
gcloud run deploy obs-api --image gcr.io/obs-backend-proje/obs-api:v2 --region europe-west1

# Önceki versiyona rollback
gcloud run services update-traffic obs-api \
    --region europe-west1 \
    --to-revisions=obs-api-00001-abc=100
```

### Servis Silme
```bash
# Cloud Run servisini sil
gcloud run services delete obs-api --region europe-west1

# Cloud SQL instance'ı sil (DİKKAT: Tüm veriler silinir!)
gcloud sql instances delete obs-mysql
```

---

## 💰 Maliyet Tahmini

| Servis | Fiyat (Aylık Tahmini) |
|--------|----------------------|
| Cloud Run | $0-10 (kullanıma göre, az trafik ücretsiz) |
| Cloud SQL (db-f1-micro) | ~$10-15 |
| Container Registry | ~$1-2 |
| **Toplam** | **~$15-30/ay** |

> 💡 **İpucu:** İlk 90 gün $300 ücretsiz kredi kullanabilirsiniz!

---

## ⚠️ Önemli Güvenlik Notları

1. **Şifreleri asla kod içinde bırakmayın** - Secret Manager kullanın
2. **CORS ayarlarını production için güncelleyin** - `src/app.js` dosyasında `allowedOrigins`'i güncelleyin
3. **Veritabanı şifrelerini güçlü tutun** - En az 16 karakter, özel karakterler
4. **SSL/HTTPS kullanın** - Cloud Run otomatik sağlar
5. **Rate limiting ekleyin** - DDoS koruması için

---

## 🆘 Sık Karşılaşılan Sorunlar

### 1. "Cloud SQL connection failed"
- Cloud SQL instance'ın çalıştığından emin olun
- Connection name'in doğru olduğunu kontrol edin
- `--add-cloudsql-instances` parametresini eklediğinizden emin olun

### 2. "Permission denied"
```bash
# Gerekli rolleri ekleyin
gcloud projects add-iam-policy-binding obs-backend-proje \
    --member="serviceAccount:obs-backend-proje@appspot.gserviceaccount.com" \
    --role="roles/cloudsql.client"
```

### 3. "Container failed to start"
- Logları kontrol edin: `gcloud logging read ...`
- Port'un 5000 olarak ayarlandığından emin olun
- Environment variable'ların doğru ayarlandığını kontrol edin

---

## ✅ Deployment Checklist

- [ ] Google Cloud hesabı oluşturuldu
- [ ] Proje oluşturuldu ve faturalandırma etkinleştirildi
- [ ] Gerekli API'ler etkinleştirildi
- [ ] Cloud SQL MySQL instance oluşturuldu
- [ ] Veritabanı ve kullanıcı oluşturuldu
- [ ] Docker image build edildi
- [ ] Image Container Registry'ye push edildi
- [ ] Cloud Run'a deploy edildi
- [ ] Environment variables ayarlandı
- [ ] API test edildi
- [ ] CI/CD pipeline kuruldu (opsiyonel)
- [ ] Custom domain eklendi (opsiyonel)

---

**Tebrikler! 🎉** API'niz artık Google Cloud'da canlı!
