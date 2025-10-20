import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRunUsers() {
  console.log('Checking user_id in runs...\n');

  // Get all runs with their user_id
  const { data: runs, error } = await supabase
    .from('runs')
    .select('id, user_id, created_at, location, status')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total runs: ${runs?.length || 0}\n`);

  if (runs && runs.length > 0) {
    runs.forEach((run, i) => {
      console.log(`${i + 1}. ID: ${run.id.substring(0, 8)}...`);
      console.log(`   User ID: ${run.user_id || 'NULL/MISSING'}`);
      console.log(`   Location: ${run.location}`);
      console.log(`   Created: ${new Date(run.created_at).toLocaleDateString()}`);
      console.log('');
    });
  }

  // Check current auth users
  console.log('\nChecking auth users...');
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error('Error fetching users:', usersError);
  } else {
    console.log(`\nTotal auth users: ${users?.length || 0}`);
    if (users && users.length > 0) {
      users.forEach((user, i) => {
        console.log(`${i + 1}. User ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
        console.log('');
      });
    }
  }
}

checkRunUsers().catch(console.error);
