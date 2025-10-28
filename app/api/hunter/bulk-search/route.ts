import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyEmail, getSimpleType } from "@/lib/email-classifier";

export async function POST(request: Request) {
  console.log("[Hunter Bulk] Route hit - starting bulk email search");
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log("[Hunter Bulk] User authenticated:", user?.id);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadIds, onlyMissing = true } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "Lead IDs are required" },
        { status: 400 },
      );
    }

    const hunterApiKey = process.env.HUNTER_API_KEY;
    if (!hunterApiKey) {
      return NextResponse.json(
        { error: "Hunter.io API key not configured" },
        { status: 500 },
      );
    }

    // Fetch leads with their domains (no user filtering - all users can access all leads)
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select(
        "id, name, website, hunter_io_searched_at, tomba_searched_at, ai_email_searched_at",
      )
      .in("id", leadIds);

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
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
      if (onlyMissing) {
        const searchedWith = [];
        if (lead.hunter_io_searched_at) searchedWith.push("Hunter.io");
        if (lead.tomba_searched_at) searchedWith.push("Tomba.io");
        if (lead.ai_email_searched_at) searchedWith.push("AI Search");

        if (searchedWith.length > 0) {
          results.skipped++;
          results.details.push({
            leadId: lead.id,
            leadName: lead.name,
            status: "skipped",
            reason: `Already searched with ${searchedWith.join(", ")}`,
          });
          continue;
        }
      }

      // Clean domain
      domain = domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];

      try {
        // Call Hunter.io API
        const hunterResponse = await fetch(
          `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterApiKey}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!hunterResponse.ok) {
          const errorData = await hunterResponse.json().catch(() => ({}));

          // Handle rate limit
          if (hunterResponse.status === 429) {
            results.failed++;
            results.details.push({
              leadId: lead.id,
              leadName: lead.name,
              status: "failed",
              reason: "Rate limit reached",
            });
            continue;
          }

          throw new Error(
            errorData.errors?.[0]?.details ||
              `Hunter.io API error: ${hunterResponse.status}`,
          );
        }

        const hunterData = await hunterResponse.json();
        const { data: domainData } = hunterData;

        // Update lead with Hunter.io metadata
        await supabase
          .from("leads")
          .update({
            hunter_io_searched_at: new Date().toISOString(),
            hunter_organization: domainData.organization || null,
            hunter_email_pattern: domainData.pattern || null,
            hunter_total_emails: domainData.emails?.length || 0,
          })
          .eq("id", lead.id);

        // Delete existing emails for this lead
        await supabase.from("lead_emails").delete().eq("lead_id", lead.id);

        // Insert new emails if any found
        if (domainData.emails && domainData.emails.length > 0) {
          const emailRecords = domainData.emails.map((email: any) => {
            // Classify email using our enhanced classifier
            const classification = classifyEmail(
              email.value,
              email.first_name,
              email.last_name,
              email.position,
            );

            return {
              lead_id: lead.id,
              user_id: user.id,
              email: email.value,
              type: getSimpleType(classification.category),
              confidence: email.confidence,
              first_name: email.first_name,
              last_name: email.last_name,
              position: email.position,
              department: email.department,
              seniority: email.seniority,
              verification_status: email.verification?.status || "unknown",
              verification_date: email.verification?.date || null,
              sources: email.sources || [],
              provider: "hunter",
              // New classification fields
              email_category: classification.category,
              priority_score: classification.priorityScore,
              classification_reasoning: classification.reasoning,
              is_recommended: classification.isRecommended,
            };
          });

          const { error: insertError } = await supabase
            .from("lead_emails")
            .insert(emailRecords);

          if (insertError) {
            console.error("Error inserting emails:", insertError);
            results.failed++;
            results.details.push({
              leadId: lead.id,
              leadName: lead.name,
              status: "failed",
              reason: "Failed to save emails to database",
              emailsFound: domainData.emails.length,
            });
            continue;
          }
        }

        results.successful++;
        results.processed++;
        results.details.push({
          leadId: lead.id,
          leadName: lead.name,
          domain: domain,
          status: "success",
          emailsFound: domainData.emails?.length || 0,
          organization: domainData.organization,
          pattern: domainData.pattern,
        });

        // Add delay between requests to avoid rate limiting (1 second)
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
    console.error("Bulk email search error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
