import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { LeadsDashboard } from "@/components/leads/leads-dashboard";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is not authenticated, redirect to login
  if (!user) {
    redirect("/auth/login");
  }

  // Get total count only (fast query, no data transfer)
  const { count: totalCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true });

  // Get all runs
  const { data: runs } = await supabase
    .from("runs")
    .select("id, business_type, location, created_at")
    .neq("status", "archived") // Exclude archived (merged) runs
    .order("created_at", { ascending: false });

  // For each run, get the count of leads using COUNT query (bypasses row limits)
  const runsWithCounts = await Promise.all(
    (runs || []).map(async (run) => {
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("run_id", run.id);

      return {
        ...run,
        leadCount: count || 0,
      };
    }),
  );

  // Get status counts using individual COUNT queries (bypasses row limits)
  const statusCounts: Record<string, number> = {};
  const statuses = [
    "new",
    "not_eligible",
    "ready_to_send",
    "bulk_sent",
    "manual_followup",
    "do_not_contact",
    "converted",
  ];

  await Promise.all(
    statuses.map(async (status) => {
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("lead_status", status);

      if (count && count > 0) {
        statusCounts[status] = count;
      }
    }),
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Leads Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your leads, update statuses, and export for sales campaigns
            </p>
          </div>

          <LeadsDashboard
            totalCount={totalCount || 0}
            statusCounts={statusCounts}
            runs={runsWithCounts || []}
          />
        </div>
      </main>
    </div>
  );
}
