import { createClient } from '@supabase/supabase-js';

async function countLeads() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔍 Counting leads in database...\n');

  // Get total count
  const { count: totalCount, error: countError } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting leads:', countError);
    process.exit(1);
  }

  console.log(`📊 Total leads in database: ${totalCount}`);

  // Get count by status
  const { data: statusData } = await supabase
    .from('leads')
    .select('lead_status');

  if (statusData) {
    const statusCounts: Record<string, number> = {};
    statusData.forEach((lead: any) => {
      statusCounts[lead.lead_status] = (statusCounts[lead.lead_status] || 0) + 1;
    });

    console.log('\n📈 Breakdown by status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });
  }

  // Get count by grade
  const { data: gradeData } = await supabase
    .from('leads')
    .select('compatibility_grade');

  if (gradeData) {
    const gradeCounts: Record<string, number> = {};
    gradeData.forEach((lead: any) => {
      const grade = lead.compatibility_grade || 'ungraded';
      gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
    });

    console.log('\n📊 Breakdown by grade:');
    Object.entries(gradeCounts).forEach(([grade, count]) => {
      console.log(`  - ${grade}: ${count}`);
    });
  }
}

countLeads();
