import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/header';
import { RunDetails } from '@/components/runs/run-details';
import { LeadsList } from '@/components/runs/leads-list';
import Link from 'next/link';

interface RunPageProps {
  params: { id: string };
}

export default async function RunPage({ params }: RunPageProps) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch run details
  const { data: run } = await supabase
    .from('runs')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!run) {
    redirect('/dashboard');
  }

  // Fetch leads for this run
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('run_id', params.id)
    .order('compatibility_grade', { ascending: true })
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>

          <RunDetails run={run} />

          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Leads</h2>
            <LeadsList initialLeads={leads || []} runId={params.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
