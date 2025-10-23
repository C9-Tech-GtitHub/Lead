import { createAdminClient } from '../lib/supabase/admin';

const supabase = createAdminClient();

async function clearContactHistory() {
  console.log('🗑️  Clearing domain contact tracking history...');

  // Delete all contact tracking records
  const { error: contactError, count } = await supabase
    .from('domain_contact_tracking')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (contactError) {
    console.error('❌ Error deleting contact history:', contactError);
    process.exit(1);
  }

  console.log(`✅ Deleted ${count || 'all'} contact tracking records`);

  // Also clear email send history if you want to remove that too
  const { error: sendError, count: sendCount } = await supabase
    .from('email_send_history')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (sendError) {
    console.error('❌ Error deleting send history:', sendError);
    process.exit(1);
  }

  console.log(`✅ Deleted ${sendCount || 'all'} email send history records`);
  console.log('🎉 Contact history cleared successfully!');
}

clearContactHistory();
