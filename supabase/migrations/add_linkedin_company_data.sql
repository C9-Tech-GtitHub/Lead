-- ============================================
-- ADD LINKEDIN COMPANY DATA TABLES
-- ============================================
-- Stores LinkedIn company profile and employee structure
-- ============================================

-- Add LinkedIn company data columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_company_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_company_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_scraped_at TIMESTAMPTZ;

-- Company profile data stored as JSONB
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_company_data JSONB;

-- Store key people/employees from LinkedIn
CREATE TABLE IF NOT EXISTS lead_linkedin_people (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Person details from LinkedIn
  linkedin_profile_id TEXT,
  linkedin_profile_url TEXT,
  full_name TEXT NOT NULL,
  headline TEXT,
  position TEXT,

  -- Profile photo
  profile_image_url TEXT,

  -- Contact info (if available)
  email TEXT,

  -- Profile data stored as JSONB for flexibility
  profile_data JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique people per lead
  UNIQUE(lead_id, linkedin_profile_id)
);

-- Enable RLS on lead_linkedin_people
ALTER TABLE lead_linkedin_people ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own linkedin people" ON lead_linkedin_people
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own linkedin people" ON lead_linkedin_people
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own linkedin people" ON lead_linkedin_people
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own linkedin people" ON lead_linkedin_people
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_linkedin_people_lead_id ON lead_linkedin_people(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_linkedin_people_user_id ON lead_linkedin_people(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_linkedin_people_created_at ON lead_linkedin_people(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_lead_linkedin_people_updated_at BEFORE UPDATE ON lead_linkedin_people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for lead_linkedin_people
ALTER PUBLICATION supabase_realtime ADD TABLE lead_linkedin_people;

-- Add index on leads for LinkedIn company ID
CREATE INDEX IF NOT EXISTS idx_leads_linkedin_company_id ON leads(linkedin_company_id);
