/**
 * Apply Lead Status Migration
 * Adds lead_status field and auto-marks F-grade leads as not_eligible
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing required environment variables:");
    console.error("- NEXT_PUBLIC_SUPABASE_URL");
    console.error("- SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log("🔄 Reading migration file...");
  const migrationPath = path.join(
    process.cwd(),
    "supabase/migrations/add_lead_status.sql",
  );
  const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

  console.log("🚀 Applying lead status migration...");

  try {
    const { error } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    });

    if (error) {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    }

    console.log("✅ Migration applied successfully!");
    console.log("\n📊 Checking results...");

    // Check if F-grade leads were marked as not_eligible
    const { data: fGradeLeads, error: queryError } = await supabase
      .from("leads")
      .select("id, name, compatibility_grade, lead_status")
      .eq("compatibility_grade", "F")
      .limit(5);

    if (queryError) {
      console.error("❌ Error querying leads:", queryError);
    } else {
      console.log(`\nF-grade leads (showing up to 5):`);
      fGradeLeads?.forEach((lead) => {
        console.log(
          `  - ${lead.name}: Grade ${lead.compatibility_grade}, Status: ${lead.lead_status}`,
        );
      });
    }

    // Show lead status counts
    const { data: statusCounts, error: countError } = await supabase
      .from("leads")
      .select("lead_status");

    if (!countError && statusCounts) {
      const counts: Record<string, number> = {};
      statusCounts.forEach((lead: any) => {
        counts[lead.lead_status] = (counts[lead.lead_status] || 0) + 1;
      });

      console.log("\n📈 Lead Status Summary:");
      Object.entries(counts).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count}`);
      });
    }

    console.log("\n✅ All done! Lead status system is ready.");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

applyMigration();
