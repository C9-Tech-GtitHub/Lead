import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function testClearResearch() {
  // Get the latest run
  const { data: runs } = await supabase
    .from("runs")
    .select("id, business_type, total_leads")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log("No runs found");
    return;
  }

  const run = runs[0];
  console.log(`Testing clear research for: ${run.business_type}`);
  console.log(`Run ID: ${run.id}`);
  console.log(`Total Leads: ${run.total_leads}\n`);

  // Check what fields exist in the leads table
  const { data: sampleLead } = await supabase
    .from("leads")
    .select("*")
    .eq("run_id", run.id)
    .limit(1)
    .single();

  console.log("Sample lead fields:");
  console.log(Object.keys(sampleLead || {}).join(", "));
  console.log("");

  // Try the update
  console.log("Attempting to clear research data...\n");

  const { data, error } = await supabase
    .from("leads")
    .update({
      research_status: "pending",
      compatibility_grade: null,
      grade_reasoning: null,
      ai_report: null,
      suggested_hooks: null,
      pain_points: null,
      opportunities: null,
      team_size: null,
      error_message: null,
      researched_at: null,
    })
    .eq("run_id", run.id)
    .neq("research_status", "skipped")
    .select();

  if (error) {
    console.error("❌ Error:", error);
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("Details:", error.details);
  } else {
    console.log(`✅ Successfully cleared ${data?.length || 0} leads`);

    // Now update the run
    console.log("\nResetting run grade counts and status...");

    const { error: runError } = await supabase
      .from("runs")
      .update({
        status: "ready",
        progress: 33,
        grade_a_count: 0,
        grade_b_count: 0,
        grade_c_count: 0,
        grade_d_count: 0,
        grade_f_count: 0,
        completed_at: null,
      })
      .eq("id", run.id);

    if (runError) {
      console.error("❌ Error updating run:", runError);
    } else {
      console.log("✅ Run reset successfully!");

      // Verify the update
      const { data: updatedRun } = await supabase
        .from("runs")
        .select(
          "status, progress, grade_a_count, grade_b_count, grade_c_count, grade_d_count, grade_f_count",
        )
        .eq("id", run.id)
        .single();

      console.log("\nUpdated run status:");
      console.log(updatedRun);
    }
  }
}

testClearResearch().catch(console.error);
