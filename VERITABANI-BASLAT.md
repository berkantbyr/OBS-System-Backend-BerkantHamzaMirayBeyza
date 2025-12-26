# Veritabanı Başlatma Rehberi

## Sorun
Backend başlatılırken `SequelizeConnectionRefusedError` hatası alıyorsunuz. Bu, veritabanına bağlanılamadığı anlamına gelir.

## Çözüm: Docker ile MySQL Başlatma

### Adım 1: Docker'ın Çalıştığını Kontrol Edin
Docker Desktop'ın çalıştığından emin olun.

### Adım 2: Veritabanını Başlatın
Backend klasöründe şu komutu çalıştırın:

```bash
docker-compose up -d db
```

Bu komut MySQL veritabanını Docker container'ında başlatır.

### Adım 3: .env Dosyasını Güncelleyin
`.env` dosyasında şu ayarlar olmalı:

```env
DB_HOST=localhost
DB_PORT=3307
DB_NAME=campus_db
DB_USER=admin
DB_PASSWORD=securepassword123
```

**ÖNEMLİ:** Docker kullanıyorsanız port **3307** olmalı (docker-compose.yml'de dış port 3307).

### Adım 4: Veritabanının Hazır Olmasını Bekleyin
Veritabanının tamamen başlaması 10-30 saniye sürebilir. Şu komutla kontrol edin:

```bash
docker ps
```

`obs-mysql` container'ının "Up" durumunda olduğunu görmelisiniz.

### Adım 5: Backend'i Tekrar Başlatın
```bash
npm run dev
```

## Alternatif: Yerel MySQL Kullanma

Eğer Docker kullanmak istemiyorsanız, yerel MySQL/MariaDB kurulumu yapabilirsiniz:

1. MySQL/MariaDB'i kurun
2. Servisi başlatın
3. `.env` dosyasında portu **3306** yapın:
   ```env
   DB_PORT=3306
   ```
4. Veritabanını oluşturun:
   ```sql
   CREATE DATABASE campus_db;
   CREATE USER 'admin'@'localhost' IDENTIFIED BY 'securepassword123';
   GRANT ALL PRIVILEGES ON campus_db.* TO 'admin'@'localhost';
   FLUSH PRIVILEGES;
   ```

## Kontrol Komutları

### Veritabanı Container'ını Kontrol Et
```bash
docker ps -a --filter "name=obs-mysql"
```

### Veritabanı Loglarını Görüntüle
```bash
docker logs obs-mysql
```

### Veritabanını Durdur
```bash
docker-compose down
```

### Veritabanını Sıfırla (DİKKAT: Tüm veriler silinir!)
```bash
docker-compose down -v
docker-compose up -d db
```

## Sorun Giderme

### Port 3307 Kullanımda
```bash
# Port'u kullanan process'i bul
netstat -ano | findstr :3307

# Process'i sonlandır (PID'yi yukarıdaki komuttan alın)
taskkill /PID <PID> /F
```

### Veritabanı Bağlantı Hatası Devam Ediyor
1. Docker'ın çalıştığından emin olun
2. Container'ın çalıştığını kontrol edin: `docker ps`
3. `.env` dosyasındaki ayarları kontrol edin
4. Port numarasını kontrol edin (Docker için 3307, yerel için 3306)

