-- Add 'ready' status to runs table
-- This status indicates leads have been scraped and are ready for research

ALTER TABLE runs DROP CONSTRAINT IF EXISTS runs_status_check;
ALTER TABLE runs ADD CONSTRAINT runs_status_check
  CHECK (status IN ('pending', 'scraping', 'ready', 'researching', 'completed', 'failed'));

COMMENT ON COLUMN runs.status IS 'Run status: pending (not started), scraping (finding leads), ready (leads found, awaiting research), researching (AI analyzing), completed (all done), failed (error occurred)';
