/**
 * Lead Validation Utilities
 * Validates leads for proper websites and industry matching
 */

/**
 * Social media and non-website URL patterns
 */
const INVALID_WEBSITE_PATTERNS = [
  // Social Media
  'facebook.com',
  'fb.com',
  'instagram.com',
  'youtube.com',
  'youtu.be',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'tiktok.com',
  'snapchat.com',
  'pinterest.com',
  'reddit.com',

  // Maps & Directories
  'google.com/maps',
  'maps.google.com',
  'goo.gl/maps',
  'maps.app.goo.gl',
  'yelp.com',
  'yellowpages.com',
  'yellowpages.com.au',
  'truelocal.com.au',
  'localsearch.com.au',
  'hotfrog.com.au',
  'tripadvisor.com',

  // Other platforms
  'wix.com',
  'wordpress.com',
  'blogspot.com',
  'tumblr.com',
];

/**
 * Check if a URL is a valid business website (not social media or directory)
 */
export function isValidBusinessWebsite(url: string | null | undefined): {
  isValid: boolean;
  reason?: string;
  platform?: string;
} {
  if (!url) {
    return {
      isValid: false,
      reason: "No website URL provided",
    };
  }

  // Normalize URL
  const normalizedUrl = url.toLowerCase().trim();

  // Check against invalid patterns
  for (const pattern of INVALID_WEBSITE_PATTERNS) {
    if (normalizedUrl.includes(pattern)) {
      // Determine platform type
      let platform = "social media";
      if (pattern.includes('maps') || pattern.includes('yelp') || pattern.includes('yellow') || pattern.includes('local')) {
        platform = "directory/listing";
      } else if (pattern.includes('wix') || pattern.includes('wordpress') || pattern.includes('blogspot')) {
        platform = "platform page";
      }

      return {
        isValid: false,
        reason: `Website is a ${platform} URL (${pattern})`,
        platform,
      };
    }
  }

  // Check if URL looks like a proper domain
  try {
    const urlObj = new URL(normalizedUrl.startsWith('http') ? normalizedUrl : `https://${normalizedUrl}`);

    // Must have a valid hostname
    if (!urlObj.hostname || urlObj.hostname === 'localhost') {
      return {
        isValid: false,
        reason: "Invalid domain name",
      };
    }

    // Should have at least one dot (e.g., example.com)
    if (!urlObj.hostname.includes('.')) {
      return {
        isValid: false,
        reason: "Domain missing TLD",
      };
    }

    return {
      isValid: true,
    };
  } catch (error) {
    return {
      isValid: false,
      reason: "Malformed URL",
    };
  }
}

/**
 * Check if a business matches the target industry/business type
 * This uses fuzzy matching and common industry synonyms
 */
export function checkIndustryMatch(
  businessName: string,
  businessType: string,
  websiteContent: string,
  aboutContent?: string
): {
  isMatch: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
} {
  // Normalize inputs
  const name = businessName.toLowerCase();
  const type = businessType.toLowerCase();
  const content = `${websiteContent} ${aboutContent || ""}`.toLowerCase();

  // Extract key industry terms from business type
  const industryKeywords = extractIndustryKeywords(type);

  // Check if business name contains industry keywords
  const nameMatches = industryKeywords.some(keyword =>
    name.includes(keyword)
  );

  // Check if website content mentions industry keywords
  const contentMatchCount = industryKeywords.filter(keyword =>
    content.includes(keyword)
  ).length;

  // Scoring logic
  if (nameMatches && contentMatchCount >= 3) {
    return {
      isMatch: true,
      confidence: "high",
      reason: `Business name and website content strongly indicate ${type}`,
    };
  }

  if (nameMatches || contentMatchCount >= 2) {
    return {
      isMatch: true,
      confidence: "medium",
      reason: `Business shows some indicators of ${type}`,
    };
  }

  if (contentMatchCount >= 1) {
    return {
      isMatch: true,
      confidence: "low",
      reason: `Website mentions ${type} but match is weak`,
    };
  }

  return {
    isMatch: false,
    confidence: "low",
    reason: `Business does not appear to match ${type} industry`,
  };
}

