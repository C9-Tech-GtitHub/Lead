import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCurrentLeads() {
  const { data: runs } = await supabase
    .from('runs')
    .select('id, business_type, location, status')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('Latest runs:', JSON.stringify(runs, null, 2));

  const runId = runs?.[0]?.id;
  if (!runId) {
    console.log('No runs found');
    return;
  }

  const { data: leads, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('run_id', runId)
    .limit(5);

  console.log(`\nLeads for run ${runId}: ${count} total`);
  console.log('Sample:', JSON.stringify(
    leads?.map(l => ({
      name: l.name,
      research_status: l.research_status,
      prescreen_result: l.prescreen_result,
      prescreen_status: l.prescreen_status
    })),
    null,
    2
  ));

  // Count by research_status
  const { data: allLeads } = await supabase
    .from('leads')
    .select('research_status, prescreen_result')
    .eq('run_id', runId);

  const statusCounts = allLeads?.reduce((acc: any, lead) => {
    const key = `${lead.research_status}|${lead.prescreen_result}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log('\nStatus breakdown:');
  console.log(JSON.stringify(statusCounts, null, 2));
}

checkCurrentLeads().catch(console.error);
