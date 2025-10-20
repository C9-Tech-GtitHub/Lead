-- ============================================
-- ADD RESEARCH DEPTH TRACKING
-- ============================================
-- Tracks whether a lead has been researched with lightweight or deep analysis
-- ============================================

-- Add research_depth column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS research_depth TEXT
  CHECK (research_depth IN ('none', 'lightweight', 'deep'))
  DEFAULT 'none';

-- Add index for filtering by research depth
CREATE INDEX IF NOT EXISTS idx_leads_research_depth ON leads(research_depth);

-- Update existing completed leads to 'deep' (they used the old deep research)
UPDATE leads
SET research_depth = 'deep'
WHERE research_status = 'completed' AND research_depth = 'none';

-- Add comment explaining the field
COMMENT ON COLUMN leads.research_depth IS 'Tracks research analysis depth: none (not researched), lightweight (fast analysis without web search), deep (comprehensive analysis with web search)';
