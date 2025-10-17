import { createClient } from '@supabase/supabase-js';

async function checkLeadStatus() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const runId = '0d84108b-46b6-4f5d-af7d-492c05ddaf9c';

  const { data: leads } = await supabase
    .from('leads')
    .select('name, research_status, compatibility_grade, error_message')
    .eq('run_id', runId);

  console.log('Lead Status:');
  leads?.forEach((lead) => {
    console.log(`- ${lead.name}: ${lead.research_status} ${lead.compatibility_grade ? `(Grade: ${lead.compatibility_grade})` : ''}`);
    if (lead.error_message) {
      console.log(`  Error: ${lead.error_message}`);
    }
  });
}

checkLeadStatus();
