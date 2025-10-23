import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyConstraint() {
  console.log('Applying unique constraint to email_send_history table...\n');

  const sql = `
    ALTER TABLE email_send_history
    ADD CONSTRAINT email_send_history_sendgrid_msg_id_key
    UNIQUE (sendgrid_msg_id);

    CREATE INDEX IF NOT EXISTS idx_email_send_history_sendgrid_msg_id
    ON email_send_history(sendgrid_msg_id);
  `;

  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } else {
    console.log('✅ Migration applied successfully');
    console.log('   - Added unique constraint on sendgrid_msg_id');
    console.log('   - Created index for faster lookups\n');
  }
}

applyConstraint();
