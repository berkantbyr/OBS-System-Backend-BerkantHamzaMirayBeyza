# Kullanıcı Kılavuzu - Part 2

## Üniversite Öğrenci Bilgi Sistemi

Bu kılavuz, Part 2 kapsamında eklenen Akademik Yönetim ve GPS Yoklama özelliklerinin kullanımını açıklar.

---

## İçindekiler

1. [Öğrenci İşlemleri](#öğrenci-işlemleri)
   - [Derse Kayıt Olma](#derse-kayıt-olma)
   - [GPS ile Yoklama Verme](#gps-ile-yoklama-verme)
   - [Mazeret Bildirme](#mazeret-bildirme)
   - [Notlarımı Görüntüleme](#notlarımı-görüntüleme)
2. [Öğretim Üyesi İşlemleri](#öğretim-üyesi-işlemleri)
   - [Yoklama Oturumu Açma](#yoklama-oturumu-açma)
   - [Not Girişi](#not-girişi)
   - [Mazeret Değerlendirme](#mazeret-değerlendirme)
3. [Ekran Görüntüleri](#ekran-görüntüleri)
4. [Sıkça Sorulan Sorular](#sıkça-sorulan-sorular)

---

## Öğrenci İşlemleri

### Derse Kayıt Olma

#### Adım 1: Ders Kataloğuna Git
1. Sol menüden **"Ders Kataloğu"** seçeneğine tıklayın
2. Açılan sayfada tüm aktif dersler listelenecektir

#### Adım 2: Ders Ara ve Filtrele
- **Arama kutusu**: Ders kodu veya adı ile arama yapabilirsiniz
- **Bölüm filtresi**: Belirli bir bölümün derslerini görebilirsiniz
- **Sayfalama**: Çok sayıda ders varsa sayfalar arasında gezinebilirsiniz

#### Adım 3: Ders Detaylarını İncele
1. İlgilendiğiniz derse tıklayın
2. Açılan sayfada şunları göreceksiniz:
   - Ders bilgileri (kod, ad, kredi, AKTS)
   - Ders açıklaması
   - **Önkoşullar** (varsa ve tamamlama durumunuz)
   - **Açık şubeler** (section'lar)

#### Adım 4: Şube Seç ve Kayıt Ol
1. Uygun bir şube bulun (kapasite, program, öğretim üyesi)
2. **"Kayıt Ol"** butonuna tıklayın
3. Sistem otomatik olarak şunları kontrol eder:
   - ✅ Önkoşul dersleri tamamladınız mı?
   - ✅ Program çakışması var mı?
   - ✅ Şubede yer var mı?
4. Tüm kontroller başarılı ise onay mesajı görürsünüz

#### Olası Hatalar ve Çözümleri

| Hata | Sebep | Çözüm |
|------|-------|-------|
| "Önkoşul tamamlanmadı" | Gerekli dersi almadınız veya geçemediniz | Önce önkoşul dersini tamamlayın |
| "Program çakışması" | Aynı saatte başka dersiniz var | Farklı bir şube seçin |
| "Şube dolu" | Kapasite tamamlanmış | Farklı bir şube veya dönem bekleyin |
| "Zaten kayıtlısınız" | Bu derse daha önce kayıt oldunuz | Derslerim sayfasını kontrol edin |

---

### GPS ile Yoklama Verme

#### Ön Gereksinimler
- 📱 Mobil cihaz veya GPS destekli bilgisayar
- 📍 Konum servisleri açık olmalı
- 🌐 İnternet bağlantısı
- 🔒 Tarayıcıda konum izni verilmiş olmalı

#### Adım 1: Aktif Yoklama Oturumunu Bul
1. Sol menüden **"Yoklama Ver"** seçeneğine tıklayın
2. Aktif yoklama oturumları listelenecektir
3. Kayıtlı olduğunuz dersler için aktif oturumları göreceksiniz

#### Adım 2: Konum İzni Ver
1. İlk kullanımda tarayıcı konum izni isteyecektir
2. **"İzin Ver"** butonuna tıklayın
3. Konum alınana kadar bekleyin (birkaç saniye)

#### Adım 3: Yoklama Ver
1. Konumunuz başarıyla alındıktan sonra:
   - 🟢 **Yeşil**: Sınıf alanı içindesiniz - yoklama verebilirsiniz
   - 🔴 **Kırmızı**: Sınıf alanı dışındasınız - yaklaşmanız gerekiyor
2. Yeşil göstergede **"Yoklama Ver"** butonuna tıklayın
3. Başarılı mesajı göreceksiniz

#### Harita Görünümü
- Haritada derslik konumu (mavi nokta) ve sizin konumunuz (yeşil/kırmızı nokta) görünür
- Geofence alanı (izin verilen çember) gösterilir
- Mesafe bilgisi anlık olarak güncellenir

#### Önemli Notlar

⚠️ **Dikkat Edilecekler:**
- Yoklama oturumu belirli bir süre (genellikle 30 dk) aktiftir
- Sınıf alanının dışındaysanız yoklama veremezsiniz
- Şüpheli konum (mock location vb.) işaretlenir ve öğretim üyesine bildirilir
- QR kod alternatif olarak kullanılabilir (varsa)

---

### Mazeret Bildirme

#### Adım 1: Yoklama Durumuma Git
1. Sol menüden **"Yoklama Durumum"** seçeneğine tıklayın
2. Tüm derslerinizin yoklama istatistiklerini göreceksiniz

#### Adım 2: Mazeret Talebi Oluştur
1. Devamsız olduğunuz bir ders için **"Mazeret Bildir"** butonuna tıklayın
2. Açılan formda:
   - **Tarih**: Devamsız olduğunuz tarih
   - **Mazeret Türü**: Sağlık, aile, akademik, diğer
   - **Açıklama**: Mazeret sebebiniz
   - **Belge**: Destekleyici belge (varsa) yükleyin

#### Adım 3: Talebi Gönder
1. Tüm bilgileri doldurduktan sonra **"Gönder"** butonuna tıklayın
2. Talep öğretim üyesine iletilecektir
3. Durumu **"Mazeret Taleplerim"** sayfasından takip edebilirsiniz

#### Talep Durumları
- 🟡 **Beklemede**: Henüz değerlendirilmedi
- 🟢 **Onaylandı**: Mazeret kabul edildi, devamsızlık düşüldü
- 🔴 **Reddedildi**: Mazeret kabul edilmedi

---

### Notlarımı Görüntüleme

#### Adım 1: Notlar Sayfasına Git
1. Sol menüden **"Notlarım"** seçeneğine tıklayın
2. Tüm dönemlerdeki notlarınız listelenecektir

#### Adım 2: Not Detaylarını İncele
Her ders için şunları görebilirsiniz:
- Vize notu
- Final notu
- Ödev notu (varsa)
- Ortalama
- Harf notu
- Not puanı

#### Adım 3: Genel Özet
Sayfanın üst kısmında:
- **CGPA**: Genel not ortalamanız
- **Toplam Kredi**: Aldığınız toplam kredi
- **Dönemlik GPA**: Her dönemin not ortalaması

#### Adım 4: Transkript İndir
1. **"Transkript İndir"** butonuna tıklayın
2. PDF formatında transkriptiniz indirilecektir

---

## Öğretim Üyesi İşlemleri

### Yoklama Oturumu Açma

#### Adım 1: Yoklama Başlat Sayfasına Git
1. Sol menüden **"Yoklama Başlat"** seçeneğine tıklayın
2. Verdiğiniz dersler listelenecektir

#### Adım 2: Ders ve Şube Seç
1. Yoklama açmak istediğiniz dersi seçin
2. İlgili şubeyi seçin

#### Adım 3: Yoklama Ayarları
- **Süre**: Yoklama oturumunun aktif kalacağı süre (varsayılan: 30 dk)
- **Geofence Yarıçapı**: İzin verilen alan yarıçapı (varsayılan: 15m)
- Derslik konumu otomatik olarak veritabanından alınır

#### Adım 4: Oturumu Başlat
1. **"Yoklamayı Başlat"** butonuna tıklayın
2. Oturum açıldığında:
   - QR kod görüntülenir (alternatif check-in için)
   - Kayıtlı öğrencilere bildirim gönderilir
   - Gerçek zamanlı katılım sayısı gösterilir

#### Adım 5: Oturumu Kapat
1. Yoklama bittiğinde **"Oturumu Kapat"** butonuna tıklayın
2. Yoklama raporu otomatik olarak oluşturulur

---

### Not Girişi

#### Adım 1: Not Defteri Sayfasına Git
1. Sol menüden **"Not Defteri"** seçeneğine tıklayın
2. Verdiğiniz dersler listelenecektir

#### Adım 2: Ders ve Şube Seç
1. Not girmek istediğiniz dersi seçin
2. Öğrenci listesi görüntülenecektir

#### Adım 3: Notları Gir
Her öğrenci için:
- Vize notu (0-100)
- Final notu (0-100)
- Ödev notu (0-100, isteğe bağlı)

**Otomatik Hesaplama:**
- Ortalama = Vize × 0.30 + Final × 0.50 + Ödev × 0.20
- Harf notu otomatik belirlenir
- Not puanı otomatik hesaplanır

#### Adım 4: Kaydet
1. Notları girdikten sonra **"Kaydet"** butonuna tıklayın
2. Öğrencilere not güncellemesi bildirimi gönderilir

#### Toplu Not Girişi
1. **"Toplu Giriş"** butonuna tıklayın
2. Excel dosyası yükleyin veya
3. Tüm öğrencilerin notlarını tek sayfada girin
4. **"Tümünü Kaydet"** butonuna tıklayın

---

### Mazeret Değerlendirme

#### Adım 1: Mazeret Talepleri Sayfasına Git
1. Sol menüden **"Mazeret Talepleri"** seçeneğine tıklayın
2. Bekleyen talepler listelenecektir

#### Adım 2: Talebi İncele
Her talep için:
- Öğrenci bilgileri
- Devamsız olduğu oturum
- Mazeret sebebi
- Yüklenen belge (varsa)

#### Adım 3: Karar Ver
1. **"Onayla"** veya **"Reddet"** butonlarından birine tıklayın
2. Not ekleyebilirsiniz (isteğe bağlı)
3. Kararınız öğrenciye bildirilecektir

**Onay durumunda:**
- Öğrencinin yoklama kaydı "mazeretli" olarak güncellenir
- Devamsızlık hesabından düşülür

---

## Ekran Görüntüleri

### Ders Kataloğu
```
┌────────────────────────────────────────────────────────┐
│  🔍 Ders Ara...                    [Bölüm: Tümü ▼]     │
├────────────────────────────────────────────────────────┤
│  CS101 - Programlamaya Giriş                    3 kr   │
│  Bilgisayar Mühendisliği                 [Detaylar →]  │
├────────────────────────────────────────────────────────┤
│  CS201 - Veri Yapıları                          4 kr   │
│  Bilgisayar Mühendisliği                 [Detaylar →]  │
├────────────────────────────────────────────────────────┤
│  MATH101 - Matematik I                          4 kr   │
│  Matematik                               [Detaylar →]  │
└────────────────────────────────────────────────────────┘
```

### GPS Yoklama
```
┌────────────────────────────────────────────────────────┐
│  📍 Yoklama Ver - CS101                                │
├────────────────────────────────────────────────────────┤
│                                                        │
│     ┌──────────────────────────────┐                   │
│     │         [Harita]             │                   │
│     │    🔵 Derslik                │                   │
│     │    🟢 Konumunuz              │                   │
│     │    ⭕ Geofence (15m)         │                   │
│     └──────────────────────────────┘                   │
│                                                        │
│  ✅ Sınıf alanı içindesiniz (8m uzaklıkta)             │
│  📍 Doğruluk: ±10m                                     │
│                                                        │
│  [        🎯 Yoklama Ver        ]                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Not Görüntüleme
```
┌────────────────────────────────────────────────────────┐
│  📊 Notlarım                           CGPA: 3.25      │
├────────────────────────────────────────────────────────┤
│  2024 Güz Dönemi                        GPA: 3.40      │
├────────────────────────────────────────────────────────┤
│  Ders          Vize   Final   Ort    Harf    Puan     │
│  ─────────────────────────────────────────────────────│
│  CS101          80     85     83     BB      3.0      │
│  MATH101        75     80     78     CB      2.5      │
│  ENG101         90     95     93     AA      4.0      │
└────────────────────────────────────────────────────────┘
```

---

## Sıkça Sorulan Sorular

### Ders Kayıt

**S: Önkoşul dersini geçtim ama sistem kabul etmiyor?**
C: Notlarınızın sisteme girildiğinden emin olun. Geçen dönemin notları girilmemiş olabilir.

**S: Program çakışması hatası alıyorum ama ders programımda çakışma yok?**
C: Kayıtlı olduğunuz diğer şubelerin programlarını kontrol edin. Farklı bir şubede çakışma olabilir.

### GPS Yoklama

**S: Konum izni verdim ama konum alınamıyor?**
C: Cihazınızın GPS'inin açık olduğundan emin olun. İç mekanda iseniz pencereye yaklaşın.

**S: Sınıftayım ama "geofence dışı" hatası alıyorum?**
C: GPS doğruluğunuz düşük olabilir. Birkaç saniye bekleyin, konum güncellendikten sonra tekrar deneyin.

**S: Yoklamam işaretlendi (flagged), ne yapmalıyım?**
C: Endişelenmeyin, öğretim üyesi durumu inceleyecektir. Gerekirse öğretim üyesi ile iletişime geçin.

### Notlar

**S: Notlarım ne zaman açıklanır?**
C: Not girişi öğretim üyesi tarafından yapılır. Final haftasından sonra notlar genellikle 1-2 hafta içinde girilir.

**S: Notuma itiraz etmek istiyorum?**
C: Öğretim üyesi ile iletişime geçin veya öğrenci işlerine dilekçe verin.

---

## İletişim ve Destek

📧 E-posta: obs-destek@universite.edu.tr
📞 Telefon: 0212 XXX XX XX
🌐 Web: https://obs.universite.edu.tr/destek

---

*Son güncelleme: Aralık 2024*
