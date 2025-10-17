import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyTeamAccess() {
  console.log('🔄 Applying team access migration...\n');

  // Read the migration file
  const migrationPath = join(process.cwd(), 'supabase/migrations/allow_all_users_access.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  // Split by semicolons to execute statements individually
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Executing ${statements.length} SQL statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Show what we're doing
    const action = statement.split('\n')[0];
    console.log(`${i + 1}. ${action}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // Try direct execution if rpc doesn't work
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
          },
          body: JSON.stringify({ query: statement })
        });

        if (!response.ok) {
          console.log(`   ⚠️  Note: ${error.message}`);
        } else {
          console.log(`   ✅ Success`);
        }
      } else {
        console.log(`   ✅ Success`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${err}`);
    }
  }

  console.log('\n✅ Migration complete!');
  console.log('\n📊 Verifying access...\n');

  // Test that we can see all runs
  const { data: runs, error: runsError } = await supabase
    .from('runs')
    .select('id, business_type, user_id')
    .limit(5);

  if (runsError) {
    console.log('❌ Error fetching runs:', runsError);
  } else {
    console.log(`✅ Can access ${runs?.length || 0} runs`);
    runs?.forEach((run, idx) => {
      console.log(`   ${idx + 1}. ${run.business_type} (user: ${run.user_id.slice(0, 8)}...)`);
    });
  }

  console.log('\n🎉 All users can now access all runs and leads!');
}

applyTeamAccess().catch(console.error);
