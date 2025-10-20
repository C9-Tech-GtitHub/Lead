import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPrescreenStatus() {
  console.log('🔍 Checking prescreen status...\n');

  const { data: runs } = await supabase
    .from('runs')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log('❌ No runs found');
    return;
  }

  const runId = runs[0].id;

  // Get all leads and their prescreen status
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, research_status, prescreen_result')
    .eq('run_id', runId)
    .limit(10);

  if (!leads) {
    console.log('❌ No leads found');
    return;
  }

  console.log('📋 Sample leads (first 10):\n');
  leads.forEach((lead, i) => {
    console.log(`${i + 1}. ${lead.name}`);
    console.log(`   research_status: ${lead.research_status}`);
    console.log(`   prescreen_result: ${lead.prescreen_result === null ? 'NULL' : lead.prescreen_result}\n`);
  });

  // Count by prescreen_result
  const { data: allLeads } = await supabase
    .from('leads')
    .select('research_status, prescreen_result')
    .eq('run_id', runId);

  if (allLeads) {
    const nullCount = allLeads.filter(l => l.prescreen_result === null).length;
    const skipCount = allLeads.filter(l => l.prescreen_result === 'skip').length;
    const researchCount = allLeads.filter(l => l.prescreen_result === 'research').length;
    const pendingCount = allLeads.filter(l => l.research_status === 'pending').length;

    console.log('📊 Breakdown:');
    console.log(`   Total leads: ${allLeads.length}`);
    console.log(`   Research status = pending: ${pendingCount}`);
    console.log(`   Prescreen result = NULL: ${nullCount}`);
    console.log(`   Prescreen result = 'skip': ${skipCount}`);
    console.log(`   Prescreen result = 'research': ${researchCount}\n`);

    if (nullCount > 0 && pendingCount > 0) {
      console.log('⚠️  ISSUE FOUND!');
      console.log(`   ${nullCount} leads have prescreen_result = NULL`);
      console.log('   The query .neq("prescreen_result", "skip") excludes NULL values!');
      console.log('   This is why triggerResearchAll found 0 pending leads.\n');
    }
  }
}

checkPrescreenStatus();
