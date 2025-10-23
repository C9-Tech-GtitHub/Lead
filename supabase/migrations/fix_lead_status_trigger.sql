-- ============================================
-- FIX LEAD STATUS TRIGGER
-- ============================================
-- Allow manual status override for F-grade leads
-- Only auto-mark F-grade on initial grading
-- ============================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS auto_mark_f_grade_trigger ON leads;

-- Update function to only auto-mark when status is still 'new'
CREATE OR REPLACE FUNCTION auto_mark_f_grade_not_eligible()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-mark if:
  -- 1. Lead is being graded F for the first time (compatibility_grade changed to F)
  -- 2. Status is still 'new' (hasn't been manually changed)
  IF NEW.compatibility_grade = 'F'
     AND (OLD.compatibility_grade IS NULL OR OLD.compatibility_grade != 'F')
     AND NEW.lead_status = 'new' THEN
    NEW.lead_status = 'not_eligible';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER auto_mark_f_grade_trigger
  BEFORE INSERT OR UPDATE OF compatibility_grade ON leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_f_grade_not_eligible();

-- Add helpful comment
COMMENT ON FUNCTION auto_mark_f_grade_not_eligible() IS
  'Auto-marks F-grade leads as not_eligible on initial grading. Manual status overrides are always respected.';
