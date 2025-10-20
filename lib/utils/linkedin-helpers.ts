/**
 * Extract LinkedIn company ID from various URL formats
 * Supports:
 * - https://www.linkedin.com/company/stripe
 * - https://linkedin.com/company/stripe/
 * - linkedin.com/company/stripe
 * - stripe (direct ID)
 */
export function extractLinkedInCompanyId(input: string): string | null {
  if (!input) return null;

  // If it's already just an ID (no slashes or dots), return it
  if (!input.includes("/") && !input.includes(".")) {
    return input.trim();
  }

  try {
    // Try to parse as URL
    let url: URL;
    if (input.startsWith("http")) {
      url = new URL(input);
    } else {
      url = new URL(`https://${input}`);
    }

    // Check if it's a LinkedIn URL
    if (!url.hostname.includes("linkedin.com")) {
      return null;
    }

    // Extract company ID from path
    // Path format: /company/{id} or /company/{id}/...
    const match = url.pathname.match(/\/company\/([^\/\?#]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (e) {
    // If URL parsing fails, try regex on the string directly
    const match = input.match(/\/company\/([^\/\?#\s]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Guess LinkedIn company ID from company name
 * Converts company name to a likely LinkedIn format
 */
export function guessLinkedInCompanyId(companyName: string): string {
  // Remove common business suffixes
  let cleaned = companyName
    .replace(
      /\b(pty|ltd|limited|inc|incorporated|llc|corp|corporation|co|company)\b/gi,
      "",
    )
    .trim();

  return cleaned
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters except hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Try multiple strategies to find LinkedIn company ID
 * Returns array of IDs to try, ordered by likelihood
 */
export function generateLinkedInCompanyIdCandidates(
  companyName: string,
  website?: string,
): string[] {
  const candidates: string[] = [];

  // Strategy 1: Extract from website domain
  if (website) {
    try {
      const url = website.startsWith("http") ? website : `https://${website}`;
      const domain = new URL(url).hostname.replace("www.", "");
      const domainParts = domain.split(".");
      if (domainParts.length > 0) {
        // Use domain name without extension (e.g., "stripe" from "stripe.com")
        candidates.push(domainParts[0]);
      }
    } catch (e) {
      // Invalid URL, skip
    }
  }

  // Strategy 2: Clean company name (remove business suffixes)
  candidates.push(guessLinkedInCompanyId(companyName));

  // Strategy 3: Company name with common variations
  const baseName = companyName
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  candidates.push(baseName);

  // Strategy 4: Add "australia" suffix for Australian companies
  if (website?.includes(".au")) {
    candidates.push(`${baseName}-australia`);
  }

  // Remove duplicates while preserving order
  return Array.from(new Set(candidates));
}

/**
 * Search for LinkedIn company URL in website content
 */
export function findLinkedInCompanyUrl(htmlContent: string): string | null {
  if (!htmlContent) return null;

  // Look for LinkedIn company URLs in the HTML
  const patterns = [
    /https?:\/\/(www\.)?linkedin\.com\/company\/([^\/\s"'<>]+)/gi,
    /linkedin\.com\/company\/([^\/\s"'<>]+)/gi,
  ];

  for (const pattern of patterns) {
    const match = htmlContent.match(pattern);
    if (match && match[0]) {
      return match[0];
    }
  }

  return null;
}

/**
 * Format person's role/position for display
 */
export function formatPosition(position?: string, headline?: string): string {
  if (position) return position;
  if (headline) return headline;
  return "Employee";
}

/**
 * Categorize people by seniority/role
 */
export function categorizePeople(people: any[]): {
  executives: any[];
  management: any[];
  staff: any[];
} {
  const executives: any[] = [];
  const management: any[] = [];
  const staff: any[] = [];

  const executiveTitles = [
    "ceo",
    "cto",
    "cfo",
    "coo",
    "chief",
    "founder",
    "co-founder",
    "president",
    "owner",
    "director",
    "vp",
    "vice president",
  ];

  const managementTitles = [
    "manager",
    "head of",
    "lead",
    "senior",
    "principal",
    "supervisor",
  ];

  people.forEach((person) => {
    const title = (person.position || person.headline || "").toLowerCase();

    if (executiveTitles.some((t) => title.includes(t))) {
      executives.push(person);
    } else if (managementTitles.some((t) => title.includes(t))) {
      management.push(person);
    } else {
      staff.push(person);
    }
  });

  return { executives, management, staff };
}
