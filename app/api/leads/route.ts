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
  const gradeRangeFilter = searchParams.get("gradeRange") || "all"; // For Grade A-B filtering
  const runFilter = searchParams.get("run") || "all";
  const emailStatusFilter = searchParams.get("emailStatus") || "all";
  const searchQuery = searchParams.get("search") || "";
  const emailTypeFilter = searchParams.get("emailType") || "all"; // personal, generic, all
  const emailEligibilityFilter = searchParams.get("emailEligibility") || "all"; // eligible, not_eligible, all
  const aiSearchedNoEmails = searchParams.get("aiSearchedNoEmails") || "all"; // true, false, all

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

  // Handle grade range filter (e.g., A-B)
  if (gradeRangeFilter !== "all") {
    if (gradeRangeFilter === "A-B") {
      query = query.in("compatibility_grade", ["A", "B"]);
    }
  }

  if (runFilter !== "all") {
    query = query.eq("run_id", runFilter);
  }

  if (emailStatusFilter !== "all") {
    query = query.eq("email_status", emailStatusFilter);
  }

  // Apply search query (search company name, website, city, industry)
  if (searchQuery) {
    query = query.or(
      `name.ilike.%${searchQuery}%,website.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,industry.ilike.%${searchQuery}%`,
    );
  }

  // Filter for AI searched but no emails found
  if (aiSearchedNoEmails === "true") {
    query = query
      .not("ai_email_searched_at", "is", null)
      .not("ai_email_search_summary", "is", null);
  } else if (aiSearchedNoEmails === "false") {
    query = query.or(
      "ai_email_searched_at.is.null,ai_email_search_summary.is.null",
    );
  }

  // Apply pagination
  query = query.range(from, to);

  const { data: leads, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Apply post-fetch filters that require email data
  let filteredLeads = leads || [];

  // Filter by email type (personal vs generic)
  if (emailTypeFilter !== "all" && filteredLeads.length > 0) {
    const leadIds = filteredLeads.map((l) => l.id);
    const { data: emailTypeData } = await supabase
      .from("lead_emails")
      .select("lead_id, type")
      .in("lead_id", leadIds);

    const leadsWithEmailType = new Set(
      emailTypeData
        ?.filter((e) => e.type === emailTypeFilter)
        .map((e) => e.lead_id) || [],
    );

    filteredLeads = filteredLeads.filter((l) => leadsWithEmailType.has(l.id));
  }

  // Filter by email eligibility
  if (emailEligibilityFilter !== "all" && filteredLeads.length > 0) {
    const leadIds = filteredLeads.map((l) => l.id);

    // Get email counts
    const { data: emailData } = await supabase
      .from("lead_emails")
      .select("lead_id")
      .in("lead_id", leadIds);

    const leadsWithEmails = new Set(emailData?.map((e) => e.lead_id) || []);

    // Get suppression status
    const domainSet = new Set(
      filteredLeads.map((l) => l.email_domain).filter(Boolean) || [],
    );
    const domains = Array.from(domainSet);
    const { data: suppressionData } = await supabase
      .from("email_suppression")
      .select("domain")
      .in("domain", domains);

    const suppressedDomains = new Set(
      suppressionData?.map((s) => s.domain) || [],
    );

    // Get contact tracking
    const { data: contactData } = await supabase
      .from("domain_contact_tracking")
      .select("domain, can_contact_after")
      .in("domain", domains);

    const onHoldDomains = new Set(
      contactData
        ?.filter((c) => new Date(c.can_contact_after) > new Date())
        .map((c) => c.domain) || [],
    );

    // Determine eligibility for each lead
    const eligibleLeads = new Set<string>();
    filteredLeads.forEach((lead) => {
      const hasEmail = leadsWithEmails.has(lead.id);
      const isSuppressed = lead.email_domain
        ? suppressedDomains.has(lead.email_domain)
        : false;
      const isOnHold = lead.email_domain
        ? onHoldDomains.has(lead.email_domain)
        : false;
      const hasBeenSent = lead.last_email_sent_at !== null;

      const isEligible = hasEmail && !isSuppressed && !isOnHold && !hasBeenSent;

      if (isEligible) {
        eligibleLeads.add(lead.id);
      }
    });

    if (emailEligibilityFilter === "eligible") {
      filteredLeads = filteredLeads.filter((l) => eligibleLeads.has(l.id));
    } else if (emailEligibilityFilter === "not_eligible") {
      filteredLeads = filteredLeads.filter((l) => !eligibleLeads.has(l.id));
    }
  }

  // Get email counts for these leads
  const leadIds = filteredLeads?.map((l) => l.id) || [];
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
    filteredLeads?.map((l) => l.email_domain).filter(Boolean) || [],
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
  const enrichedLeads = filteredLeads?.map((lead) => ({
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
      total: filteredLeads.length,
      totalPages: Math.ceil(filteredLeads.length / pageSize),
    },
  });
}
