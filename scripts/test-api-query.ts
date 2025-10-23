import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testAPIQuery() {
  console.log('Testing API query with inner join...\n');

  // Test the exact query from the API
  const { data, error, count } = await supabase
    .from('leads')
    .select(`
      *,
      run:runs!inner(
        id,
        business_type,
        location,
        created_at
      )
    `, { count: 'exact' })
    .eq('email_status', 'bounced')
    .order('created_at', { ascending: false })
    .range(0, 49);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${count} bounced leads (showing ${data.length})`);
    data.slice(0, 3).forEach(lead => {
      console.log(`  - ${lead.name} (${lead.email_domain}) - Run: ${lead.run?.business_type}`);
    });
  }

  // Check if any bounced leads don't have a run_id
  console.log('\n\nChecking for bounced leads without run_id:');
  const { data: noRun } = await supabase
    .from('leads')
    .select('name, email_domain, run_id')
    .eq('email_status', 'bounced')
    .is('run_id', null);

  console.log(`Found ${noRun?.length || 0} bounced leads without run_id`);
}

testAPIQuery();
