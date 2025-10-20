import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPendingResearch() {
  console.log('🔍 Checking pending research status...\n');

  // Get the latest run
  const { data: runs } = await supabase
    .from('runs')
    .select('id, status, progress, total_leads, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log('❌ No runs found');
    return;
  }

  const run = runs[0];
  console.log('📊 Latest Run:');
  console.log(`   ID: ${run.id}`);
  console.log(`   Status: ${run.status}`);
  console.log(`   Progress: ${run.progress}%`);
  console.log(`   Total Leads: ${run.total_leads}`);
  console.log(`   Created: ${new Date(run.created_at).toLocaleString()}\n`);

  // Get lead breakdown
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, research_status')
    .eq('run_id', run.id);

  if (!leads) {
    console.log('❌ No leads found');
    return;
  }

  const statusCounts = leads.reduce((acc, lead) => {
    acc[lead.research_status] = (acc[lead.research_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📈 Lead Status Breakdown:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  console.log(`\n📝 Total: ${leads.length} leads`);

  // If all are pending, check if the run status is correct
  if (statusCounts['pending'] === leads.length) {
    console.log('\n⚠️  ALL LEADS ARE PENDING!');
    console.log('\nPossible causes:');
    console.log('   1. Research events were not sent to Inngest');
    console.log('   2. Inngest is not running or not processing events');
    console.log('   3. The trigger-research-all API failed silently');

    console.log('\n🔧 To fix, check:');
    console.log('   1. Is Inngest dev server running? (npx inngest-cli@latest dev)');
    console.log('   2. Check Inngest dashboard for queued events');
    console.log('   3. Check browser console for API errors');
  }

  // Show a few sample leads
  console.log('\n📋 Sample leads (first 3):');
  leads.slice(0, 3).forEach((lead, i) => {
    console.log(`   ${i + 1}. ${lead.name} - ${lead.research_status}`);
  });
}

checkPendingResearch();
