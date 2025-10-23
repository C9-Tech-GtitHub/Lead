import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check email_suppression counts
  const { count: totalSuppressions } = await supabase
    .from('email_suppression')
    .select('*', { count: 'exact', head: true });

  const { count: bounceCount } = await supabase
    .from('email_suppression')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'bounce');

  const { count: unsubCount } = await supabase
    .from('email_suppression')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'unsubscribe');

  console.log('\n=== Email Suppression Table ===');
  console.log('Total suppressions:', totalSuppressions);
  console.log('Bounces:', bounceCount);
  console.log('Unsubscribes:', unsubCount);

  // Check leads with email status
  const { count: bouncedLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('email_status', 'bounced');

  const { count: unsubscribedLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('email_status', 'unsubscribed');

  console.log('\n=== Leads Updated ===');
  console.log('Bounced leads:', bouncedLeads);
  console.log('Unsubscribed leads:', unsubscribedLeads);

  // Check sync log
  const { data: syncLog } = await supabase
    .from('sendgrid_sync_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n=== Recent Sync Logs ===');
  syncLog?.forEach(log => {
    console.log(`${log.sync_type}: ${log.records_synced} records, status: ${log.status}`);
    console.log(`  Started: ${log.started_at}`);
    console.log(`  Duration: ${log.duration_seconds}s`);
  });

  // Sample some suppressions
  const { data: sampleBounces } = await supabase
    .from('email_suppression')
    .select('email, domain, source, reason')
    .eq('source', 'bounce')
    .limit(3);

  const { data: sampleUnsubs } = await supabase
    .from('email_suppression')
    .select('email, domain, source')
    .eq('source', 'unsubscribe')
    .limit(3);

  console.log('\n=== Sample Bounces ===');
  sampleBounces?.forEach(b => console.log(`  ${b.email} (@${b.domain}) - ${b.reason}`));

  console.log('\n=== Sample Unsubscribes ===');
  sampleUnsubs?.forEach(u => console.log(`  ${u.email} (@${u.domain})`));
}

main();
