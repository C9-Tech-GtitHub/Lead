/**
 * Analyze and optimize GPT-5 mini email finder costs
 *
 * Current: ~$10 for 200 leads = $0.05 per lead
 *
 * Pricing (2025):
 * - GPT-5-mini: $0.25/1M input, $2.00/1M output tokens
 * - GPT-4o-mini: $0.15/1M input, $0.60/1M output tokens (75% cheaper on output!)
 * - Batch API: 50% discount (24hr processing)
 * - Cached tokens: 90% discount on repeated queries
 *
 * Cost reduction strategies to test:
 * 1. Switch from gpt-5-mini to gpt-4o-mini (3x cheaper on output)
 * 2. Reduce reasoning effort from "low" to "minimal"
 * 3. Reduce max_output_tokens from 8000 to 4000-6000
 * 4. Use Batch API for 50% discount
 * 5. Simplify system/user prompts to reduce input tokens
 * 6. Remove web_search tool and use cheaper alternatives
 */

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Test company data
const testLeads = [
  {
    name: "Acme Corporation",
    website: "https://acme-corp.com",
    domain: "acme-corp.com",
  },
  {
    name: "TechStart Solutions",
    website: "https://techstart.io",
    domain: "techstart.io",
  },
];

interface TestResult {
  model: string;
  reasoning?: string;
  maxTokens: number;
  useWebSearch: boolean;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  duration: number;
  emailsFound: number;
}

/**
 * Calculate costs based on OpenAI pricing (2025)
 */
function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  useBatch: boolean = false
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-5-mini": { input: 0.25, output: 2.0 }, // per 1M tokens
    "gpt-4o-mini": { input: 0.15, output: 0.6 }, // per 1M tokens - MUCH cheaper
    "gpt-5": { input: 1.25, output: 10.0 },
    "gpt-4o": { input: 2.5, output: 10.0 },
  };

  const modelPricing = pricing[model] || pricing["gpt-5-mini"];

  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

  let totalCost = inputCost + outputCost;

  // Batch API discount
  if (useBatch) {
    totalCost *= 0.5; // 50% discount
  }

  return totalCost;
}

/**
 * Test different configurations
 */
