/**
 * Review Leads API Route
 *
 * Scans all leads to identify those with invalid websites
 * (social media URLs, directories, etc.) and optionally updates them
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidBusinessWebsite } from "@/lib/validation/lead-validator";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { autoFix = false, runId } = await request.json();

    console.log(`[Review Leads] Starting lead review (autoFix: ${autoFix})`);

    // Build query
    let query = supabase
      .from("leads")
      .select("id, name, website, compatibility_grade, research_status")
      .order("created_at", { ascending: false });

    // Filter by run if specified
    if (runId && runId !== "all") {
      query = query.eq("run_id", runId);
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      console.error("[Review Leads] Error fetching leads:", leadsError);
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: "No leads found to review" },
        { status: 404 }
      );
    }

    console.log(`[Review Leads] Reviewing ${leads.length} leads`);

    const results = {
      total: leads.length,
      invalid: 0,
      valid: 0,
      fixed: 0,
      details: [] as any[],
    };

    // Review each lead
    for (const lead of leads) {
      const validation = isValidBusinessWebsite(lead.website);

      if (!validation.isValid) {
        results.invalid++;

        const leadResult = {
          leadId: lead.id,
          leadName: lead.name,
          website: lead.website,
          currentGrade: lead.compatibility_grade,
          reason: validation.reason,
          platform: validation.platform,
          status: "invalid",
        };

        // Auto-fix: Update grade to F if requested
        if (autoFix && lead.compatibility_grade !== "F") {
          const { error: updateError } = await supabase
            .from("leads")
            .update({
              compatibility_grade: "F",
              grade_reasoning: `INVALID WEBSITE: ${validation.reason}. ${validation.platform ? `This is a ${validation.platform}.` : ""} Business must have a proper website to qualify for SEO services.`,
            })
            .eq("id", lead.id);

          if (updateError) {
            console.error(
              `[Review Leads] Failed to update lead ${lead.id}:`,
              updateError
            );
            leadResult.status = "error";
          } else {
            results.fixed++;
            leadResult.status = "fixed";
            console.log(
              `[Review Leads] Updated ${lead.name} from grade ${lead.compatibility_grade} to F`
            );
          }
        }

        results.details.push(leadResult);
      } else {
        results.valid++;
      }
    }

    console.log(
      `[Review Leads] Complete: ${results.valid} valid, ${results.invalid} invalid, ${results.fixed} fixed`
    );

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("[Review Leads] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
