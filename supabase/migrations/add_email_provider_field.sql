-- ============================================
-- ADD PROVIDER FIELD TO LEAD_EMAILS
-- ============================================
-- Track which service (Hunter.io or Tomba.io) found each email
-- ============================================

-- Add provider column to lead_emails table
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS provider TEXT CHECK (provider IN ('hunter', 'tomba')) DEFAULT 'hunter';

-- Add provider-specific metadata columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tomba_searched_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tomba_organization TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tomba_email_pattern TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tomba_total_emails INTEGER;

-- Add index for provider filtering
CREATE INDEX IF NOT EXISTS idx_lead_emails_provider ON lead_emails(provider);
