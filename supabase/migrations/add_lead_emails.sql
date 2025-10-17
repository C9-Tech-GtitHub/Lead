-- ============================================
-- ADD LEAD EMAILS TABLE
-- ============================================
-- Stores emails found via Hunter.io for each lead
-- ============================================

CREATE TABLE IF NOT EXISTS lead_emails (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Email details from Hunter.io
  email TEXT NOT NULL,
  type TEXT CHECK (type IN ('personal', 'generic')),
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),

  -- Person details
  first_name TEXT,
  last_name TEXT,
  position TEXT,
  department TEXT,
  seniority TEXT,

  -- Verification status
  verification_status TEXT CHECK (verification_status IN ('valid', 'accept_all', 'unknown')),
  verification_date TIMESTAMPTZ,

  -- Metadata
  sources JSONB, -- Array of source URLs where email was found
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique emails per lead
  UNIQUE(lead_id, email)
);

-- Enable RLS on lead_emails
ALTER TABLE lead_emails ENABLE ROW LEVEL SECURITY;

-- Lead emails policies
CREATE POLICY "Users can view own lead emails" ON lead_emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own lead emails" ON lead_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lead emails" ON lead_emails
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lead emails" ON lead_emails
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_emails_lead_id ON lead_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_emails_user_id ON lead_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_emails_type ON lead_emails(type);
CREATE INDEX IF NOT EXISTS idx_lead_emails_created_at ON lead_emails(created_at DESC);

-- Update updated_at trigger
CREATE TRIGGER update_lead_emails_updated_at BEFORE UPDATE ON lead_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for lead_emails
ALTER PUBLICATION supabase_realtime ADD TABLE lead_emails;

-- Add hunter_io_searched_at column to leads table to track when emails were searched
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hunter_io_searched_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hunter_organization TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hunter_email_pattern TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hunter_total_emails INTEGER;
