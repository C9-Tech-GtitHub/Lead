# Firecrawl Best Practices for Lead Research

This document outlines the best practices for using Firecrawl API in the Lead Research platform for optimal website scraping and data extraction.

## Why Firecrawl?

Firecrawl is the ideal choice for our lead research platform because it:
- ✅ Converts web pages into clean markdown (perfect for AI analysis)
- ✅ Handles dynamic content (JS-rendered sites, SPAs)
- ✅ Manages proxies, caching, and rate limits automatically
- ✅ Extracts structured data with AI assistance
- ✅ Provides multiple output formats

## Current Implementation

Our platform uses Firecrawl v1 API at: `https://api.firecrawl.dev/v1/scrape`

### Implementation Location
- **File**: [lib/scrapers/website.ts](lib/scrapers/website.ts)
- **Function**: `scrapeWebsite(url: string)`

## Best Practices

### 1. Output Formats

**What we use**: `markdown` format for AI analysis

**Why**: Markdown is clean, structured, and perfect for GPT-5 analysis. It removes clutter while preserving semantic meaning.

**Available formats**:
```typescript
formats: ['markdown']        // ✅ Our primary format
formats: ['html']            // For preserving exact structure
formats: ['rawHtml']         // Unmodified HTML
formats: ['links']           // Extract all links
formats: ['images']          // Extract all images
formats: ['screenshot']      // Visual capture
formats: ['json']            // Structured extraction
```

**Recommendation**: Stick with `markdown` unless you need specific data:
- Use `links` if checking for social media presence
- Use `images` if analyzing visual branding
- Use `screenshot` for visual proof/documentation

### 2. Main Content Extraction

**Always use** `onlyMainContent: true` to remove headers, footers, and navigation.

```typescript
const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    url: url,
    formats: ['markdown'],
    onlyMainContent: true  // ✅ Removes clutter
  })
});
```

**Why**: GPT-5 analysis is more accurate when focused on actual content, not navigation menus and footers.

### 3. Multi-Page Scraping Strategy

Our platform scrapes multiple pages per lead:
1. **Main page** - Homepage/landing page
2. **About page** - Company information
3. **Team page** - Team size and structure

**Current implementation**:
```typescript
// Try multiple URL variations
const aboutUrls = [
  `${baseUrl}/about`,
  `${baseUrl}/about-us`,
  `${baseUrl}/about-us/`,
  `${baseUrl}/company`,
];

for (const aboutUrl of aboutUrls) {
  try {
    const content = await scrapeWithFirecrawl(aboutUrl, apiKey);
    if (content && content.length > 100) {
      break; // Found valid content
    }
  } catch (err) {
    continue; // Try next URL
  }
}
```

**Best practice**:
- Always try multiple common URL patterns
- Validate content length (> 100 chars) to avoid 404 pages
- Use try-catch for each attempt
- Stop at first successful scrape

### 4. Caching for Performance

Firecrawl has built-in caching with `maxAge` parameter.

**Default**: 2 days (172800000 ms)

**Our recommendation**:
```typescript
// For fresh business data (recommended)
maxAge: 86400000  // 1 day (24 hours)

// For very dynamic content
maxAge: 3600000   // 1 hour

// For static content
maxAge: 604800000 // 1 week
```

**Implementation**:
```typescript
const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
  method: 'POST',
  body: JSON.stringify({
    url: url,
    formats: ['markdown'],
    maxAge: 86400000,  // 1 day cache
    onlyMainContent: true
  })
});
```

**Cost savings**: Caching can speed up scrapes by 5x and reduce API costs significantly.

### 5. Error Handling

**Always implement robust error handling**:

```typescript
async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<string> {
  try {
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
    return data.data?.markdown || data.markdown || '';

  } catch (error) {
    console.error(`[Firecrawl] Failed to scrape ${url}:`, error);
    throw error;
  }
}
```

**Common errors**:
- `401 Unauthorized` - Invalid API key
- `402 Payment Required` - Insufficient credits
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Firecrawl service issue

### 6. Structured Data Extraction (Advanced)

For more complex data extraction, use the `json` format with schemas:

```typescript
// Extract specific business data
formats: [{
  type: "json",
  schema: {
    type: "object",
    properties: {
      company_name: { type: "string" },
      employee_count: { type: "number" },
      services: {
        type: "array",
        items: { type: "string" }
      },
      contact_email: { type: "string" }
    }
  }
}]
```

**When to use**:
- Extracting specific structured data (e.g., pricing tables)
- Need consistent format across all leads
- Building databases from website content

**When NOT to use**:
- General content analysis (use markdown)
- Flexible AI interpretation needed
- Website structure varies significantly

### 7. Location and Language Settings

For localized results, specify location preferences:

```typescript
{
  url: businessUrl,
  formats: ['markdown'],
  location: {
    country: 'AU',      // Australia
    languages: ['en']    // English
  }
}
```

**Use cases**:
- Australian businesses (country: 'AU')
- Multi-language sites (specify preferred language)
- Regional content variations

### 8. Rate Limiting

Firecrawl has generous rate limits, but implement delays for bulk scraping:

