import { createClient } from '@supabase/supabase-js';

async function fixStuckRun() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const runId = 'c7e289ec-0e41-48c7-a0dc-ef84c604b2e6';

  console.log('Fixing stuck run:', runId);

  // Check current status
  const { data: run } = await supabase
    .from('runs')
    .select('*')
    .eq('id', runId)
    .single();

  console.log('\nCurrent status:', run?.status);
  console.log('Total leads:', run?.total_leads);
  console.log('Target count:', run?.target_count);

  // Update to ready status
  const { error } = await supabase
    .from('runs')
    .update({ status: 'ready' })
    .eq('id', runId);

  if (error) {
    console.error('Error updating run:', error);
  } else {
    console.log('\n✅ Run status updated to "ready"');
    console.log('You can now use the Prescreen and Research buttons!');
  }
}

fixStuckRun();
