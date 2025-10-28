/**
 * Email Classification and Scoring System
 *
 * Classifies emails into categories and assigns priority scores
 * to determine the best email to contact for maximum reply likelihood.
 */

export type EmailCategory =
  | "named_personal"      // tim@, john.smith@
  | "role_personal"       // owner@, ceo@, director@
  | "department"          // sales@, marketing@, support@
  | "generic_catchall"    // info@, contact@, hello@, enquiries@
  | "location"            // sydney@, melbourne@, office@
  | "automated"           // noreply@, donotreply@, automated@
  | "unknown";

export interface EmailClassification {
  category: EmailCategory;
  priorityScore: number; // 0-100, higher = better chance of reply
  reasoning: string;
  isRecommended: boolean;
}

// Common generic prefixes (LOW priority - catch-all emails)
const GENERIC_PREFIXES = new Set([
  'info', 'contact', 'hello', 'enquiries', 'enquiry', 'admin',
  'office', 'reception', 'general', 'mail', 'email',
  'customerservice', 'customer', 'cs', 'helpdesk', 'help'
]);

// Role-based prefixes (HIGH priority - decision makers)
const ROLE_PREFIXES = new Set([
  'owner', 'ceo', 'founder', 'director', 'manager', 'president',
  'principal', 'partner', 'boss', 'md', 'gm', 'head'
]);

// Department prefixes (MEDIUM priority - functional teams)
const DEPARTMENT_PREFIXES = new Set([
  'sales', 'marketing', 'business', 'bd', 'dev', 'development',
  'account', 'accounts', 'finance', 'hr', 'operations', 'ops',
  'purchasing', 'procurement', 'it', 'tech', 'support'
]);

// Automated/no-reply prefixes (DO NOT CONTACT)
const AUTOMATED_PREFIXES = new Set([
  'noreply', 'no-reply', 'donotreply', 'do-not-reply',
  'automated', 'bounce', 'mailer', 'daemon', 'postmaster'
]);

// Location indicators (MEDIUM-LOW priority - often forwarded to general inbox)
const LOCATION_INDICATORS = new Set([
  'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra',
  'hobart', 'darwin', 'office', 'shop', 'store', 'showroom',
  'warehouse', 'depot', 'branch', 'location', 'site'
]);

/**
 * Classify an email address into a category and assign priority score
 */
export function classifyEmail(
  email: string,
  firstName?: string | null,
  lastName?: string | null,
  position?: string | null
): EmailClassification {
  const emailLower = email.toLowerCase().trim();
  const [localPart, domain] = emailLower.split('@');

  if (!localPart || !domain) {
    return {
      category: 'unknown',
      priorityScore: 0,
      reasoning: 'Invalid email format',
      isRecommended: false
    };
  }

  // Check for automated/no-reply emails first (DO NOT CONTACT)
  for (const prefix of AUTOMATED_PREFIXES) {
    if (localPart.includes(prefix)) {
      return {
        category: 'automated',
        priorityScore: 0,
        reasoning: `Automated email (${prefix}@) - will not be read`,
        isRecommended: false
      };
    }
  }

  // Check if we have first/last name that matches the email
  if (firstName || lastName) {
    const nameInEmail = checkNameInEmail(localPart, firstName, lastName);
    if (nameInEmail) {
      return {
        category: 'named_personal',
        priorityScore: 95,
        reasoning: `Personal email for ${firstName || ''} ${lastName || ''} - highest reply likelihood`,
        isRecommended: true
      };
    }
  }

  // Check for common name patterns (john, john.smith, j.smith, johnsmith)
  if (looksLikePersonName(localPart)) {
    return {
      category: 'named_personal',
      priorityScore: 90,
      reasoning: 'Personal name-based email - very high reply likelihood',
      isRecommended: true
    };
  }

  // Check for role-based emails (owner@, ceo@, manager@)
  for (const role of ROLE_PREFIXES) {
    if (localPart === role || localPart.startsWith(role + '.')) {
      return {
        category: 'role_personal',
        priorityScore: 80,
        reasoning: `Decision-maker role (${role}@) - high reply likelihood`,
        isRecommended: true
      };
    }
  }

  // Enhance with position data if available
  if (position) {
    const positionLower = position.toLowerCase();
    const seniorityScore = calculateSeniorityScore(positionLower);
    if (seniorityScore > 0) {
      return {
        category: 'role_personal',
        priorityScore: 70 + seniorityScore,
        reasoning: `${position} - decision-maker with authority`,
        isRecommended: seniorityScore >= 15
      };
    }
  }

  // Check for department emails (sales@, marketing@)
  for (const dept of DEPARTMENT_PREFIXES) {
    if (localPart === dept || localPart.startsWith(dept + '.')) {
      return {
        category: 'department',
        priorityScore: 60,
        reasoning: `Department email (${dept}@) - moderate reply likelihood`,
        isRecommended: dept === 'sales' || dept === 'marketing' || dept === 'business'
      };
    }
  }

  // Check for location-based emails (sydney@, melbourne@)
  for (const location of LOCATION_INDICATORS) {
    if (localPart.includes(location)) {
      return {
        category: 'location',
        priorityScore: 45,
        reasoning: `Location-based email (${location}) - may forward to general inbox`,
        isRecommended: false
      };
    }
  }

  // Check for generic catch-all emails (info@, contact@)
  for (const generic of GENERIC_PREFIXES) {
    if (localPart === generic || localPart.startsWith(generic + '.')) {
      return {
        category: 'generic_catchall',
        priorityScore: 30,
        reasoning: `Generic catch-all (${generic}@) - low reply likelihood`,
        isRecommended: false
      };
    }
  }

  // Fallback: Unknown pattern
  // Could be personal or generic - give moderate score
  return {
    category: 'unknown',
    priorityScore: 50,
    reasoning: 'Unknown pattern - could be personal or generic',
    isRecommended: false
  };
}

