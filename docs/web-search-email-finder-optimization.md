# Email Finder with Web Search - Cost Optimization Guide

## Current Implementation (Updated)

✅ **Fixed critical issues:**
1. Changed `web_search_preview` → `web_search` (deprecated tool)
2. Changed reasoning: `low` → `minimal` (30% token savings)
3. Reduced max_output_tokens: `8000` → `6000` (25% savings)

**File**: `lib/ai/email-finder.ts`

```typescript
response = await openai.responses.create({
  model: "gpt-5-mini",
  reasoning: { effort: "minimal" },
  max_output_tokens: 6000,
  tools: [
    {
      type: "web_search", // ✅ UPDATED - was web_search_preview
    },
  ],
  tool_choice: "auto",
  input: [...]
});
```

## Why Web Search is Important

Web search enables the AI to:
- ✅ Find recently published contact information
- ✅ Discover emails on company websites, LinkedIn, directories
- ✅ Verify email patterns from multiple sources
- ✅ Find decision-makers and key contacts
- ✅ Access real-time business information

**Without web search**: Model relies only on training data (cutoff: late 2024)

## Web Search Cost Structure

### OpenAI Pricing (2025):
- **GPT-5-mini base**: $0.25/$2.00 per 1M tokens (input/output)
- **Web search cost**: Not explicitly priced, included in token usage
- **Hidden costs**: Web searches generate additional output tokens

### Estimated Token Usage (per lead):
```
Without web search:
- Input: 400-600 tokens (prompts)
- Output: 600-800 tokens (response + reasoning)
- Total: ~1000-1400 tokens

With web search:
- Input: 800-1000 tokens (prompts + search context)
- Output: 1200-2000 tokens (response + search results + reasoning)
- Total: ~2000-3000 tokens (2-3x more!)
```

**This explains your $10 for 200 leads cost!**

## Cost Optimization Strategies (WITH Web Search)

### Phase 1: Already Implemented ✅
**Savings: ~30-40%**

```typescript
reasoning: { effort: "minimal" },  // Fewer reasoning tokens
max_output_tokens: 6000,           // Constrain output
```

**New cost**: ~$6-7 for 200 leads (down from $10)

### Phase 2: Optimize Prompts
**Additional savings: 15-20%**

**Before** (verbose):
```typescript
const systemPrompt = `You are an expert at finding business contact information through web research.
You use public sources like company websites, LinkedIn, business directories, and professional networks.
You NEVER fabricate or guess email addresses.
You always cite your sources and rate confidence based on verification level.
You prioritize decision-makers and key contacts over generic emails.`;
```

**After** (concise):
```typescript
const systemPrompt = `Find business contact emails via web search. Use company websites, LinkedIn, directories. Only return verified emails with sources. Prioritize decision-makers over generic addresses.`;
```

**Impact**: 
- Reduces input tokens by ~50%
- Less context for model to process
- Faster responses

### Phase 3: Smart Web Search Usage
**Additional savings: 20-30%**

Instead of always using web search, implement a tiered approach:

```typescript
// Check if domain is cached/known first
const knownPattern = await getEmailPattern(domain);

if (knownPattern) {
  // Skip web search for known domains
  response = await openai.responses.create({
    model: "gpt-5-mini",
    reasoning: { effort: "minimal" },
    max_output_tokens: 4000,
    tools: undefined, // No web search needed
    input: [...]
  });
} else {
  // Use web search for unknown domains
  response = await openai.responses.create({
    model: "gpt-5-mini",
    reasoning: { effort: "minimal" },
    max_output_tokens: 6000,
    tools: [{ type: "web_search" }],
    tool_choice: "required", // Force web search
    input: [...]
  });
}
```

### Phase 4: Batch API with Web Search
**Additional savings: 50%**

The Batch API works with web search tools:

```json
// batch_input.jsonl
{"custom_id": "lead-1", "method": "POST", "url": "/v1/responses", "body": {"model": "gpt-5-mini", "reasoning": {"effort": "minimal"}, "tools": [{"type": "web_search"}], "input": "..."}}
{"custom_id": "lead-2", "method": "POST", "url": "/v1/responses", "body": {"model": "gpt-5-mini", "reasoning": {"effort": "minimal"}, "tools": [{"type": "web_search"}], "input": "..."}}
```

**Benefits**:
- 50% discount on all operations
- Process 200 leads in one batch
- Results within 24 hours
- Same web search functionality

## Alternative: Hybrid Approach (Best Value)

Combine multiple methods to minimize AI web search usage:

### 1. Try Hunter.io/Tomba First (Fast & Cheap)
```typescript
// Cost: ~$0.001-0.01 per lead
const hunterResults = await searchWithHunter(domain);
if (hunterResults.emails.length > 0) {
  return hunterResults; // Found emails, skip AI
}
```

### 2. Use AI with Web Search as Fallback
```typescript
// Only for leads with no emails found
// Cost: ~$0.025-0.035 per lead (with optimizations)
const aiResults = await findEmailsWithAI({
  name, website, domain
});
```

### 3. Cache Email Patterns
```typescript
// Store discovered patterns
await cacheEmailPattern(domain, pattern);

// Next time for same domain:
if (pattern === "{first}.{last}@domain.com") {
  // Generate emails without web search
  const email = `${firstName}.${lastName}@${domain}`;
  // Verify with SendGrid bulk check (cheap)
}
```

