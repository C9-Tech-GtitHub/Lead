import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log("Running Tomba.io integration migration...");

  const sql = `
    -- Add provider column to lead_emails table
    ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS provider TEXT CHECK (provider IN ('hunter', 'tomba')) DEFAULT 'hunter';

    -- Add provider-specific metadata columns to leads table
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS tomba_searched_at TIMESTAMPTZ;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS tomba_organization TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS tomba_email_pattern TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS tomba_total_emails INTEGER;

    -- Add index for provider filtering
    CREATE INDEX IF NOT EXISTS idx_lead_emails_provider ON lead_emails(provider);
  `;

  const { error } = await supabase.rpc("exec_sql", { sql });

  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } else {
    console.log("Migration completed successfully!");
    console.log("\nChanges applied:");
    console.log("  ✓ Added provider column to lead_emails table");
    console.log("  ✓ Added tomba_searched_at column to leads table");
    console.log("  ✓ Added tomba_organization column to leads table");
    console.log("  ✓ Added tomba_email_pattern column to leads table");
    console.log("  ✓ Added tomba_total_emails column to leads table");
    console.log("  ✓ Created index on lead_emails.provider");
    console.log("\nTomba.io integration is ready to use!");
  }
}

runMigration();
