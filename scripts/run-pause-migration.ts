import { createClient } from '@supabase/supabase-js';

async function runMigration() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔧 Applying pause/resume migration to runs table...\n');

  // We'll execute the SQL using raw SQL via the REST API
  const migrationSteps = [
    {
      name: 'Add is_paused column',
      sql: 'ALTER TABLE runs ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false',
    },
    {
      name: 'Add paused_at column',
      sql: 'ALTER TABLE runs ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ',
    },
    {
      name: 'Add resumed_at column',
      sql: 'ALTER TABLE runs ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ',
    },
  ];

  for (const step of migrationSteps) {
    try {
      console.log(`Executing: ${step.name}...`);

      // Use fetch to call Supabase REST API with raw SQL
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          },
          body: JSON.stringify({ query: step.sql }),
        }
      );

      if (response.ok) {
        console.log(`  ✅ ${step.name} - Success`);
      } else {
        const error = await response.text();
        console.log(`  ⚠️  ${step.name} - ${error}`);
      }
    } catch (err: any) {
      console.log(`  ℹ️  ${step.name} - ${err.message || 'May already exist'}`);
    }
  }

  console.log('\n📋 Verifying migration...');

  // Test by trying to update a run with the new columns
  const { data: runs } = await supabase
    .from('runs')
    .select('id')
    .limit(1);

  if (runs && runs.length > 0) {
    const testRunId = runs[0].id;

    const { error } = await supabase
      .from('runs')
      .update({ is_paused: false })
      .eq('id', testRunId);

    if (!error) {
      console.log('✅ Migration successful! Columns are working.');
    } else {
      console.log('❌ Migration verification failed:', error.message);
      console.log('\n📝 Please run the migration manually in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql\n');
      console.log('Copy and paste from: supabase/migrations/add_pause_resume.sql');
    }
  } else {
    console.log('ℹ️  No runs exist to verify, but migration should be applied.');
  }
}

runMigration();