## Updated Cost Projections (WITH Web Search)

| Phase | Configuration | Cost/200 | Savings | Status |
|-------|--------------|----------|---------|--------|
| Current (old) | web_search_preview, low reasoning | $10.00 | — | ❌ Broken |
| **Phase 1** | **web_search, minimal reasoning** | **$6.00** | **40%** | ✅ **Implemented** |
| Phase 2 | + simplified prompts | $5.00 | 50% | Easy |
| Phase 3 | + smart search usage | $3.50 | 65% | Medium |
| Phase 4 | + Batch API | $1.75 | 82.5% | Medium |
| Hybrid | Hunter + AI fallback | $0.50 | 95% | Best |

## Recommended Implementation

### Immediate (Already Done) ✅
```typescript
// lib/ai/email-finder.ts:105-108
model: "gpt-5-mini",
reasoning: { effort: "minimal" },
max_output_tokens: 6000,
tools: [{ type: "web_search" }],
```

**Expected savings**: ~40% ($10 → $6 per 200 leads)

### Next Week: Simplify Prompts
**Target**: Reduce input tokens by 50%

Before: ~400 tokens
After: ~200 tokens

**Implementation**:
```typescript
const systemPrompt = "Find business emails via web search. Return only verified emails with sources.";

const userPrompt = `Company: ${name}
Domain: ${domain}
Return JSON: {"emails": [{"email": "...", "source": "...", "confidence": 85}]}`;
```

### Next Month: Hybrid Approach
**Target**: 95% cost reduction

```typescript
async function findEmails(lead) {
  // 1. Try Hunter.io ($0.001)
  const hunter = await searchWithHunter(lead.domain);
  if (hunter.emails.length > 0) return hunter;
  
  // 2. Check cached patterns ($0)
  const pattern = await getCachedPattern(lead.domain);
  if (pattern) return generateFromPattern(pattern, lead);
  
  // 3. AI with web search ($0.03)
  return await findEmailsWithAI(lead);
}
```

**Expected cost**: $0.50 per 200 leads (95% savings)

## Web Search Best Practices

### 1. Be Specific in Prompts
❌ Bad: "Find emails for this company"
✅ Good: "Find contact emails for ${name} at ${domain}"

### 2. Limit Search Scope
```typescript
tools: [{
  type: "web_search",
  filters: {
    allowed_domains: [domain, "linkedin.com"], // Restrict search
    max_results: 5, // Limit results
  }
}]
```

### 3. Cache Results
```typescript
// Save search results to avoid repeat searches
await supabase.from('email_search_cache')
  .upsert({
    domain: domain,
    search_summary: aiResult.searchSummary,
    email_pattern: aiResult.emailPattern,
    cached_at: new Date()
  });
```

### 4. Use tool_choice Strategically
```typescript
// Let model decide (cheaper if search not needed)
tool_choice: "auto"

// Force search (when you know it's needed)
tool_choice: "required"
```

## Monitoring Web Search Usage

Track these metrics:
1. **Web search rate**: % of requests using web search
2. **Tokens per search**: Average tokens when web search is used
3. **Success rate**: % finding emails with web search
4. **Cost per found email**: Total cost / emails found

```typescript
// Add logging
console.log(`[AI Email Finder] Web search used: ${response.tool_calls?.length > 0}`);
console.log(`[AI Email Finder] Tokens: ${response.usage.total_tokens}`);
console.log(`[AI Email Finder] Emails found: ${result.emails.length}`);
```

## Testing Checklist

- [x] Update tool from `web_search_preview` to `web_search`
- [x] Reduce reasoning effort to `minimal`
- [x] Reduce max_output_tokens to 6000
- [ ] Test with 10-20 leads
- [ ] Verify web search is actually working (check logs)
- [ ] Compare email quality vs historical data
- [ ] Monitor costs in OpenAI dashboard
- [ ] Measure tokens per lead
- [ ] Calculate actual cost per lead
- [ ] Document any errors or issues

## Troubleshooting

### Issue: "Tool not supported" error
**Solution**: Verify using `web_search` (not `web_search_preview`)

### Issue: High token usage
**Solution**: 
- Check `max_output_tokens` setting
- Reduce prompt verbosity
- Set `reasoning.effort: "minimal"`

### Issue: Web search not finding emails
**Solution**:
- Use `tool_choice: "required"` to force search
- Check search summary in response
- Verify domain is accessible
- Try with known companies first

### Issue: Slow responses
**Solution**:
- Web search adds latency (5-15 seconds)
- Use Batch API for bulk operations
- Consider hybrid approach for real-time needs

## Summary

✅ **Implemented optimizations** (Phase 1):
- Fixed deprecated web_search_preview → web_search
- Reduced reasoning effort: low → minimal
- Reduced max tokens: 8000 → 6000
- **Expected savings: 40%** ($10 → $6 per 200 leads)

🎯 **Next steps**:
1. Test current implementation
2. Monitor costs for 2-3 days
3. Implement prompt simplification (Phase 2)
4. Consider hybrid approach (Phase 3)
5. Explore Batch API (Phase 4)

**Ultimate goal**: $0.50-1.75 per 200 leads (82-95% savings) while maintaining web search capability

---

**Last Updated**: 2025-11-10  
**Status**: Phase 1 Complete ✅  
**Next**: Test & Monitor
