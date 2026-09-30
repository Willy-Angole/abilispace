-- Editors can mark a current-affairs story as time-sensitive so the feed highlights it.
-- Existing high-priority stories are the closest signal, so they start highlighted.

ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS is_time_sensitive BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE articles
SET is_time_sensitive = TRUE
WHERE priority = 'high'
  AND deleted_at IS NULL
  AND is_time_sensitive = FALSE;

CREATE INDEX IF NOT EXISTS idx_articles_time_sensitive
    ON articles (published_at DESC)
    WHERE is_time_sensitive = TRUE AND deleted_at IS NULL;
