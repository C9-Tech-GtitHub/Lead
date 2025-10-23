import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testEmailFilter() {
  console.log('Testing email status filtering...\n');

  // Test bounced filter
  console.log('1. Testing bounced filter:');
  const { data: bounced, error: bouncedError } = await supabase
    .from('leads')
    .select('name, email_domain, email_status')
    .eq('email_status', 'bounced')
    .limit(5);

  if (bouncedError) {
    console.error('Error:', bouncedError);
  } else {
    console.log(`Found ${bounced.length} bounced leads`);
    bounced.forEach(lead => console.log(`  - ${lead.name} (${lead.email_domain})`));
  }

  // Test unsubscribed filter
  console.log('\n2. Testing unsubscribed filter:');
  const { data: unsubscribed } = await supabase
    .from('leads')
    .select('name, email_domain, email_status')
    .eq('email_status', 'unsubscribed')
    .limit(5);

  console.log(`Found ${unsubscribed?.length || 0} unsubscribed leads`);
  unsubscribed?.forEach(lead => console.log(`  - ${lead.name} (${lead.email_domain})`));

  // Test valid filter
  console.log('\n3. Testing valid filter:');
  const { data: valid } = await supabase
    .from('leads')
    .select('name, email_domain, email_status')
    .eq('email_status', 'valid')
    .limit(5);

  console.log(`Found ${valid?.length || 0} valid leads`);
  valid?.forEach(lead => console.log(`  - ${lead.name} (${lead.email_domain})`));
}

testEmailFilter();
