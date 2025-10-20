import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function addResearchDepthColumn() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Adding research_depth column to leads table...');

  // First, check if column exists
  const { data: existingLeads, error: checkError } = await supabase
    .from('leads')
    .select('research_depth')
    .limit(1);

  if (!checkError) {
    console.log('✅ Column already exists!');
    return;
  }

  console.log('Column does not exist, attempting to add via raw SQL...');

  // Try to add via SQL editor API or direct PostgreSQL connection
  // Since we can't execute raw SQL directly, we'll need to use Supabase Dashboard
  console.error('❌ Cannot add column via Supabase JS client.');
  console.log('\n📝 Please run this SQL in the Supabase SQL Editor:');
  console.log('\n' + '-'.repeat(60));
  console.log(`
-- Add research_depth column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS research_depth TEXT
  CHECK (research_depth IN ('none', 'lightweight', 'deep'))
  DEFAULT 'none';

-- Add index for filtering by research depth
CREATE INDEX IF NOT EXISTS idx_leads_research_depth ON leads(research_depth);

-- Update existing completed leads to 'lightweight'
UPDATE leads
SET research_depth = 'lightweight'
WHERE research_status = 'completed' AND research_depth IS NULL;
  `.trim());
  console.log('-'.repeat(60) + '\n');
  console.log('Or visit: https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/editor');
}

addResearchDepthColumn();
