-- Migration: Add caregiver support
-- Description: Adds account_type to users and creates care_recipients table

-- Add account_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE account_type AS ENUM ('member', 'caregiver');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to users table
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
    ADD COLUMN IF NOT EXISTS account_type account_type DEFAULT 'member';

-- Create care_recipients table
CREATE TABLE IF NOT EXISTS care_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caregiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(20),
    relationship VARCHAR(50),
    disability_type disability_type,
    accessibility_needs TEXT,
    date_of_birth DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_care_recipients_caregiver_id ON care_recipients(caregiver_id);

-- Index for filtering users by account type
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
