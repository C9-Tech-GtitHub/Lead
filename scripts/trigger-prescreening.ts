/**
 * Trigger Prescreening for Runs
 *
 * This script manually triggers the prescreening Inngest function
 */

import { createClient } from '@supabase/supabase-js';
import { Inngest } from 'inngest';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const INNGEST_EVENT_KEY = process.env.INNGEST_EVENT_KEY || 'test';

async function triggerPrescreening() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get runs that are in 'scraping' status (ready for prescreening)
  const { data: runs } = await supabase
    .from('runs')
    .select('id, business_type, location, status, user_id')
    .eq('status', 'scraping')
    .order('created_at', { ascending: false });

  if (!runs || runs.length === 0) {
    console.log('❌ No runs in "scraping" status found');
    return;
  }

  console.log(`\n🔍 Found ${runs.length} runs ready for prescreening:\n`);

  // Create Inngest client
  const inngest = new Inngest({
    id: 'lead-research-platform',
    eventKey: INNGEST_EVENT_KEY,
  });

  for (const run of runs) {
    console.log(`📋 ${run.business_type} in ${run.location}`);
    console.log(`   Run ID: ${run.id}`);

    // First, update status to 'prescreening'
    const { error: updateError } = await supabase
      .from('runs')
      .update({ status: 'prescreening' })
      .eq('id', run.id);

    if (updateError) {
      console.error(`   ❌ Error updating status:`, updateError);
      continue;
    }

    console.log(`   ✅ Updated status to "prescreening"`);

    try {
      // Trigger the Inngest prescreen function
      await inngest.send({
        name: 'lead/prescreen.triggered',
        data: {
          runId: run.id,
          businessType: run.business_type,
        },
      });

      console.log(`   ✅ Triggered prescreening Inngest function`);
    } catch (error) {
      console.error(`   ❌ Error triggering Inngest:`, error);
      console.log(`   💡 You may need to trigger via the Inngest dashboard or API`);
    }
  }

  console.log(`\n✨ Triggered prescreening for ${runs.length} runs`);
  console.log('\nCheck the Inngest dashboard or your app logs to monitor progress.');
}

triggerPrescreening().catch(console.error);
