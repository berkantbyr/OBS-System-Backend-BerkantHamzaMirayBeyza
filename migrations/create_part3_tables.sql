-- Migration: Part 3 Tables - Meal, Wallet, Events & Scheduling
-- Created: 2024-12-22
-- Description: Yemek servisi, cuzdan, etkinlik ve programlama tablolari

-- 1. Cafeterias table
CREATE TABLE IF NOT EXISTS cafeterias (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(255),
  capacity INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Meal Menus table
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
  UNIQUE KEY unique_menu (cafeteria_id, date, meal_type)
);

-- 3. Meal Reservations table (with transfer fields)
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
  INDEX idx_transfer_status (transfer_status)
);

-- 4. Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Transactions table
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
  INDEX idx_reference (reference_type, reference_id)
);

-- 6. Events table
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7. Event Registrations table
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
  INDEX idx_event (event_id),
  INDEX idx_user (user_id)
);

-- 8. Schedules table
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

-- 9. Classroom Reservations table
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

-- 10. Academic Calendar table
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

-- 11. Announcements table
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
