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

    // Fetch leads with their domains (no user filtering - all users can access all leads)
    console.log("[AI Email Finder Bulk] Querying leads");
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select(
        "id, name, website, hunter_io_searched_at, tomba_searched_at, ai_email_searched_at",
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

    // Process each lead
    for (const lead of leads) {
      let domain = lead.website;

      // Skip if no domain
      if (!domain) {
        results.skipped++;
        results.details.push({
          leadId: lead.id,
          leadName: lead.name,
          status: "skipped",
          reason: "No website domain",
        });
        continue;
      }

      // Skip if already searched and onlyMissing is true
      if (
        onlyMissing &&
        (lead.hunter_io_searched_at ||
          lead.tomba_searched_at ||
          lead.ai_email_searched_at)
      ) {
        results.skipped++;
        results.details.push({
          leadId: lead.id,
          leadName: lead.name,
          status: "skipped",
          reason: "Already searched with Hunter/Tomba/AI",
        });
        continue;
      }

      // Clean domain
      domain = domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];

      try {
        console.log(`[AI Email Finder] Processing ${lead.name} at ${domain}`);

        // Use AI to find emails
        const aiResult = await findEmailsWithAI({
          name: lead.name,
          website: lead.website,
          domain: domain,
        });

        // Update lead with AI search metadata
        await supabase
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

        // Save emails if any found
        if (aiResult.emails.length > 0) {
          const emailRecords = aiResult.emails.map((email) => ({
            lead_id: lead.id,
            user_id: user.id,
            email: email.email,
            type: email.email.match(/^(info|contact|hello|support|sales)@/)
              ? "generic"
              : "personal",
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
          }));

          console.log(
            `[AI Email Finder] Inserting ${emailRecords.length} emails for lead ${lead.id}`,
          );
          console.log(
            "[AI Email Finder] Email records:",
            JSON.stringify(emailRecords, null, 2),
          );

          const { error: insertError } = await supabase
            .from("lead_emails")
            .insert(emailRecords);

          if (insertError) {
            console.error(
              "[AI Email Finder] Error inserting emails:",
              insertError,
            );
            console.error("[AI Email Finder] Error code:", insertError.code);
            console.error(
              "[AI Email Finder] Error message:",
              insertError.message,
            );
            console.error(
              "[AI Email Finder] Error details:",
              insertError.details,
            );
            results.failed++;
            results.details.push({
              leadId: lead.id,
              leadName: lead.name,
              status: "failed",
              reason: `Database error: ${insertError.message}`,
              emailsFound: aiResult.emails.length,
            });
            continue;
          }

          console.log(
            `[AI Email Finder] Successfully inserted ${emailRecords.length} emails`,
          );
        }

        results.successful++;
        results.processed++;
        results.details.push({
          leadId: lead.id,
          leadName: lead.name,
          domain: domain,
          status: "success",
          emailsFound: aiResult.emails.length,
          organization: aiResult.organization,
          pattern: aiResult.emailPattern,
          searchSummary: aiResult.searchSummary,
        });

        // Add delay between requests to avoid overwhelming the API (2 seconds)
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        results.failed++;
        results.processed++;
        results.details.push({
          leadId: lead.id,
          leadName: lead.name,
          status: "failed",
          reason: error.message,
        });
      }
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
