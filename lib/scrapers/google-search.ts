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
  organic_results: GoogleSearchResult[];
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
    // Extract just the city name from location (remove street address)
    // Example: "405 Smith St,Fitzroy VIC 3065,Australia" -> "Fitzroy"
    const cityMatch = location.match(/([A-Za-z\s]+)(?:\s+(?:VIC|NSW|QLD|SA|WA|TAS|NT|ACT))?/);
    const city = cityMatch ? cityMatch[1].trim() : location.split(',')[0].trim();

    // Simple query: business name + city + website
    const searchQuery = `${businessName} ${city} website`;
    console.log(`[Google Search] Searching for: ${searchQuery}`);

    // Construct search query
    const query = encodeURIComponent(searchQuery);

    // Build API URL with parameters
    const url = `https://api.scrapingdog.com/google/?api_key=${apiKey}&query=${query}&results=5&country=au`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Google Search] API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data: GoogleSearchResponse = await response.json();

    if (!data.organic_results || data.organic_results.length === 0) {
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

    // Extract the core business name (remove common suffixes like location names)
    const coreBusinessName = businessName
      .replace(/\s+(Collingwood|Fitzroy|Melbourne|Sydney|Brisbane|Perth|Adelaide|CBD|Store|Shop)$/i, '')
      .trim();

    for (const result of data.organic_results) {
      // Skip directory/listing sites
      const isDirectory = directoryDomains.some(domain =>
        result.link.toLowerCase().includes(domain)
      );

      if (!isDirectory) {
        // Check if the business name appears in the title or link
        const titleLower = result.title.toLowerCase();
        const linkLower = result.displayed_link.toLowerCase();
        const businessLower = businessName.toLowerCase();
        const coreNameLower = coreBusinessName.toLowerCase();

        // Check for matches with both full name and core name
        const nameInTitle = titleLower.includes(businessLower) || titleLower.includes(coreNameLower);
        const nameInLink = linkLower.includes(businessLower.replace(/\s+/g, '')) ||
                          linkLower.includes(coreNameLower.replace(/\s+/g, ''));

        if (nameInTitle || nameInLink) {
          console.log(`[Google Search] Found potential website: ${result.link}`);
          return result.link;
        }
      }
    }

    // If no exact match, return the first non-directory result
    const firstNonDirectory = data.organic_results.find(result =>
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
