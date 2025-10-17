import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function markRunCompleted() {
  // Get the latest researching run
  const { data: runs } = await supabase
    .from('runs')
    .select('id, total_leads')
    .eq('status', 'researching')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log('No researching runs found');
    return;
  }

  const run = runs[0];

  // Check if all leads are done
  const { data: leads } = await supabase
    .from('leads')
    .select('research_status')
    .eq('run_id', run.id);

  if (!leads) {
    console.log('No leads found');
    return;
  }

  const allDone = leads.every(lead =>
    ['completed', 'failed', 'skipped'].includes(lead.research_status)
  );

  if (allDone) {
    console.log(`✅ All ${leads.length} leads are done. Marking run as completed...`);

    const { error } = await supabase
      .from('runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Run marked as completed!');
  } else {
    const pending = leads.filter(l => l.research_status === 'pending').length;
    const processing = leads.filter(l =>
      ['scraping', 'analyzing'].includes(l.research_status)
    ).length;

    console.log(`⚠️  Not all leads are done:`);
    console.log(`   Pending: ${pending}`);
    console.log(`   Processing: ${processing}`);
  }
}

markRunCompleted();
