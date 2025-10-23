import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('=== Forcing Full SendGrid Sync ===\n');
  
  // Delete previous sync logs to force a full historical sync
  const { data: logs, error: fetchError } = await supabase
    .from('sendgrid_sync_log')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (fetchError) {
    console.error('Error fetching sync logs:', fetchError);
    return;
  }
  
  console.log(`Found ${logs?.length || 0} existing sync logs`);
  
  if (logs && logs.length > 0) {
    console.log('\nExisting sync logs:');
    logs.forEach(log => {
      console.log(`  - ${log.sync_type}: ${log.records_synced} records at ${log.started_at}`);
    });
    
    // Delete sync logs to trigger full sync
    console.log('\nDeleting sync logs to force full historical sync...');
    const { error: deleteError } = await supabase
      .from('sendgrid_sync_log')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) {
      console.error('Error deleting sync logs:', deleteError);
      return;
    }
    
    console.log('✅ Sync logs deleted. Next sync will pull ALL historical data.\n');
  }
  
  // Now trigger the full sync
  console.log('Triggering full sync via API...\n');
  
  const response = await fetch('http://localhost:3000/api/sendgrid/sync', {
    method: 'POST',
  });
  
  const result = await response.json();
  
  console.log('=== Sync Results ===');
  console.log(JSON.stringify(result, null, 2));
}

main();
