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
 * Batch prescreen multiple leads in a single API call
 * Much more efficient - sends all business names at once
 */
export async function prescreenLeadsBatch(
  leads: PrescreenParams[],
): Promise<Map<string, PrescreenResult>> {
  const results = new Map<string, PrescreenResult>();

  if (leads.length === 0) {
    return results;
  }

  try {
    console.log(`[Prescreen] Batch screening ${leads.length} businesses...`);

    // Build a single prompt with all business names
    const businessType = leads[0]?.businessType || "business";
    const businessList = leads
      .map((lead, index) => `${index + 1}. ${lead.name}`)
      .join("\n");

    const prompt = `You are screening ${leads.length} ${businessType} businesses to identify franchises and national brands.

For each business below, determine if it's a franchise/chain (SKIP) or an independent local business (RESEARCH).

Business names:
${businessList}

For each business, respond with ONE line in this exact format:
[NUMBER]. [BUSINESS_NAME] | [SKIP/RESEARCH] | [YES/NO for franchise] | [YES/NO for national brand] | [HIGH/MEDIUM/LOW confidence] | [Brief reason]

Example:
1. Macpac Melbourne | SKIP | YES | YES | HIGH | National outdoor gear franchise
2. Joe's Local Cafe | RESEARCH | NO | NO | HIGH | Independent local business

Known franchises/chains to SKIP: Macpac, Kathmandu, Rebel Sport, Anaconda, BCF, McDonald's, Subway, KFC, Starbucks, 7-Eleven, Ray White, LJ Hooker, banks, telcos, national retail chains.

Independent businesses to RESEARCH: Unique local names, single locations, owner-operated businesses.

Provide your classification for all ${leads.length} businesses:`;

    // Make single API call
    const response = await openai.responses.create({
      model: "gpt-5",
      reasoning: { effort: "low" },
      max_output_tokens: leads.length * 100 + 500, // Scale with number of leads
      input: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.output_text;

    if (!content) {
      // If no response, default to allowing research for all (fail open)
      console.warn("[Prescreen] No response from API, allowing all research");
      leads.forEach((lead) => {
        results.set(lead.name, {
          shouldResearch: true,
          reason: "Prescreen failed - proceeding with research",
          isFranchise: false,
          isNationalBrand: false,
          confidence: "low",
        });
      });
      return results;
    }

    // Parse batch response
    const lines = content.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      // Match format: "1. Business Name | SKIP/RESEARCH | YES/NO | YES/NO | HIGH/MEDIUM/LOW | Reason"
      const match = line.match(
        /^\d+\.\s*(.+?)\s*\|\s*(SKIP|RESEARCH)\s*\|\s*(YES|NO)\s*\|\s*(YES|NO)\s*\|\s*(HIGH|MEDIUM|LOW)\s*\|\s*(.+)$/i,
      );

      if (match) {
        const [
          ,
          businessName,
          decision,
          franchise,
          nationalBrand,
          conf,
          reason,
        ] = match;

        // Find the matching lead (case-insensitive, partial match)
        const lead = leads.find((l) => {
          const leadName = l.name.toLowerCase().trim();
          const parsedName = businessName.toLowerCase().trim();
          // Try exact match first
          if (leadName === parsedName) return true;
          // Try partial match (for cases where GPT-5 shortens the name)
          if (leadName.includes(parsedName) || parsedName.includes(leadName)) return true;
          return false;
        });

        if (lead) {
          results.set(lead.name, {
            shouldResearch: decision.toUpperCase() === "RESEARCH",
            isFranchise: franchise.toUpperCase() === "YES",
            isNationalBrand: nationalBrand.toUpperCase() === "YES",
            confidence: conf.toLowerCase() as "high" | "medium" | "low",
            reason: reason.trim(),
          });
        }
      }
    }

    // For any leads not matched, apply fallback pattern matching for known franchises
    leads.forEach((lead) => {
      if (!results.has(lead.name)) {
        // Check if the name contains known franchise/chain keywords
        const knownChains = [
          'macpac', 'kathmandu', 'rebel', 'anaconda', 'bcf', 'rays outdoors',
          'mountain designs', 'fjallraven', 'patagonia', 'the north face',
          'mcdonalds', 'subway', 'kfc', 'starbucks', '7-eleven', '7 eleven',
          'ray white', 'lj hooker', 'century 21', 'harcourts',
          'commonwealth bank', 'westpac', 'anz', 'nab', 'telstra', 'optus', 'vodafone'
        ];

        const lowerName = lead.name.toLowerCase();
        const matchedChain = knownChains.find(chain => lowerName.includes(chain));

        if (matchedChain) {
          console.warn(
            `[Prescreen] ${lead.name} matched known chain pattern "${matchedChain}" - marking as SKIP`,
          );
          results.set(lead.name, {
            shouldResearch: false,
            reason: `Known franchise/chain detected: ${matchedChain}`,
            isFranchise: true,
            isNationalBrand: true,
            confidence: "high",
          });
        } else {
          console.warn(
            `[Prescreen] No result for ${lead.name}, defaulting to research`,
          );
          results.set(lead.name, {
            shouldResearch: true,
            reason: "Not classified - proceeding with research",
            isFranchise: false,
            isNationalBrand: false,
            confidence: "low",
          });
        }
      }
    });

    const skipCount = Array.from(results.values()).filter(
      (r) => !r.shouldResearch,
    ).length;
    console.log(
      `[Prescreen] Batch complete: ${results.size - skipCount} to research, ${skipCount} franchises skipped`,
    );

    return results;
  } catch (error) {
    console.error("[Prescreen] Batch error:", error);
    // On error, default to allowing research for all (fail open)
    leads.forEach((lead) => {
      results.set(lead.name, {
        shouldResearch: true,
        reason: "Prescreen error - proceeding with research",
        isFranchise: false,
        isNationalBrand: false,
        confidence: "low",
      });
    });
    return results;
  }
}
