/**
 * Verify that the dashboard query loads all leads
 */

import { createClient } from '@supabase/supabase-js';

async function verifyLeadLoading() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔍 Verifying lead loading fix...\n');

  // Test the old query (without range)
  console.log('1️⃣ Testing query WITHOUT range (should cap at 1000):');
  const { data: withoutRange, count: countWithoutRange } = await supabase
    .from("leads")
    .select(`
      *,
      run:runs!inner(
        id,
        business_type,
        location,
        created_at
      )
    `, { count: 'exact' })
    .order("created_at", { ascending: false });

  console.log(`   Loaded: ${withoutRange?.length || 0} leads`);
  console.log(`   Actual count: ${countWithoutRange} leads`);

  // Test the new query (with range)
  console.log('\n2️⃣ Testing query WITH range(0, 9999):');
  const { data: withRange, count: countWithRange } = await supabase
    .from("leads")
    .select(`
      *,
      run:runs!inner(
        id,
        business_type,
        location,
        created_at
      )
    `, { count: 'exact' })
    .order("created_at", { ascending: false })
    .range(0, 9999);

  console.log(`   Loaded: ${withRange?.length || 0} leads`);
  console.log(`   Actual count: ${countWithRange} leads`);

  if (withRange?.length === countWithRange) {
    console.log('\n✅ SUCCESS! All leads are now loading correctly.');
  } else {
    console.log('\n⚠️  Warning: Not all leads loaded. May need larger range.');
  }

  console.log('\n📊 Summary:');
  console.log(`   - Total leads in database: ${countWithRange}`);
  console.log(`   - Leads loaded by dashboard: ${withRange?.length || 0}`);
  console.log(`   - Previously capped at: 1000`);
}

verifyLeadLoading();
