import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔄 Reading migration file...');
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/add_run_stats_function.sql'
  );
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('🚀 Applying run stats function migration...');

  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('\n📊 Testing functions...');

    // Test run counts
    const { data: runCounts, error: runError } = await supabase.rpc('get_run_lead_counts');

    if (runError) {
      console.error('❌ Error getting run counts:', runError);
    } else {
      console.log('\nRun lead counts:');
      runCounts?.forEach((row: any) => {
        console.log(`  Run ${row.run_id}: ${row.lead_count} leads`);
      });
      const total = runCounts?.reduce((sum: number, row: any) => sum + parseInt(row.lead_count), 0);
      console.log(`  Total: ${total} leads`);
    }

    // Test status counts
    const { data: statusCounts, error: statusError } = await supabase.rpc('get_status_counts');

    if (statusError) {
      console.error('❌ Error getting status counts:', statusError);
    } else {
      console.log('\nStatus counts:');
      statusCounts?.forEach((row: any) => {
        console.log(`  ${row.lead_status}: ${row.count}`);
      });
    }

    console.log('\n✅ All done!');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

applyMigration();
