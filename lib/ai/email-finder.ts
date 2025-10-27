/**
 * AI-Powered Email Finder
 * Uses OpenAI GPT-5 with web search to find business contact emails
 */

import OpenAI from "openai";

interface EmailFinderParams {
  name: string;
  website: string;
  domain: string;
}

interface FoundEmail {
  email: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  department?: string;
  confidence: number;
  source: string;
}

interface EmailFinderResult {
  emails: FoundEmail[];
  organization?: string;
  emailPattern?: string;
  searchSummary: string;
}

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export async function findEmailsWithAI(
  params: EmailFinderParams,
): Promise<EmailFinderResult> {
  try {
    console.log(
      `[AI Email Finder] Searching for emails: ${params.name} at ${params.domain}`,
    );
    const openai = getOpenAIClient();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const userPrompt = `Find business contact emails for the following company:

Company Name: ${params.name}
Website: ${params.website}
Domain: ${params.domain}

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

    // Call GPT-5 with web search enabled
    const response = await openai.responses.create({
      model: "gpt-5",
      reasoning: { effort: "medium" },
      max_output_tokens: 2000,
      tools: [
        {
          type: "web_search_preview",
        },
      ],
      tool_choice: "auto", // Let it decide when to use web search
      input: [
        {
          role: "system",
          content: `You are an expert at finding business contact information through web research.
You use public sources like company websites, LinkedIn, business directories, and professional networks.
You NEVER fabricate or guess email addresses.
You always cite your sources and rate confidence based on verification level.
You prioritize decision-makers and key contacts over generic emails.`,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    console.log(`[AI Email Finder] Response received, parsing output...`);
    console.log(`[AI Email Finder] Response keys:`, Object.keys(response));

    // Try different possible response formats
    let content =
      response.output_text ||
      (response.output && Array.isArray(response.output)
        ? response.output
            .filter((item: any) => item.type === "text")
            .map((item: any) => item.text)
            .join("\n")
        : "") ||
      (typeof response.output === "string" ? response.output : "");

    if (!content) {
      console.error(
        "[AI Email Finder] No content found in response:",
        JSON.stringify(response, null, 2),
      );
      throw new Error("No response from GPT-5");
    }

    console.log(
      `[AI Email Finder] Output length: ${content.length} characters`,
    );

    // Parse the JSON response
    let result: EmailFinderResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.log(
          "[AI Email Finder] No JSON found in response, treating as plain text",
        );
        result = {
          emails: [],
          searchSummary: content,
        };
      } else {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        console.log(
          `[AI Email Finder] Attempting to parse JSON: ${jsonStr.substring(0, 200)}...`,
        );
        result = JSON.parse(jsonStr);
      }
    } catch (parseError) {
      console.error("[AI Email Finder] Failed to parse JSON:", parseError);
      console.error(
        "[AI Email Finder] Raw content:",
        content.substring(0, 1000),
      );
      // Return empty result with the raw content as summary
      result = {
        emails: [],
        searchSummary: `AI search completed but response format was unexpected. Raw output: ${content.substring(0, 500)}`,
      };
    }

    console.log(
      `[AI Email Finder] Found ${result.emails.length} email(s) for ${params.name}`,
    );

    return result;
  } catch (error) {
    console.error("[AI Email Finder] Error:", error);
    throw new Error(
      `Failed to find emails: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
