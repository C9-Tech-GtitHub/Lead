import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all runs
    const { data: runs, error: runsError } = await supabase
      .from("runs")
      .select("id, business_type, location, total_leads, created_at")
      .order("created_at", { ascending: false });

    if (runsError || !runs) {
      return NextResponse.json(
        { error: "Failed to fetch runs" },
        { status: 500 }
      );
    }

    // Group runs by business_type + location
    const grouped = new Map<string, typeof runs>();

    runs.forEach(run => {
      const key = `${run.business_type}|${run.location}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(run);
    });

    // Find groups with duplicates (multiple runs with same business + location)
    const suggestions = [];

    for (const [key, group] of grouped.entries()) {
      if (group.length > 1) {
        const [businessType, location] = key.split('|');
        const totalLeads = group.reduce((sum, r) => sum + (r.total_leads || 0), 0);

        suggestions.push({
          businessType,
          location,
          runs: group.map(r => ({
            id: r.id,
            leadCount: r.total_leads || 0,
            createdAt: r.created_at,
          })),
          totalRuns: group.length,
          totalLeads,
          suggestion: `Merge ${group.length} "${businessType}" runs in ${location} (${totalLeads} total leads)`,
        });
      }
    }

    // Sort by number of duplicates (most duplicates first)
    suggestions.sort((a, b) => b.totalRuns - a.totalRuns);

    return NextResponse.json({
      suggestions,
      duplicateCount: suggestions.reduce((sum, s) => sum + s.totalRuns, 0),
    });
  } catch (error) {
    console.error("[Suggest Merges] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
