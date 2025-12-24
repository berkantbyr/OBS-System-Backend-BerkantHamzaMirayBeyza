# DKÜ OBS - API Dokümantasyonu (API_DOCUMENTATION.md)

## Genel Bilgiler

**Base URL:** `https://api.obs.dku.edu.tr/api/v1`  
**Authentication:** JWT Bearer Token  
**Content-Type:** `application/json`

---

## 1. Authentication

### 1.1 Login
**URL:** `POST /auth/login`  
**Authentication:** Not Required  
**Description:** Kullanıcı girişi yapar ve JWT token döner.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | String | Yes | E-posta adresi |
| password | String | Yes | Şifre |

**Example Request:**
```json
{
  "email": "student@dku.edu.tr",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "student@dku.edu.tr",
      "role": "student",
      "first_name": "Ahmet",
      "last_name": "Yılmaz"
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "E-posta veya şifre hatalı"
}
```

---

### 1.2 Register
**URL:** `POST /auth/register`  
**Authentication:** Not Required

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | String | Yes | E-posta (@dku.edu.tr) |
| password | String | Yes | Minimum 6 karakter |
| first_name | String | Yes | Ad |
| last_name | String | Yes | Soyad |
| role | String | Yes | student, faculty |

---

### 1.3 Logout
**URL:** `POST /auth/logout`  
**Authentication:** Required

---

### 1.4 Get Profile
**URL:** `GET /auth/me`  
**Authentication:** Required

---

## 2. Users

### 2.1 Get All Users
**URL:** `GET /users`  
**Authentication:** Required  
**Authorization:** Admin only

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | Number | Sayfa numarası (default: 1) |
| limit | Number | Sayfa başına kayıt (default: 20) |
| role | String | Rol filtresi |
| search | String | Ad/soyad arama |

---

### 2.2 Get User by ID
**URL:** `GET /users/:id`  
**Authentication:** Required

---

### 2.3 Update User
**URL:** `PUT /users/:id`  
**Authentication:** Required  
**Authorization:** Admin or Self

---

### 2.4 Delete User
**URL:** `DELETE /users/:id`  
**Authentication:** Required  
**Authorization:** Admin only

---

## 3. Courses

### 3.1 Get All Courses
**URL:** `GET /courses`  
**Authentication:** Required

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| department | String | Bölüm filtresi |
| level | String | Seviye filtresi |
| search | String | Ders arama |

---

### 3.2 Get Course Details
**URL:** `GET /courses/:id`  
**Authentication:** Required

---

### 3.3 Create Course
**URL:** `POST /courses`  
**Authentication:** Required  
**Authorization:** Admin only

---

### 3.4 Update Course
**URL:** `PUT /courses/:id`  
**Authentication:** Required  
**Authorization:** Admin only

---

## 4. Sections

### 4.1 Get Section by ID
**URL:** `GET /sections/:id`  
**Authentication:** Required

---

### 4.2 Create Section
**URL:** `POST /sections`  
**Authentication:** Required  
**Authorization:** Admin only

---

## 5. Enrollments

### 5.1 Enroll in Course
**URL:** `POST /enrollments`  
**Authentication:** Required  
**Authorization:** Student

**Request Body:**
```json
{
  "section_id": "uuid"
}
```

---

### 5.2 Get My Enrollments
**URL:** `GET /enrollments/me`  
**Authentication:** Required  
**Authorization:** Student

---

### 5.3 Get My Schedule
**URL:** `GET /enrollments/schedule`  
**Authentication:** Required  
**Authorization:** Student

---

### 5.4 Approve/Reject Enrollment
**URL:** `PUT /enrollments/:id/status`  
**Authentication:** Required  
**Authorization:** Faculty

**Request Body:**
```json
{
  "status": "enrolled" | "rejected"
}
```

---

## 6. Attendance

### 6.1 Start Attendance Session
**URL:** `POST /attendance/sessions`  
**Authentication:** Required  
**Authorization:** Faculty

**Request Body:**
```json
{
  "section_id": "uuid",
  "duration_minutes": 15
}
```

---

### 6.2 Submit Attendance (QR)
**URL:** `POST /attendance/submit`  
**Authentication:** Required  
**Authorization:** Student

**Request Body:**
```json
{
  "qr_code": "session-code",
  "latitude": 41.0082,
  "longitude": 28.9784
}
```

---

### 6.3 Get My Attendance
**URL:** `GET /attendance/me`  
**Authentication:** Required  
**Authorization:** Student

---

### 6.4 Get Session Records
**URL:** `GET /attendance/sessions/:id/records`  
**Authentication:** Required  
**Authorization:** Faculty

---

## 7. Grades

### 7.1 Enter Grades
**URL:** `POST /grades`  
**Authentication:** Required  
**Authorization:** Faculty

**Request Body:**
```json
{
  "enrollment_id": "uuid",
  "grade_type": "midterm",
  "score": 85,
  "max_score": 100
}
```

---

### 7.2 Get My Grades
**URL:** `GET /grades/me`  
**Authentication:** Required  
**Authorization:** Student

