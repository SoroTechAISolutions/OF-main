-- Migration: Add platform column to chats and messages tables
-- For multi-platform support (OnlyFans, Fanvue)

-- Add platform to chats
ALTER TABLE chats ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'onlyfans';

-- Add platform to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'onlyfans';

-- Create indexes for platform filtering
CREATE INDEX IF NOT EXISTS idx_chats_platform ON chats(platform);
CREATE INDEX IF NOT EXISTS idx_messages_platform ON messages(platform);

-- Update existing records (assume they're OnlyFans if null)
UPDATE chats SET platform = 'onlyfans' WHERE platform IS NULL;
UPDATE messages SET platform = 'onlyfans' WHERE platform IS NULL;
