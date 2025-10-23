import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkEmailStatus() {
  // Check email_status distribution
  const { data: statusData } = await supabase.from('leads').select('email_status');
  const statusCounts: Record<string, number> = {};
  statusData?.forEach(lead => {
    statusCounts[lead.email_status] = (statusCounts[lead.email_status] || 0) + 1;
  });
  console.log('Email status distribution:', statusCounts);

  // Check if email_domain is populated
  const { data: domainData } = await supabase.from('leads').select('email_domain').limit(10);
  console.log('\nSample email_domain values:', domainData?.map(l => l.email_domain));

  // Check email_suppression table
  const { data: suppressions } = await supabase.from('email_suppression').select('*');
  console.log('\nSuppressions count:', suppressions?.length || 0);
  console.log('Sample suppressions:', suppressions?.slice(0, 3));
}

checkEmailStatus();
