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
  const pageSize = Math.min(
    parseInt(searchParams.get("pageSize") || "50"),
    500,
  ); // Cap at 500
  const statusFilter = searchParams.get("status") || "all";
  const gradeFilterParam = searchParams.get("grade") || "";
  const gradeFilter = gradeFilterParam
    ? gradeFilterParam.split(",").filter(Boolean)
    : [];
  const gradeRangeFilter = searchParams.get("gradeRange") || "all";
  const runFilter = searchParams.get("run") || "all";
  const emailStatusFilterParam = searchParams.get("emailStatus") || "";
  const emailStatusFilter = emailStatusFilterParam
    ? emailStatusFilterParam.split(",").filter(Boolean)
    : [];
  const searchQuery = searchParams.get("search") || "";
  const emailTypeFilter = searchParams.get("emailType") || "all";
  const emailEligibilityFilter = searchParams.get("emailEligibility") || "all";
  const aiSearchedNoEmails = searchParams.get("aiSearchedNoEmails") || "all";
  const sortField = searchParams.get("sortField") || "created_at";
  const sortDirection = searchParams.get("sortDirection") || "desc";

  try {
    // STEP 1: Get filtered lead IDs (with email type and eligibility filtering)
    let baseQuery = supabase
      .from("leads")
      .select("id, email_domain, last_email_sent_at", { count: "exact" });

    // Apply basic filters
    if (statusFilter !== "all") {
      baseQuery = baseQuery.eq("lead_status", statusFilter);
    }

    if (gradeFilter.length > 0) {
      baseQuery = baseQuery.in("compatibility_grade", gradeFilter);
    }

    if (gradeRangeFilter !== "all") {
      if (gradeRangeFilter === "A-B") {
        baseQuery = baseQuery.in("compatibility_grade", ["A", "B"]);
      }
    }

    if (runFilter !== "all") {
      if (runFilter.includes(",")) {
        const runIds = runFilter.split(",").filter(Boolean);
        baseQuery = baseQuery.in("run_id", runIds);
      } else {
        baseQuery = baseQuery.eq("run_id", runFilter);
      }
    }

    if (emailStatusFilter.length > 0) {
      baseQuery = baseQuery.in("email_status", emailStatusFilter);
    }

    if (searchQuery) {
      baseQuery = baseQuery.or(
        `name.ilike.%${searchQuery}%,website.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,industry.ilike.%${searchQuery}%`,
      );
    }

    if (aiSearchedNoEmails === "true") {
      baseQuery = baseQuery
        .not("ai_email_searched_at", "is", null)
        .not("ai_email_search_summary", "is", null);
    } else if (aiSearchedNoEmails === "false") {
      baseQuery = baseQuery.or(
        "ai_email_searched_at.is.null,ai_email_search_summary.is.null",
      );
    }

    const { data: baseLeads, error: baseError } = await baseQuery;

    if (baseError) {
      return NextResponse.json({ error: baseError.message }, { status: 500 });
    }

    if (!baseLeads || baseLeads.length === 0) {
      return NextResponse.json({
        leads: [],
        emailCounts: {},
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // STEP 2: Apply email type and eligibility filters
    let filteredLeadIds = baseLeads.map((l) => l.id);

    // Email type filtering
    if (emailTypeFilter !== "all") {
      const { data: emailTypeData } = await supabase
        .from("lead_emails")
        .select("lead_id")
        .in("lead_id", filteredLeadIds)
        .eq("type", emailTypeFilter);

      const leadsWithEmailType = new Set(
        emailTypeData?.map((e) => e.lead_id) || [],
      );
      filteredLeadIds = filteredLeadIds.filter((id) =>
        leadsWithEmailType.has(id),
      );
    }

    // Eligibility filtering
    if (emailEligibilityFilter !== "all") {
      // Get all email data for eligibility check
      const [emailsResult, suppressionResult, contactResult] =
        await Promise.all([
          supabase
            .from("lead_emails")
            .select("lead_id")
            .in("lead_id", filteredLeadIds),

          supabase.from("email_suppression").select("domain"),

          supabase
            .from("domain_contact_tracking")
            .select("domain, can_contact_after"),
        ]);

      const leadsWithEmails = new Set(
        emailsResult.data?.map((e) => e.lead_id) || [],
      );
      const suppressedDomains = new Set(
        suppressionResult.data?.map((s) => s.domain) || [],
      );
      const onHoldDomains = new Set(
        contactResult.data
          ?.filter((c) => new Date(c.can_contact_after) > new Date())
          .map((c) => c.domain) || [],
      );

      // Build map of lead eligibility
      const leadEligibilityMap = new Map<string, boolean>();
      baseLeads.forEach((lead) => {
        const hasEmail = leadsWithEmails.has(lead.id);
        const isSuppressed = lead.email_domain
          ? suppressedDomains.has(lead.email_domain)
          : false;
        const isOnHold = lead.email_domain
          ? onHoldDomains.has(lead.email_domain)
          : false;
        const hasBeenSent = lead.last_email_sent_at !== null;

        const isEligible =
          hasEmail && !isSuppressed && !isOnHold && !hasBeenSent;
        leadEligibilityMap.set(lead.id, isEligible);
      });

      if (emailEligibilityFilter === "eligible") {
        filteredLeadIds = filteredLeadIds.filter(
          (id) => leadEligibilityMap.get(id) === true,
        );
      } else if (emailEligibilityFilter === "not_eligible") {
        filteredLeadIds = filteredLeadIds.filter(
          (id) => leadEligibilityMap.get(id) === false,
        );
      }
    }

    const totalFilteredCount = filteredLeadIds.length;

    if (totalFilteredCount === 0) {
      return NextResponse.json({
        leads: [],
        emailCounts: {},
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // STEP 3: Paginate the filtered IDs
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const paginatedIds = filteredLeadIds.slice(from, to);

    // STEP 4: Fetch full lead data for paginated IDs only
    let dataQuery = supabase
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
      )
      .in("id", paginatedIds);

    // Apply sorting
    const ascending = sortDirection === "asc";
    switch (sortField) {
      case "name":
        dataQuery = dataQuery.order("name", { ascending });
        break;
      case "grade":
        dataQuery = dataQuery.order("compatibility_grade", {
          ascending,
          nullsFirst: false,
        });
        break;
      case "created_at":
        dataQuery = dataQuery.order("created_at", { ascending });
        break;
      case "last_sent":
        dataQuery = dataQuery.order("last_email_sent_at", {
          ascending,
          nullsFirst: false,
        });
        break;
      default:
        dataQuery = dataQuery.order("created_at", { ascending: false });
    }

    const { data: leads, error: dataError } = await dataQuery;

    if (dataError) {
      return NextResponse.json({ error: dataError.message }, { status: 500 });
    }

    // STEP 5: Enrich leads with email counts, suppression, and contact data
    const domains = Array.from(
      new Set(leads?.map((l) => l.email_domain).filter(Boolean) || []),
    );

    const [emailCountResult, suppressionResult, contactResult] =
      await Promise.all([
        supabase
          .from("lead_emails")
          .select("lead_id")
          .in("lead_id", paginatedIds),

        domains.length > 0
          ? supabase
              .from("email_suppression")
              .select("domain, email, source, reason, asm_group_name")
              .in("domain", domains)
          : Promise.resolve({ data: null }),

        domains.length > 0
          ? supabase
              .from("domain_contact_tracking")
              .select("domain, last_contacted_at, can_contact_after")
              .in("domain", domains)
          : Promise.resolve({ data: null }),
      ]);

    // Build email counts map
    const emailCounts: Record<string, number> = {};
    emailCountResult.data?.forEach((email) => {
      emailCounts[email.lead_id] = (emailCounts[email.lead_id] || 0) + 1;
    });

    // Build suppression and contact lookup maps
    const suppressionByDomain: Record<string, any[]> = {};
    suppressionResult.data?.forEach((supp) => {
      if (!suppressionByDomain[supp.domain]) {
        suppressionByDomain[supp.domain] = [];
      }
      suppressionByDomain[supp.domain].push(supp);
    });

    const contactByDomain: Record<string, any> = {};
    contactResult.data?.forEach((contact) => {
      contactByDomain[contact.domain] = contact;
    });

    // Enrich leads with suppression and contact info
    const enrichedLeads = leads?.map((lead) => ({
      ...lead,
      suppression: lead.email_domain
        ? suppressionByDomain[lead.email_domain] || null
        : null,
      contactHistory: lead.email_domain
        ? contactByDomain[lead.email_domain] || null
        : null,
    }));

    return NextResponse.json({
      leads: enrichedLeads || [],
      emailCounts,
      pagination: {
        page,
        pageSize,
        total: totalFilteredCount,
        totalPages: Math.ceil(totalFilteredCount / pageSize),
      },
    });
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch leads",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
