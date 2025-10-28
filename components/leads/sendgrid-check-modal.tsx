"use client";

import { useState } from "react";
import {
  X,
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Mail,
} from "lucide-react";

interface SendGridCheckModalProps {
  leadIds: string[];
  onClose: () => void;
}

interface CheckResult {
  leadId: string;
  leadName: string;
  domain?: string;
  emails: Array<{
    email: string;
    type: string;
    confidence: number;
    isSuppressed: boolean;
  }>;
  issues: Array<{
    type: string;
    severity: "safe" | "warning" | "blocked";
    message: string;
    email?: string;
    source?: string;
    reason?: string;
  }>;
  status: "safe" | "warning" | "blocked";
  statusUpdated?: string;
}

export default function SendGridCheckModal({
  leadIds,
  onClose,
}: SendGridCheckModalProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    safe: number;
    warnings: number;
    blocked: number;
    details: CheckResult[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    setIsChecking(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/sendgrid/bulk-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadIds,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to check leads");
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err: any) {
      setError(err.message || "An error occurred while checking leads");
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "safe":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "blocked":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe":
        return "bg-green-50 border-green-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "blocked":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "blocked":
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
            BLOCKED
          </span>
        );
      case "warning":
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
            WARNING
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                SendGrid Safety Check
              </h2>
              <p className="text-sm text-gray-500">
                Verify {leadIds.length} lead{leadIds.length !== 1 ? "s" : ""}{" "}
                against suppression lists and contact history
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
          {!results && !isChecking && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">
                  What this checks:
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    • <strong>Suppression Lists:</strong> Bounces, unsubscribes,
                    spam reports
                  </li>
                  <li>
                    • <strong>Domain Contact Tracking:</strong> 6-month cadence
                    enforcement
                  </li>
                  <li>
                    • <strong>Previous Emails:</strong> Check if we&apos;ve
                    already emailed this lead
                  </li>
                  <li>
                    • <strong>Email Availability:</strong> Verify leads have
                    valid emails
                  </li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          )}

          {isChecking && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600 font-medium">
                Checking SendGrid status...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Verifying {leadIds.length} lead{leadIds.length !== 1 ? "s" : ""}{" "}
                against suppression lists
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
                  <div className="text-sm text-gray-600">Total Checked</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {results.safe}
                  </div>
                  <div className="text-sm text-green-700">Safe to Send</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {results.warnings}
                  </div>
                  <div className="text-sm text-yellow-700">Warnings</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {results.blocked}
                  </div>
                  <div className="text-sm text-red-700">Blocked</div>
                </div>
              </div>

              {/* Overall Status Message */}
              {results.blocked > 0 && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex items-start">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">
                        {results.blocked} lead{results.blocked !== 1 ? "s" : ""}{" "}
                        cannot be contacted
                      </h3>
                      <p className="text-sm text-red-700 mt-1">
                        These leads are on suppression lists or were recently
                        contacted. Remove them from your send list to avoid
                        deliverability issues.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {results.warnings > 0 && results.blocked === 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">
                        {results.warnings} lead
                        {results.warnings !== 1 ? "s" : ""} have warnings
                      </h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Review these leads carefully before sending.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {results.safe === results.total && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-green-800">
                        All leads are safe to contact
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        No suppression or cadence issues found.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Results */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">
                  Detailed Results
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
                            {detail.domain && (
                              <div className="text-sm text-gray-600 mt-0.5">
                                {detail.domain}
                              </div>
                            )}

                            {/* Status Update Indicator */}
                            {detail.statusUpdated && (
                              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                <CheckCircle className="w-3 h-3" />
                                Email status updated to: {detail.statusUpdated}
                              </div>
                            )}

                            {/* Emails */}
                            {detail.emails.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {detail.emails.map((email, emailIdx) => (
                                  <div
                                    key={emailIdx}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <Mail className="w-3 h-3 text-gray-400" />
                                    <span
                                      className={
                                        email.isSuppressed
                                          ? "text-red-600 font-medium"
                                          : "text-gray-700"
                                      }
                                    >
                                      {email.email}
                                    </span>
                                    <span className="text-gray-500">
                                      ({email.type}, {email.confidence}%
                                      confidence)
                                    </span>
                                    {email.isSuppressed && (
                                      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                                        SUPPRESSED
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Issues */}
                            {detail.issues.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {detail.issues.map((issue, issueIdx) => (
                                  <div
                                    key={issueIdx}
                                    className="flex items-start gap-2 text-sm"
                                  >
                                    {getSeverityBadge(issue.severity)}
                                    <span className="text-gray-700 flex-1">
                                      {issue.message}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className={`flex-shrink-0 px-3 py-1 rounded text-xs font-medium ${
                            detail.status === "safe"
                              ? "bg-green-100 text-green-700"
                              : detail.status === "warning"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {detail.status.toUpperCase()}
                        </div>
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
                disabled={isChecking}
              >
                Cancel
              </button>
              <button
                onClick={handleCheck}
                disabled={isChecking}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Check SendGrid Status
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="text-sm text-gray-600">
                {results.safe} safe • {results.warnings} warnings •{" "}
                {results.blocked} blocked
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
