-- Fix progress calculation to use actual scraped leads (total_leads) instead of target_count
-- This ensures progress reaches 100% when all scraped leads are processed,
-- even if fewer leads were found than the target

CREATE OR REPLACE FUNCTION update_run_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_total_leads INTEGER;
  v_processed_leads INTEGER;
BEGIN
  -- Count total leads for this run
  SELECT COUNT(*) INTO v_total_leads
  FROM leads WHERE run_id = NEW.run_id;

  -- Count processed leads (completed, failed, or skipped)
  SELECT COUNT(*) INTO v_processed_leads
  FROM leads WHERE run_id = NEW.run_id
  AND research_status IN ('completed', 'failed', 'skipped');

  -- Update run statistics
  UPDATE runs SET
    total_leads = v_total_leads,
    grade_a_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'A'
    ),
    grade_b_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'B'
    ),
    grade_c_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'C'
    ),
    grade_d_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'D'
    ),
    grade_f_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'F'
    ),
    -- Calculate progress based on actual leads scraped, not target
    progress = CASE
      WHEN v_total_leads > 0 THEN LEAST(100, ROUND((v_processed_leads::NUMERIC / v_total_leads::NUMERIC) * 100))
      ELSE 0
    END
  WHERE id = NEW.run_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
