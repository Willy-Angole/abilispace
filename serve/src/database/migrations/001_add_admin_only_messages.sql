-- Migration: Add admin_only_messages column to conversations table
-- This allows group admins to restrict messaging to only other admins

-- Add the column if it doesn't exist
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS admin_only_messages BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN conversations.admin_only_messages IS 'When true, only admins can send messages in this group conversation';
