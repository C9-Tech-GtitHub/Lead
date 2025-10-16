'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ProgressLog } from './progress-log';
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
  error_message?: string;
}

interface RunDetailsProps {
  run: Run;
}

export function RunDetails({ run: initialRun }: RunDetailsProps) {
  const [run, setRun] = useState<Run>(initialRun);
  const [isResearchingAll, setIsResearchingAll] = useState(false);

  const handleResearchAll = async () => {
    setIsResearchingAll(true);

    try {
      const response = await fetch('/api/inngest/trigger-research-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: run.id })
      });

      if (!response.ok) {
        throw new Error('Failed to trigger research');
      }

      // The run status will update via realtime subscription
    } catch (error) {
      console.error('Error triggering research:', error);
      alert('Failed to start research. Please try again.');
    } finally {
      setIsResearchingAll(false);
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to real-time updates for this run
    const channel = supabase
      .channel(`run-${initialRun.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'runs',
          filter: `id=eq.${initialRun.id}`,
        },
        (payload) => {
          setRun(payload.new as Run);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialRun.id]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {run.business_type} in {run.location}
        </h1>
      </div>

      {run.error_message && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Error:</p>
          <p className="text-sm">{run.error_message}</p>
        </div>
      )}

      {/* Progress Tracking */}
      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <div className="mb-2">
          <span className="text-sm font-medium text-gray-700">
            Target: {run.target_count} leads
          </span>
          <span className="text-sm text-gray-500 mx-2">•</span>
          <span className="text-sm text-gray-500">
            Created {formatDateAU(run.created_at)}
          </span>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <StatusBadge status={run.status} />

          {/* Research All Button - show when status is "ready" */}
          {run.status === 'ready' && (
            <button
              onClick={handleResearchAll}
              disabled={isResearchingAll}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-sm transition-colors"
            >
              {isResearchingAll ? 'Starting...' : '🔬 Research All Leads'}
            </button>
          )}
        </div>

        {run.status !== 'failed' && run.status !== 'completed' && (
          <>
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span className="font-medium">Progress</span>
                <span className="font-medium">{run.progress}%</span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${run.progress}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {run.total_leads} of {run.target_count} leads processed
            </div>
          </>
        )}

        {run.status === 'completed' && (
          <div className="text-sm text-green-600 font-medium">
            Completed {run.completed_at ? formatDateAU(run.completed_at) : ''}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <StatCard label="Total Leads" value={run.total_leads} />
        <StatCard label="Target" value={run.target_count} />
        <StatCard
          label="A Grade"
          value={run.grade_a_count}
          color="text-green-600"
        />
        <StatCard
          label="B Grade"
          value={run.grade_b_count}
          color="text-blue-600"
        />
      </div>

      {/* Grade Distribution */}
      {run.total_leads > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Grade Distribution
          </h3>
          <div className="grid grid-cols-5 gap-2">
            <GradeBar
              grade="A"
              count={run.grade_a_count}
              total={run.total_leads}
              color="bg-green-500"
            />
            <GradeBar
              grade="B"
              count={run.grade_b_count}
              total={run.total_leads}
              color="bg-blue-500"
            />
            <GradeBar
              grade="C"
              count={run.grade_c_count}
              total={run.total_leads}
              color="bg-yellow-500"
            />
            <GradeBar
              grade="D"
              count={run.grade_d_count}
              total={run.total_leads}
              color="bg-orange-500"
            />
            <GradeBar
              grade="F"
              count={run.grade_f_count}
              total={run.total_leads}
              color="bg-red-500"
            />
          </div>
        </div>
      )}

      {/* Progress Log */}
      <div className="mt-6">
        <ProgressLog runId={run.id} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    scraping: 'bg-blue-100 text-blue-700',
    ready: 'bg-yellow-100 text-yellow-700',
    researching: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`px-4 py-2 rounded-full text-sm font-medium ${
        styles[status] || styles.pending
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatCard({
  label,
  value,
  color = 'text-gray-900',
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function GradeBar({
  grade,
  count,
  total,
  color,
}: {
  grade: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="text-center">
      <div className="h-24 bg-gray-100 rounded relative overflow-hidden">
        <div
          className={`absolute bottom-0 left-0 right-0 ${color} transition-all duration-500`}
          style={{ height: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-600 mt-2">
        {grade}: {count}
      </p>
    </div>
  );
}
