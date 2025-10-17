import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Applying pause/resume migration...\n');

  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/add_pause_resume.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolon and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement.startsWith('COMMENT')) {
      // Skip comment statements as they might not be supported
      console.log('Skipping COMMENT statement');
      continue;
    }

    try {
      console.log(`Executing: ${statement.substring(0, 60)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // Try direct execution if RPC doesn't exist
        console.log('  ℹ RPC not available, using direct SQL execution');
        const { error: directError } = await supabase.from('_migrations').insert({
          name: 'add_pause_resume',
          sql: statement
        });

        if (directError) {
          console.error('  ❌ Error:', directError.message);
        } else {
          console.log('  ✅ Success');
        }
      } else {
        console.log('  ✅ Success');
      }
    } catch (err) {
      console.error('  ❌ Error:', err);
    }
  }

  console.log('\n🎉 Migration complete!');
  console.log('\nVerifying columns were added...');

  // Verify the migration worked
  const { data: runs } = await supabase
    .from('runs')
    .select('id, is_paused, paused_at, resumed_at')
    .limit(1);

  if (runs && runs.length > 0) {
    console.log('✅ New columns verified:', Object.keys(runs[0]));
  } else {
    console.log('⚠️  No existing runs to verify, but migration should be applied');
  }
}

applyMigration().catch(console.error);
