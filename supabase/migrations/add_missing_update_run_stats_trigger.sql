-- ============================================
-- ADD MISSING TRIGGER FOR update_run_stats
-- ============================================
-- The update_run_stats() function exists but the trigger was never created
-- This trigger ensures run progress and grade counts update automatically

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_update_run_stats ON leads;

-- Create the trigger on leads table
-- Fires after INSERT or UPDATE on any lead
CREATE TRIGGER trigger_update_run_stats
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_run_stats();

-- Verify the trigger was created
DO $$
BEGIN
  RAISE NOTICE '✅ Created trigger_update_run_stats on leads table';
  RAISE NOTICE '✅ Run progress and grades will now update automatically';
END $$;
