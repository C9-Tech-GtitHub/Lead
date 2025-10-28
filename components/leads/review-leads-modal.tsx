"use client";

import { useState } from "react";
import {
  X,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface ReviewLeadsModalProps {
  onClose: () => void;
  onComplete: () => void;
  runId?: string;
}

interface ReviewResult {
  leadId: string;
  leadName: string;
  website: string;
  currentGrade: string;
  reason: string;
  platform?: string;
  status: "invalid" | "fixed" | "error";
}

export default function ReviewLeadsModal({
  onClose,
  onComplete,
  runId = "all",
}: ReviewLeadsModalProps) {
  const [isReviewing, setIsReviewing] = useState(false);
  const [autoFix, setAutoFix] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    valid: number;
    invalid: number;
    fixed: number;
    details: ReviewResult[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReview = async () => {
    setIsReviewing(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/leads/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          autoFix,
          runId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to review leads");
      }

      const data = await response.json();
      setResults(data.results);

      if (autoFix && data.results.fixed > 0) {
        onComplete(); // Refresh the leads list
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while reviewing leads");
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "fixed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "invalid":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fixed":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "invalid":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Review Leads
              </h2>
              <p className="text-sm text-gray-500">
                Scan leads for invalid websites (social media, directories,
                etc.)
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
          {!results && !isReviewing && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-2">
                  What this checks:
                </h3>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>
                    • <strong>Social Media:</strong> Facebook, Instagram,
                    YouTube, Twitter, LinkedIn, TikTok, Pinterest, Reddit,
                    Nextdoor
                  </li>
                  <li>
                    • <strong>Maps & Navigation:</strong> Google Maps, Apple
                    Maps, Waze, MapQuest, OpenStreetMap
                  </li>
                  <li>
                    • <strong>Review Sites:</strong> Yelp, TripAdvisor,
                    Foursquare, Zomato, OpenTable
                  </li>
                  <li>
                    • <strong>US Directories:</strong> Yellow Pages, White
                    Pages, Superpages, Manta, BBB, Angi, Thumbtack, HomeAdvisor
                  </li>
                  <li>
                    • <strong>Australian Directories:</strong> TrueLocal,
                    HiPages, Hotfrog, LocalSearch, StartLocal, ProductReview
                  </li>
                  <li>
                    • <strong>UK/EU Directories:</strong> Yell, Thomson Local
                  </li>
                  <li>
                    • <strong>Specialized:</strong> Houzz, HomeStars, Eatability
                  </li>
                  <li>
                    • <strong>Platform Pages:</strong> Wix.com, WordPress.com,
                    Blogspot
                  </li>
                  <li>
                    • <strong>Invalid Domains:</strong> Missing or malformed
                    website URLs
                  </li>
                </ul>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <input
                  type="checkbox"
                  id="autoFix"
                  checked={autoFix}
                  onChange={(e) => setAutoFix(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 mt-0.5"
                />
                <label htmlFor="autoFix" className="flex-1">
                  <div className="text-sm font-medium text-blue-900">
                    Automatically fix invalid leads
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    Mark all leads with invalid websites as Grade F. This helps
                    filter them out of your qualified leads.
                  </div>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          )}

          {isReviewing && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Reviewing leads...</p>
              <p className="text-sm text-gray-500 mt-2">
                Scanning websites for validity
              </p>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {results.total}
                  </div>
                  <div className="text-sm text-gray-600">Total Reviewed</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {results.valid}
                  </div>
                  <div className="text-sm text-green-700">Valid Websites</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {results.invalid}
                  </div>
                  <div className="text-sm text-yellow-700">Invalid Found</div>
                </div>
                {autoFix && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {results.fixed}
                    </div>
                    <div className="text-sm text-blue-700">Auto-Fixed</div>
                  </div>
                )}
              </div>

              {/* Overall Status Message */}
              {results.invalid > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">
                        {results.invalid} lead{results.invalid !== 1 ? "s" : ""}{" "}
                        with invalid websites found
                      </h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        {autoFix
                          ? `${results.fixed} leads have been marked as Grade F.`
                          : "Enable auto-fix to automatically mark these as Grade F."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {results.invalid === 0 && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-green-800">
                        All leads have valid websites!
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        No social media or directory URLs found.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Results */}
              {results.details.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Invalid Websites Found ({results.details.length})
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {results.details.map((detail, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 ${getStatusColor(detail.status)}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="flex-shrink-0 mt-0.5">
                              {getStatusIcon(detail.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900">
                                {detail.leadName}
                              </div>
                              <div className="text-sm text-gray-600 mt-1 font-mono break-all">
                                {detail.website}
                              </div>
                              <div className="text-sm text-gray-700 mt-2">
                                <strong>Issue:</strong> {detail.reason}
                                {detail.platform && (
                                  <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                                    {detail.platform}
                                  </span>
                                )}
                              </div>
                              {detail.currentGrade && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Current grade: {detail.currentGrade}
                                  {detail.status === "fixed" && (
                                    <span className="ml-2 text-blue-600 font-medium">
                                      → Updated to F
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div
                            className={`flex-shrink-0 px-3 py-1 rounded text-xs font-medium ${
                              detail.status === "fixed"
                                ? "bg-green-100 text-green-700"
                                : detail.status === "error"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {detail.status === "fixed"
                              ? "FIXED"
                              : detail.status === "error"
                                ? "ERROR"
                                : "NEEDS FIX"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                disabled={isReviewing}
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={isReviewing}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isReviewing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reviewing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Start Review
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="text-sm text-gray-600">
                {results.valid} valid • {results.invalid} invalid
                {autoFix && ` • ${results.fixed} fixed`}
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
