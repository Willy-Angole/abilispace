-- Optional photo on a thought. A post may be text, a photo, or both.

ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE thoughts DROP CONSTRAINT IF EXISTS thoughts_body_check;
ALTER TABLE thoughts DROP CONSTRAINT IF EXISTS thoughts_body_length;
ALTER TABLE thoughts DROP CONSTRAINT IF EXISTS thoughts_has_content;

ALTER TABLE thoughts ADD CONSTRAINT thoughts_body_length CHECK (char_length(body) <= 2000);
ALTER TABLE thoughts ADD CONSTRAINT thoughts_has_content CHECK (
    char_length(btrim(body)) > 0
    OR (image_url IS NOT NULL AND char_length(image_url) > 0)
);
