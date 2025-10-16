/**
 * Apply the prescreen fields migration to the database
 * Adds columns for tracking AI prescreen results
 */

import { createClient } from '@supabase/supabase-js';

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔄 Applying prescreen fields migration...\n');

  // Step 1: Add new columns
  console.log('Step 1: Adding new columns to leads table...');

  const alterTableSQL = `
    ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS prescreened BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS prescreen_result TEXT,
    ADD COLUMN IF NOT EXISTS prescreen_reason TEXT,
    ADD COLUMN IF NOT EXISTS is_franchise BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_national_brand BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS prescreen_confidence TEXT,
    ADD COLUMN IF NOT EXISTS prescreened_at TIMESTAMPTZ;
  `;

  const { error: alterError } = await supabase.rpc('exec', { sql: alterTableSQL });

  if (alterError && !alterError.message.includes('already exists')) {
    console.error('❌ Error adding columns:', alterError);
  } else {
    console.log('✅ Columns added successfully');
  }

  // Step 2: Add constraint
  console.log('\nStep 2: Adding constraint for prescreen_confidence...');

  const constraintSQL = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'leads_prescreen_confidence_check'
      ) THEN
        ALTER TABLE leads
        ADD CONSTRAINT leads_prescreen_confidence_check
        CHECK (prescreen_confidence IN ('high', 'medium', 'low'));
      END IF;
    END $$;
  `;

  const { error: constraintError } = await supabase.rpc('exec', { sql: constraintSQL });

  if (constraintError) {
    console.error('❌ Error adding constraint:', constraintError);
  } else {
    console.log('✅ Constraint added successfully');
  }

  // Step 3: Add indexes
  console.log('\nStep 3: Creating indexes...');

  const indexSQL = `
    CREATE INDEX IF NOT EXISTS idx_leads_prescreened ON leads(prescreened);
    CREATE INDEX IF NOT EXISTS idx_leads_prescreen_result ON leads(prescreen_result);
  `;

  const { error: indexError } = await supabase.rpc('exec', { sql: indexSQL });

  if (indexError) {
    console.error('❌ Error creating indexes:', indexError);
  } else {
    console.log('✅ Indexes created successfully');
  }

  // Step 4: Update research_status constraint
  console.log('\nStep 4: Updating research_status constraint...');

  const updateConstraintSQL = `
    DO $$
    BEGIN
      ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_research_status_check;
      ALTER TABLE leads ADD CONSTRAINT leads_research_status_check
        CHECK (research_status IN ('pending', 'prescreening', 'skipped', 'scraping', 'analyzing', 'completed', 'failed'));
    END $$;
  `;

  const { error: updateConstraintError } = await supabase.rpc('exec', { sql: updateConstraintSQL });

  if (updateConstraintError) {
    console.error('❌ Error updating constraint:', updateConstraintError);
  } else {
    console.log('✅ Research status constraint updated successfully');
  }

  console.log('\n✅ Migration completed successfully!');
  console.log('\nNew fields added to leads table:');
  console.log('  • prescreened (boolean)');
  console.log('  • prescreen_result (text)');
  console.log('  • prescreen_reason (text)');
  console.log('  • is_franchise (boolean)');
  console.log('  • is_national_brand (boolean)');
  console.log('  • prescreen_confidence (text)');
  console.log('  • prescreened_at (timestamptz)');
}

applyMigration().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
