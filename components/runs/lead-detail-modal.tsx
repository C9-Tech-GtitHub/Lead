"use client";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

import { parseSeoSummary, type SectionItem } from "@/lib/utils/parse-ai-report";
import { renderRichText } from "@/lib/utils/render-rich-text";

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

interface DetailSection {
  title: string;
  items: SectionItem[];
}

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
}

export function LeadDetailModal({ lead, onClose }: LeadDetailModalProps) {
  const [emails, setEmails] = useState<any[]>([]);
  const [linkedinPeople, setLinkedinPeople] = useState<any[]>([]);
  const [linkedinCompanyData, setLinkedinCompanyData] = useState<any>(null);

  useEffect(() => {
    const loadEmails = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('lead_emails')
        .select('*')
        .eq('lead_id', lead.id)
        .order('confidence', { ascending: false });

      if (data) {
        setEmails(data);
      }
    };

    const loadLinkedinData = async () => {
      const supabase = createClient();

      // Load LinkedIn people
      const { data: peopleData } = await supabase
        .from('lead_linkedin_people')
        .select('*')
        .eq('lead_id', lead.id)
        .order('full_name', { ascending: true });

      if (peopleData) {
        setLinkedinPeople(peopleData);
      }

      // Load company data from lead
      const { data: leadData } = await supabase
        .from('leads')
        .select('linkedin_company_data')
        .eq('id', lead.id)
        .single();

      if (leadData?.linkedin_company_data) {
        setLinkedinCompanyData(leadData.linkedin_company_data);
      }
    };

    loadEmails();
    loadLinkedinData();
  }, [lead.id]);

  const seoSummary = useMemo(
    () => parseSeoSummary(lead.ai_report),
    [lead.ai_report],
  );
  const snapshotText = seoSummary?.snapshot ?? lead.grade_reasoning;

  const highlightCards = useMemo(() => {
    if (!seoSummary) {
      return [];
    }

    return [
      {
        title: "Match Check",
        value: seoSummary.matchCheck ?? "Unknown",
      },
      {
        title: "Business Size",
        value: seoSummary.businessSize ?? "Unknown",
      },
      {
        title: "Market Reach",
        value: seoSummary.marketReach ?? "Unknown",
      },
    ].filter((card) => Boolean(card.value));
  }, [seoSummary]);

  const detailSections = useMemo<DetailSection[]>(() => {
    if (!seoSummary) {
      return [];
    }

    const sections: DetailSection[] = [
      {
        title: "Business Identity & Legitimacy",
        items: seoSummary.identityLegitimacy ?? [],
      },
      {
        title: "Business Profile",
        items: seoSummary.businessProfile ?? [],
      },
      {
        title: "Business Scale & Activity",
        items: seoSummary.scaleActivity ?? [],
      },
      {
        title: "Brand Presence & Engagement",
        items: seoSummary.brandPresence ?? [],
      },
      {
        title: "Business History",
        items: seoSummary.businessHistory ?? [],
      },
    ];

    return sections.filter((section) => section.items.length > 0);
  }, [seoSummary]);

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
              {lead.address && <InfoRow label="Address" value={lead.address} />}
              {lead.phone && <InfoRow label="Phone" value={lead.phone} />}
              {lead.website && (
                <InfoRow
                  label="Website"
                  value={
                    <a
                      href={
                        lead.website.startsWith("http")
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

          {/* Contact Emails */}
          {emails.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Contact Emails ({emails.length})
              </h3>
              <div className="space-y-2">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <a
                          href={`mailto:${email.email}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          {email.email}
                        </a>
                        {(email.first_name || email.last_name) && (
                          <p className="text-xs text-gray-600 mt-0.5">
                            {email.first_name} {email.last_name}
                            {email.position && ` - ${email.position}`}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            email.type === 'personal'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {email.type}
                        </span>
                        {email.verification_status === 'valid' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                            ✓ verified
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {email.confidence}%
                        </span>
                      </div>
                    </div>
                    {(email.department || email.seniority) && (
                      <div className="flex gap-1.5 mt-2">
                        {email.department && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                            {email.department}
                          </span>
                        )}
                        {email.seniority && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                            {email.seniority}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* LinkedIn Company Structure */}
          {linkedinPeople.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Team Structure ({linkedinPeople.length} people from LinkedIn)
              </h3>
              {linkedinCompanyData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-xs font-semibold text-blue-700">Company Info</p>
                  <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                    {linkedinCompanyData.industry && (
                      <div>
                        <span className="text-blue-600">Industry:</span>{' '}
                        <span className="text-blue-900">{linkedinCompanyData.industry}</span>
                      </div>
                    )}
                    {linkedinCompanyData.companySize && (
                      <div>
                        <span className="text-blue-600">Size:</span>{' '}
                        <span className="text-blue-900">{linkedinCompanyData.companySize}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="grid gap-2 md:grid-cols-2">
                {linkedinPeople.map((person) => (
                  <div
                    key={person.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex gap-2">
                      {person.profile_image_url && (
                        <img
                          src={person.profile_image_url}
                          alt={person.full_name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-gray-900 text-sm truncate">
                          {person.full_name}
                        </h5>
                        {(person.position || person.headline) && (
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                            {person.position || person.headline}
                          </p>
                        )}
                        {person.linkedin_profile_url && (
                          <a
                            href={person.linkedin_profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                          >
                            View LinkedIn →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SEO Snapshot */}
          {highlightCards.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                SEO Snapshot
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                {highlightCards.map((card) => (
                  <HighlightCard
                    key={card.title}
                    title={card.title}
                    value={card.value}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Snapshot Narrative */}
          {snapshotText && (
            <section>
              <SnapshotCard title="SEO Fit Snapshot" value={snapshotText} />
            </section>
          )}

          {/* Detailed Sections */}
          {detailSections.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Detailed Findings
              </h3>
              <div className="space-y-4">
                {detailSections.map((section) => (
                  <DetailCard
                    key={section.title}
                    title={section.title}
                    items={section.items}
                  />
                ))}
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-gray-700 min-w-[80px]">{label}:</span>
      <span className="text-gray-600">{value}</span>
    </div>
  );
}

function HighlightCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
        {title}
      </p>
      <p className="mt-2 text-sm text-gray-800">{renderRichText(value)}</p>
    </div>
  );
}

function SnapshotCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-purple-700">
          {title}
        </h4>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-800 leading-relaxed">
          {renderRichText(value)}
        </p>
      </div>
    </div>
  );
}

function DetailCard({ title, items }: { title: string; items: SectionItem[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-purple-700">
          {title}
        </h4>
      </div>
      <div className="p-4 space-y-3">
        {items.map((item) => (
          <div key={`${title}-${item.label}`} className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {item.label}
            </p>
            <p className="text-sm text-gray-800">
              {renderRichText(item.value)}
            </p>
          </div>
        ))}
      </div>
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
    pending: "bg-gray-100 text-gray-700",
    scraping: "bg-blue-100 text-blue-700",
    analyzing: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
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
