import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTrigger() {
  console.log('🔍 Checking database trigger status...\n');

  // Get latest run to see current status
  const { data: runs } = await supabase
    .from('runs')
    .select('id, status, progress, total_leads')
    .order('created_at', { ascending: false })
    .limit(1);

  if (runs && runs.length > 0) {
    const run = runs[0];
    console.log('📊 Latest run:');
    console.log(`   ID: ${run.id}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Progress: ${run.progress}%`);
    console.log(`   Total Leads: ${run.total_leads}`);

    // Get lead stats for this run
    const { data: leads } = await supabase
      .from('leads')
      .select('research_status')
      .eq('run_id', run.id);

    if (leads) {
      const pending = leads.filter(l => l.research_status === 'pending').length;
      const completed = leads.filter(l => l.research_status === 'completed').length;
      const failed = leads.filter(l => l.research_status === 'failed').length;
      const skipped = leads.filter(l => l.research_status === 'skipped').length;

      console.log('\n📈 Lead Status:');
      console.log(`   Pending: ${pending}`);
      console.log(`   Completed: ${completed}`);
      console.log(`   Failed: ${failed}`);
      console.log(`   Skipped: ${skipped}`);
      console.log(`   Total: ${leads.length}`);

      const expectedProgress = leads.length > 0
        ? Math.round(((completed + failed + skipped) / leads.length) * 100)
        : 0;

      console.log(`\n💡 Expected Progress: ${expectedProgress}%`);
      console.log(`   Actual Progress: ${run.progress}%`);

      if (expectedProgress !== run.progress) {
        console.log('\n⚠️  Progress mismatch detected!');
        console.log('   The trigger may not have been applied correctly.');
        console.log('   Please run the SQL manually in Supabase SQL Editor.');
      } else {
        console.log('\n✅ Progress is correct! Trigger is working.');
      }
    }
  } else {
    console.log('⚠️  No runs found in database');
  }

  console.log('\n\n📝 To manually apply the trigger, run this SQL in Supabase SQL Editor:');
  console.log('\nDROP TRIGGER IF EXISTS trigger_update_run_stats ON leads;');
  console.log('CREATE TRIGGER trigger_update_run_stats');
  console.log('  AFTER INSERT OR UPDATE ON leads');
  console.log('  FOR EACH ROW');
  console.log('  EXECUTE FUNCTION update_run_stats();');
}

verifyTrigger();
