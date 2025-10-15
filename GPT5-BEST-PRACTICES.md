# GPT-5 Best Practices for Lead Research

This project uses **GPT-5 mini** for AI-powered lead research and analysis. This document outlines the best practices and implementation details.

## Why GPT-5 Mini?

GPT-5 mini is OpenAI's latest cost-efficient reasoning model, optimized for:
- **Well-defined tasks** like lead research and analysis
- **Fast responses** with minimal reasoning overhead
- **Lower cost** compared to previous models ($0.25/1M input tokens, $2/1M output tokens)
- **Better instruction following** than GPT-4 models

## Model Configuration

### Current Implementation

```javascript
{
  model: 'gpt-5-mini',
  reasoning_effort: 'low',        // Fast, cost-efficient for structured tasks
  verbosity: 'medium',            // Balanced output length
  max_output_tokens: 2000
}
```

### Key Changes from GPT-4

❌ **REMOVED** (Not supported in GPT-5):
- `temperature` - No longer available
- `top_p` - No longer available
- `logprobs` - No longer available
- `max_tokens` - Replaced with `max_output_tokens`

✅ **ADDED** (GPT-5 specific):
- `reasoning_effort` - Controls reasoning depth ('minimal', 'low', 'medium', 'high')
- `verbosity` - Controls output length ('low', 'medium', 'high')

## Parameter Guidelines

### Reasoning Effort

| Level | Use Case | Speed | Cost | Output Quality |
|-------|----------|-------|------|----------------|
| `minimal` | Simple classification, quick responses | Fastest | Lowest | Basic |
| `low` | **Well-defined tasks** (our use case) | Fast | Low | Good |
| `medium` | Balanced reasoning and speed | Medium | Medium | Better |
| `high` | Complex multi-step tasks, coding | Slow | High | Best |

**For Lead Research:** Use `low` reasoning effort
- Our task is well-defined with clear structure
- We provide explicit format and requirements
- Fast responses keep costs down
- Quality remains high for structured analysis

### Verbosity

| Level | Description | Best For |
|-------|-------------|----------|
| `low` | Concise, short responses | Quick summaries, simple queries |
| `medium` | **Balanced output** (our use case) | Structured reports with detail |
| `high` | Thorough, detailed explanations | Complex analysis, documentation |

**For Lead Research:** Use `medium` verbosity
- Provides enough detail for actionable insights
- Keeps reports concise and readable
- Balances cost and quality

## API Compatibility

### Chat Completions API (Current)

We use the standard Chat Completions API with GPT-5 parameters:

```javascript
POST https://api.openai.com/v1/chat/completions
{
  "model": "gpt-5-mini",
  "messages": [...],
  "reasoning_effort": "low",
  "verbosity": "medium",
  "max_completion_tokens": 2000
}
```

### Responses API (Alternative)

For advanced use cases, GPT-5 also supports the new Responses API which enables:
- Chain of thought (CoT) passing between turns
- Better caching and lower latency
- Improved multi-turn conversations

**Migration Path:** If we need better performance in the future, we can migrate to:
```javascript
POST https://api.openai.com/v1/responses
{
  "model": "gpt-5-mini",
  "input": "...",
  "reasoning": { "effort": "low" },
  "text": { "verbosity": "medium" }
}
```

## Cost Analysis

### GPT-5 Mini Pricing

- **Input:** $0.25 per 1M tokens
- **Output:** $2.00 per 1M tokens
- **Estimated per lead:** ~$0.0125 (with website scraping)

### Cost Comparison

| Model | Input | Output | Est. Cost/Lead |
|-------|-------|--------|----------------|
| gpt-4o-mini | $0.15 | $0.60 | $0.015 |
| **gpt-5-mini** | **$0.25** | **$2.00** | **$0.0125** |

**Savings:** ~17% cheaper per lead with better quality!

## Prompt Best Practices

### Current System Prompt

Our system prompt is optimized for GPT-5's instruction-following capabilities:

```
You are an expert business analyst specializing in local businesses.
Your job is to research businesses and identify:
1. Their current digital presence and capabilities
2. Growth opportunities in marketing, automation, and technology
3. Specific pain points that could be addressed
4. How well they'd fit as a potential client for digital services
```

