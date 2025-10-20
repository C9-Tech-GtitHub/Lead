/**
 * CSV Export Utilities
 * Exports lead data to CSV format with all sales-relevant information
 */

interface LeadWithDetails {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  google_maps_url?: string;
  latitude?: number;
  longitude?: number;
  has_multiple_locations: boolean;
  team_size?: string;
  research_status: string;
  compatibility_grade?: string;
  grade_reasoning?: string;
  ai_report?: string;
  suggested_hooks?: string[];
  pain_points?: string[];
  opportunities?: string[];
  error_message?: string;
  created_at?: string;
  researched_at?: string;

  // Email data
  emails?: Array<{
    email: string;
    type?: string;
    confidence?: number;
    first_name?: string;
    last_name?: string;
    position?: string;
    department?: string;
    seniority?: string;
    verification_status?: string;
  }>;

  // LinkedIn data
  linkedin_people?: Array<{
    full_name: string;
    headline?: string;
    position?: string;
    linkedin_profile_url?: string;
    email?: string;
  }>;

  linkedin_company_url?: string;
  linkedin_company_data?: {
    name?: string;
    description?: string;
    industry?: string;
    companySize?: string;
    headquarters?: string;
    website?: string;
    specialties?: string[];
  };
}

/**
 * Escapes CSV field content and wraps in quotes if necessary
 */
function escapeCsvField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If the value contains comma, newline, or quotes, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Converts array to comma-separated string (or custom separator)
 */
function arrayToString(arr?: any[], separator: string = '; '): string {
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    return '';
  }
  return arr.join(separator);
}

/**
 * Exports leads to CSV format optimized for sales outreach
 */
export function exportLeadsToCSV(leads: LeadWithDetails[]): string {
  // Define CSV headers with all pertinent sales information
  const headers = [
    'Company Name',
    'Grade',
    'Address',
    'Phone',
    'Website',
    'Google Maps URL',
    'Latitude',
    'Longitude',

    // Business Details
    'Multiple Locations',
    'Team Size',
    'Research Status',

    // AI Insights
    'Grade Reasoning',
    'Suggested Hooks',
    'Pain Points',
    'Opportunities',

    // Email Contacts
    'Primary Email',
    'All Emails',
    'Email Details',

    // LinkedIn Contacts
    'LinkedIn Company URL',
    'Key People',
    'Company Industry',
    'Company Size',
    'Company Description',

    // Full AI Report
    'AI Research Report',

    // Metadata
    'Created Date',
    'Research Date',
    'Error Message',
  ];

  // Build CSV rows
  const rows = leads.map(lead => {
    // Process emails
    const primaryEmail = lead.emails?.[0]?.email || '';
    const allEmails = lead.emails?.map(e => e.email).join('; ') || '';
    const emailDetails = lead.emails?.map(e =>
      `${e.email} (${e.first_name || ''} ${e.last_name || ''} - ${e.position || 'Unknown Position'} - Confidence: ${e.confidence || 'N/A'}%)`
    ).join(' | ') || '';

    // Process LinkedIn people
    const keyPeople = lead.linkedin_people?.map(p =>
      `${p.full_name} - ${p.position || p.headline || 'Unknown Position'}`
    ).join(' | ') || '';

    // Extract LinkedIn company data
    const linkedinIndustry = lead.linkedin_company_data?.industry || '';
    const linkedinCompanySize = lead.linkedin_company_data?.companySize || '';
    const linkedinDescription = lead.linkedin_company_data?.description || '';

    return [
      escapeCsvField(lead.name),
      escapeCsvField(lead.compatibility_grade || 'Not Graded'),
      escapeCsvField(lead.address),
      escapeCsvField(lead.phone),
      escapeCsvField(lead.website),
      escapeCsvField(lead.google_maps_url),
      escapeCsvField(lead.latitude),
      escapeCsvField(lead.longitude),

      escapeCsvField(lead.has_multiple_locations ? 'Yes' : 'No'),
      escapeCsvField(lead.team_size),
      escapeCsvField(lead.research_status),

      escapeCsvField(lead.grade_reasoning),
      escapeCsvField(arrayToString(lead.suggested_hooks)),
      escapeCsvField(arrayToString(lead.pain_points)),
      escapeCsvField(arrayToString(lead.opportunities)),

      escapeCsvField(primaryEmail),
      escapeCsvField(allEmails),
      escapeCsvField(emailDetails),

      escapeCsvField(lead.linkedin_company_url),
      escapeCsvField(keyPeople),
      escapeCsvField(linkedinIndustry),
      escapeCsvField(linkedinCompanySize),
      escapeCsvField(linkedinDescription),

      escapeCsvField(lead.ai_report),

      escapeCsvField(lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ''),
      escapeCsvField(lead.researched_at ? new Date(lead.researched_at).toLocaleDateString() : ''),
      escapeCsvField(lead.error_message),
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Triggers browser download of CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    // Create a link and trigger download
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Exports leads with a single function call
 * Automatically generates filename with timestamp
 */
export function exportLeads(leads: LeadWithDetails[], runName?: string): void {
  const csvContent = exportLeadsToCSV(leads);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = runName
    ? `leads-${runName.replace(/[^a-z0-9]/gi, '-')}-${timestamp}.csv`
    : `leads-export-${timestamp}.csv`;

  downloadCSV(csvContent, filename);
}
