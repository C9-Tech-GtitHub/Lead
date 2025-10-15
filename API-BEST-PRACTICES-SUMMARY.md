# API Best Practices Summary

Quick reference guide for all APIs used in the Lead Research platform.

## Overview

Our platform integrates three key APIs:
1. **ScrapingDog** - Google Maps business discovery
2. **Firecrawl** - Website content extraction
3. **OpenAI GPT** - AI-powered lead analysis

---

## 📍 ScrapingDog (Google Maps API)

### Quick Reference
- **Endpoint**: `http://api.scrapingdog.com/google_maps`
- **Cost**: ~$0.0025 per result
- **Implementation**: [lib/scrapers/google-maps.ts](lib/scrapers/google-maps.ts)
- **Documentation**: [SCRAPINGDOG-BEST-PRACTICES.md](SCRAPINGDOG-BEST-PRACTICES.md)

### Essential Parameters
```typescript
{
  api_key: string,           // Your API key
  query: string,             // "realtors in Melbourne, Australia"
  ll: string,                // GPS coords: "@-37.8136,144.9631,15z"
  domain: "google.com.au",   // For Australian searches
  country: "au",             // Australia
  language: "en",            // English
  page: 0                    // Pagination (0, 20, 40...)
}
```

### Best Practices
✅ Format queries as `"{type} in {location}"`
✅ Use GPS coordinates for pagination
✅ Implement 2-3 second delays between requests
✅ Limit pagination to ~100 results max (page 5)
✅ Validate and deduplicate by `place_id`
✅ Set localization (domain, country, language)

### Common Patterns
```typescript
// City-wide search
query: "cafes in Melbourne, Australia"
ll: "@-37.8136,144.9631,15z"
domain: "google.com.au"
country: "au"

// Pagination
page: 0   // Results 1-20
page: 20  // Results 21-40
page: 40  // Results 41-60
```

---

## 🌐 Firecrawl (Website Scraping)

### Quick Reference
- **Endpoint**: `https://api.firecrawl.dev/v1/scrape`
- **Cost**: ~$0.001 per page
- **Implementation**: [lib/scrapers/website.ts](lib/scrapers/website.ts)
- **Documentation**: [FIRECRAWL-BEST-PRACTICES.md](FIRECRAWL-BEST-PRACTICES.md)

### Essential Parameters
```typescript
{
  url: string,               // Website URL
  formats: ["markdown"],     // Output format
  onlyMainContent: true,     // Remove clutter
  maxAge: 86400000,          // Cache 1 day
  timeout: 30000             // 30 second timeout
}
```

### Best Practices
✅ Use `markdown` format for AI analysis
✅ Set `onlyMainContent: true` to remove navigation
✅ Implement caching with `maxAge` (1 day recommended)
✅ Try multiple URL patterns for about/team pages
✅ Handle errors gracefully
✅ Set appropriate timeouts (30-60s)
✅ Rate limit to 1-2 seconds between requests

### Common Patterns
```typescript
// Main page scrape
{
  url: "https://example.com",
  formats: ["markdown"],
  onlyMainContent: true,
  maxAge: 86400000  // 1 day cache
}

// Multi-page scraping
const pages = [
  "/about",
  "/about-us",
  "/team",
  "/meet-the-team"
];

for (const page of pages) {
  try {
    const content = await scrape(`${baseUrl}${page}`);
    if (content.length > 100) break;
  } catch (err) {
    continue;
  }
}
```

---

## 🤖 OpenAI GPT (AI Analysis)

### Quick Reference
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Current Model**: `gpt-4o-mini` (temporary)
- **Target Model**: `gpt-5-mini` (when available)
- **Cost**: ~$0.015/lead (GPT-4o-mini), ~$0.0037/lead (GPT-5)
- **Implementation**: [lib/ai/researcher.ts](lib/ai/researcher.ts)
- **Documentation**: [GPT5-BEST-PRACTICES.md](GPT5-BEST-PRACTICES.md)

### Current Configuration
```typescript
{
  model: "gpt-4o-mini",      // Temporary placeholder
  max_tokens: 2000,
  temperature: 0.7,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ]
}
```

### Target Configuration (GPT-5)
```typescript
{
  model: "gpt-5-mini",
  reasoning_effort: "low",   // Fast for structured tasks
  verbosity: "medium",       // Balanced output
  max_completion_tokens: 2000
}
```

### Best Practices
✅ Use structured system prompts with clear criteria
✅ Provide explicit A-F grading scale
✅ Limit content to prevent token overflow
✅ Parse responses with regex for structured data
✅ Validate output format and quality
✅ Cache analyses by content hash
✅ Monitor token usage and costs

