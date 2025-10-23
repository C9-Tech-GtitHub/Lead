-- ============================================
-- PERFORMANCE INDEXES FOR SENDGRID INTEGRATION
-- ============================================
-- Adds composite indexes to improve query performance

-- ============================================
-- EMAIL SUPPRESSION TABLE INDEXES
-- ============================================

-- Composite index for fast suppression lookups
-- Covers common query: WHERE email = ? AND source = ?
CREATE INDEX IF NOT EXISTS idx_email_suppression_composite
  ON email_suppression(email, source, domain);

-- Index for domain-based queries with status filtering
CREATE INDEX IF NOT EXISTS idx_email_suppression_domain_source
  ON email_suppression(domain, source)
  WHERE synced_from_sendgrid = true;

-- Index for date-based queries (finding recent suppressions)
CREATE INDEX IF NOT EXISTS idx_email_suppression_created
  ON email_suppression(created_at DESC)
  WHERE synced_from_sendgrid = true;

-- Index for SendGrid timestamp queries
CREATE INDEX IF NOT EXISTS idx_email_suppression_sendgrid_created
  ON email_suppression(sendgrid_created_at DESC)
  WHERE sendgrid_created_at IS NOT NULL;

-- ============================================
-- LEADS TABLE INDEXES
-- ============================================

-- Composite index for email status and domain queries
-- Covers: WHERE email_status IN (...) AND email_domain = ?
CREATE INDEX IF NOT EXISTS idx_leads_email_status_domain
  ON leads(email_status, email_domain)
  WHERE email_status IN ('bounced', 'unsubscribed', 'suppressed');

-- Index for finding leads that can be contacted
CREATE INDEX IF NOT EXISTS idx_leads_contactable
  ON leads(email_domain, last_email_sent_at)
  WHERE email_status = 'valid' OR email_status = 'unknown';

-- Index for SendGrid sync tracking
CREATE INDEX IF NOT EXISTS idx_leads_sendgrid_sync
  ON leads(sendgrid_synced_at DESC)
  WHERE sendgrid_contact_id IS NOT NULL;

-- ============================================
-- EMAIL SEND HISTORY INDEXES
-- ============================================

-- Composite index for email and campaign tracking
CREATE INDEX IF NOT EXISTS idx_email_send_history_composite
  ON email_send_history(email, sent_at DESC, status);

-- Index for domain-based send history
CREATE INDEX IF NOT EXISTS idx_email_send_history_domain_sent
  ON email_send_history(domain, sent_at DESC);

-- Index for lead send history lookups
CREATE INDEX IF NOT EXISTS idx_email_send_history_lead_status
  ON email_send_history(lead_id, status, sent_at DESC)
  WHERE lead_id IS NOT NULL;

-- Index for campaign analytics
CREATE INDEX IF NOT EXISTS idx_email_send_history_campaign
  ON email_send_history(campaign_name, sent_at DESC, status)
  WHERE campaign_name IS NOT NULL;

-- ============================================
-- DOMAIN CONTACT TRACKING INDEXES
-- ============================================

-- Index for cadence checking (already exists, but ensure it's covering)
DROP INDEX IF EXISTS idx_domain_contact_can_contact;
CREATE INDEX idx_domain_contact_can_contact
  ON domain_contact_tracking(domain, can_contact_after, last_contacted_at);

-- Index for finding recently contacted domains
CREATE INDEX IF NOT EXISTS idx_domain_contact_recent
  ON domain_contact_tracking(last_contacted_at DESC)
  WHERE can_contact_after > NOW();

-- ============================================
-- SENDGRID SYNC LOG INDEXES
-- ============================================

-- Composite index for sync history queries
CREATE INDEX IF NOT EXISTS idx_sendgrid_sync_log_composite
  ON sendgrid_sync_log(sync_type, status, started_at DESC);

-- Index for finding last successful sync
CREATE INDEX IF NOT EXISTS idx_sendgrid_sync_log_last_success
  ON sendgrid_sync_log(sync_type, started_at DESC)
  WHERE status = 'success';

-- Index for error tracking
CREATE INDEX IF NOT EXISTS idx_sendgrid_sync_log_errors
  ON sendgrid_sync_log(started_at DESC, errors_count)
  WHERE status IN ('failed', 'partial');

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

ANALYZE email_suppression;
ANALYZE leads;
ANALYZE email_send_history;
ANALYZE domain_contact_tracking;
ANALYZE sendgrid_sync_log;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  -- Count indexes on email_suppression
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'email_suppression'
    AND schemaname = 'public';

  RAISE NOTICE '✅ Created composite indexes for email_suppression (% total)', index_count;

  -- Count indexes on leads
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'leads'
    AND schemaname = 'public';

  RAISE NOTICE '✅ Created composite indexes for leads (% total)', index_count;

  -- Count indexes on email_send_history
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'email_send_history'
    AND schemaname = 'public';

  RAISE NOTICE '✅ Created composite indexes for email_send_history (% total)', index_count;

  RAISE NOTICE '✅ Analyzed all tables for query optimization';
  RAISE NOTICE '';
  RAISE NOTICE 'Performance indexes ready!';
END $$;
