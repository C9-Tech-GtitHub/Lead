"use server";

import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

interface CreateRunParams {
  businessTypes: string[];
  location: string;
  targetCount: number;
}

export async function createRun({
  businessTypes,
  location,
  targetCount,
}: CreateRunParams) {
  try {
    const supabase = await createClient();

    const sanitizedTargetCount = Math.max(
      5,
      Math.min(2000, Number.isFinite(targetCount) ? targetCount : 5),
    );

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    console.log("[createRun] Creating run for user:", user.id, {
      businessTypes,
      location,
      targetCount: sanitizedTargetCount,
    });

    // Create display string for backward compatibility
    const businessTypeDisplay = businessTypes.join(", ");

    // Create the run in the database
    const { data: run, error: createError } = await supabase
      .from("runs")
      .insert({
        user_id: user.id,
        business_type: businessTypeDisplay, // Display string for UI
        business_types: businessTypes, // Array for search logic
        queries_count: businessTypes.length,
        location: location,
        target_count: sanitizedTargetCount,
        status: "pending",
      })
      .select()
      .single();

    if (createError) {
      console.error("[createRun] Database error:", createError);
      throw new Error(`Database error: ${createError.message}`);
    }

    if (!run) {
      throw new Error("Failed to create run - no data returned");
    }

    console.log("[createRun] Run created successfully:", run.id);

    // Trigger the Inngest workflow using inngest.send()
    try {
      const eventResult = await inngest.send({
        name: "lead/run.created",
        data: {
          runId: run.id,
          userId: user.id,
          businessTypes,
          location,
          targetCount: sanitizedTargetCount,
        },
      });
      console.log("[createRun] Inngest event sent:", eventResult);
    } catch (inngestError) {
      console.error("[createRun] Inngest error:", inngestError);
      // Don't throw - the run is created, Inngest will retry
      // But update the run status to show there's an issue
      await supabase
        .from("runs")
        .update({
          status: "failed",
          error_message: `Failed to trigger workflow: ${inngestError instanceof Error ? inngestError.message : "Unknown error"}`,
        })
        .eq("id", run.id);
      throw new Error("Failed to start research workflow. Please try again.");
    }

    return { runId: run.id };
  } catch (error) {
    console.error("[createRun] Error:", error);
    throw error;
  }
}
