import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { runId } = await request.json();

    if (!runId) {
      return NextResponse.json(
        { error: "Run ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Verify the run exists and belongs to the user
    const { data: run, error: runError } = await supabase
      .from("runs")
      .select("id, user_id")
      .eq("id", runId)
      .single();

    if (runError || !run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== run.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Reset all leads to pending state and clear ALL research and prescreening data
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        // Reset prescreening state
        prescreened: false,
        prescreen_result: null,
        is_franchise: false,
        is_national_brand: false,
        prescreen_reason: null,
        prescreen_confidence: null,
        prescreened_at: null,

        // Reset research state
        research_status: "pending",
        compatibility_grade: null,
        grade_reasoning: null,
        ai_report: null,
        suggested_hooks: null,
        pain_points: null,
        opportunities: null,
        team_size: null,
        error_message: null,
        researched_at: null,
        // Keep the basic scraped data
        // name, address, phone, website, google_maps_url, latitude, longitude
      })
      .eq("run_id", runId);

    if (updateError) {
      console.error("Error clearing research:", updateError);
      return NextResponse.json(
        { error: "Failed to clear research data" },
        { status: 500 },
      );
    }

    // Update run status back to ready for prescreening and reset all grade counts and progress
    const { error: runUpdateError } = await supabase
      .from("runs")
      .update({
        status: "ready",
        progress: 0, // Reset to start
        grade_a_count: 0,
        grade_b_count: 0,
        grade_c_count: 0,
        grade_d_count: 0,
        grade_f_count: 0,
        completed_at: null,
      })
      .eq("id", runId);

    if (runUpdateError) {
      console.error("Error updating run status:", runUpdateError);
    }

    return NextResponse.json({
      success: true,
      message: "Run reset successfully. Ready for prescreening and research.",
    });
  } catch (error) {
    console.error("Error in clear-research API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
