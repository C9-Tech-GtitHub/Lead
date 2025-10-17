import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  console.log('🔄 Reading migration file...\n');

  const migrationPath = join(process.cwd(), 'supabase/migrations/allow_all_users_access.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements\n`);

  // Execute each statement using raw SQL via PostgREST
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 70).replace(/\n/g, ' ') + '...';

    console.log(`${i + 1}/${statements.length}: ${preview}`);

    try {
      // Use direct SQL execution via pg
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });

      if (error) {
        // If the RPC doesn't exist, we'll need to use psql directly
        console.log(`   ⚠️  ${error.message}`);
      } else {
        console.log(`   ✅ Success`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${err}`);
    }
  }

  console.log('\n📊 Verifying changes...\n');

  // Test that we can access all runs now
  const { data: runs, error } = await supabase
    .from('runs')
    .select('id, business_type, user_id')
    .limit(5);

  if (error) {
    console.log('❌ Error accessing runs:', error);
  } else {
    console.log(`✅ Can access ${runs?.length || 0} run(s):`);
    runs?.forEach((run, idx) => {
      console.log(`   ${idx + 1}. ${run.business_type}`);
    });
  }

  console.log('\n📝 NOTE: If you see RPC errors above, you need to run this SQL manually in Supabase dashboard.');
  console.log('   Go to: https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql');
  console.log('   And paste the contents of: supabase/migrations/allow_all_users_access.sql');
}

applyMigration().catch(console.error);
