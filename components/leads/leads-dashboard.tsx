"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { exportSalesLeads, exportAllEmails } from "@/lib/export/sales-csv";
import { LeadDetailModal } from "../runs/lead-detail-modal";
import BulkEmailFinderModal from "./bulk-email-finder-modal";

interface Lead {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
  industry?: string;
  review_count?: number;
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
  lead_status: string;
  is_client: boolean;
  created_at: string;
  // SendGrid email tracking
  email_status?: string;
  email_domain?: string;
  last_email_sent_at?: string;
  suppression?: Array<{
    email: string;
    source: string;
    reason: string;
    asm_group_name?: string;
  }> | null;
  contactHistory?: {
    last_contacted_at: string;
    can_contact_after: string;
  } | null;
  // AI email search tracking
  ai_email_searched_at?: string;
  ai_email_search_summary?: string;
  run?: {
    id: string;
    business_type: string;
    location: string;
    created_at: string;
  };
}

interface Run {
  id: string;
  business_type: string;
  location: string;
  created_at: string;
  leadCount: number;
}

interface LeadsDashboardProps {
  totalCount: number;
  statusCounts: Record<string, number>;
  runs: Run[];
}

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700" },
  {
    value: "not_eligible",
    label: "Not Eligible",
    color: "bg-gray-100 text-gray-700",
  },
  {
    value: "ready_to_send",
    label: "Ready to Send",
    color: "bg-green-100 text-green-700",
  },
  {
    value: "bulk_sent",
    label: "Bulk Sent",
    color: "bg-purple-100 text-purple-700",
  },
  {
    value: "manual_followup",
    label: "Manual Follow-up",
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    value: "do_not_contact",
    label: "Do Not Contact",
    color: "bg-red-100 text-red-700",
  },
  {
    value: "converted",
    label: "Converted",
    color: "bg-indigo-100 text-indigo-700",
  },
];

