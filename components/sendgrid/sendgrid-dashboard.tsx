"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SendGridDashboardProps {
  stats: {
    totalSuppressions: number;
    bounces: number;
    unsubscribes: number;
    invalid: number;
    contactedDomains: number;
  };
  recentSyncs: any[];
}

interface Suppression {
  id: string;
  email: string;
  domain: string;
  source: string;
  reason?: string;
  asm_group_name?: string;
  sendgrid_created_at?: string;
  synced_from_sendgrid: boolean;
  created_at: string;
}

interface ContactTracking {
  id: string;
  domain: string;
  first_contacted_at?: string;
  last_contacted_at: string;
  total_contacts: number;
  can_contact_after: string;
  created_at: string;
}

export function SendGridDashboard({
  stats,
  recentSyncs,
}: SendGridDashboardProps) {
  // Feature flag: Enable to show contact tracking features
  // Set to true after importing historical email data via CSV
  const ENABLE_CONTACT_TRACKING = true;

  const [activeTab, setActiveTab] = useState<
    "suppressions" | "contacts" | "syncs"
  >("suppressions");
  const [suppressions, setSuppressions] = useState<Suppression[]>([]);
  const [contacts, setContacts] = useState<ContactTracking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Filters
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch suppressions
  const fetchSuppressions = async () => {
    setIsLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("email_suppression")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (sourceFilter !== "all") {
      query = query.eq("source", sourceFilter);
    }

    if (searchQuery) {
      query = query.or(
        `email.ilike.%${searchQuery}%,domain.ilike.%${searchQuery}%`,
      );
    }

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (!error && data) {
      setSuppressions(data);
      setTotalCount(count || 0);
    }

    setIsLoading(false);
  };

  // Fetch contact tracking
  const fetchContacts = async () => {
    setIsLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("domain_contact_tracking")
      .select("*", { count: "exact" })
      .order("last_contacted_at", { ascending: false });

    if (searchQuery) {
      query = query.ilike("domain", `%${searchQuery}%`);
    }

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (!error && data) {
      setContacts(data);
      setTotalCount(count || 0);
    }

    setIsLoading(false);
  };

  // Fetch data when tab or filters change
  useEffect(() => {
    if (activeTab === "suppressions") {
      fetchSuppressions();
    } else if (activeTab === "contacts") {
      fetchContacts();
    }
  }, [activeTab, sourceFilter, searchQuery, currentPage]);

  // Sync with SendGrid
  const handleSync = async () => {
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

        // Refresh data
        if (activeTab === "suppressions") {
          await fetchSuppressions();
        }

        setTimeout(() => setSyncMessage(null), 5000);
      } else {
        setSyncMessage(`✗ Sync failed: ${data.error}`);
      }
    } catch (error: any) {
      setSyncMessage(`✗ Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div
        className={`grid grid-cols-2 gap-4 ${ENABLE_CONTACT_TRACKING ? "md:grid-cols-5" : "md:grid-cols-4"}`}
      >
        <StatCard
          label="Total Suppressions"
          value={stats.totalSuppressions}
          color="bg-red-100 dark:bg-red-900"
        />
        <StatCard
          label="Bounced"
          value={stats.bounces}
          color="bg-orange-100 dark:bg-orange-900"
        />
        <StatCard
          label="Unsubscribed"
          value={stats.unsubscribes}
          color="bg-yellow-100 dark:bg-yellow-900"
        />
        <StatCard
          label="Invalid"
          value={stats.invalid}
          color="bg-gray-100 dark:bg-gray-700"
        />
        {ENABLE_CONTACT_TRACKING && (
          <StatCard
            label="Contacted Domains"
            value={stats.contactedDomains}
            color="bg-blue-100 dark:bg-blue-900"
          />
        )}
      </div>

      {/* Sync Button */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isSyncing ? "Syncing..." : "🔄 Sync SendGrid"}
          </button>
        </div>
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

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab("suppressions");
              setCurrentPage(1);
            }}
            className={`${
              activeTab === "suppressions"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Suppressions ({stats.totalSuppressions})
          </button>
          {ENABLE_CONTACT_TRACKING && (
            <button
              onClick={() => {
                setActiveTab("contacts");
                setCurrentPage(1);
              }}
              className={`${
                activeTab === "contacts"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Contact Tracking ({stats.contactedDomains})
            </button>
          )}
          <button
            onClick={() => setActiveTab("syncs")}
            className={`${
              activeTab === "syncs"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Sync History
          </button>
        </nav>
      </div>

      {/* Filters */}
      {activeTab !== "syncs" && (
        <div className="flex gap-4 items-center">
          <input
            type="text"
            placeholder={
              activeTab === "suppressions"
                ? "Search by email or domain..."
                : "Search by domain..."
            }
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex-1 max-w-md"
          />

          {activeTab === "suppressions" && (
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Sources</option>
              <option value="bounce">Bounced</option>
              <option value="unsubscribe">Unsubscribed</option>
              <option value="asm_group">ASM Group</option>
              <option value="invalid">Invalid</option>
              <option value="manual">Manual</option>
            </select>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Loading...</p>
        </div>
      ) : (
        <>
          {activeTab === "suppressions" && (
            <SuppressionsTable suppressions={suppressions} />
          )}
          {activeTab === "contacts" && <ContactsTable contacts={contacts} />}
          {activeTab === "syncs" && <SyncHistoryTable syncs={recentSyncs} />}
        </>
      )}

      {/* Pagination */}
      {activeTab !== "syncs" && totalPages > 1 && (
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
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Last
            </button>
          </div>
        </div>
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
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}

function SuppressionsTable({ suppressions }: { suppressions: Suppression[] }) {
  const formatSource = (source: string, asmGroupName?: string) => {
    if (source === "asm_group") {
      return asmGroupName
        ? asmGroupName
            .replace(/^uncategorised-/i, "")
            .charAt(0)
            .toUpperCase() +
            asmGroupName.replace(/^uncategorised-/i, "").slice(1)
        : "ASM Group";
    }
    return source.charAt(0).toUpperCase() + source.slice(1);
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "bounce":
        return "bg-red-100 text-red-700";
      case "unsubscribe":
      case "asm_group":
        return "bg-orange-100 text-orange-700";
      case "invalid":
        return "bg-gray-100 text-gray-700";
      case "manual":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (suppressions.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
        <p className="text-gray-500 dark:text-gray-400">
          No suppressions found
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Domain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Added
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {suppressions.map((suppression) => (
              <tr
                key={suppression.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {suppression.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {suppression.domain}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${getSourceColor(suppression.source)}`}
                  >
                    {formatSource(
                      suppression.source,
                      suppression.asm_group_name,
                    )}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                  {suppression.reason || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(suppression.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContactsTable({ contacts }: { contacts: ContactTracking[] }) {
  if (contacts.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
        <p className="text-gray-500 dark:text-gray-400">
          No contact history found
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Domain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                First Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Total Contacts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Can Contact After
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {contacts.map((contact) => {
              const canContactAfter = new Date(contact.can_contact_after);
              const isOnHold = canContactAfter > new Date();

              return (
                <tr
                  key={contact.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {contact.domain}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {contact.first_contacted_at
                      ? new Date(
                          contact.first_contacted_at,
                        ).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(contact.last_contacted_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {contact.total_contacts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isOnHold ? (
                      <span className="text-xs font-medium px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                        {canContactAfter.toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700">
                        Can Contact
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SyncHistoryTable({ syncs }: { syncs: any[] }) {
  if (syncs.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
        <p className="text-gray-500 dark:text-gray-400">
          No sync history found
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Records Synced
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Errors
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Started At
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {syncs.map((sync) => (
              <tr
                key={sync.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {sync.sync_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      sync.status === "success"
                        ? "bg-green-100 text-green-700"
                        : sync.status === "partial"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {sync.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {sync.records_synced}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {sync.errors_count || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {sync.duration_seconds ? `${sync.duration_seconds}s` : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(sync.started_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
