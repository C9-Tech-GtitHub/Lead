import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRuns() {
  console.log("Checking runs in Supabase...\n");

  // Get all runs
  const { data: runs, error } = await supabase
    .from("runs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching runs:", error);
    return;
  }

  console.log(`Total runs: ${runs?.length || 0}\n`);

  if (runs && runs.length > 0) {
    console.log("Latest 10 runs:");
    console.log("================");
    runs.slice(0, 10).forEach((run, i) => {
      console.log(`${i + 1}. ID: ${run.id}`);
      console.log(`   Status: ${run.status}`);
      console.log(`   Created: ${run.created_at}`);
      console.log(`   Location: ${run.location || "N/A"}`);
      console.log(`   Query: ${run.query || "N/A"}`);
      console.log(`   Total Leads: ${run.total_leads || 0}`);
      console.log(`   Researched: ${run.researched_leads || 0}`);
      console.log("   ---");
    });
  } else {
    console.log("No runs found in database.");
  }

  // Check leads count
  const { count: leadsCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true });

  console.log(`\nTotal leads in database: ${leadsCount || 0}`);
}

checkRuns().catch(console.error);
