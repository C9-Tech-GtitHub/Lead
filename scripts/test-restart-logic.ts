import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testRestartLogic() {
  const runId = '7d9cec48-302b-41b7-97d8-519a5680be4b';

  // Simulate the restart logic
  const { data: allLeads } = await supabase
    .from('leads')
    .select('id, name, research_status, compatibility_grade, prescreen_result, prescreen_status')
    .eq('run_id', runId);

  console.log(`\n📊 Total leads in database: ${allLeads?.length || 0}\n`);

  // Filter to leads that need work (same as API)
  const leadsNeedingWork = allLeads?.filter(
    (lead) =>
      lead.prescreen_result !== 'skip' &&
      lead.research_status !== 'completed' &&
      lead.research_status !== 'failed' &&
      lead.compatibility_grade !== 'F'
  );

  console.log(`✅ Leads needing work: ${leadsNeedingWork?.length || 0}\n`);

  // Separate by what they need (NEW LOGIC)
  const leadsNeedingPrescreen = leadsNeedingWork?.filter(
    (lead) => !lead.prescreen_status || lead.prescreen_status === 'pending'
  );

  const leadsNeedingResearch = leadsNeedingWork?.filter(
    (lead) => (lead.prescreen_result === 'research' || lead.prescreen_result === 'pass') &&
              (lead.research_status === 'pending' ||
               lead.research_status === 'scraping' ||
               lead.research_status === 'analyzing')
  );

  console.log(`🔬 Breakdown:`);
  console.log(`   Needs Prescreening: ${leadsNeedingPrescreen?.length || 0}`);
  console.log(`   Needs Research: ${leadsNeedingResearch?.length || 0}`);
  console.log(`   Total to restart: ${(leadsNeedingPrescreen?.length || 0) + (leadsNeedingResearch?.length || 0)}\n`);

  // Show sample of leads that will be researched
  console.log(`📋 Sample leads that will be researched:\n`);
  leadsNeedingResearch?.slice(0, 5).forEach((lead, idx) => {
    console.log(`${idx + 1}. ${lead.name}`);
    console.log(`   research_status: ${lead.research_status}`);
    console.log(`   prescreen_result: ${lead.prescreen_result}`);
    console.log('');
  });
}

testRestartLogic().catch(console.error);
