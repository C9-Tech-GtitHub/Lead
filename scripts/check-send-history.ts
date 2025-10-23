import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSendHistory() {
  console.log('Checking email send history...\n');

  // Check email_send_history table
  const { data: sendHistory, count } = await supabase
    .from('email_send_history')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log(`Email send history records: ${count}`);
  if (sendHistory && sendHistory.length > 0) {
    console.log('Sample records:');
    sendHistory.forEach(record => {
      console.log(`  - ${record.email} sent at ${record.sent_at} (status: ${record.status})`);
    });
  }

  // Check leads table for last_email_sent_at
  const { data: leadsWithEmails } = await supabase
    .from('leads')
    .select('name, email_domain, last_email_sent_at')
    .not('last_email_sent_at', 'is', null)
    .limit(5);

  console.log(`\nLeads with last_email_sent_at: ${leadsWithEmails?.length || 0}`);
  leadsWithEmails?.forEach(lead => {
    console.log(`  - ${lead.name}: ${lead.last_email_sent_at}`);
  });
}

checkSendHistory();
