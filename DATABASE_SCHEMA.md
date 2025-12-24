# DKÜ OBS - Veritabanı Şeması (DATABASE_SCHEMA.md)

## 1. Genel Bakış

| Özellik | Değer |
|---------|-------|
| DBMS | PostgreSQL 15.x |
| ORM | Sequelize 6.x |
| Toplam Tablo | 30+ |
| İlişki Tipi | Relational |

---

## 2. ER Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    users    │────<│  students   │     │   faculty   │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │           ┌───────┴───────┐   ┌───────┴───────┐
       │           │  enrollments  │   │   sections    │
       │           └───────┬───────┘   └───────┬───────┘
       │                   │                   │
       │           ┌───────┴───────────────────┘
       │           │
       │    ┌──────┴──────┐     ┌─────────────┐
       │    │   grades    │     │   courses   │
       │    └─────────────┘     └─────────────┘
       │
┌──────┴──────┐     ┌─────────────┐     ┌─────────────┐
│notifications│     │   events    │     │    meals    │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 3. Tablolar

### 3.1 Users (Kullanıcılar)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

---

### 3.2 Students (Öğrenciler)
```sql
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    student_number VARCHAR(20) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    enrollment_year INTEGER NOT NULL,
    current_semester INTEGER DEFAULT 1,
    gpa DECIMAL(3,2) DEFAULT 0.00,
    advisor_id UUID REFERENCES faculty(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_department ON students(department);
```

---

### 3.3 Faculty (Öğretim Üyeleri)
```sql
CREATE TABLE faculty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    faculty_number VARCHAR(20) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    title VARCHAR(50), -- Prof., Doç., Dr., etc.
    office_location VARCHAR(100),
    office_hours VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 3.4 Courses (Dersler)
```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    credits INTEGER NOT NULL,
    department VARCHAR(100) NOT NULL,
    level VARCHAR(20), -- undergraduate, graduate
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_courses_code ON courses(code);
CREATE INDEX idx_courses_department ON courses(department);
```

---

### 3.5 Course_Sections (Ders Şubeleri)
```sql
CREATE TABLE course_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    instructor_id UUID REFERENCES faculty(id),
    section_number VARCHAR(10) NOT NULL,
    semester VARCHAR(20) NOT NULL, -- Fall, Spring, Summer
    year INTEGER NOT NULL,
    capacity INTEGER DEFAULT 50,
    enrolled_count INTEGER DEFAULT 0,
    day_of_week VARCHAR(20),
    start_time TIME,
    end_time TIME,
    classroom_id UUID REFERENCES classrooms(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sections_course ON course_sections(course_id);
CREATE INDEX idx_sections_instructor ON course_sections(instructor_id);
```

---

### 3.6 Enrollments (Kayıtlar)
```sql
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id),
    section_id UUID REFERENCES course_sections(id),
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, enrolled, dropped, completed, rejected
    final_grade VARCHAR(5),
    points DECIMAL(4,2),
    enrollment_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, section_id)
);

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_section ON enrollments(section_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
```

---

### 3.7 Grades (Notlar)
```sql
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES enrollments(id),
    grade_type VARCHAR(50) NOT NULL,
    -- midterm, final, quiz, assignment, project
    score DECIMAL(5,2),
    max_score DECIMAL(5,2) DEFAULT 100,
    weight DECIMAL(4,2),
    graded_by UUID REFERENCES users(id),
    graded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_grades_enrollment ON grades(enrollment_id);
```

---

### 3.8 Attendance_Sessions (Yoklama Oturumları)
```sql
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES course_sections(id),
    created_by UUID REFERENCES users(id),
    qr_code VARCHAR(100) UNIQUE,
    session_date DATE NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    gps_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attendance_sessions_section ON attendance_sessions(section_id);
CREATE INDEX idx_attendance_sessions_qr ON attendance_sessions(qr_code);
```

---

### 3.9 Attendance_Records (Yoklama Kayıtları)
```sql
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES attendance_sessions(id),
    student_id UUID REFERENCES students(id),
    status VARCHAR(20) DEFAULT 'present',
    -- present, absent, late, excused
    check_in_time TIMESTAMP,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

CREATE INDEX idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX idx_attendance_records_student ON attendance_records(student_id);
```

---

### 3.10 Events (Etkinlikler)
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    -- academic, social, sports, cultural, career
    location VARCHAR(255),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    capacity INTEGER,
    organizer_id UUID REFERENCES users(id),
    qr_code VARCHAR(100) UNIQUE,
    registration_deadline TIMESTAMP,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_date ON events(start_date);
```

---

### 3.11 Event_Registrations
```sql
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id),
    user_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'registered',
    checked_in BOOLEAN DEFAULT false,
    check_in_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);
```

---

### 3.12 Meals (Yemek Menüleri)
```sql
CREATE TABLE meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    -- breakfast, lunch, dinner
    menu_items JSONB,
    price DECIMAL(10,2),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_meals_date ON meals(date);
```

---

### 3.13 Meal_Reservations
```sql
CREATE TABLE meal_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    meal_id UUID REFERENCES meals(id),
    status VARCHAR(20) DEFAULT 'reserved',
    -- reserved, used, cancelled
    qr_code VARCHAR(100) UNIQUE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, meal_id)
);
```

---

### 3.14 Wallets
```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 3.15 Wallet_Transactions
```sql
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id),
    type VARCHAR(20) NOT NULL, -- credit, debit
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    reference_type VARCHAR(50), -- meal, deposit
    reference_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 3.16 Notifications
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50),
    category VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    link VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
