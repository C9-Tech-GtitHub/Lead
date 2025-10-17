/**
 * Check Runs Stuck at Prescreening
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkStuckRuns() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: runs } = await supabase
    .from('runs')
    .select('id, business_type, location, status, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('\n=== Recent Runs ===');

  if (!runs) {
    console.log('No runs found');
    return;
  }

  for (const run of runs) {
    console.log(`\n${run.business_type} in ${run.location}`);
    console.log(`  ID: ${run.id}`);
    console.log(`  Status: ${run.status}`);

    const { data: leads } = await supabase
      .from('leads')
      .select('research_status, prescreen_result, prescreened')
      .eq('run_id', run.id);

    if (!leads) continue;

    const statuses: Record<string, number> = {};
    leads.forEach(l => {
      statuses[l.research_status] = (statuses[l.research_status] || 0) + 1;
    });

    const prescreenStats = {
      prescreened: leads.filter(l => l.prescreened).length,
      notPrescreened: leads.filter(l => !l.prescreened).length,
      toResearch: leads.filter(l => l.prescreen_result === 'research').length,
      toSkip: leads.filter(l => l.prescreen_result === 'skip').length,
    };

    console.log(`  Leads: ${leads.length} total`);
    console.log(`  Research Status:`, statuses);
    console.log(`  Prescreen: ${prescreenStats.prescreened} done, ${prescreenStats.notPrescreened} pending`);
    console.log(`  Prescreen Results: ${prescreenStats.toResearch} to research, ${prescreenStats.toSkip} to skip`);

    // Diagnose the issue
    if (run.status === 'prescreening' && prescreenStats.prescreened === leads.length) {
      console.log(`  ⚠️  STUCK: All leads prescreened but status still 'prescreening'`);
      console.log(`  ✅ FIX: Should be status 'ready' or 'researching'`);
    }
  }
}

checkStuckRuns().catch(console.error);