---

### 7.3 Get Transcript
**URL:** `GET /grades/transcript`  
**Authentication:** Required  
**Authorization:** Student

---

## 8. Meals

### 8.1 Get Menu
**URL:** `GET /meals/menu`  
**Authentication:** Required

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| date | Date | Menü tarihi |

---

### 8.2 Create Reservation
**URL:** `POST /meals/reservations`  
**Authentication:** Required

**Request Body:**
```json
{
  "date": "2024-12-25",
  "meal_type": "lunch"
}
```

---

### 8.3 Get My Reservations
**URL:** `GET /meals/reservations/me`  
**Authentication:** Required

---

### 8.4 Cancel Reservation
**URL:** `DELETE /meals/reservations/:id`  
**Authentication:** Required

---

## 9. Events

### 9.1 Get All Events
**URL:** `GET /events`  
**Authentication:** Required

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| category | String | Kategori filtresi |
| upcoming | Boolean | Sadece gelecek etkinlikler |

---

### 9.2 Register for Event
**URL:** `POST /events/:id/register`  
**Authentication:** Required

---

### 9.3 Check-in Event
**URL:** `POST /events/:id/checkin`  
**Authentication:** Required

**Request Body:**
```json
{
  "qr_code": "event-code"
}
```

---

## 10. Notifications

### 10.1 Get Notifications
**URL:** `GET /notifications`  
**Authentication:** Required

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | Number | Sayfa numarası |
| limit | Number | Sayfa başına kayıt |
| category | String | Kategori filtresi |
| read | Boolean | Okunmuş filtresi |

---

### 10.2 Get Recent Notifications
**URL:** `GET /notifications/recent`  
**Authentication:** Required

---

### 10.3 Mark as Read
**URL:** `PUT /notifications/:id/read`  
**Authentication:** Required

---

### 10.4 Mark All as Read
**URL:** `PUT /notifications/mark-all-read`  
**Authentication:** Required

---

### 10.5 Get Preferences
**URL:** `GET /notifications/preferences`  
**Authentication:** Required

---

### 10.6 Update Preferences
**URL:** `PUT /notifications/preferences`  
**Authentication:** Required

**Request Body:**
```json
{
  "email": {
    "academic": true,
    "attendance": true,
    "meal": false
  },
  "push": {
    "academic": true,
    "attendance": true
  }
}
```

---

## 11. Analytics (Admin)

### 11.1 Dashboard Stats
**URL:** `GET /analytics/dashboard`  
**Authentication:** Required  
**Authorization:** Admin only

**Success Response:**
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

### 11.2 Academic Performance
**URL:** `GET /analytics/academic-performance`  
**Authentication:** Required  
**Authorization:** Admin only

---

### 11.3 Attendance Analytics
**URL:** `GET /analytics/attendance`  
**Authentication:** Required  
**Authorization:** Admin only

---

### 11.4 Meal Usage
**URL:** `GET /analytics/meal-usage`  
**Authentication:** Required  
**Authorization:** Admin only

---

### 11.5 Event Analytics
**URL:** `GET /analytics/events`  
**Authentication:** Required  
**Authorization:** Admin only

---

### 11.6 Export Report
**URL:** `GET /analytics/export/:type`  
**Authentication:** Required  
**Authorization:** Admin only

**Path Parameters:**
| Param | Values |
|-------|--------|
| type | academic, attendance, meal, event |

**Query Parameters:**
| Param | Values | Default |
|-------|--------|---------|
| format | csv, json, pdf, excel | csv |

**Response Headers by Format:**
- `csv`: Content-Type: text/csv
- `json`: Content-Type: application/json
- `pdf`: Content-Type: application/pdf
- `excel`: Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet


---

## 12. Sensors (IoT)

### 12.1 Get All Sensors
**URL:** `GET /sensors`  
**Authentication:** Required  
**Authorization:** Admin only

---

### 12.2 Get Sensor Data
**URL:** `GET /sensors/:id/data`  
**Authentication:** Required  
**Authorization:** Admin only

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| start | DateTime | Başlangıç tarihi |
| end | DateTime | Bitiş tarihi |
| aggregation | String | avg, min, max |

---

## 13. Wallet

### 13.1 Get Balance
**URL:** `GET /wallet/balance`  
**Authentication:** Required

---

### 13.2 Add Funds
**URL:** `POST /wallet/add-funds`  
**Authentication:** Required

**Request Body:**
```json
{
  "amount": 100.00
}
```

---

### 13.3 Get Transactions
**URL:** `GET /wallet/transactions`  
**Authentication:** Required

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Token geçersiz veya süresi dolmuş |
| FORBIDDEN | 403 | Bu işlem için yetkiniz yok |
| NOT_FOUND | 404 | Kaynak bulunamadı |
| VALIDATION_ERROR | 400 | Validasyon hatası |
| CONFLICT | 409 | Çakışma (örn: zaten kayıtlı) |
| SERVER_ERROR | 500 | Sunucu hatası |

---

*Son Güncelleme: 24 Aralık 2024*  
*Toplam Endpoint: 60+*
