# 🚀 Database Migration Deployment Guide

Bu kılavuz, yapılan tüm değişikliklerin (Menü ve IoT Dashboard) production'a deploy edilmesi için gerekli adımları içerir.

## 📋 İçindekiler

1. [Hızlı Başlangıç](#hızlı-başlangıç)
2. [Migration Dosyaları](#migration-dosyaları)
3. [Deployment Yöntemleri](#deployment-yöntemleri)
4. [Doğrulama](#doğrulama)

## 🎯 Hızlı Başlangıç

### Yöntem 1: Master Migration (ÖNERİLEN)

Tüm tabloları tek seferde oluşturmak için:

```bash
# Node.js script ile (otomatik)
npm run migrate:all

# Veya manuel SQL ile
mysql -h [HOST] -u [USER] -p [DATABASE] < migrations/create_all_tables.sql
```

### Yöntem 2: Google Cloud Console

1. Google Cloud Console'a gidin
2. SQL > Databases > [Instance] > [Database] > Query
3. `migrations/create_all_tables.sql` dosyasının içeriğini kopyalayıp yapıştırın
4. "Run" butonuna basın

## 📁 Migration Dosyaları

### `migrations/create_all_tables.sql` ⭐ (ÖNERİLEN)
- **Açıklama:** Tüm tabloları tek seferde oluşturan master migration
- **İçerik:** 26 tablo (Part 1, 2, 3, 4)
- **Özellikler:**
  - ✅ Idempotent (tekrar çalıştırılabilir)
  - ✅ Tüm foreign key constraint'ler
  - ✅ Performans için index'ler
  - ✅ Meal menüleri için optimize edilmiş tarih alanı
  - ✅ IoT Dashboard için sensor tabloları

### Diğer Migration Dosyaları

- `create_part1_2_tables.sql` - Temel sistem tabloları
- `create_part3_tables.sql` - Yemek servisi, cüzdan, etkinlik
- `create_part4_tables.sql` - Bildirimler ve IoT sensorler
- `create_missing_tables.sql` - Eksik tablolar için

## 🔧 Deployment Yöntemleri

### 1. Node.js Script (Lokal/Development)

```bash
# Tüm tabloları oluştur
npm run migrate:all

# Sadece Part 3 (Meal tabloları)
npm run migrate:part3

# Sadece Part 4 (Sensor tabloları)
npm run migrate:part4

# Özel dosya
npm run migrate -- --file migrations/create_part3_tables.sql
```

### 2. MySQL Client (Production)

```bash
# Master migration
mysql -h [HOST] -u [USER] -p [DATABASE] < migrations/create_all_tables.sql

# Veya belirli bir part
mysql -h [HOST] -u [USER] -p [DATABASE] < migrations/create_part3_tables.sql
```

### 3. Google Cloud SQL Console

1. [Google Cloud Console](https://console.cloud.google.com/) → SQL
2. Instance'ınızı seçin → Databases → [Database] → Query
3. Migration dosyasını açın ve içeriğini kopyalayın
4. Query editörüne yapıştırın ve "Run" butonuna basın

### 4. Cloud SQL Proxy (Lokal)

```bash
# Proxy'yi başlat
cloud_sql_proxy -instances=[PROJECT]:[REGION]:[INSTANCE]=tcp:3306

# Başka terminal'de migration çalıştır
mysql -h 127.0.0.1 -u [USER] -p [DATABASE] < migrations/create_all_tables.sql
```

## ✅ Doğrulama

### Tabloların Oluşturulduğunu Kontrol Edin

```sql
-- Tüm tabloları listele
SHOW TABLES;

-- Toplam tablo sayısı (26 olmalı)
SELECT COUNT(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema = '[DATABASE_NAME]';

-- Meal tablolarını kontrol et
DESCRIBE meal_menus;
DESCRIBE meal_reservations;
DESCRIBE cafeterias;

-- IoT Sensor tablolarını kontrol et
DESCRIBE sensors;
DESCRIBE sensor_data;

-- Index'leri kontrol et
SHOW INDEX FROM meal_menus;
SHOW INDEX FROM sensors;
```

### Önemli Tablolar

Aşağıdaki tabloların var olduğundan emin olun:

- ✅ `meal_menus` - Menü yönetimi için
- ✅ `cafeterias` - Kafeterya bilgileri için
- ✅ `meal_reservations` - Rezervasyon sistemi için
- ✅ `sensors` - IoT Dashboard için
- ✅ `sensor_data` - Sensor verileri için
- ✅ `notifications` - Bildirim sistemi için

## 📊 Tablo Yapıları

### meal_menus Tablosu

```sql
CREATE TABLE meal_menus (
  id CHAR(36) PRIMARY KEY,
  cafeteria_id CHAR(36) NOT NULL,
  date DATE NOT NULL,                    -- Tarih seçimi için optimize
  meal_type VARCHAR(20) NOT NULL,
  items_json JSON,
  nutrition_json JSON,
  price DECIMAL(10, 2) DEFAULT 0,
  meal_time TIME,
  is_published BOOLEAN DEFAULT FALSE,    -- Admin/kullanıcı görünürlüğü için
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE KEY unique_menu (cafeteria_id, date, meal_type),
  INDEX idx_date (date),
  INDEX idx_published (is_published)
);
```

### sensors Tablosu

```sql
CREATE TABLE sensors (
  id CHAR(36) PRIMARY KEY,
  sensor_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  type ENUM('temperature', 'humidity', 'occupancy', 'energy', 'air_quality', 'light'),
  location VARCHAR(255),
  building VARCHAR(100),                   -- IoT Dashboard için
  room VARCHAR(50),                       -- IoT Dashboard için
  status ENUM('active', 'inactive', 'maintenance', 'error'),
  last_reading FLOAT,
  last_reading_at DATETIME,
  ...
);
```

## 🔍 Sorun Giderme

### Hata: "Table already exists"

Bu normaldir! Migration dosyaları `IF NOT EXISTS` kullanır, bu yüzden tablolar zaten varsa hata vermez.

### Hata: "Foreign key constraint fails"

Önce Part 1 & 2 tablolarının oluşturulduğundan emin olun:
```bash
npm run migrate -- --part 1_2
```

### Hata: "JSON type not supported"

MySQL 5.7+ veya MariaDB 10.2+ gerekli. Versiyonunuzu kontrol edin:
```sql
SELECT VERSION();
```

### Tablolar görünmüyor

1. Doğru database'de olduğunuzdan emin olun: `USE [database_name];`
2. Tabloları listeleyin: `SHOW TABLES;`
3. Migration'ı tekrar çalıştırın (idempotent olduğu için güvenli)

## 📝 Notlar

- ✅ Migration'lar idempotent'tir (tekrar çalıştırılabilir)
- ✅ Production'da çalıştırmadan önce test ortamında deneyin
- ✅ Yedek almayı unutmayın
- ✅ `meal_menus.date` alanı DATE tipinde (tarih seçimi için optimize)
- ✅ `meal_menus.is_published` alanı admin/kullanıcı görünürlüğü için
- ✅ Sensor tabloları IoT Dashboard için hazır

## 🎉 Başarılı Deployment Sonrası

Migration'ları çalıştırdıktan sonra:

1. ✅ Backend'i yeniden başlatın
2. ✅ Frontend'i yeniden başlatın
3. ✅ Menü sayfasında tarih seçimi test edin
4. ✅ IoT Dashboard'da sensor verilerini kontrol edin
5. ✅ Admin panelinde menü oluşturma test edin

## 📞 Destek

Sorun yaşarsanız:
1. Migration log'larını kontrol edin
2. Database connection ayarlarını kontrol edin
3. Tablo yapılarını doğrulayın (yukarıdaki SQL komutları ile)

---

**Son Güncelleme:** 2025-12-30
**Versiyon:** 1.0.0

