import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testRestartAPI() {
  // Get the latest run with status "researching"
  const { data: runs, error } = await supabase
    .from('runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching runs:', error);
    return;
  }

  console.log('\n📊 Latest 5 Runs:');
  console.log('================\n');

  runs?.forEach((run, idx) => {
    console.log(`${idx + 1}. ${run.business_type} in ${run.location}`);
    console.log(`   ID: ${run.id}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Is Paused: ${run.is_paused}`);
    console.log(`   Target: ${run.target_count}`);
    console.log(`   Created: ${run.created_at}`);
    console.log('');
  });

  // Pick the first run to test restart
  const testRun = runs?.[0];
  if (!testRun) {
    console.log('❌ No runs found');
    return;
  }

  console.log(`\n🔍 Testing Restart for Run: ${testRun.id}`);
  console.log(`   ${testRun.business_type} in ${testRun.location}\n`);

  // Count leads by status
  const { data: leadStats } = await supabase
    .from('leads')
    .select('research_status')
    .eq('run_id', testRun.id);

  const statusCounts = leadStats?.reduce((acc: any, lead) => {
    acc[lead.research_status] = (acc[lead.research_status] || 0) + 1;
    return acc;
  }, {});

  console.log('📈 Lead Status Breakdown:');
  console.log(JSON.stringify(statusCounts, null, 2));

  // Get leads that would be restarted
  const { data: leadsToRestart } = await supabase
    .from('leads')
    .select('id, name, research_status, prescreen_result, prescreen_status, compatibility_grade')
    .eq('run_id', testRun.id);

  const needingPrescreen = leadsToRestart?.filter(
    (lead) => !lead.prescreen_status || lead.prescreen_status === 'pending'
  );

  const needingResearch = leadsToRestart?.filter(
    (lead) => lead.prescreen_status === 'completed' &&
              lead.prescreen_result === 'pass' &&
              lead.research_status === 'pending'
  );

  console.log(`\n🔄 Would Restart:`);
  console.log(`   Needs Prescreening: ${needingPrescreen?.length || 0}`);
  console.log(`   Needs Research: ${needingResearch?.length || 0}`);
  console.log(`   Total: ${(needingPrescreen?.length || 0) + (needingResearch?.length || 0)}`);
}

testRestartAPI().catch(console.error);
