import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function updateLeadEmailStatuses() {
  console.log("Starting to update lead email statuses using SQL...");

  // Use a direct SQL query to update all leads at once based on suppressions
  // This is much faster than individual updates

  const { data, error } = await supabase.rpc("update_lead_email_statuses");

  if (error) {
    console.error("Error updating statuses:", error);
    return;
  }

  console.log("Update complete!");

  // Show final distribution
  const { data: statusData } = await supabase
    .from("leads")
    .select("email_status");
  const statusCounts: Record<string, number> = {};
  statusData?.forEach((lead) => {
    statusCounts[lead.email_status] =
      (statusCounts[lead.email_status] || 0) + 1;
  });
  console.log("\nEmail status distribution:", statusCounts);
}

updateLeadEmailStatuses();
