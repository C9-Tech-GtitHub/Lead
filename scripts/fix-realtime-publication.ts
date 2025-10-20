import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRealtimePublication() {
  console.log('🔧 Fixing Supabase Realtime Publication...\n');

  console.log('📝 You need to run this SQL in your Supabase SQL Editor:\n');
  console.log('--- COPY THIS SQL ---\n');

  const sql = `-- Drop and re-add tables to supabase_realtime publication
-- This ensures service role updates are broadcast to clients

-- First, drop if they exist (to avoid errors)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS progress_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS runs;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS leads;

-- Add tables to publication
ALTER PUBLICATION supabase_realtime ADD TABLE progress_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE runs;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- Verify tables are in the publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;`;

  console.log(sql);
  console.log('\n--- END SQL ---\n');

  console.log('📍 Steps:');
  console.log('   1. Go to https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql/new');
  console.log('   2. Paste the SQL above');
  console.log('   3. Click "Run"');
  console.log('   4. You should see a table listing progress_logs, runs, and leads\n');

  console.log('✅ After running this SQL, realtime updates will work!');
}

fixRealtimePublication();
