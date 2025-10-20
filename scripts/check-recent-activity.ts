import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentActivity() {
  console.log('🔍 Checking recent activity...\n');

  // Get the latest run
  const { data: runs } = await supabase
    .from('runs')
    .select('id, status, progress')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log('❌ No runs found');
    return;
  }

  const runId = runs[0].id;
  console.log(`📊 Latest Run: ${runId}`);
  console.log(`   Status: ${runs[0].status}`);
  console.log(`   Progress: ${runs[0].progress}%\n`);

  // Check progress logs from the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: recentLogs } = await supabase
    .from('progress_logs')
    .select('event_type, message, created_at')
    .eq('run_id', runId)
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!recentLogs || recentLogs.length === 0) {
    console.log('⚠️  NO RECENT ACTIVITY in the last 5 minutes!\n');
    console.log('This means:');
    console.log('   ❌ Inngest events are NOT being processed');
    console.log('   ❌ Research is NOT running\n');
    console.log('🔧 Possible issues:');
    console.log('   1. Inngest dev server is not running');
    console.log('   2. Inngest dev server crashed');
    console.log('   3. Events were sent but Inngest cannot reach your app\n');
    console.log('✅ To fix:');
    console.log('   1. Run: npx inngest-cli@latest dev');
    console.log('   2. Make sure your Next.js app is running on http://localhost:3000');
    console.log('   3. Check browser console for errors when clicking "Research All"\n');
  } else {
    console.log('✅ Recent Activity (last 5 minutes):\n');
    recentLogs.forEach((log, i) => {
      const timeAgo = Math.round((Date.now() - new Date(log.created_at).getTime()) / 1000);
      console.log(`${i + 1}. [${timeAgo}s ago] ${log.event_type}: ${log.message}`);
    });
    console.log('\n🎉 Research IS running!');
  }

  // Check if any leads changed status recently
  const { data: recentLeads } = await supabase
    .from('leads')
    .select('name, research_status, researched_at')
    .eq('run_id', runId)
    .neq('research_status', 'pending')
    .order('researched_at', { ascending: false })
    .limit(5);

  if (recentLeads && recentLeads.length > 0) {
    console.log(`\n📋 Recently processed leads (${recentLeads.length}):`);
    recentLeads.forEach((lead, i) => {
      const timeAgo = lead.researched_at
        ? Math.round((Date.now() - new Date(lead.researched_at).getTime()) / 1000 / 60)
        : '?';
      console.log(`   ${i + 1}. ${lead.name} - ${lead.research_status} (${timeAgo}m ago)`);
    });
  }
}

checkRecentActivity();
