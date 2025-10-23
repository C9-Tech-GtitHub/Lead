import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runUpdate() {
  console.log('Running update function via SQL...');

  // Run the function directly via SQL
  const { error } = await supabase.rpc('exec_sql', {
    sql: 'SELECT update_lead_email_statuses();'
  });

  if (error) {
    console.error('Error running update:', error);
    return;
  }

  console.log('✅ Update completed!');

  // Show the final distribution
  const { data: statusData } = await supabase.from('leads').select('email_status');
  const statusCounts: Record<string, number> = {};
  statusData?.forEach(lead => {
    statusCounts[lead.email_status] = (statusCounts[lead.email_status] || 0) + 1;
  });
  console.log('\n📊 Email status distribution:', statusCounts);
}

runUpdate();
