/**
 * AI Lead Prescreener
 * Uses GPT-5 to quickly identify franchises and unsuitable businesses
 * before spending credits on full research
 */

import OpenAI from "openai";

interface PrescreenParams {
  name: string;
  address?: string;
  website?: string;
  businessType: string;
}

interface PrescreenResult {
  shouldResearch: boolean; // false = skip research
  reason: string;
  isFranchise: boolean;
  isNationalBrand: boolean;
  confidence: "high" | "medium" | "low";
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Prescreen a lead to determine if it's worth researching
 * Identifies franchises and national brands that should be skipped
 */
export async function prescreenLead(
  params: PrescreenParams,
): Promise<PrescreenResult> {
  try {
    console.log(`[Prescreen] Checking: ${params.name}`);

    const userPrompt = buildPrescreenPrompt(params);

    // Use GPT-5 with low reasoning effort for quick classification
    const response = await openai.responses.create({
      model: "gpt-5",
      reasoning: { effort: "low" },
      max_output_tokens: 500,
      tools: [
        {
          type: "web_search",
        },
      ],
      tool_choice: "auto",
      input: [
        {
          role: "system",
          content: getPrescreenSystemPrompt(),
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = response.output_text;

    if (!content) {
      // If no response, default to allowing research (fail open)
      return {
        shouldResearch: true,
        reason: "Unable to prescreen - proceeding with research",
        isFranchise: false,
        isNationalBrand: false,
        confidence: "low",
      };
    }

    // Parse the response
    const result = parsePrescreenResponse(content, params.name);

    console.log(
      `[Prescreen] ${params.name} - Should research: ${result.shouldResearch} (${result.confidence} confidence)`,
    );

    return result;
  } catch (error) {
    console.error("[Prescreen] Error:", error);
    // On error, default to allowing research (fail open)
    return {
      shouldResearch: true,
      reason: "Prescreen error - proceeding with research",
      isFranchise: false,
      isNationalBrand: false,
      confidence: "low",
    };
  }
}

/**
 * System prompt for franchise/brand identification
 */
function getPrescreenSystemPrompt(): string {
  return `You are a franchise and national brand detector for lead qualification.

Your task is to quickly determine if a business is:
1. A franchise location (e.g., Macpac, Kathmandu, Rebel Sport, Fjällräven, McDonald's, Subway)
2. A national/international brand with centralized marketing
3. A chain store or multi-location brand with standardized operations

Known franchise/chain indicators:
- Recognizable brand names in retail (outdoor gear, sporting goods, fashion, food)
- Companies like: Macpac, Kathmandu, Rebel, Rebel Sport, Anaconda, BCF, Ray's Outdoors, Fjällräven, Patagonia stores, The North Face stores, Mountain Designs, Outdoor Outfitters
- Fast food chains, retail chains, petrol stations
- Banks, insurance companies, telcos with local branches
- Real estate franchises (Ray White, LJ Hooker, Century 21, etc.)
- Multiple locations listed on their website
- Standardized branding across locations

SKIP (shouldResearch: false) if:
- Clear franchise or chain store
- National/international brand
- Centralized marketing likely
- Part of a larger corporate structure

RESEARCH (shouldResearch: true) if:
- Independent local business
- Single location or owner-operated
- Unique brand name
- Likely to benefit from SEO services

Respond ONLY in this exact format:

DECISION: [SKIP/RESEARCH]
FRANCHISE: [YES/NO]
NATIONAL_BRAND: [YES/NO]
CONFIDENCE: [HIGH/MEDIUM/LOW]
REASON: [One sentence explanation]`;
}

/**
 * Build the prescreen prompt
 */
function buildPrescreenPrompt(params: PrescreenParams): string {
  let prompt = `Prescreen this business to determine if it should be researched for SEO services.

**Business Name:** ${params.name}`;

  if (params.address) {
    prompt += `\n**Address:** ${params.address}`;
  }

  if (params.website) {
    prompt += `\n**Website:** ${params.website}`;
  }

  prompt += `\n**Business Type:** ${params.businessType}`;

  prompt += `\n\nIs this a franchise, chain store, or national brand that should be SKIPPED?
Or is this an independent local business that should be RESEARCHED?

Use your knowledge of well-known brands and franchises. If you recognize the name as a franchise or chain, mark it as SKIP.
If unsure but it seems like an independent business, mark as RESEARCH.`;

  return prompt;
}

/**
 * Parse the prescreen response
 */
function parsePrescreenResponse(
  content: string,
  businessName: string,
): PrescreenResult {
  const decisionMatch = content.match(/DECISION:\s*(SKIP|RESEARCH)/i);
  const franchiseMatch = content.match(/FRANCHISE:\s*(YES|NO)/i);
  const nationalBrandMatch = content.match(/NATIONAL_BRAND:\s*(YES|NO)/i);
  const confidenceMatch = content.match(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW)/i);
  const reasonMatch = content.match(/REASON:\s*(.+?)(?:\n|$)/i);

  const decision = decisionMatch?.[1]?.toUpperCase() || "RESEARCH";
  const shouldResearch = decision === "RESEARCH";
  const isFranchise = franchiseMatch?.[1]?.toUpperCase() === "YES";
  const isNationalBrand = nationalBrandMatch?.[1]?.toUpperCase() === "YES";
  const confidence = (confidenceMatch?.[1]?.toLowerCase() ||
    "medium") as PrescreenResult["confidence"];
  const reason =
    reasonMatch?.[1]?.trim() ||
    (shouldResearch
      ? "Appears to be an independent business"
      : "Appears to be a franchise or national brand");

  return {
    shouldResearch,
    reason,
    isFranchise,
    isNationalBrand,
    confidence,
  };
}

/**
 * Batch prescreen multiple leads
 * Processes leads in parallel for efficiency
 */
export async function prescreenLeadsBatch(
  leads: PrescreenParams[],
  concurrency: number = 10,
): Promise<Map<string, PrescreenResult>> {
  const results = new Map<string, PrescreenResult>();

  // Process in batches
  for (let i = 0; i < leads.length; i += concurrency) {
    const batch = leads.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((lead) => prescreenLead(lead)),
    );

    batch.forEach((lead, index) => {
      results.set(lead.name, batchResults[index]);
    });
  }

  return results;
}
