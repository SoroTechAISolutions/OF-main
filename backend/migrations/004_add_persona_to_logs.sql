-- ============================================
-- Migration 004: Add persona_id to extension_logs
-- ============================================

-- Add persona_id column to track which persona was used
ALTER TABLE extension_logs
ADD COLUMN IF NOT EXISTS persona_id VARCHAR(50) DEFAULT 'default';

-- Create index for persona analytics
CREATE INDEX IF NOT EXISTS idx_extension_logs_persona
ON extension_logs(persona_id);

-- Add comment
COMMENT ON COLUMN extension_logs.persona_id IS 'ID of the AI persona used for generation (e.g., gfe_sweet, dominant)';
