-- Create user_activity_logs table
-- Migration: User Activity Logging System

CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure', 'pending')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_resource ON user_activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_created ON user_activity_logs(user_id, created_at DESC);

-- Add comments
COMMENT ON TABLE user_activity_logs IS 'Logs all user activities for audit and security purposes';
COMMENT ON COLUMN user_activity_logs.action IS 'Action performed (e.g., login, logout, profile_update)';
COMMENT ON COLUMN user_activity_logs.resource_type IS 'Type of resource affected (e.g., user, course, attendance)';
COMMENT ON COLUMN user_activity_logs.resource_id IS 'ID of the resource affected';
COMMENT ON COLUMN user_activity_logs.details IS 'Additional context about the action in JSON format';
COMMENT ON COLUMN user_activity_logs.status IS 'Status of the action: success, failure, or pending';

