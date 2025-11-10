# ⚠️ CRITICAL: GPT-5 Web Search Tool Update

## Issue Discovered

Your current email finder implementation uses:
```typescript
model: "gpt-5-mini",
tools: [{ type: "web_search_preview" }]
```

## ⚠️ BREAKING CHANGE

**`web_search_preview` is NOT supported with GPT-5 models!**

Multiple developers have reported this issue in the OpenAI community:
- Error: "hosted tool is not supported with GPT-5"
- `web_search_preview` was updated to `web_search` tool

## What Changed

### Old (Deprecated):
```typescript
tools: [{ type: "web_search_preview" }]
```

### New (Current):
```typescript
tools: [{ type: "web_search" }]
```

## Action Required

### Option 1: Update Tool Name (Recommended if working)
**File**: `lib/ai/email-finder.ts:108-110`

```typescript
// Change from:
tools: [
  {
    type: "web_search_preview",  // ❌ DEPRECATED
  },
],

// To:
tools: [
  {
    type: "web_search",  // ✅ CURRENT
  },
],
```

### Option 2: Switch to GPT-4o-mini (Better Cost Option)
Since web search compatibility is uncertain, consider switching to `gpt-4o-mini` which:
- ✅ 75% cheaper on output tokens ($0.60 vs $2.00 per 1M)
- ✅ 40% cheaper on input tokens ($0.15 vs $0.25 per 1M)
- ✅ Uses standard chat completions API (more stable)
- ⚠️ No built-in web search (but may not need it)

### Option 3: Use GPT-5 Search API Models (If Available)
OpenAI released specialized search models in Oct 2025:
- `gpt-5-search-api-2025-10-14`
- `gpt-5-search-api`

These have web search embedded directly.

## Testing Needed

### Immediate Test:
1. Check if current implementation is actually working
2. Try changing `web_search_preview` → `web_search`
3. Monitor for API errors

### Run this to test current implementation:
```bash
# Select 5 leads without emails
# Run AI email finder
# Check for errors in logs
```

## Findings from Documentation Review

### Responses API
- Designed for GPT-5 models
- Supports `web_search` tool (not `web_search_preview`)
- Parameter differences from Chat Completions:
  - `reasoning.effort` instead of `temperature`
  - `max_output_tokens` instead of `max_tokens`
  - `text.verbosity` for output control

### Chat Completions API
- Can use GPT-5 models but with limitations
- Parameters formatted differently
- `reasoning_effort` (flat param) vs `reasoning.effort` (nested)
- Cannot pass Chain of Thought (CoT) between turns

### Deprecated Parameters for GPT-5:
- ❌ `temperature` - not supported
- ❌ `top_p` - not supported  
- ❌ `logprobs` - not supported
- ✅ Use `reasoning.effort` instead
- ✅ Use `text.verbosity` instead

## Cost Optimization Strategy (Updated)

Given the web search tool uncertainty, here's the recommended path:

### Phase 1A: Fix Web Search Tool (URGENT)
```typescript
// lib/ai/email-finder.ts:108
tools: [{ type: "web_search" }]  // Change from web_search_preview
```

**Risk**: Low  
**Effort**: 1 line change  
**Benefit**: Fix potential breaking issue

### Phase 1B: Test Without Web Search
Remove web search entirely and test quality:
```typescript
// Remove tools parameter completely
tools: undefined
```

**Why**: 
- GPT-5-mini has training data up to late 2024
- May not need live web search for email finding
- Could save on hidden web search costs
- Would allow switching to cheaper gpt-4o-mini

### Phase 2: Switch to GPT-4o-mini (If quality acceptable)
```typescript
// Use chat completions API with gpt-4o-mini
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [...],
  max_tokens: 6000,
  temperature: 0.3,  // Can use temperature with gpt-4o-mini
});
```

**Savings**: ~70-75% on output tokens  
**Trade-off**: No web search tool, but likely not needed

## Updated Cost Projections

| Scenario | Cost/200 leads | Savings | Notes |
|----------|----------------|---------|-------|
| Current (gpt-5-mini + web_search_preview) | $10.00 | — | May be broken! |
| gpt-5-mini + web_search (fixed) | ~$0.52 | 95% | If tool works |
| gpt-5-mini + minimal reasoning (no web) | ~$0.36 | 96% | No web search |
| gpt-4o-mini + minimal reasoning | ~$0.11 | 99% | Best value |
| gpt-4o-mini + Batch API | ~$0.05 | 99.5% | Best overall |

## Immediate Actions

### 1. Investigate Current Status ⚡
Check if you're getting API errors:
```bash
# Check recent logs for OpenAI errors
grep -r "web_search_preview" /path/to/logs
grep -r "not supported" /path/to/logs
```

### 2. Update Tool Name (Quick Fix)
```bash
# Change web_search_preview to web_search
sed -i '' 's/web_search_preview/web_search/g' lib/ai/email-finder.ts
```

### 3. Test Both Scenarios
- Test with `web_search` tool
- Test without any tool
- Compare email quality

### 4. Consider Migration to gpt-4o-mini
If web search isn't critical:
- Much cheaper
- More stable (standard API)
- Better documented
- Easier to optimize

## References

- [OpenAI Community: GPT-5 cannot use web search](https://community.openai.com/t/gpt5-cannot-use-web-search-please-help/1337041)
- [OpenAI Responses API Documentation](https://platform.openai.com/docs/guides/latest-model)
- [GPT-5 Search API Guide](https://apidog.com/blog/gpt-5-search-api/)
- Issue reported by multiple developers in late 2024/early 2025

## Summary

🚨 **CRITICAL**: Your current code may not be working as expected due to deprecated `web_search_preview` tool.

✅ **Quick Fix**: Change to `web_search` tool  
💰 **Better Fix**: Test without web search, migrate to gpt-4o-mini  
🎯 **Best Fix**: Use gpt-4o-mini with Batch API for 99.5% cost savings

---

**Last Updated**: 2025-11-10  
**Status**: Action Required  
**Priority**: High
