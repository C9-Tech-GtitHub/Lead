import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

async function applyMigration() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Reading migration file...');
  const sql = readFileSync('supabase/migrations/add_ai_provider_to_check_constraint.sql', 'utf8');

  // Execute the migration statements
  const statements = [
    "ALTER TABLE lead_emails DROP CONSTRAINT IF EXISTS lead_emails_provider_check",
    "ALTER TABLE lead_emails ADD CONSTRAINT lead_emails_provider_check CHECK (provider IN ('hunter', 'tomba', 'ai'))"
  ];

  for (const statement of statements) {
    console.log('Executing:', statement.substring(0, 80) + '...');

    const { error } = await supabase.rpc('exec_sql', { sql: statement });

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('✓ Success');
    }
  }

  console.log('\nMigration complete!');
}

applyMigration().catch(console.error);
