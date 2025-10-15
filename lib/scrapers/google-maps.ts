/**
 * Google Maps Scraper Integration
 * Uses Serpdog API (previously ScrapingDog) for Google Maps data extraction
 */

interface GoogleMapsResult {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  url?: string;
}

interface ScrapeGoogleMapsParams {
  query: string;
  location: string;
  limit: number;
}

export async function scrapeGoogleMaps({
  query,
  location,
  limit
}: ScrapeGoogleMapsParams): Promise<GoogleMapsResult[]> {
  const apiKey = process.env.SCRAPINGDOG_API_KEY;

  if (!apiKey) {
    throw new Error('SCRAPINGDOG_API_KEY is not configured');
  }

  try {
    // Construct the search query
    // Example: "realtors in Melbourne, Australia"
    const searchQuery = `${query} in ${location}`;

    // Serpdog Google Maps API endpoint
    // Note: Adjust endpoint based on Serpdog's actual API documentation
    const url = new URL('https://api.scrapingdog.com/google_maps');
    url.searchParams.append('api_key', apiKey);
    url.searchParams.append('query', searchQuery);
    url.searchParams.append('results', limit.toString());

    console.log(`[Google Maps Scraper] Searching for: ${searchQuery}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Serpdog API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Parse the results based on Serpdog's response format
    // This may need adjustment based on actual API response structure
    const results: GoogleMapsResult[] = [];

    if (data.local_results && Array.isArray(data.local_results)) {
      for (const result of data.local_results.slice(0, limit)) {
        results.push({
          name: result.title || result.name || 'Unknown Business',
          address: result.address || result.location || undefined,
          phone: result.phone || result.phone_number || undefined,
          website: result.website || result.link || undefined,
          url: result.gps_coordinates
            ? `https://www.google.com/maps/search/?api=1&query=${result.gps_coordinates.latitude},${result.gps_coordinates.longitude}`
            : undefined
        });
      }
    }

    console.log(`[Google Maps Scraper] Found ${results.length} businesses`);

    return results;

  } catch (error) {
    console.error('[Google Maps Scraper] Error:', error);
    throw new Error(`Failed to scrape Google Maps: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Alternative: Manual Google Maps scraping (if Serpdog doesn't work)
 * This requires a different approach using Google Places API or custom scraping
 */
export async function scrapeGoogleMapsAlternative({
  query,
  location,
  limit
}: ScrapeGoogleMapsParams): Promise<GoogleMapsResult[]> {
  // This is a placeholder for alternative implementation
  // You might use Google Places API as a fallback
  console.warn('[Google Maps Scraper] Using alternative method - implement Google Places API');

  // For now, return mock data structure
  return [];
}
