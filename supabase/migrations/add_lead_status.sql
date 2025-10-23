-- ============================================
-- ADD LEAD STATUS FOR SALES MANAGEMENT
-- ============================================
-- Track lead lifecycle from research to conversion
-- Auto-mark F-grade leads as not_eligible
-- ============================================

-- Add lead_status column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'new'
  CHECK (lead_status IN (
    'new',
    'not_eligible',
    'ready_to_send',
    'bulk_sent',
    'manual_followup',
    'do_not_contact',
    'converted'
  ));

-- Add industry and location fields for export
ALTER TABLE leads ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Add is_client flag
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_client BOOLEAN DEFAULT FALSE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_is_client ON leads(is_client);

-- ============================================
-- AUTO-MARK F-GRADE LEADS AS NOT ELIGIBLE
-- ============================================
-- Automatically set lead_status to 'not_eligible' when grade is F
CREATE OR REPLACE FUNCTION auto_mark_f_grade_not_eligible()
RETURNS TRIGGER AS $$
BEGIN
  -- If the lead is graded F, automatically mark as not_eligible
  IF NEW.compatibility_grade = 'F' AND (OLD.compatibility_grade IS NULL OR OLD.compatibility_grade != 'F') THEN
    NEW.lead_status = 'not_eligible';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-marking F grades
DROP TRIGGER IF EXISTS auto_mark_f_grade_trigger ON leads;
CREATE TRIGGER auto_mark_f_grade_trigger
  BEFORE INSERT OR UPDATE OF compatibility_grade ON leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_f_grade_not_eligible();

-- ============================================
-- UPDATE EXISTING F-GRADE LEADS
-- ============================================
-- Set all existing F-grade leads to not_eligible
UPDATE leads
SET lead_status = 'not_eligible'
WHERE compatibility_grade = 'F' AND lead_status = 'new';

-- ============================================
-- HELPER FUNCTION: BULK UPDATE STATUS
-- ============================================
-- Allows bulk status updates for sales management
CREATE OR REPLACE FUNCTION bulk_update_lead_status(
  lead_ids UUID[],
  new_status TEXT,
  requesting_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Verify new_status is valid
  IF new_status NOT IN ('new', 'not_eligible', 'ready_to_send', 'bulk_sent', 'manual_followup', 'do_not_contact', 'converted') THEN
    RAISE EXCEPTION 'Invalid lead status: %', new_status;
  END IF;

  -- Update leads owned by the requesting user
  UPDATE leads
  SET lead_status = new_status, updated_at = NOW()
  WHERE id = ANY(lead_ids) AND user_id = requesting_user_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION bulk_update_lead_status TO authenticated;
