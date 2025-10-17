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
  is_paused?: boolean;
  paused_at?: string;
}

interface RunsListProps {
  initialRuns: Run[];
}

export function RunsList({ initialRuns }: RunsListProps) {
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const [researchingRuns, setResearchingRuns] = useState<Set<string>>(new Set());
  const [pausingRuns, setPausingRuns] = useState<Set<string>>(new Set());
  const [resumingRuns, setResumingRuns] = useState<Set<string>>(new Set());
  const [restartingRuns, setRestartingRuns] = useState<Set<string>>(new Set());
  const [prescreeningRuns, setPrescreeningRuns] = useState<Set<string>>(new Set());

  // Helper function to refresh a single run's data
  const refreshRun = async (runId: string) => {
    try {
      const supabase = createClient();
      const { data: updatedRun } = await supabase
        .from('runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (updatedRun) {
        setRuns((current) =>
          current.map((run) =>
            run.id === runId ? (updatedRun as Run) : run
          )
        );
      }
    } catch (error) {
      console.error('Error refreshing run:', error);
    }
  };

  const handlePauseRun = async (runId: string, e: React.MouseEvent) => {
    e.preventDefault();

    if (!confirm('Pause this research run? You can resume it later.')) {
      return;
    }

    setPausingRuns(prev => new Set(prev).add(runId));

    try {
      const response = await fetch('/api/runs/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to pause run');
      }

      // Force refresh the run data immediately
      await refreshRun(runId);
    } catch (error) {
      console.error('Error pausing run:', error);
      alert(`Failed to pause run: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPausingRuns(prev => {
        const newSet = new Set(prev);
        newSet.delete(runId);
        return newSet;
      });
    }
  };

  const handleResumeRun = async (runId: string, e: React.MouseEvent) => {
    e.preventDefault();

    if (!confirm('Resume this research run?')) {
      return;
    }

    setResumingRuns(prev => new Set(prev).add(runId));

    try {
      const response = await fetch('/api/runs/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resume run');
      }

      const result = await response.json();
      console.log(`Resumed run, triggered ${result.pendingLeadsTriggered} pending leads`);

      // Force refresh the run data immediately
      await refreshRun(runId);
    } catch (error) {
      console.error('Error resuming run:', error);
      alert(`Failed to resume run: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setResumingRuns(prev => {
        const newSet = new Set(prev);
        newSet.delete(runId);
        return newSet;
      });
    }
  };

  const handleForceRestart = async (runId: string, e: React.MouseEvent) => {
    e.preventDefault();

    // Find the run to get its details for potential recreation
    const run = runs.find(r => r.id === runId);
    if (!run) {
      alert('Run not found in local state');
      return;
    }

    if (!confirm('Restart processing from existing database leads?\n\nThis will:\n- Use ONLY leads already scraped (no new scraping)\n- Prescreen any unscreened leads\n- Research any unresearched leads\n- Reset any stuck leads\n\nUse this when research gets stuck or needs to be rerun.')) {
      return;
    }

    setRestartingRuns(prev => new Set(prev).add(runId));

    try {
      const response = await fetch('/api/runs/force-restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId })
      });

      if (!response.ok) {
        const error = await response.json();

        // If run not found, offer to create a fresh research run
        if (error.error === 'Run not found' || response.status === 404) {
          // Check if there are orphaned leads
          if (error.orphanedLeads && error.orphanedLeads > 0) {
            alert(
              `⚠️ ${error.message}\n\n` +
              `Please delete this run from the UI and create a new one.`
            );
            setRestartingRuns(prev => {
              const newSet = new Set(prev);
              newSet.delete(runId);
              return newSet;
            });
            return;
          }

          const confirmFresh = confirm(
            `⚠️ Run not found in database.\n\n` +
            `Would you like to create a fresh research run instead?\n\n` +
            `This will create a new run with:\n` +
            `• Business type: ${run.business_type}\n` +
            `• Location: ${run.location}\n` +
            `• Target: ${run.target_count} leads`
          );

          if (confirmFresh) {
            // Redirect to create a new run with pre-filled data
            // We'll use the create-run modal by triggering it programmatically
            window.location.href = `/dashboard?create=true&business_type=${encodeURIComponent(run.business_type)}&location=${encodeURIComponent(run.location)}&target_count=${run.target_count}`;
            return;
          } else {
            // User declined, just clean up the UI
            setRestartingRuns(prev => {
              const newSet = new Set(prev);
              newSet.delete(runId);
              return newSet;
            });
            return;
          }
        }

        throw new Error(error.error || error.details || 'Failed to restart run');
      }

      const result = await response.json();
      console.log(`Force restarted: ${result.leadsRestarted} leads (${result.stuckLeadsReset} were stuck)`);
      alert(`✅ Successfully restarted research for ${result.leadsRestarted} leads${result.stuckLeadsReset > 0 ? `\n${result.stuckLeadsReset} stuck leads were reset` : ''}`);

      // Force refresh the run data immediately
      await refreshRun(runId);
    } catch (error) {
      console.error('Error force restarting run:', error);
      alert(`Failed to restart run: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRestartingRuns(prev => {
        const newSet = new Set(prev);
        newSet.delete(runId);
        return newSet;
      });
    }
  };

  const handleRestartPrescreening = async (runId: string, e: React.MouseEvent) => {
    e.preventDefault();

    const run = runs.find(r => r.id === runId);
    if (!run) {
      alert('Run not found');
      return;
    }

    if (!confirm('Restart prescreening for this run?\n\nThis will re-check all leads to identify franchises and national brands.')) {
      return;
    }

    setPrescreeningRuns(prev => new Set(prev).add(runId));

    try {
      const response = await fetch('/api/runs/restart-prescreen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to restart prescreening');
      }

      const result = await response.json();
      console.log(`Restart prescreening: ${result.message}`);

      // Force refresh the run data immediately
      await refreshRun(runId);
    } catch (error) {
      console.error('Error restarting prescreening:', error);
      alert(`Failed to restart prescreening: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPrescreeningRuns(prev => {
        const newSet = new Set(prev);
        newSet.delete(runId);
        return newSet;
      });
    }
  };

  const handleResearchAll = async (runId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation

    if (!confirm('Start researching all pending leads in this run?')) {
      return;
    }

    setResearchingRuns(prev => new Set(prev).add(runId));

    try {
      const response = await fetch('/api/inngest/trigger-research-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId })
      });

      if (!response.ok) {
        throw new Error('Failed to trigger research');
      }

      // Force refresh the run data immediately
      await refreshRun(runId);
    } catch (error) {
      console.error('Error triggering research all:', error);
      alert('Failed to start research. Please try again.');
    } finally {
      setResearchingRuns(prev => {
        const newSet = new Set(prev);
        newSet.delete(runId);
        return newSet;
      });
    }
  };

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
          console.log('[Realtime] Runs update:', payload.eventType, payload.new);
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

    // Polling fallback: refresh active runs every 3 seconds
    // This ensures UI updates even if realtime subscription has issues
    const pollInterval = setInterval(async () => {
      // Use setRuns callback to get current state (avoids stale closure)
      setRuns((currentRuns) => {
        // Check if there are any active runs
        const activeRuns = currentRuns.filter(
          (run) => run.status === 'scraping' ||
                   run.status === 'prescreening' ||
                   run.status === 'researching' ||
                   run.status === 'ready' ||
                   run.status === 'pending'
        );

        if (activeRuns.length > 0) {
          // Fetch updated data for active runs
          supabase
            .from('runs')
            .select('*')
            .in('id', activeRuns.map((r) => r.id))
            .then(({ data: updatedRuns }) => {
              if (updatedRuns) {
                setRuns((current) =>
                  current.map((run) => {
                    const updated = updatedRuns.find((ur) => ur.id === run.id);
                    return updated ? (updated as Run) : run;
                  })
                );
              }
            });
        }

        return currentRuns; // Return unchanged for this callback
      });
    }, 3000); // Poll every 3 seconds

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, []); // Empty dependency array - setup once

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
              <StatusBadge status={run.status} isPaused={run.is_paused} />

              {/* Restart Prescreening Button - show when status is "ready" or "researching" */}
              {(run.status === 'ready' || run.status === 'researching' || run.status === 'scraping' || run.status === 'prescreening') && (
                <button
                  onClick={(e) => handleRestartPrescreening(run.id, e)}
                  disabled={prescreeningRuns.has(run.id)}
                  className="px-3 py-1 bg-cyan-600 text-white rounded text-xs font-medium hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  title="Restart prescreening to re-identify franchises"
                >
                  {prescreeningRuns.has(run.id) ? 'Prescreening...' : '🔍 Restart Prescreen'}
                </button>
              )}

              {/* Research All Button - show when status is "ready" */}
              {run.status === 'ready' && (
                <button
                  onClick={(e) => handleResearchAll(run.id, e)}
                  disabled={researchingRuns.has(run.id)}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  title="Research all pending leads"
                >
                  {researchingRuns.has(run.id) ? 'Starting...' : '🔬 Research All'}
                </button>
              )}

              {/* Pause Button - show when researching and not paused */}
              {run.status === 'researching' && !run.is_paused && (
                <button
                  onClick={(e) => handlePauseRun(run.id, e)}
                  disabled={pausingRuns.has(run.id)}
                  className="px-3 py-1 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  title="Pause research"
                >
                  {pausingRuns.has(run.id) ? 'Pausing...' : '⏸ Pause'}
                </button>
              )}

              {/* Resume Button - show when paused */}
              {run.is_paused && (
                <button
                  onClick={(e) => handleResumeRun(run.id, e)}
                  disabled={resumingRuns.has(run.id)}
                  className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  title="Resume research"
                >
                  {resumingRuns.has(run.id) ? 'Resuming...' : '▶ Resume'}
                </button>
              )}

              {/* Force Restart Button - show when researching (as fallback) */}
              {run.status === 'researching' && (
                <button
                  onClick={(e) => handleForceRestart(run.id, e)}
                  disabled={restartingRuns.has(run.id)}
                  className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  title="Force restart research (use if pause/resume fails)"
                >
                  {restartingRuns.has(run.id) ? 'Restarting...' : '🔄 Restart'}
                </button>
              )}

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

function StatusBadge({ status, isPaused }: { status: string; isPaused?: boolean }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    scraping: 'bg-blue-100 text-blue-700',
    prescreening: 'bg-indigo-100 text-indigo-700',
    ready: 'bg-yellow-100 text-yellow-700',
    researching: 'bg-purple-100 text-purple-700',
    paused: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  const displayStatus = isPaused ? 'paused' : status;
  const displayText = isPaused
    ? '⏸ Paused'
    : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        styles[displayStatus] || styles.pending
      }`}
    >
      {displayText}
    </span>
  );
}
