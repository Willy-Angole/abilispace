/**
 * Shiriki Backend - Database Schema
 * Comprehensive PostgreSQL schema for the inclusive community platform
 * 
 * @author Shiriki Team
 * @version 1.0.0
 * 
 * Design Principles:
 * - Normalized schema design following 3NF
 * - Proper indexing for optimized queries
 * - UUID primary keys for distributed systems
 * - Soft deletes for data recovery
 * - Audit trails for compliance
 */

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- =============================================================================
-- ENUMS
-- =============================================================================

-- User disability types
CREATE TYPE disability_type AS ENUM (
    'visual',
    'hearing', 
    'mobility',
    'cognitive',
    'multiple',
    'other',
    'prefer_not_to_say'
);

-- Communication preferences
CREATE TYPE communication_preference AS ENUM (
    'text',
    'voice',
    'video',
    'sign_language',
    'email'
);

-- Event types
CREATE TYPE event_type AS ENUM (
    'virtual',
    'in_person',
    'hybrid'
);

-- Event categories
CREATE TYPE event_category AS ENUM (
    'technology',
    'advocacy',
    'sports',
    'health',
    'arts',
    'education',
    'social',
    'employment',
    'legal'
);

-- Message types
CREATE TYPE message_type AS ENUM (
    'text',
    'system',
    'notification'
);

-- Article priorities
CREATE TYPE article_priority AS ENUM (
    'high',
    'medium',
    'low'
);

-- Article categories
CREATE TYPE article_category AS ENUM (
    'policy',
    'technology',
    'legal',
    'medical',
    'housing',
    'digital_rights',
    'education',
    'employment'
);

-- Article regions
CREATE TYPE article_region AS ENUM (
    'national',
    'international',
    'local'
);

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table with comprehensive profile information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),                        -- Nullable for OAuth-only users
    google_id VARCHAR(255) UNIQUE,                     -- Google OAuth identifier
    avatar_url VARCHAR(500),                           -- Profile picture URL
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    location VARCHAR(255),
    disability_type disability_type,
    accessibility_needs TEXT,
    communication_preference communication_preference DEFAULT 'email',
    emergency_contact VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    -- Ensure at least one auth method exists
    CONSTRAINT auth_method_required CHECK (password_hash IS NOT NULL OR google_id IS NOT NULL)
);

-- User accessibility preferences (for UI customization)
CREATE TABLE user_accessibility_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    high_contrast BOOLEAN DEFAULT FALSE,
    font_size VARCHAR(20) DEFAULT 'medium',
    reduced_motion BOOLEAN DEFAULT FALSE,
    screen_reader_optimized BOOLEAN DEFAULT FALSE,
    keyboard_navigation BOOLEAN DEFAULT TRUE,
    voice_command_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Refresh tokens for JWT authentication
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Password reset codes
CREATE TABLE password_reset_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT max_attempts CHECK (attempts <= 5)
);

-- =============================================================================
-- EVENTS SYSTEM
-- =============================================================================

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    end_date DATE,
    end_time TIME,
    location VARCHAR(500),
    virtual_link VARCHAR(500),
    event_type event_type NOT NULL,
    category event_category NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 100,
    registered_count INTEGER DEFAULT 0,
    organizer_id UUID REFERENCES users(id),
    organizer_name VARCHAR(255) NOT NULL,
    image_url VARCHAR(500),
    image_alt VARCHAR(500),
    is_featured BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- Event accessibility features (many-to-many relationship)
CREATE TABLE accessibility_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for events and accessibility features
CREATE TABLE event_accessibility_features (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES accessibility_features(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, feature_id)
);

-- Event tags for search optimization
CREATE TABLE event_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for events and tags
CREATE TABLE event_tag_relations (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES event_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, tag_id)
);

-- Event registrations
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accommodation_notes TEXT,
    status VARCHAR(50) DEFAULT 'registered',
    attended BOOLEAN DEFAULT FALSE,
    registered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMPTZ,
    UNIQUE(event_id, user_id)
);

