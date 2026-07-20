-- Migration 005: Add 'other' account type and sector_role column
-- 'other' covers sector workers, advocates, and general supporters
-- who are not PWDs themselves and not caregivers.

ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'other';

ALTER TABLE users ADD COLUMN IF NOT EXISTS sector_role VARCHAR(50);
