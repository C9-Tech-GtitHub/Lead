import { createClient } from '@/lib/supabase/server';

export default async function DebugPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get all runs (without user filter)
  const { data: allRuns } = await supabase
    .from('runs')
    .select('id, user_id, location, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  // Get runs for current user
  const { data: userRuns } = user
    ? await supabase
        .from('runs')
        .select('id, user_id, location, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: null };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Info</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Current User</h2>
        {user ? (
          <div className="space-y-2">
            <p>
              <strong>ID:</strong> {user.id}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Created:</strong> {new Date(user.created_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-red-600">Not logged in</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">All Runs in Database (Latest 5)</h2>
        {allRuns && allRuns.length > 0 ? (
          <div className="space-y-4">
            {allRuns.map((run) => (
              <div key={run.id} className="border-b pb-2">
                <p className="text-sm">
                  <strong>ID:</strong> {run.id.substring(0, 8)}...
                </p>
                <p className="text-sm">
                  <strong>User ID:</strong> {run.user_id?.substring(0, 8)}...
                </p>
                <p className="text-sm">
                  <strong>Location:</strong> {run.location}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(run.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No runs found</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Your Runs (Latest 5)</h2>
        {!user ? (
          <p className="text-gray-500">Please log in to see your runs</p>
        ) : userRuns && userRuns.length > 0 ? (
          <div className="space-y-4">
            {userRuns.map((run) => (
              <div key={run.id} className="border-b pb-2">
                <p className="text-sm">
                  <strong>ID:</strong> {run.id.substring(0, 8)}...
                </p>
                <p className="text-sm">
                  <strong>Location:</strong> {run.location}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(run.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            No runs found for user: {user.email}
            <br />
            <span className="text-xs">
              (You may need to log in with a different account)
            </span>
          </p>
        )}
      </div>

      <div className="mt-6">
        <a
          href="/dashboard"
          className="text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}
