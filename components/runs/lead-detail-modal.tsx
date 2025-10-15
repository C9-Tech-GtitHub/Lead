'use client';

interface Lead {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  research_status: string;
  compatibility_grade?: string;
  grade_reasoning?: string;
  has_multiple_locations: boolean;
  team_size?: string;
  ai_report?: string;
  suggested_hooks?: string[];
  pain_points?: string[];
  opportunities?: string[];
  error_message?: string;
}

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
}

export function LeadDetailModal({ lead, onClose }: LeadDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{lead.name}</h2>
            <div className="flex gap-3 mt-2">
              {lead.compatibility_grade && (
                <GradeBadge grade={lead.compatibility_grade} />
              )}
              <ResearchStatusBadge status={lead.research_status} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Contact Information */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Contact Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {lead.address && (
                <InfoRow label="Address" value={lead.address} />
              )}
              {lead.phone && <InfoRow label="Phone" value={lead.phone} />}
              {lead.website && (
                <InfoRow
                  label="Website"
                  value={
                    <a
                      href={
                        lead.website.startsWith('http')
                          ? lead.website
                          : `https://${lead.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {lead.website}
                    </a>
                  }
                />
              )}
            </div>
          </section>

          {/* Business Insights */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Business Insights
            </h3>
            <div className="flex gap-3">
              {lead.has_multiple_locations && (
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                  Multiple Locations
                </span>
              )}
              {lead.team_size && (
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                  Team: {lead.team_size}
                </span>
              )}
            </div>
          </section>

          {/* Grade Reasoning */}
          {lead.grade_reasoning && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Grade Reasoning
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{lead.grade_reasoning}</p>
              </div>
            </section>
          )}

          {/* Suggested Hooks */}
          {lead.suggested_hooks && lead.suggested_hooks.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Suggested Outreach Hooks
              </h3>
              <ul className="space-y-2">
                {lead.suggested_hooks.map((hook, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 bg-green-50 rounded-lg p-3"
                  >
                    <span className="text-green-600 font-bold mt-0.5">→</span>
                    <span className="text-gray-700">{hook}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Pain Points */}
          {lead.pain_points && lead.pain_points.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Identified Pain Points
              </h3>
              <ul className="space-y-2">
                {lead.pain_points.map((point, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 bg-red-50 rounded-lg p-3"
                  >
                    <span className="text-red-600 font-bold mt-0.5">⚠</span>
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Opportunities */}
          {lead.opportunities && lead.opportunities.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Growth Opportunities
              </h3>
              <ul className="space-y-2">
                {lead.opportunities.map((opportunity, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 bg-blue-50 rounded-lg p-3"
                  >
                    <span className="text-blue-600 font-bold mt-0.5">💡</span>
                    <span className="text-gray-700">{opportunity}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Full AI Report */}
          {lead.ai_report && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Full AI Analysis Report
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {lead.ai_report}
                </pre>
              </div>
            </section>
          )}

          {/* Error Message */}
          {lead.error_message && (
            <section>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-1">
                  Error
                </h3>
                <p className="text-sm text-red-700">{lead.error_message}</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-gray-700 min-w-[80px]">{label}:</span>
      <span className="text-gray-600">{value}</span>
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: 'bg-green-100 text-green-700',
    B: 'bg-blue-100 text-blue-700',
    C: 'bg-yellow-100 text-yellow-700',
    D: 'bg-orange-100 text-orange-700',
    F: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-bold ${
        colors[grade] || colors.F
      }`}
    >
      Grade {grade}
    </span>
  );
}

function ResearchStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    scraping: 'bg-blue-100 text-blue-700',
    analyzing: 'bg-purple-100 text-purple-700',
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
