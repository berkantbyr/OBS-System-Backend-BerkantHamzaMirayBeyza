# Database Migrations

Bu klasorde veritabani guncellemeleri icin SQL scriptleri bulunmaktadir.

## 🚀 Master Migration (ÖNERİLEN)

### create_all_tables.sql
**Tüm tabloları tek seferde oluşturan master migration dosyası**

Bu dosya tüm sistem tablolarını (Part 1, 2, 3, 4) içerir ve deploy edildiğinde herkes tarafından kullanılabilir.

**Kullanım:**
```bash
# Production'da çalıştırma (ÖNERİLEN)
mysql -h [HOST] -u [USER] -p [DATABASE] < migrations/create_all_tables.sql
```

**İçerik:**
- Part 1 & 2: Temel sistem ve akademik yönetim (11 tablo)
- Part 3: Yemek servisi, cüzdan, etkinlik (11 tablo)
- Part 4: Bildirimler ve IoT sensorler (4 tablo)
- **Toplam: 26 tablo**

**Özellikler:**
- ✅ Idempotent (IF NOT EXISTS kullanımı - tekrar çalıştırılabilir)
- ✅ Tüm foreign key constraint'ler tanımlı
- ✅ Performans için index'ler eklenmiş
- ✅ Meal menüleri için `date` alanı DATE tipinde (tarih seçimi için optimize)
- ✅ Sensor tabloları IoT Dashboard için hazır

## Part 1 & 2 Tablolari

### create_part1_2_tables.sql
Temel sistem tablolari (Kullanici, Ogrenci, Akademisyen) ve akademik yonetim (Dersler, Bolumler) tablolari.

**Tablolar:**
1. `departments`
2. `users`
3. `students`
4. `faculty`
5. `classrooms`
6. `courses`
7. `course_sections`
8. `enrollments`
9. `course_prerequisites`
10. `refresh_tokens`, `password_resets`, `email_verifications`

## Part 3 Tablolari

### create_part3_tables.sql
Part 3 (Yemek Servisi, Cuzdan, Etkinlik ve Programlama) icin gerekli tum tablolari olusturur:

**Tablolar:**
1. `cafeterias` - Kafeterya bilgileri
2. `meal_menus` - Yemek menuleri (date: DATE, is_published: BOOLEAN)
3. `meal_reservations` - Yemek rezervasyonlari (transfer alanlari dahil)
4. `wallets` - Kullanici cuzdanlari
5. `transactions` - Cuzdan islemleri
6. `events` - Etkinlikler
7. `event_registrations` - Etkinlik kayitlari (waitlist destekli)
8. `schedules` - Ders programlari
9. `reservations` - Derslik rezervasyonlari
10. `academic_calendar` - Akademik takvim
11. `announcements` - Duyurular

**Onemli Notlar:**
- `meal_menus` tablosunda `date` alanı DATE tipinde (tarih seçimi için optimize edilmiş)
- `meal_menus` tablosunda `is_published` alanı var (admin tüm menüleri, kullanıcılar sadece yayınlanmış menüleri görür)
- `meal_reservations` tablosunda transfer alanlari zaten dahil edilmistir
- Tum foreign key constraint'ler tanimlanmistir
- Index'ler performans icin eklenmistir

## Part 4 Tablolari

### create_part4_tables.sql
Part 4 (Bildirimler, Sensorler ve IoT) icin gerekli tablolari olusturur:

**Tablolar:**
1. `notification_preferences` - Kullanici bildirim tercihler
2. `notifications` - Sistem bildirimleri
3. `sensors` - IoT sensorleri (IoT Dashboard için)
4. `sensor_data` - Sensor verileri (IoT Dashboard için)

**Onemli Notlar:**
- `read` kolonu `notifications` tablosunda backtick ile kullanilmistir
- Sensor tipleri ve durumu ENUM olarak tanimlanmistir
- `sensors` tablosunda `building` ve `room` alanları var (IoT Dashboard'da görüntüleme için)
- `sensor_data` tablosunda `timestamp` alanı var (zaman serisi verileri için)

## Google Cloud SQL'de Calistirma

### Yontem 1: Google Cloud Console SQL Editor (En Kolay - ÖNERİLEN)

1. Google Cloud Console'a gidin: https://console.cloud.google.com/
2. SQL > Databases > [Veritabani instance adiniz] > Databases > [campus_db] > Query
3. `create_all_tables.sql` dosyasinin icerigini kopyalayip yapistirin (VEYA tek tek part dosyalarını)
4. "Run" butonuna basin
5. Basarili mesajini kontrol edin

**Not:** `create_all_tables.sql` dosyasını kullanarak tüm tabloları tek seferde oluşturabilirsiniz.

### Yontem 2: gcloud CLI ile

```bash
# Cloud SQL instance'a baglan
gcloud sql connect [INSTANCE_NAME] --user=[DB_USER] --database=campus_db

# SQL scriptini calistir
source migrations/create_part3_tables.sql
```

### Yontem 3: Cloud SQL Proxy ile (Lokal)

```bash
# Cloud SQL Proxy'yi baslat
cloud_sql_proxy -instances=[PROJECT_ID]:[REGION]:[INSTANCE_NAME]=tcp:3306

# Baska bir terminal'de MySQL client ile baglan
mysql -h 127.0.0.1 -u [DB_USER] -p campus_db < migrations/create_part3_tables.sql
```

### Yontem 4: MySQL Client ile Direkt Baglanti

```bash
mysql -h [CLOUD_SQL_IP] -u [DB_USER] -p campus_db < migrations/create_part3_tables.sql
```

## Kontrol

Migration'i calistirdiktan sonra tablolarin olustugunu kontrol edin:

```sql
SHOW TABLES;

-- Toplam tablo sayısını kontrol edin (26 tablo olmalı)
SELECT COUNT(*) as total_tables FROM information_schema.tables 
WHERE table_schema = 'campus_db';

-- Meal tablolarını kontrol edin
DESCRIBE meal_menus;
DESCRIBE meal_reservations;
DESCRIBE cafeterias;

-- IoT Sensor tablolarını kontrol edin
DESCRIBE sensors;
DESCRIBE sensor_data;

-- Index'leri kontrol edin
SHOW INDEX FROM meal_menus;
SHOW INDEX FROM sensors;
```

## Notlar

- Migration'lar idempotent olacak sekilde yazilmistir (IF NOT EXISTS kullanimi)
- Production'da calistirmadan once test ortaminda mutlaka deneyin
- Yedek almayi unutmayin
- UUID alanlar MySQL'de CHAR(36) olarak saklanir
- JSON alanlar MySQL 5.7+ ve MariaDB 10.2+ destekler

## Sorun Giderme

Eger hata alirsaniz:

1. Foreign key constraint hatalari: Once `users` ve `classrooms` tablolarinin var oldugundan emin olun
2. JSON tipi desteklenmiyor: MySQL versiyonunuzu kontrol edin (5.7+ gerekli)
3. Duplicate key hatasi: Tablolar zaten olusturulmus olabilir, `SHOW TABLES;` ile kontrol edin
