-- ============================================
-- Migration: Add Fanvue Platform Support
-- Date: 2025-12-16
-- Description: Adds fields for multi-platform support (OnlyFans + Fanvue)
-- ============================================

-- Create platform enum type
DO $$ BEGIN
    CREATE TYPE platform_type AS ENUM ('onlyfans', 'fanvue', 'both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add platform column with default 'onlyfans' for existing records
ALTER TABLE models
ADD COLUMN IF NOT EXISTS platform platform_type DEFAULT 'onlyfans';

-- Add Fanvue-specific columns
ALTER TABLE models
ADD COLUMN IF NOT EXISTS fanvue_username VARCHAR(255);

ALTER TABLE models
ADD COLUMN IF NOT EXISTS fanvue_user_uuid UUID;

ALTER TABLE models
ADD COLUMN IF NOT EXISTS fanvue_access_token TEXT;

ALTER TABLE models
ADD COLUMN IF NOT EXISTS fanvue_refresh_token TEXT;

ALTER TABLE models
ADD COLUMN IF NOT EXISTS fanvue_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for Fanvue lookups
CREATE INDEX IF NOT EXISTS idx_models_fanvue_user_uuid
ON models(fanvue_user_uuid)
WHERE fanvue_user_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_models_fanvue_username
ON models(fanvue_username)
WHERE fanvue_username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_models_platform
ON models(platform);

-- Add comments for documentation
COMMENT ON COLUMN models.platform IS 'Platform type: onlyfans, fanvue, or both';
COMMENT ON COLUMN models.fanvue_username IS 'Fanvue creator username';
COMMENT ON COLUMN models.fanvue_user_uuid IS 'Fanvue user UUID from API';
COMMENT ON COLUMN models.fanvue_access_token IS 'Fanvue OAuth access token (encrypted in production)';
COMMENT ON COLUMN models.fanvue_refresh_token IS 'Fanvue OAuth refresh token (encrypted in production)';
COMMENT ON COLUMN models.fanvue_token_expires_at IS 'When the Fanvue access token expires';

-- ============================================
-- Also update chats table to support platform
-- ============================================

ALTER TABLE chats
ADD COLUMN IF NOT EXISTS platform platform_type DEFAULT 'onlyfans';

ALTER TABLE chats
ADD COLUMN IF NOT EXISTS fanvue_chat_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_chats_platform
ON chats(platform);

CREATE INDEX IF NOT EXISTS idx_chats_fanvue_uuid
ON chats(fanvue_chat_uuid)
WHERE fanvue_chat_uuid IS NOT NULL;

COMMENT ON COLUMN chats.platform IS 'Source platform for this chat';
COMMENT ON COLUMN chats.fanvue_chat_uuid IS 'Fanvue chat/conversation UUID';

-- ============================================
-- Update messages table for platform support
-- ============================================

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS platform platform_type DEFAULT 'onlyfans';

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS fanvue_message_uuid UUID;

CREATE INDEX IF NOT EXISTS idx_messages_fanvue_uuid
ON messages(fanvue_message_uuid)
WHERE fanvue_message_uuid IS NOT NULL;

COMMENT ON COLUMN messages.platform IS 'Source platform for this message';
COMMENT ON COLUMN messages.fanvue_message_uuid IS 'Fanvue message UUID';

-- ============================================
-- Migration complete
-- ============================================
