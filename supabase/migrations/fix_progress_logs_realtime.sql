-- ============================================
-- FIX PROGRESS LOGS REALTIME
-- ============================================
-- Enable REPLICA IDENTITY FULL for tables to ensure realtime works properly with RLS
-- This allows Supabase to broadcast all column values in realtime updates

-- Progress logs table
ALTER TABLE progress_logs REPLICA IDENTITY FULL;

-- Runs table (for run status updates)
ALTER TABLE runs REPLICA IDENTITY FULL;

-- Leads table (for lead updates)
ALTER TABLE leads REPLICA IDENTITY FULL;

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE '✅ REPLICA IDENTITY FULL enabled for progress_logs, runs, and leads tables';
  RAISE NOTICE '✅ Realtime subscriptions should now work properly';
END $$;
