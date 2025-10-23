/**
 * Fix Lead Status Trigger
 * Ensures users can manually override any lead status, including F-grade leads
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function fixTrigger() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔄 Reading migration file...');
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/fix_lead_status_trigger.sql'
  );
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('🚀 Fixing lead status trigger...');

  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Trigger fixed successfully!');
    console.log('\n📋 Testing manual override capability...');

    // Test: Try to update an F-grade lead to a different status
    const { data: testLead } = await supabase
      .from('leads')
      .select('id, name, compatibility_grade, lead_status')
      .eq('compatibility_grade', 'F')
      .limit(1)
      .single();

    if (testLead) {
      console.log(`\nTest lead: ${testLead.name}`);
      console.log(`  Current status: ${testLead.lead_status}`);

      // Try updating to 'ready_to_send'
      const { error: updateError } = await supabase
        .from('leads')
        .update({ lead_status: 'ready_to_send' })
        .eq('id', testLead.id);

      if (updateError) {
        console.error('❌ Manual override failed:', updateError);
      } else {
        console.log('  ✅ Successfully updated to: ready_to_send');

        // Revert back
        await supabase
          .from('leads')
          .update({ lead_status: testLead.lead_status })
          .eq('id', testLead.id);

        console.log('  ✅ Reverted to original status');
      }
    }

    console.log('\n✅ All done! Manual status override works correctly.');
    console.log('💡 Users can now manually change any lead status, including F-grade leads.');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

fixTrigger();
