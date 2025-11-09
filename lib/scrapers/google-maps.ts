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
  latitude?: number;
  longitude?: number;
}

interface ScrapeGoogleMapsParams {
  query: string;
  location: string;
  limit: number;
}

export async function scrapeGoogleMaps({
  query,
  location,
  limit,
}: ScrapeGoogleMapsParams): Promise<GoogleMapsResult[]> {
  const apiKey = process.env.SCRAPINGDOG_API_KEY;

  if (!apiKey) {
    throw new Error("SCRAPINGDOG_API_KEY is not configured");
  }

  try {
    // Automatically append "Australia" to location if not already present
    // This ensures ambiguous locations like "Collingwood" are treated as Australian
    let normalizedLocation = location.trim();
    if (
      !normalizedLocation.toLowerCase().includes("australia") &&
      !normalizedLocation.toLowerCase().includes("aus") &&
      !normalizedLocation
        .toLowerCase()
        .match(/\b(nsw|vic|qld|sa|wa|tas|nt|act)\b/i)
    ) {
      normalizedLocation = `${normalizedLocation}, Australia`;
    }

    // Construct the search query
    // Example: "realtors in Melbourne, Australia"
    const searchQuery = `${query} in ${normalizedLocation}`;

    // ScrapingDog Google Maps API endpoint
    // Reference: https://www.scrapingdog.com/google-maps-scraper-api
    const url = new URL("https://api.scrapingdog.com/google_maps");
    url.searchParams.append("api_key", apiKey);
    url.searchParams.append("query", searchQuery);
    url.searchParams.append("results", limit.toString());

    // CRITICAL: Set both domain AND country for Australian results
    // domain = google.com.au (which Google Maps site to use)
    // country = au (two-letter country code for geographic filtering)
    url.searchParams.append("domain", "google.com.au");
    url.searchParams.append("country", "au");

    console.log(`[Google Maps Scraper] Searching for: ${searchQuery}`);
    if (normalizedLocation !== location) {
      console.log(
        `[Google Maps Scraper] Location normalized: "${location}" -> "${normalizedLocation}"`,
      );
    }
    console.log(`[Google Maps Scraper] Domain: google.com.au, Country: AU`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Serpdog API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Parse the results based on ScrapingDog's response format
    const results: GoogleMapsResult[] = [];

    if (data.search_results && Array.isArray(data.search_results)) {
      for (const result of data.search_results.slice(0, limit)) {
        // Skip permanently closed businesses
        const openState = String(result.open_state || result.hours || "");
        if (openState.toLowerCase().includes("permanently closed")) {
          console.log(
            `[Google Maps Scraper] Skipping permanently closed business: ${result.title || result.name}`,
          );
          continue;
        }

        // Skip temporarily closed businesses (optional - you can remove this if you want to include them)
        if (openState.toLowerCase().includes("temporarily closed")) {
          console.log(
            `[Google Maps Scraper] Skipping temporarily closed business: ${result.title || result.name}`,
          );
          continue;
        }

        // Filter out non-Australian results (sometimes Google Maps returns irrelevant locations)
        const address = result.address || "";
        if (
          address &&
          !address.toLowerCase().includes("australia") &&
          !address.match(/\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/i)
        ) {
          console.log(
            `[Google Maps Scraper] Skipping non-Australian business: ${result.title || result.name} (${address})`,
          );
          continue;
        }

        results.push({
          name: result.title || result.name || "Unknown Business",
          address: result.address || undefined,
          phone: result.phone || undefined,
          website: result.website || undefined,
          latitude: result.gps_coordinates?.latitude || undefined,
          longitude: result.gps_coordinates?.longitude || undefined,
          url: result.gps_coordinates
            ? `https://www.google.com/maps/search/?api=1&query=${result.gps_coordinates.latitude},${result.gps_coordinates.longitude}`
            : undefined,
        });
      }
    }

    console.log(`[Google Maps Scraper] Found ${results.length} businesses`);

    return results;
  } catch (error) {
    console.error("[Google Maps Scraper] Error:", error);
    throw new Error(
      `Failed to scrape Google Maps: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Alternative: Manual Google Maps scraping (if Serpdog doesn't work)
 * This requires a different approach using Google Places API or custom scraping
 */
export async function scrapeGoogleMapsAlternative({
  query,
  location,
  limit,
}: ScrapeGoogleMapsParams): Promise<GoogleMapsResult[]> {
  // This is a placeholder for alternative implementation
  // You might use Google Places API as a fallback
  console.warn(
    "[Google Maps Scraper] Using alternative method - implement Google Places API",
  );

  // For now, return mock data structure
  return [];
}
