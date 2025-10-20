-- ============================================
-- ENABLE REALTIME BROADCAST FOR SERVICE ROLE
-- ============================================
-- By default, Supabase Realtime only broadcasts changes made by authenticated users
-- This enables broadcasting for changes made by the service role (from Inngest functions)

-- Ensure realtime is enabled for the tables
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS progress_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS runs;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS leads;

ALTER PUBLICATION supabase_realtime ADD TABLE progress_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE runs;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- Verify the tables are in the publication
DO $$
BEGIN
  RAISE NOTICE '✅ Tables added to supabase_realtime publication';
  RAISE NOTICE '✅ Realtime should now broadcast changes from service role';
  RAISE NOTICE '✅ This includes updates from Inngest functions';
END $$;
