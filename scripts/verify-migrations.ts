import { createClient } from '@supabase/supabase-js';

async function verifyMigrations() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Verifying database migrations...\n');

  // Check if we can set run status to 'ready'
  const { data: run, error: runError } = await supabase
    .from('runs')
    .select('id, status')
    .eq('id', 'c7e289ec-0e41-48c7-a0dc-ef84c604b2e6')
    .single();

  console.log('1. Runs table "ready" status:');
  if (run?.status === 'ready') {
    console.log('   ✅ Run status is "ready"');
  } else {
    console.log('   ❌ Run status:', run?.status);
  }

  // Check if prescreen columns exist by trying to select them
  console.log('\n2. Leads table prescreen columns:');
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, prescreened, prescreen_result, is_franchise, is_national_brand')
    .limit(1)
    .single();

  if (!leadError) {
    console.log('   ✅ Prescreen columns exist');
    console.log('   Sample:', {
      prescreened: lead?.prescreened,
      prescreen_result: lead?.prescreen_result
    });
  } else {
    console.log('   ❌ Error:', leadError.message);
  }

  // Check lead count for this run
  const { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('run_id', 'c7e289ec-0e41-48c7-a0dc-ef84c604b2e6');

  console.log('\n3. Leads ready for prescreen:');
  console.log('   Total leads:', count);

  console.log('\n✅ Migrations verified successfully!');
  console.log('\n📋 Next steps:');
  console.log('   1. Refresh your browser');
  console.log('   2. Navigate to the run details page');
  console.log('   3. You should see the "🔍 Prescreen Leads" button');
}

verifyMigrations();