export function LeadsDashboard({
  totalCount: initialTotalCount,
  statusCounts: initialStatusCounts,
  runs,
}: LeadsDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [gradeRangeFilter, setGradeRangeFilter] = useState<string>("all");
  const [runFilter, setRunFilter] = useState<string>("all");
  const [emailStatusFilter, setEmailStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [emailTypeFilter, setEmailTypeFilter] = useState<string>("all");
  const [emailEligibilityFilter, setEmailEligibilityFilter] =
    useState<string>("all");
  const [aiSearchedNoEmails, setAiSearchedNoEmails] = useState<string>("all");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectedRuns, setSelectedRuns] = useState<Set<string>>(new Set());
  const [showRunSelector, setShowRunSelector] = useState(false);
  const [hideDuplicates, setHideDuplicates] = useState(true);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showBulkEmailFinder, setShowBulkEmailFinder] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState(initialStatusCounts);

  // Statistics
  const stats = {
    total: totalCount,
    new: statusCounts["new"] || 0,
    readyToSend: statusCounts["ready_to_send"] || 0,
    bulkSent: statusCounts["bulk_sent"] || 0,
    manualFollowup: statusCounts["manual_followup"] || 0,
    converted: statusCounts["converted"] || 0,
    notEligible: statusCounts["not_eligible"] || 0,
  };

  // Fetch leads from API
  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      // Determine run filter value
      let runFilterValue = runFilter;
      if (selectedRuns.size > 0) {
        runFilterValue = Array.from(selectedRuns).join(",");
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        status: statusFilter,
        grade: gradeFilter,
        gradeRange: gradeRangeFilter,
        run: runFilterValue,
        emailStatus: emailStatusFilter,
        search: searchQuery,
        emailType: emailTypeFilter,
        emailEligibility: emailEligibilityFilter,
        aiSearchedNoEmails: aiSearchedNoEmails,
        sortField: sortField,
        sortDirection: sortDirection,
      });

      const response = await fetch(`/api/leads?${params}`);
      const data = await response.json();

      if (response.ok) {
        let fetchedLeads = data.leads;

        // Apply client-side duplicate detection if multiple runs selected
        if (selectedRuns.size > 1 && hideDuplicates) {
          fetchedLeads = removeDuplicateLeads(fetchedLeads);
        }

        setLeads(fetchedLeads);
        setEmailCounts(data.emailCounts);
        setTotalCount(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove duplicate leads based on website domain or name
  const removeDuplicateLeads = (leads: Lead[]): Lead[] => {
    const seen = new Map<string, Lead>();

    leads.forEach((lead) => {
      // Create a key based on website domain (preferred) or normalized name
      let key: string;
      if (lead.website) {
        // Extract domain from website
        try {
          const url = new URL(
            lead.website.startsWith("http")
              ? lead.website
              : `https://${lead.website}`,
          );
          key = url.hostname.replace(/^www\./, "").toLowerCase();
        } catch {
          key = lead.website.toLowerCase();
        }
      } else {
        // Use normalized name if no website
        key = lead.name.toLowerCase().trim();
      }

      // Keep the newest version (already sorted by created_at)
      if (!seen.has(key)) {
        seen.set(key, lead);
      }
    });

    return Array.from(seen.values());
  };

  // Toggle sort field/direction
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to ascending (except created_at)
      setSortField(field);
      setSortDirection(field === "created_at" ? "desc" : "asc");
    }
  };

  // Merge multiple runs
  const handleMergeRuns = async () => {
    if (selectedRuns.size < 2) {
      alert("Please select at least 2 runs to merge");
      return;
    }

    const selectedRunsData = runs.filter((r) => selectedRuns.has(r.id));
    const runNames = selectedRunsData
      .map((r) => `• ${r.business_type} - ${r.location} (${r.leadCount} leads)`)
      .join("\n");
    const totalLeadsBeforeMerge = selectedRunsData.reduce(
      (sum, r) => sum + r.leadCount,
      0,
    );

    const message = `Merge ${selectedRuns.size} runs into a single combined run?\n\n${runNames}\n\nTotal leads: ${totalLeadsBeforeMerge}\n${hideDuplicates ? "\n⚠️ Duplicates will be automatically removed" : "\n⚠️ All leads will be kept (including duplicates)"}`;

    if (!confirm(message)) return;

    setIsMerging(true);

    try {
      const response = await fetch("/api/runs/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runIds: Array.from(selectedRuns),
          removeDuplicates: hideDuplicates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to merge runs");
      }

      // Show success message
      const successMsg = `✅ Runs merged successfully!\n\nNew run: ${data.mergedRun.name}\nTotal leads: ${data.mergedRun.totalLeads}\n${data.mergedRun.duplicatesRemoved > 0 ? `Duplicates removed: ${data.mergedRun.duplicatesRemoved}` : "No duplicates found"}`;
      alert(successMsg);

      // Refresh the page to show new merged run
      window.location.reload();
    } catch (error: any) {
      console.error("Merge error:", error);
      alert(`Failed to merge runs: ${error.message}`);
    } finally {
      setIsMerging(false);
    }
  };

  // Refresh stats
  const refreshStats = async () => {
    const supabase = createClient();
    const { data: statusData } = await supabase
      .from("leads")
      .select("lead_status");

    if (statusData) {
      const counts: Record<string, number> = {};
      statusData.forEach((lead: any) => {
        counts[lead.lead_status] = (counts[lead.lead_status] || 0) + 1;
      });
      setStatusCounts(counts);
    }
  };

  // Fetch leads when filters or page changes
  useEffect(() => {
    fetchLeads();
  }, [
    currentPage,
    pageSize,
    statusFilter,
    gradeFilter,
    gradeRangeFilter,
    runFilter,
    emailStatusFilter,
    searchQuery,
    emailTypeFilter,
    emailEligibilityFilter,
    aiSearchedNoEmails,
    selectedRuns,
    hideDuplicates,
    sortField,
    sortDirection,
  ]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [
    statusFilter,
    gradeFilter,
    gradeRangeFilter,
    runFilter,
    emailStatusFilter,
    searchQuery,
    emailTypeFilter,
    emailEligibilityFilter,
    aiSearchedNoEmails,
    selectedRuns,
    hideDuplicates,
    sortField,
    sortDirection,
  ]);

  // Toggle lead selection
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  // Select all on current page
  const selectAllOnPage = () => {
    setSelectedLeads(new Set(leads.map((l) => l.id)));
  };

  // Select all on current page that have a website domain
  const selectAllWithDomain = () => {
    setSelectedLeads(new Set(leads.filter((l) => l.website).map((l) => l.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedLeads(new Set());
  };

  // Bulk update status
  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedLeads.size === 0) return;

    const confirmed = confirm(
      `Update ${selectedLeads.size} lead(s) to status: ${STATUS_OPTIONS.find((s) => s.value === newStatus)?.label}?`,
    );

    if (!confirmed) return;

    const supabase = createClient();
    const leadIds = Array.from(selectedLeads);

    try {
      const { error } = await supabase
        .from("leads")
        .update({ lead_status: newStatus })
        .in("id", leadIds);

      if (error) throw error;

      // Refresh data
      await fetchLeads();
      await refreshStats();
      clearSelection();
      alert(`Successfully updated ${leadIds.length} lead(s)`);
    } catch (error) {
      console.error("Error updating leads:", error);
      alert("Failed to update leads. Please try again.");
    }
  };

  // Update single lead status
  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("leads")
        .update({ lead_status: newStatus })
        .eq("id", leadId);

      if (error) throw error;

      // Update local state
      setLeads((current) =>
        current.map((lead) =>
          lead.id === leadId ? { ...lead, lead_status: newStatus } : lead,
        ),
      );

      // Refresh stats
      await refreshStats();
    } catch (error) {
      console.error("Error updating lead status:", error);
      alert("Failed to update lead status. Please try again.");
    }
  };

  // Sync SendGrid data
  const handleSendGridSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch("/api/sendgrid/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        const totalSynced =
          data.results.bounces.synced + data.results.unsubscribes.synced;
        setSyncMessage(
          `✓ Synced ${totalSynced} email status updates from SendGrid`,
        );

        // Refresh leads to show updated statuses
        await fetchLeads();

        // Clear message after 5 seconds
        setTimeout(() => setSyncMessage(null), 5000);
      } else {
        setSyncMessage(`✗ Sync failed: ${data.error}`);
      }
    } catch (error: any) {
      console.error("SendGrid sync error:", error);
      setSyncMessage(`✗ Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Export to CSV (all filtered leads, not just current page)
  const handleExport = async () => {
    setIsExporting(true);

    try {
      const supabase = createClient();

      // Build query for ALL filtered leads (not just current page)
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10000); // Cap at 10k for export

      if (statusFilter !== "all") {
        query = query.eq("lead_status", statusFilter);
      }
      if (gradeFilter !== "all") {
        query = query.eq("compatibility_grade", gradeFilter);
      }
      if (runFilter !== "all") {
        query = query.eq("run_id", runFilter);
      }
      if (emailStatusFilter !== "all") {
        query = query.eq("email_status", emailStatusFilter);
      }

      const { data: exportLeads } = await query;

      if (!exportLeads || exportLeads.length === 0) {
        alert("No leads to export");
        return;
      }

      // Fetch emails for all leads
      const leadIds = exportLeads.map((l) => l.id);
      const { data: emails } = await supabase
        .from("lead_emails")
        .select("*")
        .in("lead_id", leadIds);

      // Group emails by lead
      const emailsByLead: Record<string, any[]> = {};
      emails?.forEach((email) => {
        if (!emailsByLead[email.lead_id]) {
          emailsByLead[email.lead_id] = [];
        }
        emailsByLead[email.lead_id].push(email);
      });

      // Add emails to leads
      const leadsWithEmails = exportLeads.map((lead) => ({
        ...lead,
        emails: emailsByLead[lead.id] || [],
      }));

      // Export to CSV
      const statusLabel =
        statusFilter !== "all"
          ? STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label
          : undefined;
      exportSalesLeads(leadsWithEmails, statusLabel);

      alert(`Exported ${leadsWithEmails.length} leads to CSV`);
    } catch (error) {
      console.error("Error exporting leads:", error);
      alert("Failed to export leads. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Export all emails with full details
  const handleExportAllEmails = async () => {
    setIsExporting(true);

    try {
      const supabase = createClient();

      // Build query for ALL filtered leads (not just current page)
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10000); // Cap at 10k for export

      if (statusFilter !== "all") {
        query = query.eq("lead_status", statusFilter);
      }
      if (gradeFilter !== "all") {
        query = query.eq("compatibility_grade", gradeFilter);
      }
      if (runFilter !== "all") {
        query = query.eq("run_id", runFilter);
      }
      if (emailStatusFilter !== "all") {
        query = query.eq("email_status", emailStatusFilter);
      }

      const { data: exportLeads } = await query;

      if (!exportLeads || exportLeads.length === 0) {
        alert("No leads to export");
        return;
      }

      // Fetch emails for all leads
      const leadIds = exportLeads.map((l) => l.id);
      const { data: emails } = await supabase
        .from("lead_emails")
        .select("*")
        .in("lead_id", leadIds)
        .order("confidence", { ascending: false });

      // Group emails by lead
      const emailsByLead: Record<string, any[]> = {};
      emails?.forEach((email) => {
        if (!emailsByLead[email.lead_id]) {
          emailsByLead[email.lead_id] = [];
        }
        emailsByLead[email.lead_id].push(email);
      });

      // Add emails to leads
      const leadsWithEmails = exportLeads.map((lead) => ({
        ...lead,
        emails: emailsByLead[lead.id] || [],
      }));

      // Count total emails
      const totalEmails = emails?.length || 0;

      // Export to CSV with all email details
      const statusLabel =
        statusFilter !== "all"
          ? STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label
          : undefined;
      exportAllEmails(leadsWithEmails, statusLabel);

      alert(
        `Exported ${totalEmails} emails from ${leadsWithEmails.length} leads to CSV`,
      );
    } catch (error) {
      console.error("Error exporting emails:", error);
      alert("Failed to export emails. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          color="bg-gray-100 dark:bg-gray-700"
        />
        <StatCard
          label="New"
          value={stats.new}
          color="bg-blue-100 dark:bg-blue-900"
        />
        <StatCard
          label="Ready"
          value={stats.readyToSend}
          color="bg-green-100 dark:bg-green-900"
        />
        <StatCard
          label="Sent"
          value={stats.bulkSent}
          color="bg-purple-100 dark:bg-purple-900"
        />
        <StatCard
          label="Follow-up"
          value={stats.manualFollowup}
          color="bg-yellow-100 dark:bg-yellow-900"
        />
        <StatCard
          label="Converted"
          value={stats.converted}
          color="bg-indigo-100 dark:bg-indigo-900"
        />
        <StatCard
          label="Not Eligible"
          value={stats.notEligible}
          color="bg-gray-100 dark:bg-gray-700"
        />
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by company name, website, city, or industry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Preset Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 mr-2">
            Quick Filters:
          </span>
          <button
            onClick={() => {
              setStatusFilter("all");
              setGradeFilter("all");
              setEmailStatusFilter("valid");
              setEmailTypeFilter("personal");
              setEmailEligibilityFilter("eligible");
              setRunFilter("all");
            }}
            className="px-3 py-1 bg-green-600 dark:bg-green-700 text-white rounded text-xs font-medium hover:bg-green-700 dark:hover:bg-green-600"
          >
            ✓ All Valid Leads
          </button>
          <button
            onClick={() => {
              setStatusFilter("new");
              setEmailEligibilityFilter("eligible");
              setEmailTypeFilter("personal");
              setEmailStatusFilter("all");
            }}
            className="px-3 py-1 bg-emerald-600 dark:bg-emerald-700 text-white rounded text-xs font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600"
            title="Has emails, never contacted, not suppressed, not on hold"
          >
            🎯 Ready to Contact
          </button>
          <button
            onClick={() => {
              setEmailEligibilityFilter("eligible");
              setStatusFilter("new");
            }}
            className="px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded text-xs font-medium hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            📧 Never Sent
          </button>
          <button
            onClick={() => {
              setEmailTypeFilter("personal");
            }}
            className="px-3 py-1 bg-purple-600 dark:bg-purple-700 text-white rounded text-xs font-medium hover:bg-purple-700 dark:hover:bg-purple-600"
          >
            👤 Non-Generic Emails
          </button>
          <button
            onClick={() => {
              setGradeFilter("all");
              setGradeRangeFilter("A-B");
            }}
            className="px-3 py-1 bg-yellow-600 dark:bg-yellow-700 text-white rounded text-xs font-medium hover:bg-yellow-700 dark:hover:bg-yellow-600"
          >
            ⭐ Grade A or B
          </button>
          <button
            onClick={() => {
              // Show leads that were searched by AI but no emails were found
              setAiSearchedNoEmails("true");
            }}
            className="px-3 py-1 bg-amber-600 dark:bg-amber-700 text-white rounded text-xs font-medium hover:bg-amber-700 dark:hover:bg-amber-600"
            title="Show leads where AI searched but found no email addresses"
          >
            🔍 Searched - No Emails
          </button>
          <button
            onClick={() => {
              setStatusFilter("all");
              setGradeFilter("all");
              setGradeRangeFilter("all");
              setRunFilter("all");
              setEmailStatusFilter("all");
              setSearchQuery("");
              setEmailTypeFilter("all");
              setEmailEligibilityFilter("all");
              setAiSearchedNoEmails("all");
            }}
            className="px-3 py-1 bg-gray-600 dark:bg-gray-700 text-white rounded text-xs font-medium hover:bg-gray-700 dark:hover:bg-gray-600"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-start justify-between">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Run:
              </label>
              {!showRunSelector ? (
                <div className="flex gap-2">
                  <select
                    value={runFilter}
                    onChange={(e) => setRunFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm min-w-[200px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
                  >
                    <option value="all">All Runs ({totalCount})</option>
                    {runs.map((run) => (
                      <option key={run.id} value={run.id}>
                        {run.business_type} - {run.location} ({run.leadCount})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setShowRunSelector(true);
                      setSelectedRuns(new Set());
                      setRunFilter("all");
                    }}
                    className="px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600"
                    title="Select multiple runs and merge/deduplicate"
                  >
                    Multi-Select
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 p-3 border border-blue-300 dark:border-blue-600 rounded-md bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {selectedRuns.size === 0
                        ? "Select runs to merge:"
                        : `${selectedRuns.size} runs selected`}
                    </span>
                    <div className="flex gap-2 items-center">
                      {selectedRuns.size > 1 && (
                        <>
                          <label className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-100">
                            <input
                              type="checkbox"
                              checked={hideDuplicates}
                              onChange={(e) =>
                                setHideDuplicates(e.target.checked)
                              }
                              className="h-4 w-4 text-blue-600 rounded"
                            />
                            Remove Duplicates
                          </label>
                          <button
                            onClick={handleMergeRuns}
                            disabled={isMerging}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            title="Merge selected runs into one combined run in database"
                          >
                            {isMerging ? "⏳ Merging..." : "🔗 Merge Runs"}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setShowRunSelector(false);
                          setSelectedRuns(new Set());
                        }}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {runs.map((run) => (
                      <label
                        key={run.id}
                        className="flex items-start gap-2 text-sm cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/30 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRuns.has(run.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedRuns);
                            if (e.target.checked) {
                              newSet.add(run.id);
                            } else {
                              newSet.delete(run.id);
                            }
                            setSelectedRuns(newSet);
                          }}
                          className="h-4 w-4 text-blue-600 rounded mt-0.5"
                        />
                        <span className="text-blue-900 dark:text-blue-100">
                          {run.business_type} - {run.location} ({run.leadCount})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Status:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
              >
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Grade:
              </label>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
              >
                <option value="all">All Grades</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="F">F</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Email Status:
              </label>
              <select
                value={emailStatusFilter}
                onChange={(e) => setEmailStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
              >
                <option value="all">All Email Statuses</option>
                <option value="unknown">Unknown</option>
                <option value="valid">Valid</option>
                <option value="suppressed">Suppressed</option>
                <option value="bounced">Bounced</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="invalid">Invalid</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Email Type:
              </label>
              <select
                value={emailTypeFilter}
                onChange={(e) => setEmailTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
              >
                <option value="all">All Types</option>
                <option value="personal">Personal Only</option>
                <option value="generic">Generic Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Eligibility:
              </label>
              <select
                value={emailEligibilityFilter}
                onChange={(e) => setEmailEligibilityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
              >
                <option value="all">All Leads</option>
                <option value="eligible">Eligible to Send</option>
                <option value="not_eligible">Not Eligible</option>
              </select>
            </div>

            {(runFilter !== "all" ||
              statusFilter !== "all" ||
              gradeFilter !== "all" ||
              gradeRangeFilter !== "all" ||
              emailStatusFilter !== "all" ||
              emailTypeFilter !== "all" ||
              emailEligibilityFilter !== "all" ||
              aiSearchedNoEmails !== "all") && (
              <button
                onClick={() => {
                  setRunFilter("all");
                  setStatusFilter("all");
                  setGradeFilter("all");
                  setGradeRangeFilter("all");
                  setEmailStatusFilter("all");
                  setEmailTypeFilter("all");
                  setEmailEligibilityFilter("all");
                  setAiSearchedNoEmails("all");
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
              >
                Clear Filters
              </button>
            )}

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Per Page:
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkEmailFinder(true)}
              disabled={selectedLeads.size === 0}
              className="px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-md text-sm font-medium hover:bg-purple-700 dark:hover:bg-purple-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              title="Find emails for selected leads using Hunter.io"
            >
              📧 Find Emails ({selectedLeads.size})
            </button>
            <button
              onClick={handleSendGridSync}
              disabled={isSyncing}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              title="Sync bounce and unsubscribe data from SendGrid"
            >
              {isSyncing ? "Syncing..." : "🔄 Sync SendGrid"}
            </button>
            <button
              onClick={handleExport}
              disabled={totalCount === 0 || isExporting}
              className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-md text-sm font-medium hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isExporting ? "Exporting..." : `📊 Export (${totalCount})`}
            </button>
            <button
              onClick={handleExportAllEmails}
              disabled={totalCount === 0 || isExporting}
              className="px-4 py-2 bg-teal-600 dark:bg-teal-700 text-white rounded-md text-sm font-medium hover:bg-teal-700 dark:hover:bg-teal-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              title="Export all discovered emails with full details (one row per email)"
            >
              {isExporting ? "Exporting..." : `📧 Export All Emails`}
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedLeads.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedLeads.size} selected
                </span>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline"
                >
                  Clear
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Bulk Update:
                </span>
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => bulkUpdateStatus(status.value)}
                    className={`px-3 py-1 rounded text-xs font-medium ${status.color} hover:opacity-80`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Select All on Page */}
        {leads.length > 0 && (
          <div className="mt-2 flex items-center gap-4">
            <button
              onClick={selectAllOnPage}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              Select all {leads.length} on this page
            </button>
            <button
              onClick={selectAllWithDomain}
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 underline"
            >
              Select all with website ({leads.filter((l) => l.website).length})
            </button>
          </div>
        )}
      </div>

      {/* Sync Message */}
      {syncMessage && (
        <div
          className={`p-4 rounded-lg ${
            syncMessage.startsWith("✓")
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
          }`}
        >
          {syncMessage}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Loading leads...
          </p>
        </div>
      )}

      {/* Leads Table */}
      {!isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="w-12 px-4 py-3"></th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Company
                      {sortField === "name" && (
                        <span className="text-blue-600 dark:text-blue-400">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Industry
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                    onClick={() => handleSort("grade")}
                  >
                    <div className="flex items-center gap-1">
                      Grade
                      {sortField === "grade" && (
                        <span className="text-blue-600 dark:text-blue-400">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Emails
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email Status
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                    onClick={() => handleSort("last_sent")}
                  >
                    <div className="flex items-center gap-1">
                      Last Sent
                      {sortField === "last_sent" && (
                        <span className="text-blue-600 dark:text-blue-400">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Run
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedLeads.has(lead.id) ? "bg-blue-50 dark:bg-blue-900" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedLeads.has(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </td>
                    <td
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {lead.name}
                      </div>
                      {lead.website && (
                        <div className="text-sm text-blue-600 dark:text-blue-400 truncate max-w-xs">
                          {lead.website}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {lead.city && lead.state
                          ? `${lead.city}, ${lead.state}`
                          : lead.city || lead.state || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {lead.industry || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.compatibility_grade && (
                        <GradeBadge grade={lead.compatibility_grade} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {emailCounts[lead.id] || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <EmailStatusBadge lead={lead} />
                    </td>
                    <td className="px-4 py-3">
                      <LastSentDate lead={lead} />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.lead_status}
                        onChange={(e) =>
                          updateLeadStatus(lead.id, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs font-medium px-2 py-1 rounded border-0 ${
                          STATUS_OPTIONS.find(
                            (s) => s.value === lead.lead_status,
                          )?.color || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {lead.run?.business_type || "-"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {lead.run?.location || "-"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {leads.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No leads found</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing{" "}
            <span className="font-medium">
              {(currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(currentPage * pageSize, totalCount)}
            </span>{" "}
            of <span className="font-medium">{totalCount}</span> results
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}

      {/* Bulk Email Finder Modal */}
      {showBulkEmailFinder && (
        <BulkEmailFinderModal
          leadIds={Array.from(selectedLeads)}
          onClose={() => setShowBulkEmailFinder(false)}
          onComplete={() => {
            fetchLeads(); // Refresh the leads list to show updated email counts
            setEmailCounts({}); // Clear and refresh email counts
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`${color} rounded-lg p-4`}>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
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
      className={`inline-block px-2 py-1 rounded text-xs font-bold ${
        colors[grade] || colors.F
      }`}
    >
      {grade}
    </span>
  );
}

function LastSentDate({ lead }: { lead: Lead }) {
  // Get last contacted date from multiple sources
  const lastSentAt =
    lead.last_email_sent_at || lead.contactHistory?.last_contacted_at;

  if (!lastSentAt) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">Never</span>
    );
  }

  const date = new Date(lastSentAt);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Format the date
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });

  // Show relative time if recent
  let relativeTime = "";
  if (diffDays === 0) {
    relativeTime = "Today";
  } else if (diffDays === 1) {
    relativeTime = "Yesterday";
  } else if (diffDays < 7) {
    relativeTime = `${diffDays}d ago`;
  } else if (diffDays < 30) {
    relativeTime = `${Math.floor(diffDays / 7)}w ago`;
  } else if (diffDays < 365) {
    relativeTime = `${Math.floor(diffDays / 30)}mo ago`;
  } else {
    relativeTime = `${Math.floor(diffDays / 365)}y ago`;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
        {relativeTime}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {formattedDate}
      </span>
    </div>
  );
}

function EmailStatusBadge({ lead }: { lead: Lead }) {
  // Check if suppressed
  const isSuppressed = lead.suppression && lead.suppression.length > 0;

  // Check if recently contacted (within 6 months)
  const isRecentlyContacted =
    lead.contactHistory &&
    new Date(lead.contactHistory.can_contact_after) > new Date();

  // Get last contacted date
  const lastContacted = lead.last_email_sent_at
    ? new Date(lead.last_email_sent_at).toLocaleDateString()
    : lead.contactHistory?.last_contacted_at
      ? new Date(lead.contactHistory.last_contacted_at).toLocaleDateString()
      : null;

  if (isSuppressed) {
    const suppression = lead.suppression![0];
    const isUnsubscribe =
      suppression.source === "unsubscribe" ||
      suppression.source === "asm_group";

    // Format the group name to be more readable
    const formatGroupName = (name?: string) => {
      if (!name) return "Group";
      // Remove "uncategorised-" prefix and capitalize
      const cleaned = name.replace(/^uncategorised-/i, "");
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    };

    return (
      <div className="flex flex-col gap-1">
        <span
          className={`inline-block px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
            isUnsubscribe
              ? "bg-orange-100 text-orange-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {isUnsubscribe ? "📭 Unsubscribed" : "🚫 Suppressed"}
        </span>
        <span
          className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]"
          title={suppression.reason || suppression.source}
        >
          {suppression.source === "manual"
            ? "Manual"
            : suppression.source === "bounce"
              ? "Bounced"
              : suppression.source === "unsubscribe"
                ? "Global"
                : suppression.source === "asm_group"
                  ? formatGroupName(suppression.asm_group_name)
                  : suppression.source}
        </span>
      </div>
    );
  }

  if (isRecentlyContacted) {
    const canContactDate = new Date(
      lead.contactHistory!.can_contact_after,
    ).toLocaleDateString();
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-700">
          ⏳ On Hold
        </span>
        <span
          className="text-xs text-gray-500 dark:text-gray-400"
          title={`Can contact after ${canContactDate}`}
        >
          Until {canContactDate}
        </span>
        {lastContacted && (
          <span className="text-xs text-gray-400">Last: {lastContacted}</span>
        )}
      </div>
    );
  }

  if (lastContacted) {
    return (
      <div className="flex flex-col gap-1">
        <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">
          📧 Contacted
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {lastContacted}
        </span>
      </div>
    );
  }

  // Check if AI searched but found no emails
  if (lead.ai_email_searched_at && lead.ai_email_search_summary) {
    return (
      <div className="flex flex-col gap-1">
        <span
          className="inline-block px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700 cursor-help"
          title={lead.ai_email_search_summary}
        >
          🔍 Searched - No Emails
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(lead.ai_email_searched_at).toLocaleDateString()}
        </span>
      </div>
    );
  }

  // Safe to contact
  return (
    <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">
      ✓ Can Contact
    </span>
  );
}
