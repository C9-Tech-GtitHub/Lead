/**
 * Email Finder Cost Analysis Report
 *
 * This script analyzes the current costs and provides recommendations
 * without making actual API calls.
 */

interface PricingModel {
  name: string;
  inputPerM: number; // per million tokens
  outputPerM: number; // per million tokens
}

const models: Record<string, PricingModel> = {
  "gpt-5-mini": { name: "GPT-5 mini", inputPerM: 0.25, outputPerM: 2.0 },
  "gpt-4o-mini": { name: "GPT-4o mini", inputPerM: 0.15, outputPerM: 0.6 },
  "gpt-5": { name: "GPT-5", inputPerM: 1.25, outputPerM: 10.0 },
  "gpt-4o": { name: "GPT-4o", inputPerM: 2.5, outputPerM: 10.0 },
};

interface Scenario {
  name: string;
  model: keyof typeof models;
  inputTokens: number;
  outputTokens: number;
  useBatch: boolean;
  description: string;
}

function calculateCost(
  model: keyof typeof models,
  inputTokens: number,
  outputTokens: number,
  useBatch: boolean = false
): number {
  const pricing = models[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerM;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerM;
  let totalCost = inputCost + outputCost;

  if (useBatch) {
    totalCost *= 0.5; // 50% discount
  }

  return totalCost;
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(6)}`;
}

function main() {
  console.log("═".repeat(80));
  console.log("🔍 EMAIL FINDER COST ANALYSIS & OPTIMIZATION REPORT");
  console.log("═".repeat(80));
  console.log("\n📊 CURRENT SITUATION:");
  console.log(`   Cost: ~$10 for 200 leads`);
  console.log(`   Per lead: $0.05`);
  console.log(`   Model: gpt-5-mini with web_search_preview`);
  console.log(`   Reasoning effort: low`);
  console.log(`   Max output tokens: 8000`);

  // Estimated token usage based on current implementation
  // These are estimates - actual usage varies per lead
  const currentEstimate = {
    inputTokens: 800, // System prompt + user prompt with company details
    outputTokens: 1200, // JSON response with emails + reasoning tokens
  };

  console.log(
    `\n   Estimated token usage: ${currentEstimate.inputTokens} input, ${currentEstimate.outputTokens} output`
  );
  console.log(
    `   Estimated cost per lead: ${formatCost(calculateCost("gpt-5-mini", currentEstimate.inputTokens, currentEstimate.outputTokens))}`
  );

  // Define optimization scenarios
  const scenarios: Scenario[] = [
    {
      name: "Current (gpt-5-mini, low reasoning)",
      model: "gpt-5-mini",
      inputTokens: 800,
      outputTokens: 1200,
      useBatch: false,
      description: "Current implementation with web search",
    },
    {
      name: "Optimization 1: Minimal reasoning",
      model: "gpt-5-mini",
      inputTokens: 800,
      outputTokens: 800, // ~33% fewer reasoning tokens
      useBatch: false,
      description: "Change reasoning effort from 'low' to 'minimal'",
    },
    {
      name: "Optimization 2: Reduced max tokens",
      model: "gpt-5-mini",
      inputTokens: 800,
      outputTokens: 900, // Constrain output, slightly less content
      useBatch: false,
      description: "Reduce max_output_tokens from 8000 to 4000",
    },
    {
      name: "Optimization 3: Simplified prompt",
      model: "gpt-5-mini",
      inputTokens: 400, // ~50% fewer input tokens
      outputTokens: 1000,
      useBatch: false,
      description: "Simplify system and user prompts",
    },
    {
      name: "Optimization 4: Switch to gpt-4o-mini",
      model: "gpt-4o-mini",
      inputTokens: 400,
      outputTokens: 1000,
      useBatch: false,
      description:
        "Use gpt-4o-mini (75% cheaper output), simplified prompt, no web search",
    },
    {
      name: "Optimization 5: Combine all + Batch API",
      model: "gpt-4o-mini",
      inputTokens: 400,
      outputTokens: 800,
      useBatch: true,
      description:
        "gpt-4o-mini + minimal reasoning + simplified + batch (50% off)",
    },
  ];

  console.log("\n\n📈 OPTIMIZATION SCENARIOS");
  console.log("═".repeat(80));
  console.log(
    "Scenario".padEnd(45) +
      "Cost/Lead".padEnd(15) +
      "Cost/200".padEnd(12) +
      "Savings"
  );
  console.log("─".repeat(80));

  const currentCost = calculateCost(
    scenarios[0].model,
    scenarios[0].inputTokens,
    scenarios[0].outputTokens,
    scenarios[0].useBatch
  );

  scenarios.forEach((scenario) => {
    const cost = calculateCost(
      scenario.model,
      scenario.inputTokens,
      scenario.outputTokens,
      scenario.useBatch
    );
    const costPer200 = cost * 200;
    const savingsPercent = ((currentCost - cost) / currentCost) * 100;
    const savingsStr =
      savingsPercent > 0
        ? `${savingsPercent.toFixed(0)}% 💰`
        : savingsPercent < 0
          ? `+${Math.abs(savingsPercent).toFixed(0)}% ⚠️`
          : "—";

    console.log(
      scenario.name.padEnd(45) +
        formatCost(cost).padEnd(15) +
        `$${costPer200.toFixed(2)}`.padEnd(12) +
        savingsStr
    );
  });

  console.log("\n\n🎯 DETAILED RECOMMENDATIONS");
  console.log("═".repeat(80));

  const recommendations = [
    {
      title: "1. Switch to gpt-4o-mini",
      impact: "High 💰",
      savings: "~70% reduction in output token costs",
      details: [
        "✓ GPT-4o-mini: $0.15/$0.60 per 1M tokens (vs GPT-5-mini: $0.25/$2.00)",
        "✓ 75% cheaper on output tokens",
        "✓ 40% cheaper on input tokens",
        "⚠ No web_search_preview tool (use chat completions API)",
        "⚠ Test quality - may need to adjust prompts for web research",
      ],
    },
    {
      title: "2. Reduce reasoning effort to 'minimal'",
      impact: "Medium 💰",
      savings: "~25-33% fewer output tokens",
      details: [
        "✓ Change reasoning.effort from 'low' to 'minimal'",
        "✓ Faster response time (better UX)",
        "✓ Fewer reasoning tokens generated",
        "⚠ May reduce quality of email verification",
      ],
    },
    {
      title: "3. Reduce max_output_tokens",
      impact: "Low-Medium 💰",
      savings: "~10-20% reduction in output tokens",
      details: [
        "✓ Change from 8000 to 4000-6000 tokens",
        "✓ Forces more concise responses",
        "✓ Prevents verbose search summaries",
        "⚠ Ensure responses aren't truncated",
      ],
    },
    {
      title: "4. Simplify prompts",
      impact: "Low-Medium 💰",
      savings: "~40-50% reduction in input tokens",
      details: [
        "✓ Remove verbose instructions from system prompt",
        "✓ Shorten user prompt",
        "✓ Focus on essential requirements only",
        "✓ Use more structured format (less prose)",
      ],
    },
    {
      title: "5. Use Batch API for bulk operations",
      impact: "Very High 💰",
      savings: "50% discount on all costs",
      details: [
        "✓ 50% discount on batch processing",
        "✓ Process 200 leads in single batch",
        "✓ Results within 24 hours",
        "⚠ Requires JSONL file upload",
        "⚠ Not suitable for real-time requests",
        "⚠ Need to implement batch workflow",
      ],
    },
    {
      title: "6. Consider removing web_search tool",
      impact: "Unknown (needs testing)",
      savings: "Potential quality/cost tradeoff",
      details: [
        "? Web search may add hidden costs",
        "? Could rely on model's training data instead",
        "? Test if quality is acceptable without web search",
        "✓ Would allow using cheaper chat completions API",
      ],
    },
  ];

  recommendations.forEach((rec) => {
    console.log(`\n${rec.title}`);
    console.log(`   Impact: ${rec.impact}`);
    console.log(`   Savings: ${rec.savings}`);
    rec.details.forEach((detail) => {
      console.log(`   ${detail}`);
    });
  });

  console.log("\n\n💡 RECOMMENDED IMPLEMENTATION PLAN");
  console.log("═".repeat(80));

  const phases = [
    {
      phase: "Phase 1: Quick Wins (Easy + Low Risk)",
      steps: [
        "1. Change reasoning effort to 'minimal' (1 line change)",
        "2. Reduce max_output_tokens to 6000 (1 line change)",
        "3. Test with 10-20 leads to verify quality",
        "Expected savings: ~30-40%",
      ],
    },
    {
      phase: "Phase 2: Prompt Optimization (Medium Effort)",
      steps: [
        "1. Simplify system and user prompts",
        "2. Remove verbose instructions",
        "3. Test with 50 leads to verify quality",
        "Expected additional savings: ~15-20%",
      ],
    },
    {
      phase: "Phase 3: Model Switch (Higher Risk, Test Carefully)",
      steps: [
        "1. Create parallel implementation with gpt-4o-mini",
        "2. Test with 100 leads, compare quality to current",
        "3. If quality acceptable, switch default model",
        "4. Consider removing web_search requirement",
        "Expected additional savings: ~50-60%",
      ],
    },
    {
      phase: "Phase 4: Batch API (Best for Bulk Operations)",
      steps: [
        "1. Implement batch processing workflow",
        "2. Create JSONL file generation",
        "3. Add batch status polling",
        "4. Update UI to support async results",
        "Expected additional savings: 50% on all operations",
      ],
    },
  ];

  phases.forEach((phase) => {
    console.log(`\n${phase.phase}`);
    phase.steps.forEach((step) => {
      console.log(`   ${step}`);
    });
  });

  console.log("\n\n🎲 PROJECTED COSTS");
  console.log("═".repeat(80));

  const projections = [
    { name: "Current", cost: currentCost * 200 },
    {
      name: "Phase 1 (minimal + reduced tokens)",
      cost: calculateCost("gpt-5-mini", 800, 800, false) * 200,
    },
    {
      name: "Phase 2 (+ simplified prompts)",
      cost: calculateCost("gpt-5-mini", 400, 800, false) * 200,
    },
    {
      name: "Phase 3 (switch to gpt-4o-mini)",
      cost: calculateCost("gpt-4o-mini", 400, 800, false) * 200,
    },
    {
      name: "Phase 4 (+ Batch API)",
      cost: calculateCost("gpt-4o-mini", 400, 800, true) * 200,
    },
  ];

  projections.forEach((proj) => {
    const savingsVsCurrent = ((projections[0].cost - proj.cost) / projections[0].cost) * 100;
    const savingsStr = savingsVsCurrent > 0 ? `(${savingsVsCurrent.toFixed(0)}% savings)` : "";
    console.log(`${proj.name.padEnd(40)} $${proj.cost.toFixed(2).padStart(8)} ${savingsStr}`);
  });

  console.log("\n\n⚡ NEXT STEPS");
  console.log("═".repeat(80));
  console.log("1. Review this analysis with stakeholders");
  console.log(
    "2. Start with Phase 1 (minimal risk, immediate ~30-40% savings)"
  );
  console.log("3. Run actual API tests to validate token estimates");
  console.log("4. Measure quality metrics before/after each change");
  console.log("5. Consider A/B testing for model comparison");
  console.log(
    "6. Monitor costs in production with OpenAI usage dashboard\n"
  );
}

main();
