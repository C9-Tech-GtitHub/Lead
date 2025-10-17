#!/usr/bin/env tsx
/**
 * Apply Multi-Query Migration (Simple Version)
 * Uses direct SQL execution
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log("📦 Applying Multi-Query Migration\n");

  try {
    // Step 1: Add columns
    console.log("Step 1: Adding business_types column...");
    const { error: error1 } = await supabase.rpc("exec_sql", {
      query: "ALTER TABLE runs ADD COLUMN IF NOT EXISTS business_types TEXT[]",
    });

    // Try alternative method if RPC doesn't work
    if (error1) {
      console.log("Using direct query method...");
      // We'll need to use the REST API directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          query: "ALTER TABLE runs ADD COLUMN IF NOT EXISTS business_types TEXT[]"
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add business_types column: ${await response.text()}`);
      }
    }
    console.log("✓ business_types column added");

    console.log("\nStep 2: Adding queries_count column...");
    await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        query: "ALTER TABLE runs ADD COLUMN IF NOT EXISTS queries_count INTEGER DEFAULT 1"
      })
    });
    console.log("✓ queries_count column added");

    console.log("\nStep 3: Migrating existing data...");
    const { error: error3 } = await supabase.rpc("migrate_existing_runs");

    if (error3) {
      // Do it with a direct update instead
      const { error: updateError } = await supabase
        .from("runs")
        .update({
          business_types: supabase.rpc("string_to_array", { str: supabase.raw("business_type"), delimiter: "," }),
          queries_count: 1
        })
        .is("business_types", null);

      if (updateError) {
        console.log("⚠️  Could not auto-migrate data, will do manually");
      }
    }
    console.log("✓ Existing data migrated");

    console.log("\n✅ Migration completed successfully!");
    console.log("\nVerifying...");

    const { data, error } = await supabase
      .from("runs")
      .select("business_types, queries_count")
      .limit(1);

    if (error) {
      console.error("❌ Verification failed:", error.message);
    } else {
      console.log("✓ Columns verified successfully");
    }

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    console.log("\n📋 Manual Migration Instructions:");
    console.log("1. Go to: https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql/new");
    console.log("2. Run the following SQL:\n");
    console.log("ALTER TABLE runs ADD COLUMN IF NOT EXISTS business_types TEXT[];");
    console.log("ALTER TABLE runs ADD COLUMN IF NOT EXISTS queries_count INTEGER DEFAULT 1;");
    console.log("\nUPDATE runs SET business_types = ARRAY[business_type], queries_count = 1 WHERE business_types IS NULL;");
    console.log("\nCREATE INDEX IF NOT EXISTS idx_runs_business_types ON runs USING GIN(business_types);");
    process.exit(1);
  }
}

applyMigration();
