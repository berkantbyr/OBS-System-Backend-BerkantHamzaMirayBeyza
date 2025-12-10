# Production Email Sorunları ve Çözümleri

## Sorunlar

1. **Email doğrulama maili gönderilmiyor**
2. **Kayıt oluştururken hata alınıyor**
3. **Giriş yaparken hata alınıyor**

## Çözümler

### 1. Email Secret'larını Kontrol Edin

Production'da email gönderimi için Secret Manager'da `EMAIL_USER` ve `EMAIL_PASS` secret'ları olmalı.

```bash
# Secret'ları kontrol edin
gcloud secrets list | grep EMAIL

# Eğer yoksa oluşturun
echo -n "obs.system.university@gmail.com" | gcloud secrets create EMAIL_USER --data-file=-
echo -n "your-app-password" | gcloud secrets create EMAIL_PASS --data-file=-
```

### 2. Cloud Run'a Secret Erişimi Verin

```bash
gcloud run services update obs-api \
  --region europe-west1 \
  --update-secrets EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest
```

### 3. Deploy Sonrası Kontrol

```bash
# Cloud Run loglarını kontrol edin
gcloud run services logs read obs-api --region europe-west1 --limit 100 | grep -i email

# Email konfigürasyonu kontrolü
gcloud run services logs read obs-api --region europe-west1 --limit 50 | grep "EMAIL CONFIGURATION DEBUG"
```

## Yapılan Düzeltmeler

### 1. Transaction Yönetimi
- Email gönderimi transaction dışında yapılıyor
- Email hatası durumunda rollback yapılmıyor (transaction zaten commit edilmiş)
- Kayıt başarılı oluyor, email gönderilemese bile

### 2. Email Gönderim Hataları
- Production'da email gönderilemezse kayıt başarılı oluyor
- Kullanıcı "Email'i yeniden gönder" özelliğini kullanabilir
- Hatalar detaylı loglanıyor

### 3. Hata Mesajları
- Kullanıcıya daha anlaşılır mesajlar gösteriliyor
- Email gönderilemezse kullanıcı bilgilendiriliyor

## Test Senaryoları

### Senaryo 1: Email Secret'ları Yok
1. Secret'ları oluşturun
2. Cloud Run'a ekleyin
3. Deploy edin
4. Kayıt yapın → Email gelmeli

### Senaryo 2: Email Secret'ları Yanlış
1. Logları kontrol edin: `gcloud run services logs read obs-api --region europe-west1 --limit 100 | grep "EMAIL SEND FAILURE"`
2. Secret'ları güncelleyin
3. Cloud Run'ı yeniden başlatın

### Senaryo 3: Email Gönderilemiyor Ama Kayıt Başarılı
1. Bu normal davranış - kayıt başarılı olur
2. Kullanıcı "Email'i yeniden gönder" kullanabilir
3. Secret'ları kontrol edin ve düzeltin

## Önemli Notlar

- **Kayıt başarılı olur, email gönderilemese bile** - Bu istenen davranış
- **Email gönderilemezse kullanıcı bilgilendirilir** - "Email'i yeniden gönder" özelliğini kullanabilir
- **Production'da email secret'ları zorunlu** - Email göndermek için gerekli
- **Logları kontrol edin** - Email hatalarını görmek için

## Hızlı Çözüm

```bash
# 1. Secret'ları oluştur
echo -n "obs.system.university@gmail.com" | gcloud secrets create EMAIL_USER --data-file=-
echo -n "your-app-password" | gcloud secrets create EMAIL_PASS --data-file=-

# 2. Cloud Run'a ekle
gcloud run services update obs-api \
  --region europe-west1 \
  --update-secrets EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest

# 3. Logları kontrol et
gcloud run services logs read obs-api --region europe-west1 --limit 50
```