```typescript
// In Inngest workflow
const scrapePromises = leads.map(async (lead, index) => {
  // Stagger requests
  await delay(index * 1000); // 1 second between each
  return scrapeWebsite(lead.website);
});
```

**Recommended**:
- 1-2 seconds between requests for bulk operations
- Use Inngest's concurrency limiting (currently set to 5)
- Monitor your Firecrawl dashboard for usage

### 9. Timeout Settings

Set appropriate timeouts for slow-loading sites:

```typescript
{
  url: url,
  formats: ['markdown'],
  timeout: 30000  // 30 seconds (default is 30s)
}
```

**Recommendations**:
- **Default**: 30 seconds (sufficient for most sites)
- **Complex sites**: 60 seconds (heavy JS, many resources)
- **Simple sites**: 15 seconds (static HTML)

### 10. Cost Optimization

**Current cost**: ~$0.001 per page scrape

**Optimization strategies**:

1. **Use caching aggressively**
   ```typescript
   maxAge: 86400000  // 1 day cache
   ```

2. **Skip unnecessary pages**
   ```typescript
   // Only scrape if main page indicates potential
   if (mainContent.includes('services') || mainContent.includes('about')) {
     await scrapeAboutPage();
   }
   ```

3. **Validate URLs before scraping**
   ```typescript
   // Check if URL is reachable
   const urlExists = await fetch(url, { method: 'HEAD' })
     .then(r => r.ok)
     .catch(() => false);

   if (urlExists) {
     await scrapeWithFirecrawl(url);
   }
   ```

4. **Batch similar requests**
   - Scrape all pages for one business together
   - Share cache across similar businesses

## Migration to Firecrawl V2 (Future)

Firecrawl V2 API is available at: `https://api.firecrawl.dev/v2/scrape`

**Key changes in V2**:
- Improved performance
- Better error handling
- Enhanced caching
- New response format

**When to migrate**:
- When V2 is out of beta
- When SDKs are updated to V2
- After testing with sample leads

## Monitoring and Analytics

**Track these metrics**:
1. **Success rate**: % of successful scrapes
2. **Average response time**: How long scrapes take
3. **Cache hit rate**: % of requests served from cache
4. **Error types**: Which errors are most common
5. **Cost per lead**: Total Firecrawl cost / leads processed

**Implementation**:
```typescript
// Add to your scraper
console.log(`[Firecrawl] Scraping ${url}`);
const startTime = Date.now();

try {
  const content = await scrapeWithFirecrawl(url);
  const duration = Date.now() - startTime;

  console.log(`[Firecrawl] Success in ${duration}ms`);
  // Track success metric

  return content;
} catch (error) {
  const duration = Date.now() - startTime;

  console.error(`[Firecrawl] Failed after ${duration}ms:`, error);
  // Track error metric

  throw error;
}
```

## Troubleshooting

### "No content returned"
**Cause**: Page is JavaScript-heavy or blocked
**Solution**: Firecrawl handles JS automatically, but some sites block scrapers
**Action**: Check if manual visit works, try with actions parameter

### "429 Rate Limit Exceeded"
**Cause**: Too many requests too quickly
**Solution**: Implement delays between requests
**Action**: Add `await delay(1000)` between scrapes

### "Invalid API Key"
**Cause**: API key is incorrect or expired
**Solution**: Verify key in Firecrawl dashboard
**Action**: Update `FIRECRAWL_API_KEY` in `.env`

### "Timeout Error"
**Cause**: Page takes too long to load
**Solution**: Increase timeout or skip page
**Action**: Increase `timeout` parameter to 60000ms

## Security Best Practices

1. **Never log API keys**
   ```typescript
   // ❌ Bad
   console.log(`Using key: ${apiKey}`);

   // ✅ Good
   console.log(`Using key: ${apiKey.substring(0, 8)}...`);
   ```

2. **Store keys securely**
   - Use environment variables
   - Never commit `.env` to git
   - Rotate keys regularly

3. **Validate scraped content**
   ```typescript
   // Check for suspicious content
   if (content.includes('<script>') || content.length > 100000) {
     console.warn('Suspicious content detected');
   }
   ```

## Summary Checklist

- ✅ Use `markdown` format for AI analysis
- ✅ Set `onlyMainContent: true` to remove clutter
- ✅ Implement caching with `maxAge` for performance
- ✅ Try multiple URL patterns for about/team pages
- ✅ Handle errors gracefully with try-catch
- ✅ Set appropriate timeouts (30-60s)
- ✅ Implement rate limiting (1-2s between requests)
- ✅ Monitor success rates and costs
- ✅ Validate URLs before scraping
- ✅ Log performance metrics

## Resources

- [Firecrawl Official Documentation](https://docs.firecrawl.dev)
- [Firecrawl API Reference](https://docs.firecrawl.dev/api-reference/endpoint/scrape)
- [Firecrawl Dashboard](https://firecrawl.dev/app/api-keys) (for API keys and usage)
- [Pricing](https://firecrawl.dev/pricing) (~$0.001 per page)

---

**Last Updated**: October 2025
**Firecrawl Version**: v1
**Implementation File**: [lib/scrapers/website.ts](lib/scrapers/website.ts)
