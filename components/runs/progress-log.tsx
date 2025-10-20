"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTimeAU } from "@/lib/utils/format-date";

interface ProgressLogEntry {
  id: string;
  run_id: string;
  event_type: string;
  message: string;
  details?: Record<string, any>;
  created_at: string;
}

interface ProgressLogProps {
  runId: string;
}

export function ProgressLog({ runId }: ProgressLogProps) {
  const [logs, setLogs] = useState<ProgressLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial logs
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("progress_logs")
        .select("*")
        .eq("run_id", runId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    };

    fetchLogs();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`progress-logs-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "progress_logs",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          console.log("[ProgressLog] New log received:", payload.new);
          setLogs((current) => [payload.new as ProgressLogEntry, ...current]);
        },
      )
      .subscribe((status) => {
        console.log("[ProgressLog] Subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "run_started":
        return "🚀";
      case "scraping_started":
        return "🔍";
      case "scraping_completed":
        return "✅";
      case "lead_created":
        return "📋";
      case "lead_research_started":
        return "🔬";
      case "lead_research_completed":
        return "✨";
      case "lead_failed":
        return "❌";
      case "run_completed":
        return "🎉";
      case "run_failed":
        return "💥";
      case "status_update":
        return "📊";
      default:
        return "•";
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "run_started":
      case "scraping_started":
      case "lead_research_started":
        return "text-blue-600";
      case "scraping_completed":
      case "lead_research_completed":
      case "run_completed":
        return "text-green-600";
      case "lead_failed":
      case "run_failed":
        return "text-red-600";
      case "lead_created":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Progress Log
        </h2>
        <div className="text-center text-gray-500 py-8">Loading logs...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Progress Log</h2>

      {logs.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No progress logs yet. Activity will appear here as the run progresses.
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="text-xl flex-shrink-0">
                {getEventIcon(log.event_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${getEventColor(log.event_type)}`}>
                  {log.message}
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {Object.entries(log.details).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span>{" "}
                        {String(value)}
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {formatDateTimeAU(log.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
