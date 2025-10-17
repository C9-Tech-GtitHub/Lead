import { createClient } from '@supabase/supabase-js';

async function applyMigration() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Applying pause/resume migration...\n');

  try {
    // Test if columns already exist by trying to select them
    console.log('Checking if migration is already applied...');
    const { data: testRun } = await supabase
      .from('runs')
      .select('is_paused, paused_at, resumed_at')
      .limit(1);

    if (testRun !== null) {
      console.log('✅ Migration already applied! Columns exist.');
      console.log('   Columns: is_paused, paused_at, resumed_at');
      return;
    }
  } catch (error: any) {
    if (error.message?.includes('column') && error.message?.includes('does not exist')) {
      console.log('Columns do not exist yet. You need to apply the migration manually.\n');
      console.log('Please run the SQL in supabase/migrations/add_pause_resume.sql');
      console.log('in your Supabase SQL Editor at:');
      console.log('https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql\n');
      console.log('Or use the Supabase CLI:');
      console.log('npx supabase db push\n');
    } else {
      console.error('Error checking migration status:', error);
    }
  }
}

applyMigration().catch(console.error);
