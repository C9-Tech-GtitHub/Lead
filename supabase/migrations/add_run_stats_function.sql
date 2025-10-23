-- ============================================
-- ADD FUNCTION TO GET RUN STATS EFFICIENTLY
-- ============================================
-- This bypasses the PostgREST row limit by using a SQL function
-- ============================================

-- Function to get lead count per run
CREATE OR REPLACE FUNCTION get_run_lead_counts()
RETURNS TABLE (
  run_id UUID,
  lead_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    leads.run_id,
    COUNT(*)::BIGINT as lead_count
  FROM leads
  GROUP BY leads.run_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_run_lead_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_run_lead_counts TO anon;

-- Function to get status counts
CREATE OR REPLACE FUNCTION get_status_counts()
RETURNS TABLE (
  lead_status TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    leads.lead_status,
    COUNT(*)::BIGINT
  FROM leads
  GROUP BY leads.lead_status;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_status_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_status_counts TO anon;
