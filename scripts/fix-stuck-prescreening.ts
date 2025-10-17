/**
 * Fix Runs Stuck at Prescreening
 *
 * This script:
 * 1. Finds runs stuck at 'prescreening' status
 * 2. Marks all leads as prescreened (skip the prescreening step)
 * 3. Updates run status to 'ready' so they can be researched
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fixStuckRuns() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Find runs stuck at prescreening
  const { data: stuckRuns } = await supabase
    .from('runs')
    .select('id, business_type, location, user_id')
    .eq('status', 'prescreening');

  if (!stuckRuns || stuckRuns.length === 0) {
    console.log('✅ No runs stuck at prescreening');
    return;
  }

  console.log(`\n🔧 Found ${stuckRuns.length} runs stuck at prescreening\n`);

  for (const run of stuckRuns) {
    console.log(`\n📋 Processing: ${run.business_type} in ${run.location}`);
    console.log(`   Run ID: ${run.id}`);

    // Get all leads that haven't been prescreened
    const { data: leads } = await supabase
      .from('leads')
      .select('id, name')
      .eq('run_id', run.id)
      .or('prescreened.is.null,prescreened.eq.false');

    if (!leads || leads.length === 0) {
      console.log('   ⚠️  All leads already prescreened, just updating run status');

      // Update run status to ready
      await supabase
        .from('runs')
        .update({ status: 'ready' })
        .eq('id', run.id);

      console.log('   ✅ Updated run status to "ready"');
      continue;
    }

    console.log(`   Found ${leads.length} leads to mark as prescreened`);

    // Mark all leads as prescreened with "research" result
    // (Skip the AI prescreening and just mark them all for research)
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        prescreened: true,
        prescreen_result: 'research',
        prescreen_reason: 'Prescreening skipped - marked for research',
        prescreen_confidence: 'low',
        prescreened_at: new Date().toISOString(),
      })
      .eq('run_id', run.id)
      .or('prescreened.is.null,prescreened.eq.false');

    if (updateError) {
      console.error(`   ❌ Error updating leads:`, updateError);
      continue;
    }

    console.log(`   ✅ Marked ${leads.length} leads for research`);

    // Update run status to ready
    const { error: runError } = await supabase
      .from('runs')
      .update({ status: 'ready' })
      .eq('id', run.id);

    if (runError) {
      console.error(`   ❌ Error updating run status:`, runError);
      continue;
    }

    console.log('   ✅ Updated run status to "ready"');

    // Log progress
    await supabase.from('progress_logs').insert({
      run_id: run.id,
      user_id: run.user_id,
      event_type: 'status_update',
      message: `Fixed stuck prescreening - ${leads.length} leads marked for research`,
      details: { leadsFixed: leads.length },
    });

    console.log(`   🎉 Run is now ready for research!`);
  }

  console.log(`\n✨ Fixed ${stuckRuns.length} stuck runs\n`);
  console.log('You can now click "Research All" on these runs in the dashboard.');
}

fixStuckRuns().catch(console.error);
