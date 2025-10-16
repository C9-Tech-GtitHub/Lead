/**
 * Apply the prescreen fields migration to the database
 * Uses direct SQL execution via fetch API
 */

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
    process.exit(1);
  }

  console.log('🔄 Applying prescreen fields migration...\n');

  const statements = [
    {
      name: 'Add new columns to leads table',
      sql: `
        ALTER TABLE leads
        ADD COLUMN IF NOT EXISTS prescreened BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS prescreen_result TEXT,
        ADD COLUMN IF NOT EXISTS prescreen_reason TEXT,
        ADD COLUMN IF NOT EXISTS is_franchise BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_national_brand BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS prescreen_confidence TEXT,
        ADD COLUMN IF NOT EXISTS prescreened_at TIMESTAMPTZ;
      `
    },
    {
      name: 'Add constraint for prescreen_confidence',
      sql: `
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
      `
    },
    {
      name: 'Create indexes',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_leads_prescreened ON leads(prescreened);
      `
    },
    {
      name: 'Create prescreen_result index',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_leads_prescreen_result ON leads(prescreen_result);
      `
    },
    {
      name: 'Update research_status constraint',
      sql: `
        DO $$
        BEGIN
          ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_research_status_check;
          ALTER TABLE leads ADD CONSTRAINT leads_research_status_check
            CHECK (research_status IN ('pending', 'prescreening', 'skipped', 'scraping', 'analyzing', 'completed', 'failed'));
        END $$;
      `
    }
  ];

  for (const statement of statements) {
    console.log(`Executing: ${statement.name}...`);

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: statement.sql })
      });

      if (!response.ok) {
        const error = await response.text();
        console.log(`   ⚠️  Warning: ${error.substring(0, 100)}`);
      } else {
        console.log('   ✅ Success');
      }
    } catch (error) {
      console.log(`   ⚠️  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('\n📋 Manual Migration Option:');
  console.log('If the automated migration failed, please run this SQL in your Supabase SQL Editor:');
  console.log('\n' + '='.repeat(80));
  console.log(`
-- Add prescreen fields to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS prescreened BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS prescreen_result TEXT,
ADD COLUMN IF NOT EXISTS prescreen_reason TEXT,
ADD COLUMN IF NOT EXISTS is_franchise BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_national_brand BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS prescreen_confidence TEXT CHECK (prescreen_confidence IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS prescreened_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_prescreened ON leads(prescreened);
CREATE INDEX IF NOT EXISTS idx_leads_prescreen_result ON leads(prescreen_result);

-- Update research_status constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_research_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_research_status_check
  CHECK (research_status IN ('pending', 'prescreening', 'skipped', 'scraping', 'analyzing', 'completed', 'failed'));
  `);
  console.log('='.repeat(80));

  console.log('\n✅ Migration script completed!');
  console.log('\nTo verify, check if these columns exist in your leads table:');
  console.log('  • prescreened');
  console.log('  • prescreen_result');
  console.log('  • prescreen_reason');
  console.log('  • is_franchise');
  console.log('  • is_national_brand');
  console.log('  • prescreen_confidence');
  console.log('  • prescreened_at');
}

applyMigration().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
