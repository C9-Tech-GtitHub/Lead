import { createClient } from '@supabase/supabase-js';

async function checkBCFPrescreenStatus() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find BCF lead
  const { data: bcfLeads } = await supabase
    .from('leads')
    .select('*')
    .ilike('name', '%BCF%')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('BCF Leads found:', bcfLeads?.length || 0);
  console.log('\n=== BCF Lead Details ===\n');

  bcfLeads?.forEach(lead => {
    console.log(`Name: ${lead.name}`);
    console.log(`Prescreened: ${lead.prescreened ? 'YES' : 'NO'}`);
    console.log(`Prescreen Result: ${lead.prescreen_result || 'N/A'}`);
    console.log(`Prescreen Reason: ${lead.prescreen_reason || 'N/A'}`);
    console.log(`Is Franchise: ${lead.is_franchise ? 'YES' : 'NO'}`);
    console.log(`Is National Brand: ${lead.is_national_brand ? 'YES' : 'NO'}`);
    console.log(`Research Status: ${lead.research_status}`);
    console.log(`Grade: ${lead.compatibility_grade || 'N/A'}`);
    console.log(`Prescreened At: ${lead.prescreened_at || 'N/A'}`);
    console.log('---\n');
  });
}

checkBCFPrescreenStatus();
