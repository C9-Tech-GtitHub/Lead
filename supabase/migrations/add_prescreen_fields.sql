-- Add prescreen fields to leads table
-- This tracks AI prescreen results to avoid wasting credits on franchises

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS prescreened BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS prescreen_result TEXT, -- 'skip' or 'research'
ADD COLUMN IF NOT EXISTS prescreen_reason TEXT,
ADD COLUMN IF NOT EXISTS is_franchise BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_national_brand BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS prescreen_confidence TEXT CHECK (prescreen_confidence IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS prescreened_at TIMESTAMPTZ;

-- Add index for filtering prescreened leads
CREATE INDEX IF NOT EXISTS idx_leads_prescreened ON leads(prescreened);
CREATE INDEX IF NOT EXISTS idx_leads_prescreen_result ON leads(prescreen_result);

-- Update the research_status check constraint to include 'prescreened' and 'skipped'
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_research_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_research_status_check
  CHECK (research_status IN ('pending', 'prescreening', 'skipped', 'scraping', 'analyzing', 'completed', 'failed'));

COMMENT ON COLUMN leads.prescreened IS 'Whether the lead has been prescreened by AI';
COMMENT ON COLUMN leads.prescreen_result IS 'Prescreen decision: skip or research';
COMMENT ON COLUMN leads.prescreen_reason IS 'AI explanation for the prescreen decision';
COMMENT ON COLUMN leads.is_franchise IS 'Whether the business is identified as a franchise';
COMMENT ON COLUMN leads.is_national_brand IS 'Whether the business is a national/international brand';
COMMENT ON COLUMN leads.prescreen_confidence IS 'AI confidence level in the prescreen decision';
