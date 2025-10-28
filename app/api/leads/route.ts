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
  const gradeFilter = searchParams.get("grade") || "all";
  const gradeRangeFilter = searchParams.get("gradeRange") || "all";
  const runFilter = searchParams.get("run") || "all";
  const emailStatusFilter = searchParams.get("emailStatus") || "all";
  const searchQuery = searchParams.get("search") || "";
  const emailTypeFilter = searchParams.get("emailType") || "all";
  const emailEligibilityFilter = searchParams.get("emailEligibility") || "all";
  const aiSearchedNoEmails = searchParams.get("aiSearchedNoEmails") || "all";
  const sortField = searchParams.get("sortField") || "created_at";
  const sortDirection = searchParams.get("sortDirection") || "desc";

  // Calculate range
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    // STEP 1: Build and execute main leads query with filters
    let query = supabase.from("leads").select(
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
    );

    // Apply sorting
    const ascending = sortDirection === "asc";
    switch (sortField) {
      case "name":
        query = query.order("name", { ascending });
        break;
      case "grade":
        query = query.order("compatibility_grade", {
          ascending,
          nullsFirst: false,
        });
        break;
      case "created_at":
        query = query.order("created_at", { ascending });
        break;
      case "last_sent":
        query = query.order("last_email_sent_at", {
          ascending,
          nullsFirst: false,
        });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    // Apply basic filters
    if (statusFilter !== "all") {
      query = query.eq("lead_status", statusFilter);
    }

    if (gradeFilter !== "all") {
      query = query.eq("compatibility_grade", gradeFilter);
    }

    if (gradeRangeFilter !== "all") {
      if (gradeRangeFilter === "A-B") {
        query = query.in("compatibility_grade", ["A", "B"]);
      }
    }

    if (runFilter !== "all") {
      if (runFilter.includes(",")) {
        const runIds = runFilter.split(",").filter(Boolean);
        query = query.in("run_id", runIds);
      } else {
        query = query.eq("run_id", runFilter);
      }
    }

    if (emailStatusFilter !== "all") {
      query = query.eq("email_status", emailStatusFilter);
    }

    if (searchQuery) {
      query = query.or(
        `name.ilike.%${searchQuery}%,website.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,industry.ilike.%${searchQuery}%`,
      );
    }

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

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        leads: [],
        emailCounts: {},
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: 0,
        },
      });
    }

    // STEP 2: Apply post-fetch filters and gather enrichment data in parallel
    let filteredLeads = leads;
    const leadIds = leads.map((l) => l.id);
    const domains = Array.from(
      new Set(leads.map((l) => l.email_domain).filter(Boolean)),
    );

    // Run all enrichment queries in parallel
    const [
      emailTypeResult,
      emailCountResult,
      suppressionResult,
      contactResult,
    ] = await Promise.all([
      // Email type data for filtering
      emailTypeFilter !== "all"
        ? supabase
            .from("lead_emails")
            .select("lead_id, type")
            .in("lead_id", leadIds)
        : Promise.resolve({ data: null }),

      // Email counts
      supabase.from("lead_emails").select("lead_id").in("lead_id", leadIds),

      // Suppression data (batched by domains)
      domains.length > 0
        ? supabase
            .from("email_suppression")
            .select("domain, email, source, reason, asm_group_name")
            .in("domain", domains)
        : Promise.resolve({ data: null }),

      // Contact tracking (batched by domains)
      domains.length > 0
        ? supabase
            .from("domain_contact_tracking")
            .select("domain, last_contacted_at, can_contact_after")
            .in("domain", domains)
        : Promise.resolve({ data: null }),
    ]);

    // STEP 3: Process email type filter
    if (emailTypeFilter !== "all" && emailTypeResult.data) {
      const leadsWithEmailType = new Set(
        emailTypeResult.data
          .filter((e) => e.type === emailTypeFilter)
          .map((e) => e.lead_id),
      );
      filteredLeads = filteredLeads.filter((l) => leadsWithEmailType.has(l.id));
    }

    // STEP 4: Build lookup maps for eligibility filtering
    const leadsWithEmails = new Set(
      emailCountResult.data?.map((e) => e.lead_id) || [],
    );
    const suppressedDomains = new Set(
      suppressionResult.data?.map((s) => s.domain) || [],
    );
    const onHoldDomains = new Set(
      contactResult.data
        ?.filter((c) => new Date(c.can_contact_after) > new Date())
        .map((c) => c.domain) || [],
    );

    // STEP 5: Apply email eligibility filter
    if (emailEligibilityFilter !== "all") {
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

        const isEligible =
          hasEmail && !isSuppressed && !isOnHold && !hasBeenSent;

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

    // STEP 6: Build email counts map
    const emailCounts: Record<string, number> = {};
    emailCountResult.data?.forEach((email) => {
      emailCounts[email.lead_id] = (emailCounts[email.lead_id] || 0) + 1;
    });

    // STEP 7: Build suppression and contact lookup maps
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

    // STEP 8: Enrich leads with suppression and contact info
    const enrichedLeads = filteredLeads.map((lead) => ({
      ...lead,
      suppression: lead.email_domain
        ? suppressionByDomain[lead.email_domain] || null
        : null,
      contactHistory: lead.email_domain
        ? contactByDomain[lead.email_domain] || null
        : null,
    }));

    return NextResponse.json({
      leads: enrichedLeads,
      emailCounts,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
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
