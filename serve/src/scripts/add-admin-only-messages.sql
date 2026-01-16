-- Add admin_only_messages column to conversations table
-- This allows group admins to restrict messaging to admins only

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS admin_only_messages BOOLEAN DEFAULT FALSE;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'conversations' AND column_name = 'admin_only_messages';