-- =============================================================================
-- MESSAGING SYSTEM
-- =============================================================================

-- Conversations table (supports 1:1 and group chats)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    is_group BOOLEAN DEFAULT FALSE,
    admin_only_messages BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- Conversation participants
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMPTZ,
    is_admin BOOLEAN DEFAULT FALSE,
    last_read_at TIMESTAMPTZ,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    UNIQUE(conversation_id, user_id)
);

-- Messages table with optimized structure for real-time
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    reply_to_id UUID REFERENCES messages(id),
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- Message read receipts
CREATE TABLE message_read_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

-- =============================================================================
-- NEWS/ARTICLES SYSTEM
-- =============================================================================

-- Articles table
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    category article_category NOT NULL,
    source VARCHAR(255) NOT NULL,
    source_url VARCHAR(500),
    author VARCHAR(255),
    region article_region DEFAULT 'national',
    priority article_priority DEFAULT 'medium',
    read_time_minutes INTEGER DEFAULT 5,
    image_url VARCHAR(500),
    image_alt VARCHAR(500),
    has_audio BOOLEAN DEFAULT FALSE,
    audio_url VARCHAR(500),
    has_video BOOLEAN DEFAULT FALSE,
    video_url VARCHAR(500),
    is_published BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- Article accessibility features
CREATE TABLE article_accessibility_features (
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES accessibility_features(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, feature_id)
);

-- Article tags
CREATE TABLE article_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for articles and tags
CREATE TABLE article_tag_relations (
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES article_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

-- User bookmarks
CREATE TABLE user_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id)
);

-- =============================================================================
-- NOTIFICATIONS SYSTEM
-- =============================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- AUDIT LOG (for compliance and debugging)
-- =============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX idx_users_location ON users(location);
CREATE INDEX idx_users_disability_type ON users(disability_type);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- Password reset codes indexes
CREATE INDEX idx_password_reset_codes_user ON password_reset_codes(user_id);
CREATE INDEX idx_password_reset_codes_expires ON password_reset_codes(expires_at);

-- Events indexes
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_published ON events(is_published) WHERE is_published = TRUE;
CREATE INDEX idx_events_featured ON events(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_events_title_trgm ON events USING gin(title gin_trgm_ops);
CREATE INDEX idx_events_description_trgm ON events USING gin(description gin_trgm_ops);

-- Event registrations indexes
CREATE INDEX idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_user ON event_registrations(user_id);
CREATE INDEX idx_event_registrations_status ON event_registrations(status);

-- Messages indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- Conversation participants indexes
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conv_participants_conversation ON conversation_participants(conversation_id);

-- Articles indexes
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_region ON articles(region);
CREATE INDEX idx_articles_priority ON articles(priority);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_title_trgm ON articles USING gin(title gin_trgm_ops);
CREATE INDEX idx_articles_content_trgm ON articles USING gin(content gin_trgm_ops);

-- Bookmarks indexes
CREATE INDEX idx_bookmarks_user ON user_bookmarks(user_id);
CREATE INDEX idx_bookmarks_article ON user_bookmarks(article_id);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accessibility_settings_updated_at
    BEFORE UPDATE ON user_accessibility_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update event registered count
CREATE OR REPLACE FUNCTION update_event_registered_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events 
        SET registered_count = registered_count + 1 
        WHERE id = NEW.event_id;
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.cancelled_at IS NOT NULL AND OLD.cancelled_at IS NULL) THEN
        UPDATE events 
        SET registered_count = registered_count - 1 
        WHERE id = COALESCE(NEW.event_id, OLD.event_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_event_count_on_registration
    AFTER INSERT OR UPDATE OR DELETE ON event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_event_registered_count();

-- Function to update conversation timestamp on new message
CREATE OR REPLACE FUNCTION update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_new_message();
