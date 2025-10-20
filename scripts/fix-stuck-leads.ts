import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fixStuckLeads() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Find leads stuck in scraping or analyzing status for more than 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: stuckLeads, error } = await supabase
    .from('leads')
    .select('id, name, research_status, created_at')
    .in('research_status', ['scraping', 'analyzing'])
    .lt('created_at', fiveMinutesAgo);

  if (error) {
    console.error('Error finding stuck leads:', error);
    return;
  }

  console.log(`Found ${stuckLeads?.length || 0} stuck leads`);

  if (!stuckLeads || stuckLeads.length === 0) {
    return;
  }

  for (const lead of stuckLeads) {
    console.log(`Resetting ${lead.name} (${lead.id}) from ${lead.research_status} to pending`);

    const { error: updateError } = await supabase
      .from('leads')
      .update({
        research_status: 'pending',
        error_message: null,
      })
      .eq('id', lead.id);

    if (updateError) {
      console.error(`Error resetting lead ${lead.name}:`, updateError);
    } else {
      console.log(`✅ Reset ${lead.name}`);
    }
  }

  console.log('\nDone!');
}

fixStuckLeads();