async function testConfiguration(
  lead: typeof testLeads[0],
  config: {
    model: string;
    reasoning?: "minimal" | "low" | "medium";
    maxTokens: number;
    useWebSearch: boolean;
    simplifiedPrompt: boolean;
  }
): Promise<TestResult> {
  const startTime = Date.now();

  // Simplified prompt to reduce input tokens
  const systemPrompt = config.simplifiedPrompt
    ? "Find business contact emails from public sources. Return JSON with emails array containing: email, firstName, lastName, position, confidence (0-100), source."
    : `You are an expert at finding business contact information through web research.
You use public sources like company websites, LinkedIn, business directories, and professional networks.
You NEVER fabricate or guess email addresses.
You always cite your sources and rate confidence based on verification level.
You prioritize decision-makers and key contacts over generic emails.`;

  const userPrompt = config.simplifiedPrompt
    ? `Find emails for: ${lead.name} (${lead.domain})
Return JSON: {"emails": [{"email": "...", "firstName": "...", "lastName": "...", "position": "...", "confidence": 85, "source": "..."}], "searchSummary": "..."}`
    : `Find business contact emails for the following company:

Company Name: ${lead.name}
Website: ${lead.website}
Domain: ${lead.domain}

Task:
1. Search the web for publicly available contact emails for this business
2. Look for emails on their website, LinkedIn, business directories, contact pages
3. Find key decision makers (owners, managers, directors, marketing leads)
4. Identify email patterns if multiple emails are found
5. Rate confidence (0-100) based on how verified/recent the email appears

IMPORTANT:
- Only return emails you can verify from public sources
- Do NOT generate or guess emails
- Prioritize personal emails over generic info@ or contact@ emails
- Include the source where you found each email

Respond in this exact JSON format:
{
  "emails": [
    {
      "email": "john.smith@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "position": "Owner",
      "department": "Executive",
      "confidence": 85,
      "source": "LinkedIn profile"
    }
  ],
  "organization": "Company Name",
  "emailPattern": "{first}.{last}@domain.com",
  "searchSummary": "Brief summary of search results and findings"
}

If no emails found, return empty emails array with summary of why.`;

  try {
    // For gpt-5-mini with responses API
    if (config.model === "gpt-5-mini") {
      const tools = config.useWebSearch
        ? [{ type: "web_search_preview" as const }]
        : undefined;

      const response = await openai.responses.create({
        model: config.model,
        reasoning: config.reasoning ? { effort: config.reasoning } : undefined,
        max_output_tokens: config.maxTokens,
        tools,
        tool_choice: config.useWebSearch ? "auto" : undefined,
        input: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });

      const usage = (response as any).usage;
      const duration = Date.now() - startTime;

      // Extract emails count from response
      let emailsFound = 0;
      try {
        const outputText =
          response.output_text ||
          response.output
            ?.filter((item: any) => item.type === "text")
            .map((item: any) => item.text)
            .join("\n");
        const jsonMatch =
          outputText?.match(/```json\s*([\s\S]*?)\s*```/) ||
          outputText?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          emailsFound = parsed.emails?.length || 0;
        }
      } catch (e) {
        console.log("Could not parse email count:", e);
      }

      return {
        model: config.model,
        reasoning: config.reasoning,
        maxTokens: config.maxTokens,
        useWebSearch: config.useWebSearch,
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        estimatedCost: calculateCost(
          config.model,
          usage?.prompt_tokens || 0,
          usage?.completion_tokens || 0
        ),
        duration,
        emailsFound,
      };
    }
    // For gpt-4o-mini with chat completions
    else {
      const response = await openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        max_tokens: config.maxTokens,
        temperature: 0.3,
      });

      const usage = response.usage;
      const duration = Date.now() - startTime;

      // Extract emails count
      let emailsFound = 0;
      try {
        const content = response.choices[0]?.message?.content || "";
        const jsonMatch =
          content.match(/```json\s*([\s\S]*?)\s*```/) ||
          content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          emailsFound = parsed.emails?.length || 0;
        }
      } catch (e) {
        console.log("Could not parse email count:", e);
      }

      return {
        model: config.model,
        reasoning: undefined,
        maxTokens: config.maxTokens,
        useWebSearch: false,
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        estimatedCost: calculateCost(
          config.model,
          usage?.prompt_tokens || 0,
          usage?.completion_tokens || 0
        ),
        duration,
        emailsFound,
      };
    }
  } catch (error: any) {
    console.error(`Error testing config:`, error.message);
    throw error;
  }
}

