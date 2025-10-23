import { createClient } from '@supabase/supabase-js';

async function checkRunCounts() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get runs
  const { data: runs } = await supabase
    .from('runs')
    .select('id, business_type, location')
    .order('created_at', { ascending: false });

  // Get lead count per run
  const { data: leadsByRun } = await supabase
    .from('leads')
    .select('run_id');

  const runLeadCounts: Record<string, number> = {};
  leadsByRun?.forEach((lead: any) => {
    runLeadCounts[lead.run_id] = (runLeadCounts[lead.run_id] || 0) + 1;
  });

  console.log('\n📊 Runs with lead counts:');
  console.log('=' .repeat(80));

  let totalLeads = 0;
  runs?.forEach(run => {
    const count = runLeadCounts[run.id] || 0;
    totalLeads += count;
    console.log(`${run.business_type} - ${run.location}: ${count} leads`);
  });

  console.log('=' .repeat(80));
  console.log(`Total leads: ${totalLeads}`);
  console.log(`Total from leadsByRun: ${leadsByRun?.length}`);
}

checkRunCounts();
