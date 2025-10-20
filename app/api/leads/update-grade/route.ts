import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { leadId, grade } = await request.json();

    if (!leadId || !grade) {
      return NextResponse.json(
        { error: "Lead ID and grade are required" },
        { status: 400 },
      );
    }

    // Validate grade
    if (!["A", "B", "C", "D", "F"].includes(grade)) {
      return NextResponse.json(
        { error: "Invalid grade. Must be A, B, C, D, or F" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Update the lead's compatibility grade
    const { data, error } = await supabase
      .from("leads")
      .update({
        compatibility_grade: grade,
        // If setting to F, add a note in the reasoning
        grade_reasoning:
          grade === "F"
            ? "Manually marked as not interested"
            : undefined,
      })
      .eq("id", leadId)
      .select()
      .single();

    if (error) {
      console.error("Error updating lead grade:", error);
      return NextResponse.json(
        { error: "Failed to update lead grade" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, lead: data });
  } catch (error) {
    console.error("Error in update-grade API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
