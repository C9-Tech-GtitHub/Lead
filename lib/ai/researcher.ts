/**
 * DEEP AI Lead Researcher
 * Uses GPT-5 for intelligent lead analysis and grading WITH web search
 * This is the comprehensive, high-token version for detailed qualification
 * Following best practices from GPT5-BEST-PRACTICES.md
 */

import OpenAI from "openai";

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
  grade: "A" | "B" | "C" | "D" | "F";
  gradeReasoning: string;
  matchCheck?: string;
  identityLegitimacy?: string;
  businessProfile?: string;
  scaleActivity?: string;
  brandPresence?: string;
  businessHistory?: string;
  businessSize?: string;
  marketReach?: string;
  snapshot?: string;
  suggestedHooks?: string[] | null;
  painPoints?: string[] | null;
  opportunities?: string[] | null;
}

// Lazy initialization of OpenAI client to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export async function deepResearchLead(
  params: ResearchLeadParams,
): Promise<LeadAnalysis> {
  try {
    console.log(`[DEEP AI Researcher] Analyzing lead: ${params.name}`);
    const openai = getOpenAIClient();

    // Construct the analysis prompt with all available data
    const userPrompt = buildAnalysisPrompt(params);

    // Call GPT-5 with web search enabled
    const response = await openai.responses.create({
      model: "gpt-5",
      reasoning: { effort: "low" },
      max_output_tokens: 2000,
      tools: [
        {
          type: "web_search_preview",
        },
      ],
      tool_choice: "auto",
      input: [
        {
          role: "system",
          content: getSystemPrompt(),
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = response.output_text;

    if (!content) {
      throw new Error("No response from GPT-5");
    }

    // Parse the structured response
    const analysis = parseGPT5Response(content);

    console.log(
      `[DEEP AI Researcher] Analysis complete for ${params.name} - Grade: ${analysis.grade}`,
    );

    return analysis;
  } catch (error) {
    console.error("[DEEP AI Researcher] Error:", error);
    throw new Error(
      `Failed to analyze lead: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * System prompt optimized for a comprehensive lead qualification scan
 */
function getSystemPrompt(): string {
  return `You are a GPT-5 lead qualification analyst.
You must verify business identity, legitimacy, scale, and fit for digital services using structured checkpoints.

Your focus:
1. Confirm the business truly matches the lead query category.
2. Validate identity signals (website, NAP consistency, verification, ownership type).
3. Capture business profile details (industry accuracy, offerings, audience, model, seasonality).
4. Assess scale and activity (team size, revenue clues, hiring/growth, traffic signals, footprint).
5. Evaluate brand presence and engagement (social proof, reviews, tone, paid/organic marketing).
6. Summarize business history (age, reputation longevity, rebrand indicators, ABN clues).
7. Provide a decisive SEO fit grade.

Guidelines:
- Only use evidence from the provided material or well-established knowledge; never fabricate specifics.
- If a data point cannot be confirmed, reply with "Unknown - recommend GPT-5 web search" or "Unknown - requires ABN lookup" as appropriate.
- Mention the evidence source (website section, LinkedIn hint, etc.) whenever you confirm a datapoint.
- Keep each bullet one sentence and concise; do not add extra sections.
- If the business does NOT clearly match the query, mark the match check as "MISMATCH" and explain why.
- Base business size and market reach on explicit evidence; respond with "Unknown" if unclear.
- Penalize heavily when the evaluated location is part of a large franchise or national/international brand with centralized marketing; default the SEO grade to C or lower unless clear proof of local marketing autonomy exists, and explain the penalty in the snapshot.

Respond ONLY in this exact format:

## GRADE: [A/B/C/D/F]

## MATCH CHECK:
[Exact Match | Close Match | MISMATCH | Unknown] - one sentence referencing the query

## BUSINESS IDENTITY & LEGITIMACY:
- Website Presence: ...
- Online Consistency: ...
- Verified Status: ...
- Ownership Type: ...

## BUSINESS PROFILE:
- Industry / Niche Accuracy: ...
- Products or Services: ...
- Target Audience: ...
- Business Model: ...
- Seasonality: ...

## BUSINESS SCALE & ACTIVITY:
- Employee Count / Team Size: ...
- Revenue Range: ...
- Growth Indicators: ...
- Online Traffic Estimate: ...
- Operational Footprint: ...

## BRAND PRESENCE & ENGAGEMENT:
- Social Media Activity: ...
- Customer Reviews: ...
- Brand Tone / Quality: ...
- Advertising Signals: ...

## BUSINESS HISTORY:
- Year Established: ...
- Reputation Longevity: ...
- Rebrand or Name Changes: ...

## BUSINESS SIZE:
[Micro/Small/Medium/Large/Enterprise/Unknown] - brief justification

## MARKET REACH:
[Local/Regional/National/International/Unknown] - brief justification

## SNAPSHOT:
One tight sentence summarizing why the SEO fit grade was chosen.`;
}

/**
 * Build the user prompt with all available business data
 */
function buildAnalysisPrompt(params: ResearchLeadParams): string {
  const leadQuery = params.businessType?.trim() || "Unknown (not provided)";
  const businessType = params.businessType?.trim() || "Not provided";

  let prompt = `Research this business for multi-dimensional qualification.
Use the supplied content plus your GPT-5 web reasoning toolkit.
If any checkpoint cannot be confirmed from available evidence, state "Unknown" and recommend either GPT-5 web search or an ABN lookup.

**Lead Query:** ${leadQuery}

**Business Name:** ${params.name}
**Website:** ${params.website}
**Business Type:** ${businessType}
**Multiple Locations:** ${params.hasMultipleLocations ? "Yes" : "No"}`;

  if (params.teamSize) {
    prompt += `\n**Team Size:** ${params.teamSize}`;
  }

  prompt += "\n\n## Website Content:\n";
  prompt += params.websiteContent.slice(0, 3000); // Limit to prevent token overflow

  if (params.aboutContent) {
    prompt += "\n\n## About Page:\n";
    prompt += params.aboutContent.slice(0, 2000);
  }

  if (params.teamContent) {
    prompt += "\n\n## Team Page:\n";
    prompt += params.teamContent.slice(0, 2000);
  }

  prompt += `\n\nFocus checkpoints:
- Business Identity & Legitimacy: website functionality, NAP consistency across sources, verification badges, ownership type.
- Business Profile: accurate industry categorization, core offerings, target audience, business model, seasonality cues.
- Business Scale & Activity: employee/team indicators, revenue clues, hiring or growth signals, traffic/visibility hints, operational footprint.
- Brand Presence & Engagement: social channels, review volume/sentiment, creative quality, advertising or SEO signals.
- Business History: founding or registration year (flag ABN lookup if in Australia), longevity of reviews/mentions, signs of rebrands.
- Final Verdict: grade SEO fit and explain the rationale in the snapshot, specifically calling out if a large parent brand affiliation reduced the score.

Provide your complete analysis following the exact format from the system prompt.`;

  return prompt;
}

/**
 * Parse GPT-5 response into structured data
 */
function parseGPT5Response(content: string): LeadAnalysis {
  const gradeMatch = content.match(/##\s*GRADE:\s*([A-F])/i);
  const grade = (gradeMatch?.[1]?.toUpperCase() || "F") as
    | "A"
    | "B"
    | "C"
    | "D"
    | "F";

  const matchCheckMatch = content.match(
    /##\s*MATCH CHECK:\s*\n([\s\S]*?)(?=\n##|$)/i,
  );
  const identityLegitimacyMatch = content.match(
    /##\s*BUSINESS IDENTITY\s*&\s*LEGITIMACY:\s*\n([\s\S]*?)(?=\n##|$)/i,
  );
  const businessProfileMatch = content.match(
    /##\s*BUSINESS PROFILE:\s*\n([\s\S]*?)(?=\n##|$)/i,
  );
  const scaleActivityMatch = content.match(
    /##\s*BUSINESS SCALE\s*&\s*ACTIVITY:\s*\n([\s\S]*?)(?=\n##|$)/i,
  );
  const brandPresenceMatch = content.match(
    /##\s*BRAND PRESENCE\s*&\s*ENGAGEMENT:\s*\n([\s\S]*?)(?=\n##|$)/i,
  );
  const businessHistoryMatch = content.match(
    /##\s*BUSINESS HISTORY:\s*\n([\s\S]*?)(?=\n##|$)/i,
  );
  const businessSizeMatch = content.match(
    /##\s*BUSINESS SIZE:\s*\n([\s\S]*?)(?=\n##|$)/i,
  );
  const marketReachMatch = content.match(
    /##\s*MARKET REACH:\s*\n([\s\S]*?)(?=\n##|$)/i,
  );
  const snapshotMatch = content.match(
    /##\s*SNAPSHOT:\s*\n([\s\S]*?)(?=\n##|$)/i,
  );

  const matchCheck = matchCheckMatch?.[1]?.trim();
  const identityLegitimacy = identityLegitimacyMatch?.[1]?.trim();
  const businessProfile = businessProfileMatch?.[1]?.trim();
  const scaleActivity = scaleActivityMatch?.[1]?.trim();
  const brandPresence = brandPresenceMatch?.[1]?.trim();
  const businessHistory = businessHistoryMatch?.[1]?.trim();
  const businessSize = businessSizeMatch?.[1]?.trim();
  const marketReach = marketReachMatch?.[1]?.trim();
  const snapshot = snapshotMatch?.[1]?.trim();

  const gradeReasoning = snapshot || matchCheck || "No summary provided";

  return {
    report: content.trim(),
    grade,
    gradeReasoning,
    matchCheck,
    identityLegitimacy,
    businessProfile,
    scaleActivity,
    brandPresence,
    businessHistory,
    businessSize,
    marketReach,
    snapshot,
    suggestedHooks: null,
    painPoints: null,
    opportunities: null,
  };
}
