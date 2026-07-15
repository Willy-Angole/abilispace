-- Migration 003: Add file messaging support
-- Adds 'image', 'voice', 'file' to the message_type enum
-- Adds file_url column to messages table

-- Add new values to the message_type enum
-- IF NOT EXISTS requires Postgres 9.6+; safe to run multiple times
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'image';
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'voice';
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'file';

-- Add file_url column if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT;
