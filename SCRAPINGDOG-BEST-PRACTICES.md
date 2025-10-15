# ScrapingDog Google Maps API Best Practices

This document outlines the best practices for using ScrapingDog's Google Maps API (formerly Serpdog) in the Lead Research platform for optimal business discovery and data extraction.

## Why ScrapingDog Google Maps API?

ScrapingDog is perfect for our lead research platform because it:
- ✅ Scrapes Google Maps search results without blocks
- ✅ Provides structured business data (name, address, phone, website)
- ✅ Handles proxies and rate limiting automatically
- ✅ Supports location-based searches
- ✅ Returns consistent JSON format
- ✅ Cost-effective (~$0.0025 per result)

## Current Implementation

Our platform uses ScrapingDog Google Maps API at: `http://api.scrapingdog.com/google_maps`

### Implementation Location
- **File**: [lib/scrapers/google-maps.ts](lib/scrapers/google-maps.ts)
- **Function**: `scrapeGoogleMaps({ query, location, limit })`

## API Basics

### Endpoint
```
GET http://api.scrapingdog.com/google_maps
```

### Required Parameters
```typescript
{
  api_key: string,     // Your ScrapingDog API key
  query: string        // Search query (e.g., "realtors")
}
```

### Optional Parameters
```typescript
{
  ll: string,          // GPS coordinates (@lat,lng,zoom)
  domain: string,      // Google domain (google.com, google.co.uk)
  language: string,    // Result language (en, es, fr, de)
  country: string,     // Country code (us, uk, au, de)
  page: number,        // Pagination (0, 20, 40, 60...)
  data: string,        // Filter parameter
  type: string,        // 'search' or 'place'
  place_id: string     // Specific place ID
}
```

## Best Practices

### 1. Constructing Search Queries

**Format**: `{business_type} in {location}`

**Good examples**:
```typescript
query: "realtors in Melbourne, Australia"
query: "dentists in Sydney, NSW"
query: "law firms in Perth"
query: "cafes in Collingwood, VIC"
```

**Bad examples**:
```typescript
query: "realtors"                     // ❌ Too broad
query: "real estate agents"           // ❌ Inconsistent with Google
query: "best realtors in Melbourne"   // ❌ Unnecessary qualifiers
```

**Implementation**:
```typescript
// Current approach (Good)
const searchQuery = `${businessType} in ${location}`;

// Examples
const query1 = `${businessType} in Melbourne, Australia`;
const query2 = `${businessType} in Sydney, NSW, Australia`;
```

**Pro tips**:
- Use singular or plural based on common usage
- Include state/region for better targeting
- Add country for unambiguous location
- Match how users would search Google Maps

### 2. Location Targeting

**Three ways to specify location**:

#### Method 1: Query-based (Recommended for simplicity)
```typescript
query: "cafes in Melbourne, Australia"
```
✅ Simple and intuitive
✅ Works for city-level searches
❌ Less precise than GPS coordinates

#### Method 2: GPS Coordinates (Recommended for precision)
```typescript
query: "cafes",
ll: "@-37.8136,144.9631,15z"  // Melbourne CBD
```
✅ Very precise location targeting
✅ Required for pagination
✅ Consistent results
❌ Requires coordinate lookup

#### Method 3: Country Code
```typescript
query: "cafes in Melbourne",
country: "au"
```
✅ Ensures correct country
❌ Less precise than GPS

**Our recommendation**:
- **For initial searches**: Use query-based (Method 1)
- **For pagination**: Use GPS coordinates (Method 2)
- **For city-wide scraping**: Get city coordinates first, then use Method 2

**Getting GPS coordinates**:
```typescript
// Melbourne CBD
ll: "@-37.8136,144.9631,15z"

// Sydney CBD
ll: "@-33.8688,151.2093,15z"

// Brisbane CBD
ll: "@-27.4698,153.0251,15z"

// Zoom levels:
// 15z = City area
// 13z = Metro area
// 11z = Regional area
```

### 3. Pagination for Large Datasets

Google Maps typically shows 20 results per page. To scrape an entire city:

**Pagination pattern**:
```typescript
page: 0   // First 20 results (1-20)
page: 20  // Next 20 results (21-40)
page: 40  // Next 20 results (41-60)
page: 60  // Next 20 results (61-80)
```

