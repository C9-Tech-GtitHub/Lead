import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkResearchStatus() {
  const { data: runs } = await supabase
    .from('runs')
    .select('*')
    .eq('business_type', 'Magic the Gathering')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log('No runs found');
    return;
  }

  const run = runs[0];
  console.log('=== RUN STATUS ===');
  console.log(`Status: ${run.status}`);
  console.log(`Progress: ${run.progress}%`);
  console.log(`Last Updated: ${new Date(run.updated_at).toLocaleString()}\n`);

  // Get progress logs for research activity
  const { data: logs } = await supabase
    .from('progress_logs')
    .select('*')
    .eq('run_id', run.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (logs && logs.length > 0) {
    console.log('=== RECENT ACTIVITY ===\n');
    logs.reverse().forEach(log => {
      const time = new Date(log.created_at).toLocaleTimeString();
      console.log(`[${time}] ${log.event_type}`);
      console.log(`  ${log.message}`);
      if (log.details) {
        console.log(`  Details: ${JSON.stringify(log.details)}`);
      }
      console.log('');
    });
  }

  // Check for leads being researched
  const { data: leads } = await supabase
    .from('leads')
    .select('research_status')
    .eq('run_id', run.id);

  const statusBreakdown: Record<string, number> = {};
  leads?.forEach(lead => {
    statusBreakdown[lead.research_status] = (statusBreakdown[lead.research_status] || 0) + 1;
  });

  console.log('\n=== LEAD STATUS BREAKDOWN ===');
  Object.entries(statusBreakdown).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  // Check if research was triggered
  const researching = leads?.filter(l =>
    ['scraping', 'analyzing', 'completed'].includes(l.research_status)
  ).length || 0;

  console.log(`\n${researching > 0 ? '✅' : '❌'} Research ${researching > 0 ? 'has been' : 'has NOT been'} started`);

  if (researching === 0) {
    console.log('\n💡 To start research:');
    console.log('   1. Go to your dashboard');
    console.log('   2. Find the "Magic the Gathering - Melbourne" run');
    console.log('   3. Click "Research All" button');
  }
}

checkResearchStatus().catch(console.error);
