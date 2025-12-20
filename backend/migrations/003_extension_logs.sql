-- ============================================
-- Migration 003: Extension Logs Table
-- For Allen's Playground - logging extension usage
-- ============================================

-- Extension logs table (simplified, not tied to agencies yet)
CREATE TABLE IF NOT EXISTS extension_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Request data
    fan_message TEXT NOT NULL,
    fan_name VARCHAR(255) DEFAULT 'Unknown',
    model_username VARCHAR(255) DEFAULT 'default',

    -- Response data
    generated_response TEXT NOT NULL,
    generation_time_ms INTEGER DEFAULT 0,

    -- Feedback data
    was_used BOOLEAN DEFAULT FALSE,
    was_edited BOOLEAN DEFAULT FALSE,
    edited_text TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_extension_logs_created_at ON extension_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_extension_logs_model_username ON extension_logs(model_username);

-- Comment
COMMENT ON TABLE extension_logs IS 'Logs all AI generations from Chrome Extension (Playground/Alpha)';

-- ============================================
-- Verification
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 003 complete: extension_logs table created';
END $$;
