import { createAdminClient } from "@/lib/supabase/admin";

export type ProgressEventType =
  | "run_started"
  | "run_paused"
  | "run_resumed"
  | "run_restarted"
  | "scraping_started"
  | "scraping_query"
  | "scraping_suburbs"
  | "scraping_query_completed"
  | "scraping_target_reached"
  | "scraping_completed"
  | "lead_created"
  | "prescreening_started"
  | "prescreening_completed"
  | "lead_research_started"
  | "lead_research_completed"
  | "lead_research_failed"
  | "lead_deep_research_completed"
  | "deep_research_batch_started"
  | "lead_failed"
  | "run_completed"
  | "run_failed"
  | "status_update";

interface LogProgressParams {
  runId: string;
  userId: string;
  eventType: ProgressEventType;
  message: string;
  details?: Record<string, any>;
}

export async function logProgress(params: LogProgressParams): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.from("progress_logs").insert({
      run_id: params.runId,
      user_id: params.userId,
      event_type: params.eventType,
      message: params.message,
      details: params.details || null,
    });
  } catch (error) {
    // Log but don't fail the workflow if logging fails
    console.error("[Progress Logger] Error:", error);
  }
}
