-- Add account lockout fields to users table (MySQL)
-- Migration: Add failed_login_attempts and locked_until columns

ALTER TABLE users 
ADD COLUMN failed_login_attempts INT DEFAULT 0 NOT NULL,
ADD COLUMN locked_until DATETIME NULL;

-- Add index for faster queries on locked accounts
CREATE INDEX idx_users_locked_until ON users(locked_until);

