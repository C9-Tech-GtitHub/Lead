-- Add 'prescreening' status to runs table
ALTER TABLE runs
  DROP CONSTRAINT IF EXISTS runs_status_check;

ALTER TABLE runs
  ADD CONSTRAINT runs_status_check
  CHECK (status IN ('pending', 'scraping', 'prescreening', 'ready', 'researching', 'completed', 'failed'));