**Implementation**:
```typescript
async function scrapeAllBusinesses(query: string, location: string, totalNeeded: number) {
  const results = [];
  let page = 0;

  while (results.length < totalNeeded) {
    const url = new URL('http://api.scrapingdog.com/google_maps');
    url.searchParams.append('api_key', API_KEY);
    url.searchParams.append('query', `${query} in ${location}`);
    url.searchParams.append('ll', getCoordinates(location)); // Required for pagination
    url.searchParams.append('page', page.toString());

    const response = await fetch(url.toString());
    const data = await response.json();

    results.push(...data.local_results);

    // Check if we got results
    if (data.local_results.length === 0) break;

    page += 20;

    // Rate limiting
    await delay(2000); // 2 seconds between requests
  }

  return results.slice(0, totalNeeded);
}
```

**Best practices for pagination**:
- ✅ Always use `ll` parameter for consistent pagination
- ✅ Stop when no more results (empty array)
- ✅ Implement delays between pages (2-3 seconds)
- ✅ Limit to ~100 results (page 5) max to avoid duplicates
- ✅ Cache results to avoid re-scraping

**Recommended limits**:
```typescript
// Maximum recommended per search
const MAX_PAGE = 100;  // 5 pages = 100 results

// Stop paginating if:
if (page >= MAX_PAGE || data.local_results.length === 0) {
  break;
}
```

### 4. Parsing Response Data

**Response structure**:
```json
{
  "search_results": [
    {
      "title": "Business Name",
      "place_id": "ChIJ...",
      "data_id": "0x89c...",
      "gps_coordinates": {
        "latitude": -37.8136,
        "longitude": 144.9631
      },
      "rating": 4.5,
      "reviews": 234,
      "type": "Coffee shop",
      "address": "123 Main St, Melbourne VIC 3000",
      "phone": "+61 3 1234 5678",
      "website": "https://example.com",
      "operating_hours": {...},
      "thumbnail": "https://..."
    }
  ]
}
```

**Extracting key data**:
```typescript
interface BusinessData {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  url?: string;
  placeId?: string;
  rating?: number;
  reviewCount?: number;
}

function parseResults(data: any): BusinessData[] {
  if (!data.local_results || !Array.isArray(data.local_results)) {
    return [];
  }

  return data.local_results.map(result => ({
    name: result.title || 'Unknown Business',
    address: result.address || undefined,
    phone: result.phone || undefined,
    website: result.website || undefined,
    url: result.gps_coordinates
      ? `https://www.google.com/maps/search/?api=1&query=${result.gps_coordinates.latitude},${result.gps_coordinates.longitude}`
      : undefined,
    placeId: result.place_id || undefined,
    rating: result.rating || undefined,
    reviewCount: result.reviews || undefined,
  }));
}
```

**Data quality checks**:
```typescript
function validateBusiness(business: BusinessData): boolean {
  // Must have name
  if (!business.name || business.name === 'Unknown Business') {
    return false;
  }

  // Must have at least one contact method
  if (!business.website && !business.phone && !business.address) {
    return false;
  }

  // Exclude certain types (optional)
  const excludedTypes = ['ATM', 'Parking lot'];
  if (business.type && excludedTypes.includes(business.type)) {
    return false;
  }

  return true;
}
```

### 5. Localization

**For Australian businesses** (our primary market):

```typescript
{
  api_key: API_KEY,
  query: "realtors in Melbourne",
  domain: "google.com.au",    // Australian Google
  country: "au",               // Australia
  language: "en"               // English
}
```

**Other markets**:
```typescript
// United Kingdom
{ domain: "google.co.uk", country: "uk", language: "en" }

// United States
{ domain: "google.com", country: "us", language: "en" }

// France
{ domain: "google.fr", country: "fr", language: "fr" }
```

**Why this matters**:
- Local businesses appear first
- Phone numbers formatted correctly
- Addresses in local format
- Opening hours in local timezone

### 6. Error Handling

**Common errors and solutions**:

```typescript
async function scrapeGoogleMaps(params) {
  try {
    const response = await fetch(buildUrl(params));

    // Check HTTP status
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 402) {
        throw new Error('Insufficient credits');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded - wait and retry');
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    }

    const data = await response.json();

    // Check for results
    if (!data.local_results || data.local_results.length === 0) {
      console.warn(`No results for query: ${params.query}`);
      return [];
    }

    return parseResults(data);

  } catch (error) {
    console.error('[ScrapingDog] Error:', error);

    // Implement retry logic for transient errors
    if (error.message.includes('Rate limit')) {
      await delay(10000); // Wait 10 seconds
      return scrapeGoogleMaps(params); // Retry once
    }

    throw error;
  }
}
```

**Retry strategy**:
```typescript
async function scrapeWithRetry(params, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await scrapeGoogleMaps(params);
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = Math.min(1000 * Math.pow(2, i), 10000); // Exponential backoff
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }
}
```

### 7. Rate Limiting

**ScrapingDog limits**:
- Depends on your plan (check dashboard)
- Typically 1-5 requests per second

**Best practices**:
```typescript
// Simple delay
async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Rate-limited scraper
class RateLimitedScraper {
  private lastRequest = 0;
  private minDelay = 1000; // 1 second between requests

