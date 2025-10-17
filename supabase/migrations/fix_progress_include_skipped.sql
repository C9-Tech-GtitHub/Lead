-- Fix progress calculation to include skipped leads (prescreened as franchises)
-- This ensures progress bar moves when leads are prescreened as F and marked as skipped

CREATE OR REPLACE FUNCTION update_run_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update grade counts
  UPDATE runs SET
    total_leads = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id
    ),
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
    progress = LEAST(100, ROUND(
      -- Include 'skipped' status for prescreened franchises
      (SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND research_status IN ('completed', 'failed', 'skipped'))::NUMERIC /
      (SELECT target_count FROM runs WHERE id = NEW.run_id)::NUMERIC * 100
    ))
  WHERE id = NEW.run_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
