import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testFullRestart() {
  console.log('🧪 Testing Full Restart Functionality\n');
  console.log('=====================================\n');

  // Get the latest run with pending leads
  const { data: runs } = await supabase
    .from('runs')
    .select('id, business_type, location, status')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('📊 Available Runs:');
  runs?.forEach((run, idx) => {
    console.log(`   ${idx + 1}. ${run.business_type} in ${run.location} (${run.status})`);
  });

  const testRun = runs?.[0];
  if (!testRun) {
    console.log('\n❌ No runs found to test');
    return;
  }

  console.log(`\n🎯 Testing restart on: ${testRun.business_type}`);
  console.log(`   Run ID: ${testRun.id}\n`);

  // Analyze what would be restarted
  const { data: allLeads } = await supabase
    .from('leads')
    .select('id, name, research_status, prescreen_result, prescreen_status, compatibility_grade')
    .eq('run_id', testRun.id);

  console.log(`📈 Lead Status Analysis:`);
  console.log(`   Total leads: ${allLeads?.length || 0}`);

  // Count by status
  const statusCounts = allLeads?.reduce((acc: any, lead) => {
    const key = `${lead.research_status}|${lead.prescreen_result || 'null'}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log('\n   Breakdown:');
  Object.entries(statusCounts || {}).forEach(([key, count]) => {
    console.log(`      ${key}: ${count}`);
  });

  // Apply restart logic (same as API)
  const leadsNeedingWork = allLeads?.filter(
    (lead) =>
      lead.prescreen_result !== 'skip' &&
      lead.research_status !== 'completed' &&
      lead.research_status !== 'failed' &&
      lead.compatibility_grade !== 'F'
  );

  console.log(`\n✅ Leads needing work: ${leadsNeedingWork?.length || 0}`);

  // Separate by what they need
  const leadsNeedingPrescreen = leadsNeedingWork?.filter(
    (lead) => !lead.prescreen_status || lead.prescreen_status === 'pending'
  );

  const leadsNeedingResearch = leadsNeedingWork?.filter(
    (lead) => (lead.prescreen_result === 'research' || lead.prescreen_result === 'pass') &&
              (lead.research_status === 'pending' ||
               lead.research_status === 'scraping' ||
               lead.research_status === 'analyzing')
  );

  console.log('\n🔬 Restart Plan:');
  console.log(`   Needs Prescreening: ${leadsNeedingPrescreen?.length || 0}`);
  console.log(`   Needs Research: ${leadsNeedingResearch?.length || 0}`);
  console.log(`   ─────────────────────────────`);
  console.log(`   TOTAL TO RESTART: ${(leadsNeedingPrescreen?.length || 0) + (leadsNeedingResearch?.length || 0)}`);

  if ((leadsNeedingResearch?.length || 0) > 0) {
    console.log('\n📋 Sample leads that would be researched:');
    leadsNeedingResearch?.slice(0, 5).forEach((lead, idx) => {
      console.log(`   ${idx + 1}. ${lead.name}`);
    });
  }

  if ((leadsNeedingPrescreen?.length || 0) > 0) {
    console.log('\n📋 Sample leads that would be prescreened:');
    leadsNeedingPrescreen?.slice(0, 5).forEach((lead, idx) => {
      console.log(`   ${idx + 1}. ${lead.name}`);
    });
  }

  // Test the actual API endpoint
  console.log('\n🚀 Testing Force Restart API...\n');

  try {
    const response = await fetch('http://localhost:3000/api/runs/force-restart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ runId: testRun.id })
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('❌ API Error:', error);
      console.log('\n💡 Note: The API requires user authentication. Test this by clicking "Restart" in the UI.');
    } else {
      const result = await response.json();
      console.log('✅ API Response:', result);
    }
  } catch (err) {
    console.log('⚠️  Could not test API endpoint (server may not be running)');
    console.log('   To test: Click the "Restart" button in the UI at localhost:3000');
  }

  console.log('\n✅ Test complete!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Make sure localhost:3000 is running (npm run dev)');
  console.log('   2. Refresh the page in your browser');
  console.log('   3. Click the "Restart" button on any run');
  console.log('   4. Watch the progress in the UI and Inngest logs');
}

testFullRestart().catch(console.error);