### Token Management
```
Input tokens:  ~2,650 (content + prompts)
Output tokens: ~1,500 (analysis)
Total/lead:    ~4,150 tokens

Cost (GPT-4o-mini): ~$0.015 per lead
Cost (GPT-5-mini):  ~$0.0037 per lead (75% savings!)
```

### Common Patterns
```typescript
// System prompt structure
const systemPrompt = `
You are an expert business analyst.

## Grading Criteria
[A-F scale with specific criteria]

## Output Format
## GRADE: [A/B/C/D/F]
## REASONING: [explanation]
## REPORT: [analysis]
## SUGGESTED HOOKS:
- [hook 1]
## PAIN POINTS:
- [point 1]
## OPPORTUNITIES:
- [opportunity 1]
`;

// User prompt construction
const userPrompt = `
Analyze this business:
**Name:** ${business.name}
**Website:** ${business.website}
**Type:** ${business.type}

## Website Content:
${content.slice(0, 3000)}

## About Page:
${aboutContent.slice(0, 2000)}
`;
```

---

## 📊 Cost Analysis

### Per Lead Breakdown
| Service | Cost | Usage |
|---------|------|-------|
| Google Maps (ScrapingDog) | $0.0025 | 1 search result |
| Website Scraping (Firecrawl) | $0.003 | ~3 pages (main, about, team) |
| AI Analysis (GPT-4o-mini) | $0.015 | 1 analysis |
| **Total (Current)** | **$0.0205** | |
| | | |
| AI Analysis (GPT-5-mini) | $0.0037 | 1 analysis |
| **Total (With GPT-5)** | **$0.0092** | **55% cheaper!** |

### Volume Pricing
| Leads | Current Cost | With GPT-5 | Savings |
|-------|--------------|------------|---------|
| 10 | $0.21 | $0.09 | $0.12 (57%) |
| 50 | $1.03 | $0.46 | $0.57 (55%) |
| 100 | $2.05 | $0.92 | $1.13 (55%) |
| 500 | $10.25 | $4.60 | $5.65 (55%) |

---

## 🔄 Complete Workflow

### 1. Business Discovery (ScrapingDog)
```typescript
const businesses = await scrapeGoogleMaps({
  query: "realtors in Melbourne, Australia",
  ll: "@-37.8136,144.9631,15z",
  domain: "google.com.au",
  country: "au",
  limit: 50
});
// Cost: 50 × $0.0025 = $0.125
```

### 2. Website Scraping (Firecrawl)
```typescript
for (const business of businesses) {
  // Main page
  const mainContent = await scrape(business.website);

  // About page
  const aboutContent = await scrape(`${business.website}/about`);

  // Team page
  const teamContent = await scrape(`${business.website}/team`);

  // Delay between requests
  await delay(1000);
}
// Cost per business: 3 pages × $0.001 = $0.003
// Total for 50: $0.15
```

### 3. AI Analysis (OpenAI)
```typescript
for (const business of businesses) {
  const analysis = await researchLead({
    name: business.name,
    website: business.website,
    websiteContent: mainContent,
    aboutContent: aboutContent,
    teamContent: teamContent,
  });

  await saveAnalysis(analysis);
}
// Cost per business: $0.015 (GPT-4o-mini)
// Total for 50: $0.75
```

### Total Workflow Cost
```
ScrapingDog:  $0.13
Firecrawl:    $0.15
OpenAI:       $0.75
─────────────────
Total:        $1.03 for 50 leads
Per lead:     $0.021
```

---

## ⚡ Performance Optimization

### Parallel Processing
```typescript
// Process multiple leads concurrently
const CONCURRENCY = 5;

async function processLeads(leads: Lead[]) {
  const chunks = chunkArray(leads, CONCURRENCY);

  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (lead) => {
      const content = await scrapeWebsite(lead.website);
      const analysis = await analyzeWithAI(content);
      await saveLead(analysis);
    }));

    await delay(2000); // Rate limiting between batches
  }
}
```

### Caching Strategy
```typescript
// 1. ScrapingDog - Cache search results (7 days)
const cacheKey = `gmaps:${query}:${location}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// 2. Firecrawl - Use built-in caching (1 day)
maxAge: 86400000  // 24 hours

// 3. OpenAI - Cache by content hash (30 days)
const hash = hashContent(websiteContent);
const cachedAnalysis = await db.getCachedAnalysis(hash);
if (cachedAnalysis) return cachedAnalysis;
```

### Rate Limiting
```typescript
// Implement delays between API calls
const DELAYS = {
  scrapingdog: 2000,   // 2 seconds
  firecrawl: 1000,     // 1 second
  openai: 0            // No delay (high limits)
};

