-- ============================================
-- SENDGRID EMAIL TRACKING INTEGRATION
-- ============================================
-- Tracks email sends, bounces, unsubscribes, and suppressions
-- READ-ONLY integration - app never sends emails
-- ============================================

-- ============================================
-- EMAIL SUPPRESSION TABLE
-- ============================================
-- Permanent suppression list - NEVER contact these emails
CREATE TABLE IF NOT EXISTS email_suppression (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Email details
  email TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL, -- Extracted from email for domain-level blocking

  -- Suppression source tracking
  source TEXT NOT NULL CHECK (source IN (
    'manual',           -- Manually added by admin
    'bounce',           -- Hard bounce from SendGrid
    'unsubscribe',      -- User unsubscribed
    'spam_report',      -- Marked as spam
    'invalid',          -- Invalid email address
    'global_suppression' -- SendGrid global suppression
  )),

  -- Metadata
  reason TEXT,                          -- Why this email was suppressed
  sendgrid_created_at TIMESTAMPTZ,      -- When SendGrid recorded this
  synced_from_sendgrid BOOLEAN DEFAULT FALSE, -- Was this synced from SendGrid?

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_suppression_email ON email_suppression(email);
CREATE INDEX IF NOT EXISTS idx_email_suppression_domain ON email_suppression(domain);
CREATE INDEX IF NOT EXISTS idx_email_suppression_source ON email_suppression(source);

-- Enable RLS
ALTER TABLE email_suppression ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read suppression list
CREATE POLICY "Users can view email suppression list" ON email_suppression
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role can insert/update suppressions
CREATE POLICY "Service role can manage suppressions" ON email_suppression
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- EMAIL SEND HISTORY TABLE
-- ============================================
-- Tracks when emails were sent (manually via SendGrid)
CREATE TABLE IF NOT EXISTS email_send_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Email details
  email TEXT NOT NULL,
  domain TEXT NOT NULL, -- Extracted from email

  -- SendGrid message details
  sendgrid_msg_id TEXT,              -- SendGrid's message ID
  sendgrid_event_type TEXT,          -- 'processed', 'delivered', 'bounce', etc.

  -- Campaign/batch tracking (optional)
  campaign_name TEXT,                -- User-defined campaign name
  batch_id TEXT,                     -- Group sends together

  -- Lead association (if available)
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Timing
  sent_at TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,

  -- Status tracking
  status TEXT CHECK (status IN (
    'sent',         -- Email was sent
    'delivered',    -- Confirmed delivered
    'opened',       -- Recipient opened
    'clicked',      -- Recipient clicked link
    'bounced',      -- Hard bounce
    'dropped'       -- SendGrid dropped it
  )),

  -- Metadata
  bounce_reason TEXT,
  synced_from_sendgrid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_send_history_email ON email_send_history(email);
CREATE INDEX IF NOT EXISTS idx_email_send_history_domain ON email_send_history(domain);
CREATE INDEX IF NOT EXISTS idx_email_send_history_lead_id ON email_send_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_send_history_sent_at ON email_send_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_history_status ON email_send_history(status);

-- Enable RLS
ALTER TABLE email_send_history ENABLE ROW LEVEL SECURITY;

-- Users can view send history for their own leads
CREATE POLICY "Users can view own email send history" ON email_send_history
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM leads WHERE user_id = auth.uid()
    )
  );

-- Service role can manage all records
CREATE POLICY "Service role can manage send history" ON email_send_history
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- DOMAIN CONTACT TRACKING TABLE
-- ============================================
-- Tracks last contact date per domain (6 month cadence)
CREATE TABLE IF NOT EXISTS domain_contact_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Domain tracking
  domain TEXT NOT NULL UNIQUE,

  -- Contact history
  first_contacted_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ NOT NULL,
  total_contacts INTEGER DEFAULT 1,

  -- Cadence enforcement
  can_contact_after TIMESTAMPTZ NOT NULL, -- 6 months from last contact

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_domain_contact_domain ON domain_contact_tracking(domain);
CREATE INDEX IF NOT EXISTS idx_domain_contact_can_contact ON domain_contact_tracking(can_contact_after);

-- Enable RLS
ALTER TABLE domain_contact_tracking ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Users can view domain contact tracking" ON domain_contact_tracking
  FOR SELECT USING (auth.role() = 'authenticated');

-- Service role can manage
CREATE POLICY "Service role can manage domain tracking" ON domain_contact_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- SENDGRID SYNC LOG TABLE
-- ============================================
-- Audit trail for all SendGrid API sync operations
CREATE TABLE IF NOT EXISTS sendgrid_sync_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Sync details
  sync_type TEXT NOT NULL CHECK (sync_type IN (
    'bounces',
    'unsubscribes',
    'spam_reports',
    'invalid_emails',
    'send_stats',
    'suppressions'
  )),

  -- Results
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  records_synced INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Metadata
  triggered_by TEXT, -- 'manual', 'scheduled', 'webhook'
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sendgrid_sync_log_sync_type ON sendgrid_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_sendgrid_sync_log_status ON sendgrid_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_sendgrid_sync_log_created_at ON sendgrid_sync_log(created_at DESC);

