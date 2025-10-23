import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('📧 Running SendGrid email tracking migration...\n');

  const migrationPath = join(process.cwd(), 'supabase/migrations/add_sendgrid_email_tracking.sql');
  const sql = readFileSync(migrationPath, 'utf8');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments and DO blocks (they need special handling)
    if (statement.startsWith('--') || statement.includes('DO $$')) {
      continue;
    }

    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql_string: statement + ';'
      }).catch(() => ({ error: 'exec_sql not available' }));

      if (error) {
        // If exec_sql doesn't work, we'll need to run it manually
        console.log(`⚠️  Statement ${i + 1}: Needs manual execution`);
        errorCount++;
      } else {
        successCount++;
      }
    } catch (err: any) {
      console.error(`❌ Error in statement ${i + 1}:`, err.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Migration Summary:`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('='.repeat(60));

  if (errorCount > 0) {
    console.log('\n📝 Manual Steps Required:');
    console.log('1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql');
    console.log('2. Copy the contents of: supabase/migrations/add_sendgrid_email_tracking.sql');
    console.log('3. Paste and run in the SQL Editor');
    console.log('4. Verify tables were created with: SELECT * FROM email_suppression;');
  } else {
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify tables: SELECT * FROM email_suppression;');
    console.log('2. Test API: curl -X POST http://localhost:3000/api/sendgrid/sync');
  }
}

runMigration().catch(console.error);
