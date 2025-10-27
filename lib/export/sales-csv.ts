/**
 * Simplified CSV Export for Sales Team
 * Matches the required format for bulk mailing campaigns
 */

interface SalesLead {
  id: string;
  name: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  industry?: string;
  review_count?: number;
  is_client: boolean;
  lead_status?: string;

  // Email data
  emails?: Array<{
    email: string;
    type?: string;
    confidence?: number;
    first_name?: string;
    last_name?: string;
    position?: string;
    verification_status?: string;
  }>;
}

/**
 * Escapes CSV field content and wraps in quotes if necessary
 */
function escapeCsvField(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // If the value contains comma, newline, or quotes, wrap in quotes and escape quotes
  if (
    stringValue.includes(",") ||
    stringValue.includes("\n") ||
    stringValue.includes('"')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Extract domain from website URL
 */
function extractDomain(website?: string): string {
  if (!website) return "";

  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    const hostname = new URL(url).hostname;
    // Remove www. prefix if present
    return hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

/**
 * Exports leads to simplified CSV format for sales team
 * Format: company_name, domain, website, email, industry, state, city, reviews, is_client, lead_status
 */
export function exportSalesLeadsToCSV(leads: SalesLead[]): string {
  // Define CSV headers matching the required format
  const headers = [
    "company_name",
    "domain",
    "website",
    "email",
    "industry",
    "state",
    "city",
    "reviews",
    "is_client",
    "lead_status",
  ];

  // Build CSV rows
  const rows = leads.map((lead) => {
    // Get primary email (highest confidence or first)
    const primaryEmail = lead.emails?.[0]?.email || "";

    // Extract domain from website
    const domain = extractDomain(lead.website);

    return [
      escapeCsvField(lead.name),
      escapeCsvField(domain),
      escapeCsvField(lead.website || ""),
      escapeCsvField(primaryEmail),
      escapeCsvField(lead.industry || ""),
      escapeCsvField(lead.state || ""),
      escapeCsvField(lead.city || ""),
      escapeCsvField(lead.review_count || 0),
      escapeCsvField(lead.is_client ? "TRUE" : "FALSE"),
      escapeCsvField(lead.lead_status || "new"),
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Triggers browser download of CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    // Create a link and trigger download
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Exports leads for sales team with a single function call
 * Automatically generates filename with timestamp
 */
export function exportSalesLeads(
  leads: SalesLead[],
  statusFilter?: string,
): void {
  const csvContent = exportSalesLeadsToCSV(leads);
  const timestamp = new Date().toISOString().split("T")[0];
  const statusPart = statusFilter ? `-${statusFilter}` : "";
  const filename = `sales-leads${statusPart}-${timestamp}.csv`;

  downloadCSV(csvContent, filename);
}

/**
 * Exports all discovered emails for leads with detailed information
 * Creates one row per email (leads with multiple emails will have multiple rows)
 * Format: company_name, domain, website, email, first_name, last_name, position, type, confidence, verification_status, industry, state, city, reviews, lead_status
 */
export function exportAllEmailsToCSV(leads: SalesLead[]): string {
  // Define CSV headers for detailed email export
  const headers = [
    "company_name",
    "domain",
    "website",
    "email",
    "first_name",
    "last_name",
    "position",
    "email_type",
    "confidence",
    "verification_status",
    "industry",
    "state",
    "city",
    "reviews",
    "is_client",
    "lead_status",
  ];

  // Build CSV rows - one row per email
  const rows: string[][] = [];

  leads.forEach((lead) => {
    const domain = extractDomain(lead.website);

    // If lead has emails, create a row for each
    if (lead.emails && lead.emails.length > 0) {
      lead.emails.forEach((emailData) => {
        rows.push([
          escapeCsvField(lead.name),
          escapeCsvField(domain),
          escapeCsvField(lead.website || ""),
          escapeCsvField(emailData.email),
          escapeCsvField(emailData.first_name || ""),
          escapeCsvField(emailData.last_name || ""),
          escapeCsvField(emailData.position || ""),
          escapeCsvField(emailData.type || ""),
          escapeCsvField(emailData.confidence || ""),
          escapeCsvField(emailData.verification_status || ""),
          escapeCsvField(lead.industry || ""),
          escapeCsvField(lead.state || ""),
          escapeCsvField(lead.city || ""),
          escapeCsvField(lead.review_count || 0),
          escapeCsvField(lead.is_client ? "TRUE" : "FALSE"),
          escapeCsvField(lead.lead_status || "new"),
        ]);
      });
    } else {
      // Lead has no emails, create one row with empty email fields
      rows.push([
        escapeCsvField(lead.name),
        escapeCsvField(domain),
        escapeCsvField(lead.website || ""),
        "", // email
        "", // first_name
        "", // last_name
        "", // position
        "", // email_type
        "", // confidence
        "", // verification_status
        escapeCsvField(lead.industry || ""),
        escapeCsvField(lead.state || ""),
        escapeCsvField(lead.city || ""),
        escapeCsvField(lead.review_count || 0),
        escapeCsvField(lead.is_client ? "TRUE" : "FALSE"),
        escapeCsvField(lead.lead_status || "new"),
      ]);
    }
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Exports all emails for leads with detailed information
 * Automatically generates filename with timestamp
 */
export function exportAllEmails(
  leads: SalesLead[],
  statusFilter?: string,
): void {
  const csvContent = exportAllEmailsToCSV(leads);
  const timestamp = new Date().toISOString().split("T")[0];
  const statusPart = statusFilter ? `-${statusFilter}` : "";
  const filename = `all-emails${statusPart}-${timestamp}.csv`;

  downloadCSV(csvContent, filename);
}
