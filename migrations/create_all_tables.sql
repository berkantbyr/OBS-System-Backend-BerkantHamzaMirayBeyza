-- ============================================================================
-- Master Migration: Complete Database Schema
-- Created: 2025-12-30
-- Description: Tüm tabloları oluşturan master migration dosyası
--              Deploy edildiğinde tüm tablolar otomatik oluşturulur
-- ============================================================================

-- ============================================================================
-- PART 1 & 2: Temel Sistem ve Akademik Yönetim Tabloları
-- ============================================================================

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  faculty VARCHAR(150),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role ENUM('student', 'faculty', 'admin', 'staff') NOT NULL DEFAULT 'student',
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  email_verified_at DATETIME NULL,
  last_login DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  student_number VARCHAR(50) NOT NULL UNIQUE,
  department_id CHAR(36),
  enrollment_year INT,
  gpa DECIMAL(3, 2),
  status ENUM('active', 'graduated', 'suspended', 'transferred') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  INDEX idx_student_number (student_number),
  INDEX idx_department (department_id)
);

-- Faculty table
CREATE TABLE IF NOT EXISTS faculty (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  employee_number VARCHAR(50) NOT NULL UNIQUE,
  department_id CHAR(36),
  title VARCHAR(100),
  office_location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  INDEX idx_employee_number (employee_number)
);

-- Classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
  id CHAR(36) PRIMARY KEY,
  building VARCHAR(150) NOT NULL,
  room_number VARCHAR(50) NOT NULL,
  capacity INT,
  floor INT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  features_json JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_classroom (building, room_number),
  INDEX idx_building (building)
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  credits INT NOT NULL,
  department_id CHAR(36),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  INDEX idx_code (code),
  INDEX idx_department (department_id)
);

-- Course Sections table
CREATE TABLE IF NOT EXISTS course_sections (
  id CHAR(36) PRIMARY KEY,
  course_id CHAR(36) NOT NULL,
  section_number VARCHAR(10) NOT NULL,
  semester ENUM('fall', 'spring', 'summer') NOT NULL,
  year INT NOT NULL,
  instructor_id CHAR(36),
  max_enrollment INT,
  current_enrollment INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_section (course_id, section_number, semester, year),
  INDEX idx_course (course_id),
  INDEX idx_instructor (instructor_id)
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id CHAR(36) PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  section_id CHAR(36) NOT NULL,
  enrollment_date DATE DEFAULT (CURRENT_DATE),
  status VARCHAR(20) DEFAULT 'enrolled',
  grade VARCHAR(5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (student_id, section_id),
  INDEX idx_student (student_id),
  INDEX idx_section (section_id)
);

-- Course Prerequisites table
CREATE TABLE IF NOT EXISTS course_prerequisites (
  id CHAR(36) PRIMARY KEY,
  course_id CHAR(36) NOT NULL,
  prerequisite_course_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (prerequisite_course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_prerequisite (course_id, prerequisite_course_id)
);

-- ============================================================================
-- PART 3: Yemek Servisi, Cüzdan, Etkinlik ve Programlama Tabloları
-- ============================================================================

-- Cafeterias table
CREATE TABLE IF NOT EXISTS cafeterias (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(255),
  capacity INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

-- Meal Menus table
CREATE TABLE IF NOT EXISTS meal_menus (
  id CHAR(36) PRIMARY KEY,
  cafeteria_id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL,
  items_json JSON,
  nutrition_json JSON,
  price DECIMAL(10, 2) DEFAULT 0,
  meal_time TIME,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cafeteria_id) REFERENCES cafeterias(id) ON DELETE CASCADE,
  UNIQUE KEY unique_menu (cafeteria_id, date, meal_type),
  INDEX idx_date (date),
  INDEX idx_cafeteria_date (cafeteria_id, date),
  INDEX idx_published (is_published)
);

-- Meal Reservations table
CREATE TABLE IF NOT EXISTS meal_reservations (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  menu_id CHAR(36) NOT NULL,
  cafeteria_id CHAR(36) NOT NULL,
  meal_type VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  qr_code VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'reserved',
  used_at DATETIME NULL,
  -- Transfer fields
  transferred_to_user_id CHAR(36) NULL,
  transferred_from_user_id CHAR(36) NULL,
  transfer_status VARCHAR(20) NULL,
  transfer_student_number VARCHAR(50) NULL,
  transferred_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_id) REFERENCES meal_menus(id) ON DELETE CASCADE,
  FOREIGN KEY (cafeteria_id) REFERENCES cafeterias(id) ON DELETE CASCADE,
  FOREIGN KEY (transferred_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (transferred_from_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_date (user_id, date),
  INDEX idx_transferred_to (transferred_to_user_id),
  INDEX idx_transfer_status (transfer_status),
  INDEX idx_date (date)
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) PRIMARY KEY,
  wallet_id CHAR(36) NOT NULL,
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  reference_type VARCHAR(50),
  reference_id CHAR(36),
  description VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
  INDEX idx_wallet (wallet_id),
  INDEX idx_reference (reference_type, reference_id),
  INDEX idx_created_at (created_at)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location VARCHAR(255),
  capacity INT,
  registered_count INT NOT NULL DEFAULT 0,
  registration_deadline DATETIME,
  is_paid BOOLEAN DEFAULT FALSE,
  price DECIMAL(10, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  INDEX idx_status (status)
);

-- Event Registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id CHAR(36) PRIMARY KEY,
  event_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  qr_code VARCHAR(100) NOT NULL UNIQUE,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at DATETIME NULL,
  custom_fields_json JSON,
  status VARCHAR(20) NOT NULL DEFAULT 'registered',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_registration (event_id, user_id),
  INDEX idx_event (event_id),
  INDEX idx_user (user_id)
);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id CHAR(36) PRIMARY KEY,
  section_id CHAR(36) NOT NULL,
  day_of_week VARCHAR(10) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  classroom_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
  INDEX idx_section (section_id),
  INDEX idx_classroom_time (classroom_id, day_of_week, start_time, end_time)
);

-- Classroom Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id CHAR(36) PRIMARY KEY,
  classroom_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_by CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_classroom_date (classroom_id, date, start_time, end_time),
  INDEX idx_user (user_id)
);

