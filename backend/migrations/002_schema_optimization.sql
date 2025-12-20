-- OF Agency Platform - Schema Optimization
-- Migration: 002_schema_optimization.sql
-- Date: 2025-12-02
-- Based on: DATABASE-RESEARCH.md analysis

-- ============================================
-- MESSAGES TABLE ENHANCEMENTS
-- ============================================
-- Add PPV unlock tracking
ALTER TABLE messages ADD COLUMN IF NOT EXISTS unlocked BOOLEAN DEFAULT FALSE;

-- Add read timestamp for message status
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- CHATS TABLE ENHANCEMENTS
-- ============================================
-- Fan avatar for UI display
ALTER TABLE chats ADD COLUMN IF NOT EXISTS fan_avatar_url TEXT;

-- Subscription status tracking
ALTER TABLE chats ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN DEFAULT TRUE;

-- First message timestamp for fan journey analytics
ALTER TABLE chats ADD COLUMN IF NOT EXISTS first_message_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- MODELS TABLE ENHANCEMENTS
-- ============================================
-- OnlyFans numeric user ID (for API calls)
ALTER TABLE models ADD COLUMN IF NOT EXISTS of_user_id BIGINT;

-- Header/banner image URL
ALTER TABLE models ADD COLUMN IF NOT EXISTS header_url TEXT;

-- Current subscription price
ALTER TABLE models ADD COLUMN IF NOT EXISTS subscription_price DECIMAL(10,2);

-- Verification status
ALTER TABLE models ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Last activity tracking
ALTER TABLE models ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- NEW INDEXES
-- ============================================
-- Index for OF user ID lookups
CREATE INDEX IF NOT EXISTS idx_models_of_user_id ON models(of_user_id);

-- Index for subscription status filtering
CREATE INDEX IF NOT EXISTS idx_chats_subscription ON chats(subscription_active);

-- Index for unread messages
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read_at);

-- Index for PPV tracking
CREATE INDEX IF NOT EXISTS idx_messages_unlocked ON messages(unlocked) WHERE is_ppv = TRUE;

-- ============================================
-- FAN STATS TABLE (for analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS fan_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,

    -- Spending metrics
    total_tips DECIMAL(10,2) DEFAULT 0,
    total_ppv_purchased DECIMAL(10,2) DEFAULT 0,
    total_subscriptions DECIMAL(10,2) DEFAULT 0,

    -- Engagement metrics
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    avg_response_time_seconds INTEGER,

    -- Behavior tracking
    last_purchase_at TIMESTAMP WITH TIME ZONE,
    last_tip_at TIMESTAMP WITH TIME ZONE,
    engagement_score INTEGER DEFAULT 0,  -- 0-100 calculated score

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(chat_id)
);

-- Index for finding high-value fans
CREATE INDEX IF NOT EXISTS idx_fan_stats_spending ON fan_stats(total_ppv_purchased DESC);
CREATE INDEX IF NOT EXISTS idx_fan_stats_engagement ON fan_stats(engagement_score DESC);

-- Trigger for updated_at
CREATE TRIGGER update_fan_stats_updated_at BEFORE UPDATE ON fan_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MEDIA ATTACHMENTS TABLE (optional - for context)
-- ============================================
CREATE TABLE IF NOT EXISTS media_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,

    -- OF media identifiers
    of_media_id BIGINT,

    -- Media info
    media_type VARCHAR(50) NOT NULL,  -- image, video, audio, gif
    url TEXT,                          -- CDN URL (may expire)
    thumbnail_url TEXT,
    duration_seconds INTEGER,          -- For video/audio

    -- Status
    is_preview BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,   -- PPV not unlocked

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for message media lookups
CREATE INDEX IF NOT EXISTS idx_media_message ON media_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_media_of_id ON media_attachments(of_media_id);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE fan_stats IS 'Fan spending and engagement analytics for AI personalization';
COMMENT ON TABLE media_attachments IS 'Media references attached to messages (for context, not storage)';
COMMENT ON COLUMN models.of_user_id IS 'OnlyFans numeric user ID for API compatibility';
COMMENT ON COLUMN chats.subscription_active IS 'Whether fan currently has active subscription';
COMMENT ON COLUMN messages.unlocked IS 'Whether PPV content was unlocked/purchased by fan';
