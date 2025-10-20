import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

async function testRealtimeBroadcast() {
  console.log('🧪 Testing Realtime Broadcast...\n');

  // Create client as anonymous user (like the browser)
  const clientSupabase = createClient(supabaseUrl, supabaseAnonKey);

  // Create client as service role (like Inngest)
  const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get a test run
  const { data: runs } = await serviceSupabase
    .from('runs')
    .select('id, progress, user_id')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log('❌ No runs found');
    return;
  }

  const testRun = runs[0];
  console.log('📊 Test run:', testRun.id);
  console.log('   Current progress:', testRun.progress, '%');
  console.log('   User ID:', testRun.user_id, '\n');

  // Subscribe with anon client (simulating browser)
  console.log('👂 Subscribing with ANON client (browser simulation)...');

  let receivedUpdate = false;

  const channel = clientSupabase
    .channel('test-broadcast')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'runs',
        filter: `id=eq.${testRun.id}`,
      },
      (payload) => {
        console.log('\n✅ UPDATE RECEIVED by anon client!');
        console.log('   New progress:', payload.new.progress);
        receivedUpdate = true;
      }
    )
    .subscribe((status) => {
      console.log('   Subscription status:', status);
    });

  // Wait for subscription to connect
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Update with service role (simulating Inngest)
  console.log('\n🔧 Updating run with SERVICE ROLE (Inngest simulation)...');
  const newProgress = (testRun.progress + 1) % 100;

  const { error } = await serviceSupabase
    .from('runs')
    .update({ progress: newProgress })
    .eq('id', testRun.id);

  if (error) {
    console.error('❌ Error updating run:', error);
  } else {
    console.log(`   Updated progress to ${newProgress}%`);
  }

  // Wait for broadcast
  console.log('\n⏳ Waiting for broadcast (5 seconds)...\n');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Cleanup
  clientSupabase.removeChannel(channel);

  // Report results
  if (receivedUpdate) {
    console.log('✅ SUCCESS! Realtime broadcast is working!');
    console.log('   Service role updates ARE being broadcast to anon clients.');
    console.log('   The UI should be receiving updates.\n');
    console.log('⚠️  If UI still doesn\'t update, the issue is in the React components.');
  } else {
    console.log('❌ FAILED! Realtime broadcast is NOT working!');
    console.log('   Service role updates are NOT being broadcast.\n');
    console.log('🔧 To fix:');
    console.log('   1. Check Supabase Dashboard → Database → Replication');
    console.log('   2. Ensure tables are in the "supabase_realtime" publication');
    console.log('   3. Make sure realtime is enabled in project settings');
  }

  process.exit(receivedUpdate ? 0 : 1);
}

testRealtimeBroadcast();
