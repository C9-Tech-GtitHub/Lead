import { createClient } from '@supabase/supabase-js';
import { Inngest } from 'inngest';

async function retriggerResearch() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const inngest = new Inngest({ id: 'lead-research' });

  const runId = 'e18b7c5e-91b8-49b1-947c-bee898a86d6b';

  // Get all pending leads
  const { data: pendingLeads } = await supabase
    .from('leads')
    .select('id, name')
    .eq('run_id', runId)
    .eq('research_status', 'pending');

  if (!pendingLeads || pendingLeads.length === 0) {
    console.log('No pending leads found!');
    return;
  }

  console.log(`Found ${pendingLeads.length} pending leads to re-trigger`);
  console.log();

  // Send events in batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < pendingLeads.length; i += BATCH_SIZE) {
    const batch = pendingLeads.slice(i, i + BATCH_SIZE);

    console.log(`Sending batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(pendingLeads.length / BATCH_SIZE)} (${batch.length} leads)...`);

    const events = batch.map(lead => ({
      name: 'lead/research.triggered' as const,
      data: {
        leadId: lead.id,
        runId: runId,
      },
    }));

    await inngest.send(events);

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log();
  console.log(`✅ Re-triggered research for ${pendingLeads.length} leads!`);
  console.log('Check the Inngest dashboard at http://localhost:8288 to monitor progress');
}

retriggerResearch();
