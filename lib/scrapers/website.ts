/**
 * Website Scraper Integration
 * Uses Firecrawl API for intelligent website content extraction
 */

interface WebsiteData {
  mainContent: string;
  aboutContent?: string;
  teamContent?: string;
  hasMultipleLocations: boolean;
  teamSize?: string;
}

export async function scrapeWebsite(url: string): Promise<WebsiteData> {
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not configured');
  }

  try {
    console.log(`[Website Scraper] Scraping: ${url}`);

    // Normalize URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    // Step 1: Scrape main page
    const mainContent = await scrapeWithFirecrawl(normalizedUrl, apiKey);

    // Step 2: Try to find and scrape About page
    let aboutContent: string | undefined;
    const aboutUrls = [
      `${normalizedUrl}/about`,
      `${normalizedUrl}/about-us`,
      `${normalizedUrl}/about-us/`,
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
    const analysis = analyzeBusinessSize(mainContent, aboutContent, teamContent);

    return {
      mainContent,
      aboutContent,
      teamContent,
      hasMultipleLocations: analysis.hasMultipleLocations,
      teamSize: analysis.teamSize
    };

  } catch (error) {
    console.error('[Website Scraper] Error:', error);
    throw new Error(`Failed to scrape website: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Internal helper: Scrape a single URL with Firecrawl
 */
async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      url: url,
      formats: ['markdown'],
      onlyMainContent: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Firecrawl v1 returns content in data.markdown
  return data.data?.markdown || data.markdown || '';
}

/**
 * Analyze business size from scraped content
 */
function analyzeBusinessSize(
  mainContent: string,
  aboutContent?: string,
  teamContent?: string
): { hasMultipleLocations: boolean; teamSize?: string } {
  const allContent = [mainContent, aboutContent, teamContent]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Check for multiple locations
  const locationIndicators = [
    /\d+\s*(locations|offices|stores|branches)/i,
    /(multiple|several|many)\s*(locations|offices|stores|branches)/i,
    /offices? (in|across|throughout)/i,
  ];

  const hasMultipleLocations = locationIndicators.some(regex => regex.test(allContent));

  // Estimate team size
  let teamSize: string | undefined;

  // Look for explicit team size mentions
  const teamSizeMatch = allContent.match(/(\d+)\+?\s*(employees|team members|staff|people)/i);
  if (teamSizeMatch) {
    const count = parseInt(teamSizeMatch[1]);
    if (count < 10) teamSize = 'small (1-10)';
    else if (count < 50) teamSize = 'medium (10-50)';
    else if (count < 200) teamSize = 'large (50-200)';
    else teamSize = 'enterprise (200+)';
  } else {
    // Estimate based on team page structure
    if (teamContent) {
      const teamMemberCount = (teamContent.match(/\b(director|manager|specialist|consultant|agent)\b/gi) || []).length;
      if (teamMemberCount > 20) teamSize = 'large (50-200)';
      else if (teamMemberCount > 10) teamSize = 'medium (10-50)';
      else if (teamMemberCount > 0) teamSize = 'small (1-10)';
    }
  }

  return { hasMultipleLocations, teamSize };
}