async function main() {
  console.log("🔍 Email Finder Cost Analysis\n");
  console.log("Current cost: ~$10 for 200 leads = $0.05 per lead\n");

  const configurations = [
    // Current implementation
    {
      name: "Current (gpt-5-mini, low reasoning, web search)",
      model: "gpt-5-mini",
      reasoning: "low" as const,
      maxTokens: 8000,
      useWebSearch: true,
      simplifiedPrompt: false,
    },
    // Optimization 1: Minimal reasoning
    {
      name: "gpt-5-mini, minimal reasoning, web search",
      model: "gpt-5-mini",
      reasoning: "minimal" as const,
      maxTokens: 8000,
      useWebSearch: true,
      simplifiedPrompt: false,
    },
    // Optimization 2: Reduced output tokens
    {
      name: "gpt-5-mini, low reasoning, 4000 tokens, web search",
      model: "gpt-5-mini",
      reasoning: "low" as const,
      maxTokens: 4000,
      useWebSearch: true,
      simplifiedPrompt: false,
    },
    // Optimization 3: Simplified prompt
    {
      name: "gpt-5-mini, low reasoning, simplified prompt",
      model: "gpt-5-mini",
      reasoning: "low" as const,
      maxTokens: 6000,
      useWebSearch: true,
      simplifiedPrompt: true,
    },
    // Optimization 4: Switch to gpt-4o-mini (no web search in chat)
    {
      name: "gpt-4o-mini, 6000 tokens, simplified",
      model: "gpt-4o-mini",
      maxTokens: 6000,
      useWebSearch: false,
      simplifiedPrompt: true,
    },
  ];

  const results: TestResult[] = [];

  for (const config of configurations) {
    console.log(`\n📊 Testing: ${config.name}`);
    console.log("─".repeat(60));

    try {
      const result = await testConfiguration(testLeads[0], config);
      results.push(result);

      console.log(`✅ Model: ${result.model}`);
      if (result.reasoning) console.log(`   Reasoning: ${result.reasoning}`);
      console.log(`   Max Tokens: ${result.maxTokens}`);
      console.log(`   Web Search: ${result.useWebSearch ? "Yes" : "No"}`);
      console.log(`   Input Tokens: ${result.inputTokens.toLocaleString()}`);
      console.log(`   Output Tokens: ${result.outputTokens.toLocaleString()}`);
      console.log(`   Total Tokens: ${result.totalTokens.toLocaleString()}`);
      console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
      console.log(`   Emails Found: ${result.emailsFound}`);
      console.log(`   Cost per lead: $${result.estimatedCost.toFixed(6)}`);
      console.log(
        `   Cost per 200 leads: $${(result.estimatedCost * 200).toFixed(2)}`
      );

      // Calculate savings
      const currentCost = 0.05; // $0.05 per lead
      const savings = ((currentCost - result.estimatedCost) / currentCost) * 100;
      if (savings > 0) {
        console.log(`   💰 Savings: ${savings.toFixed(1)}% ($${(currentCost - result.estimatedCost).toFixed(4)} per lead)`);
      } else if (savings < 0) {
        console.log(`   📈 Increase: ${Math.abs(savings).toFixed(1)}% ($${Math.abs(currentCost - result.estimatedCost).toFixed(4)} more per lead)`);
      }
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
    }

    // Rate limit protection
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Summary comparison
  console.log("\n\n📈 SUMMARY COMPARISON");
  console.log("═".repeat(80));
  console.log(
    "Configuration".padEnd(50) +
      "Cost/Lead".padEnd(15) +
      "Cost/200".padEnd(15)
  );
  console.log("─".repeat(80));

  results.forEach((result, i) => {
    const configName = configurations[i].name.substring(0, 47);
    const costPerLead = `$${result.estimatedCost.toFixed(6)}`;
    const costPer200 = `$${(result.estimatedCost * 200).toFixed(2)}`;
    console.log(
      configName.padEnd(50) + costPerLead.padEnd(15) + costPer200.padEnd(15)
    );
  });

  // Batch API projection
  console.log("\n\n💡 BATCH API PROJECTION (50% discount)");
  console.log("─".repeat(80));
  const bestResult = results.reduce((best, curr) =>
    curr.estimatedCost < best.estimatedCost ? curr : best
  );
  const batchCost = bestResult.estimatedCost * 0.5;
  console.log(`Best config with Batch API: $${batchCost.toFixed(6)} per lead`);
  console.log(`Cost for 200 leads: $${(batchCost * 200).toFixed(2)}`);
  console.log(
    `Savings vs current: ${(((0.05 - batchCost) / 0.05) * 100).toFixed(1)}%`
  );

  console.log("\n\n🎯 RECOMMENDATIONS:");
  console.log("1. Switch to gpt-4o-mini if possible (75% cheaper output tokens)");
  console.log("2. Use minimal reasoning effort instead of low");
  console.log("3. Reduce max_output_tokens to 4000-6000");
  console.log("4. Simplify prompts to reduce input tokens");
  console.log("5. Use Batch API for 50% additional discount on bulk operations");
  console.log("6. Consider removing web_search tool if quality remains acceptable");
}

main().catch(console.error);
