import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function fixStuckPrescreen() {
  // Get the stuck run
  const { data: runs } = await supabase
    .from("runs")
    .select("*")
    .eq("status", "prescreening")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!runs || runs.length === 0) {
    console.log("No stuck runs found in prescreening status");
    return;
  }

  const run = runs[0];
  console.log(`Found stuck run: ${run.business_type} in ${run.location}`);
  console.log(`Run ID: ${run.id}`);
  console.log(`Total leads: ${run.total_leads}\n`);

  // Check if leads have been prescreened
  const { data: leads } = await supabase
    .from("leads")
    .select("id, prescreened")
    .eq("run_id", run.id);

  const prescreenedCount = leads?.filter((l) => l.prescreened).length || 0;
  console.log(
    `Prescreened leads: ${prescreenedCount} / ${leads?.length || 0}\n`,
  );

  if (prescreenedCount === 0) {
    console.log(
      "No leads have been prescreened. Triggering manual prescreen...\n",
    );

    // Trigger the manual prescreen via API
    const response = await fetch(
      "http://localhost:3000/api/inngest/trigger-prescreen",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: run.id,
        }),
      },
    );

    if (response.ok) {
      console.log("✅ Successfully triggered prescreening!");
      console.log(
        "Check the Inngest dev server at http://localhost:8288 for progress",
      );
    } else {
      const error = await response.text();
      console.error("❌ Failed to trigger prescreening:", error);
    }
  } else if (prescreenedCount === leads?.length) {
    console.log(
      'All leads have been prescreened. Updating run status to "ready"...\n',
    );

    // Update status to ready
    await supabase.from("runs").update({ status: "ready" }).eq("id", run.id);

    console.log('✅ Run status updated to "ready"');
  } else {
    console.log(
      `⚠️  Partial prescreening: ${prescreenedCount} / ${leads?.length} leads completed`,
    );
    console.log("The prescreening may still be in progress.");
  }
}

fixStuckPrescreen().catch(console.error);
