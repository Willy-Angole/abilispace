/**
 * Database Seed Data
 * Initial data for Shiriki platform development and testing
 */

-- =============================================================================
-- SEED ACCESSIBILITY FEATURES
-- =============================================================================

INSERT INTO accessibility_features (id, name, description, icon) VALUES
    (uuid_generate_v4(), 'Sign Language', 'Sign language interpretation available', 'hand'),
    (uuid_generate_v4(), 'Live Captions', 'Real-time captioning provided', 'subtitles'),
    (uuid_generate_v4(), 'Wheelchair Access', 'Venue is wheelchair accessible', 'wheelchair'),
    (uuid_generate_v4(), 'Audio Description', 'Audio descriptions for visual content', 'volume-2'),
    (uuid_generate_v4(), 'Screen Reader Compatible', 'Content optimized for screen readers', 'monitor'),
    (uuid_generate_v4(), 'Braille Materials', 'Braille documents available', 'book'),
    (uuid_generate_v4(), 'Tactile Experience', 'Tactile materials and experiences', 'hand'),
    (uuid_generate_v4(), 'Equipment Provided', 'Adaptive equipment provided', 'settings'),
    (uuid_generate_v4(), 'Private Chat Options', 'Private communication channels available', 'lock'),
    (uuid_generate_v4(), 'High Contrast Text', 'High contrast visual options', 'contrast'),
    (uuid_generate_v4(), 'Keyboard Navigation Demo', 'Full keyboard navigation support', 'keyboard')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- SEED EVENT TAGS
-- =============================================================================

INSERT INTO event_tags (id, name) VALUES
    (uuid_generate_v4(), 'assistive-tech'),
    (uuid_generate_v4(), 'workshop'),
    (uuid_generate_v4(), 'hands-on'),
    (uuid_generate_v4(), 'employment'),
    (uuid_generate_v4(), 'rights'),
    (uuid_generate_v4(), 'advocacy'),
    (uuid_generate_v4(), 'panel'),
    (uuid_generate_v4(), 'sports'),
    (uuid_generate_v4(), 'adaptive'),
    (uuid_generate_v4(), 'recreation'),
    (uuid_generate_v4(), 'community'),
    (uuid_generate_v4(), 'mental-health'),
    (uuid_generate_v4(), 'support'),
    (uuid_generate_v4(), 'counseling'),
    (uuid_generate_v4(), 'peer-support'),
    (uuid_generate_v4(), 'art'),
    (uuid_generate_v4(), 'exhibition'),
    (uuid_generate_v4(), 'tactile'),
    (uuid_generate_v4(), 'inclusive'),
    (uuid_generate_v4(), 'web-accessibility'),
    (uuid_generate_v4(), 'training'),
    (uuid_generate_v4(), 'wcag'),
    (uuid_generate_v4(), 'digital-inclusion')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- SEED ARTICLE TAGS
-- =============================================================================

INSERT INTO article_tags (id, name) VALUES
    (uuid_generate_v4(), 'transportation'),
    (uuid_generate_v4(), 'accessibility'),
    (uuid_generate_v4(), 'policy'),
    (uuid_generate_v4(), 'government'),
    (uuid_generate_v4(), 'technology'),
    (uuid_generate_v4(), 'grants'),
    (uuid_generate_v4(), 'innovation'),
    (uuid_generate_v4(), 'assistive-devices'),
    (uuid_generate_v4(), 'employment'),
    (uuid_generate_v4(), 'discrimination'),
    (uuid_generate_v4(), 'legal'),
    (uuid_generate_v4(), 'rights'),
    (uuid_generate_v4(), 'medical'),
    (uuid_generate_v4(), 'research'),
    (uuid_generate_v4(), 'brain-computer-interface'),
    (uuid_generate_v4(), 'paralysis'),
    (uuid_generate_v4(), 'housing'),
    (uuid_generate_v4(), 'funding'),
    (uuid_generate_v4(), 'universal-design'),
    (uuid_generate_v4(), 'digital-accessibility'),
    (uuid_generate_v4(), 'websites'),
    (uuid_generate_v4(), 'compliance'),
    (uuid_generate_v4(), 'audit')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- SEED DEMO USER (for testing)
-- Password: Demo@123 (hashed with argon2)
-- =============================================================================

-- Note: In production, passwords should be hashed properly via the application
-- This is a pre-hashed password for demo purposes only
INSERT INTO users (
    id,
    email, 
    password_hash, 
    first_name, 
    last_name,
    location,
    disability_type,
    communication_preference,
    email_verified,
    is_active
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'demo@shiriki.org',
    '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$hashgoeshere',
    'Demo',
    'User',
    'Lagos, Nigeria',
    'prefer_not_to_say',
    'email',
    TRUE,
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Create accessibility settings for demo user
INSERT INTO user_accessibility_settings (user_id)
SELECT id FROM users WHERE email = 'demo@shiriki.org'
ON CONFLICT (user_id) DO NOTHING;
