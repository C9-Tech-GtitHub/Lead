import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");
  const statusFilter = searchParams.get("status") || "all";
  const gradeFilter = searchParams.get("grade") || "all";
  const runFilter = searchParams.get("run") || "all";
  const emailStatusFilter = searchParams.get("emailStatus") || "all";

  // Calculate range
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build query
  let query = supabase
    .from("leads")
    .select(
      `
      *,
      run:runs!inner(
        id,
        business_type,
        location,
        created_at
      )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  // Apply filters
  if (statusFilter !== "all") {
    query = query.eq("lead_status", statusFilter);
  }

  if (gradeFilter !== "all") {
    query = query.eq("compatibility_grade", gradeFilter);
  }

  if (runFilter !== "all") {
    query = query.eq("run_id", runFilter);
  }

  if (emailStatusFilter !== "all") {
    query = query.eq("email_status", emailStatusFilter);
  }

  // Apply pagination
  query = query.range(from, to);

  const { data: leads, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get email counts for these leads
  const leadIds = leads?.map((l) => l.id) || [];
  const { data: emailData } = await supabase
    .from("lead_emails")
    .select("lead_id")
    .in("lead_id", leadIds);

  const emailCounts: Record<string, number> = {};
  emailData?.forEach((email) => {
    emailCounts[email.lead_id] = (emailCounts[email.lead_id] || 0) + 1;
  });

  // Get email suppression status for domains
  const domainSet = new Set(
    leads?.map((l) => l.email_domain).filter(Boolean) || [],
  );
  const domains = Array.from(domainSet);
  const { data: suppressionData } = await supabase
    .from("email_suppression")
    .select("domain, email, source, reason, asm_group_name")
    .in("domain", domains);

  const suppressionByDomain: Record<string, any> = {};
  suppressionData?.forEach((supp) => {
    if (!suppressionByDomain[supp.domain]) {
      suppressionByDomain[supp.domain] = [];
    }
    suppressionByDomain[supp.domain].push(supp);
  });

  // Get domain contact tracking
  const { data: contactData } = await supabase
    .from("domain_contact_tracking")
    .select("domain, last_contacted_at, can_contact_after")
    .in("domain", domains);

  const contactByDomain: Record<string, any> = {};
  contactData?.forEach((contact) => {
    contactByDomain[contact.domain] = contact;
  });

  // Enrich leads with suppression and contact info
  const enrichedLeads = leads?.map((lead) => ({
    ...lead,
    suppression: lead.email_domain
      ? suppressionByDomain[lead.email_domain]
      : null,
    contactHistory: lead.email_domain
      ? contactByDomain[lead.email_domain]
      : null,
  }));

  return NextResponse.json({
    leads: enrichedLeads || [],
    emailCounts,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  });
}
