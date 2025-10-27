-- Migration: Add AI email search tracking fields
-- Track when AI email finder was used and whether it found emails

-- Add AI email search tracking columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_email_searched_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_email_search_summary TEXT;

-- Add index for filtering by AI search status
CREATE INDEX IF NOT EXISTS idx_leads_ai_email_searched ON leads(ai_email_searched_at);

COMMENT ON COLUMN leads.ai_email_searched_at IS 'Timestamp when AI email finder was run for this lead';
COMMENT ON COLUMN leads.ai_email_search_summary IS 'AI summary of email search results (especially useful when no emails found)';
