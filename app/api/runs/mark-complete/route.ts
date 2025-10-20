import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    const { runId } = await request.json();

    if (!runId) {
      return NextResponse.json({ error: "Missing runId" }, { status: 400 });
    }

    // Verify the run belongs to the user
    const { data: run } = await supabase
      .from("runs")
      .select("id, user_id, status")
      .eq("id", runId)
      .eq("user_id", user.id)
      .single();

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    // Update run to completed status
    const { error: runUpdateError } = await supabase
      .from("runs")
      .update({
        status: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    if (runUpdateError) {
      console.error("Error marking run as complete:", runUpdateError);
      return NextResponse.json(
        {
          error: "Failed to mark run as complete",
          details: runUpdateError.message || runUpdateError.toString(),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Run marked as complete.",
    });
  } catch (error) {
    console.error("Error in mark-complete API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
