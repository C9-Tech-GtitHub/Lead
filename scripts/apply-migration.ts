import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  console.log('📦 Reading migration file...');
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/fix_progress_calculation.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('🚀 Applying migration to Supabase...');
  console.log('\n⚠️  Note: You need to apply this SQL manually in Supabase Dashboard > SQL Editor');
  console.log('\n--- COPY THE SQL BELOW ---\n');
  console.log(sql);
  console.log('\n--- END OF SQL ---\n');
  console.log('📝 Instructions:');
  console.log('1. Go to https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql/new');
  console.log('2. Copy the SQL above');
  console.log('3. Paste it into the SQL Editor');
  console.log('4. Click "Run"');
}

applyMigration();
