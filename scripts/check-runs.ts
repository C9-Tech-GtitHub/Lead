import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRuns() {
  const { data: runs } = await supabase
    .from('runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2);

  console.log('Recent runs:');
  console.log(JSON.stringify(runs, null, 2));

  if (runs && runs.length > 0) {
    const runId = runs[0].id;
    const { data: leads } = await supabase
      .from('leads')
      .select('id, name, website, research_status, compatibility_grade, error_message')
      .eq('run_id', runId);

    console.log('\n\nLeads for most recent run:');
    console.log(JSON.stringify(leads, null, 2));
  }
}

checkRuns();
