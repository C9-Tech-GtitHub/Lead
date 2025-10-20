/**
 * Lightweight AI Lead Researcher
 * Uses GPT-5 WITHOUT web search for fast, low-cost initial qualification
 * Focuses on analyzing provided website content only
 */

import OpenAI from "openai";

interface QuickResearchConfig {
  checkMatchCategory?: boolean;
  checkIdentity?: boolean;
  checkBusinessProfile?: boolean;
  checkScale?: boolean;
  checkBrandPresence?: boolean;
  checkHistory?: boolean;
  checkBusinessSize?: boolean;
  checkMarketReach?: boolean;
  rejectBrandsFranchises?: boolean;
  customPrompt?: string;
}

interface ResearchLeadParams {
  name: string;
  website: string;
  websiteContent: string;
  aboutContent?: string;
  teamContent?: string;
  hasMultipleLocations: boolean;
  teamSize?: string;
  businessType: string;
  config?: QuickResearchConfig;
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

export async function lightweightResearchLead(
  params: ResearchLeadParams,
): Promise<LeadAnalysis> {
  try {
    console.log(`[Lightweight Researcher] Analyzing lead: ${params.name}`);
    const openai = getOpenAIClient();

    // Construct the analysis prompt with all available data
    const userPrompt = buildAnalysisPrompt(params);

    // Call GPT-5-mini WITHOUT web search - rely only on provided content
    const response = await openai.responses.create({
      model: "gpt-5-mini",
      reasoning: { effort: "low" },
      max_output_tokens: 1500, // Reduced from 2000
      // NO TOOLS - no web search
      input: [
        {
          role: "system",
          content: getSystemPrompt(params.config),
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
      `[Lightweight Researcher] Analysis complete for ${params.name} - Grade: ${analysis.grade}`,
    );

    return analysis;
  } catch (error) {
    console.error("[Lightweight Researcher] Error:", error);
    throw new Error(
      `Failed to analyze lead: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * System prompt optimized for quick qualification based only on provided content
 */
function getSystemPrompt(config?: QuickResearchConfig): string {
  // Default to all checks enabled if no config provided
  const checks = config || {
    checkMatchCategory: true,
    checkIdentity: true,
    checkBusinessProfile: true,
    checkScale: true,
    checkBrandPresence: true,
    checkHistory: true,
    checkBusinessSize: true,
    checkMarketReach: true,
  };

  // Build the dynamic prompt based on enabled checks
  let sections = [];
  sections.push(
    "You are a GPT-5 lead qualification analyst performing LIGHTWEIGHT qualification.",
  );
  sections.push(
    "You must analyze ONLY the provided website content - you do NOT have web search available.",
  );
  sections.push("");
  sections.push("IMPORTANT GUIDELINES:");
  sections.push(
    "- ONLY use the provided website content - do NOT make up external data",
  );
  sections.push(
    '- For anything you cannot confirm from the content, say "Unknown - requires deep research"',
  );
  sections.push(
    "- Be decisive with grading based on what IS visible on the website",
  );
  sections.push("- Keep responses concise - one sentence per bullet point");
  sections.push(
    "- Focus on signals that indicate whether this business needs SEO services",
  );

  // Add brand/franchise rejection rule if enabled
  if (checks.rejectBrandsFranchises) {
    sections.push("");
    sections.push("⚠️ CRITICAL REJECTION RULE:");
    sections.push(
      "- Automatically assign grade F if the business is a national brand, franchise, chain, or multinational corporation",
    );
    sections.push(
      "- Look for franchise indicators: 'locations nationwide', franchise disclaimers, corporate branding, multiple states/countries",
    );
    sections.push(
      "- We seek LOCAL, INDEPENDENT businesses only - reject big brands immediately",
    );
  }

  sections.push("");
  sections.push("Respond ONLY in this exact format:");
  sections.push("");
  sections.push("## GRADE: [A/B/C/D/F]");

  if (checks.checkMatchCategory) {
    sections.push("");
    sections.push("## MATCH CHECK:");
    sections.push(
      "[Exact Match | Close Match | MISMATCH | Unknown] - one sentence",
    );
  }
  if (checks.checkIdentity) {
    sections.push("");
    sections.push("## BUSINESS IDENTITY & LEGITIMACY:");
    sections.push("- Website Presence: ...");
    sections.push("- Contact Info: ...");
    sections.push("- Professional Quality: ...");
  }
  if (checks.checkBusinessProfile) {
    sections.push("");
    sections.push("## BUSINESS PROFILE:");
    sections.push("- Industry Match: ...");
    sections.push("- Services Offered: ...");
    sections.push("- Target Market: ...");
    sections.push("- Business Model: ...");
  }
  if (checks.checkScale) {
    sections.push("");
    sections.push("## BUSINESS SCALE & ACTIVITY:");
    sections.push("- Team Indicators: ...");
    sections.push("- Service Breadth: ...");
    sections.push("- Portfolio/Projects: ...");
    sections.push("- Geographic Coverage: ...");
  }
  if (checks.checkBrandPresence) {
    sections.push("");
    sections.push("## BRAND PRESENCE:");
    sections.push("- Website Quality: ...");
    sections.push("- Social Links Present: ...");
    sections.push("- Review Claims: ...");
    sections.push("- Content Marketing: ...");
  }
  if (checks.checkHistory) {
    sections.push("");
    sections.push("## BUSINESS HISTORY:");
    sections.push("- Year Founded: ...");
    sections.push("- Experience Claims: ...");
  }
  if (checks.checkBusinessSize) {
    sections.push("");
    sections.push("## BUSINESS SIZE:");
    sections.push(
      "[Micro/Small/Medium/Large/Enterprise/Unknown] - brief justification",
    );
  }
  if (checks.checkMarketReach) {
    sections.push("");
    sections.push("## MARKET REACH:");
    sections.push(
      "[Local/Regional/National/International/Unknown] - brief justification",
    );
  }

  sections.push("");
  sections.push("## SNAPSHOT:");
  sections.push(
    "One sentence explaining the grade and whether deep research is recommended.",
  );

  return sections.join("\n");
}

/**
 * Build the user prompt with all available business data
 */
function buildAnalysisPrompt(params: ResearchLeadParams): string {
  const leadQuery = params.businessType?.trim() || "Unknown (not provided)";
  const businessType = params.businessType?.trim() || "Not provided";

  let prompt = `Perform LIGHTWEIGHT qualification on this business using ONLY the provided website content.

**Lead Query:** ${leadQuery}

**Business Name:** ${params.name}
**Website:** ${params.website}
**Business Type:** ${businessType}
**Multiple Locations:** ${params.hasMultipleLocations ? "Yes" : "No"}`;

  if (params.teamSize) {
    prompt += `\n**Team Size:** ${params.teamSize}`;
  }

  prompt += "\n\n## Website Content:\n";
  prompt += params.websiteContent.slice(0, 2000); // Reduced from 3000

  if (params.aboutContent) {
    prompt += "\n\n## About Page:\n";
    prompt += params.aboutContent.slice(0, 1500); // Reduced from 2000
  }

  if (params.teamContent) {
    prompt += "\n\n## Team Page:\n";
    prompt += params.teamContent.slice(0, 1000); // Reduced from 2000
  }

  prompt += `\n\nAnalyze this content and provide your quick qualification assessment.
If you need external verification (reviews, ABN, traffic data), mark as "Unknown - requires deep research".
Focus on what the website content tells you about SEO fit.`;

  // Add custom prompt if provided
  if (params.config?.customPrompt && params.config.customPrompt.trim()) {
    prompt += `\n\n## ADDITIONAL INSTRUCTIONS:\n${params.config.customPrompt.trim()}`;
  }

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
    /##\s*BRAND PRESENCE:\s*\n([\s\S]*?)(?=\n##|$)/i,
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
