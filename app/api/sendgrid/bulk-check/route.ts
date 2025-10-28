/**
 * Bulk SendGrid Check API Route
 *
 * Checks multiple leads against SendGrid suppression lists and domain contact tracking
 * to ensure we haven't sent them anything before
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Note: Bulk check uses database records synced from SendGrid
    // It doesn't need the API key to function, but warn if sync hasn't been done
    if (!process.env.SENDGRID_API_KEY) {
      console.warn(
        "[Bulk SendGrid Check] SENDGRID_API_KEY not configured - data may be outdated",
      );
    }

    const { leadIds } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "Lead IDs are required" },
        { status: 400 },
      );
    }

    console.log(`[Bulk SendGrid Check] Checking ${leadIds.length} leads`);

    // Fetch leads with their emails
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select(
        `
        id,
        name,
        website,
        email_domain,
        email_status,
        last_email_sent_at,
        lead_emails (
          email,
          type,
          confidence,
          verification_status
        )
      `,
      )
      .in("id", leadIds);

    if (leadsError) {
      console.error("[Bulk SendGrid Check] Error fetching leads:", leadsError);
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: "No leads found" }, { status: 404 });
    }

    const results = {
      total: leads.length,
      safe: 0,
      warnings: 0,
      blocked: 0,
      details: [] as any[],
    };

    // Check each lead
    for (const lead of leads) {
      const leadResult: any = {
        leadId: lead.id,
        leadName: lead.name,
        domain: lead.email_domain,
        emails: [],
        issues: [],
        status: "safe", // safe, warning, blocked
      };

      // Get all emails for this lead
      const emails = (lead as any).lead_emails || [];

      if (emails.length === 0) {
        leadResult.issues.push({
          type: "no_emails",
          severity: "warning",
          message: "No emails found for this lead",
        });
        leadResult.status = "warning";
        results.warnings++;
        results.details.push(leadResult);
        continue;
      }

      // Check each email against suppression list
      const emailAddresses = emails.map((e: any) => e.email);

      const { data: suppressions } = await supabase
        .from("email_suppression")
        .select("email, source, reason, asm_group_name")
        .in("email", emailAddresses);

      // Check domain contact tracking
      let domainCheck = null;
      if (lead.email_domain) {
        const { data: domainData } = await supabase
          .from("domain_contact_tracking")
          .select("last_contacted_at, can_contact_after")
          .eq("domain", lead.email_domain.toLowerCase())
          .single();

        if (domainData) {
          const canContactAfter = new Date(domainData.can_contact_after);
          const now = new Date();

          domainCheck = {
            lastContactedAt: domainData.last_contacted_at,
            canContactAfter: domainData.can_contact_after,
            canContact: now >= canContactAfter,
          };

          if (!domainCheck.canContact) {
            leadResult.issues.push({
              type: "recent_contact",
              severity: "blocked",
              message: `Domain was contacted recently on ${new Date(domainCheck.lastContactedAt).toLocaleDateString()}. Can contact after ${canContactAfter.toLocaleDateString()}`,
            });
            leadResult.status = "blocked";
          }
        }
      }

      // Process suppression results
      if (suppressions && suppressions.length > 0) {
        for (const suppression of suppressions) {
          leadResult.issues.push({
            type: "suppressed",
            severity: "blocked",
            email: suppression.email,
            source: suppression.source,
            reason: suppression.reason,
            asmGroup: suppression.asm_group_name,
            message: `${suppression.email} is suppressed (${suppression.source}): ${suppression.reason}${suppression.asm_group_name ? ` - ${suppression.asm_group_name}` : ""}`,
          });
        }
        leadResult.status = "blocked";
      }

      // Add email details
      leadResult.emails = emails.map((e: any) => ({
        email: e.email,
        type: e.type,
        confidence: e.confidence,
        isSuppressed: suppressions?.some((s) => s.email === e.email) || false,
      }));

      // Check if lead was previously sent email
      if (lead.last_email_sent_at) {
        leadResult.issues.push({
          type: "previously_sent",
          severity: "warning",
          message: `Email was sent to this lead on ${new Date(lead.last_email_sent_at).toLocaleDateString()}`,
        });
        if (leadResult.status === "safe") {
          leadResult.status = "warning";
        }
      }

      // Determine final status
      if (leadResult.status === "safe" && leadResult.issues.length === 0) {
        results.safe++;
      } else if (leadResult.status === "warning") {
        results.warnings++;
      } else if (leadResult.status === "blocked") {
        results.blocked++;
      }

      results.details.push(leadResult);
    }

    console.log(
      `[Bulk SendGrid Check] Complete: ${results.safe} safe, ${results.warnings} warnings, ${results.blocked} blocked`,
    );

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("[Bulk SendGrid Check] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
