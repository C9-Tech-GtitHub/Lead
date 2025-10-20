import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStuckRun() {
  // Get the latest run
  const { data: runs } = await supabase
    .from('runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log('No runs found');
    return;
  }

  const run = runs[0];
  console.log('=== STUCK RUN ANALYSIS ===\n');
  console.log(`Business Type: ${run.business_type}`);
  console.log(`Location: ${run.location}`);
  console.log(`Status: ${run.status}`);
  console.log(`Total Leads: ${run.total_leads}`);
  console.log(`Progress: ${run.progress || 0}%`);
  console.log(`Created: ${new Date(run.created_at).toLocaleString()}`);
  console.log(`Updated: ${new Date(run.updated_at).toLocaleString()}`);
  console.log(`Error: ${run.error_message || 'None'}\n`);

  // Check leads status
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('run_id', run.id)
    .order('created_at', { ascending: true });

  console.log(`\n=== LEADS BREAKDOWN ===`);
  console.log(`Total leads in DB: ${leads?.length || 0}`);
  console.log(`Expected total: ${run.total_leads}\n`);

  if (leads) {
    // Status breakdown
    const statusCounts: Record<string, number> = {};
    const prescreenCounts: Record<string, number> = {};

    leads.forEach(lead => {
      statusCounts[lead.research_status] = (statusCounts[lead.research_status] || 0) + 1;

      const prescreenStatus = lead.prescreened ?
        (lead.prescreen_result || 'unknown') : 'not_prescreened';
      prescreenCounts[prescreenStatus] = (prescreenCounts[prescreenStatus] || 0) + 1;
    });

    console.log('Research Status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\nPrescreen Status:');
    Object.entries(prescreenCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Check if any leads have errors
    const leadsWithErrors = leads.filter(l => l.error_message);
    if (leadsWithErrors.length > 0) {
      console.log(`\n=== LEADS WITH ERRORS (${leadsWithErrors.length}) ===`);
      leadsWithErrors.forEach(lead => {
        console.log(`\n${lead.name}:`);
        console.log(`  Error: ${lead.error_message}`);
        console.log(`  Status: ${lead.research_status}`);
      });
    }

    // Show first few leads
    console.log(`\n=== FIRST 5 LEADS ===`);
    leads.slice(0, 5).forEach((lead, idx) => {
      console.log(`\n${idx + 1}. ${lead.name}`);
      console.log(`   Created: ${new Date(lead.created_at).toLocaleString()}`);
      console.log(`   Status: ${lead.research_status}`);
      console.log(`   Prescreened: ${lead.prescreened ? 'Yes' : 'No'}`);
      if (lead.prescreened) {
        console.log(`   Prescreen Result: ${lead.prescreen_result}`);
        console.log(`   Prescreen Reason: ${lead.prescreen_reason}`);
      }
    });
  }

  // Check progress logs
  const { data: logs } = await supabase
    .from('progress_logs')
    .select('*')
    .eq('run_id', run.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (logs && logs.length > 0) {
    console.log(`\n\n=== RECENT PROGRESS LOGS ===`);
    logs.reverse().forEach(log => {
      console.log(`\n[${new Date(log.created_at).toLocaleTimeString()}] ${log.event_type}`);
      console.log(`  ${log.message}`);
      if (log.details) {
        console.log(`  Details: ${JSON.stringify(log.details)}`);
      }
    });
  }
}

checkStuckRun().catch(console.error);
