import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRunOwnership() {
  const runId = '7d9cec48-302b-41b7-97d8-519a5680be4b';

  const { data: run } = await supabase
    .from('runs')
    .select('id, user_id, business_type, status')
    .eq('id', runId)
    .single();

  if (!run) {
    console.log('❌ Run not found');
    return;
  }

  console.log('📊 Run Details:');
  console.log(`   ID: ${run.id}`);
  console.log(`   User ID: ${run.user_id}`);
  console.log(`   Business Type: ${run.business_type}`);
  console.log(`   Status: ${run.status}`);

  // Get the lead count and their user_id
  const { data: leads } = await supabase
    .from('leads')
    .select('user_id')
    .eq('run_id', runId)
    .limit(1);

  console.log(`\n📋 Lead User ID: ${leads?.[0]?.user_id}`);

  // Check if user_id matches
  if (leads?.[0]?.user_id === run.user_id) {
    console.log('✅ User IDs match - ownership is correct');
  } else {
    console.log('⚠️  User ID mismatch detected!');
  }

  // Get all users to see who owns this
  const { data: users } = await supabase.auth.admin.listUsers();

  console.log(`\n👥 All Users:`);
  users.users.forEach((user, idx) => {
    const isOwner = user.id === run.user_id;
    console.log(`   ${idx + 1}. ${user.email || 'No email'} - ${user.id} ${isOwner ? '← OWNER' : ''}`);
  });
}

checkRunOwnership().catch(console.error);