  async scrape(params) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < this.minDelay) {
      await delay(this.minDelay - timeSinceLastRequest);
    }

    this.lastRequest = Date.now();
    return await scrapeGoogleMaps(params);
  }
}
```

**For bulk scraping**:
```typescript
// Process in batches
async function scrapeCities(cities: string[], businessType: string) {
  const results = [];

  for (const city of cities) {
    console.log(`Scraping ${businessType} in ${city}...`);

    const cityResults = await scrapeGoogleMaps({
      query: businessType,
      location: city,
      limit: 50
    });

    results.push(...cityResults);

    // Wait between cities
    await delay(5000); // 5 seconds
  }

  return results;
}
```

### 8. Cost Optimization

**Current cost**: ~$0.0025 per result

**Strategies to reduce costs**:

1. **Cache results**
   ```typescript
   // Store results in database
   const cached = await db.getCachedResults(query, location);
   if (cached && Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
     return cached.results; // Use cache if less than 7 days old
   }
   ```

2. **Limit results**
   ```typescript
   // Don't scrape more than needed
   const limit = Math.min(requestedLimit, 50); // Cap at 50
   ```

3. **Smart pagination**
   ```typescript
   // Stop early if you have enough good results
   const validResults = results.filter(validateBusiness);
   if (validResults.length >= targetCount) {
     break; // Stop paginating
   }
   ```

4. **Batch similar searches**
   ```typescript
   // Scrape multiple business types for same location
   const types = ['realtors', 'dentists', 'lawyers'];
   for (const type of types) {
     await scrapeGoogleMaps({ query: type, location: 'Melbourne' });
   }
   ```

### 9. Advanced: Scraping Entire Cities

To scrape all businesses of a type in a major city like Melbourne or Sydney:

**Strategy**:
```typescript
async function scrapeEntireCity(
  businessType: string,
  city: string,
  maxResults: number = 500
) {
  const results = [];
  let page = 0;

  // Get city center coordinates
  const coordinates = getCityCoordinates(city);

  while (results.length < maxResults) {
    const url = buildUrl({
      api_key: API_KEY,
      query: `${businessType} in ${city}`,
      ll: coordinates,
      page: page,
      domain: 'google.com.au',
      country: 'au'
    });

    const response = await fetch(url);
    const data = await response.json();

    if (!data.local_results || data.local_results.length === 0) {
      console.log('No more results');
      break;
    }

    // Filter and deduplicate
    const newResults = data.local_results.filter(r =>
      !results.some(existing => existing.place_id === r.place_id)
    );

    results.push(...newResults);

    console.log(`Scraped page ${page / 20 + 1}, total: ${results.length}`);

    // Stop at page 5 (100 results) to avoid diminishing returns
    if (page >= 100) break;

    page += 20;
    await delay(2000); // Rate limiting
  }

  return results.slice(0, maxResults);
}
```

**City coordinates** (Australian capitals):
```typescript
const CITY_COORDINATES = {
  'Melbourne': '@-37.8136,144.9631,14z',
  'Sydney': '@-33.8688,151.2093,14z',
  'Brisbane': '@-27.4698,153.0251,14z',
  'Perth': '@-31.9505,115.8605,14z',
  'Adelaide': '@-34.9285,138.6007,14z',
  'Gold Coast': '@-28.0167,153.4000,13z',
  'Canberra': '@-35.2809,149.1300,13z',
  'Newcastle': '@-32.9283,151.7817,13z',
  'Wollongong': '@-34.4278,150.8931,13z',
  'Geelong': '@-38.1499,144.3617,13z',
};
```

### 10. Data Quality & Validation

**Ensuring high-quality leads**:

```typescript
function enrichBusinessData(business: any) {
  return {
    ...business,

    // Normalize phone numbers
    phone: normalizePhone(business.phone),

    // Clean website URLs
    website: normalizeWebsite(business.website),

    // Extract additional data
    hasMultipleLocations: business.title?.includes('Multiple locations'),
    chainBusiness: isChainBusiness(business.title),

    // Quality score
    qualityScore: calculateQualityScore(business)
  };
}