/**
 * Extract key industry keywords from a business type query
 * Example: "tiling businesses in Sydney" -> ["tiling", "tile", "tiles"]
 */
function extractIndustryKeywords(businessType: string): string[] {
  const normalized = businessType.toLowerCase();
  const keywords: string[] = [];

  // Common industry terms and their variations
  const industryMap: Record<string, string[]> = {
    'tiling': ['tile', 'tiles', 'tiler', 'tiling', 'tilework'],
    'plumbing': ['plumb', 'plumber', 'plumbing', 'pipework', 'drainage'],
    'electrical': ['electric', 'electrician', 'electrical', 'wiring'],
    'carpentry': ['carpenter', 'carpentry', 'woodwork', 'joinery'],
    'painting': ['paint', 'painter', 'painting', 'decorator'],
    'roofing': ['roof', 'roofer', 'roofing', 'gutters'],
    'flooring': ['floor', 'flooring', 'floors', 'laminate', 'hardwood'],
    'landscaping': ['landscape', 'landscaper', 'landscaping', 'garden', 'gardening'],
    'hvac': ['hvac', 'heating', 'cooling', 'air conditioning', 'aircon'],
    'cleaning': ['clean', 'cleaner', 'cleaning', 'janitorial'],
    'pest control': ['pest', 'exterminator', 'termite', 'rodent'],
    'locksmith': ['lock', 'locksmith', 'key', 'security'],
    'glazier': ['glass', 'glazier', 'glazing', 'window'],
    'concreting': ['concrete', 'concreter', 'concreting', 'cement'],
    'bricklaying': ['brick', 'bricklayer', 'bricklaying', 'masonry'],
    'demolition': ['demolition', 'demolish', 'removal', 'wrecking'],
  };

  // Find matching industry
  for (const [industry, terms] of Object.entries(industryMap)) {
    if (normalized.includes(industry) || terms.some(term => normalized.includes(term))) {
      keywords.push(...terms);
      break;
    }
  }

  // If no specific match, extract core terms from the business type
  if (keywords.length === 0) {
    // Remove common filler words
    const fillers = ['in', 'at', 'the', 'a', 'an', 'for', 'business', 'businesses', 'company', 'companies', 'service', 'services'];
    const words = normalized
      .split(/\s+/)
      .filter(word => word.length > 3 && !fillers.includes(word));

    keywords.push(...words);
  }

  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Validate a lead comprehensively
 * Returns grade F if lead is invalid
 */
export function validateLead(lead: {
  name: string;
  website: string | null | undefined;
  businessType: string;
  websiteContent?: string;
  aboutContent?: string;
}): {
  isValid: boolean;
  grade?: "F";
  issues: string[];
  reasoning: string;
} {
  const issues: string[] = [];

  // Check website validity
  const websiteCheck = isValidBusinessWebsite(lead.website);
  if (!websiteCheck.isValid) {
    issues.push(`Invalid website: ${websiteCheck.reason}`);
  }

  // Check industry match (only if we have content)
  if (lead.websiteContent && websiteCheck.isValid) {
    const industryCheck = checkIndustryMatch(
      lead.name,
      lead.businessType,
      lead.websiteContent,
      lead.aboutContent
    );

    if (!industryCheck.isMatch) {
      issues.push(`Industry mismatch: ${industryCheck.reason}`);
    }
  }

  const isValid = issues.length === 0;

  return {
    isValid,
    grade: isValid ? undefined : "F",
    issues,
    reasoning: isValid
      ? "Lead has valid website and matches target industry"
      : `Lead marked as Grade F: ${issues.join("; ")}`,
  };
}
