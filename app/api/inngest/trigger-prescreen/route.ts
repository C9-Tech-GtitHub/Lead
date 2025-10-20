import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { createClient } from "@/lib/supabase/server";

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

    // Get run details
    const { data: run, error: runError } = await supabase
      .from("runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (runError || !run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    // Trigger the prescreen event
    await inngest.send({
      name: "lead/prescreen.triggered",
      data: {
        runId: run.id,
        businessType: run.business_type,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Prescreening triggered successfully",
    });
  } catch (error) {
    console.error("Error triggering prescreen:", error);
    return NextResponse.json(
      { error: "Failed to trigger prescreen" },
      { status: 500 },
    );
  }
}
