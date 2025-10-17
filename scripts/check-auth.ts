/**
 * Check Authentication Setup
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkAuth() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get the most recent run
  const { data: run } = await supabase
    .from('runs')
    .select('id, user_id, status, is_paused')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!run) {
    console.log('❌ No runs found');
    return;
  }

  console.log('\n=== Run Details ===');
  console.log(`Run ID: ${run.id}`);
  console.log(`User ID: ${run.user_id}`);
  console.log(`Status: ${run.status}`);
  console.log(`Is Paused: ${run.is_paused}`);

  // Try to fetch user details
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', run.user_id)
    .single();

  if (profileError) {
    console.log('\n⚠️  No profile found, checking auth.users...');
  } else {
    console.log('\n=== User Profile ===');
    console.log(profile);
  }

  // Check if auth.users is accessible (it's not via service role typically)
  console.log('\n=== Testing API Endpoint Directly ===');
  console.log('\nTo test with proper auth, run this in browser console:');
  console.log(`
fetch('/api/runs/force-restart', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ runId: '${run.id}' })
})
.then(r => r.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
  `);
}

checkAuth().catch(console.error);
