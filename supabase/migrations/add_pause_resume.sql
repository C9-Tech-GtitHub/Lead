-- ============================================
-- Add Pause/Resume Functionality to Runs
-- ============================================
-- Allows users to pause and resume large research runs
-- to manage costs and API rate limits

-- Add is_paused column to runs table
ALTER TABLE runs
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ;

-- Update the status check constraint to include 'paused' status
ALTER TABLE runs DROP CONSTRAINT IF EXISTS runs_status_check;
ALTER TABLE runs ADD CONSTRAINT runs_status_check
  CHECK (status IN ('pending', 'scraping', 'prescreening', 'ready', 'researching', 'paused', 'completed', 'failed'));

-- Create an index for faster pause status queries
CREATE INDEX IF NOT EXISTS idx_runs_is_paused ON runs(is_paused) WHERE is_paused = true;

-- Add comment for documentation
COMMENT ON COLUMN runs.is_paused IS 'True when research is paused by user';
COMMENT ON COLUMN runs.paused_at IS 'Timestamp when run was paused';
COMMENT ON COLUMN runs.resumed_at IS 'Timestamp when run was last resumed';
