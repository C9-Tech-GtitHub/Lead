'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

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
        <Link
          key={run.id}
          href={`/dashboard/runs/${run.id}`}
          className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {run.business_type} in {run.location}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Target: {run.target_count} leads • Created{' '}
                {new Date(run.created_at).toLocaleDateString()}
              </p>
            </div>
            <StatusBadge status={run.status} />
          </div>

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
