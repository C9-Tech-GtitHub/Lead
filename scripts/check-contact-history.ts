import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkContactHistory() {
  console.log('Checking domain contact tracking...\n');

  const { data, count } = await supabase
    .from('domain_contact_tracking')
    .select('*', { count: 'exact' })
    .order('last_contacted_at', { ascending: false })
    .limit(5);

  console.log(`Total domains tracked: ${count}`);

  if (data && data.length > 0) {
    console.log('\nSample contact history:');
    data.forEach(record => {
      console.log(`Domain: ${record.domain}`);
      console.log(`  Last contacted: ${record.last_contacted_at}`);
      console.log(`  Can contact after: ${record.can_contact_after}`);
      console.log(`  Total contacts: ${record.total_contacts}`);
      console.log();
    });
  } else {
    console.log('No contact history found');
  }
}

checkContactHistory();
