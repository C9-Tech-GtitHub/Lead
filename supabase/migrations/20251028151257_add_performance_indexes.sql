-- Add indexes for leads table filtering and sorting performance
-- This migration adds indexes to optimize the leads dashboard queries

-- Index for filtering by status (very common filter)
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status) WHERE lead_status IS NOT NULL;

-- Index for filtering by grade (common filter)
CREATE INDEX IF NOT EXISTS idx_leads_grade ON leads(compatibility_grade) WHERE compatibility_grade IS NOT NULL;

-- Index for filtering by run_id (essential for run selection)
CREATE INDEX IF NOT EXISTS idx_leads_run_id ON leads(run_id);

-- Index for email status filtering
CREATE INDEX IF NOT EXISTS idx_leads_email_status ON leads(email_status) WHERE email_status IS NOT NULL;

-- Index for email domain (used for suppression and contact tracking lookups)
CREATE INDEX IF NOT EXISTS idx_leads_email_domain ON leads(email_domain) WHERE email_domain IS NOT NULL;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_leads_run_status ON leads(run_id, lead_status);

-- Index for sorting by created_at (most common sort)
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Index for sorting by last_email_sent_at
CREATE INDEX IF NOT EXISTS idx_leads_last_sent ON leads(last_email_sent_at DESC) WHERE last_email_sent_at IS NOT NULL;

-- Index for AI email search filtering
CREATE INDEX IF NOT EXISTS idx_leads_ai_searched ON leads(ai_email_searched_at) WHERE ai_email_searched_at IS NOT NULL;

-- Indexes for lead_emails table
CREATE INDEX IF NOT EXISTS idx_lead_emails_lead_id ON lead_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_emails_type ON lead_emails(type) WHERE type IS NOT NULL;

-- Composite index for email type filtering
CREATE INDEX IF NOT EXISTS idx_lead_emails_lead_type ON lead_emails(lead_id, type);

-- Indexes for email_suppression table
CREATE INDEX IF NOT EXISTS idx_email_suppression_domain ON email_suppression(domain);

-- Indexes for domain_contact_tracking table
CREATE INDEX IF NOT EXISTS idx_domain_contact_tracking_domain ON domain_contact_tracking(domain);
CREATE INDEX IF NOT EXISTS idx_domain_contact_tracking_can_contact ON domain_contact_tracking(can_contact_after);

-- Add GiN index for text search on name, website, city, industry
CREATE INDEX IF NOT EXISTS idx_leads_search ON leads USING gin(
  to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(website, '') || ' ' ||
    coalesce(city, '') || ' ' ||
    coalesce(industry, '')
  )
);
