# Database Migrations

Bu klasorde veritabani guncellemeleri icin SQL scriptleri bulunmaktadir.

## Part 3 Tablolari

### create_part3_tables.sql
Part 3 (Yemek Servisi, Cuzdan, Etkinlik ve Programlama) icin gerekli tum tablolari olusturur:

**Tablolar:**
1. `cafeterias` - Kafeterya bilgileri
2. `meal_menus` - Yemek menuleri
3. `meal_reservations` - Yemek rezervasyonlari (transfer alanlari dahil)
4. `wallets` - Kullanici cuzdanlari
5. `transactions` - Cuzdan islemleri
6. `events` - Etkinlikler
7. `event_registrations` - Etkinlik kayitlari (waitlist destekli)
8. `schedules` - Ders programlari
9. `reservations` - Derslik rezervasyonlari

**Onemli Notlar:**
- `meal_reservations` tablosunda transfer alanlari zaten dahil edilmistir
- Tum foreign key constraint'ler tanimlanmistir
- Index'ler performans icin eklenmistir

## Google Cloud SQL'de Calistirma

### Yontem 1: Google Cloud Console SQL Editor (En Kolay)

1. Google Cloud Console'a gidin: https://console.cloud.google.com/
2. SQL > Databases > [Veritabani instance adiniz] > Databases > [campus_db] > Query
3. `create_part3_tables.sql` dosyasinin icerigini kopyalayip yapistirin
4. "Run" butonuna basin
5. Basarili mesajini kontrol edin

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

-- Veya spesifik tablolari kontrol edin
DESCRIBE meal_reservations;
DESCRIBE cafeterias;
DESCRIBE wallets;
DESCRIBE events;
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
