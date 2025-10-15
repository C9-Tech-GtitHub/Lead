'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {run.business_type} in {run.location}
          </h1>
          <p className="text-gray-500 mt-1">
            Created {new Date(run.created_at).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={run.status} />
      </div>

      {run.error_message && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Error:</p>
          <p className="text-sm">{run.error_message}</p>
        </div>
      )}

      {/* Progress */}
      {run.status !== 'failed' && run.status !== 'completed' && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Processing Leads</span>
            <span>
              {run.total_leads} / {run.target_count} ({run.progress}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${run.progress}%` }}
            />
          </div>
        </div>
      )}

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
