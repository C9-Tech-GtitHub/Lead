import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanupOrphanedLeads() {
  console.log('🔍 Checking for orphaned leads...\n');

  // Find all leads where the run_id doesn't exist in runs table
  const { data: allLeads } = await supabase
    .from('leads')
    .select('run_id, count')
    .limit(1000);

  if (!allLeads || allLeads.length === 0) {
    console.log('✅ No leads found - database is clean');
    return;
  }

  // Get unique run_ids
  const runIds = [...new Set(allLeads.map(l => l.run_id))];
  console.log(`Found ${allLeads.length} leads across ${runIds.length} run(s)`);

  // Check which run_ids actually exist
  const { data: existingRuns } = await supabase
    .from('runs')
    .select('id')
    .in('id', runIds);

  const existingRunIds = new Set(existingRuns?.map(r => r.id) || []);
  const orphanedRunIds = runIds.filter(id => !existingRunIds.has(id));

  if (orphanedRunIds.length === 0) {
    console.log('✅ No orphaned leads found - all leads belong to existing runs');
    return;
  }

  console.log(`\n⚠️  Found ${orphanedRunIds.length} deleted run(s) with orphaned leads:`);

  for (const runId of orphanedRunIds) {
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('run_id', runId);

    console.log(`   Run ${runId}: ${count} orphaned leads`);
  }

  console.log('\n🗑️  Deleting orphaned leads...');

  let totalDeleted = 0;
  for (const runId of orphanedRunIds) {
    const { error, count } = await supabase
      .from('leads')
      .delete({ count: 'exact' })
      .eq('run_id', runId);

    if (error) {
      console.error(`   ❌ Error deleting leads for run ${runId}:`, error);
    } else {
      console.log(`   ✅ Deleted ${count} leads for run ${runId}`);
      totalDeleted += count || 0;
    }
  }

  console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} orphaned leads`);
}

cleanupOrphanedLeads().catch(console.error);
