export interface SectionItem {
  label: string;
  value: string;
}

export interface SeoSummary {
  grade?: string;
  matchCheck?: string;
  identityLegitimacy?: SectionItem[];
  businessProfile?: SectionItem[];
  scaleActivity?: SectionItem[];
  brandPresence?: SectionItem[];
  businessHistory?: SectionItem[];
  businessSize?: string;
  marketReach?: string;
  snapshot?: string;
}

const sectionRegex = (heading: string) =>
  new RegExp(`##\\s*${heading}:\\s*([\\s\\S]*?)(?=\\n##|$)`, "i");

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
]);

function stripTrackingParams(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);

    [...url.searchParams.keys()].forEach((key) => {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    });

    const sanitized = url.searchParams.toString();
    url.search = sanitized ? `?${sanitized}` : "";

    return url.toString();
  } catch {
    return rawUrl;
  }
}

function sanitizeText(value: string): string {
  if (!value) {
    return value;
  }

  let sanitized = value;

  sanitized = sanitized.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    (_, label: string, href: string) =>
      `[${label}](${stripTrackingParams(href)})`,
  );

  sanitized = sanitized.replace(
    /\((https?:\/\/[^)\s]+)\)/g,
    (_, href: string) => `(${stripTrackingParams(href)})`,
  );

  sanitized = sanitized.replace(/https?:\/\/[^\s)]+/g, (href: string) =>
    stripTrackingParams(href),
  );

  return sanitized.trim();
}

function extractSection(report: string, heading: string): string | undefined {
  const match = report.match(sectionRegex(heading));
  const raw = match?.[1]?.trim();
  return raw ? sanitizeText(raw) : undefined;
}

function cleanSingleLine(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = sanitizeText(value.replace(/\s+/g, " "));
  return cleaned.length > 0 ? cleaned : undefined;
}

function parseBulletSection(section?: string): SectionItem[] | undefined {
  if (!section) {
    return undefined;
  }

  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-•]+\s*/, ""));

  const items = lines
    .map((line) => {
      const [label, ...rest] = line.split(":");
      if (!label) {
        return null;
      }

      const value = sanitizeText(rest.join(":").trim());
      return {
        label: label.trim(),
        value: value.length > 0 ? value : "Unknown",
      };
    })
    .filter((item): item is SectionItem => Boolean(item?.label));

  return items.length > 0 ? items : undefined;
}

export function parseSeoSummary(report?: string): SeoSummary | null {
  if (!report) {
    return null;
  }

  const rawGrade = extractSection(report, "GRADE");
  const grade = rawGrade
    ?.replace(/[\[\]]/g, " ")
    .split(/\s+/)
    .find((token) => /^[A-F]$/i.test(token))
    ?.toUpperCase();

  const matchCheck = cleanSingleLine(extractSection(report, "MATCH CHECK"));
  const identityLegitimacy = parseBulletSection(
    extractSection(report, "BUSINESS IDENTITY & LEGITIMACY"),
  );
  const businessProfile = parseBulletSection(
    extractSection(report, "BUSINESS PROFILE"),
  );
  const scaleActivity = parseBulletSection(
    extractSection(report, "BUSINESS SCALE & ACTIVITY"),
  );
  const brandPresence = parseBulletSection(
    extractSection(report, "BRAND PRESENCE & ENGAGEMENT"),
  );
  const businessHistory = parseBulletSection(
    extractSection(report, "BUSINESS HISTORY"),
  );
  const businessSize = cleanSingleLine(extractSection(report, "BUSINESS SIZE"));
  const marketReach = cleanSingleLine(extractSection(report, "MARKET REACH"));
  const snapshot = extractSection(report, "SNAPSHOT");

  if (
    !grade &&
    !matchCheck &&
    !identityLegitimacy &&
    !businessProfile &&
    !scaleActivity &&
    !brandPresence &&
    !businessHistory &&
    !businessSize &&
    !marketReach &&
    !snapshot
  ) {
    return null;
  }

  return {
    grade,
    matchCheck,
    identityLegitimacy,
    businessProfile,
    scaleActivity,
    brandPresence,
    businessHistory,
    businessSize,
    marketReach,
    snapshot: snapshot?.trim(),
  };
}
