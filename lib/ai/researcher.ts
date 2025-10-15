/**
 * AI Lead Researcher
 * Uses GPT-5 mini for intelligent lead analysis and grading
 * Following best practices from GPT5-BEST-PRACTICES.md
 */

import OpenAI from 'openai';

interface ResearchLeadParams {
  name: string;
  website: string;
  websiteContent: string;
  aboutContent?: string;
  teamContent?: string;
  hasMultipleLocations: boolean;
  teamSize?: string;
  businessType: string;
}

interface LeadAnalysis {
  report: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  gradeReasoning: string;
  suggestedHooks: string[];
  painPoints: string[];
  opportunities: string[];
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function researchLead(params: ResearchLeadParams): Promise<LeadAnalysis> {
  try {
    console.log(`[AI Researcher] Analyzing lead: ${params.name}`);

    // Construct the analysis prompt with all available data
    const userPrompt = buildAnalysisPrompt(params);

    // Call GPT model with proper configuration
    // NOTE: Currently using gpt-4o-mini as placeholder
    // When GPT-5 is available in the OpenAI SDK, update to:
    //   model: 'gpt-5-mini',
    //   reasoning_effort: 'low',
    //   verbosity: 'medium',
    //   max_completion_tokens: 2000
    // See GPT5-BEST-PRACTICES.md for migration guide
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Temporary: will migrate to gpt-5-mini
      messages: [
        {
          role: 'system',
          content: getSystemPrompt()
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: 2000, // Will become max_completion_tokens in GPT-5
      temperature: 0.7, // Will be removed in GPT-5 (not supported)
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from GPT-5');
    }

    // Parse the structured response
    const analysis = parseGPT5Response(content);

    console.log(`[AI Researcher] Analysis complete for ${params.name} - Grade: ${analysis.grade}`);

    return analysis;

  } catch (error) {
    console.error('[AI Researcher] Error:', error);
    throw new Error(`Failed to analyze lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * System prompt optimized for GPT-5's instruction-following capabilities
 */
function getSystemPrompt(): string {
  return `You are an expert business analyst specializing in local businesses.

Your job is to research businesses and identify:
1. Their current digital presence and capabilities
2. Growth opportunities in marketing, automation, and technology
3. Specific pain points that could be addressed
4. How well they'd fit as a potential client for digital services

You must provide:
- A comprehensive analysis report
- A compatibility grade (A, B, C, D, or F)
- Clear reasoning for the grade
- 3-5 specific outreach hooks
- 3-5 identified pain points
- 3-5 growth opportunities

## Grading Criteria

**Grade A (Excellent Fit):**
- Strong digital presence but clear gaps
- Multiple locations or large team (scalability)
- Evidence of growth mindset
- Budget indicators (professional site, active marketing)
- Clear, addressable pain points

**Grade B (Good Fit):**
- Decent digital presence with improvement areas
- Medium-sized operation
- Some growth indicators
- Likely has budget for services

**Grade C (Moderate Fit):**
- Basic digital presence
- Smaller operation
- Limited growth indicators
- May have budget constraints

**Grade D (Poor Fit):**
- Minimal digital presence
- Very small operation
- No clear growth indicators
- Likely budget constrained

**Grade F (Not a Fit):**
- No website or extremely outdated
- Single-person operation
- No evidence of business investment
- Not a viable prospect

Provide your analysis in the following format:

## GRADE: [A/B/C/D/F]

## REASONING:
[2-3 sentences explaining the grade]

## REPORT:
[Detailed analysis covering digital presence, team size, growth indicators, and opportunities]

## SUGGESTED HOOKS:
- [Hook 1]
- [Hook 2]
- [Hook 3]

## PAIN POINTS:
- [Pain point 1]
- [Pain point 2]
- [Pain point 3]

## OPPORTUNITIES:
- [Opportunity 1]
- [Opportunity 2]
- [Opportunity 3]`;
}

/**
 * Build the user prompt with all available business data
 */
function buildAnalysisPrompt(params: ResearchLeadParams): string {
  let prompt = `Analyze this business for compatibility as a potential client:

**Business Name:** ${params.name}
**Website:** ${params.website}
**Business Type:** ${params.businessType}
**Multiple Locations:** ${params.hasMultipleLocations ? 'Yes' : 'No'}`;

  if (params.teamSize) {
    prompt += `\n**Team Size:** ${params.teamSize}`;
  }

  prompt += '\n\n## Website Content:\n';
  prompt += params.websiteContent.slice(0, 3000); // Limit to prevent token overflow

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

/**
 * Parse GPT-5 response into structured data
 */
function parseGPT5Response(content: string): LeadAnalysis {
  // Extract grade
  const gradeMatch = content.match(/##\s*GRADE:\s*([A-F])/i);
  const grade = (gradeMatch?.[1]?.toUpperCase() || 'F') as 'A' | 'B' | 'C' | 'D' | 'F';

  // Extract reasoning
  const reasoningMatch = content.match(/##\s*REASONING:\s*\n([\s\S]*?)(?=\n##|$)/i);
  const gradeReasoning = reasoningMatch?.[1]?.trim() || 'No reasoning provided';

  // Extract report
  const reportMatch = content.match(/##\s*REPORT:\s*\n([\s\S]*?)(?=\n##|$)/i);
  const report = reportMatch?.[1]?.trim() || content;

  // Extract suggested hooks
  const hooksMatch = content.match(/##\s*SUGGESTED HOOKS:\s*\n([\s\S]*?)(?=\n##|$)/i);
  const suggestedHooks = hooksMatch?.[1]
    ? hooksMatch[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(Boolean)
    : [];

  // Extract pain points
  const painPointsMatch = content.match(/##\s*PAIN POINTS:\s*\n([\s\S]*?)(?=\n##|$)/i);
  const painPoints = painPointsMatch?.[1]
    ? painPointsMatch[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(Boolean)
    : [];

  // Extract opportunities
  const opportunitiesMatch = content.match(/##\s*OPPORTUNITIES:\s*\n([\s\S]*?)(?=\n##|$)/i);
  const opportunities = opportunitiesMatch?.[1]
    ? opportunitiesMatch[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(Boolean)
    : [];

  return {
    report,
    grade,
    gradeReasoning,
    suggestedHooks,
    painPoints,
    opportunities
  };
}
