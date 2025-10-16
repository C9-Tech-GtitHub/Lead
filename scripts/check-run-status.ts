import { createClient } from '@supabase/supabase-js';

async function checkRunStatus() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: runs } = await supabase
    .from('runs')
    .select('id, business_type, location, status, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('Recent runs:');
  console.log(JSON.stringify(runs, null, 2));
}

checkRunStatus();
