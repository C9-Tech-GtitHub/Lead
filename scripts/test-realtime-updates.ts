import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealtimeUpdates() {
  console.log('🧪 Testing Real-time Updates...\n');

  // Get the latest run
  const { data: runs } = await supabase
    .from('runs')
    .select('id, status, progress')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log('❌ No runs found');
    return;
  }

  const run = runs[0];
  console.log('📊 Testing with run:', run.id);
  console.log('   Current Status:', run.status);
  console.log('   Current Progress:', run.progress, '%\n');

  // Subscribe to progress logs
  console.log('👂 Subscribing to progress logs...');
  const progressChannel = supabase
    .channel(`test-progress-logs-${run.id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'progress_logs',
        filter: `run_id=eq.${run.id}`,
      },
      (payload) => {
        console.log('✨ NEW PROGRESS LOG:', payload.new);
      }
    )
    .subscribe((status) => {
      console.log('📡 Progress logs subscription status:', status);
    });

  // Subscribe to run updates
  console.log('👂 Subscribing to run updates...');
  const runChannel = supabase
    .channel(`test-run-${run.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'runs',
        filter: `id=eq.${run.id}`,
      },
      (payload) => {
        console.log('🔄 RUN UPDATED:', {
          status: payload.new.status,
          progress: payload.new.progress,
          grade_a: payload.new.grade_a_count,
          grade_b: payload.new.grade_b_count,
        });
      }
    )
    .subscribe((status) => {
      console.log('📡 Run updates subscription status:', status);
    });

  console.log('\n⏳ Listening for updates for 30 seconds...');
  console.log('💡 Trigger some research to see real-time updates!\n');

  // Keep the script running for 30 seconds
  await new Promise((resolve) => setTimeout(resolve, 30000));

  console.log('\n✅ Test complete. Cleaning up...');
  await supabase.removeChannel(progressChannel);
  await supabase.removeChannel(runChannel);

  console.log('\n📝 Summary:');
  console.log('   - If you saw "SUBSCRIBED" status, real-time is configured correctly');
  console.log('   - If you saw updates appear, real-time is working perfectly!');
  console.log('   - If nothing appeared, the triggers are working but no changes occurred during the test');
}

testRealtimeUpdates();
