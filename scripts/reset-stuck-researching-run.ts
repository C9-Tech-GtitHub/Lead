import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetStuckRun() {
  console.log('🔧 Resetting stuck run...\n');

  // Get the latest run that's stuck in "researching" with all pending leads
  const { data: runs } = await supabase
    .from('runs')
    .select('id, status, progress, total_leads')
    .eq('status', 'researching')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log('✅ No stuck runs found');
    return;
  }

  const run = runs[0];
  console.log('📊 Found stuck run:');
  console.log(`   ID: ${run.id}`);
  console.log(`   Status: ${run.status}`);
  console.log(`   Progress: ${run.progress}%`);
  console.log(`   Total Leads: ${run.total_leads}\n`);

  // Check if most leads are still pending
  const { data: leads } = await supabase
    .from('leads')
    .select('research_status')
    .eq('run_id', run.id);

  if (!leads) {
    console.log('❌ No leads found');
    return;
  }

  const pendingCount = leads.filter(l => l.research_status === 'pending').length;
  const completedCount = leads.filter(l => l.research_status === 'completed').length;

  console.log('📈 Lead Status:');
  console.log(`   Pending: ${pendingCount}`);
  console.log(`   Completed: ${completedCount}`);
  console.log(`   Total: ${leads.length}\n`);

  if (pendingCount > completedCount) {
    console.log('🔄 Resetting run status to "ready" to allow re-triggering research...');

    const { error } = await supabase
      .from('runs')
      .update({ status: 'ready' })
      .eq('id', run.id);

    if (error) {
      console.error('❌ Error resetting run:', error);
      return;
    }

    console.log('✅ Run reset successfully!');
    console.log('\n💡 You can now click "Research All Leads" again in the UI');
  } else {
    console.log('✅ Run is not stuck, most leads have been processed');
  }
}

resetStuckRun();
