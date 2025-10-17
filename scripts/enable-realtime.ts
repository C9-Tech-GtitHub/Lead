async function enableRealtime() {
  console.log('Checking Supabase Realtime configuration...\n');

  console.log('✅ Step 1: Code is already configured');
  console.log('   - Realtime subscription is set up in runs-list.tsx');
  console.log('   - Polling fallback added (every 3 seconds)');

  console.log('\n📋 Step 2: Please verify Realtime is enabled in Supabase Dashboard:');
  console.log('   URL: https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/database/publications');
  console.log('\n   Ensure the "runs" table is checked under "supabase_realtime" publication');

  console.log('\n💡 Step 3: If Realtime is not working, run this SQL in SQL Editor:');
  console.log('   URL: https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql/new\n');

  const sql = `
-- Enable realtime for runs and leads tables
ALTER PUBLICATION supabase_realtime ADD TABLE runs;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- Verify it's enabled
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
`;

  console.log(sql);

  console.log('\n✨ What to expect after enabling:');
  console.log('   - Progress bars update automatically as research progresses');
  console.log('   - Status badges change in real-time');
  console.log('   - Grade counts update as leads are analyzed');
  console.log('   - Polling fallback ensures updates every 3 seconds even if realtime fails');
}

enableRealtime();
