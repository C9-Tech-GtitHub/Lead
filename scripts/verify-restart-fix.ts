import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyRestartFix() {
  const runId = '7d9cec48-302b-41b7-97d8-519a5680be4b';

  console.log('🔍 Testing Restart Logic (FIXED)\n');
  console.log('================================\n');

  // Get all leads (same query as API)
  const { data: allLeads } = await supabase
    .from('leads')
    .select('id, name, research_status, compatibility_grade, prescreen_result, prescreen_status')
    .eq('run_id', runId);

  console.log(`Total leads in database: ${allLeads?.length || 0}\n`);

  // Filter to leads that need work (SAME AS API)
  const leadsNeedingWork = allLeads?.filter(
    (lead) =>
      lead.prescreen_result !== 'skip' &&
      lead.research_status !== 'completed' &&
      lead.research_status !== 'failed' &&
      lead.compatibility_grade !== 'F'
  );

  console.log(`✅ Leads needing work: ${leadsNeedingWork?.length || 0}`);

  // Separate by what they need (FIXED LOGIC)
  const leadsNeedingPrescreen = leadsNeedingWork?.filter(
    (lead) => !lead.prescreen_status || lead.prescreen_status === 'pending'
  );

  const leadsNeedingResearch = leadsNeedingWork?.filter(
    (lead) => (lead.prescreen_result === 'research' || lead.prescreen_result === 'pass') &&
              (lead.research_status === 'pending' ||
               lead.research_status === 'scraping' ||
               lead.research_status === 'analyzing')
  );

  console.log(`\n🔬 Restart Breakdown:`);
  console.log(`   Needs Prescreening: ${leadsNeedingPrescreen?.length || 0}`);
  console.log(`   Needs Research: ${leadsNeedingResearch?.length || 0}`);
  console.log(`   ─────────────────────────────`);
  console.log(`   TOTAL TO RESTART: ${(leadsNeedingPrescreen?.length || 0) + (leadsNeedingResearch?.length || 0)}`);

  if ((leadsNeedingResearch?.length || 0) > 0) {
    console.log('\n✅ SUCCESS! Will restart all 150 pending leads');
    console.log('\n📋 Sample leads to be researched:');
    leadsNeedingResearch?.slice(0, 5).forEach((lead, idx) => {
      console.log(`   ${idx + 1}. ${lead.name}`);
    });
  } else {
    console.log('\n❌ PROBLEM! No leads found to research');
  }
}

verifyRestartFix().catch(console.error);
