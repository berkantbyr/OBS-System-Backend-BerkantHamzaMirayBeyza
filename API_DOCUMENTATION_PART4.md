# Part 4 - API Documentation

## Analytics Endpoints

### GET /api/v1/analytics/dashboard
Admin dashboard istatistikleri

**Response:**
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

### GET /api/v1/analytics/academic-performance
Akademik performans analitiği

**Response:**
- GPA by department
- Grade distribution
- Pass/fail rates
- Top performing students
- At-risk students

### GET /api/v1/analytics/attendance
Yoklama analitiği

**Query Parameters:**
- `days` (optional): Kaç günlük veri (default: 30)

### GET /api/v1/analytics/meal-usage
Yemek kullanım raporları

### GET /api/v1/analytics/events
Etkinlik raporları

### GET /api/v1/analytics/export/:type
Rapor dışa aktarma

**Parameters:**
- `type`: academic, attendance, meal, event

**Query:**
- `format`: csv, json

---

## Notification Endpoints

### GET /api/v1/notifications
Bildirim listesi (pagination)

**Query Parameters:**
- `page`, `limit`
- `category`: academic, attendance, meal, event, payment, system
- `read`: true/false

### GET /api/v1/notifications/recent
Son bildirimler (bell dropdown için)

### PUT /api/v1/notifications/:id/read
Bildirimi okundu işaretle

### PUT /api/v1/notifications/mark-all-read
Tüm bildirimleri okundu işaretle

### DELETE /api/v1/notifications/:id
Bildirimi sil

### GET /api/v1/notifications/preferences
Bildirim tercihlerini getir

### PUT /api/v1/notifications/preferences
Bildirim tercihlerini güncelle

**Request Body:**
```json
{
  "email": {
    "academic": true,
    "attendance": true,
    "meal": false,
    "event": true,
    "payment": true,
    "system": true
  },
  "push": {
    "academic": true,
    "attendance": true,
    "meal": true,
    "event": true,
    "payment": true,
    "system": false
  },
  "sms": {
    "attendance": true,
    "payment": false
  }
}
```

---

## Sensor Endpoints (IoT - Bonus)

### GET /api/v1/sensors
Sensör listesi

### GET /api/v1/sensors/latest
Tüm sensörlerin son okumaları

### GET /api/v1/sensors/:id
Sensör detayı

### GET /api/v1/sensors/:id/data
Sensör verisi

**Query Parameters:**
- `startDate`, `endDate`
- `aggregation`: raw, hour, day
- `limit`

### POST /api/v1/sensors
Yeni sensör oluştur (Admin)

### POST /api/v1/sensors/:id/data
Sensör verisi kaydet (IoT endpoint)

### POST /api/v1/sensors/simulate
Demo için sensör verisi simüle et (Admin)

---

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'JWT_TOKEN' }
});
```

### Events
- `notification`: Yeni bildirim
- `sensorUpdate`: Sensör güncellemesi
- `attendanceUpdate`: Yoklama güncellemesi

### Subscriptions
- `subscribe:sensors`: Sensör güncellemelerine abone ol
- `subscribe:attendance`: Yoklama güncellemelerine abone ol