```

---

### 3.17 Notification_Preferences
```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) UNIQUE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 3.18 Sensor_Data (IoT)
```sql
CREATE TABLE sensor_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id VARCHAR(50) NOT NULL,
    sensor_type VARCHAR(50),
    -- temperature, humidity, occupancy
    value DECIMAL(10,4),
    unit VARCHAR(20),
    location VARCHAR(100),
    recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sensor_data_sensor ON sensor_data(sensor_id);
CREATE INDEX idx_sensor_data_time ON sensor_data(recorded_at);
```

---

### 3.19 Classrooms
```sql
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building VARCHAR(100) NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    capacity INTEGER,
    has_projector BOOLEAN DEFAULT true,
    has_ac BOOLEAN DEFAULT true,
    floor INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(building, room_number)
);
```

---

### 3.20 Announcements
```sql
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author_id UUID REFERENCES users(id),
    target_audience VARCHAR(50),
    -- all, students, faculty
    priority VARCHAR(20) DEFAULT 'normal',
    is_published BOOLEAN DEFAULT true,
    published_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 3.21 Excuses (Mazeretler)
```sql
CREATE TABLE excuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id),
    session_id UUID REFERENCES attendance_sessions(id),
    reason TEXT NOT NULL,
    document_path VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. İlişkiler

| Tablo A | İlişki | Tablo B |
|---------|--------|---------|
| users | 1:1 | students |
| users | 1:1 | faculty |
| users | 1:N | notifications |
| students | 1:N | enrollments |
| faculty | 1:N | course_sections |
| courses | 1:N | course_sections |
| course_sections | 1:N | enrollments |
| enrollments | 1:N | grades |
| course_sections | 1:N | attendance_sessions |
| attendance_sessions | 1:N | attendance_records |
| events | 1:N | event_registrations |
| meals | 1:N | meal_reservations |
| users | 1:1 | wallets |
| wallets | 1:N | wallet_transactions |

---

## 5. Indexler

Performans için oluşturulan indexler:

| Tablo | Index | Kolon |
|-------|-------|-------|
| users | idx_users_email | email |
| users | idx_users_role | role |
| students | idx_students_department | department |
| enrollments | idx_enrollments_status | status |
| attendance_sessions | idx_attendance_sessions_qr | qr_code |
| notifications | idx_notifications_user | user_id |
| sensor_data | idx_sensor_data_time | recorded_at |

---

*Son Güncelleme: 24 Aralık 2024*  
*Toplam Tablo: 30+*
