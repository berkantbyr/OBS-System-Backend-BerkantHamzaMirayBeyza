# DKÜ OBS - Analytics Rehberi (ANALYTICS_GUIDE.md)

## 1. Genel Bakış

DKÜ OBS Analytics modülü, üniversite yöneticilerine kapsamlı raporlama ve veri analizi imkanı sunar. Bu rehber, mevcut raporların nasıl kullanılacağını ve verilerin nasıl yorumlanacağını açıklar.

---

## 2. Dashboard İstatistikleri

### 2.1 API Endpoint
```
GET /api/v1/analytics/dashboard
Authorization: Admin only
```

### 2.2 Mevcut Metrikler
| Metrik | Açıklama | Güncelleme Sıklığı |
|--------|----------|-------------------|
| totalUsers | Toplam kullanıcı sayısı | Anlık |
| activeUsersToday | Bugün aktif kullanıcı | Anlık |
| totalCourses | Toplam ders sayısı | Anlık |
| totalEnrollments | Toplam kayıt sayısı | Anlık |
| attendanceRate | Ortalama yoklama oranı (%) | Günlük |
| mealReservationsToday | Bugünkü yemek rezervasyonu | Anlık |
| upcomingEvents | Yaklaşan etkinlik sayısı | Anlık |
| systemHealth | Sistem durumu | Anlık |

### 2.3 Örnek Response
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "activeUsersToday": 456,
    "totalCourses": 120,
    "totalEnrollments": 3450,
    "attendanceRate": 87.5,
    "mealReservationsToday": 890,
    "upcomingEvents": 12,
    "systemHealth": "healthy"
  }
}
```

---

## 3. Akademik Performans Raporu

### 3.1 API Endpoint
```
GET /api/v1/analytics/academic-performance
Authorization: Admin only
```

### 3.2 Rapor İçeriği

#### GPA Dağılımı (Bölüm Bazlı)
| Metrik | Açıklama |
|--------|----------|
| department | Bölüm adı |
| studentCount | Öğrenci sayısı |
| averageGpa | Ortalama GPA |

#### Not Dağılımı
| Not | Aralık | Anlamı |
|-----|--------|--------|
| AA | 4.00 | Mükemmel |
| BA | 3.50 | Çok İyi |
| BB | 3.00 | İyi |
| CB | 2.50 | Orta |
| CC | 2.00 | Geçer |
| DC | 1.50 | Şartlı |
| DD | 1.00 | Başarısız |
| FF | 0.00 | Başarısız |

#### Risk Altındaki Öğrenciler
- GPA < 2.0 olan öğrenciler
- Akademik uyarı gerektiren durumlar

### 3.3 Veri Yorumlama
- **averageGpa > 3.0**: Bölüm başarılı
- **averageGpa 2.5-3.0**: Normal performans
- **averageGpa < 2.5**: Dikkat gerektiriyor

---

## 4. Yoklama Analizi

### 4.1 API Endpoint
```
GET /api/v1/analytics/attendance
Authorization: Admin only
```

### 4.2 Rapor İçeriği

#### Ders Bazlı Devam Oranları
| Metrik | Açıklama |
|--------|----------|
| courseCode | Ders kodu |
| courseName | Ders adı |
| totalRecords | Toplam yoklama kaydı |
| attendanceRate | Devam oranı (%) |

#### Kritik Devamsızlık
- Devamsızlık oranı > %30 olan öğrenciler
- E-posta bildirimi gönderilir

### 4.3 Uyarı Eşikleri
| Devamsızlık | Durum | Aksiyon |
|-------------|-------|---------|
| ≤ 20% | Normal | - |
| 20-30% | Uyarı | Bildirim gönder |
| > 30% | Kritik | Dersten kalma riski |

---

## 5. Yemek Kullanım Raporu

### 5.1 API Endpoint
```
GET /api/v1/analytics/meal-usage
Authorization: Admin only
```

### 5.2 Rapor İçeriği
| Metrik | Açıklama |
|--------|----------|
| date | Tarih |
| totalMeals | Toplam öğün |
| breakfastCount | Kahvaltı sayısı |
| lunchCount | Öğle yemeği sayısı |
| dinnerCount | Akşam yemeği sayısı |
| revenue | Toplam gelir (TL) |

### 5.3 Peak Hours Analizi
```
Kahvaltı:  07:30 - 09:30 (Peak: 08:30)
Öğle:      11:30 - 13:30 (Peak: 12:30)
Akşam:     17:30 - 19:30 (Peak: 18:30)
```

---

## 6. Etkinlik Raporu

### 6.1 API Endpoint
```
GET /api/v1/analytics/events
Authorization: Admin only
```

### 6.2 Rapor İçeriği

#### Popüler Etkinlikler
| Metrik | Açıklama |
|--------|----------|
| title | Etkinlik adı |
| category | Kategori |
| capacity | Kapasite |
| registrationCount | Kayıt sayısı |

#### Kategori Dağılımı
| Kategori | Açıklama |
|----------|----------|
| academic | Akademik etkinlikler |
| social | Sosyal etkinlikler |
| sports | Spor etkinlikleri |
| cultural | Kültürel etkinlikler |
| career | Kariyer etkinlikleri |

### 6.3 Başarı Metrikleri
- **Kayıt Oranı**: Kayıt / Kapasite × 100
- **Check-in Oranı**: Katılım / Kayıt × 100

---

## 7. Rapor Dışa Aktarma

### 7.1 API Endpoint
```
GET /api/v1/analytics/export/:type
Authorization: Admin only
Query Parameters:
  - format: csv | json (default: csv)
