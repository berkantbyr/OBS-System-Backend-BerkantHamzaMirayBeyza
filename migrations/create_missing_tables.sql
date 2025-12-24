-- Migration: Eksik Tabloları Oluştur
-- Created: 2025-12-24
-- Description: Part 4 tabloları (notifications, notification_preferences, sensors, sensor_data)

-- 1. Notification Preferences table
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

-- 2. Notifications table
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

-- 3. Sensors table
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

-- 4. Sensor Data table
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

