#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration(migrationFile: string) {
  console.log(`🔄 Running migration: ${migrationFile}\n`);

  // Read the migration file
  const migrationPath = join(process.cwd(), 'supabase/migrations', migrationFile);
  const sql = readFileSync(migrationPath, 'utf-8');

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements\n`);

  let successCount = 0;
  let failCount = 0;

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 70).replace(/\n/g, ' ') + '...';

    console.log(`${i + 1}/${statements.length}: ${preview}`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
        failCount++;
      } else {
        console.log(`   ✅ Success`);
        successCount++;
      }
    } catch (err) {
      console.log(`   ❌ ${err}`);
      failCount++;
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📝 Total: ${statements.length}`);

  if (failCount > 0) {
    console.log(`\n⚠️  Some statements failed. You may need to run them manually in Supabase dashboard.`);
    console.log(`   Go to: https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql`);
  } else {
    console.log(`\n🎉 Migration completed successfully!`);
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.log('Usage: npm run migrate <migration-file.sql>');
  console.log('Example: npm run migrate allow_all_users_access.sql');
  process.exit(1);
}

runMigration(migrationFile).catch(console.error);
