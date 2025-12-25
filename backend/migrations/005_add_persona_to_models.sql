-- ============================================
-- Migration 005: Add persona_id to models table
-- ============================================

-- Add persona_id column to models table
ALTER TABLE models
ADD COLUMN IF NOT EXISTS persona_id VARCHAR(50) DEFAULT 'gfe_sweet';

-- Create index for persona filtering
CREATE INDEX IF NOT EXISTS idx_models_persona
ON models(persona_id);

-- Add comment
COMMENT ON COLUMN models.persona_id IS 'ID of the AI persona archetype (e.g., gfe_sweet, dominant, gamer_girl)';
