/**
 * Test Force Restart Endpoint
 *
 * This script helps debug the force-restart endpoint by:
 * 1. Checking if the run exists
 * 2. Showing run details
 * 3. Listing leads that would be restarted
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testForceRestart() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get the most recent run
  const { data: runs, error: runsError } = await supabase
    .from('runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (runsError) {
    console.error('Error fetching runs:', runsError);
    return;
  }

  console.log('\n=== Recent Runs ===');
  runs?.forEach((run, i) => {
    console.log(`\n${i + 1}. Run ID: ${run.id}`);
    console.log(`   User ID: ${run.user_id}`);
    console.log(`   Business: ${run.business_type} in ${run.location}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Is Paused: ${run.is_paused}`);
    console.log(`   Progress: ${run.progress}%`);
  });

  if (!runs || runs.length === 0) {
    console.log('\nNo runs found!');
    return;
  }

  // Check the first (most recent) run
  const targetRun = runs[0];
  console.log(`\n=== Analyzing Run: ${targetRun.id} ===`);

  // Get leads breakdown
  const { data: allLeads } = await supabase
    .from('leads')
    .select('id, name, research_status, compatibility_grade, prescreen_result')
    .eq('run_id', targetRun.id);

  console.log(`\nTotal leads: ${allLeads?.length || 0}`);

  const pending = allLeads?.filter(l => l.research_status === 'pending') || [];
  const scraping = allLeads?.filter(l => l.research_status === 'scraping') || [];
  const analyzing = allLeads?.filter(l => l.research_status === 'analyzing') || [];
  const completed = allLeads?.filter(l => l.research_status === 'completed') || [];
  const failed = allLeads?.filter(l => l.research_status === 'failed') || [];
  const skipped = allLeads?.filter(l => l.research_status === 'skipped') || [];

  console.log(`\n=== Lead Status Breakdown ===`);
  console.log(`Pending: ${pending.length}`);
  console.log(`Scraping (stuck): ${scraping.length}`);
  console.log(`Analyzing (stuck): ${analyzing.length}`);
  console.log(`Completed: ${completed.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Skipped: ${skipped.length}`);

  // Leads that would be restarted
  const toRestart = allLeads?.filter(
    l => ['pending', 'scraping', 'analyzing'].includes(l.research_status) &&
         l.prescreen_result !== 'skip'
  ) || [];

  console.log(`\n=== Force Restart Would Affect ===`);
  console.log(`${toRestart.length} leads would be restarted`);

  if (scraping.length > 0 || analyzing.length > 0) {
    console.log(`${scraping.length + analyzing.length} stuck leads would be reset to pending`);
  }

  // Show sample leads
  if (toRestart.length > 0) {
    console.log('\nSample leads to restart:');
    toRestart.slice(0, 5).forEach((lead, i) => {
      console.log(`  ${i + 1}. ${lead.name} (${lead.research_status})`);
    });
    if (toRestart.length > 5) {
      console.log(`  ... and ${toRestart.length - 5} more`);
    }
  }

  // Check for franchises that would be skipped
  const franchises = allLeads?.filter(l => l.prescreen_result === 'skip') || [];
  if (franchises.length > 0) {
    console.log(`\n${franchises.length} franchise leads would be skipped`);
  }

  console.log('\n=== Ready to Force Restart ===');
  console.log(`Run ID: ${targetRun.id}`);
  console.log(`User ID: ${targetRun.user_id}`);
  console.log(`\nTo test the API, use this curl command:`);
  console.log(`\ncurl -X POST http://localhost:3000/api/runs/force-restart \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"runId":"${targetRun.id}"}'`);
  console.log(`\nNote: You'll need to be authenticated. Check browser console for the actual fetch request.`);
}

testForceRestart().catch(console.error);
