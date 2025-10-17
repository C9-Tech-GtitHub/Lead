#!/usr/bin/env tsx

/**
 * Apply Multi-Query Support Migration
 *
 * This script applies the multi-query support migration to the database.
 * Run with: npx tsx scripts/apply-multi-query-migration.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log("📦 Multi-Query Support Migration");
  console.log("================================\n");

  try {
    // Read the migration file
    const migrationPath = path.join(
      process.cwd(),
      "supabase/migrations/add_multi_query_support.sql"
    );

    console.log("📄 Reading migration file:", migrationPath);
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`\n🔧 Applying ${statements.length} migration statements...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing:`, statement.substring(0, 60) + "...");

      const { error } = await supabase.rpc("exec_sql", {
        sql_query: statement + ";",
      });

      if (error) {
        // Try direct execution as fallback
        const { error: directError } = await supabase
          .from("_sql")
          .select("*")
          .sql(statement + ";");

        if (directError) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          console.error("Statement:", statement);
          throw error;
        }
      }

      console.log(`   ✓ Success`);
    }

    console.log("\n✅ Migration applied successfully!");
    console.log("\n📊 Verifying migration...");

    // Verify the migration by checking if columns exist
    const { data: columns, error: verifyError } = await supabase
      .from("runs")
      .select("business_types, queries_count")
      .limit(1);

    if (verifyError) {
      console.error("❌ Verification failed:", verifyError.message);
      console.log("\n⚠️  You may need to apply the migration manually via Supabase SQL Editor");
      console.log("Migration file:", migrationPath);
    } else {
      console.log("✓ Columns verified: business_types, queries_count");
    }

    console.log("\n🎉 Migration complete!");
    console.log("\nYou can now use multi-query search:");
    console.log('   Example: "Artificial Grass, Fake Turf, Synthetic Lawn"');

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    console.log("\n⚠️  Please apply the migration manually:");
    console.log("1. Open Supabase SQL Editor");
    console.log("2. Copy the contents of: supabase/migrations/add_multi_query_support.sql");
    console.log("3. Execute the SQL");
    process.exit(1);
  }
}

applyMigration();
