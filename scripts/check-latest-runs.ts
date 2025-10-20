import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkLatestRuns() {
  // Get latest runs
  const { data: runs, error: runsError } = await supabase
    .from('runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (runsError) {
    console.error('Error fetching runs:', runsError);
    return;
  }

  console.log('=== LATEST RUNS ===\n');
  runs?.forEach((run, idx) => {
    console.log(`${idx + 1}. ${run.business_type} - ${run.location}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Total Leads: ${run.total_leads}`);
    console.log(`   Progress: ${run.progress || 0}%`);
    console.log(`   Created: ${new Date(run.created_at).toLocaleString()}`);
    console.log(`   Updated: ${new Date(run.updated_at).toLocaleString()}`);
    if (run.error_message) {
      console.log(`   ERROR: ${run.error_message}`);
    }
    console.log('');
  });

  // Get latest run details
  if (runs && runs.length > 0) {
    const latestRun = runs[0];
    console.log(`\n=== LATEST RUN DETAILS: ${latestRun.business_type} ===\n`);

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, research_status, compatibility_grade, created_at')
      .eq('run_id', latestRun.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return;
    }

    console.log(`Total leads in this run: ${leads?.length || 0}\n`);

    if (leads && leads.length > 0) {
      const statusCounts = leads.reduce((acc, lead) => {
        acc[lead.research_status] = (acc[lead.research_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('Status breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

      console.log('\nRecent leads:');
      leads.slice(0, 5).forEach((lead, idx) => {
        console.log(`${idx + 1}. ${lead.name}`);
        console.log(`   Status: ${lead.research_status}`);
        console.log(`   Grade: ${lead.compatibility_grade || 'Not graded'}`);
        console.log(`   Created: ${new Date(lead.created_at).toLocaleString()}`);
        console.log('');
      });
    }
  }
}

checkLatestRuns().catch(console.error);
