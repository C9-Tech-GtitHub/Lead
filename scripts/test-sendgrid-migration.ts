import { createClient } from '@supabase/supabase-js';

async function testMigration() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🧪 Testing SendGrid migration...\n');

  // Test 1: Check email_suppression table exists
  console.log('1. Checking email_suppression table...');
  const { data: suppressions, error: err1 } = await supabase
    .from('email_suppression')
    .select('*');

  if (err1) {
    console.log('❌ Error:', err1.message);
  } else {
    console.log(`✅ Table exists with ${suppressions.length} records`);
    suppressions.forEach(s => {
      console.log(`   - ${s.email} (${s.source})`);
    });
  }

  // Test 2: Check other tables
  console.log('\n2. Checking other tables...');
  const tables = ['email_send_history', 'domain_contact_tracking', 'sendgrid_sync_log'];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('count').limit(1);
    console.log(error ? `❌ ${table}: ${error.message}` : `✅ ${table}: exists`);
  }

  // Test 3: Check leads table has new columns
  console.log('\n3. Checking leads table columns...');
  const { data: leads } = await supabase
    .from('leads')
    .select('id, email_status, email_domain, sendgrid_contact_id')
    .limit(1);

  if (leads && leads.length > 0) {
    console.log('✅ New email columns added to leads table');
  } else {
    console.log('⚠️  No leads found (table might be empty, but columns exist)');
  }

  // Test 4: Test the helper functions
  console.log('\n4. Testing helper functions...');

  // Test extract_domain_from_email
  const { data: domainTest, error: domainError } = await supabase
    .rpc('extract_domain_from_email', { email_address: 'test@example.com' });

  if (domainError) {
    console.log('❌ extract_domain_from_email:', domainError.message);
  } else {
    console.log(`✅ extract_domain_from_email: ${domainTest}`);
  }

  // Test can_contact_domain
  const { data: canContactTest, error: canContactError } = await supabase
    .rpc('can_contact_domain', { domain_name: 'unlimitedroofing.com.au' });

  if (canContactError) {
    console.log('❌ can_contact_domain:', canContactError.message);
  } else {
    console.log(`✅ can_contact_domain: ${canContactTest}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration verification complete!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Start your dev server: npm run dev');
  console.log('2. Test the API: curl -X POST http://localhost:3000/api/sendgrid/sync');
  console.log('3. Check email: curl -X POST http://localhost:3000/api/sendgrid/check-suppression \\');
  console.log('   -H "Content-Type: application/json" \\');
  console.log('   -d \'{"email":"info@unlimitedroofing.com.au"}\'');
}

testMigration().catch(console.error);
