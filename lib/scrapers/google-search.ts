/**
 * Google Search API Integration using ScrapingDog
 * Used to find website URLs for businesses that don't have one listed
 */

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayed_link: string;
}

interface GoogleSearchResponse {
  organic_data: GoogleSearchResult[];
}

/**
 * Search Google for a business and try to find its website
 */
export async function findBusinessWebsite(
  businessName: string,
  location: string
): Promise<string | null> {
  const apiKey = process.env.SCRAPINGDOG_API_KEY;

  if (!apiKey) {
    throw new Error('SCRAPINGDOG_API_KEY is not configured');
  }

  try {
    console.log(`[Google Search] Searching for: ${businessName} ${location}`);

    // Construct search query
    const query = encodeURIComponent(`${businessName} ${location}`);

    // Build API URL with parameters
    const url = `https://api.scrapingdog.com/google/?api_key=${apiKey}&query=${query}&results=5&country=au`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Google Search] API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data: GoogleSearchResponse = await response.json();

    if (!data.organic_data || data.organic_data.length === 0) {
      console.log(`[Google Search] No results found for ${businessName}`);
      return null;
    }

    // Try to find the official website
    // Look for results that:
    // 1. Match the business name in the title
    // 2. Are not directories/listings (like Yelp, Yellow Pages, etc.)
    const directoryDomains = [
      'yelp.com',
      'yellowpages.com',
      'facebook.com',
      'instagram.com',
      'linkedin.com',
      'maps.google.com',
      'google.com/maps',
      'tripadvisor.com',
      'localsearch.com.au',
      'truelocal.com.au',
      'hotfrog.com.au'
    ];

    for (const result of data.organic_data) {
      // Skip directory/listing sites
      const isDirectory = directoryDomains.some(domain =>
        result.link.toLowerCase().includes(domain)
      );

      if (!isDirectory) {
        // Check if the business name appears in the title or link
        const nameInTitle = result.title.toLowerCase().includes(businessName.toLowerCase());
        const nameInLink = result.displayed_link.toLowerCase().includes(businessName.toLowerCase().replace(/\s+/g, ''));

        if (nameInTitle || nameInLink) {
          console.log(`[Google Search] Found potential website: ${result.link}`);
          return result.link;
        }
      }
    }

    // If no exact match, return the first non-directory result
    const firstNonDirectory = data.organic_data.find(result =>
      !directoryDomains.some(domain => result.link.toLowerCase().includes(domain))
    );

    if (firstNonDirectory) {
      console.log(`[Google Search] Using best guess website: ${firstNonDirectory.link}`);
      return firstNonDirectory.link;
    }

    console.log(`[Google Search] Could not find a suitable website for ${businessName}`);
    return null;

  } catch (error) {
    console.error('[Google Search] Error:', error);
    return null;
  }
}
