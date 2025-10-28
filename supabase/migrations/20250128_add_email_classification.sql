-- ============================================
-- ADD EMAIL CLASSIFICATION AND PRIORITY SCORING
-- ============================================
-- Adds granular email categorization and priority scoring
-- to help select the best email for maximum reply likelihood
-- ============================================

-- Add new columns to lead_emails table
ALTER TABLE lead_emails
  ADD COLUMN IF NOT EXISTS email_category TEXT
    CHECK (email_category IN (
      'named_personal',
      'role_personal',
      'department',
      'generic_catchall',
      'location',
      'automated',
      'unknown'
    )),
  ADD COLUMN IF NOT EXISTS priority_score INTEGER
    CHECK (priority_score >= 0 AND priority_score <= 100),
  ADD COLUMN IF NOT EXISTS classification_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false;

-- Add index on priority_score for efficient "best email" queries
CREATE INDEX IF NOT EXISTS idx_lead_emails_priority_score
  ON lead_emails(priority_score DESC);

-- Add index on email_category for filtering
CREATE INDEX IF NOT EXISTS idx_lead_emails_category
  ON lead_emails(email_category);

-- Add index on is_recommended for quick filtering
CREATE INDEX IF NOT EXISTS idx_lead_emails_recommended
  ON lead_emails(is_recommended)
  WHERE is_recommended = true;

-- Add composite index for finding best email per lead
CREATE INDEX IF NOT EXISTS idx_lead_emails_best_per_lead
  ON lead_emails(lead_id, priority_score DESC, confidence DESC);

-- Comments for documentation
COMMENT ON COLUMN lead_emails.email_category IS 'Granular email category: named_personal (highest), role_personal, department, generic_catchall, location, automated (do not contact)';
COMMENT ON COLUMN lead_emails.priority_score IS 'Priority score 0-100 indicating reply likelihood (higher = better chance of reply)';
COMMENT ON COLUMN lead_emails.classification_reasoning IS 'Human-readable explanation of why this email received its category and score';
COMMENT ON COLUMN lead_emails.is_recommended IS 'Whether this email is recommended for outreach based on its category and score';

-- ============================================
-- ADD DOMAIN-LEVEL CONTACT TRACKING
-- ============================================
-- Track which domains we've already contacted to prevent duplicates
-- ============================================

-- Create table to track domain contact history
CREATE TABLE IF NOT EXISTS domain_contact_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  email_sent TEXT NOT NULL, -- The specific email address we sent to
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL, -- Which lead this was sent to
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  campaign_id TEXT, -- Optional: track which campaign this was part of

  -- Prevent duplicate tracking
  UNIQUE(user_id, domain, sent_at)
);

-- Enable RLS
ALTER TABLE domain_contact_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own domain contact history"
  ON domain_contact_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own domain contact history"
  ON domain_contact_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_domain_contact_history_user_domain
  ON domain_contact_history(user_id, domain);

CREATE INDEX IF NOT EXISTS idx_domain_contact_history_sent_at
  ON domain_contact_history(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_contact_history_lead_id
  ON domain_contact_history(lead_id);

-- Comments
COMMENT ON TABLE domain_contact_history IS 'Tracks which domains have been contacted to prevent sending multiple emails to the same business';
COMMENT ON COLUMN domain_contact_history.domain IS 'The email domain (e.g., example.com) that was contacted';
COMMENT ON COLUMN domain_contact_history.email_sent IS 'The specific email address we sent to (e.g., sales@example.com)';
COMMENT ON COLUMN domain_contact_history.campaign_id IS 'Optional campaign identifier for tracking which outreach campaign this was part of';

-- ============================================
-- HELPER FUNCTION: Get Best Email for Lead
-- ============================================
-- Returns the highest priority email for a given lead
-- ============================================

CREATE OR REPLACE FUNCTION get_best_email_for_lead(p_lead_id UUID)
RETURNS TABLE (
  email TEXT,
  email_category TEXT,
  priority_score INTEGER,
  confidence INTEGER,
  classification_reasoning TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    le.email,
    le.email_category,
    le.priority_score,
    le.confidence,
    le.classification_reasoning
  FROM lead_emails le
  WHERE le.lead_id = p_lead_id
    AND le.email_category != 'automated' -- Never return automated emails
  ORDER BY
    le.priority_score DESC NULLS LAST,
    le.confidence DESC NULLS LAST,
    le.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Check if Domain Already Contacted
-- ============================================
-- Returns true if we've already sent an email to this domain
-- ============================================

CREATE OR REPLACE FUNCTION is_domain_already_contacted(
  p_user_id UUID,
  p_domain TEXT,
  p_days_ago INTEGER DEFAULT 180 -- Default: check last 6 months
)
RETURNS BOOLEAN AS $$
DECLARE
  v_contacted BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM domain_contact_history
    WHERE user_id = p_user_id
      AND domain = p_domain
      AND sent_at > NOW() - (p_days_ago || ' days')::INTERVAL
  ) INTO v_contacted;

  RETURN v_contacted;
END;
$$ LANGUAGE plpgsql;

-- Comments on functions
COMMENT ON FUNCTION get_best_email_for_lead IS 'Returns the best email to use for contacting a lead, based on priority score and confidence';
COMMENT ON FUNCTION is_domain_already_contacted IS 'Check if we have already contacted a domain within the specified time period (default 6 months)';
