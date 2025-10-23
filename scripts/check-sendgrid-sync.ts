import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('=== SendGrid Sync Results ===\n');
  
  const { data: logs, error } = await supabase
    .from('sendgrid_sync_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error fetching sync logs:', error);
  } else {
    console.log('Recent sync logs:');
    console.log(JSON.stringify(logs, null, 2));
  }
  
  // Check suppression list
  const { data: suppressions, error: suppError } = await supabase
    .from('email_suppression')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (suppError) {
    console.error('Error fetching suppressions:', suppError);
  } else {
    console.log('\n=== Email Suppression List ===');
    console.log(`Total suppressions shown: ${suppressions?.length || 0}`);
    console.log(JSON.stringify(suppressions, null, 2));
  }
  
  // Get total count
  const { count } = await supabase
    .from('email_suppression')
    .select('*', { count: 'exact', head: true });
    
  console.log(`\nTotal suppressions in database: ${count}`);
}

main();