/**
 * Check if first/last name appears in email local part
 */
function checkNameInEmail(
  localPart: string,
  firstName?: string | null,
  lastName?: string | null
): boolean {
  if (!firstName && !lastName) return false;

  const local = localPart.toLowerCase().replace(/[^a-z]/g, '');

  if (firstName) {
    const first = firstName.toLowerCase().replace(/[^a-z]/g, '');
    if (first && local.includes(first)) return true;
  }

  if (lastName) {
    const last = lastName.toLowerCase().replace(/[^a-z]/g, '');
    if (last && local.includes(last)) return true;
  }

  return false;
}

/**
 * Check if email looks like a person's name
 * Examples: john, john.smith, j.smith, johnsmith, john_smith
 */
function looksLikePersonName(localPart: string): boolean {
  // Remove common separators
  const cleaned = localPart.replace(/[._-]/g, '');

  // If it's very short (1-2 chars), unlikely to be a name
  if (cleaned.length <= 2) return false;

  // If it contains numbers, less likely to be a name (but not impossible)
  if (/\d{3,}/.test(cleaned)) return false;

  // Check for common name patterns:
  // 1. firstlast (johnsmith)
  // 2. first.last (john.smith)
  // 3. f.last (j.smith)
  // 4. first_last (john_smith)

  const parts = localPart.split(/[._-]/);

  // If 2 parts and both are alphabetic, likely name
  if (parts.length === 2) {
    const [first, last] = parts;
    if (/^[a-z]{2,}$/i.test(first) && /^[a-z]{2,}$/i.test(last)) {
      return true;
    }
    // Handle f.last pattern (j.smith)
    if (/^[a-z]$/i.test(first) && /^[a-z]{2,}$/i.test(last)) {
      return true;
    }
  }

  // Single word that's alphabetic and reasonable length (4-15 chars)
  if (parts.length === 1 && /^[a-z]{4,15}$/i.test(cleaned)) {
    // Additional check: not in our generic/department lists
    if (GENERIC_PREFIXES.has(cleaned) ||
        DEPARTMENT_PREFIXES.has(cleaned) ||
        LOCATION_INDICATORS.has(cleaned)) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Calculate seniority score from position title
 */
function calculateSeniorityScore(position: string): number {
  const pos = position.toLowerCase();

  // C-level / Top executives
  if (/(ceo|coo|cfo|cto|founder|owner|president|principal|managing director|md)/i.test(pos)) {
    return 25;
  }

  // Directors / VPs
  if (/(director|vp|vice president|head of)/i.test(pos)) {
    return 20;
  }

  // Managers
  if (/(manager|lead|supervisor|coordinator)/i.test(pos)) {
    return 15;
  }

  // Specialists with authority
  if (/(senior|sr\.|principal|chief)/i.test(pos)) {
    return 10;
  }

  return 0;
}

/**
 * Select the best email from a list of emails for the same domain
 */
export function selectBestEmail(
  emails: Array<{
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    position?: string | null;
    confidence?: number;
  }>
): {
  bestEmail: string;
  classification: EmailClassification;
  allClassifications: Array<{ email: string; classification: EmailClassification }>;
} {
  if (emails.length === 0) {
    throw new Error('No emails provided');
  }

  if (emails.length === 1) {
    const classification = classifyEmail(
      emails[0].email,
      emails[0].firstName,
      emails[0].lastName,
      emails[0].position
    );
    return {
      bestEmail: emails[0].email,
      classification,
      allClassifications: [{ email: emails[0].email, classification }]
    };
  }

  // Classify all emails
  const classified = emails.map(e => ({
    email: e.email,
    classification: classifyEmail(e.email, e.firstName, e.lastName, e.position),
    confidence: e.confidence || 0
  }));

  // Sort by priority score (desc), then confidence (desc)
  classified.sort((a, b) => {
    if (b.classification.priorityScore !== a.classification.priorityScore) {
      return b.classification.priorityScore - a.classification.priorityScore;
    }
    return b.confidence - a.confidence;
  });

  return {
    bestEmail: classified[0].email,
    classification: classified[0].classification,
    allClassifications: classified.map(c => ({
      email: c.email,
      classification: c.classification
    }))
  };
}

/**
 * Get a simple type classification (for backward compatibility)
 */
export function getSimpleType(category: EmailCategory): 'personal' | 'generic' {
  switch (category) {
    case 'named_personal':
    case 'role_personal':
      return 'personal';
    default:
      return 'generic';
  }
}
