import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testMarkComplete() {
  // Get the most recent run
  const { data: runs, error: fetchError } = await supabase
    .from("runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error("Error fetching run:", fetchError);
    return;
  }

  if (!runs || runs.length === 0) {
    console.log("No runs found");
    return;
  }

  const run = runs[0];
  console.log("\nCurrent run:", {
    id: run.id,
    status: run.status,
    progress: run.progress,
    completed_at: run.completed_at,
  });

  // Try to update it
  console.log("\nAttempting to mark as complete...");
  const { data: updateData, error: updateError } = await supabase
    .from("runs")
    .update({
      status: "completed",
      progress: 100,
      completed_at: new Date().toISOString(),
    })
    .eq("id", run.id)
    .select();

  if (updateError) {
    console.error("Update error:", updateError);
  } else {
    console.log("Update successful:", updateData);
  }
}

testMarkComplete();
