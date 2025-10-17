'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { categorizePeople } from '@/lib/utils/linkedin-helpers';

interface LinkedInPerson {
  id: string;
  name: string;
  position?: string;
  headline?: string;
  profileUrl?: string;
  imageUrl?: string;
  email?: string;
}

interface LinkedInCompanyData {
  name?: string;
  description?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  headquarters?: string;
  founded?: string;
  specialties?: string[];
  followerCount?: number;
}

interface LinkedInCompanyModalProps {
  leadId: string;
  leadName: string;
  linkedinCompanyId?: string;
  onClose: () => void;
}

export function LinkedInCompanyModal({
  leadId,
  leadName,
  linkedinCompanyId: initialCompanyId,
  onClose,
}: LinkedInCompanyModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [companyData, setCompanyData] = useState<LinkedInCompanyData | null>(null);
  const [people, setPeople] = useState<LinkedInPerson[]>([]);
  const [error, setError] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);
  const [linkedinCompanyId, setLinkedinCompanyId] = useState(initialCompanyId || '');
  const [autoDetectedId, setAutoDetectedId] = useState<string>('');

  // Load existing data from database on mount
  useEffect(() => {
    loadExistingData();
  }, [leadId]);

  const loadExistingData = async () => {
    const supabase = createClient();

    // Load lead data
    const { data: leadData } = await supabase
      .from('leads')
      .select('linkedin_company_data, linkedin_company_id, linkedin_scraped_at')
      .eq('id', leadId)
      .single();

    // Load people
    const { data: peopleData } = await supabase
      .from('lead_linkedin_people')
      .select('*')
      .eq('lead_id', leadId)
      .order('full_name', { ascending: true });

    if (leadData?.linkedin_company_data) {
      setHasSearched(true);
      setCompanyData({
        name: leadData.linkedin_company_data.name,
        description: leadData.linkedin_company_data.description,
        industry: leadData.linkedin_company_data.industry,
        companySize: leadData.linkedin_company_data.companySize,
        website: leadData.linkedin_company_data.website,
        headquarters: leadData.linkedin_company_data.headquarters,
        founded: leadData.linkedin_company_data.founded,
        specialties: leadData.linkedin_company_data.specialties,
        followerCount: leadData.linkedin_company_data.followerCount,
      });
    }

    if (leadData?.linkedin_company_id && !linkedinCompanyId) {
      setLinkedinCompanyId(leadData.linkedin_company_id);
    }

    if (peopleData) {
      setPeople(
        peopleData.map((p) => ({
          id: p.linkedin_profile_id,
          name: p.full_name,
          position: p.position,
          headline: p.headline,
          profileUrl: p.linkedin_profile_url,
          imageUrl: p.profile_image_url,
          email: p.email,
        }))
      );
    }
  };

  const handleScrape = async () => {
    if (!linkedinCompanyId.trim()) {
      setError('Please enter a LinkedIn company ID or URL');
      return;
    }

    setIsLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const response = await fetch('/api/linkedin/scrape-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinCompanyId, leadId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to scrape LinkedIn company');
        return;
      }

      setCompanyData(data.data.company);
      setPeople(data.data.employees || []);

      // Store the auto-detected ID
      if (data.foundCompanyId) {
        setAutoDetectedId(data.foundCompanyId);
        setLinkedinCompanyId(data.foundCompanyId);
      }
    } catch (err) {
      console.error('Error scraping LinkedIn:', err);
      setError('Failed to scrape LinkedIn company. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const categorizedPeople = categorizePeople(people);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">LinkedIn Company Research</h2>
            <p className="text-sm text-gray-600 mt-1">{leadName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hasSearched && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Enter the LinkedIn company ID or URL to research company structure
              </p>
              <div className="max-w-md mx-auto mb-4">
                <input
                  type="text"
                  value={linkedinCompanyId}
                  onChange={(e) => setLinkedinCompanyId(e.target.value)}
                  placeholder="e.g. stripe or linkedin.com/company/stripe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                />
                <p className="text-xs text-gray-500 mt-2">
                  You can enter: company ID, full URL, or just the company slug
                </p>
              </div>
              <button
                onClick={handleScrape}
                disabled={isLoading || !linkedinCompanyId.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Scraping LinkedIn...' : '🔍 Scrape Company Profile'}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {hasSearched && !isLoading && !error && (
            <>
              {/* Company Info */}
              {companyData && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-blue-900">
                      {companyData.name || leadName}
                    </h3>
                    {autoDetectedId && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        ✓ Auto-detected: {autoDetectedId}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {companyData.industry && (
                      <InfoItem label="Industry" value={companyData.industry} />
                    )}
                    {companyData.companySize && (
                      <InfoItem label="Company Size" value={companyData.companySize} />
                    )}
                    {companyData.headquarters && (
                      <InfoItem label="Headquarters" value={companyData.headquarters} />
                    )}
                    {companyData.founded && (
                      <InfoItem label="Founded" value={companyData.founded} />
                    )}
                    {companyData.followerCount && (
                      <InfoItem
                        label="LinkedIn Followers"
                        value={companyData.followerCount.toLocaleString()}
                      />
                    )}
                    {companyData.website && (
                      <InfoItem
                        label="Website"
                        value={
                          <a
                            href={companyData.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate block"
                          >
                            {companyData.website}
                          </a>
                        }
                      />
                    )}
                  </div>

                  {companyData.description && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-blue-700 mb-1">About</p>
                      <p className="text-sm text-blue-900 leading-relaxed">
                        {companyData.description}
                      </p>
                    </div>
                  )}

                  {companyData.specialties && companyData.specialties.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-blue-700 mb-2">Specialties</p>
                      <div className="flex flex-wrap gap-2">
                        {companyData.specialties.map((specialty, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Company Structure */}
              {people.length > 0 ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900">
                    Company Structure ({people.length} people)
                  </h3>

                  {/* Executives */}
                  {categorizedPeople.executives.length > 0 && (
                    <PeopleSection
                      title="Executive Team"
                      people={categorizedPeople.executives}
                      color="purple"
                    />
                  )}

                  {/* Management */}
                  {categorizedPeople.management.length > 0 && (
                    <PeopleSection
                      title="Management & Leadership"
                      people={categorizedPeople.management}
                      color="blue"
                    />
                  )}

                  {/* Staff */}
                  {categorizedPeople.staff.length > 0 && (
                    <PeopleSection
                      title="Team Members"
                      people={categorizedPeople.staff}
                      color="gray"
                    />
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">
                    No employee data found. The company profile may be private or limited.
                  </p>
                </div>
              )}

              {/* Rescrape Button */}
              <div className="mt-6 text-center pt-6 border-t">
                <button
                  onClick={handleScrape}
                  disabled={isLoading}
                  className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Scraping...' : '🔄 Scrape Again'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Powered by ScrapingDog - LinkedIn profile scraping
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-blue-600 mb-0.5">{label}</p>
      <p className="text-sm text-blue-900">{value}</p>
    </div>
  );
}

function PeopleSection({
  title,
  people,
  color,
}: {
  title: string;
  people: LinkedInPerson[];
  color: 'purple' | 'blue' | 'gray';
}) {
  const colorClasses = {
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      title: 'text-purple-900',
      badge: 'bg-purple-100 text-purple-700',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      title: 'text-blue-900',
      badge: 'bg-blue-100 text-blue-700',
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      title: 'text-gray-900',
      badge: 'bg-gray-100 text-gray-700',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-4`}>
      <h4 className={`font-semibold ${colors.title} mb-3 flex items-center gap-2`}>
        {title}
        <span className={`${colors.badge} px-2 py-0.5 rounded-full text-xs font-medium`}>
          {people.length}
        </span>
      </h4>
      <div className="grid gap-3 md:grid-cols-2">
        {people.map((person) => (
          <PersonCard key={person.id} person={person} />
        ))}
      </div>
    </div>
  );
}

function PersonCard({ person }: { person: LinkedInPerson }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
      <div className="flex gap-3">
        {person.imageUrl && (
          <img
            src={person.imageUrl}
            alt={person.name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h5 className="font-semibold text-gray-900 text-sm truncate">{person.name}</h5>
          {(person.position || person.headline) && (
            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
              {person.position || person.headline}
            </p>
          )}
          <div className="flex gap-2 mt-2">
            {person.profileUrl && (
              <a
                href={person.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                View Profile →
              </a>
            )}
            {person.email && (
              <a
                href={`mailto:${person.email}`}
                className="text-xs text-green-600 hover:text-green-800"
              >
                📧 Email
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
