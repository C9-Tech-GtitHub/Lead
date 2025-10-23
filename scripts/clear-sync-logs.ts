import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('Clearing SendGrid sync logs...\n');
  
  // Delete all sync logs
  const { error } = await supabase
    .from('sendgrid_sync_log')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ All sync logs cleared');
    console.log('Next sync will be a FULL historical sync\n');
  }
}

main();
