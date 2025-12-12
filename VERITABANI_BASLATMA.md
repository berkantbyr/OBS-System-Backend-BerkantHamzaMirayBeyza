# Veritabanı Başlatma Rehberi

## 🔴 Sorun: Veritabanı Bağlantı Hatası

`.env` dosyanızda ayarlar doğru görünüyor, ancak veritabanına bağlanılamıyor. Bu, giriş hatalarının ana nedeni olabilir.

## ✅ Çözüm 1: Docker ile Veritabanını Başlatma (Önerilen)

### Adım 1: Docker Desktop'ı Başlatın
- Docker Desktop uygulamasını açın
- Docker'ın çalıştığından emin olun (sistem tepsisinde Docker ikonu görünmeli)

### Adım 2: Veritabanı Container'ını Başlatın
```powershell
# Backend dizinine gidin
cd OBS-System-Backend-BerkantHamzaMirayBeyza

# Docker container'larını başlatın
docker-compose up -d db

# Container'ın çalıştığını kontrol edin
docker ps
```

### Adım 3: Bağlantıyı Test Edin
```powershell
# Port 3307'nin açık olduğunu kontrol edin
Test-NetConnection -ComputerName localhost -Port 3307
```

### Adım 4: Backend'i Başlatın
```powershell
# Backend dizininde
npm run dev
```

Backend başladığında şu mesajı görmelisiniz:
```
✅ Database connection established successfully
```

## ✅ Çözüm 2: Yerel MySQL Kullanma

Eğer Docker kullanmak istemiyorsanız, yerel bir MySQL kurulumu kullanabilirsiniz.

### Adım 1: MySQL'i Kurun ve Başlatın
- MySQL Server'ı kurun (eğer yoksa)
- MySQL servisinin çalıştığından emin olun

### Adım 2: Veritabanını Oluşturun
```sql
CREATE DATABASE campus_db;
CREATE USER 'admin'@'localhost' IDENTIFIED BY 'securepassword123';
GRANT ALL PRIVILEGES ON campus_db.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;
```

### Adım 3: .env Dosyasını Güncelleyin
```env
DB_HOST=localhost
DB_PORT=3306  # Yerel MySQL genellikle 3306 portunu kullanır
DB_NAME=campus_db
DB_USER=admin
DB_PASSWORD=securepassword123
```

### Adım 4: Backend'i Başlatın
```powershell
npm run dev
```

## 🔍 Sorun Giderme

### Docker Container Çalışmıyor
```powershell
# Container'ları kontrol edin
docker ps -a

# Container'ı yeniden başlatın
docker-compose restart db

# Logları kontrol edin
docker-compose logs db
```

### Port 3307 Kullanımda
Eğer port 3307 başka bir uygulama tarafından kullanılıyorsa:
1. O uygulamayı durdurun, VEYA
2. `docker-compose.yml` dosyasında portu değiştirin:
   ```yaml
   ports:
     - "3308:3306"  # 3307 yerine 3308 kullan
   ```
3. `.env` dosyasında da portu güncelleyin:
   ```env
   DB_PORT=3308
   ```

### Veritabanı Bağlantı Hatası Devam Ediyor
1. Backend loglarını kontrol edin
2. MySQL'in çalıştığını doğrulayın
3. Kullanıcı adı ve şifrenin doğru olduğundan emin olun
4. Firewall'ın portu engellemediğinden emin olun

## ✅ Başarı Kontrolü

Backend başarıyla başladığında terminalde şunları görmelisiniz:
```
✅ Database connection established successfully
✅ Database synced with alter
✅ Server is running on 0.0.0.0:5000
✅ Local: http://localhost:5000
```

Bu mesajları gördükten sonra giriş yapmayı tekrar deneyin.

