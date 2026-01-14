/**
 * Admin Schema Extensions for Shiriki Backend
 * Additional tables for admin dashboard functionality
 */

-- =============================================================================
-- ADMIN ROLE TYPE
-- =============================================================================

CREATE TYPE admin_role AS ENUM (
    'super_admin',
    'admin',
    'moderator',
    'support'
);

-- =============================================================================
-- ADMIN USERS TABLE
-- =============================================================================

CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role admin_role NOT NULL DEFAULT 'moderator',
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- Admin refresh tokens
CREATE TABLE admin_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SYSTEM METRICS TABLE (for dashboard stats)
-- =============================================================================

CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15, 2) NOT NULL,
    metric_unit VARCHAR(50),
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient querying
CREATE INDEX idx_system_metrics_name_date ON system_metrics(metric_name, metric_date DESC);

-- =============================================================================
-- USER SESSIONS (for tracking online users)
-- =============================================================================

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for active sessions
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, last_activity_at DESC) WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);

-- =============================================================================
-- ADMIN AUDIT LOGS (separate from user audit logs)
-- =============================================================================

CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for admin audit logs
CREATE INDEX idx_admin_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);

-- =============================================================================
-- PLATFORM SETTINGS (configurable settings)
-- =============================================================================

CREATE TABLE platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) NOT NULL DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- REPORTS TABLE (for user reports/flags)
-- =============================================================================

CREATE TYPE report_status AS ENUM (
    'pending',
    'reviewing',
    'resolved',
    'dismissed'
);

CREATE TYPE report_type AS ENUM (
    'spam',
    'harassment',
    'inappropriate',
    'misinformation',
    'other'
);

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id),
    reported_entity_type VARCHAR(50) NOT NULL, -- user, event, article, message
    reported_entity_id UUID NOT NULL,
    report_type report_type NOT NULL,
    description TEXT,
    status report_status DEFAULT 'pending',
    assigned_to UUID REFERENCES admin_users(id),
    resolved_by UUID REFERENCES admin_users(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_entity ON reports(reported_entity_type, reported_entity_id);

-- =============================================================================
-- DAILY STATISTICS (pre-aggregated for performance)
-- =============================================================================

CREATE TABLE daily_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stat_date DATE NOT NULL UNIQUE,
    total_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_events INTEGER DEFAULT 0,
    new_events INTEGER DEFAULT 0,
    event_registrations INTEGER DEFAULT 0,
    total_articles INTEGER DEFAULT 0,
    new_articles INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    new_messages INTEGER DEFAULT 0,
    total_conversations INTEGER DEFAULT 0,
    peak_concurrent_users INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_daily_statistics_date ON daily_statistics(stat_date DESC);

-- =============================================================================
-- TRIGGERS FOR ADMIN TABLES
-- =============================================================================

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_statistics_updated_at
    BEFORE UPDATE ON daily_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FUNCTION TO AGGREGATE DAILY STATS
-- =============================================================================

CREATE OR REPLACE FUNCTION aggregate_daily_statistics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO daily_statistics (
        stat_date,
        total_users,
        new_users,
        active_users,
        total_events,
        new_events,
        event_registrations,
        total_articles,
        new_articles,
        total_messages,
        new_messages,
        total_conversations
    )
    VALUES (
        target_date,
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL),
        (SELECT COUNT(*) FROM users WHERE DATE(created_at) = target_date AND deleted_at IS NULL),
        (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE DATE(last_activity_at) = target_date),
        (SELECT COUNT(*) FROM events WHERE deleted_at IS NULL),
        (SELECT COUNT(*) FROM events WHERE DATE(created_at) = target_date AND deleted_at IS NULL),
        (SELECT COUNT(*) FROM event_registrations WHERE DATE(registered_at) = target_date AND cancelled_at IS NULL),
        (SELECT COUNT(*) FROM articles WHERE deleted_at IS NULL),
        (SELECT COUNT(*) FROM articles WHERE DATE(created_at) = target_date AND deleted_at IS NULL),
        (SELECT COUNT(*) FROM messages WHERE deleted_at IS NULL),
        (SELECT COUNT(*) FROM messages WHERE DATE(created_at) = target_date AND deleted_at IS NULL),
        (SELECT COUNT(*) FROM conversations WHERE deleted_at IS NULL)
    )
    ON CONFLICT (stat_date) DO UPDATE SET
        total_users = EXCLUDED.total_users,
        new_users = EXCLUDED.new_users,
        active_users = EXCLUDED.active_users,
        total_events = EXCLUDED.total_events,
        new_events = EXCLUDED.new_events,
        event_registrations = EXCLUDED.event_registrations,
        total_articles = EXCLUDED.total_articles,
        new_articles = EXCLUDED.new_articles,
        total_messages = EXCLUDED.total_messages,
        new_messages = EXCLUDED.new_messages,
        total_conversations = EXCLUDED.total_conversations,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INSERT DEFAULT ADMIN USER (password: Admin@123456)
-- =============================================================================

-- Note: In production, change this password immediately after setup
-- Password hash is for 'Admin@123456' using bcrypt
INSERT INTO admin_users (email, password_hash, first_name, last_name, role)
VALUES (
    'admin@abilispace.org',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.HJvJFXp9S0mBuW',
    'System',
    'Administrator',
    'super_admin'
) ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- INSERT DEFAULT PLATFORM SETTINGS
-- =============================================================================

INSERT INTO platform_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('platform_name', 'Abilispace', 'string', 'Platform display name', true),
('max_event_capacity', '500', 'number', 'Maximum capacity for events', false),
('enable_registrations', 'true', 'boolean', 'Allow new user registrations', false),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', false),
('contact_email', 'support@abilispace.org', 'string', 'Support contact email', true),
('session_timeout_minutes', '60', 'number', 'User session timeout in minutes', false)
ON CONFLICT (setting_key) DO NOTHING;