function calculateQualityScore(business: any): number {
  let score = 0;

  if (business.website) score += 30;
  if (business.phone) score += 20;
  if (business.rating && business.rating >= 4) score += 20;
  if (business.reviews && business.reviews >= 10) score += 15;
  if (business.operating_hours) score += 10;
  if (business.address) score += 5;

  return score;
}

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;

  // Remove spaces, parentheses, dashes
  return phone.replace(/[\s\(\)\-]/g, '');
}

function normalizeWebsite(website?: string): string | undefined {
  if (!website) return undefined;

  // Ensure it starts with http/https
  if (!website.startsWith('http')) {
    return `https://${website}`;
  }

  return website;
}
```

## Integration with Inngest

**Current workflow**:
1. User creates run
2. Inngest triggers `processLeadRun`
3. Scrape Google Maps for businesses
4. Save leads to Supabase
5. Trigger individual lead research

**Optimized workflow**:
```typescript
export const processLeadRun = inngest.createFunction(
  { id: 'process-lead-run' },
  { event: 'lead/run.created' },
  async ({ event, step }) => {
    // Step 1: Scrape Google Maps
    const businesses = await step.run('scrape-google-maps', async () => {
      return await scrapeGoogleMaps({
        query: event.data.businessType,
        location: event.data.location,
        limit: event.data.targetCount,
        domain: 'google.com.au',
        country: 'au'
      });
    });

    // Step 2: Filter and enrich
    const enrichedBusinesses = await step.run('enrich-data', async () => {
      return businesses
        .map(enrichBusinessData)
        .filter(b => b.qualityScore >= 50) // Only quality leads
        .slice(0, event.data.targetCount);
    });

    // Continue with saving and research...
  }
);
```

## Monitoring & Analytics

**Track these metrics**:
```typescript
// Success rate
const successRate = successfulScrapes / totalScrapes;

// Average results per query
const avgResults = totalResults / totalQueries;

// Cost per lead
const costPerLead = (totalAPICalls * 0.0025) / totalLeads;

// Quality distribution
const highQuality = leads.filter(l => l.qualityScore >= 80).length;
const mediumQuality = leads.filter(l => l.qualityScore >= 50 && l.qualityScore < 80).length;
const lowQuality = leads.filter(l => l.qualityScore < 50).length;
```

## Troubleshooting

### "No results found"
**Causes**:
- Query too specific
- Location not recognized
- No businesses of that type in area

**Solutions**:
- Broaden query (remove qualifiers)
- Try different location format
- Verify location spelling

### "Rate limit exceeded"
**Cause**: Too many requests too quickly
**Solution**: Implement delays (2-3 seconds between requests)
**Action**: Check your ScrapingDog dashboard for limits

### "Invalid API key"
**Cause**: Wrong key or expired
**Solution**: Verify in ScrapingDog dashboard
**Action**: Update `SCRAPINGDOG_API_KEY` in `.env`

### "Duplicate results"
**Cause**: Pagination returns same businesses
**Solution**: Deduplicate by `place_id`
**Action**: Filter results before saving

## Summary Checklist

- ✅ Format queries as "{type} in {location}"
- ✅ Use GPS coordinates for pagination
- ✅ Implement rate limiting (2-3s between requests)
- ✅ Validate and enrich business data
- ✅ Handle errors gracefully with retries
- ✅ Cache results to reduce costs
- ✅ Set localization (domain, country, language)
- ✅ Limit pagination to ~100 results max
- ✅ Calculate quality scores
- ✅ Deduplicate by place_id

## Resources

- [ScrapingDog Dashboard](https://www.scrapingdog.com/dashboard) (API keys & credits)
- [Google Maps API Documentation](https://docs.scrapingdog.com/google-maps-api)
- [Pricing](https://www.scrapingdog.com/google-search-api) (~$0.0025 per result)
- [Supported Countries](https://docs.scrapingdog.com/google-search-scraper-api/google-country-parameter-supported-google-countries)

---

**Last Updated**: October 2025
**Implementation File**: [lib/scrapers/google-maps.ts](lib/scrapers/google-maps.ts)
**API Version**: v1