-- Academic Calendar table
CREATE TABLE IF NOT EXISTS academic_calendar (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  event_type ENUM('semester_start', 'semester_end', 'registration', 'drop_period', 'midterm', 'final', 'holiday', 'makeup_exam', 'graduation', 'other') NOT NULL DEFAULT 'other',
  semester ENUM('fall', 'spring', 'summer'),
  year INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_start_date (start_date),
  INDEX idx_event_type (event_type),
  INDEX idx_semester_year (semester, year)
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_id CHAR(36),
  type ENUM('info', 'warning', 'success', 'urgent') NOT NULL DEFAULT 'info',
  target_audience ENUM('all', 'students', 'faculty', 'admin') NOT NULL DEFAULT 'all',
  is_active BOOLEAN DEFAULT TRUE,
  expires_at DATETIME,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_active (is_active),
  INDEX idx_target (target_audience),
  INDEX idx_priority (priority)
);

-- ============================================================================
-- PART 4: Bildirimler ve IoT Sensor Tabloları
-- ============================================================================

-- Notification Preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  -- Email preferences
  email_academic BOOLEAN DEFAULT TRUE,
  email_attendance BOOLEAN DEFAULT TRUE,
  email_meal BOOLEAN DEFAULT FALSE,
  email_event BOOLEAN DEFAULT TRUE,
  email_payment BOOLEAN DEFAULT TRUE,
  email_system BOOLEAN DEFAULT TRUE,
  -- Push preferences
  push_academic BOOLEAN DEFAULT TRUE,
  push_attendance BOOLEAN DEFAULT TRUE,
  push_meal BOOLEAN DEFAULT TRUE,
  push_event BOOLEAN DEFAULT TRUE,
  push_payment BOOLEAN DEFAULT TRUE,
  push_system BOOLEAN DEFAULT FALSE,
  -- SMS preferences
  sms_attendance BOOLEAN DEFAULT TRUE,
  sms_payment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category ENUM('academic', 'attendance', 'meal', 'event', 'payment', 'system') DEFAULT 'system',
  type ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
  `read` BOOLEAN DEFAULT FALSE,
  read_at DATETIME NULL,
  action_url VARCHAR(500) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, `read`),
  INDEX idx_created_at (created_at),
  INDEX idx_category (category)
);

-- Sensors table (IoT Dashboard)
CREATE TABLE IF NOT EXISTS sensors (
  id CHAR(36) PRIMARY KEY,
  sensor_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  type ENUM('temperature', 'humidity', 'occupancy', 'energy', 'air_quality', 'light') NOT NULL,
  location VARCHAR(255) NULL,
  building VARCHAR(100) NULL,
  room VARCHAR(50) NULL,
  unit VARCHAR(20) NULL,
  min_value FLOAT NULL,
  max_value FLOAT NULL,
  threshold_low FLOAT NULL,
  threshold_high FLOAT NULL,
  status ENUM('active', 'inactive', 'maintenance', 'error') DEFAULT 'active',
  last_reading FLOAT NULL,
  last_reading_at DATETIME NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sensor_id (sensor_id),
  INDEX idx_sensor_type (type),
  INDEX idx_sensor_status (status),
  INDEX idx_sensor_building (building)
);

-- Sensor Data table (IoT Dashboard)
CREATE TABLE IF NOT EXISTS sensor_data (
  id CHAR(36) PRIMARY KEY,
  sensor_id CHAR(36) NOT NULL,
  value FLOAT NOT NULL,
  unit VARCHAR(20) NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  quality ENUM('good', 'uncertain', 'bad') DEFAULT 'good',
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,
  INDEX idx_sensor_time (sensor_id, timestamp),
  INDEX idx_timestamp (timestamp)
);

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Bu migration dosyası tüm tabloları oluşturur:
-- - Part 1 & 2: Temel sistem ve akademik yönetim (11 tablo)
-- - Part 3: Yemek servisi, cüzdan, etkinlik (11 tablo)
-- - Part 4: Bildirimler ve IoT sensorler (4 tablo)
-- Toplam: 26 tablo
-- ============================================================================

