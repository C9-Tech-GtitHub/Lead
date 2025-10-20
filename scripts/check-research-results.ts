import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkResearchResults() {
  // Get the Magic the Gathering run
  const { data: runs } = await supabase
    .from('runs')
    .select('*')
    .eq('business_type', 'Magic the Gathering')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log('No Magic the Gathering runs found');
    return;
  }

  const run = runs[0];
  console.log('=== MAGIC THE GATHERING RUN ===\n');
  console.log(`Status: ${run.status}`);
  console.log(`Total Leads: ${run.total_leads}`);
  console.log(`Progress: ${run.progress || 0}%\n`);

  // Get all leads with their research results
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('run_id', run.id)
    .order('created_at', { ascending: true });

  if (!leads || leads.length === 0) {
    console.log('No leads found');
    return;
  }

  console.log(`=== LEADS BREAKDOWN (${leads.length} total) ===\n`);

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  const gradeCounts: Record<string, number> = {};

  leads.forEach(lead => {
    statusCounts[lead.research_status] = (statusCounts[lead.research_status] || 0) + 1;
    if (lead.compatibility_grade) {
      gradeCounts[lead.compatibility_grade] = (gradeCounts[lead.compatibility_grade] || 0) + 1;
    }
  });

  console.log('Research Status:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });

  console.log('\nGrade Distribution:');
  Object.entries(gradeCounts).forEach(([grade, count]) => {
    console.log(`  Grade ${grade}: ${count}`);
  });

  // Show all F-graded leads with their reasoning
  const fLeads = leads.filter(l => l.compatibility_grade === 'F');

  console.log(`\n=== F-GRADED LEADS (${fLeads.length}) ===\n`);

  fLeads.forEach((lead, idx) => {
    console.log(`${idx + 1}. ${lead.name}`);
    console.log(`   Address: ${lead.address || 'N/A'}`);
    console.log(`   Website: ${lead.website || 'N/A'}`);
    console.log(`   Status: ${lead.research_status}`);
    console.log(`   Reason: ${lead.grade_reasoning || 'No reason provided'}`);

    if (lead.is_franchise) {
      console.log(`   ⚠️  Marked as FRANCHISE`);
    }
    if (lead.is_national_brand) {
      console.log(`   ⚠️  Marked as NATIONAL BRAND`);
    }
    if (lead.prescreen_reason) {
      console.log(`   Prescreen: ${lead.prescreen_reason}`);
    }

    console.log('');
  });

  // Show non-F graded leads
  const goodLeads = leads.filter(l => l.compatibility_grade && l.compatibility_grade !== 'F');

  if (goodLeads.length > 0) {
    console.log(`\n=== NON-F GRADED LEADS (${goodLeads.length}) ===\n`);

    goodLeads.forEach((lead, idx) => {
      console.log(`${idx + 1}. ${lead.name} - Grade ${lead.compatibility_grade}`);
      console.log(`   Website: ${lead.website || 'N/A'}`);
      console.log(`   Reason: ${lead.grade_reasoning || 'No reason provided'}`);
      console.log('');
    });
  }

  // Check for any errors
  const leadsWithErrors = leads.filter(l => l.error_message);
  if (leadsWithErrors.length > 0) {
    console.log(`\n=== LEADS WITH ERRORS (${leadsWithErrors.length}) ===\n`);
    leadsWithErrors.forEach(lead => {
      console.log(`${lead.name}:`);
      console.log(`  Error: ${lead.error_message}`);
      console.log('');
    });
  }
}

checkResearchResults().catch(console.error);
