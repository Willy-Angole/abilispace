-- Sponsored thoughts appear beside the timeline, not inside it.

ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS sponsor_name TEXT;

CREATE INDEX IF NOT EXISTS thoughts_sponsored_idx
    ON thoughts (created_at DESC)
    WHERE is_sponsored = TRUE AND deleted_at IS NULL;