-- Enable RLS
ALTER TABLE sendgrid_sync_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own sync logs
CREATE POLICY "Users can view own sync logs" ON sendgrid_sync_log
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Service role can insert
CREATE POLICY "Service role can create sync logs" ON sendgrid_sync_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- ADD EMAIL TRACKING COLUMNS TO LEADS TABLE
-- ============================================

-- Add email status tracking to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'unknown'
  CHECK (email_status IN (
    'unknown',      -- Not yet checked
    'valid',        -- Valid and can be contacted
    'suppressed',   -- On suppression list
    'bounced',      -- Hard bounce
    'unsubscribed', -- User unsubscribed
    'invalid'       -- Invalid email format
  ));

-- Track when we last contacted this lead
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ;

-- Track domain for contact cadence checking
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_domain TEXT;

-- SendGrid contact ID (if we sync contacts to SendGrid)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sendgrid_contact_id TEXT;

-- Last time we synced with SendGrid
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sendgrid_synced_at TIMESTAMPTZ;

-- Index for email status filtering
CREATE INDEX IF NOT EXISTS idx_leads_email_status ON leads(email_status);
CREATE INDEX IF NOT EXISTS idx_leads_email_domain ON leads(email_domain);
CREATE INDEX IF NOT EXISTS idx_leads_last_email_sent ON leads(last_email_sent_at);

-- ============================================
-- FUNCTIONS FOR EMAIL TRACKING
-- ============================================

-- Function to extract domain from email
CREATE OR REPLACE FUNCTION extract_domain_from_email(email_address TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Extract domain after @ symbol
  RETURN LOWER(SPLIT_PART(email_address, '@', 2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if domain can be contacted (6 month cadence)
CREATE OR REPLACE FUNCTION can_contact_domain(domain_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  last_contact_record RECORD;
BEGIN
  -- Check if domain exists in tracking table
  SELECT * INTO last_contact_record
  FROM domain_contact_tracking
  WHERE domain = LOWER(domain_name);

  -- If domain not found, can contact
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- Check if 6 months have passed
  RETURN last_contact_record.can_contact_after <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to record domain contact (updates tracking)
CREATE OR REPLACE FUNCTION record_domain_contact(domain_name TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO domain_contact_tracking (
    domain,
    first_contacted_at,
    last_contacted_at,
    total_contacts,
    can_contact_after
  ) VALUES (
    LOWER(domain_name),
    NOW(),
    NOW(),
    1,
    NOW() + INTERVAL '6 months' -- 6 month cadence
  )
  ON CONFLICT (domain) DO UPDATE SET
    last_contacted_at = NOW(),
    total_contacts = domain_contact_tracking.total_contacts + 1,
    can_contact_after = NOW() + INTERVAL '6 months',
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-populate email_domain on leads
CREATE OR REPLACE FUNCTION populate_lead_email_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract domain from hunter_io emails if available
  IF NEW.hunter_organization IS NOT NULL THEN
    -- Use the domain from hunter.io data (stored in website or other field)
    IF NEW.website IS NOT NULL THEN
      NEW.email_domain := extract_domain_from_email(
        COALESCE(
          (SELECT email FROM lead_emails WHERE lead_id = NEW.id LIMIT 1),
          'unknown@' || REGEXP_REPLACE(NEW.website, 'https?://(www\.)?', '')
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_populate_lead_email_domain ON leads;
CREATE TRIGGER trigger_populate_lead_email_domain
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION populate_lead_email_domain();

-- ============================================
-- INSERT PERMANENT SUPPRESSION LIST
-- ============================================
-- Add the 4 emails that must NEVER be contacted

INSERT INTO email_suppression (email, domain, source, reason, synced_from_sendgrid)
VALUES
  ('info@unlimitedroofing.com.au', 'unlimitedroofing.com.au', 'manual', 'Permanent suppression - do not contact', FALSE),
  ('sales@swiftaircon.com.au', 'swiftaircon.com.au', 'manual', 'Permanent suppression - do not contact', FALSE),
  ('contactus@ritepartyhire.com.au', 'ritepartyhire.com.au', 'manual', 'Permanent suppression - do not contact', FALSE),
  ('info@instantcanopy.com.au', 'instantcanopy.com.au', 'manual', 'Permanent suppression - do not contact', FALSE)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- REALTIME PUBLICATION
-- ============================================
-- Enable realtime for new tables (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE email_suppression;
ALTER PUBLICATION supabase_realtime ADD TABLE email_send_history;
ALTER PUBLICATION supabase_realtime ADD TABLE domain_contact_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE sendgrid_sync_log;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Created email_suppression table';
  RAISE NOTICE '✅ Created email_send_history table';
  RAISE NOTICE '✅ Created domain_contact_tracking table';
  RAISE NOTICE '✅ Created sendgrid_sync_log table';
  RAISE NOTICE '✅ Added email tracking columns to leads table';
  RAISE NOTICE '✅ Created helper functions for domain tracking';
  RAISE NOTICE '✅ Inserted 4 permanent suppression emails';
  RAISE NOTICE '✅ 6 month contact cadence configured';
  RAISE NOTICE '';
  RAISE NOTICE 'SendGrid email tracking integration ready!';
  RAISE NOTICE 'Remember: This app NEVER sends emails - read-only sync only';
END $$;
