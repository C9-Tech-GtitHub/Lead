'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Email {
  value: string;
  type: 'personal' | 'generic';
  confidence: number;
  first_name?: string;
  last_name?: string;
  position?: string;
  department?: string;
  seniority?: string;
  verification?: {
    date: string;
    status: 'valid' | 'accept_all' | 'unknown';
  };
}

interface EmailFinderModalProps {
  leadId: string;
  leadName: string;
  domain: string;
  onClose: () => void;
}

export function EmailFinderModal({ leadId, leadName, domain, onClose }: EmailFinderModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [organization, setOrganization] = useState<string>('');
  const [pattern, setPattern] = useState<string>('');
  const [totalResults, setTotalResults] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);

  // Load existing emails from database on mount
  useEffect(() => {
    loadExistingEmails();
  }, [leadId]);

  const loadExistingEmails = async () => {
    const supabase = createClient();

    // Load emails from database
    const { data: emailData, error: emailError } = await supabase
      .from('lead_emails')
      .select('*')
      .eq('lead_id', leadId)
      .order('confidence', { ascending: false });

    // Load lead metadata
    const { data: leadData } = await supabase
      .from('leads')
      .select('hunter_organization, hunter_email_pattern, hunter_total_emails, hunter_io_searched_at')
      .eq('id', leadId)
      .single();

    if (emailData && emailData.length > 0) {
      setHasSearched(true);
      setEmails(emailData.map(e => ({
        value: e.email,
        type: e.type as 'personal' | 'generic',
        confidence: e.confidence,
        first_name: e.first_name,
        last_name: e.last_name,
        position: e.position,
        department: e.department,
        seniority: e.seniority,
        verification: e.verification_status ? {
          date: e.verification_date,
          status: e.verification_status as 'valid' | 'accept_all' | 'unknown',
        } : undefined,
      })));
    }

    if (leadData) {
      setOrganization(leadData.hunter_organization || '');
      setPattern(leadData.hunter_email_pattern || '');
      setTotalResults(leadData.hunter_total_emails || 0);
      if (leadData.hunter_io_searched_at) {
        setHasSearched(true);
      }
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const response = await fetch('/api/hunter/domain-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, leadId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch emails');
        return;
      }

      setEmails(data.data.emails);
      setOrganization(data.data.organization);
      setPattern(data.data.pattern);
      setTotalResults(data.data.totalResults);
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError('Failed to fetch emails. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Find Emails</h2>
            <p className="text-sm text-gray-600 mt-1">
              {leadName} - {domain}
            </p>
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
                Click the button below to search for business emails using Hunter.io
              </p>
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Searching...' : '🔍 Search for Emails'}
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
              {/* Organization Info */}
              {organization && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">Organization Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-blue-600 font-medium">Company:</span>{' '}
                      <span className="text-blue-900">{organization}</span>
                    </div>
                    {pattern && (
                      <div>
                        <span className="text-blue-600 font-medium">Email Pattern:</span>{' '}
                        <span className="text-blue-900 font-mono">{pattern}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-blue-600 font-medium">Total Emails Found:</span>{' '}
                      <span className="text-blue-900">{totalResults}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Emails List */}
              {emails.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No emails found for this domain</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Try using the email pattern to reach out directly
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Found {emails.length} Email{emails.length !== 1 ? 's' : ''}
                  </h3>
                  {emails.map((email, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <a
                              href={`mailto:${email.value}`}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {email.value}
                            </a>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                email.type === 'personal'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {email.type}
                            </span>
                          </div>
                          {(email.first_name || email.last_name) && (
                            <p className="text-sm text-gray-700">
                              {email.first_name} {email.last_name}
                              {email.position && ` - ${email.position}`}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {email.confidence}% confidence
                          </div>
                          {email.verification && (
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                                email.verification.status === 'valid'
                                  ? 'bg-green-100 text-green-700'
                                  : email.verification.status === 'accept_all'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {email.verification.status}
                            </span>
                          )}
                        </div>
                      </div>

                      {(email.department || email.seniority) && (
                        <div className="flex gap-2 mt-2">
                          {email.department && (
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                              {email.department}
                            </span>
                          )}
                          {email.seniority && (
                            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                              {email.seniority}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Search Again Button */}
              <div className="mt-6 text-center">
                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="px-4 py-2 text-purple-600 border border-purple-600 rounded-lg font-medium hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Searching...' : '🔄 Search Again'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Powered by Hunter.io - Email finding service
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
    </div>
  );
}
