import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkPrescreenValues() {
  const runId = '7d9cec48-302b-41b7-97d8-519a5680be4b';

  // Get sample of pending leads
  const { data: pendingLeads } = await supabase
    .from('leads')
    .select('id, name, research_status, prescreen_result, prescreen_status, prescreened')
    .eq('run_id', runId)
    .eq('research_status', 'pending')
    .limit(10);

  console.log('\n📋 Sample Pending Leads (showing prescreen fields):\n');

  pendingLeads?.forEach((lead, idx) => {
    console.log(`${idx + 1}. ${lead.name}`);
    console.log(`   research_status: ${lead.research_status}`);
    console.log(`   prescreen_status: ${lead.prescreen_status}`);
    console.log(`   prescreen_result: ${lead.prescreen_result}`);
    console.log(`   prescreened: ${lead.prescreened}`);
    console.log('');
  });

  // Count by prescreen_result
  const { data: allPending } = await supabase
    .from('leads')
    .select('prescreen_result')
    .eq('run_id', runId)
    .eq('research_status', 'pending');

  const prescreenResultCounts = allPending?.reduce((acc: any, lead) => {
    const result = lead.prescreen_result || 'null';
    acc[result] = (acc[result] || 0) + 1;
    return acc;
  }, {});

  console.log('\n📊 Prescreen Result Distribution for Pending Leads:');
  console.log(JSON.stringify(prescreenResultCounts, null, 2));
}

checkPrescreenValues().catch(console.error);
