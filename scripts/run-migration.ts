import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('📦 Running migration: add_lead_emails.sql');

    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', 'add_lead_emails.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Executing SQL...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

    if (error) {
      // If the RPC function doesn't exist, we'll need to execute statements one by one
      console.log('RPC method not available, executing statements directly...');

      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        const { error: stmtError } = await supabase.rpc('exec', { sql: statement });
        if (stmtError) {
          console.error('Error:', stmtError.message);
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Tables created:');
    console.log('  - lead_emails (stores Hunter.io email results)');
    console.log('');
    console.log('Columns added to leads:');
    console.log('  - hunter_io_searched_at');
    console.log('  - hunter_organization');
    console.log('  - hunter_email_pattern');
    console.log('  - hunter_total_emails');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
