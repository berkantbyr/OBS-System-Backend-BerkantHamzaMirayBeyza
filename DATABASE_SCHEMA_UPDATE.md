# Database Schema Update - Part 2

## Üniversite Öğrenci Bilgi Sistemi - Veritabanı Şeması

Bu dokümantasyon, Part 2 kapsamında eklenen yeni tabloları ve ilişkileri açıklar.

---

## Yeni Tablolar

### 1. courses

Ders bilgilerini tutar.

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  credits INTEGER DEFAULT 3,
  ects INTEGER DEFAULT 5,
  syllabus_url VARCHAR(500),
  department_id UUID REFERENCES departments(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- Soft delete
);

CREATE INDEX idx_courses_code ON courses(code);
CREATE INDEX idx_courses_department ON courses(department_id);
```

**Alanlar:**
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | UUID | Primary key |
| code | VARCHAR(20) | Ders kodu (CS101, MATH201, vb.) |
| name | VARCHAR(255) | Ders adı |
| description | TEXT | Ders açıklaması |
| credits | INTEGER | Kredi |
| ects | INTEGER | AKTS |
| syllabus_url | VARCHAR(500) | Ders izlencesi linki |
| department_id | UUID | Bölüm FK |
| is_active | BOOLEAN | Aktif/Pasif |

---

### 2. course_sections

Ders sectionlarını (şubeleri) tutar.

```sql
CREATE TABLE course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  section_number INTEGER DEFAULT 1,
  semester VARCHAR(10) NOT NULL, -- fall, spring, summer
  year INTEGER NOT NULL,
  instructor_id UUID REFERENCES faculty(id),
  classroom_id UUID REFERENCES classrooms(id),
  capacity INTEGER DEFAULT 30,
  enrolled_count INTEGER DEFAULT 0,
  schedule_json JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sections_course ON course_sections(course_id);
CREATE INDEX idx_sections_semester ON course_sections(semester, year);
CREATE INDEX idx_sections_instructor ON course_sections(instructor_id);
CREATE UNIQUE INDEX idx_sections_unique ON course_sections(course_id, section_number, semester, year);
```

**schedule_json örnek:**
```json
[
  { "day": "Monday", "start_time": "09:00", "end_time": "11:00" },
  { "day": "Wednesday", "start_time": "09:00", "end_time": "11:00" }
]
```

---

### 3. course_prerequisites

Ders önkoşul ilişkilerini tutar.

```sql
CREATE TABLE course_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES courses(id),
  min_grade VARCHAR(2) DEFAULT 'DD',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, prerequisite_course_id)
);

CREATE INDEX idx_prereq_course ON course_prerequisites(course_id);
CREATE INDEX idx_prereq_prereq ON course_prerequisites(prerequisite_course_id);
```

**min_grade değerleri:**
- AA, BA, BB, CB, CC, DC, DD (geçer notlar)
- Default: DD

---

### 4. enrollments

Öğrenci ders kayıtlarını tutar.

```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  section_id UUID NOT NULL REFERENCES course_sections(id),
  enrollment_date DATE DEFAULT CURRENT_DATE,
  drop_date DATE,
  status VARCHAR(20) DEFAULT 'enrolled',
  midterm_grade DECIMAL(5,2),
  final_grade DECIMAL(5,2),
  homework_grade DECIMAL(5,2),
  average_grade DECIMAL(5,2),
  letter_grade VARCHAR(2),
  grade_point DECIMAL(3,2),
  is_repeat BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, section_id)
);

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_section ON enrollments(section_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
```

**status değerleri:**
- enrolled: Kayıtlı
- completed: Tamamlandı (geçti)
- failed: Kaldı
- dropped: Bıraktı
- withdrawn: Geri çekildi

---

### 5. attendance_sessions

Yoklama oturumlarını tutar.

```sql
CREATE TABLE attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES course_sections(id),
  instructor_id UUID NOT NULL REFERENCES faculty(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geofence_radius INTEGER DEFAULT 15, -- meters
  qr_code VARCHAR(50) UNIQUE,
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_section ON attendance_sessions(section_id);
CREATE INDEX idx_sessions_date ON attendance_sessions(date);
CREATE INDEX idx_sessions_status ON attendance_sessions(status);
CREATE INDEX idx_sessions_qr ON attendance_sessions(qr_code);
```

**status değerleri:**
- active: Aktif (check-in açık)
- closed: Kapalı
- cancelled: İptal

---

### 6. attendance_records

Öğrenci yoklama kayıtlarını tutar.

```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id),
  student_id UUID NOT NULL REFERENCES students(id),
  check_in_time TIMESTAMP DEFAULT NOW(),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy DECIMAL(10, 2), -- GPS accuracy in meters
  distance_from_center INTEGER, -- Distance from classroom in meters
  check_in_method VARCHAR(20) DEFAULT 'gps', -- gps, qr_code, manual
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  status VARCHAR(20) DEFAULT 'present',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

CREATE INDEX idx_records_session ON attendance_records(session_id);
CREATE INDEX idx_records_student ON attendance_records(student_id);
CREATE INDEX idx_records_flagged ON attendance_records(is_flagged);
```

**status değerleri:**
- present: Katıldı
- late: Geç kaldı (15+ dakika)
- excused: Mazeretli

**check_in_method değerleri:**
- gps: GPS ile check-in
- qr_code: QR kod ile check-in
- manual: Manuel giriş

---

### 7. excuse_requests

Mazeret taleplerini tutar.

```sql
CREATE TABLE excuse_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id),
  reason TEXT NOT NULL,
  excuse_type VARCHAR(50) DEFAULT 'other', -- medical, family, academic, other
  document_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by UUID REFERENCES faculty(id),
  reviewed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, session_id)
);

