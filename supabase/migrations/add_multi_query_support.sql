-- ============================================
-- Multi-Query Support Migration
-- ============================================
-- Enables searching with multiple business types/queries
-- (e.g., "Artificial Grass", "Fake Turf", "Synthetic Lawn")
-- ============================================

-- Step 1: Add new columns for multi-query support
ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS business_types TEXT[], -- Array of search queries
  ADD COLUMN IF NOT EXISTS queries_count INTEGER DEFAULT 1; -- Track number of queries used

-- Step 2: Migrate existing single business_type to array format
UPDATE runs
SET
  business_types = ARRAY[business_type],
  queries_count = 1
WHERE business_types IS NULL;

-- Step 3: Add comment for documentation
COMMENT ON COLUMN runs.business_types IS 'Array of search queries to run (e.g., ["Artificial Grass", "Fake Turf"]). All results are deduplicated by place_id.';
COMMENT ON COLUMN runs.queries_count IS 'Number of search queries being used in this run';

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_runs_business_types ON runs USING GIN(business_types);

-- Step 5: Add validation function to ensure at least one query
CREATE OR REPLACE FUNCTION validate_business_types()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.business_types IS NULL OR array_length(NEW.business_types, 1) IS NULL THEN
    RAISE EXCEPTION 'business_types must contain at least one query';
  END IF;

  -- Update queries_count automatically
  NEW.queries_count = array_length(NEW.business_types, 1);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_business_types_not_empty
  BEFORE INSERT OR UPDATE ON runs
  FOR EACH ROW EXECUTE FUNCTION validate_business_types();

-- Note: Keep business_type column for backward compatibility
-- It will store the first query or a comma-joined string for display
