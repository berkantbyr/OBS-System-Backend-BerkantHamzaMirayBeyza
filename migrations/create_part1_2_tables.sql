-- Migration: Part 1 & 2 Tables - Base & Academic Management
-- Created: 2025-12-24
-- Description: Kullanicilar, Ogrenciler, Akademisyenler ve Ders Yonetimi tablolari

-- 1. Departments table
CREATE TABLE IF NOT EXISTS departments (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  faculty VARCHAR(200) NOT NULL,
  description TEXT,
  head_of_department CHAR(36),
  established_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_faculty (faculty),
  INDEX idx_active (is_active)
);

-- 2. Users table
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'faculty', 'admin') NOT NULL DEFAULT 'student',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  profile_picture_url VARCHAR(500),
  is_active BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  last_login DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_active (is_active)
);

-- 3. Students table
CREATE TABLE IF NOT EXISTS students (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  student_number VARCHAR(20) NOT NULL UNIQUE,
  department_id CHAR(36),
  enrollment_date DATE DEFAULT (CURRENT_DATE),
  graduation_date DATE,
  gpa DECIMAL(3, 2) DEFAULT 0.00,
  cgpa DECIMAL(3, 2) DEFAULT 0.00,
  total_credits INTEGER DEFAULT 0,
  current_semester INTEGER DEFAULT 1,
  status ENUM('active', 'graduated', 'suspended', 'withdrawn') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  INDEX idx_dept (department_id),
  INDEX idx_status (status)
);

-- 4. Faculty table
CREATE TABLE IF NOT EXISTS faculty (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  employee_number VARCHAR(20) NOT NULL UNIQUE,
  department_id CHAR(36),
  title ENUM('professor', 'associate_professor', 'assistant_professor', 'lecturer', 'research_assistant') NOT NULL DEFAULT 'lecturer',
  office_location VARCHAR(100),
  office_hours TEXT,
  specialization VARCHAR(255),
  hire_date DATE,
  status ENUM('active', 'on_leave', 'retired', 'terminated') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  INDEX idx_dept (department_id),
  INDEX idx_title (title)
);

-- 5. Classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
  id CHAR(36) PRIMARY KEY,
  building VARCHAR(100) NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 30,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  features_json JSON,
  floor INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_room (building, room_number),
  INDEX idx_building (building)
);

-- 6. Courses table
CREATE TABLE IF NOT EXISTS courses (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  credits INTEGER NOT NULL DEFAULT 3,
  ects INTEGER NOT NULL DEFAULT 5,
  syllabus_url VARCHAR(500),
  department_id CHAR(36),
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  INDEX idx_dept (department_id),
  INDEX idx_active (is_active)
);

-- 7. Course Sections table
CREATE TABLE IF NOT EXISTS course_sections (
  id CHAR(36) PRIMARY KEY,
  course_id CHAR(36) NOT NULL,
  section_number INTEGER NOT NULL DEFAULT 1,
  semester ENUM('fall', 'spring', 'summer') NOT NULL,
  year INTEGER NOT NULL,
  instructor_id CHAR(36),
  classroom_id CHAR(36),
  capacity INTEGER NOT NULL DEFAULT 30,
  enrolled_count INTEGER NOT NULL DEFAULT 0,
  schedule_json JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES faculty(id) ON DELETE SET NULL,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL,
  UNIQUE KEY unique_section (course_id, section_number, semester, year),
  INDEX idx_course (course_id),
  INDEX idx_instructor (instructor_id)
);

-- 8. Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id CHAR(36) PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  section_id CHAR(36) NOT NULL,
  status ENUM('pending', 'enrolled', 'dropped', 'completed', 'failed', 'withdrawn', 'rejected') NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  approval_date DATETIME,
  approved_by CHAR(36),
  enrollment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  drop_date DATETIME,
  midterm_grade DECIMAL(5, 2),
  final_grade DECIMAL(5, 2),
  homework_grade DECIMAL(5, 2),
  average_grade DECIMAL(5, 2),
  letter_grade VARCHAR(2),
  grade_point DECIMAL(3, 2),
  is_repeat BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES faculty(id) ON DELETE SET NULL,
  UNIQUE KEY unique_enrollment (student_id, section_id),
  INDEX idx_student (student_id),
  INDEX idx_section (section_id),
  INDEX idx_status (status)
);

-- 9. Course Prerequisites table
CREATE TABLE IF NOT EXISTS course_prerequisites (
  course_id CHAR(36) NOT NULL,
  prerequisite_course_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (course_id, prerequisite_course_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (prerequisite_course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Security Tables
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_by_ip VARCHAR(50),
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at DATETIME,
  replaced_by_token VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS password_resets (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  verified_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);
