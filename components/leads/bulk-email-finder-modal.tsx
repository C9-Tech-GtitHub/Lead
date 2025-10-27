"use client";

import { useState } from "react";
import {
  X,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface BulkEmailFinderModalProps {
  leadIds: string[];
  onClose: () => void;
  onComplete: () => void;
}

interface ProcessingResult {
  leadId: string;
  leadName: string;
  domain?: string;
  status: "success" | "failed" | "skipped";
  reason?: string;
  emailsFound?: number;
  organization?: string;
  pattern?: string;
}

type EmailProvider = "hunter" | "tomba";

export default function BulkEmailFinderModal({
  leadIds,
  onClose,
  onComplete,
}: BulkEmailFinderModalProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [provider, setProvider] = useState<EmailProvider>("hunter");
  const [results, setResults] = useState<{
    total: number;
    processed: number;
    skipped: number;
    successful: number;
    failed: number;
    details: ProcessingResult[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      const apiEndpoint =
        provider === "hunter"
          ? "/api/hunter/bulk-search"
          : "/api/tomba/bulk-search";
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadIds,
          onlyMissing,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to search emails");
      }

      setResults(data.results);
      onComplete();
    } catch (err: any) {
      setError(err.message || "An error occurred while searching for emails");
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "skipped":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-50";
      case "failed":
        return "text-red-600 bg-red-50";
      case "skipped":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Bulk Email Search
              </h2>
              <p className="text-sm text-gray-500">
                Search emails for {leadIds.length} lead
                {leadIds.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!results && !isSearching && (
            <div className="space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Email Provider
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setProvider("hunter")}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                      provider === "hunter"
                        ? "border-purple-600 bg-purple-50 text-purple-700"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    Hunter.io
                  </button>
                  <button
                    onClick={() => setProvider("tomba")}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                      provider === "tomba"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    Tomba.io
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">How it works</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    • Searches{" "}
                    {provider === "hunter" ? "Hunter.io" : "Tomba.io"} for
                    emails at each lead&apos;s domain
                  </li>
                  <li>• Processes one lead per second to avoid rate limits</li>
                  <li>• Saves all discovered emails to your database</li>
                  <li>• Skips leads without a website domain</li>
                </ul>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="onlyMissing"
                  checked={onlyMissing}
                  onChange={(e) => setOnlyMissing(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="onlyMissing" className="text-sm text-gray-700">
                  Only search leads that haven&apos;t been searched before
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          )}

          {isSearching && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600 font-medium">
                Searching for emails...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This may take a while. Processing {leadIds.length} lead
                {leadIds.length !== 1 ? "s" : ""}...
              </p>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {results.total}
                  </div>
                  <div className="text-sm text-gray-600">Total Leads</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {results.successful}
                  </div>
                  <div className="text-sm text-green-700">Successful</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {results.failed}
                  </div>
                  <div className="text-sm text-red-700">Failed</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {results.skipped}
                  </div>
                  <div className="text-sm text-yellow-700">Skipped</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {results.details.reduce(
                      (sum, d) => sum + (d.emailsFound || 0),
                      0,
                    )}
                  </div>
                  <div className="text-sm text-blue-700">Emails Found</div>
                </div>
              </div>

              {/* Detailed Results */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">
                  Detailed Results
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.details.map((detail, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        detail.status === "success"
                          ? "border-green-200 bg-green-50"
                          : detail.status === "failed"
                            ? "border-red-200 bg-red-50"
                            : "border-yellow-200 bg-yellow-50"
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getStatusIcon(detail.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">
                          {detail.leadName}
                        </div>
                        {detail.domain && (
                          <div className="text-sm text-gray-600">
                            {detail.domain}
                          </div>
                        )}
                        {detail.status === "success" && (
                          <div className="text-sm text-gray-700 mt-1">
                            Found {detail.emailsFound} email
                            {detail.emailsFound !== 1 ? "s" : ""}
                            {detail.organization &&
                              ` at ${detail.organization}`}
                            {detail.pattern && (
                              <span className="text-gray-500">
                                {" "}
                                • Pattern: {detail.pattern}
                              </span>
                            )}
                          </div>
                        )}
                        {detail.reason && (
                          <div className="text-sm text-gray-600 mt-1">
                            {detail.reason}
                          </div>
                        )}
                      </div>
                      <div
                        className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${getStatusColor(detail.status)}`}
                      >
                        {detail.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
          {!results ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
                disabled={isSearching}
              >
                Cancel
              </button>
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Start Search
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="text-sm text-gray-600">
                Search completed • {results.successful} successful
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
