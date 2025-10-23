import { createClient } from '@supabase/supabase-js';

async function checkEmailDomains() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check email_domain population
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  const { count: withDomain } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .not('email_domain', 'is', null)
    .neq('email_domain', '');

  const { count: withWebsite } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .not('website', 'is', null)
    .neq('website', '');

  console.log('📊 Lead Email Domain Status:');
  console.log('─────────────────────────────');
  console.log(`Total leads:              ${totalLeads?.toLocaleString()}`);
  console.log(`With email_domain:        ${withDomain?.toLocaleString()}`);
  console.log(`With website:             ${withWebsite?.toLocaleString()}`);
  console.log(`Missing email_domain:     ${((totalLeads || 0) - (withDomain || 0)).toLocaleString()}`);
  console.log('─────────────────────────────');

  // Sample a few leads
  const { data: sampleLeads } = await supabase
    .from('leads')
    .select('business_name, website, email_domain')
    .limit(5);

  console.log('\n📋 Sample Leads:');
  sampleLeads?.forEach((lead, i) => {
    console.log(`${i + 1}. ${lead.business_name}`);
    console.log(`   Website: ${lead.website || 'N/A'}`);
    console.log(`   Email Domain: ${lead.email_domain || 'MISSING'}`);
  });
}

checkEmailDomains();
