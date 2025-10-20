"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LeadDetailModal } from "./lead-detail-modal";
import { EmailFinderModal } from "./email-finder-modal";
import { LinkedInCompanyModal } from "./linkedin-company-modal";
import {
  QuickResearchModal,
  QuickResearchConfig,
} from "./quick-research-modal";
import { exportLeads } from "@/lib/export/csv";

interface Lead {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  research_status: string;
  research_depth?: string;
  compatibility_grade?: string;
  grade_reasoning?: string;
  has_multiple_locations: boolean;
  team_size?: string;
  ai_report?: string;
  suggested_hooks?: string[];
  pain_points?: string[];
  opportunities?: string[];
  error_message?: string;
  email_count?: number;
}

interface LeadsListProps {
  initialLeads: Lead[];
  runId: string;
}

interface ClearResearchState {
  isClearing: boolean;
}

export function LeadsList({ initialLeads, runId }: LeadsListProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [emailFinderLead, setEmailFinderLead] = useState<Lead | null>(null);
  const [linkedinLead, setLinkedinLead] = useState<Lead | null>(null);
  const [quickResearchLead, setQuickResearchLead] = useState<Lead | null>(null);
  const [showQuickResearchAllModal, setShowQuickResearchAllModal] =
    useState(false);
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [researchingLeads, setResearchingLeads] = useState<Set<string>>(
    new Set(),
  );
  const [isResearchingAll, setIsResearchingAll] = useState(false);
  const [isDeepResearchingAll, setIsDeepResearchingAll] = useState(false);
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({});
  const [linkedinPeopleCounts, setLinkedinPeopleCounts] = useState<
    Record<string, number>
  >({});

  const handleResearchLead = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    // Find the lead and show the configuration modal
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setQuickResearchLead(lead);
    }
  };

  const handleQuickResearchConfirm = async (
    lead: Lead,
    config: QuickResearchConfig,
  ) => {
    const leadId = lead.id;
    setQuickResearchLead(null); // Close modal
    setResearchingLeads((prev) => new Set(prev).add(leadId));

    try {
      console.log("[Quick Research] Sending config:", config);

      const response = await fetch("/api/inngest/trigger-research-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, runId, config }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("[Quick Research] API Error:", errorData);
        throw new Error(errorData.error || "Failed to trigger research");
      }

      const result = await response.json();
      console.log("[Quick Research] Success:", result);

      // Status will update via realtime subscription
    } catch (error) {
      console.error("Error triggering research:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to start research. Please try again.";
      alert(errorMessage);
      setResearchingLeads((prev) => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  const handleReResearchLead = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (
      !confirm(
        "Re-research this lead? This will re-scrape the website and update all data including ABN lookup.",
      )
    ) {
      return;
    }

    setResearchingLeads((prev) => new Set(prev).add(leadId));

    try {
      const response = await fetch("/api/inngest/trigger-re-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, runId }),
      });

      if (!response.ok) {
        throw new Error("Failed to trigger re-research");
      }

      // Status will update via realtime subscription
    } catch (error) {
      console.error("Error triggering re-research:", error);
      alert("Failed to start re-research. Please try again.");
      setResearchingLeads((prev) => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  const handleLinkedInResearch = async (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    const linkedinKey = `linkedin-${lead.id}`;

    // If already has data, open modal to view
    if (linkedinPeopleCounts[lead.id] > 0) {
      setLinkedinLead(lead);
      return;
    }

    setResearchingLeads((prev) => new Set(prev).add(linkedinKey));

    try {
      const response = await fetch("/api/linkedin/scrape-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          companyName: lead.name,
          website: lead.website,
          autoDetect: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to scrape LinkedIn");
      }

      // Show success message with found ID
      console.log("LinkedIn scraping successful:", data);

      // Open modal to show results
      setLinkedinLead(lead);
    } catch (error: any) {
      console.error("Error scraping LinkedIn:", error);
      alert(
        `Failed to find LinkedIn company profile. ${error.message || "Please try again or enter the company ID manually."}`,
      );

      // Open modal anyway so user can manually enter ID
      setLinkedinLead(lead);
    } finally {
      setResearchingLeads((prev) => {
        const newSet = new Set(prev);
        newSet.delete(linkedinKey);
        return newSet;
      });
    }
  };

  const handleResearchAll = async () => {
    const pendingLeadIds = leads
      .filter((lead) => lead.research_status === "pending")
      .map((lead) => lead.id);

    if (pendingLeadIds.length === 0) {
      return;
    }

    // Show configuration modal instead of confirm dialog
    setShowQuickResearchAllModal(true);
  };

  const handleQuickResearchAllConfirm = async (config: QuickResearchConfig) => {
    setShowQuickResearchAllModal(false);

    const pendingLeadIds = leads
      .filter((lead) => lead.research_status === "pending")
      .map((lead) => lead.id);

    setIsResearchingAll(true);
    setResearchingLeads((prev) => {
      const newSet = new Set(prev);
      pendingLeadIds.forEach((id) => newSet.add(id));
      return newSet;
    });

    try {
      const response = await fetch("/api/inngest/trigger-research-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, config }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to trigger research");
      }

      // Status updates will come through the realtime subscription
    } catch (error) {
      console.error("Error triggering research all:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to start research. Please try again.";
      alert(errorMessage);
      setResearchingLeads((prev) => {
        const newSet = new Set(prev);
        pendingLeadIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    } finally {
      setIsResearchingAll(false);
    }
  };

  const handleExportCSV = async () => {
    const supabase = createClient();

    // Fetch complete lead data with emails and LinkedIn info
    const leadsToExport = await Promise.all(
      filteredLeads.map(async (lead) => {
        // Fetch emails for this lead
        const { data: emails } = await supabase
          .from("lead_emails")
          .select("*")
          .eq("lead_id", lead.id)
          .order("confidence", { ascending: false });

        // Fetch LinkedIn people for this lead
        const { data: linkedinPeople } = await supabase
          .from("lead_linkedin_people")
          .select("*")
          .eq("lead_id", lead.id);

        // Fetch full lead data with LinkedIn company info
        const { data: fullLead } = await supabase
          .from("leads")
          .select("*")
          .eq("id", lead.id)
          .single();

        return {
          ...fullLead,
          emails: emails || [],
          linkedin_people: linkedinPeople || [],
        };
      }),
    );

    // Generate filename from run details
    const filename = `leads-run-${runId}`;

    // Export to CSV
    exportLeads(leadsToExport, filename);
  };

  const handleDeepResearchLead = async (
    leadId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation(); // Prevent card click

    const deepKey = `deep-${leadId}`;
    setResearchingLeads((prev) => new Set(prev).add(deepKey));

    try {
      const response = await fetch("/api/inngest/trigger-deep-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, runId }),
      });

      if (!response.ok) {
        throw new Error("Failed to trigger deep research");
      }

      // Status will update via realtime subscription
    } catch (error) {
      console.error("Error triggering deep research:", error);
      alert("Failed to start deep research. Please try again.");
      setResearchingLeads((prev) => {
        const newSet = new Set(prev);
        newSet.delete(deepKey);
        return newSet;
      });
    }
  };

  const handleDeepResearchAll = async () => {
    if (
      !confirm(
        `Start deep research for all ${filteredLeads.length} filtered leads? This will use more tokens but provide comprehensive analysis with web search.`,
      )
    ) {
      return;
    }

    setIsDeepResearchingAll(true);

    try {
      const response = await fetch(
        "/api/inngest/trigger-deep-research-multiple",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId,
            filterGrade: filterGrade === "all" ? undefined : filterGrade,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to trigger deep research");
      }

      alert(`Deep research started for ${filteredLeads.length} leads!`);
    } catch (error) {
      console.error("Error triggering deep research:", error);
      alert("Failed to start deep research. Please try again.");
    } finally {
      setIsDeepResearchingAll(false);
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // Load email counts for all leads
    const loadEmailCounts = async () => {
      const { data } = await supabase
        .from("lead_emails")
        .select("lead_id")
        .in(
          "lead_id",
          leads.map((l) => l.id),
        );

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((email) => {
          counts[email.lead_id] = (counts[email.lead_id] || 0) + 1;
        });
        setEmailCounts(counts);
      }
    };

    // Load LinkedIn people counts for all leads
    const loadLinkedinCounts = async () => {
      const { data } = await supabase
        .from("lead_linkedin_people")
        .select("lead_id")
        .in(
          "lead_id",
          leads.map((l) => l.id),
        );

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((person) => {
          counts[person.lead_id] = (counts[person.lead_id] || 0) + 1;
        });
        setLinkedinPeopleCounts(counts);
      }
    };

    loadEmailCounts();
    loadLinkedinCounts();

    // Subscribe to real-time updates for leads
    const channel = supabase
      .channel(`leads-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLeads((current) => [...current, payload.new as Lead]);
          } else if (payload.eventType === "UPDATE") {
            const updatedLead = payload.new as Lead;
            setLeads((current) =>
              current.map((lead) =>
                lead.id === updatedLead.id ? updatedLead : lead,
              ),
            );

            // Clear "researching" state when research completes, fails, or goes back to pending
            if (
              updatedLead.research_status === "completed" ||
              updatedLead.research_status === "failed" ||
              updatedLead.research_status === "pending"
            ) {
              setResearchingLeads((prev) => {
                const newSet = new Set(prev);
                newSet.delete(updatedLead.id);
                newSet.delete(`deep-${updatedLead.id}`);
                return newSet;
              });
            }
          } else if (payload.eventType === "DELETE") {
            setLeads((current) =>
              current.filter((lead) => lead.id !== payload.old.id),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lead_emails",
        },
        () => {
          // Reload email counts when emails change
          loadEmailCounts();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lead_linkedin_people",
        },
        () => {
          // Reload LinkedIn counts when people change
          loadLinkedinCounts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, leads.length]);

  const filteredLeads = leads.filter((lead) => {
    if (filterGrade === "all") return true;
    return lead.compatibility_grade === filterGrade;
  });

  const hasPendingLeads = leads.some(
    (lead) => lead.research_status === "pending",
  );

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-500">No leads yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Leads will appear here as they are scraped and analyzed
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Filter Buttons */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <FilterButton
            label="All"
            active={filterGrade === "all"}
            onClick={() => setFilterGrade("all")}
          />
          <FilterButton
            label="A"
            active={filterGrade === "A"}
            onClick={() => setFilterGrade("A")}
            color="text-green-600"
          />
          <FilterButton
            label="B"
            active={filterGrade === "B"}
            onClick={() => setFilterGrade("B")}
            color="text-blue-600"
          />
          <FilterButton
            label="C"
            active={filterGrade === "C"}
            onClick={() => setFilterGrade("C")}
            color="text-yellow-600"
          />
          <FilterButton
            label="D"
            active={filterGrade === "D"}
            onClick={() => setFilterGrade("D")}
            color="text-orange-600"
          />
          <FilterButton
            label="F"
            active={filterGrade === "F"}
            onClick={() => setFilterGrade("F")}
            color="text-red-600"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredLeads.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            title="Export filtered leads to CSV"
          >
            📊 Export CSV
          </button>

          <button
            onClick={handleDeepResearchAll}
            disabled={
              filteredLeads.filter((l) => l.research_status === "completed")
                .length === 0 || isDeepResearchingAll
            }
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            title="EXPENSIVE: Deep research WITH web search - Uses more tokens per lead"
          >
            {isDeepResearchingAll ? "Starting..." : "🔬 Deep All ($$)"}
          </button>

          <button
            onClick={handleResearchAll}
            disabled={!hasPendingLeads || isResearchingAll}
            className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            title="CHEAP: Quick analysis without web search - Uses fewer tokens"
          >
            {isResearchingAll ? "Starting..." : "⚡ Quick All ($)"}
          </button>
        </div>
      </div>

      {/* Leads Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLeads.map((lead) => (
          <div
            key={lead.id}
            onClick={() => setSelectedLead(lead)}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-5 cursor-pointer"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-gray-900 text-lg">
                {lead.name}
              </h3>
              {lead.compatibility_grade && (
                <GradeBadge grade={lead.compatibility_grade} />
              )}
            </div>

            {lead.address && (
              <p className="text-sm text-gray-600 mb-2">{lead.address}</p>
            )}

            {lead.phone && (
              <p className="text-sm text-gray-600 mb-2">{lead.phone}</p>
            )}

            {lead.website && (
              <p className="text-sm text-blue-600 mb-2 truncate">
                {lead.website}
              </p>
            )}

            <div className="flex gap-2 mt-3 text-xs">
              {lead.has_multiple_locations && (
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  Multiple Locations
                </span>
              )}
              {lead.team_size && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {lead.team_size}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-2">
                <ResearchStatusBadge status={lead.research_status} />
                {lead.research_depth &&
                  lead.research_status === "completed" && (
                    <ResearchDepthBadge depth={lead.research_depth} />
                  )}
              </div>

              <div className="flex gap-1.5 flex-wrap justify-end">
                {/* Individual Research Button (LIGHTWEIGHT - NO WEB SEARCH) */}
                {lead.research_status === "pending" && (
                  <button
                    onClick={(e) => handleResearchLead(lead.id, e)}
                    disabled={researchingLeads.has(lead.id)}
                    className="px-2.5 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    title="Quick analysis (no web search) - Uses fewer tokens"
                  >
                    {researchingLeads.has(lead.id) ? "..." : "⚡ Quick"}
                  </button>
                )}

                {/* Deep Research Button for Lightweight Researched Leads (EXPENSIVE - WITH WEB SEARCH) */}
                {lead.research_status === "completed" &&
                  lead.research_depth === "lightweight" && (
                    <button
                      onClick={(e) => handleDeepResearchLead(lead.id, e)}
                      disabled={researchingLeads.has(`deep-${lead.id}`)}
                      className="px-2.5 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      title="Comprehensive analysis WITH web search - Uses more tokens"
                    >
                      {researchingLeads.has(`deep-${lead.id}`)
                        ? "..."
                        : "🔬 Deep"}
                    </button>
                  )}

                {/* Re-Research Button for Completed/Failed (RE-SCRAPES + LIGHTWEIGHT) */}
                {(lead.research_status === "completed" ||
                  lead.research_status === "failed") && (
                  <button
                    onClick={(e) => handleReResearchLead(lead.id, e)}
                    disabled={researchingLeads.has(lead.id)}
                    className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    title="Re-scrape website + quick analysis (no web search)"
                  >
                    {researchingLeads.has(lead.id) ? "..." : "🔄 Refresh"}
                  </button>
                )}

                {/* Find Emails Button - Show for researched leads with website */}
                {lead.research_status === "completed" && lead.website && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEmailFinderLead(lead);
                    }}
                    className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                    title="Find business emails"
                  >
                    {emailCounts[lead.id]
                      ? `📧 ${emailCounts[lead.id]}`
                      : "📧 Find"}
                  </button>
                )}

                {/* LinkedIn Company Research Button */}
                {lead.research_status === "completed" && (
                  <button
                    onClick={(e) => handleLinkedInResearch(lead, e)}
                    disabled={researchingLeads.has(`linkedin-${lead.id}`)}
                    className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    title="Research company structure on LinkedIn"
                  >
                    {researchingLeads.has(`linkedin-${lead.id}`)
                      ? "..."
                      : linkedinPeopleCounts[lead.id]
                        ? `💼 ${linkedinPeopleCounts[lead.id]}`
                        : "💼 LinkedIn"}
                  </button>
                )}
              </div>
            </div>

            {lead.error_message && (
              <p className="text-xs text-red-600 mt-2">{lead.error_message}</p>
            )}
          </div>
        ))}
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}

      {/* Email Finder Modal */}
      {emailFinderLead && emailFinderLead.website && (
        <EmailFinderModal
          leadId={emailFinderLead.id}
          leadName={emailFinderLead.name}
          domain={
            new URL(
              emailFinderLead.website.startsWith("http")
                ? emailFinderLead.website
                : `https://${emailFinderLead.website}`,
            ).hostname
          }
          onClose={() => setEmailFinderLead(null)}
        />
      )}

      {/* LinkedIn Company Research Modal */}
      {linkedinLead && (
        <LinkedInCompanyModal
          leadId={linkedinLead.id}
          leadName={linkedinLead.name}
          onClose={() => setLinkedinLead(null)}
        />
      )}

      {/* Quick Research Configuration Modal - Single Lead */}
      {quickResearchLead && (
        <QuickResearchModal
          leadName={quickResearchLead.name}
          onConfirm={(config) =>
            handleQuickResearchConfirm(quickResearchLead, config)
          }
          onCancel={() => setQuickResearchLead(null)}
        />
      )}

      {/* Quick Research Configuration Modal - Batch All */}
      {showQuickResearchAllModal && (
        <QuickResearchModal
          leadName={`ALL ${leads.filter((l) => l.research_status === "pending").length} pending leads`}
          onConfirm={handleQuickResearchAllConfirm}
          onCancel={() => setShowQuickResearchAllModal(false)}
        />
      )}
    </>
  );
}

function FilterButton({
  label,
  active,
  onClick,
  color = "text-gray-700",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : `bg-white ${color} border border-gray-300 hover:bg-gray-50`
      }`}
    >
      {label}
    </button>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: "bg-green-100 text-green-700",
    B: "bg-blue-100 text-blue-700",
    C: "bg-yellow-100 text-yellow-700",
    D: "bg-orange-100 text-orange-700",
    F: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-bold ${
        colors[grade] || colors.F
      }`}
    >
      {grade}
    </span>
  );
}

function ResearchStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700",
    scraping: "bg-blue-100 text-blue-700",
    analyzing: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
        styles[status] || styles.pending
      }`}
    >
      {status}
    </span>
  );
}

function ResearchDepthBadge({ depth }: { depth: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    lightweight: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      label: "⚡",
    },
    deep: {
      bg: "bg-indigo-100",
      text: "text-indigo-700",
      label: "🔬",
    },
  };

  const config = styles[depth] || styles.lightweight;

  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}
      title={
        depth === "lightweight"
          ? "Quick analysis without web search"
          : "Comprehensive analysis with web search"
      }
    >
      {config.label}
    </span>
  );
}
