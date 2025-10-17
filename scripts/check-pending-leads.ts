import { createClient } from '@supabase/supabase-js';

async function checkPendingLeads() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const runId = 'e18b7c5e-91b8-49b1-947c-bee898a86d6b';

  // Get leads by status
  const { data: statusCounts } = await supabase
    .from('leads')
    .select('research_status')
    .eq('run_id', runId);

  const counts: Record<string, number> = {};
  statusCounts?.forEach(lead => {
    counts[lead.research_status] = (counts[lead.research_status] || 0) + 1;
  });

  console.log('=== LEAD STATUS COUNTS ===');
  Object.entries(counts).forEach(([status, count]) => {
    console.log(`${status}: ${count}`);
  });
  console.log();

  // Get pending leads
  const { data: pendingLeads } = await supabase
    .from('leads')
    .select('name, website, prescreen_result')
    .eq('run_id', runId)
    .eq('research_status', 'pending')
    .limit(10);

  console.log('=== FIRST 10 PENDING LEADS ===');
  pendingLeads?.forEach((lead, i) => {
    console.log(`${i + 1}. ${lead.name} - ${lead.website || 'no website'} (prescreen: ${lead.prescreen_result})`);
  });
  console.log();

  // Check if there are any leads in progress
  const { data: inProgressLeads } = await supabase
    .from('leads')
    .select('name, research_status')
    .eq('run_id', runId)
    .in('research_status', ['scraping', 'analyzing']);

  console.log('=== LEADS IN PROGRESS ===');
  if (inProgressLeads && inProgressLeads.length > 0) {
    inProgressLeads.forEach(lead => {
      console.log(`- ${lead.name}: ${lead.research_status}`);
    });
  } else {
    console.log('None - all leads are either pending or completed');
  }
}

checkPendingLeads();
