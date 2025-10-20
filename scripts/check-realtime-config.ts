import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealtimeConfig() {
  console.log('🔍 Checking Supabase Realtime Configuration...\n');

  console.log('📊 Supabase URL:', supabaseUrl);
  console.log('🔑 Using Service Role Key\n');

  // Test a simple realtime subscription
  console.log('🧪 Testing realtime subscription...\n');

  const { data: runs } = await supabase
    .from('runs')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log('❌ No runs found');
    return;
  }

  const runId = runs[0].id;
  console.log(`📌 Testing with run ID: ${runId}\n`);

  // Try to subscribe to progress_logs
  const channel = supabase
    .channel('test-realtime-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'progress_logs',
        filter: `run_id=eq.${runId}`,
      },
      (payload) => {
        console.log('✅ Received realtime event!', payload);
      }
    )
    .subscribe((status, error) => {
      console.log('📡 Subscription status:', status);
      if (error) {
        console.error('❌ Subscription error:', error);
      }

      if (status === 'SUBSCRIBED') {
        console.log('\n✅ Realtime is working!');
        console.log('   The subscription connected successfully.');
        console.log('   The UI should receive updates.\n');

        console.log('⚠️  If the UI still doesn\'t update, check:');
        console.log('   1. Browser console for subscription status logs');
        console.log('   2. Make sure you refreshed after adding the debug logs');
        console.log('   3. Check Supabase Dashboard → Database → Replication');

        supabase.removeChannel(channel);
        process.exit(0);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.log('\n❌ Realtime subscription failed!');
        console.log('   Status:', status);
        if (error) console.log('   Error:', error);

        console.log('\n🔧 To fix:');
        console.log('   1. Go to Supabase Dashboard → Database → Replication');
        console.log('   2. Make sure progress_logs table is enabled for realtime');
        console.log('   3. Make sure runs table is enabled for realtime');
        console.log('   4. Check if you have realtime enabled in your project settings');

        supabase.removeChannel(channel);
        process.exit(1);
      }
    });

  // Wait 10 seconds for connection
  await new Promise((resolve) => setTimeout(resolve, 10000));

  console.log('\n⏱️  Connection timeout - cleaning up...');
  supabase.removeChannel(channel);
}

checkRealtimeConfig();
