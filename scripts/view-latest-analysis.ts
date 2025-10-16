import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: leads } = await supabase
    .from('leads')
    .select('name, website, ai_report, compatibility_grade, grade_reasoning, suggested_hooks, pain_points, opportunities, research_status')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('=== Latest Leads ===');
  console.log(JSON.stringify(leads, null, 2));
}

main();
