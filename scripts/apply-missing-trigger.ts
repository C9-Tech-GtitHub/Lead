import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Applying missing trigger migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/add_missing_update_run_stats_trigger.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Executing SQL migration...\n');

    // Execute the SQL via the Supabase REST API
    // Since we can't use rpc for DDL, we'll use a workaround
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.log('⚠️  Cannot execute via RPC. Please run this SQL manually in Supabase SQL Editor:\n');
      console.log('--- COPY AND PASTE THIS SQL ---\n');
      console.log(sql);
      console.log('\n--- END SQL ---\n');
    } else {
      console.log('✅ Migration applied successfully!');
    }

    console.log('\n📝 After applying, your run progress should update automatically in real-time!');
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📝 Please run the SQL from supabase/migrations/add_missing_update_run_stats_trigger.sql');
    console.log('   in your Supabase SQL Editor.');
  }
}

applyMigration();
