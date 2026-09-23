-- Sponsorship requests stay private until an admin approves them.

ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS sponsorship_status TEXT;

ALTER TABLE thoughts DROP CONSTRAINT IF EXISTS thoughts_sponsorship_status_check;
ALTER TABLE thoughts ADD CONSTRAINT thoughts_sponsorship_status_check
    CHECK (sponsorship_status IS NULL OR sponsorship_status IN ('pending', 'approved', 'rejected'));

UPDATE thoughts
SET sponsorship_status = 'approved'
WHERE is_sponsored = TRUE AND sponsorship_status IS NULL;
