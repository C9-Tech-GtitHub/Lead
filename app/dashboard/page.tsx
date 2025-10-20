import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { CreateRunButton } from "@/components/dashboard/create-run-button";
import { RunsList } from "@/components/dashboard/runs-list";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch all runs (shared across all users)
  const { data: runs } = await supabase
    .from("runs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Lead Research Runs
            </h1>
            <CreateRunButton />
          </div>

          <RunsList initialRuns={runs || []} />
        </div>
      </main>
    </div>
  );
}
