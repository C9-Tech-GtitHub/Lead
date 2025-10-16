'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { formatDateAU } from '@/lib/utils/format-date';

interface Run {
  id: string;
  business_type: string;
  location: string;
  target_count: number;
  status: string;
  progress: number;
  total_leads: number;
  grade_a_count: number;
  grade_b_count: number;
  grade_c_count: number;
  grade_d_count: number;
  grade_f_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface RunsListProps {
  initialRuns: Run[];
}

export function RunsList({ initialRuns }: RunsListProps) {
  const [runs, setRuns] = useState<Run[]>(initialRuns);

  const handleDeleteRun = async (runId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation

    if (!confirm('Are you sure you want to delete this run? This will also delete all associated leads.')) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('runs')
        .delete()
        .eq('id', runId);

      if (error) throw error;

      // Update local state immediately
      setRuns((current) => current.filter((run) => run.id !== runId));
    } catch (error) {
      console.error('Error deleting run:', error);
      alert('Failed to delete run');
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to real-time updates for runs
    const channel = supabase
      .channel('runs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'runs',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRuns((current) => [payload.new as Run, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            setRuns((current) =>
              current.map((run) =>
                run.id === payload.new.id ? (payload.new as Run) : run
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setRuns((current) => current.filter((run) => run.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (runs.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-500 mb-4">No research runs yet</p>
        <p className="text-sm text-gray-400">Create your first run to start finding leads</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {runs.map((run) => (
        <div
          key={run.id}
          className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
        >
          <div className="flex justify-between items-start mb-4">
            <Link href={`/dashboard/runs/${run.id}`} className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                {run.business_type} in {run.location}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Target: {run.target_count} leads • Created {formatDateAU(run.created_at)}
              </p>
            </Link>
            <div className="flex items-center gap-2">
              <StatusBadge status={run.status} />
              <button
                onClick={(e) => handleDeleteRun(run.id, e)}
                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                title="Delete run"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <Link href={`/dashboard/runs/${run.id}`} className="block">
            {/* Progress Bar */}
            {run.status !== 'failed' && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{run.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${run.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Grade Distribution */}
            {run.total_leads > 0 && (
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-green-600 font-semibold">A:</span>
                  <span>{run.grade_a_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-blue-600 font-semibold">B:</span>
                  <span>{run.grade_b_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-600 font-semibold">C:</span>
                  <span>{run.grade_c_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-orange-600 font-semibold">D:</span>
                  <span>{run.grade_d_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-red-600 font-semibold">F:</span>
                  <span>{run.grade_f_count}</span>
                </div>
              </div>
            )}
          </Link>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    scraping: 'bg-blue-100 text-blue-700',
    researching: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        styles[status] || styles.pending
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
