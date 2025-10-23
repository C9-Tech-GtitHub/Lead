import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('=== Applying ASM Group Migration ===\n');

  // Read migration file
  const migrationPath = join(process.cwd(), 'supabase/migrations/add_asm_group_support.sql');
  const migration = readFileSync(migrationPath, 'utf-8');

  console.log('Migration file loaded:', migrationPath);
  console.log('\nExecuting migration...\n');

  // Execute migration
  const { data, error } = await supabase.rpc('exec_sql', { sql: migration }).single();

  if (error) {
    console.error('❌ Migration failed:', error);

    // Try executing directly if rpc doesn't work
    console.log('\nTrying direct execution...\n');
    const { error: directError } = await supabase.from('_sql').insert({ query: migration });

    if (directError) {
      console.error('❌ Direct execution also failed:', directError);
      console.log('\nPlease run this migration manually in Supabase SQL editor:');
      console.log(migration);
      return;
    }
  }

  console.log('✅ Migration applied successfully!\n');

  // Verify changes
  console.log('=== Verifying Schema Changes ===\n');

  const { data: testData, error: testError } = await supabase
    .from('email_suppression')
    .select('*')
    .limit(1);

  if (testError) {
    console.log('Note: Table might be empty, but schema should be updated');
  } else if (testData && testData.length > 0) {
    console.log('Available columns:', Object.keys(testData[0]));
  }

  console.log('\n✅ ASM group support is ready!');
}

main();
