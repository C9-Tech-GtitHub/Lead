import { createClient } from '@supabase/supabase-js';

async function debugRun() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const runId = 'e18b7c5e-91b8-49b1-947c-bee898a86d6b';

  // Get run details
  const { data: run } = await supabase
    .from('runs')
    .select('*')
    .eq('id', runId)
    .single();

  console.log('=== RUN DETAILS ===');
  console.log(JSON.stringify(run, null, 2));
  console.log();

  // Get leads count
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('run_id', runId);

  console.log('=== LEADS ===');
  console.log('Total leads:', totalLeads);
  console.log();

  if (totalLeads && totalLeads > 0) {
    // Get leads by status
    const { data: leads } = await supabase
      .from('leads')
      .select('name, research_status, prescreening_status, compatibility_grade')
      .eq('run_id', runId)
      .order('created_at', { ascending: true });

    console.log('Leads:');
    leads?.forEach((lead, i) => {
      console.log(`${i + 1}. ${lead.name} - Research: ${lead.research_status}, Prescreen: ${lead.prescreening_status || 'N/A'}, Grade: ${lead.compatibility_grade || 'N/A'}`);
    });
  } else {
    console.log('❌ NO LEADS FOUND - This is the issue!');
    console.log();
    console.log('The run shows status "researching" but there are no leads in the database.');
    console.log('This suggests the processLeadRun function failed during scraping or saving.');
  }

  // Check progress logs
  const { data: logs } = await supabase
    .from('progress_logs')
    .select('event_type, message, details, created_at')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  console.log();
  console.log('=== PROGRESS LOGS ===');
  logs?.forEach((log) => {
    console.log(`[${new Date(log.created_at).toLocaleTimeString()}] ${log.event_type}: ${log.message}`);
    if (log.details) {
      console.log('  Details:', JSON.stringify(log.details));
    }
  });
}

debugRun();
