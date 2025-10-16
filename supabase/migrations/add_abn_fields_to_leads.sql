-- ============================================
-- Add ABN (Australian Business Number) fields to leads table
-- ============================================

-- Add columns for ABN information
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS abn TEXT,
ADD COLUMN IF NOT EXISTS abn_entity_name TEXT,
ADD COLUMN IF NOT EXISTS abn_status TEXT,
ADD COLUMN IF NOT EXISTS abn_registered_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS business_age_years INTEGER;

-- Add index for ABN lookups
CREATE INDEX IF NOT EXISTS idx_leads_abn ON leads(abn) WHERE abn IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN leads.abn IS 'Australian Business Number (11 digits)';
COMMENT ON COLUMN leads.abn_entity_name IS 'Registered entity name from ABR lookup';
COMMENT ON COLUMN leads.abn_status IS 'ABN status (Active, Cancelled, etc.)';
COMMENT ON COLUMN leads.abn_registered_date IS 'Date when ABN was registered';
COMMENT ON COLUMN leads.business_age_years IS 'Years since ABN registration';
