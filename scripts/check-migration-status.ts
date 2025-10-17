#!/usr/bin/env tsx
/**
 * Check Migration Status
 * Verifies if multi-query migration has been applied
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMigrationStatus() {
  console.log("🔍 Checking migration status...\n");

  try {
    const { data, error } = await supabase
      .from("runs")
      .select("business_types, queries_count, business_type")
      .limit(1);

    if (error) {
      console.log("❌ Migration NOT applied");
      console.log("Error:", error.message);
      console.log("\nRun: npx tsx scripts/apply-multi-query-migration.ts");
      process.exit(1);
    }

    console.log("✅ Migration columns exist!");
    console.log("\nSample data:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkMigrationStatus();
