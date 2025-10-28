import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { businessType, location } = await request.json();

    if (!businessType && !location) {
      return NextResponse.json(
        { error: "Business type or location required" },
        { status: 400 }
      );
    }

    const runId = params.id;

    // Update the run
    const updateData: any = {};
    if (businessType) updateData.business_type = businessType;
    if (location) updateData.location = location;

    const { data: updatedRun, error } = await supabase
      .from("runs")
      .update(updateData)
      .eq("id", runId)
      .select()
      .single();

    if (error) {
      console.error("[Rename Run] Error:", error);
      return NextResponse.json(
        { error: "Failed to rename run" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      run: updatedRun,
    });
  } catch (error) {
    console.error("[Rename Run] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
