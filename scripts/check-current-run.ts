import { createClient } from '@supabase/supabase-js';

async function checkCurrentRun() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const runId = 'e18b7c5e-91b8-49b1-947c-bee898a86d6b';

  // Get run details
  const { data: run } = await supabase
    .from('runs')
    .select('*')
    .eq('id', runId)
    .single();

  console.log('Run Status:', run?.status);
  console.log('Target Count:', run?.target_count);
  console.log('Leads Found:', run?.leads_found);
  console.log('Leads Researched:', run?.leads_researched);
  console.log();

  // Get all leads
  const { data: leads } = await supabase
    .from('leads')
    .select('name, research_status, prescreening_status, compatibility_grade, error_message')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  console.log('Total Leads:', leads?.length);
  console.log();

  // Group by status
  const byStatus: Record<string, number> = {};
  leads?.forEach((lead) => {
    byStatus[lead.research_status] = (byStatus[lead.research_status] || 0) + 1;
  });

  console.log('Leads by research status:');
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  console.log();

  // Show details
  console.log('Lead Details:');
  leads?.forEach((lead, i) => {
    console.log(`${i + 1}. ${lead.name}`);
    console.log(`   Research: ${lead.research_status}, Prescreen: ${lead.prescreening_status}, Grade: ${lead.compatibility_grade || 'N/A'}`);
    if (lead.error_message) {
      console.log(`   Error: ${lead.error_message}`);
    }
  });
}

checkCurrentRun();
