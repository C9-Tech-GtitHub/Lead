import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  console.log('📝 Applying progress calculation fix...\n');

  const sql = readFileSync('supabase/migrations/fix_progress_use_actual_leads.sql', 'utf-8');

  try {
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Migration applied successfully!\n');

    // Now trigger an update to recalculate progress for existing runs
    console.log('🔄 Recalculating progress for all runs...\n');

    const { data: runs } = await supabase.from('runs').select('id').eq('status', 'researching');

    if (runs && runs.length > 0) {
      for (const run of runs) {
        // Trigger the function by updating a lead (touch one lead to trigger the update)
        const { data: leads } = await supabase
          .from('leads')
          .select('id')
          .eq('run_id', run.id)
          .limit(1);

        if (leads && leads.length > 0) {
          await supabase
            .from('leads')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', leads[0].id);
        }
      }

      console.log(`✅ Recalculated progress for ${runs.length} run(s)\n`);
    }

    // Check results
    const { data: updatedRuns } = await supabase
      .from('runs')
      .select('id, status, progress, total_leads, target_count')
      .order('created_at', { ascending: false })
      .limit(1);

    if (updatedRuns && updatedRuns.length > 0) {
      const run = updatedRuns[0];
      console.log('📊 Latest run status:');
      console.log(`   Status: ${run.status}`);
      console.log(`   Progress: ${run.progress}%`);
      console.log(`   Total leads: ${run.total_leads}`);
      console.log(`   Target: ${run.target_count}`);
    }
  } catch (error) {
    console.error('❌ Error applying migration:', error);
  }
}

applyMigration();
