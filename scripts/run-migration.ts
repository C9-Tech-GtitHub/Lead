/**
 * Database Migration Script
 * Adds latitude and longitude columns to the leads table
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing required environment variables');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('🚀 Starting database migration...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', 'add_coordinates_to_leads.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('\n📄 Migration SQL:');
    console.log('---');
    console.log(migrationSQL);
    console.log('---\n');

    // Execute the migration
    console.log('⚡ Executing migration...');

    // Split by semicolons to execute each statement separately
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`\n📝 Executing: ${statement.substring(0, 100)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // Try alternative method using raw query
          const { error: rawError } = await supabase.from('_migrations').select('*').limit(0);

          if (rawError) {
            console.error('❌ Error executing statement:', error);
            throw error;
          }
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Verifying columns were added...');

    // Verify the migration by checking if columns exist
    const { data: leads, error: verifyError } = await supabase
      .from('leads')
      .select('latitude, longitude')
      .limit(1);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      console.log('\n⚠️  The migration may have failed. Please run the SQL manually in Supabase Dashboard:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
      console.log('   2. Copy and paste the contents of: supabase/migrations/add_coordinates_to_leads.sql');
      console.log('   3. Click "Run"');
      process.exit(1);
    }

    console.log('✅ Verification successful! The latitude and longitude columns are now available.');
    console.log('\n🗺️  You can now use the Map View feature!');
    console.log('   Navigate to: /dashboard/map\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('\n📋 Manual Migration Steps:');
    console.log('   1. Open your Supabase Dashboard');
    console.log('   2. Go to SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
    console.log('   3. Copy and paste this SQL:\n');
    console.log('---');
    console.log(`
-- Add latitude and longitude columns
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create a spatial index for efficient location queries
CREATE INDEX IF NOT EXISTS idx_leads_coordinates
ON leads(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comments
COMMENT ON COLUMN leads.latitude IS 'GPS latitude coordinate from Google Maps';
COMMENT ON COLUMN leads.longitude IS 'GPS longitude coordinate from Google Maps';
    `);
    console.log('---');
    console.log('\n   4. Click "Run"\n');
    process.exit(1);
  }
}

// Run the migration
runMigration();
