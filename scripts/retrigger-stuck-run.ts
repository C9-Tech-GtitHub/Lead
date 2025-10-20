import { createClient } from '@supabase/supabase-js';
import { Inngest } from 'inngest';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const inngest = new Inngest({
  id: 'lead-research',
  name: 'Lead Research Platform',
  eventKey: process.env.INNGEST_EVENT_KEY,
});

async function retriggerStuckRun() {
  // Get the stuck run
  const { data: runs } = await supabase
    .from('runs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log('No pending runs found');
    return;
  }

  const run = runs[0];
  console.log('Found stuck run:', run.id);
  console.log('Business types:', run.business_types);
  console.log('Location:', run.location);
  console.log('Target count:', run.target_count);

  // Re-send the lead/run.created event
  console.log('\nRetriggering workflow...');
  const result = await inngest.send({
    name: 'lead/run.created',
    data: {
      runId: run.id,
      userId: run.user_id,
      businessTypes: run.business_types,
      location: run.location,
      targetCount: run.target_count,
    },
  });

  console.log('✅ Event sent successfully:', result);
  console.log('\nThe run should start processing now.');
  console.log('Check the UI in a few seconds to see progress.');
}

retriggerStuckRun().catch(console.error);
