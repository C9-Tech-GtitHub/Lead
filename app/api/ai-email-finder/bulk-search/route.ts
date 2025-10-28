import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findEmailsWithAI } from "@/lib/ai/email-finder";

export async function POST(request: Request) {
  console.log(
    "[AI Email Finder Bulk] Route hit - starting AI bulk email search",
  );
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log("[AI Email Finder Bulk] User authenticated:", user?.id);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadIds, onlyMissing = true } = await request.json();
    console.log("[AI Email Finder Bulk] Received leadIds:", leadIds);

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      console.log("[AI Email Finder Bulk] Invalid leadIds");
      return NextResponse.json(
        { error: "Lead IDs are required" },
        { status: 400 },
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    // Fetch leads with their domains and email counts (no user filtering - all users can access all leads)
    console.log("[AI Email Finder Bulk] Querying leads");
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select(
        "id, name, website, hunter_io_searched_at, tomba_searched_at, ai_email_searched_at, lead_emails(count)",
      )
      .in("id", leadIds);

    if (leadsError) {
      console.error("[AI Email Finder Bulk] Database error:", leadsError);
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    console.log("[AI Email Finder Bulk] Found leads:", leads?.length || 0);

    if (!leads || leads.length === 0) {
      console.log("[AI Email Finder Bulk] No leads found - returning 404");
      return NextResponse.json({ error: "No leads found" }, { status: 404 });
    }

    const results = {
      total: leads.length,
      processed: 0,
      skipped: 0,
      successful: 0,
      failed: 0,
      details: [] as any[],
    };

    // Process a single lead
    const processLead = async (lead: any) => {
      let domain = lead.website;

      // Skip if no domain
      if (!domain) {
        return {
          leadId: lead.id,
          leadName: lead.name,
          status: "skipped",
          reason: "No website domain",
        };
      }

      // Skip if already searched or has emails and onlyMissing is true
      if (onlyMissing) {
        const emailCount = (lead as any).lead_emails?.[0]?.count || 0;

        // Skip if lead already has emails
        if (emailCount > 0) {
          return {
            leadId: lead.id,
            leadName: lead.name,
            status: "skipped",
            reason: `Already has ${emailCount} email${emailCount !== 1 ? "s" : ""}`,
          };
        }

        // Also skip if already searched (but found no emails)
        const searchedWith = [];
        if (lead.hunter_io_searched_at) searchedWith.push("Hunter.io");
        if (lead.tomba_searched_at) searchedWith.push("Tomba.io");
        if (lead.ai_email_searched_at) searchedWith.push("AI Search");

        if (searchedWith.length > 0) {
          return {
            leadId: lead.id,
            leadName: lead.name,
            status: "skipped",
            reason: `Already searched with ${searchedWith.join(", ")} (no emails found)`,
          };
        }
      }

      // Clean domain
      domain = domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];

      try {
        console.log(`[AI Email Finder] Processing ${lead.name} at ${domain}`);

        // Use AI to find emails
        let aiResult;
        try {
          aiResult = await findEmailsWithAI({
            name: lead.name,
            website: lead.website,
            domain: domain,
          });
        } catch (aiError: any) {
          console.error(
            `[AI Email Finder] AI search failed for ${lead.name}:`,
            aiError.message,
          );
          return {
            leadId: lead.id,
            leadName: lead.name,
            status: "failed",
            reason: `AI search error: ${aiError.message}`,
          };
        }

        // Update lead with AI search metadata
        const { error: updateError } = await supabase
          .from("leads")
          .update({
            hunter_io_searched_at: new Date().toISOString(), // Reuse field for tracking
            hunter_organization: aiResult.organization || null,
            hunter_email_pattern: aiResult.emailPattern || null,
            hunter_total_emails: aiResult.emails.length,
            ai_email_searched_at: new Date().toISOString(),
            ai_email_search_summary:
              aiResult.emails.length === 0 ? aiResult.searchSummary : null,
          })
          .eq("id", lead.id);

        if (updateError) {
          console.error("[AI Email Finder] Error updating lead:", updateError);
        } else {
          console.log(
            `[AI Email Finder] Successfully updated lead ${lead.id} metadata`,
          );
        }

        // Save emails if any found
        if (aiResult.emails.length > 0) {
          const emailRecords = aiResult.emails.map((email) => ({
            lead_id: lead.id,
            user_id: user.id,
            email: email.email,
            type: email.type || "personal", // Use classification from AI finder
            confidence: email.confidence,
            first_name: email.firstName || null,
            last_name: email.lastName || null,
            position: email.position || null,
            department: email.department || null,
            seniority: null,
            verification_status: "unknown",
            verification_date: null,
            sources: [{ url: email.source, type: "ai_web_search" }],
            provider: "ai",
            // New classification fields
            email_category: email.email_category || null,
            priority_score: email.priority_score || null,
            classification_reasoning: email.classification_reasoning || null,
            is_recommended: email.is_recommended || false,
          }));

          console.log(
            `[AI Email Finder] Inserting ${emailRecords.length} emails for lead ${lead.id}`,
          );

          const { error: insertError } = await supabase
            .from("lead_emails")
            .insert(emailRecords);

          if (insertError) {
            console.error(
              "[AI Email Finder] Error inserting emails:",
              insertError,
            );
            return {
              leadId: lead.id,
              leadName: lead.name,
              status: "failed",
              reason: `Database error: ${insertError.message}`,
              emailsFound: aiResult.emails.length,
            };
          }

          console.log(
            `[AI Email Finder] Successfully inserted ${emailRecords.length} emails`,
          );
        }

        return {
          leadId: lead.id,
          leadName: lead.name,
          domain: domain,
          status: "success",
          emailsFound: aiResult.emails.length,
          organization: aiResult.organization,
          pattern: aiResult.emailPattern,
          searchSummary: aiResult.searchSummary,
        };
      } catch (error: any) {
        return {
          leadId: lead.id,
          leadName: lead.name,
          status: "failed",
          reason: error.message,
        };
      }
    };

    // Process leads in parallel with concurrency limit
    const CONCURRENCY_LIMIT = 10; // Process 10 leads at a time
    const allResults: any[] = [];

    for (let i = 0; i < leads.length; i += CONCURRENCY_LIMIT) {
      const batch = leads.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(batch.map(processLead));

      for (const result of batchResults) {
        allResults.push(result);

        if (result.status === "skipped") {
          results.skipped++;
        } else if (result.status === "failed") {
          results.failed++;
          results.processed++;
        } else if (result.status === "success") {
          results.successful++;
          results.processed++;
        }

        results.details.push(result);
      }

      console.log(
        `[AI Email Finder Bulk] Progress: ${allResults.length}/${leads.length} (${Math.round((allResults.length / leads.length) * 100)}%)`,
      );
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("AI bulk email search error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
