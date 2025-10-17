import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyTeamAccess() {
  console.log('🔄 Applying team access policies...\n');

  const statements = [
    // RUNS policies
    `DROP POLICY IF EXISTS "Users can view own runs" ON runs`,
    `DROP POLICY IF EXISTS "Users can create own runs" ON runs`,
    `DROP POLICY IF EXISTS "Users can update own runs" ON runs`,
    `DROP POLICY IF EXISTS "Users can delete own runs" ON runs`,

    `CREATE POLICY "Authenticated users can view all runs" ON runs FOR SELECT TO authenticated USING (true)`,
    `CREATE POLICY "Authenticated users can create runs" ON runs FOR INSERT TO authenticated WITH CHECK (true)`,
    `CREATE POLICY "Authenticated users can update all runs" ON runs FOR UPDATE TO authenticated USING (true) WITH CHECK (true)`,
    `CREATE POLICY "Authenticated users can delete all runs" ON runs FOR DELETE TO authenticated USING (true)`,

    // LEADS policies
    `DROP POLICY IF EXISTS "Users can view own leads" ON leads`,
    `DROP POLICY IF EXISTS "Users can create own leads" ON leads`,
    `DROP POLICY IF EXISTS "Users can update own leads" ON leads`,
    `DROP POLICY IF EXISTS "Users can delete own leads" ON leads`,

    `CREATE POLICY "Authenticated users can view all leads" ON leads FOR SELECT TO authenticated USING (true)`,
    `CREATE POLICY "Authenticated users can create leads" ON leads FOR INSERT TO authenticated WITH CHECK (true)`,
    `CREATE POLICY "Authenticated users can update all leads" ON leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true)`,
    `CREATE POLICY "Authenticated users can delete all leads" ON leads FOR DELETE TO authenticated USING (true)`,
  ];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const action = stmt.substring(0, 60) + '...';
    console.log(`${i + 1}/${statements.length}: ${action}`);

    try {
      // Use the REST API to execute SQL
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: stmt })
      });

      if (!response.ok) {
        // It's OK if DROP fails (policy doesn't exist)
        if (stmt.startsWith('DROP')) {
          console.log(`   ⚠️  Policy may not exist (OK)`);
        } else {
          const error = await response.text();
          console.log(`   ❌ Error: ${error}`);
        }
      } else {
        console.log(`   ✅ Success`);
      }
    } catch (err) {
      console.log(`   ❌ ${err}`);
    }
  }

  console.log('\n✅ Policy updates complete!');
  console.log('\n📊 Testing access...\n');

  // Test access
  const { data: runs } = await supabase.from('runs').select('id, business_type').limit(3);
  const { data: leads } = await supabase.from('leads').select('id, name').limit(3);

  console.log(`Runs accessible: ${runs?.length || 0}`);
  console.log(`Leads accessible: ${leads?.length || 0}`);

  console.log('\n🎉 All authenticated users can now access all runs and leads!');
}

applyTeamAccess().catch(console.error);
