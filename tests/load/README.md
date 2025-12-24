# k6 Load Testing

Bu klasör, API performans testleri için k6 load testing scriptlerini içerir.

## Kurulum

```bash
# macOS
brew install k6

# Windows (chocolatey)
choco install k6

# Windows (winget)
winget install k6
```

## Testleri Çalıştırma

```bash
# Temel test
k6 run tests/load/load-test.js

# Parametrelerle
k6 run tests/load/load-test.js -e BASE_URL=http://localhost:3000 -e TEST_EMAIL=admin@test.com -e TEST_PASSWORD=admin123

# Cloud ortamı için
k6 run tests/load/load-test.js -e ENVIRONMENT=production -e BASE_URL=https://api.example.com
```

## Test Senaryoları

1. **Login Flow** - Kullanıcı girişi
2. **Dashboard API** - Dashboard verilerini çekme
3. **Courses API** - Ders listesi
4. **Analytics API** - Admin analytics (opsiyonel)
5. **Notifications API** - Bildirim listesi

## Performans Hedefleri

- **p95 < 500ms** - %95 istek 500ms altında
- **p99 < 1000ms** - %99 istek 1 saniye altında
- **Error Rate < 1%** - Hata oranı %1 altında

## Raporlama

```bash
# HTML rapor
k6 run tests/load/load-test.js --out json=results.json

# InfluxDB'ye gönder (Grafana için)
k6 run tests/load/load-test.js --out influxdb=http://localhost:8086/k6
```