CREATE INDEX idx_excuse_student ON excuse_requests(student_id);
CREATE INDEX idx_excuse_session ON excuse_requests(session_id);
CREATE INDEX idx_excuse_status ON excuse_requests(status);
```

**status değerleri:**
- pending: Beklemede
- approved: Onaylandı
- rejected: Reddedildi

---

### 8. classrooms

Derslik bilgilerini tutar.

```sql
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building VARCHAR(100) NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  capacity INTEGER DEFAULT 50,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  features_json JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(building, room_number)
);

CREATE INDEX idx_classrooms_building ON classrooms(building);
```

**features_json örnek:**
```json
{
  "projector": true,
  "whiteboard": true,
  "air_conditioning": true,
  "computer_lab": false
}
```

---

## Entity Relationship Diagram

```
                    ┌──────────────┐
                    │  departments │
                    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │    courses   │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────┴─────┐   ┌──────┴──────┐   ┌─────┴──────┐
    │ course_   │   │   course_   │   │ classrooms │
    │ prereqs   │   │  sections   │   └────────────┘
    └───────────┘   └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────┴─────┐   ┌──────┴──────┐   ┌─────┴──────┐
    │enrollments│   │ attendance_ │   │   faculty  │
    └─────┬─────┘   │  sessions   │   └────────────┘
          │         └──────┬──────┘
          │                │
    ┌─────┴─────┐   ┌──────┴──────┐
    │  students │   │ attendance_ │
    └───────────┘   │   records   │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │   excuse_   │
                    │  requests   │
                    └─────────────┘
```

---

## İlişkiler

### One-to-Many

| Parent | Child | Relationship |
|--------|-------|--------------|
| departments | courses | 1:N |
| courses | course_sections | 1:N |
| courses | course_prerequisites | 1:N |
| course_sections | enrollments | 1:N |
| course_sections | attendance_sessions | 1:N |
| students | enrollments | 1:N |
| students | attendance_records | 1:N |
| faculty | course_sections | 1:N |
| faculty | attendance_sessions | 1:N |
| attendance_sessions | attendance_records | 1:N |
| attendance_sessions | excuse_requests | 1:N |
| classrooms | course_sections | 1:N |

### Many-to-Many (through tables)

| Entity 1 | Entity 2 | Through |
|----------|----------|---------|
| students | course_sections | enrollments |
| students | attendance_sessions | attendance_records |
| courses | courses | course_prerequisites (self-referencing) |

---

## Migration Script

```sql
-- Migration: Part 2 Tables
-- Created: 2024-12-14

BEGIN;

-- 1. Courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  credits INTEGER DEFAULT 3,
  ects INTEGER DEFAULT 5,
  syllabus_url VARCHAR(500),
  department_id UUID REFERENCES departments(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- 2. Course sections table
CREATE TABLE IF NOT EXISTS course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  section_number INTEGER DEFAULT 1,
  semester VARCHAR(10) NOT NULL,
  year INTEGER NOT NULL,
  instructor_id UUID REFERENCES faculty(id),
  classroom_id UUID REFERENCES classrooms(id),
  capacity INTEGER DEFAULT 30,
  enrolled_count INTEGER DEFAULT 0,
  schedule_json JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Course prerequisites table
CREATE TABLE IF NOT EXISTS course_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES courses(id),
  min_grade VARCHAR(2) DEFAULT 'DD',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, prerequisite_course_id)
);

-- 4. Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  section_id UUID NOT NULL REFERENCES course_sections(id),
  enrollment_date DATE DEFAULT CURRENT_DATE,
  drop_date DATE,
  status VARCHAR(20) DEFAULT 'enrolled',
  midterm_grade DECIMAL(5,2),
  final_grade DECIMAL(5,2),
  homework_grade DECIMAL(5,2),
  average_grade DECIMAL(5,2),
  letter_grade VARCHAR(2),
  grade_point DECIMAL(3,2),
  is_repeat BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, section_id)
);

-- 5. Attendance sessions table
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES course_sections(id),
  instructor_id UUID NOT NULL REFERENCES faculty(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geofence_radius INTEGER DEFAULT 15,
  qr_code VARCHAR(50) UNIQUE,
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Attendance records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id),
  student_id UUID NOT NULL REFERENCES students(id),
  check_in_time TIMESTAMP DEFAULT NOW(),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy DECIMAL(10, 2),
  distance_from_center INTEGER,
  check_in_method VARCHAR(20) DEFAULT 'gps',
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  status VARCHAR(20) DEFAULT 'present',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

-- 7. Excuse requests table
CREATE TABLE IF NOT EXISTS excuse_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id),
  reason TEXT NOT NULL,
  excuse_type VARCHAR(50) DEFAULT 'other',
  document_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by UUID REFERENCES faculty(id),
  reviewed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, session_id)
);

-- 8. Classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building VARCHAR(100) NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  capacity INTEGER DEFAULT 50,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  features_json JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(building, room_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_sections_course ON course_sections(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_section ON attendance_sessions(section_id);
CREATE INDEX IF NOT EXISTS idx_records_session ON attendance_records(session_id);

COMMIT;
```

---

*Son güncelleme: Aralık 2024*
