/**
 * Reset Prescreening Data
 *
 * This script resets the prescreening data so you can re-run
 * the AI prescreening to properly filter out franchises.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function resetPrescreening(runId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log(`\n🔄 Resetting prescreening for run: ${runId}\n`);

  // Get run details
  const { data: run } = await supabase
    .from('runs')
    .select('id, business_type, location')
    .eq('id', runId)
    .single();

  if (!run) {
    console.log('❌ Run not found');
    return;
  }

  console.log(`📋 Run: ${run.business_type} in ${run.location}`);

  // Reset all prescreening data
  const { data: leads, error } = await supabase
    .from('leads')
    .update({
      prescreened: false,
      prescreen_result: null,
      prescreen_reason: null,
      is_franchise: null,
      is_national_brand: null,
      prescreen_confidence: null,
      prescreened_at: null,
    })
    .eq('run_id', runId)
    .select('id');

  if (error) {
    console.error('❌ Error resetting leads:', error);
    return;
  }

  console.log(`✅ Reset ${leads?.length || 0} leads`);

  // Update run status back to scraping (so it will re-run prescreening)
  const { error: runError } = await supabase
    .from('runs')
    .update({ status: 'scraping' })
    .eq('id', runId);

  if (runError) {
    console.error('❌ Error updating run:', runError);
    return;
  }

  console.log('✅ Updated run status to "scraping"');
  console.log('\n🎉 Prescreening reset complete!');
  console.log('Now trigger the manual prescreening from the UI or run the Inngest function.');
}

// Get run ID from command line or use the most recent one
const runIdArg = process.argv[2];

async function main() {
  if (runIdArg) {
    await resetPrescreening(runIdArg);
  } else {
    // Get the most recent "ready" run
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: runs } = await supabase
      .from('runs')
      .select('id, business_type, location, status')
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(2);

    if (!runs || runs.length === 0) {
      console.log('❌ No ready runs found. Provide a run ID as argument.');
      return;
    }

    console.log('\n🔍 Found ready runs:');
    runs.forEach((run, i) => {
      console.log(`${i + 1}. ${run.business_type} in ${run.location} (${run.id})`);
    });

    console.log('\n💡 Usage: npx tsx scripts/reset-prescreening.ts <run-id>');
    console.log('   Or reset both by running the script twice with each ID');
  }
}

main().catch(console.error);
