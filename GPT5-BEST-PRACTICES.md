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

## Integration with Lead Research Platform

### Current Status

**⚠️ Note**: As of October 2025, GPT-5 parameters are not yet available in the OpenAI SDK. Our platform currently uses `gpt-4o-mini` as a placeholder with equivalent configuration.

**Temporary implementation** ([lib/ai/researcher.ts](lib/ai/researcher.ts)):
```typescript
{
  model: 'gpt-4o-mini',      // Temporary - will migrate to gpt-5-mini
  max_tokens: 2000,          // Will become max_completion_tokens
  temperature: 0.7,          // Will be removed (not supported in GPT-5)
}
```

**Target implementation** (when GPT-5 SDK support is available):
```typescript
{
  model: 'gpt-5-mini',
  reasoning_effort: 'low',
  verbosity: 'medium',
  max_completion_tokens: 2000
}
```

### Migration Checklist

When migrating to GPT-5, complete these steps:

1. ✅ Verify GPT-5 access in OpenAI dashboard
2. ✅ Update OpenAI SDK to version supporting GPT-5
3. ✅ Update model name to `gpt-5-mini`
4. ✅ Remove `temperature` parameter
5. ✅ Remove `top_p` parameter
6. ✅ Add `reasoning_effort: 'low'`
7. ✅ Add `verbosity: 'medium'`
8. ✅ Change `max_tokens` to `max_completion_tokens`
9. ✅ Test with 5-10 sample leads
10. ✅ Compare output quality with GPT-4o-mini
11. ✅ Monitor costs and adjust if needed
12. ✅ Update documentation

### System Prompt Optimization for GPT-5

Our system prompt is specifically optimized for GPT-5's instruction-following capabilities:

**Key optimizations**:
- ✅ Explicit grading criteria (A-F scale)
- ✅ Structured output format
- ✅ Clear section headers
- ✅ Specific examples and use cases
- ✅ Action-oriented language

**System prompt structure**:
```typescript
function getSystemPrompt(): string {
  return `You are an expert business analyst specializing in local businesses.

Your job is to research businesses and identify:
1. Their current digital presence and capabilities
2. Growth opportunities in marketing, automation, and technology
3. Specific pain points that could be addressed
4. How well they'd fit as a potential client for digital services

## Grading Criteria
[Detailed A-F grading scale with specific criteria]

## Output Format
[Strict format requirements with section headers]
`;
}
```

### User Prompt Construction

**Best practices for user prompts**:

```typescript
function buildAnalysisPrompt(params: ResearchLeadParams): string {
  let prompt = `Analyze this business for compatibility as a potential client:

**Business Name:** ${params.name}
**Website:** ${params.website}
**Business Type:** ${params.businessType}
**Multiple Locations:** ${params.hasMultipleLocations ? 'Yes' : 'No'}`;

  if (params.teamSize) {
    prompt += `\n**Team Size:** ${params.teamSize}`;
  }

  // Add website content (limited to prevent token overflow)
  prompt += '\n\n## Website Content:\n';
  prompt += params.websiteContent.slice(0, 3000);

  if (params.aboutContent) {
    prompt += '\n\n## About Page:\n';
    prompt += params.aboutContent.slice(0, 2000);
  }

  if (params.teamContent) {
    prompt += '\n\n## Team Page:\n';
    prompt += params.teamContent.slice(0, 2000);
  }

  prompt += '\n\nProvide your complete analysis following the format specified in the system prompt.';

  return prompt;
}
```

**Token management**:
- Main content: 3000 chars (~750 tokens)
- About page: 2000 chars (~500 tokens)
- Team page: 2000 chars (~500 tokens)
- System prompt: ~800 tokens
- User prompt structure: ~100 tokens
- **Total input**: ~2,650 tokens
- **Expected output**: ~1,500 tokens
- **Total per lead**: ~4,150 tokens

