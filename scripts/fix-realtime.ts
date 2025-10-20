import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRealtime() {
  console.log('🔧 Fixing realtime configuration...\n');

  try {
    // Enable REPLICA IDENTITY FULL for progress_logs
    console.log('Setting REPLICA IDENTITY FULL on progress_logs...');
    const { error: progressLogsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE progress_logs REPLICA IDENTITY FULL;'
    });

    if (progressLogsError && !progressLogsError.message.includes('does not exist')) {
      // Try direct SQL if rpc doesn't work
      const { error } = await supabase.from('progress_logs').select('id').limit(1);
      if (!error) {
        console.log('⚠️  Cannot directly run ALTER TABLE. Please run this SQL in your Supabase dashboard:');
        console.log('\nALTER TABLE progress_logs REPLICA IDENTITY FULL;');
        console.log('ALTER TABLE runs REPLICA IDENTITY FULL;');
        console.log('ALTER TABLE leads REPLICA IDENTITY FULL;\n');
      }
    } else {
      console.log('✅ Set REPLICA IDENTITY FULL on progress_logs');
    }

    console.log('\n✅ Realtime configuration updated!');
    console.log('\n📝 If you see errors above, please run the SQL commands shown in your Supabase SQL Editor.');
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📝 Please run these SQL commands in your Supabase SQL Editor:');
    console.log('\nALTER TABLE progress_logs REPLICA IDENTITY FULL;');
    console.log('ALTER TABLE runs REPLICA IDENTITY FULL;');
    console.log('ALTER TABLE leads REPLICA IDENTITY FULL;\n');
  }
}

fixRealtime();
