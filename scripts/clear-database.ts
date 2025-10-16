import { createAdminClient } from '../lib/supabase/admin';

const supabase = createAdminClient();

async function clearDatabase() {
  console.log('🗑️  Clearing database...');

  // Delete all leads first (due to foreign key constraints)
  const { error: leadsError } = await supabase
    .from('leads')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (leadsError) {
    console.error('❌ Error deleting leads:', leadsError);
    process.exit(1);
  }

  console.log('✅ Deleted all leads');

  // Delete all progress logs
  const { error: logsError } = await supabase
    .from('progress_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (logsError) {
    console.error('❌ Error deleting progress logs:', logsError);
    process.exit(1);
  }

  console.log('✅ Deleted all progress logs');

  // Delete all runs
  const { error: runsError } = await supabase
    .from('runs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (runsError) {
    console.error('❌ Error deleting runs:', runsError);
    process.exit(1);
  }

  console.log('✅ Deleted all runs');
  console.log('🎉 Database cleared successfully!');
}

clearDatabase();
