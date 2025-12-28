-- Run all migrations for MySQL (Without Foreign Keys - Add them manually if needed)
-- Execute this file after connecting to the database

USE campus_db;

-- 1. Add account lockout fields (already done, skip if error)
ALTER TABLE users 
ADD COLUMN failed_login_attempts INT DEFAULT 0 NOT NULL,
ADD COLUMN locked_until DATETIME NULL;

CREATE INDEX idx_users_locked_until ON users(locked_until);

-- 2. Create user_activity_logs table (without foreign key first)
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id CHAR(36),
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSON,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_user_activity_logs_user_id (user_id),
    INDEX idx_user_activity_logs_action (action),
    INDEX idx_user_activity_logs_resource (resource_type, resource_id),
    INDEX idx_user_activity_logs_created_at (created_at),
    INDEX idx_user_activity_logs_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key separately (if users table structure matches)
-- ALTER TABLE user_activity_logs 
-- ADD CONSTRAINT fk_user_activity_logs_user 
-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 3. Create push_subscriptions table (without foreign key first)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    UNIQUE KEY unique_endpoint (endpoint(255)),
    INDEX idx_push_subscriptions_user_id (user_id),
    INDEX idx_push_subscriptions_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key separately (if users table structure matches)
-- ALTER TABLE push_subscriptions 
-- ADD CONSTRAINT fk_push_subscriptions_user 
-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

SELECT 'Tables created! Foreign keys can be added manually if needed.' AS status;

