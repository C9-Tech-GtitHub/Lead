import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkProgress() {
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

  console.log('Run:', run.id);
  console.log('Status:', run.status);
  console.log('Progress:', run.progress);
  console.log('Total leads:', run.total_leads);
  console.log('Target:', run.target_count);

  // Get lead status counts
  const { data: leads } = await supabase
    .from('leads')
    .select('research_status')
    .eq('run_id', run.id);

  if (!leads) {
    console.log('No leads found');
    return;
  }

  const statusCounts = leads.reduce((acc: Record<string, number>, lead) => {
    acc[lead.research_status] = (acc[lead.research_status] || 0) + 1;
    return acc;
  }, {});

  console.log('\nLead statuses:', statusCounts);
  console.log('Total in DB:', leads.length);

  // Calculate what progress should be
  const completedCount = (statusCounts['completed'] || 0) + (statusCounts['failed'] || 0) + (statusCounts['skipped'] || 0);
  const shouldBeProgress = Math.round((completedCount / run.target_count) * 100);

  console.log('\nCompleted/Failed/Skipped:', completedCount);
  console.log('Progress should be:', shouldBeProgress, '%');
}

checkProgress();
