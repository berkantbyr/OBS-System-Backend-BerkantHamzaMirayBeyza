# API Documentation - Part 2

## Üniversite Öğrenci Bilgi Sistemi - Academic & Attendance API

Bu dokümantasyon, Part 2 kapsamında eklenen Academic Management ve GPS Attendance endpointlerini açıklar.

---

## İçindekiler

1. [Academic Management Endpoints](#academic-management-endpoints)
   - [Courses](#courses)
   - [Course Sections](#course-sections)
   - [Enrollments](#enrollments)
   - [Grades](#grades)
2. [Attendance System Endpoints](#attendance-system-endpoints)
   - [Sessions (Faculty)](#sessions-faculty)
   - [Check-in (Student)](#check-in-student)
   - [Excuse Requests](#excuse-requests)
3. [Algorithm Explanations](#algorithm-explanations)

---

## Academic Management Endpoints

### Courses

#### GET /api/v1/courses
Ders listesi (pagination, filtering, search)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Sayfa numarası |
| limit | number | 10 | Sayfa başına kayıt |
| search | string | - | Ders kodu veya adında arama |
| department_id | number | - | Bölüme göre filtreleme |
| is_active | boolean | true | Aktif dersleri getir |
| sort_by | string | code | Sıralama alanı |
| sort_order | string | ASC | Sıralama yönü |

**Response:**
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": 1,
        "code": "CS101",
        "name": "Programlamaya Giriş",
        "description": "...",
        "credits": 3,
        "ects": 5,
        "department": {
          "id": 1,
          "name": "Bilgisayar Mühendisliği",
          "code": "CS"
        }
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

---

#### GET /api/v1/courses/:id
Ders detayları (prerequisites dahil)

**Response:**
```json
{
  "success": true,
  "data": {
    "course": {
      "id": 1,
      "code": "CS101",
      "name": "Programlamaya Giriş",
      "credits": 3,
      "ects": 5,
      "syllabus_url": "https://..."
    },
    "prerequisites": [
      {
        "id": 2,
        "code": "MATH101",
        "name": "Matematik I",
        "min_grade": "DD",
        "completed": true
      }
    ],
    "sections": [
      {
        "id": 1,
        "sectionNumber": 1,
        "semester": "fall",
        "year": 2024,
        "instructor": "Dr. Ahmet Yılmaz",
        "classroom": "A-101",
        "capacity": 50,
        "enrolledCount": 35,
        "availableSeats": 15,
        "schedule": [{"day": "Monday", "start_time": "09:00", "end_time": "11:00"}]
      }
    ]
  }
}
```

---

#### POST /api/v1/courses (Admin only)
Yeni ders oluşturma

**Request Body:**
```json
{
  "code": "CS301",
  "name": "Veri Tabanı Sistemleri",
  "description": "İlişkisel veritabanları...",
  "credits": 4,
  "ects": 6,
  "syllabus_url": "https://...",
  "department_id": 1,
  "prerequisites": [
    { "course_id": 1, "min_grade": "DD" }
  ]
}
```

---

#### PUT /api/v1/courses/:id (Admin only)
Ders güncelleme

---

#### DELETE /api/v1/courses/:id (Admin only)
Ders silme (soft delete)

---

### Course Sections

#### GET /api/v1/sections
Section listesi (filtering by semester, instructor)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| course_id | number | Derse göre filtreleme |
| instructor_id | number | Öğretim üyesine göre filtreleme |
| semester | string | fall/spring/summer |
| year | number | Yıl |
| is_active | boolean | Aktif sectionlar |

---

#### GET /api/v1/sections/:id
Section detayları

---

#### POST /api/v1/sections (Admin only)
Section oluşturma

**Request Body:**
```json
{
  "course_id": 1,
  "section_number": 1,
  "semester": "fall",
  "year": 2024,
  "instructor_id": 5,
  "classroom_id": 10,
  "capacity": 50,
  "schedule_json": [
    { "day": "Monday", "start_time": "09:00", "end_time": "11:00" },
    { "day": "Wednesday", "start_time": "09:00", "end_time": "11:00" }
  ]
}
```

---

#### PUT /api/v1/sections/:id (Admin only)
Section güncelleme

---

### Enrollments

#### POST /api/v1/enrollments (Student)
Derse kayıt olma

**Request Body:**
```json
{
  "section_id": 1
}
```

**Önkoşul Kontrolü (Recursive):**
```javascript
function checkPrerequisites(courseId, studentId) {
  prerequisites = getPrerequisites(courseId);
  for (prereq of prerequisites) {
    if (!hasCompletedCourse(studentId, prereq)) {
      throw new Error("Prerequisite not met");
    }
    // Recursive check
    checkPrerequisites(prereq, studentId);
  }
}
```

**Çakışma Kontrolü:**
```javascript
function hasScheduleConflict(studentSchedule, newSectionSchedule) {
  for (existingClass of studentSchedule) {
    if (timeOverlap(existingClass, newSectionSchedule)) {
      return true;
    }
  }
  return false;
}
```

**Kapasite Kontrolü (Atomic):**
```sql
UPDATE course_sections 
SET enrolled_count = enrolled_count + 1 
WHERE id = ? AND enrolled_count < capacity;
-- Check affected rows, if 0 then full
```

**Response:**
```json
{
  "success": true,
  "message": "Kayıt başarılı",
  "data": {
    "enrollment": {
      "id": 1,
      "course": { "code": "CS101", "name": "Programlamaya Giriş" },
      "sectionNumber": 1,
      "status": "enrolled",
      "enrollmentDate": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

#### DELETE /api/v1/enrollments/:id (Student)
Dersi bırakma

**Kontroller:**
- Drop period kontrolü (ilk 4 hafta)
- Section kapasitesi güncelleme
- Enrollment durumu güncelleme

---

#### GET /api/v1/enrollments/my-courses (Student)
Kayıtlı derslerim

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| semester | string | Dönem filtresi |
| year | number | Yıl filtresi |
| status | string | enrolled/completed/failed/dropped |

---

#### GET /api/v1/enrollments/students/:sectionId (Faculty)
Dersin öğrenci listesi

---

### Grades

#### GET /api/v1/grades/my-grades (Student)
Notlarım

**Response:**
```json
{
  "success": true,
  "data": {
    "grades": [
      {
        "enrollmentId": 1,
        "course": { "code": "CS101", "name": "Programlama", "credits": 3 },
        "semester": "fall",
        "year": 2024,
        "grades": {
          "midterm": 75,
          "final": 80,
          "homework": 85,
          "average": 79,
          "letterGrade": "CB",
          "gradePoint": 2.5
        },
        "status": "completed"
      }
    ],
    "summary": {
      "cgpa": 3.25,
      "totalCredits": 45,
      "semesters": [
        { "semester": "fall", "year": 2024, "gpa": 3.25, "credits": 15 }
      ]
    }
  }
}
```

---

#### GET /api/v1/grades/transcript (Student)
Transkript JSON

---

#### GET /api/v1/grades/transcript/pdf (Student)
Transkript PDF

**Headers:** `Content-Type: text/html` (later application/pdf with Puppeteer)

---

#### POST /api/v1/grades (Faculty)
Not girişi

**Request Body:**
```json
{
  "enrollment_id": 1,
  "midterm": 75,
  "final": 80,
  "homework": 85
}
```

**Auto-calculated:**
- average_grade = midterm * 0.3 + final * 0.5 + homework * 0.2
- letter_grade: AA (90+), BA (85-89), BB (80-84), CB (75-79), CC (70-74), DC (65-69), DD (60-64), FD (50-59), FF (<50)
- grade_point: AA=4.0, BA=3.5, BB=3.0, CB=2.5, CC=2.0, DC=1.5, DD=1.0, FD=0.5, FF=0.0

---

## Attendance System Endpoints

### Sessions (Faculty)

#### POST /api/v1/attendance/sessions
Yoklama oturumu açma

**Request Body:**
```json
{
  "section_id": 1,
  "duration_minutes": 30,
  "geofence_radius": 15
}
```

**İşlemler:**
1. Section bilgilerini al
2. Classroom GPS koordinatlarını veritabanından al
3. Geofence radius'u ayarla (default 15m)
4. Unique QR code oluştur
5. Expiry süresi ayarla (30 dakika)
6. Kayıtlı öğrencilere push notification gönder

**Response:**
```json
{
  "success": true,
  "message": "Yoklama oturumu başlatıldı",
  "data": {
    "session": {
      "id": 1,
      "course": { "code": "CS101", "name": "Programlama" },
      "sectionNumber": 1,
      "date": "2024-01-15",
      "startTime": "09:00",
      "endTime": "09:30",
      "expiresAt": "2024-01-15T09:30:00Z",
      "qrCode": "ABC123XYZ",
      "location": {
        "latitude": 41.0082,
        "longitude": 28.9784,
        "radius": 15,
        "classroom": "A-101"
      }
    },
    "enrolledStudents": 35
  }
}
```

---

#### GET /api/v1/attendance/sessions/:id
Oturum detayları

---

#### PUT /api/v1/attendance/sessions/:id/close
Oturumu kapatma

---

#### GET /api/v1/attendance/sessions/my-sessions (Faculty)
Benim oturumlarım

---

### Check-in (Student)

#### POST /api/v1/attendance/sessions/:id/checkin
Yoklama verme

**Request Body:**
```json
{
  "latitude": 41.0082,
  "longitude": 28.9784,
  "accuracy": 10
}
```

**GPS Validation Process:**

1. **Get session details:**
   ```javascript
   session = getSession(sessionId);
   if (session.status !== 'active') throw Error("Session not active");
   if (session.expires_at < now) throw Error("Session expired");
   ```

2. **Calculate distance (Haversine formula):**
   ```javascript
   function haversine(lat1, lon1, lat2, lon2) {
     const R = 6371000; // Earth radius in meters
     const dLat = toRad(lat2 - lat1);
     const dLon = toRad(lon2 - lon1);
     const a = sin(dLat/2)² + cos(lat1) * cos(lat2) * sin(dLon/2)²;
     const c = 2 * atan2(√a, √(1-a));
     return R * c;
   }
   ```

3. **Validate distance:**
   ```javascript
   distance = haversine(session.lat, session.lon, student.lat, student.lon);
   allowedDistance = session.radius + min(accuracy, 20) + 5;
   if (distance > allowedDistance) {
     throw Error(`${distance}m uzaklıktasınız. Max: ${allowedDistance}m`);
   }
   ```

4. **Spoofing Detection:**
   ```javascript
   flags = [];
   if (accuracy < 3) flags.push("Suspiciously high accuracy");
   if (accuracy > 100) flags.push("GPS accuracy too poor");
   if (coords exactly match classroom) flags.push("Exact coordinate match");
   
   // Check impossible travel
   lastRecord = getLastAttendanceRecord(studentId, 30 minutes);
   if (lastRecord) {
     timeDiff = now - lastRecord.time;
     distance = haversine(lastRecord, currentLocation);
     maxPossible = timeDiff * 33.3; // 120 km/h max
     if (distance > maxPossible) flags.push("Impossible travel");
   }
   
   if (flags.length > 0) {
     record.is_flagged = true;
     record.flag_reason = flags.join("; ");
     notifyInstructor(record);
   }
   ```

5. **Record attendance:**
   ```javascript
   record = createRecord({
     session_id, student_id,
     check_in_time: now,
     latitude, longitude, accuracy,
     distance_from_center: distance,
     is_flagged: flags.length > 0,
     flag_reason: flags.join("; "),
     status: isLate ? 'late' : 'present'
   });
   ```

**Response:**
```json
{
  "success": true,
  "message": "Yoklama başarıyla verildi",
  "data": {
    "status": "present",
    "distance": 8,
    "checkInTime": "2024-01-15T09:05:00Z",
    "isFlagged": false,
    "flagReason": null
  }
}
```

---

#### GET /api/v1/attendance/my-attendance (Student)
Yoklama durumum

---

#### GET /api/v1/attendance/active-sessions (Student)
Aktif oturumlar (check-in yapılabilecek)

---

#### GET /api/v1/attendance/report/:sectionId (Faculty)
Yoklama raporu

**Response:**
```json
{
  "success": true,
  "data": {
    "course": { "code": "CS101", "name": "Programlama" },
    "sectionNumber": 1,
    "semester": "fall",
    "year": 2024,
    "students": [
      {
        "studentId": 1,
        "studentNumber": "2021001",
        "firstName": "Ahmet",
        "lastName": "Yılmaz",
        "totalSessions": 10,
        "present": 8,
        "late": 1,
        "excused": 1,
        "absent": 0,
        "attendancePercentage": 100,
        "status": "ok",
        "flaggedCount": 0,
        "isFlagged": false
      }
    ]
  }
}
```

---

### Excuse Requests

#### POST /api/v1/attendance/excuse-requests (Student)
Mazeret bildirme

**Request Body (multipart/form-data):**
```
session_id: 1
reason: "Hastaneye gittim"
excuse_type: "medical"
document: [file]
```

---

#### GET /api/v1/attendance/excuse-requests (Faculty)
Mazeret listesi

---

#### PUT /api/v1/attendance/excuse-requests/:id/approve (Faculty)
Mazeret onaylama

---

#### PUT /api/v1/attendance/excuse-requests/:id/reject (Faculty)
Mazeret reddetme

---

## Algorithm Explanations

### 1. Haversine Formula (GPS Distance)

İki GPS koordinatı arasındaki mesafeyi metre cinsinden hesaplar.

```javascript
const EARTH_RADIUS = 6371000; // meters

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat/2) ** 2 + 
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon/2) ** 2;
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return EARTH_RADIUS * c;
}
```

### 2. Recursive Prerequisite Checking

Dersin tüm önkoşullarını (nested dahil) kontrol eder.

```javascript
async function checkAllPrerequisites(courseId, studentId, visited = new Set()) {
  if (visited.has(courseId)) return []; // Prevent infinite loop
  visited.add(courseId);

  const prerequisites = await getPrerequisites(courseId);
  const missing = [];

  for (const prereq of prerequisites) {
    const completed = await hasCompletedCourse(studentId, prereq.id, prereq.min_grade);
    
    if (!completed) {
      missing.push(prereq);
    }
    
    // Recursive check
    const nestedMissing = await checkAllPrerequisites(prereq.id, studentId, visited);
    missing.push(...nestedMissing);
  }

  return missing;
}
```

### 3. Schedule Conflict Detection

İki zaman diliminin çakışıp çakışmadığını kontrol eder.

```javascript
function timeSlotsOverlap(slot1, slot2) {
  if (slot1.day.toLowerCase() !== slot2.day.toLowerCase()) {
    return false;
  }
  
  const toMinutes = time => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  
  const start1 = toMinutes(slot1.start_time);
  const end1 = toMinutes(slot1.end_time);
  const start2 = toMinutes(slot2.start_time);
  const end2 = toMinutes(slot2.end_time);
  
  return start1 < end2 && end1 > start2;
}
```

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Geçersiz istek parametreleri |
| 401 | Unauthorized | Kimlik doğrulama gerekli |
| 403 | Forbidden | Yetkisiz erişim |
| 404 | Not Found | Kaynak bulunamadı |
| 409 | Conflict | Çakışma (zaten kayıtlı, section dolu, vb.) |
| 500 | Internal Server Error | Sunucu hatası |

---

## Rate Limiting

- Tüm endpointler: 100 istek/dakika
- Check-in endpoint: 10 istek/dakika (spam önleme)

---

*Son güncelleme: Aralık 2024*
