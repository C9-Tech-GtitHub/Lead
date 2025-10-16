import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/header';
import { LeadsMapWithSidebar } from '@/components/map/leads-map-with-sidebar';

export const dynamic = 'force-dynamic';

export default async function MapPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch all runs for this user
  const { data: runs, error: runsError } = await supabase
    .from('runs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch all leads for this user with full details
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select(`
      id,
      name,
      address,
      phone,
      website,
      google_maps_url,
      latitude,
      longitude,
      compatibility_grade,
      grade_reasoning,
      research_status,
      has_multiple_locations,
      team_size,
      run_id,
      ai_report,
      suggested_hooks,
      pain_points,
      opportunities,
      created_at
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (leadsError) {
    console.error('Error fetching leads:', leadsError);
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-4">Leads Map</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            Error loading leads. Please try again later.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <LeadsMapWithSidebar runs={runs || []} leads={leads || []} />
    </div>
  );
}
