'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import LeadsMap to avoid SSR issues with Leaflet
const LeadsMap = dynamic(() => import('./leads-map').then(mod => ({ default: mod.LeadsMap })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">Loading map...</div>
    </div>
  )
});

interface Run {
  id: string;
  business_type: string;
  location: string;
  status: string;
  total_leads: number;
  created_at: string;
  grade_a_count: number;
  grade_b_count: number;
  grade_c_count: number;
  grade_d_count: number;
  grade_f_count: number;
}

interface Lead {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  google_maps_url?: string;
  latitude?: number;
  longitude?: number;
  compatibility_grade?: string;
  grade_reasoning?: string;
  research_status: string;
  has_multiple_locations?: boolean;
  team_size?: string;
  run_id: string;
  ai_report?: string;
  suggested_hooks?: string[];
  pain_points?: string[];
  opportunities?: string[];
  created_at: string;
}

interface LeadsMapWithSidebarProps {
  runs: Run[];
  leads: Lead[];
}

export function LeadsMapWithSidebar({ runs, leads }: LeadsMapWithSidebarProps) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Filter leads based on selected run
  const filteredLeads = selectedRunId
    ? leads.filter((lead) => lead.run_id === selectedRunId)
    : leads;

  const leadsWithCoordinates = filteredLeads.filter(
    (lead) => lead.latitude && lead.longitude
  );

  const handleMarkerClick = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setSelectedLead(lead);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Your Runs</h2>
          <p className="text-sm text-gray-600">
            Filter leads by run or view all
          </p>
        </div>

        {/* All Leads Option */}
        <button
          onClick={() => setSelectedRunId(null)}
          className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
            selectedRunId === null ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
          }`}
        >
          <div className="font-semibold text-gray-900">All Leads</div>
          <div className="text-sm text-gray-600 mt-1">
            {leads.length} total leads
          </div>
        </button>

        {/* Run List */}
        {runs.map((run) => {
          const runLeads = leads.filter((l) => l.run_id === run.id);
          const runLeadsWithCoords = runLeads.filter((l) => l.latitude && l.longitude);

          return (
            <button
              key={run.id}
              onClick={() => setSelectedRunId(run.id)}
              className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                selectedRunId === run.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="font-semibold text-gray-900">{run.business_type}</div>
              <div className="text-sm text-gray-600 mt-1">{run.location}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {runLeadsWithCoords.length} on map
                </span>
                {run.status === 'completed' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                    Completed
                  </span>
                )}
                {run.status === 'researching' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                    In Progress
                  </span>
                )}
              </div>
              {run.status === 'completed' && (
                <div className="flex gap-1 mt-2">
                  {run.grade_a_count > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-500 text-white">
                      A:{run.grade_a_count}
                    </span>
                  )}
                  {run.grade_b_count > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500 text-white">
                      B:{run.grade_b_count}
                    </span>
                  )}
                  {run.grade_c_count > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500 text-white">
                      C:{run.grade_c_count}
                    </span>
                  )}
                  {run.grade_d_count > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500 text-white">
                      D:{run.grade_d_count}
                    </span>
                  )}
                  {run.grade_f_count > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500 text-white">
                      F:{run.grade_f_count}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}

        {runs.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">No runs yet</p>
            <Link
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
            >
              Create your first run
            </Link>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {/* Legend */}
        <div className="absolute top-4 left-4 right-4 z-10 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <h3 className="font-semibold mb-2 text-gray-900">Grade Legend:</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-900 font-medium">Grade A - Excellent Match</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-900 font-medium">Grade B - Good Match</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-gray-900 font-medium">Grade C - Average Match</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500"></div>
              <span className="text-sm text-gray-900 font-medium">Grade D - Below Average</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-900 font-medium">Grade F - Poor Match</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-500"></div>
              <span className="text-sm text-gray-900 font-medium">Not yet graded</span>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-700">
            Showing <span className="font-semibold">{leadsWithCoordinates.length}</span> of{' '}
            <span className="font-semibold">{filteredLeads.length}</span> leads
            {filteredLeads.length > leadsWithCoordinates.length &&
              ` (${filteredLeads.length - leadsWithCoordinates.length} without coordinates)`}
          </div>
        </div>

        {/* Map */}
        <LeadsMap
          leads={filteredLeads}
          height="100%"
          onMarkerClick={handleMarkerClick}
        />
      </div>

      {/* Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{selectedLead.name}</h2>
                {selectedLead.compatibility_grade && (
                  <div className="mt-2">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
                      style={{
                        backgroundColor:
                          selectedLead.compatibility_grade === 'A' ? '#22c55e' :
                          selectedLead.compatibility_grade === 'B' ? '#3b82f6' :
                          selectedLead.compatibility_grade === 'C' ? '#eab308' :
                          selectedLead.compatibility_grade === 'D' ? '#f97316' :
                          selectedLead.compatibility_grade === 'F' ? '#ef4444' : '#6b7280',
                        color: 'white',
                      }}
                    >
                      Grade {selectedLead.compatibility_grade}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  {selectedLead.address && (
                    <p className="text-gray-700">
                      <strong className="text-gray-900">Address:</strong> {selectedLead.address}
                    </p>
                  )}
                  {selectedLead.phone && (
                    <p className="text-gray-700">
                      <strong className="text-gray-900">Phone:</strong> {selectedLead.phone}
                    </p>
                  )}
                  {selectedLead.website && (
                    <p>
                      <a
                        href={selectedLead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Visit Website
                      </a>
                    </p>
                  )}
                  {selectedLead.google_maps_url && (
                    <p>
                      <a
                        href={selectedLead.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        View on Google Maps
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Grade Reasoning */}
              {selectedLead.grade_reasoning && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Grade Reasoning</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{selectedLead.grade_reasoning}</p>
                </div>
              )}

              {/* AI Report */}
              {selectedLead.ai_report && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Research Report</h3>
                  <div className="prose prose-sm max-w-none text-gray-700">
                    {selectedLead.ai_report.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-2">{paragraph}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Hooks */}
              {selectedLead.suggested_hooks && selectedLead.suggested_hooks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Suggested Outreach Hooks</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {selectedLead.suggested_hooks.map((hook, idx) => (
                      <li key={idx}>{hook}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pain Points */}
              {selectedLead.pain_points && selectedLead.pain_points.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Pain Points</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {selectedLead.pain_points.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Opportunities */}
              {selectedLead.opportunities && selectedLead.opportunities.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Opportunities</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {selectedLead.opportunities.map((opp, idx) => (
                      <li key={idx}>{opp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Business Details */}
              {(selectedLead.team_size || selectedLead.has_multiple_locations) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Business Details</h3>
                  <div className="space-y-2 text-sm">
                    {selectedLead.team_size && (
                      <p className="text-gray-700">
                        <strong className="text-gray-900">Team Size:</strong> {selectedLead.team_size}
                      </p>
                    )}
                    {selectedLead.has_multiple_locations && (
                      <p className="text-gray-700">
                        <strong className="text-gray-900">Multiple Locations:</strong> Yes
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
