import { createClient } from '@supabase/supabase-js';

async function addAiProvider() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Dropping existing constraint...');
  const { error: dropError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE lead_emails DROP CONSTRAINT IF EXISTS lead_emails_provider_check'
  });

  if (dropError) {
    console.error('Error dropping constraint:', dropError);
    return;
  }
  console.log('✓ Constraint dropped');

  console.log('Adding new constraint with ai provider...');
  const { error: addError } = await supabase.rpc('exec_sql', {
    sql: "ALTER TABLE lead_emails ADD CONSTRAINT lead_emails_provider_check CHECK (provider IN ('hunter', 'tomba', 'ai'))"
  });

  if (addError) {
    console.error('Error adding constraint:', addError);
    return;
  }
  console.log('✓ Constraint added with ai provider');
  console.log('\nMigration complete! AI provider is now allowed.');
}

addAiProvider().catch(console.error);