```

### 7.2 Desteklenen Raporlar
| Type | Açıklama |
|------|----------|
| academic | Akademik performans raporu |
| attendance | Yoklama raporu |
| meal | Yemek kullanım raporu |
| event | Etkinlik raporu |

### 7.3 Örnek Kullanım
```bash
# CSV formatında indir
GET /api/v1/analytics/export/academic?format=csv

# JSON formatında indir
GET /api/v1/analytics/export/attendance?format=json
```

---

## 8. Frontend Erişim

### 8.1 Admin Dashboard
**URL:** `/admin/dashboard`

Özet kartları ve hızlı erişim linkleri içerir.

### 8.2 Akademik Performans Sayfası
**URL:** `/admin/analytics/academic`

- Bölüm bazlı GPA grafiği
- Not dağılımı
- Risk altındaki öğrenciler tablosu

### 8.3 Yoklama Analizi Sayfası
**URL:** `/admin/analytics/attendance`

- Ders bazlı devam oranları
- Kritik devamsızlık listesi

### 8.4 Yemek Analizi Sayfası
**URL:** `/admin/analytics/meal`

- Günlük kullanım grafiği
- Peak hours heatmap

### 8.5 Etkinlik Analizi Sayfası
**URL:** `/admin/analytics/events`

- Popüler etkinlikler
- Kategori dağılımı

---

## 9. Veri Güncelleme Sıklığı

| Rapor | Güncelleme | Önbellek |
|-------|------------|----------|
| Dashboard | Anlık | Yok |
| Akademik | Günlük | 1 saat |
| Yoklama | Anlık | Yok |
| Yemek | Saatlik | 15 dk |
| Etkinlik | Anlık | Yok |

---

## 10. Best Practices

1. **Günlük İnceleme**: Dashboard'u günlük kontrol edin
2. **Haftalık Analiz**: Detaylı raporları haftalık inceleyin
3. **Trend Takibi**: Uzun vadeli trendleri izleyin
4. **Export**: Önemli raporları periyodik olarak dışa aktarın
5. **Aksiyon**: Kritik durumlar için hızlı aksiyon alın

---

*Son Güncelleme: 24 Aralık 2024*