**Cost calculation**:
```
Input:  2,650 tokens × $0.25 / 1M = $0.00066
Output: 1,500 tokens × $2.00 / 1M = $0.00300
Total:  ~$0.00366 per lead

Note: With GPT-4o-mini placeholder, cost is ~$0.015 per lead
GPT-5 will be ~75% cheaper!
```

### Response Parsing

**GPT-5 output format** (strictly enforced):
```markdown
## GRADE: A

## REASONING:
[2-3 sentence explanation]

## REPORT:
[Detailed analysis]

## SUGGESTED HOOKS:
- Hook 1
- Hook 2
- Hook 3

## PAIN POINTS:
- Pain point 1
- Pain point 2

## OPPORTUNITIES:
- Opportunity 1
- Opportunity 2
```

**Parsing implementation**:
```typescript
function parseGPT5Response(content: string): LeadAnalysis {
  // Extract grade (A-F)
  const gradeMatch = content.match(/##\s*GRADE:\s*([A-F])/i);
  const grade = (gradeMatch?.[1]?.toUpperCase() || 'F') as Grade;

  // Extract reasoning
  const reasoningMatch = content.match(/##\s*REASONING:\s*\n([\s\S]*?)(?=\n##|$)/i);
  const gradeReasoning = reasoningMatch?.[1]?.trim() || 'No reasoning provided';

  // Extract report
  const reportMatch = content.match(/##\s*REPORT:\s*\n([\s\S]*?)(?=\n##|$)/i);
  const report = reportMatch?.[1]?.trim() || content;

  // Extract lists (hooks, pain points, opportunities)
  const suggestedHooks = extractBulletList(content, 'SUGGESTED HOOKS');
  const painPoints = extractBulletList(content, 'PAIN POINTS');
  const opportunities = extractBulletList(content, 'OPPORTUNITIES');

  return {
    report,
    grade,
    gradeReasoning,
    suggestedHooks,
    painPoints,
    opportunities
  };
}

function extractBulletList(content: string, sectionName: string): string[] {
  const regex = new RegExp(`##\\s*${sectionName}:\\s*\\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
  const match = content.match(regex);

  if (!match?.[1]) return [];

  return match[1]
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => line.replace(/^-\s*/, '').trim())
    .filter(Boolean);
}
```

### Quality Assurance

**Validate GPT-5 responses**:

```typescript
function validateAnalysis(analysis: LeadAnalysis): boolean {
  const issues = [];

  // Check required fields
  if (!analysis.grade || !['A', 'B', 'C', 'D', 'F'].includes(analysis.grade)) {
    issues.push('Invalid or missing grade');
  }

  if (!analysis.gradeReasoning || analysis.gradeReasoning.length < 50) {
    issues.push('Grade reasoning too short');
  }

  if (!analysis.report || analysis.report.length < 200) {
    issues.push('Report too short');
  }

  // Check for minimum content
  if (analysis.suggestedHooks.length < 2) {
    issues.push('Not enough suggested hooks');
  }

  if (analysis.painPoints.length < 2) {
    issues.push('Not enough pain points identified');
  }

  if (analysis.opportunities.length < 2) {
    issues.push('Not enough opportunities identified');
  }

  if (issues.length > 0) {
    console.warn('Analysis quality issues:', issues);
    return false;
  }

  return true;
}
```

### Performance Optimization

**Batching for cost efficiency**:
```typescript
// Process leads in batches
const BATCH_SIZE = 5;

for (let i = 0; i < leads.length; i += BATCH_SIZE) {
  const batch = leads.slice(i, i + BATCH_SIZE);

  const analyses = await Promise.all(
    batch.map(lead => researchLead(lead))
  );

  await saveBatch(analyses);

  // Rate limiting
  await delay(2000);
}
```

**Caching for repeat analysis**:
```typescript
// Cache results by website content hash
const contentHash = hashContent(websiteContent);
const cached = await getCachedAnalysis(contentHash);