### Key Principles

1. **Be Explicit:** GPT-5 excels at following precise instructions
2. **Structured Output:** Define clear format requirements
3. **Actionable Results:** Ask for specific, concrete observations
4. **Grade Scale:** Provide clear criteria (A-F scale)

### Optimization Tips

- ✅ Use clear section headers (## Company Overview, ## Growth Opportunities)
- ✅ Request specific formats (bullet points, numbered lists)
- ✅ Provide grading criteria upfront
- ✅ Ask for concrete examples over generic advice
- ❌ Don't rely on temperature for creativity (not available)
- ❌ Don't expect randomness or variability in outputs

## Performance Optimization

### Current Settings

```javascript
reasoning_effort: 'low'    // Optimal for our structured task
verbosity: 'medium'        // Balanced detail level
max_output_tokens: 2000    // Sufficient for reports
```

### When to Adjust

**Use `minimal` reasoning if:**
- You need faster responses
- Cost is a primary concern
- Task is extremely simple

**Use `high` reasoning if:**
- Lead data is complex or ambiguous
- You need deeper analysis
- Quality is more important than speed

**Use `low` verbosity if:**
- You want shorter summaries
- Output length is constrained
- Processing many leads quickly

**Use `high` verbosity if:**
- You need very detailed reports
- Comprehensive analysis is required
- Quality is paramount

## Implementation Checklist

- [x] Model changed to `gpt-5-mini`
- [x] Removed `temperature` parameter
- [x] Removed `top_p` parameter
- [x] Added `reasoning_effort: 'low'`
- [x] Added `verbosity: 'medium'`
- [x] Changed `max_tokens` to `max_completion_tokens`
- [x] Updated .env.example with new model
- [x] Updated cost estimates in documentation

## Migration from GPT-4

If you're upgrading from GPT-4 models:

1. **Remove unsupported parameters:**
   - Delete `temperature`
   - Delete `top_p`
   - Delete `logprobs`

2. **Add GPT-5 parameters:**
   - Add `reasoning_effort: 'low'`
   - Add `verbosity: 'medium'`

3. **Rename max_tokens:**
   - Change `max_tokens` → `max_completion_tokens`

4. **Update model name:**
   - `gpt-4o-mini` → `gpt-5-mini`

## Testing Recommendations

After updating to GPT-5, test with:

```bash
# Clear database
sqlite3 data/leads.db "DELETE FROM leads;"

# Scrape fresh leads
npm run scrape -- --query "realtors" --location "Collingwood VIC 3066, Australia" --limit 5

# Research with GPT-5 mini
npm run research -- --limit 5

# Review results
npm run view -- --status done
npm run view -- --detailed 1
```

Expected results:
- ✅ Faster responses than GPT-4
- ✅ More consistent output format
- ✅ Better instruction following
- ✅ Lower costs per lead

## Resources

- [GPT-5 Documentation](https://platform.openai.com/docs/guides/gpt-5)
- [GPT-5 Prompting Guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide)
- [Model Pricing](https://openai.com/api/pricing/)
- [Responses API Guide](https://platform.openai.com/docs/guides/responses-vs-chat-completions)

## Troubleshooting

### Error: "Invalid parameter: temperature"

**Cause:** GPT-5 models don't support `temperature`

**Fix:** Remove the parameter from your API call

### Error: "Unsupported parameter: max_tokens"

**Cause:** GPT-5 uses `max_completion_tokens` instead

**Fix:** Rename `max_tokens` to `max_completion_tokens`

### Poor Quality Responses

**Cause:** May need higher reasoning effort

**Fix:** Change `reasoning_effort` from `low` to `medium` in [ai-researcher.js](src/services/ai-researcher.js:37)

### Slow Responses

**Cause:** Reasoning effort may be too high

**Fix:** Use `minimal` reasoning effort for faster results

### Output Too Verbose

**Cause:** Verbosity setting too high

**Fix:** Change `verbosity` from `medium` to `low` in [ai-researcher.js](src/services/ai-researcher.js:38)

---

**Last Updated:** October 2025
**Model Version:** gpt-5-mini
**API Version:** Chat Completions v1
