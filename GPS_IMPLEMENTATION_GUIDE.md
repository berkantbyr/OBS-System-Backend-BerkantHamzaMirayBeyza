# GPS Implementation Guide

## Üniversite Öğrenci Bilgi Sistemi - GPS Tabanlı Yoklama Sistemi

Bu kılavuz, GPS tabanlı yoklama sisteminin teknik detaylarını ve uygulama yöntemlerini açıklar.

---

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Haversine Formülü](#haversine-formülü)
3. [Geofence Kontrolü](#geofence-kontrolü)
4. [GPS Spoofing Algılama](#gps-spoofing-algılama)
5. [Frontend GPS Kullanımı](#frontend-gps-kullanımı)
6. [Test Senaryoları](#test-senaryoları)
7. [Troubleshooting](#troubleshooting)

---

## Genel Bakış

### Sistem Mimarisi

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Student App   │────▶│   Backend API   │────▶│    Database     │
│   (Frontend)    │     │    (Node.js)    │     │  (PostgreSQL)   │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         │  GPS Coords           │  Validate
         │  + Accuracy           │  + Calculate
         │                       │  + Store
         ▼                       ▼
    ┌─────────┐           ┌─────────────┐
    │  GPS    │           │  Haversine  │
    │  API    │           │  Formula    │
    └─────────┘           └─────────────┘
```

### Akış

1. Öğretim üyesi yoklama oturumu açar (classroom GPS koordinatları + geofence radius)
2. Öğrenci uygulama üzerinden konum izni verir
3. Frontend GPS API kullanarak koordinat + doğruluk değeri alır
4. Backend'e gönderir
5. Backend Haversine formülü ile mesafe hesaplar
6. Spoofing kontrolü yapar
7. Geofence kontrolü yapar
8. Yoklama kaydeder (flagged olabilir)

---

## Haversine Formülü

### Teorik Açıklama

Haversine formülü, bir küre üzerindeki iki nokta arasındaki en kısa mesafeyi (great-circle distance) hesaplar. Dünya'nın yaklaşık küresel yapısı için idealdir.

### Matematiksel Formül

```
a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
c = 2 × atan2(√a, √(1−a))
d = R × c
```

Burada:
- φ = latitude (enlem) radyan cinsinden
- λ = longitude (boylam) radyan cinsinden
- R = Dünya'nın yarıçapı (6,371,000 metre)
- d = mesafe (metre)

### JavaScript Implementasyonu

```javascript
const EARTH_RADIUS = 6371000; // meters

/**
 * Calculate distance between two GPS coordinates
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lon1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lon2 - Longitude of point 2 (degrees)
 * @returns {number} - Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  // Convert degrees to radians
  const toRad = (deg) => (deg * Math.PI) / 180;
  
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  
  // Haversine formula
  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) ** 2;
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return EARTH_RADIUS * c;
}
```

### Doğruluk

- Kısa mesafeler (<100km): ±1 metre doğruluk
- Orta mesafeler (100-500km): ±10 metre doğruluk
- Uzun mesafeler (>500km): Vincenty formülü tercih edilebilir

---

## Geofence Kontrolü

### Geofence Nedir?

Geofence, bir GPS koordinatı etrafında tanımlanan sanal sınırdır. Bizim sistemimizde, sınıf konumu merkez ve belirli bir yarıçap ile tanımlanır.

### Kontrol Algoritması

```javascript
/**
 * Check if student is within geofence
 * @param {Object} classroom - { latitude, longitude, geofence_radius }
 * @param {Object} student - { latitude, longitude, accuracy }
 * @returns {Object} - { isWithin, distance, allowedDistance }
 */
function checkGeofence(classroom, student) {
  // Calculate actual distance
  const distance = calculateDistance(
    classroom.latitude,
    classroom.longitude,
    student.latitude,
    student.longitude
  );
  
  // Calculate allowed distance with buffers
  const accuracyBuffer = Math.min(student.accuracy || 0, 20); // Max 20m buffer
  const toleranceBuffer = 5; // Additional tolerance
  const allowedDistance = classroom.geofence_radius + accuracyBuffer + toleranceBuffer;
  
  return {
    isWithin: distance <= allowedDistance,
    distance: Math.round(distance),
    allowedDistance: Math.round(allowedDistance)
  };
}
```

### Neden Buffer Ekliyoruz?

1. **GPS Accuracy Buffer**: GPS doğruluğu değişken olabilir. Örneğin, iç mekanlarda 20m+ hata olabilir.

2. **Tolerance Buffer**: Sınır durumlarını ele almak için küçük bir tolerans eklenir.

3. **Max Accuracy Cap (20m)**: Çok yüksek accuracy değerlerinin manipülasyonu önlemek için üst sınır.

### Örnek Hesaplama

```
Classroom: (41.0082, 28.9784), radius: 15m
Student: (41.0083, 28.9785), accuracy: 10m

distance = ~15m (Haversine ile hesaplanan)
allowedDistance = 15 + min(10, 20) + 5 = 30m

15 <= 30 → ✓ Within geofence
```

---

## GPS Spoofing Algılama

### Spoofing Nedir?

GPS spoofing, kullanıcının gerçek konumu yerine sahte koordinatlar göndermesidir. Mock location uygulamaları ile yapılabilir.

### Algılama Yöntemleri

#### 1. Şüpheli Doğruluk

```javascript
function checkSuspiciousAccuracy(accuracy) {
  const flags = [];
  
  // Too accurate - likely mock location
  if (accuracy < 3) {
    flags.push('Suspiciously high GPS accuracy');
  }
  
  // Too poor - might be manipulated or indoor
  if (accuracy > 100) {
    flags.push('GPS accuracy too poor');
  }
  
  return flags;
}
```

**Neden şüpheli?**
- Normal GPS: 5-15m accuracy
- Mock apps: Genellikle 0-2m accuracy gösterir
- >100m: GPS düzgün çalışmıyor veya manipüle edilmiş

#### 2. İmkansız Seyahat

```javascript
async function checkImpossibleTravel(studentId, currentLocation) {
  // Get last attendance record in last 30 minutes
  const lastRecord = await getLastAttendanceRecord(studentId, 30 * 60 * 1000);
  
  if (!lastRecord) return [];
  
  const timeDiff = (Date.now() - lastRecord.timestamp) / 1000; // seconds
  const distance = calculateDistance(
    lastRecord.latitude, lastRecord.longitude,
    currentLocation.latitude, currentLocation.longitude
  );
  
  // Max possible speed: 120 km/h = 33.3 m/s
  const maxPossibleDistance = timeDiff * 33.3;
  
  if (distance > maxPossibleDistance && distance > 100) {
    return [`Impossible travel: ${distance}m in ${timeDiff}s`];
  }
  
  return [];
}
```

**Örnek:**
- Son check-in: 5 dakika önce, 2km uzakta
- 5 dakikada 2km → 400m/dk → 24 km/h → Olası (yürüyüş + koşma)
- 5 dakikada 10km → 120 km/h → Şüpheli (şehir içinde)

#### 3. Tam Koordinat Eşleşmesi

```javascript
function checkExactMatch(studentLocation, classroomLocation) {
  const threshold = 0.000001; // ~0.1 meter
  
  const latMatch = Math.abs(studentLocation.latitude - classroomLocation.latitude) < threshold;
  const lonMatch = Math.abs(studentLocation.longitude - classroomLocation.longitude) < threshold;
  
  if (latMatch && lonMatch) {
    return ['Coordinates exactly match classroom center'];
  }
  
  return [];
}
```

**Neden şüpheli?**
- Gerçek GPS'te tam eşleşme neredeyse imkansız
- Mock apps genellikle hedef koordinatı birebir kopyalar

### Spoofing Algılama Akışı

```javascript
async function detectSpoofing(studentLocation, classroomLocation, studentId) {
  const flags = [];
  
  // Check 1: Suspicious accuracy
  flags.push(...checkSuspiciousAccuracy(studentLocation.accuracy));
  
  // Check 2: Impossible travel
  flags.push(...await checkImpossibleTravel(studentId, studentLocation));
  
  // Check 3: Exact coordinate match
  flags.push(...checkExactMatch(studentLocation, classroomLocation));
  
  return {
    isSuspicious: flags.length > 0,
    reasons: flags
  };
}
```

### Flagged Kayıtların Yönetimi

```javascript
// If flagged, still record but mark
if (spoofingResult.isSuspicious) {
  record.is_flagged = true;
  record.flag_reason = spoofingResult.reasons.join('; ');
  
  // Notify instructor asynchronously
  notifyInstructor(session.instructor_id, {
    student: studentId,
    session: sessionId,
    reasons: spoofingResult.reasons
  });
}
```

---

## Frontend GPS Kullanımı

### Browser Geolocation API

```javascript
// Request location permission and get coordinates
function requestLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    const options = {
      enableHighAccuracy: true, // Use GPS if available
      timeout: 30000,           // 30 second timeout
      maximumAge: 0             // No caching
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location unavailable'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timeout'));
            break;
          default:
            reject(new Error('Unknown error'));
        }
      },
      options
    );
  });
}
```

### Kullanım Örneği

```javascript
async function handleCheckIn(sessionId) {
  try {
    // 1. Get location
    setLoading(true);
    const location = await requestLocation();
    
    // 2. Send to backend
    const response = await attendanceService.checkIn(sessionId, {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy
    });
    
    // 3. Handle response
    if (response.success) {
      showSuccess('Yoklama verildi!');
      if (response.data.isFlagged) {
        showWarning('Konumunuz işaretlendi.');
      }
    }
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}
```

### React Component Örneği

```jsx
function GPSCheckIn({ sessionId }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleGetLocation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const loc = await requestLocation();
      setLocation(loc);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      {!location && (
        <button onClick={handleGetLocation} disabled={loading}>
          {loading ? 'Konum alınıyor...' : 'Konum Al'}
        </button>
      )}
      
      {error && <p className="error">{error}</p>}
      
      {location && (
        <div>
          <p>Koordinatlar: {location.latitude}, {location.longitude}</p>
          <p>Doğruluk: ±{location.accuracy}m</p>
          <button onClick={() => handleCheckIn(sessionId)}>
            Yoklama Ver
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Test Senaryoları

### 1. Normal Check-in (Başarılı)

**Senaryo:** Öğrenci sınıf içinde, normal GPS doğruluğu ile check-in yapar.

```javascript
test('should allow check-in within geofence', async () => {
  const classroom = { latitude: 41.0082, longitude: 28.9784, geofence_radius: 15 };
  const student = { latitude: 41.0082, longitude: 28.9784, accuracy: 10 };
  
  const result = checkGeofence(classroom, student);
  
  expect(result.isWithin).toBe(true);
  expect(result.distance).toBeLessThan(result.allowedDistance);
});
```

### 2. Geofence Dışı (Başarısız)

**Senaryo:** Öğrenci sınıftan 50m uzakta.

```javascript
test('should reject check-in outside geofence', async () => {
  const classroom = { latitude: 41.0082, longitude: 28.9784, geofence_radius: 15 };
  const student = { latitude: 41.0087, longitude: 28.9790, accuracy: 10 }; // ~50m away
  
  const result = checkGeofence(classroom, student);
  
  expect(result.isWithin).toBe(false);
  expect(result.distance).toBeGreaterThan(result.allowedDistance);
});
```

### 3. Spoofing Algılama - Yüksek Doğruluk

**Senaryo:** Mock location uygulaması kullanılıyor, accuracy = 1m.

```javascript
test('should flag suspicious high accuracy', async () => {
  const student = { latitude: 41.0082, longitude: 28.9784, accuracy: 1 };
  const classroom = { latitude: 41.0082, longitude: 28.9784 };
  
  const result = await detectSpoofing(student, classroom, 'student-123');
  
  expect(result.isSuspicious).toBe(true);
  expect(result.reasons).toContain('Suspiciously high GPS accuracy');
});
```

### 4. Spoofing Algılama - İmkansız Seyahat

**Senaryo:** Öğrenci 5 dakika önce 10km uzakta check-in yapmış.

```javascript
test('should flag impossible travel', async () => {
  // Mock last record: 5 minutes ago, 10km away
  mockGetLastAttendanceRecord.mockReturnValue({
    latitude: 41.0982, // ~10km north
    longitude: 28.9784,
    timestamp: Date.now() - 5 * 60 * 1000 // 5 minutes ago
  });
  
  const student = { latitude: 41.0082, longitude: 28.9784, accuracy: 10 };
  const result = await detectSpoofing(student, {}, 'student-123');
  
  expect(result.isSuspicious).toBe(true);
  expect(result.reasons[0]).toMatch(/Impossible travel/);
});
```

### 5. Edge Case - Sınırda

**Senaryo:** Öğrenci tam geofence sınırında.

```javascript
test('should handle boundary case', async () => {
  const classroom = { latitude: 41.0082, longitude: 28.9784, geofence_radius: 15 };
  // Student exactly at 15m distance
  const student = { latitude: 41.00833, longitude: 28.9784, accuracy: 5 };
  
  const result = checkGeofence(classroom, student);
  
  // Should pass because of accuracy buffer
  expect(result.isWithin).toBe(true);
});
```

---

## Troubleshooting

### 1. "Konum izni reddedildi"

**Çözüm:**
- Tarayıcı ayarlarından konum iznini etkinleştirin
- HTTPS kullanıldığından emin olun (HTTP'de geolocation çalışmaz)
- Mobil cihazda konum servisleri açık olmalı

### 2. "Konum alınamıyor"

**Çözüm:**
- Cihazda GPS açık olmalı
- İç mekanda iseniz pencereye yaklaşın
- VPN/Proxy kullanıyorsanız devre dışı bırakın

### 3. "Geofence dışındasınız" (Yanlış)

**Çözüm:**
- GPS doğruluğunun yeterli olduğundan emin olun
- Birkaç saniye bekleyip tekrar deneyin
- Cihazı yeniden başlatın

### 4. "Konumunuz işaretlendi" (Flagged)

**Sebepler:**
- Mock location uygulaması aktif
- GPS çok hızlı güncelleniyor
- Zayıf GPS sinyali

**Çözüm:**
- Mock location uygulamalarını kapatın
- Öğretim üyesi ile iletişime geçin

---

## Güvenlik Önerileri

1. **HTTPS Zorunlu**: Konum verisi hassastır, şifrelenmiş bağlantı gereklidir.

2. **Rate Limiting**: Check-in endpoint'ine 10 istek/dakika limiti uygulayın.

3. **Session Expiry**: Yoklama oturumları maksimum 30-60 dakika aktif olmalı.

4. **Audit Log**: Tüm flagged check-in'ler loglanmalı ve incelenebilir olmalı.

5. **Instructor Override**: Flagged durumlar için manuel onay mekanizması.

---

*Son güncelleme: Aralık 2024*
