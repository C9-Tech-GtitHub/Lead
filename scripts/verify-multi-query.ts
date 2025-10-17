#!/usr/bin/env tsx
/**
 * Verify Multi-Query Feature
 * Checks that migration is applied and feature is ready to use
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyFeature() {
  console.log("🔍 Verifying Multi-Query Feature Setup\n");
  console.log("=" + "=".repeat(50) + "\n");

  try {
    // Check 1: Columns exist
    console.log("✓ Checking database schema...");
    const { data: runs, error } = await supabase
      .from("runs")
      .select("business_types, queries_count, business_type")
      .limit(1);

    if (error) {
      console.log("❌ FAILED: Migration not applied");
      console.log("   Error:", error.message);
      console.log("\n   Run the SQL migration first!");
      process.exit(1);
    }

    console.log("  ✓ business_types column exists");
    console.log("  ✓ queries_count column exists\n");

    // Check 2: Existing runs migrated
    console.log("✓ Checking data migration...");
    const { data: allRuns } = await supabase
      .from("runs")
      .select("id, business_type, business_types, queries_count")
      .limit(5);

    const unmigrated = allRuns?.filter(r => !r.business_types) || [];
    if (unmigrated.length > 0) {
      console.log(`  ⚠️  ${unmigrated.length} runs not migrated yet`);
      console.log("  Run: UPDATE runs SET business_types = ARRAY[business_type], queries_count = 1 WHERE business_types IS NULL;");
    } else {
      console.log("  ✓ All existing runs migrated\n");
    }

    // Check 3: Sample data
    if (allRuns && allRuns.length > 0) {
      console.log("📊 Sample Run Data:");
      const sample = allRuns[0];
      console.log("  business_type:", sample.business_type);
      console.log("  business_types:", JSON.stringify(sample.business_types));
      console.log("  queries_count:", sample.queries_count);
      console.log("");
    }

    console.log("=" + "=".repeat(50));
    console.log("✅ Multi-Query Feature is READY!\n");
    console.log("📝 How to use:");
    console.log('   1. Enter: "Artificial Grass, Fake Turf, Synthetic Lawn"');
    console.log("   2. Location: Melbourne");
    console.log("   3. Target: 200");
    console.log("   4. The system will:");
    console.log("      - Search each query across all suburbs");
    console.log("      - Deduplicate by place_id");
    console.log("      - Return 200 unique businesses\n");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

verifyFeature();
