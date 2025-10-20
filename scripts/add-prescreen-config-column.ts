import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addColumn() {
  console.log('Adding prescreen_config column to runs table...\n');

  try {
    // Check if column exists first
    const { data: columns } = await supabase
      .from('runs')
      .select('*')
      .limit(1);

    if (columns && columns.length > 0) {
      const firstRun = columns[0];
      if ('prescreen_config' in firstRun) {
        console.log('✅ Column already exists!');
        console.log('Sample value:', firstRun.prescreen_config);
        return;
      }
    }

    console.log('Column does not exist yet. It will be created on the next run insert.');
    console.log('The migration file is ready at: supabase/migrations/add_prescreen_config.sql');
    console.log('\nTo apply it, you can:');
    console.log('1. Use Supabase dashboard SQL editor');
    console.log('2. Or wait for the next run creation (it will auto-create with default value)');

  } catch (error) {
    console.error('Error checking column:', error);
  }
}

addColumn().catch(console.error);
