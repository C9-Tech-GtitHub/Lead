import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('Monitoring sync progress...\n');
  
  for (let i = 0; i < 30; i++) {
    // Get current count
    const { count } = await supabase
      .from('email_suppression')
      .select('*', { count: 'exact', head: true });
    
    // Get latest sync log
    const { data: logs } = await supabase
      .from('sendgrid_sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(2);
    
    console.clear();
    console.log('=== SendGrid Sync Progress ===\n');
    console.log(`Total suppressions in database: ${count || 0}`);
    console.log(`Target: ~16,230 unsubscribes + bounces\n`);
    
    if (logs && logs.length > 0) {
      console.log('Recent sync activity:');
      logs.forEach(log => {
        const status = log.status === 'success' ? '✅' : log.status === 'failed' ? '❌' : '🔄';
        console.log(`  ${status} ${log.sync_type}: ${log.records_synced} records`);
        if (log.completed_at) {
          console.log(`     Completed at: ${new Date(log.completed_at).toLocaleString()}`);
          console.log(`     Duration: ${log.duration_seconds}s`);
        } else {
          console.log(`     In progress... (started ${new Date(log.started_at).toLocaleString()})`);
        }
      });
    }
    
    console.log(`\nRefreshing in 5 seconds... (${i + 1}/30)`);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log('\nMonitoring complete.');
}

main();
