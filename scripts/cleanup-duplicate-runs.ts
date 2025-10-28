/**
 * Cleanup script to find and merge duplicate runs
 * Runs with same business_type + location will be merged
 *
 * Run with: npx tsx scripts/cleanup-duplicate-runs.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDuplicateRuns() {
  console.log('🔍 Finding duplicate runs...\n');

  // Get all runs
  const { data: runs, error } = await supabase
    .from('runs')
    .select('id, business_type, location, total_leads, created_at')
    .order('created_at', { ascending: false });

  if (error || !runs) {
    console.error('Error fetching runs:', error);
    process.exit(1);
  }

  console.log(`Found ${runs.length} total runs\n`);

  // Group by business_type + location
  const grouped = new Map<string, typeof runs>();

  runs.forEach(run => {
    const key = `${run.business_type}|||${run.location}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(run);
  });

  // Find duplicates
  const duplicates = [];
  for (const [key, group] of grouped.entries()) {
    if (group.length > 1) {
      const [businessType, location] = key.split('|||');
      duplicates.push({
        businessType,
        location,
        runs: group,
        count: group.length,
      });
    }
  }

  if (duplicates.length === 0) {
    console.log('✅ No duplicate runs found!');
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} sets of duplicate runs:\n`);

  duplicates.forEach((dup, index) => {
    const totalLeads = dup.runs.reduce((sum, r) => sum + (r.total_leads || 0), 0);
    console.log(`${index + 1}. ${dup.businessType} - ${dup.location}`);
    console.log(`   ${dup.count} duplicate runs, ${totalLeads} total leads:`);
    dup.runs.forEach(run => {
      console.log(`   • ${run.total_leads || 0} leads (created ${new Date(run.created_at).toLocaleDateString()})`);
    });
    console.log('');
  });

  // Auto-merge duplicates
  console.log('🔄 Merging duplicate runs...\n');

  for (const dup of duplicates) {
    console.log(`Merging: ${dup.businessType} - ${dup.location}...`);

    const runIds = dup.runs.map(r => r.id);

    try {
      const response = await fetch(`${supabaseUrl.replace('/v1', '')}/functions/v1/api/runs/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          runIds,
          removeDuplicates: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ Merged into: ${data.mergedRun.name} (${data.mergedRun.totalLeads} leads, ${data.mergedRun.duplicatesRemoved} duplicates removed)`);
      } else {
        console.log(`  ❌ Failed to merge`);
      }
    } catch (error) {
      console.error(`  ❌ Error:`, error);
    }
  }

  console.log('\n✅ Cleanup complete!');
}

cleanupDuplicateRuns().catch(console.error);
