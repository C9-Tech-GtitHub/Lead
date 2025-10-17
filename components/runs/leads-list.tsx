'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LeadDetailModal } from './lead-detail-modal';
import { EmailFinderModal } from './email-finder-modal';

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
  email_count?: number;
}

interface LeadsListProps {
  initialLeads: Lead[];
  runId: string;
}

export function LeadsList({ initialLeads, runId }: LeadsListProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [emailFinderLead, setEmailFinderLead] = useState<Lead | null>(null);
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [researchingLeads, setResearchingLeads] = useState<Set<string>>(new Set());
  const [isResearchingAll, setIsResearchingAll] = useState(false);
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({});

  const handleResearchLead = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    setResearchingLeads(prev => new Set(prev).add(leadId));

    try {
      const response = await fetch('/api/inngest/trigger-research-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, runId })
      });

      if (!response.ok) {
        throw new Error('Failed to trigger research');
      }

      // Status will update via realtime subscription
    } catch (error) {
      console.error('Error triggering research:', error);
      alert('Failed to start research. Please try again.');
      setResearchingLeads(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  const handleReResearchLead = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (!confirm('Re-research this lead? This will re-scrape the website and update all data including ABN lookup.')) {
      return;
    }

    setResearchingLeads(prev => new Set(prev).add(leadId));

    try {
      const response = await fetch('/api/inngest/trigger-re-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, runId })
      });

      if (!response.ok) {
        throw new Error('Failed to trigger re-research');
      }

      // Status will update via realtime subscription
    } catch (error) {
      console.error('Error triggering re-research:', error);
      alert('Failed to start re-research. Please try again.');
      setResearchingLeads(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  const handleResearchAll = async () => {
    const pendingLeadIds = leads
      .filter((lead) => lead.research_status === 'pending')
      .map((lead) => lead.id);

    if (pendingLeadIds.length === 0) {
      return;
    }

    if (!confirm('Start researching all pending leads in this run?')) {
      return;
    }

    setIsResearchingAll(true);
    setResearchingLeads(prev => {
      const newSet = new Set(prev);
      pendingLeadIds.forEach(id => newSet.add(id));
      return newSet;
    });

    try {
      const response = await fetch('/api/inngest/trigger-research-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger research');
      }

      // Status updates will come through the realtime subscription
    } catch (error) {
      console.error('Error triggering research all:', error);
      alert('Failed to start research. Please try again.');
      setResearchingLeads(prev => {
        const newSet = new Set(prev);
        pendingLeadIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } finally {
      setIsResearchingAll(false);
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // Load email counts for all leads
    const loadEmailCounts = async () => {
      const { data } = await supabase
        .from('lead_emails')
        .select('lead_id')
        .in('lead_id', leads.map(l => l.id));

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((email) => {
          counts[email.lead_id] = (counts[email.lead_id] || 0) + 1;
        });
        setEmailCounts(counts);
      }
    };

    loadEmailCounts();

    // Subscribe to real-time updates for leads
    const channel = supabase
      .channel(`leads-${runId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeads((current) => [...current, payload.new as Lead]);
          } else if (payload.eventType === 'UPDATE') {
            setLeads((current) =>
              current.map((lead) =>
                lead.id === payload.new.id ? (payload.new as Lead) : lead
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setLeads((current) =>
              current.filter((lead) => lead.id !== payload.old.id)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_emails',
        },
        () => {
          // Reload email counts when emails change
          loadEmailCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, leads.length]);

  const filteredLeads = leads.filter((lead) => {
    if (filterGrade === 'all') return true;
    return lead.compatibility_grade === filterGrade;
  });

  const hasPendingLeads = leads.some((lead) => lead.research_status === 'pending');

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
            active={filterGrade === 'all'}
            onClick={() => setFilterGrade('all')}
          />
          <FilterButton
            label="A"
            active={filterGrade === 'A'}
            onClick={() => setFilterGrade('A')}
            color="text-green-600"
          />
          <FilterButton
            label="B"
            active={filterGrade === 'B'}
            onClick={() => setFilterGrade('B')}
            color="text-blue-600"
          />
          <FilterButton
            label="C"
            active={filterGrade === 'C'}
            onClick={() => setFilterGrade('C')}
            color="text-yellow-600"
          />
          <FilterButton
            label="D"
            active={filterGrade === 'D'}
            onClick={() => setFilterGrade('D')}
            color="text-orange-600"
          />
          <FilterButton
            label="F"
            active={filterGrade === 'F'}
            onClick={() => setFilterGrade('F')}
            color="text-red-600"
          />
        </div>

        <button
          onClick={handleResearchAll}
          disabled={!hasPendingLeads || isResearchingAll}
          className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
          title="Research all pending leads"
        >
          {isResearchingAll ? 'Starting...' : '🔬 Research All'}
        </button>
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
              <h3 className="font-semibold text-gray-900 text-lg">{lead.name}</h3>
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
              <p className="text-sm text-blue-600 mb-2 truncate">{lead.website}</p>
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
              <ResearchStatusBadge status={lead.research_status} />

              <div className="flex gap-2">
                {/* Individual Research Button */}
                {lead.research_status === 'pending' && (
                  <button
                    onClick={(e) => handleResearchLead(lead.id, e)}
                    disabled={researchingLeads.has(lead.id)}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {researchingLeads.has(lead.id) ? 'Starting...' : 'Research'}
                  </button>
                )}

                {/* Re-Research Button for Completed/Failed */}
                {(lead.research_status === 'completed' || lead.research_status === 'failed') && (
                  <button
                    onClick={(e) => handleReResearchLead(lead.id, e)}
                    disabled={researchingLeads.has(lead.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    title="Re-scrape website and update all data"
                  >
                    {researchingLeads.has(lead.id) ? 'Re-researching...' : '🔄 Re-research'}
                  </button>
                )}

                {/* Find Emails Button - Show for researched leads with website */}
                {lead.research_status === 'completed' && lead.website && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEmailFinderLead(lead);
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                    title="Find business emails"
                  >
                    📧 {emailCounts[lead.id] ? `Emails (${emailCounts[lead.id]})` : 'Find Emails'}
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
          domain={new URL(emailFinderLead.website.startsWith('http') ? emailFinderLead.website : `https://${emailFinderLead.website}`).hostname}
          onClose={() => setEmailFinderLead(null)}
        />
      )}
    </>
  );
}

function FilterButton({
  label,
  active,
  onClick,
  color = 'text-gray-700',
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
          ? 'bg-blue-600 text-white'
          : `bg-white ${color} border border-gray-300 hover:bg-gray-50`
      }`}
    >
      {label}
    </button>
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
      {grade}
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
      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
        styles[status] || styles.pending
      }`}
    >
      {status}
    </span>
  );
}
