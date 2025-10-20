/**
 * Website Scraper Integration
 * Uses Firecrawl API for intelligent website content extraction
 */

import { extractABN } from "../utils/abn-extractor";
import { lookupABN, type ABNLookupResult } from "../services/abn-lookup";

interface WebsiteData {
  mainContent: string;
  aboutContent?: string;
  teamContent?: string;
  hasMultipleLocations: boolean;
  teamSize?: string;
  abn?: string;
  abnData?: ABNLookupResult;
}

export async function scrapeWebsite(url: string): Promise<WebsiteData> {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not configured");
  }

  try {
    console.log(`[Website Scraper] Scraping: ${url}`);

    // Normalize URL and remove trailing slash
    let normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    normalizedUrl = normalizedUrl.replace(/\/$/, ""); // Remove trailing slash

    // Step 1: Scrape main page
    const mainContent = await scrapeWithFirecrawl(normalizedUrl, apiKey);

    // Step 2: Try to find and scrape About page
    let aboutContent: string | undefined;
    const aboutUrls = [
      `${normalizedUrl}/about`,
      `${normalizedUrl}/about-us`,
      `${normalizedUrl}/company`,
    ];

    for (const aboutUrl of aboutUrls) {
      try {
        aboutContent = await scrapeWithFirecrawl(aboutUrl, apiKey);
        if (aboutContent && aboutContent.length > 100) {
          console.log(`[Website Scraper] Found About page at: ${aboutUrl}`);
          break;
        }
      } catch (err) {
        // Continue to next URL
        continue;
      }
    }

    // Step 3: Try to find and scrape Team page
    let teamContent: string | undefined;
    const teamUrls = [
      `${normalizedUrl}/team`,
      `${normalizedUrl}/our-team`,
      `${normalizedUrl}/meet-the-team`,
      `${normalizedUrl}/about/team`,
    ];

    for (const teamUrl of teamUrls) {
      try {
        teamContent = await scrapeWithFirecrawl(teamUrl, apiKey);
        if (teamContent && teamContent.length > 100) {
          console.log(`[Website Scraper] Found Team page at: ${teamUrl}`);
          break;
        }
      } catch (err) {
        // Continue to next URL
        continue;
      }
    }

    // Step 4: Analyze content for business size indicators
    const analysis = analyzeBusinessSize(
      mainContent,
      aboutContent,
      teamContent,
    );

    // Step 5: Extract and lookup ABN if present
    const allContent = [mainContent, aboutContent].filter(Boolean).join("\n");
    const abn = extractABN(allContent);
    let abnData: ABNLookupResult | undefined;

    if (abn) {
      console.log(`[Website Scraper] Found ABN: ${abn}`);
      const lookupResult = await lookupABN(abn);
      if (lookupResult) {
        abnData = lookupResult;
        console.log(
          `[Website Scraper] ABN verified: ${lookupResult.entityName} (${lookupResult.businessAge || "?"} years old)`,
        );
      }
    }

    return {
      mainContent,
      aboutContent,
      teamContent,
      hasMultipleLocations: analysis.hasMultipleLocations,
      teamSize: analysis.teamSize,
      abn: abn ?? undefined,
      abnData,
    };
  } catch (error) {
    console.error("[Website Scraper] Error:", error);
    throw new Error(
      `Failed to scrape website: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Internal helper: Scrape a single URL with Firecrawl
 */
async function scrapeWithFirecrawl(
  url: string,
  apiKey: string,
): Promise<string> {
  // Try v2 API first
  try {
    const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: url,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 30000,
        // Add caching to reduce API calls
        maxAge: 3600000, // 1 hour cache
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Check if it's a 403 "website not supported" error
      if (response.status === 403) {
        console.warn(
          `[Website Scraper] Website not supported by Firecrawl: ${url}`,
        );
        console.warn("[Website Scraper] Attempting fallback method...");
        return await scrapeWithFallback(url);
      }

      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Firecrawl v2 returns content in data.markdown
    return data.data?.markdown || data.markdown || "";
  } catch (error) {
    // If v2 fails, try v1 as fallback
    console.warn("[Website Scraper] v2 API failed, trying v1...");

    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url: url,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Check if it's a 403 "website not supported" error
        if (response.status === 403) {
          console.warn(
            `[Website Scraper] Website not supported by Firecrawl: ${url}`,
          );
          console.warn("[Website Scraper] Attempting fallback method...");
          return await scrapeWithFallback(url);
        }

        throw new Error(
          `Firecrawl API error: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      return data.data?.markdown || data.markdown || "";
    } catch (v1Error) {
      console.error("[Website Scraper] Both v2 and v1 failed, using fallback");
      return await scrapeWithFallback(url);
    }
  }
}

/**
 * Fallback scraping method when Firecrawl is not available
 * Uses a simple fetch to get basic content
 */
async function scrapeWithFallback(url: string): Promise<string> {
  try {
    console.log(`[Website Scraper] Using fallback method for: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      // Add a timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Basic HTML to text conversion
    // Remove script and style tags
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      // Remove HTML tags
      .replace(/<[^>]+>/g, " ")
      // Decode common HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      // Clean up whitespace
      .replace(/\s+/g, " ")
      .trim();

    // Limit content to prevent overwhelming the AI
    if (text.length > 10000) {
      text = text.substring(0, 10000) + "...";
    }

    if (text.length < 100) {
      throw new Error("Insufficient content retrieved from fallback method");
    }

    return text;
  } catch (error) {
    console.error("[Website Scraper] Fallback method failed:", error);
    // Return a minimal response rather than failing completely
    return `Unable to fully scrape website: ${url}. Basic information only.`;
  }
}

/**
 * Analyze business size from scraped content
 */
function analyzeBusinessSize(
  mainContent: string,
  aboutContent?: string,
  teamContent?: string,
): { hasMultipleLocations: boolean; teamSize?: string } {
  const allContent = [mainContent, aboutContent, teamContent]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Check for multiple locations
  const locationIndicators = [
    /\d+\s*(locations|offices|stores|branches)/i,
    /(multiple|several|many)\s*(locations|offices|stores|branches)/i,
    /offices? (in|across|throughout)/i,
  ];

  const hasMultipleLocations = locationIndicators.some((regex) =>
    regex.test(allContent),
  );

  // Estimate team size
  let teamSize: string | undefined;

  // Look for explicit team size mentions
  const teamSizeMatch = allContent.match(
    /(\d+)\+?\s*(employees|team members|staff|people)/i,
  );
  if (teamSizeMatch) {
    const count = parseInt(teamSizeMatch[1]);
    if (count < 10) teamSize = "small (1-10)";
    else if (count < 50) teamSize = "medium (10-50)";
    else if (count < 200) teamSize = "large (50-200)";
    else teamSize = "enterprise (200+)";
  } else {
    // Estimate based on team page structure
    if (teamContent) {
      const teamMemberCount = (
        teamContent.match(
          /\b(director|manager|specialist|consultant|agent)\b/gi,
        ) || []
      ).length;
      if (teamMemberCount > 20) teamSize = "large (50-200)";
      else if (teamMemberCount > 10) teamSize = "medium (10-50)";
      else if (teamMemberCount > 0) teamSize = "small (1-10)";
    }
  }

  return { hasMultipleLocations, teamSize };
}
