"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlayCircle, XCircle, CheckCircle2, Loader2 } from "lucide-react";

interface SyncProgress {
  syncType: "bounces" | "unsubscribes" | "asm_groups";
  processed: number;
  total: number;
  synced: number;
  errors: number;
  groupName?: string;
}

interface SyncComplete {
  total: number;
  bounces: number;
  unsubscribes: number;
  asmGroups?: number;
  totalLeads: number;
  suppressedLeads: number;
  leadsAffectedPercentage: string;
  uniqueSuppressedDomains: number;
  uniqueLeadDomains: number;
  domainsAffectedPercentage: string;
}

export default function SendGridSyncPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [isFullSync, setIsFullSync] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [bounceProgress, setBounceProgress] = useState<SyncProgress | null>(
    null,
  );
  const [unsubProgress, setUnsubProgress] = useState<SyncProgress | null>(null);
  const [complete, setComplete] = useState<SyncComplete | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const startSync = async () => {
    setIsRunning(true);
    setLogs([]);
    setBounceProgress(null);
    setUnsubProgress(null);
    setComplete(null);
    setError(null);

    try {
      const response = await fetch("/api/sendgrid/sync-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fullSync: isFullSync }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setIsRunning(false);
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (data.type === "log") {
              setLogs((prev) => [...prev, data.message]);
            } else if (data.type === "progress") {
              if (data.syncType === "bounces") {
                setBounceProgress(data);
              } else if (data.syncType === "unsubscribes") {
                setUnsubProgress(data);
              }
            } else if (data.type === "complete") {
              setComplete(data);
            } else if (data.type === "error") {
              setError(data.message);
              setLogs((prev) => [...prev, `❌ ${data.message}`]);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      setLogs((prev) => [...prev, `❌ Error: ${err.message}`]);
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SendGrid Sync</h1>
          <p className="text-gray-600 mt-2">
            Manually sync bounces and unsubscribes from SendGrid
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Control</CardTitle>
            <CardDescription>
              This will fetch bounces and unsubscribes from SendGrid and update
              the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="fullSync"
                checked={isFullSync}
                onChange={(e) => setIsFullSync(e.target.checked)}
                disabled={isRunning}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="fullSync"
                className="text-sm font-medium text-gray-700"
              >
                Full Sync (fetch all historical data, ignoring previous syncs)
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={startSync}
                disabled={isRunning}
                className="w-full sm:w-auto"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    {isFullSync ? "Start Full Sync" : "Start Incremental Sync"}
                  </>
                )}
              </Button>
            </div>
            {isFullSync && !isRunning && (
              <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
                ⚠️ Full sync will fetch all historical data from SendGrid. This
                may take longer and process more records.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Cards */}
        {(bounceProgress || unsubProgress) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bounces Progress */}
            {bounceProgress && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bounces</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span className="font-medium">
                        {bounceProgress.processed} / {bounceProgress.total}
                      </span>
                    </div>
                    <Progress
                      value={
                        (bounceProgress.processed / bounceProgress.total) * 100
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Synced</div>
                      <div className="text-2xl font-bold text-green-600">
                        {bounceProgress.synced.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Errors</div>
                      <div className="text-2xl font-bold text-red-600">
                        {bounceProgress.errors}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Unsubscribes Progress */}
            {unsubProgress && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Unsubscribes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span className="font-medium">
                        {unsubProgress.processed} / {unsubProgress.total}
                      </span>
                    </div>
                    <Progress
                      value={
                        (unsubProgress.processed / unsubProgress.total) * 100
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Synced</div>
                      <div className="text-2xl font-bold text-green-600">
                        {unsubProgress.synced.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Errors</div>
                      <div className="text-2xl font-bold text-red-600">
                        {unsubProgress.errors}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Complete Summary */}
        {complete && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="font-semibold mb-2">Sync Complete!</div>
              <div className="text-sm space-y-1">
                <div>
                  Total Emails:{" "}
                  <span className="font-bold">
                    {complete.total.toLocaleString()}
                  </span>{" "}
                  | Bounces:{" "}
                  <span className="font-bold">
                    {complete.bounces.toLocaleString()}
                  </span>{" "}
                  | Global Unsubscribes:{" "}
                  <span className="font-bold">
                    {complete.unsubscribes.toLocaleString()}
                  </span>
                  {complete.asmGroups !== undefined && (
                    <>
                      {" "}
                      | ASM Groups:{" "}
                      <span className="font-bold">
                        {complete.asmGroups.toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
                <div>
                  Leads Affected:{" "}
                  <span className="font-bold">
                    {complete.suppressedLeads.toLocaleString()}
                  </span>{" "}
                  / {complete.totalLeads.toLocaleString()} total leads (
                  {complete.leadsAffectedPercentage}%)
                </div>
                <div>
                  Suppressed Domains:{" "}
                  <span className="font-bold">
                    {complete.uniqueSuppressedDomains.toLocaleString()}
                  </span>{" "}
                  / {complete.uniqueLeadDomains.toLocaleString()} unique domains
                  ({complete.domainsAffectedPercentage}%)
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Logs</CardTitle>
            <CardDescription>
              Real-time progress and debugging information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No logs yet. Click &quot;Start Sync&quot; to begin.
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.includes("✅")
                          ? "text-green-400"
                          : log.includes("❌")
                            ? "text-red-400"
                            : log.includes("===")
                              ? "text-blue-400 font-bold"
                              : "text-gray-300"
                      }
                    >
                      {log}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
