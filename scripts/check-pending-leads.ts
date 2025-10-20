import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function checkPendingLeads() {
  // Get the Magic the Gathering run
  const { data: runs } = await supabase
    .from("runs")
    .select("*")
    .eq("business_type", "Magic the Gathering")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log("No Magic the Gathering runs found");
    return;
  }

  const run = runs[0];

  // Get pending leads (not franchises)
  const { data: pendingLeads } = await supabase
    .from("leads")
    .select(
      "id, name, address, website, research_status, prescreened, prescreen_result",
    )
    .eq("run_id", run.id)
    .eq("research_status", "pending")
    .order("name", { ascending: true });

  console.log(
    `=== PENDING INDEPENDENT MTG STORES (${pendingLeads?.length || 0}) ===\n`,
  );

  if (pendingLeads && pendingLeads.length > 0) {
    console.log("These are independent stores ready for research:\n");

    pendingLeads.slice(0, 20).forEach((lead, idx) => {
      console.log(`${idx + 1}. ${lead.name}`);
      console.log(`   Website: ${lead.website || "No website found"}`);
      console.log(`   Prescreened: ${lead.prescreened ? "Yes" : "No"}`);
      if (lead.prescreen_result) {
        console.log(`   Prescreen Result: ${lead.prescreen_result}`);
      }
      console.log("");
    });

    if (pendingLeads.length > 20) {
      console.log(`... and ${pendingLeads.length - 20} more\n`);
    }

    console.log(
      `\n✅ These ${pendingLeads.length} leads are ready for lightweight research!`,
    );
    console.log(
      'You can click "Research All" in your dashboard to start researching them.',
    );
  } else {
    console.log("No pending leads found. All have been researched or skipped.");
  }
}

checkPendingLeads().catch(console.error);
