-- Add excluded_states field to runs table for Australia-wide searches
-- This allows users to search "All Australia" while excluding specific states (e.g., everything but VIC)

ALTER TABLE runs
ADD COLUMN IF NOT EXISTS excluded_states TEXT[] DEFAULT NULL;

COMMENT ON COLUMN runs.excluded_states IS 'Array of state codes (NSW, VIC, QLD, WA, SA, ACT, TAS) to exclude from Australia-wide searches';
