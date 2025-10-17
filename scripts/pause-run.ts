import { createClient } from '@supabase/supabase-js';

async function pauseRun() {
  const runId = '3e151a1e-2643-4ae5-8679-8ce359a8967f';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Update run status to 'ready' to pause it
  const { data, error } = await supabase
    .from('runs')
    .update({ status: 'ready' })
    .eq('id', runId)
    .select();

  if (error) {
    console.error('Error pausing run:', error);
  } else {
    console.log('Run paused successfully:', data);
  }

  // Check how many leads are still processing
  const { count: processing } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('run_id', runId)
    .in('research_status', ['scraping', 'analyzing']);

  console.log(`Leads currently processing: ${processing || 0}`);
}

pauseRun();
