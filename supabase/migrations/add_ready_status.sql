-- Add 'ready' status to runs table
-- This status indicates scraping is complete and ready for manual research trigger

ALTER TABLE runs
  DROP CONSTRAINT IF EXISTS runs_status_check;

ALTER TABLE runs
  ADD CONSTRAINT runs_status_check
  CHECK (status IN ('pending', 'scraping', 'ready', 'researching', 'completed', 'failed'));

-- Update existing runs that might be in an intermediate state
UPDATE runs
SET status = 'ready'
WHERE status = 'scraping'
  AND total_leads > 0
  AND completed_at IS NULL;
