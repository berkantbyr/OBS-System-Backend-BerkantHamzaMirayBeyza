-- Add account lockout fields to users table
-- Migration: Add failed_login_attempts and locked_until columns

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL;

-- Add index for faster queries on locked accounts
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

COMMENT ON COLUMN users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.locked_until IS 'Timestamp when account lock expires (NULL if not locked)';

