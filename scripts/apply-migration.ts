import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function applyMigration() {
  console.log("Reading SQL migration file...");
  const sql = fs.readFileSync(
    "supabase/migrations/update_lead_email_statuses_function.sql",
    "utf8",
  );

  console.log("Applying migration...");
  const { error } = await supabase.rpc("exec_sql", { sql });

  if (error) {
    console.error("Error applying migration:", error);
    return;
  }

  console.log("✅ Migration applied successfully!");

  // Now run the function to update all lead statuses
  console.log("\nUpdating lead email statuses...");
  const { error: updateError } = await supabase.rpc(
    "update_lead_email_statuses",
  );

  if (updateError) {
    console.error("Error updating statuses:", updateError);
    return;
  }

  console.log("✅ Lead statuses updated!");

  // Show the final distribution
  const { data: statusData } = await supabase
    .from("leads")
    .select("email_status");
  const statusCounts: Record<string, number> = {};
  statusData?.forEach((lead) => {
    statusCounts[lead.email_status] =
      (statusCounts[lead.email_status] || 0) + 1;
  });
  console.log("\n📊 Email status distribution:", statusCounts);
}

applyMigration();
