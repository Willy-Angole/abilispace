-- Lock a member account after repeated bad passwords, and record real
-- activity so a refresh token cannot keep an idle session alive.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_user_activity_at TIMESTAMPTZ;

UPDATE users
SET last_user_activity_at = COALESCE(last_login_at, created_at, CURRENT_TIMESTAMP)
WHERE last_user_activity_at IS NULL;
