import { createClient } from '@supabase/supabase-js';

async function checkMatching() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check email_status distribution
  const { data: leads } = await supabase
    .from('leads')
    .select('email_status');

  const statusCounts = leads?.reduce((acc: any, lead) => {
    const status = lead.email_status || 'null';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  console.log('📊 Email Status Distribution:');
  console.log(JSON.stringify(statusCounts, null, 2));

  // Check if domains match
  const { data: suppressedDomains } = await supabase
    .from('email_suppression')
    .select('domain')
    .limit(5);

  console.log('\n📧 Sample suppressed domains:');
  suppressedDomains?.forEach(s => console.log(`  - ${s.domain}`));

  // Check if any lead domains match
  const sampleDomain = suppressedDomains?.[0]?.domain;
  if (sampleDomain) {
    const { data: matchingLeads } = await supabase
      .from('leads')
      .select('business_name, email_domain, email_status')
      .eq('email_domain', sampleDomain)
      .limit(3);

    console.log(`\n🔍 Leads matching domain "${sampleDomain}":`);
    console.log(JSON.stringify(matchingLeads, null, 2));
  }

  // Count potential matches
  const { data: allSuppressedDomains } = await supabase
    .from('email_suppression')
    .select('domain');

  const suppressedDomainSet = new Set(allSuppressedDomains?.map(d => d.domain));

  const { data: allLeads } = await supabase
    .from('leads')
    .select('email_domain, email_status');

  const matchingLeads = allLeads?.filter(l =>
    l.email_domain && suppressedDomainSet.has(l.email_domain)
  );

  console.log(`\n📈 Matching Analysis:`);
  console.log(`  Total leads: ${allLeads?.length}`);
  console.log(`  Leads with matching suppressed domains: ${matchingLeads?.length}`);
  console.log(`  Leads already marked as suppressed: ${allLeads?.filter(l => l.email_status && l.email_status !== 'unknown').length}`);
}

checkMatching();
