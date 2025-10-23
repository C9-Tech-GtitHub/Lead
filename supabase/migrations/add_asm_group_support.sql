-- ============================================
-- ADD ASM GROUP SUPPORT TO EMAIL SUPPRESSION
-- ============================================
-- Adds support for SendGrid ASM (Advanced Suppression Manager) groups

-- Add asm_group to the source check constraint
ALTER TABLE email_suppression
  DROP CONSTRAINT IF EXISTS email_suppression_source_check;

ALTER TABLE email_suppression
  ADD CONSTRAINT email_suppression_source_check
  CHECK (source IN (
    'manual',
    'bounce',
    'unsubscribe',
    'spam_report',
    'invalid',
    'global_suppression',
    'asm_group'  -- NEW: ASM unsubscribe group
  ));

-- Add ASM group columns
ALTER TABLE email_suppression
  ADD COLUMN IF NOT EXISTS asm_group_id INTEGER;

ALTER TABLE email_suppression
  ADD COLUMN IF NOT EXISTS asm_group_name TEXT;

-- Add index for ASM group lookups
CREATE INDEX IF NOT EXISTS idx_email_suppression_asm_group
  ON email_suppression(asm_group_id)
  WHERE asm_group_id IS NOT NULL;

-- Add asm_groups to sendgrid_sync_log sync_type
ALTER TABLE sendgrid_sync_log
  DROP CONSTRAINT IF EXISTS sendgrid_sync_log_sync_type_check;

ALTER TABLE sendgrid_sync_log
  ADD CONSTRAINT sendgrid_sync_log_sync_type_check
  CHECK (sync_type IN (
    'bounces',
    'unsubscribes',
    'spam_reports',
    'invalid_emails',
    'send_stats',
    'suppressions',
    'asm_groups'  -- NEW: ASM group suppressions
  ));

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Added asm_group to source constraint';
  RAISE NOTICE '✅ Added asm_group_id and asm_group_name columns';
  RAISE NOTICE '✅ Added asm_groups to sync_type constraint';
  RAISE NOTICE '✅ Created index for ASM group lookups';
  RAISE NOTICE '';
  RAISE NOTICE 'ASM group support ready!';
END $$;