// Use Inngest for automatic rate limiting
export const researchLead = inngest.createFunction(
  {
    id: 'research-lead',
    concurrency: { limit: 5 }  // Max 5 concurrent
  },
  { event: 'lead/research.triggered' },
  async ({ event }) => {
    // Process lead...
  }
);
```

---

## 🛡️ Error Handling

### Retry Strategy
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const backoff = delay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${backoff}ms`);
      await sleep(backoff);
    }
  }

  throw new Error('Max retries exceeded');
}

// Usage
const businesses = await withRetry(() =>
  scrapeGoogleMaps({ query, location, limit })
);
```

### Graceful Degradation
```typescript
async function scrapeBusinessWebsite(url: string) {
  try {
    // Try main content
    const content = await scrapeWithFirecrawl(url);

    // Try about page (optional)
    let aboutContent;
    try {
      aboutContent = await scrapeWithFirecrawl(`${url}/about`);
    } catch (err) {
      console.warn('About page not found, continuing...');
    }

    return { content, aboutContent };

  } catch (error) {
    // If scraping fails completely, mark lead but don't fail entire run
    console.error(`Failed to scrape ${url}:`, error);
    return {
      content: '',
      aboutContent: '',
      error: error.message
    };
  }
}
```

---

## 📈 Monitoring

### Key Metrics to Track

```typescript
interface PlatformMetrics {
  // API Success Rates
  scrapingdogSuccessRate: number;
  firecrawlSuccessRate: number;
  openaiSuccessRate: number;

  // Performance
  avgScrapingTime: number;
  avgAnalysisTime: number;
  avgTotalTime: number;

  // Costs
  totalCost: number;
  costPerLead: number;
  monthlyBurn: number;

  // Quality
  gradeDistribution: Record<Grade, number>;
  avgQualityScore: number;
  leadsWithWebsite: number;
}

// Log metrics
console.log(`[Metrics] Run completed:`, {
  runId: run.id,
  leadsProcessed: leads.length,
  successRate: (successCount / totalCount) * 100,
  totalCost: calculateTotalCost(run),
  avgTimePerLead: totalTime / leads.length,
  gradeDistribution: {
    A: leads.filter(l => l.grade === 'A').length,
    B: leads.filter(l => l.grade === 'B').length,
    C: leads.filter(l => l.grade === 'C').length,
    D: leads.filter(l => l.grade === 'D').length,
    F: leads.filter(l => l.grade === 'F').length,
  }
});
```

---

## 🔐 Security Best Practices

### API Key Management
```typescript
// ✅ Good - Use environment variables
const apiKey = process.env.FIRECRAWL_API_KEY;

// ❌ Bad - Hardcoded keys
const apiKey = "fc-1234567890abcdef";

// ✅ Good - Mask keys in logs
console.log(`Using key: ${apiKey.substring(0, 8)}...`);

// ❌ Bad - Log full keys
console.log(`Using key: ${apiKey}`);
```

### Input Validation
```typescript
function validateSearchParams(params: SearchParams) {
  // Validate query
  if (!params.query || params.query.length > 100) {
    throw new Error('Invalid query');
  }

  // Sanitize location
  const cleanLocation = params.location.replace(/[<>]/g, '');

  // Validate limit
  const limit = Math.min(Math.max(params.limit, 5), 50);

  return { ...params, location: cleanLocation, limit };
}
```

---

## 📚 Additional Resources

### Documentation
- [ScrapingDog Best Practices](./SCRAPINGDOG-BEST-PRACTICES.md)
- [Firecrawl Best Practices](./FIRECRAWL-BEST-PRACTICES.md)
- [GPT-5 Best Practices](./GPT5-BEST-PRACTICES.md)

### External Links
- [ScrapingDog Dashboard](https://www.scrapingdog.com/dashboard)
- [Firecrawl Dashboard](https://firecrawl.dev/app/api-keys)
- [OpenAI Platform](https://platform.openai.com)

### Implementation Files
- Google Maps Scraper: [lib/scrapers/google-maps.ts](lib/scrapers/google-maps.ts)
- Website Scraper: [lib/scrapers/website.ts](lib/scrapers/website.ts)
- AI Researcher: [lib/ai/researcher.ts](lib/ai/researcher.ts)
- Inngest Workflows: [lib/inngest/functions.ts](lib/inngest/functions.ts)

---

**Last Updated**: October 2025
**Platform Version**: 1.0.0
**Status**: Production Ready ✅
