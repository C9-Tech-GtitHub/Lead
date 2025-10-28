import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight endpoint to fetch only lead IDs matching filters
 * Used for bulk selection without loading full lead data
 */
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
  const statusFilter = searchParams.get("status") || "all";
  const gradeFilter = searchParams.get("grade") || "all";
  const gradeRangeFilter = searchParams.get("gradeRange") || "all";
  const runFilter = searchParams.get("run") || "all";
  const emailStatusFilter = searchParams.get("emailStatus") || "all";
  const searchQuery = searchParams.get("search") || "";
  const aiSearchedNoEmails = searchParams.get("aiSearchedNoEmails") || "all";
  const limit = parseInt(searchParams.get("limit") || "1000");

  // Build query - only select ID to minimize data transfer
  let query = supabase.from("leads").select("id", { count: "exact" });

  // Apply filters
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

  // Apply limit to prevent excessive data
  query = query.limit(limit);

  const { data: leads, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Extract just the IDs
  const ids = leads?.map((l) => l.id) || [];

  return NextResponse.json({
    ids,
    count: ids.length,
    total: count,
    limited: count && count > limit,
  });
}
