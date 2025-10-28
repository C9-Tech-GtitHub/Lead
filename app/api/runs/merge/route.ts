import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      runIds,
      newRunName,
      removeDuplicates = true,
    } = await request.json();

    if (!runIds || !Array.isArray(runIds) || runIds.length < 2) {
      return NextResponse.json(
        { error: "At least 2 runs required to merge" },
        { status: 400 },
      );
    }

    console.log(`[Merge Runs] Merging ${runIds.length} runs:`, runIds);
    console.log(`[Merge Runs] Remove duplicates: ${removeDuplicates}`);

    // Fetch the runs to be merged
    const { data: runsToMerge, error: runsError } = await supabase
      .from("runs")
      .select("*")
      .in("id", runIds);

    if (runsError || !runsToMerge || runsToMerge.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch runs" },
        { status: 500 },
      );
    }

    console.log(`[Merge Runs] Found ${runsToMerge.length} runs to merge`);

    // Calculate combined stats
    const totalLeads = runsToMerge.reduce(
      (sum, run) => sum + (run.total_leads || 0),
      0,
    );
    const gradeACount = runsToMerge.reduce(
      (sum, run) => sum + (run.grade_a_count || 0),
      0,
    );
    const gradeBCount = runsToMerge.reduce(
      (sum, run) => sum + (run.grade_b_count || 0),
      0,
    );
    const gradeCCount = runsToMerge.reduce(
      (sum, run) => sum + (run.grade_c_count || 0),
      0,
    );
    const gradeDCount = runsToMerge.reduce(
      (sum, run) => sum + (run.grade_d_count || 0),
      0,
    );
    const gradeFCount = runsToMerge.reduce(
      (sum, run) => sum + (run.grade_f_count || 0),
      0,
    );

    // Combine business types and locations
    const businessTypes = [
      ...new Set(
        runsToMerge
          .flatMap((run) => run.business_types || [run.business_type])
          .filter(Boolean),
      ),
    ];
    const locations = [
      ...new Set(runsToMerge.map((run) => run.location).filter(Boolean)),
    ];

    // Use first business type and location for clean display name
    const displayBusinessType = businessTypes[0] || "Merged Run";
    const displayLocation =
      locations.length > 1
        ? `${locations[0]} +${locations.length - 1} more`
        : locations[0] || "Multiple Locations";

    // Create new merged run
    const { data: newRun, error: createError } = await supabase
      .from("runs")
      .insert({
        user_id: user.id,
        business_type: displayBusinessType,
        business_types: businessTypes,
        location: displayLocation,
        target_count: totalLeads,
        status: "completed",
        progress: 100,
        total_leads: 0, // Will be updated after reassigning leads
        grade_a_count: 0,
        grade_b_count: 0,
        grade_c_count: 0,
        grade_d_count: 0,
        grade_f_count: 0,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        queries_count: businessTypes.length,
      })
      .select()
      .single();

    if (createError || !newRun) {
      console.error("[Merge Runs] Failed to create merged run:", createError);
      return NextResponse.json(
        { error: "Failed to create merged run" },
        { status: 500 },
      );
    }

    console.log(`[Merge Runs] Created new run: ${newRun.id}`);

    // Fetch all leads from runs to merge
    const { data: allLeads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .in("run_id", runIds);

    if (leadsError || !allLeads) {
      console.error("[Merge Runs] Failed to fetch leads:", leadsError);
      return NextResponse.json(
        { error: "Failed to fetch leads" },
        { status: 500 },
      );
    }

    console.log(
      `[Merge Runs] Found ${allLeads.length} total leads across runs`,
    );

    let leadsToKeep = allLeads;
    let duplicatesRemoved = 0;

    // Remove duplicates if requested
    if (removeDuplicates && allLeads.length > 0) {
      const seen = new Map<string, any>();

      allLeads.forEach((lead) => {
        // Create a key based on website domain (preferred) or normalized name
        let key: string;
        if (lead.website) {
          // Extract domain from website
          try {
            const urlStr = lead.website.startsWith("http")
              ? lead.website
              : `https://${lead.website}`;
            const url = new URL(urlStr);
            key = url.hostname.replace(/^www\./, "").toLowerCase();
          } catch {
            key = lead.website.toLowerCase();
          }
        } else {
          // Use normalized name if no website
          key = lead.name.toLowerCase().trim();
        }

        // Keep the lead with the best grade, or newest if same grade
        if (!seen.has(key)) {
          seen.set(key, lead);
        } else {
          const existing = seen.get(key);

          // Grade priority: A > B > C > D > F > null
          const gradeOrder: Record<string, number> = {
            A: 5,
            B: 4,
            C: 3,
            D: 2,
            F: 1,
          };
          const existingGrade = gradeOrder[existing.compatibility_grade] || 0;
          const newGrade = gradeOrder[lead.compatibility_grade] || 0;

          if (newGrade > existingGrade) {
            seen.set(key, lead);
          } else if (newGrade === existingGrade) {
            // Same grade, keep the newer one
            if (new Date(lead.created_at) > new Date(existing.created_at)) {
              seen.set(key, lead);
            }
          }
        }
      });

      leadsToKeep = Array.from(seen.values());
      duplicatesRemoved = allLeads.length - leadsToKeep.length;

      console.log(
        `[Merge Runs] Removed ${duplicatesRemoved} duplicates (${allLeads.length} -> ${leadsToKeep.length})`,
      );
    }

    // Update all kept leads to point to new run
    const leadIds = leadsToKeep.map((l) => l.id);

    if (leadIds.length > 0) {
      const { error: updateError } = await supabase
        .from("leads")
        .update({ run_id: newRun.id })
        .in("id", leadIds);

      if (updateError) {
        console.error("[Merge Runs] Failed to update leads:", updateError);
        // Rollback: delete the new run
        await supabase.from("runs").delete().eq("id", newRun.id);
        return NextResponse.json(
          { error: "Failed to reassign leads to merged run" },
          { status: 500 },
        );
      }

      console.log(`[Merge Runs] Reassigned ${leadIds.length} leads to new run`);
    }

    // Calculate actual grade counts from kept leads
    const actualGradeA = leadsToKeep.filter(
      (l) => l.compatibility_grade === "A",
    ).length;
    const actualGradeB = leadsToKeep.filter(
      (l) => l.compatibility_grade === "B",
    ).length;
    const actualGradeC = leadsToKeep.filter(
      (l) => l.compatibility_grade === "C",
    ).length;
    const actualGradeD = leadsToKeep.filter(
      (l) => l.compatibility_grade === "D",
    ).length;
    const actualGradeF = leadsToKeep.filter(
      (l) => l.compatibility_grade === "F",
    ).length;

    // Update merged run stats
    const { error: statsError } = await supabase
      .from("runs")
      .update({
        total_leads: leadsToKeep.length,
        grade_a_count: actualGradeA,
        grade_b_count: actualGradeB,
        grade_c_count: actualGradeC,
        grade_d_count: actualGradeD,
        grade_f_count: actualGradeF,
      })
      .eq("id", newRun.id);

    if (statsError) {
      console.error("[Merge Runs] Failed to update stats:", statsError);
    }

    // Delete duplicate leads if any were removed
    if (duplicatesRemoved > 0) {
      const duplicateIds = allLeads
        .filter((lead) => !leadIds.includes(lead.id))
        .map((lead) => lead.id);

      if (duplicateIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("leads")
          .delete()
          .in("id", duplicateIds);

        if (deleteError) {
          console.error(
            "[Merge Runs] Failed to delete duplicates:",
            deleteError,
          );
        } else {
          console.log(
            `[Merge Runs] Deleted ${duplicateIds.length} duplicate leads`,
          );
        }
      }
    }

    // Delete old runs completely from database
    const { error: deleteRunsError } = await supabase
      .from("runs")
      .delete()
      .in("id", runIds);

    if (deleteRunsError) {
      console.error("[Merge Runs] Failed to delete old runs:", deleteRunsError);
    } else {
      console.log(`[Merge Runs] Deleted ${runIds.length} old runs`);
    }

    return NextResponse.json({
      success: true,
      mergedRun: {
        id: newRun.id,
        name: `${displayBusinessType} - ${displayLocation}`,
        totalLeads: leadsToKeep.length,
        duplicatesRemoved,
        originalLeadCount: allLeads.length,
        sourceRuns: runsToMerge.map((r) => ({
          id: r.id,
          name: `${r.business_type} - ${r.location}`,
          leadCount: r.total_leads,
        })),
      },
    });
  } catch (error) {
    console.error("[Merge Runs] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
