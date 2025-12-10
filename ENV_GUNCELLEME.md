# .env Dosyası Güncelleme

## 📝 Local .env Dosyasını Güncelleme

`.env` dosyanızı açın ve şu satırları güncelleyin:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=system.obs1111@gmail.com
EMAIL_PASS=dgqjgaqyhekshbbz
EMAIL_FROM=system.obs1111@gmail.com
```

**Dosya konumu:** `OBS-System-Backend-BerkantHamzaMirayBeyza/.env`

---

## ✅ Güncellenen Dosyalar

1. ✅ `YENI_EMAIL_KURULUM.md` - Yeni email bilgileriyle güncellendi
2. ✅ `EMAIL_BILGILERI.md` - Yeni dosya oluşturuldu (tüm komutlar hazır)
3. ✅ `env.example` - Yeni email bilgileriyle güncellendi

---

## 🚀 Production'a Deploy

Production'da email gönderiminin çalışması için:

### 1. Secret Manager'da Secret'ları Oluşturun

```bash
echo -n "system.obs1111@gmail.com" | gcloud secrets create EMAIL_USER --data-file=-
echo -n "dgqjgaqyhekshbbz" | gcloud secrets create EMAIL_PASS --data-file=-
```

### 2. Cloud Run'a Ekleyin

```bash
gcloud run services update obs-api \
  --region europe-west1 \
  --update-secrets EMAIL_USER=EMAIL_USER:latest,EMAIL_PASS=EMAIL_PASS:latest
```

### 3. Test Edin

Production'da yeni kullanıcı kaydı yapın ve **system.obs1111@gmail.com** email adresini kontrol edin.

---

## 📋 Özet

- **Email:** system.obs1111@gmail.com
- **App Password:** dgqjgaqyhekshbbz
- **Local .env:** Manuel olarak güncelleyin
- **Production:** Secret Manager komutlarını çalıştırın

Detaylı bilgi: `EMAIL_BILGILERI.md`

