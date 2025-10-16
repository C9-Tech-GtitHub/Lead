/**
 * City Search Service
 * Handles multi-suburb searches with duplicate detection
 */

import { scrapeGoogleMaps } from "@/lib/scrapers/google-maps";

export interface SearchResult {
  place_id: string;
  data_id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  suburb?: string; // Which suburb this result came from
}

export interface SuburbSearchConfig {
  city: string;
  suburbs: string[];
  state: string; // e.g., "NSW", "VIC"
}

export interface CitySearchOptions {
  query: string;
  config: SuburbSearchConfig;
  limit: number; // Total limit across all suburbs
  perSuburbLimit?: number; // Max results per suburb (default: 20)
  mode: "city-wide" | "suburbs" | "hybrid";
}

/**
 * Searches for businesses across multiple suburbs in a city
 * with automatic duplicate detection using place_id
 */
export async function searchCity({
  query,
  config,
  limit,
  perSuburbLimit = 20,
  mode = "hybrid",
}: CitySearchOptions): Promise<SearchResult[]> {
  const seenPlaceIds = new Set<string>();
  const results: SearchResult[] = [];

  console.log(
    `[City Search] Starting ${mode} search for "${query}" in ${config.city}, ${config.state}`,
  );
  console.log(
    `[City Search] Target limit: ${limit}, Per suburb limit: ${perSuburbLimit}`,
  );

  // Mode 1: City-wide search first (if hybrid or city-wide mode)
  if (mode === "city-wide" || mode === "hybrid") {
    console.log(`[City Search] Performing city-wide search for ${config.city}`);

    try {
      const cityResults = await scrapeGoogleMaps({
        query,
        location: `${config.city}, ${config.state}`,
        limit: mode === "city-wide" ? limit : Math.min(limit, 80), // Get up to 80 for hybrid
      });

      // Add city-wide results
      for (const result of cityResults) {
        const placeId = extractPlaceId(result);
        if (placeId && !seenPlaceIds.has(placeId)) {
          seenPlaceIds.add(placeId);
          results.push({
            place_id: placeId,
            data_id: extractDataId(result) || placeId,
            name: result.name,
            address: result.address,
            phone: result.phone,
            website: result.website,
            latitude: result.latitude,
            longitude: result.longitude,
            suburb: config.city, // Mark as city-wide result
          });
        }
      }

      console.log(
        `[City Search] City-wide search found ${results.length} unique businesses`,
      );

      // If we hit the limit in city-wide mode, return early
      if (mode === "city-wide" || results.length >= limit) {
        return results.slice(0, limit);
      }
    } catch (error) {
      console.error("[City Search] City-wide search failed:", error);
      // Continue to suburb searches if city-wide fails
    }
  }

  // Mode 2: Suburb-by-suburb search
  if (mode === "suburbs" || mode === "hybrid") {
    const remainingLimit = limit - results.length;

    if (remainingLimit <= 0) {
      console.log(
        "[City Search] Limit reached from city-wide search, skipping suburb searches",
      );
      return results;
    }

    console.log(`[City Search] Searching ${config.suburbs.length} suburbs`);

    for (const suburb of config.suburbs) {
      // Stop if we've hit the overall limit
      if (results.length >= limit) {
        console.log(
          "[City Search] Overall limit reached, stopping suburb searches",
        );
        break;
      }

      console.log(`[City Search] Searching suburb: ${suburb}`);

      try {
        const suburbResults = await scrapeGoogleMaps({
          query,
          location: `${suburb}, ${config.city}, ${config.state}`,
          limit: perSuburbLimit,
        });

        let suburbNewCount = 0;

        // Add new results from this suburb
        for (const result of suburbResults) {
          if (results.length >= limit) break;

          const placeId = extractPlaceId(result);

          // Skip duplicates
          if (!placeId || seenPlaceIds.has(placeId)) {
            continue;
          }

          seenPlaceIds.add(placeId);
          suburbNewCount++;

          results.push({
            place_id: placeId,
            data_id: extractDataId(result) || placeId,
            name: result.name,
            address: result.address,
            phone: result.phone,
            website: result.website,
            latitude: result.latitude,
            longitude: result.longitude,
            suburb: suburb,
          });
        }

        console.log(
          `[City Search] ${suburb}: Found ${suburbNewCount} new businesses (${suburbResults.length} total, ${suburbResults.length - suburbNewCount} duplicates)`,
        );

        // Small delay to avoid rate limiting
        if (config.suburbs.indexOf(suburb) < config.suburbs.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`[City Search] Failed to search ${suburb}:`, error);
        // Continue with next suburb
      }
    }
  }

  console.log(
    `[City Search] Complete! Found ${results.length} unique businesses across all locations`,
  );
  console.log(
    `[City Search] Duplicates filtered: ${seenPlaceIds.size - results.length}`,
  );

  return results.slice(0, limit);
}

/**
 * Extract place_id from Google Maps result
 * The scraper might return this in different formats
 */
function extractPlaceId(result: any): string | null {
  // Try direct place_id field
  if (result.place_id) return result.place_id;

  // Try data_id as fallback
  if (result.data_id) return result.data_id;

  // Try extracting from URL if present
  if (result.url && result.url.includes("maps")) {
    const match = result.url.match(/place_id=([^&]+)/);
    if (match) return match[1];
  }

  // Last resort: create from coordinates if available
  if (result.latitude && result.longitude) {
    return `coord_${result.latitude}_${result.longitude}`;
  }

  return null;
}

/**
 * Extract data_id from Google Maps result
 */
function extractDataId(result: any): string | null {
  return result.data_id || result.place_id || null;
}
