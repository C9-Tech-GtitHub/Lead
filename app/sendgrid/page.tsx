import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { SendGridDashboard } from "@/components/sendgrid/sendgrid-dashboard";

export default async function SendGridPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is not authenticated, redirect to login
  if (!user) {
    redirect("/auth/login");
  }

  // Get suppression counts
  const { count: totalSuppressions } = await supabase
    .from("email_suppression")
    .select("*", { count: "exact", head: true });

  const { count: bounces } = await supabase
    .from("email_suppression")
    .select("*", { count: "exact", head: true })
    .eq("source", "bounce");

  const { count: unsubscribes } = await supabase
    .from("email_suppression")
    .select("*", { count: "exact", head: true })
    .in("source", ["unsubscribe", "asm_group"]);

  const { count: invalid } = await supabase
    .from("email_suppression")
    .select("*", { count: "exact", head: true })
    .eq("source", "invalid");

  // Get contact tracking stats
  const { count: contactedDomains } = await supabase
    .from("domain_contact_tracking")
    .select("*", { count: "exact", head: true });

  // Get recent sync logs
  const { data: recentSyncs } = await supabase
    .from("sendgrid_sync_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              SendGrid Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Explore email suppressions, contact history, and sync status
            </p>
          </div>

          <SendGridDashboard
            stats={{
              totalSuppressions: totalSuppressions || 0,
              bounces: bounces || 0,
              unsubscribes: unsubscribes || 0,
              invalid: invalid || 0,
              contactedDomains: contactedDomains || 0,
            }}
            recentSyncs={recentSyncs || []}
          />
        </div>
      </main>
    </div>
  );
}