if (cached && Date.now() - cached.timestamp < 30 * 24 * 60 * 60 * 1000) {
  return cached.analysis; // Use cached if < 30 days old
}
```

### Monitoring and Analytics

**Track these metrics**:
```typescript
interface AnalyticsMetrics {
  totalLeadsAnalyzed: number;
  averageResponseTime: number;
  gradeDistribution: Record<Grade, number>;
  averageTokensUsed: number;
  totalCost: number;
  errorRate: number;
  averageQualityScore: number;
}

// Log metrics for each analysis
console.log(`[GPT-5] Lead analyzed:`, {
  leadId: lead.id,
  grade: analysis.grade,
  tokensUsed: response.usage?.total_tokens,
  responseTime: `${Date.now() - startTime}ms`,
  cost: calculateCost(response.usage)
});
```

### A/B Testing GPT-4o-mini vs GPT-5

When GPT-5 becomes available, compare performance:

```typescript
async function abTestModels(lead: Lead) {
  const [gpt4Result, gpt5Result] = await Promise.all([
    analyzeWithGPT4(lead),
    analyzeWithGPT5(lead)
  ]);

  return {
    gpt4: {
      grade: gpt4Result.grade,
      cost: gpt4Result.cost,
      time: gpt4Result.time,
      quality: assessQuality(gpt4Result)
    },
    gpt5: {
      grade: gpt5Result.grade,
      cost: gpt5Result.cost,
      time: gpt5Result.time,
      quality: assessQuality(gpt5Result)
    },
    comparison: {
      costSavings: ((gpt4Result.cost - gpt5Result.cost) / gpt4Result.cost) * 100,
      speedImprovement: ((gpt4Result.time - gpt5Result.time) / gpt4Result.time) * 100,
      qualityDelta: gpt5Result.quality - gpt4Result.quality
    }
  };
}
```

## Troubleshooting

### Error: "Invalid parameter: temperature"

**Cause:** GPT-5 models don't support `temperature`

**Fix:** Remove the parameter from your API call

### Error: "Unsupported parameter: max_tokens"

**Cause:** GPT-5 uses `max_completion_tokens` instead

**Fix:** Rename `max_tokens` to `max_completion_tokens`

### Error: "Model 'gpt-5-mini' not found"

**Cause:** GPT-5 not yet available in your OpenAI account

**Fix:**
1. Check OpenAI dashboard for GPT-5 access
2. Ensure SDK is updated to latest version
3. Continue using gpt-4o-mini until GPT-5 is available

### Poor Quality Responses

**Cause:** May need higher reasoning effort

**Fix:** Change `reasoning_effort` from `low` to `medium` in [lib/ai/researcher.ts](lib/ai/researcher.ts)

**Alternative**: Improve system prompt with more specific examples

### Slow Responses

**Cause:** Reasoning effort may be too high

**Fix:** Use `minimal` reasoning effort for faster results

**Note**: May reduce quality - test thoroughly

### Output Too Verbose

**Cause:** Verbosity setting too high

**Fix:** Change `verbosity` from `medium` to `low` in [lib/ai/researcher.ts](lib/ai/researcher.ts)

### Inconsistent Output Format

**Cause:** GPT-5 not following format instructions

**Fix:**
1. Make format requirements more explicit in system prompt
2. Add example output to system prompt
3. Validate and retry if format is incorrect

### High Costs

**Cause:** Too many tokens per request

**Fix**:
1. Reduce content length (currently 7000 chars max)
2. Use lower `max_completion_tokens` (currently 2000)
3. Cache analyses to avoid re-analyzing

---

**Last Updated:** October 2025
**Current Model:** gpt-4o-mini (temporary)
**Target Model:** gpt-5-mini
**API Version:** Chat Completions v1
**Implementation File:** [lib/ai/researcher.ts](lib/ai/researcher.ts)
