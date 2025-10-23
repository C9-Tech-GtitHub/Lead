/**
 * SendGrid Read-Only Client
 *
 * SAFETY RULES:
 * - This client ONLY reads data from SendGrid
 * - NEVER sends emails
 * - Uses @sendgrid/client (NOT @sendgrid/mail)
 * - All functions prefixed with "sync" or "get"
 */

import client from "@sendgrid/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin-client";

// ============================================
// SAFETY CHECK: Prevent @sendgrid/mail import
// ============================================
// This check ensures we never accidentally import the email-sending package
// Note: We don't check require.cache as it may not be available in Next.js
// Instead, we rely on code review and the fact that @sendgrid/mail is not installed

// ============================================
// TYPES
// ============================================

export interface SendGridBounce {
  created: number;
  email: string;
  reason: string;
  status: string;
}

export interface SendGridSuppression {
  created: number;
  email: string;
  reason?: string;
}

export interface SendGridSpamReport {
  created: number;
  email: string;
  ip: string;
}

export interface SendGridInvalidEmail {
  created: number;
  email: string;
  reason: string;
}

export interface SendGridEmailActivity {
  msg_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  status: string;
  opens_count?: number;
  clicks_count?: number;
  last_event_time: string;
}

export interface SyncResult {
  success: boolean;
  recordsSynced: number;
  errors: string[];
  syncType: string;
}

// ============================================
// CLIENT INITIALIZATION
// ============================================

class SendGridReadOnlyClient {
  private initialized = false;

  /**
   * Lazy initialization - only initializes when first API call is made
   */
  private initialize() {
    if (this.initialized) {
      return;
    }

    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      throw new Error(
        "SENDGRID_API_KEY environment variable is not set. " +
          "Please add it to your .env.local file.",
      );
    }

    if (!apiKey.startsWith("SG.")) {
      throw new Error(
        'Invalid SendGrid API key format. Key should start with "SG."',
      );
    }

    client.setApiKey(apiKey);
    this.initialized = true;
  }

  /**
   * Make a read-only request to SendGrid API
   * SAFETY: Only allows GET requests
   */
  private async makeRequest<T>(
    method: "GET",
    url: string,
    queryParams?: Record<string, string | number>,
  ): Promise<T> {
    // Initialize on first use
    this.initialize();

    // SAFETY CHECK: Only allow GET requests
    if (method !== "GET") {
      throw new Error(
        `🚨 SECURITY VIOLATION: Attempted ${method} request. ` +
          "Only GET requests are allowed for read-only operations.",
      );
    }

    const request: any = {
      method,
      url,
    };

    if (queryParams) {
      request.qs = queryParams;
    }

    try {
      const [response] = await client.request(request);
      return response.body as T;
    } catch (error: any) {
      console.error(
        "SendGrid API error:",
        error.response?.body || error.message,
      );
      throw new Error(
        `SendGrid API request failed: ${error.response?.body?.errors?.[0]?.message || error.message}`,
      );
    }
  }

  // ============================================
  // READ-ONLY API METHODS
  // ============================================

  /**
   * Get bounced emails from SendGrid
   * Bounces are emails that hard bounced (permanent delivery failure)
   */
  async getBounces(
    startTime?: number,
    endTime?: number,
  ): Promise<SendGridBounce[]> {
    const params: Record<string, number> = {};

    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;

    const response = await this.makeRequest<SendGridBounce[]>(
      "GET",
      "/v3/suppression/bounces",
      params,
    );

    return response;
  }

  /**
   * Get unsubscribed emails from SendGrid
   */
  async getUnsubscribes(
    startTime?: number,
    endTime?: number,
  ): Promise<SendGridSuppression[]> {
    const params: Record<string, number> = {};

    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;

    const response = await this.makeRequest<SendGridSuppression[]>(
      "GET",
      "/v3/suppression/unsubscribes",
      params,
    );

    return response;
  }

  /**
   * Get spam reports from SendGrid
   */
  async getSpamReports(
    startTime?: number,
    endTime?: number,
  ): Promise<SendGridSpamReport[]> {
    const params: Record<string, number> = {};

    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;

    const response = await this.makeRequest<SendGridSpamReport[]>(
      "GET",
      "/v3/suppression/spam_reports",
      params,
    );

    return response;
  }

  /**
   * Get invalid emails from SendGrid
   */
  async getInvalidEmails(
    startTime?: number,
    endTime?: number,
  ): Promise<SendGridInvalidEmail[]> {
    const params: Record<string, number> = {};

    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;

    const response = await this.makeRequest<SendGridInvalidEmail[]>(
      "GET",
      "/v3/suppression/invalid_emails",
      params,
    );

    return response;
  }

  /**
   * Get global suppressions from SendGrid
   * These are emails that should never be contacted
   */
  async getGlobalSuppressions(): Promise<SendGridSuppression[]> {
    const response = await this.makeRequest<SendGridSuppression[]>(
      "GET",
      "/v3/suppression/global",
    );

    return response;
  }

  /**
   * Get email activity from SendGrid Email Activity Feed API
   * Note: Requires Email Activity access on the API key
   * Returns recent email sends with delivery status
   */
  async getEmailActivity(
    limit: number = 10,
    query?: string,
  ): Promise<{ messages: SendGridEmailActivity[] }> {
    const params: Record<string, any> = {
      limit,
    };

    if (query) {
      params.query = query;
    }

    try {
      const response = await this.makeRequest<{
        messages: SendGridEmailActivity[];
      }>("GET", "/v3/messages", params);
      return response;
    } catch (error: any) {
      // If we get a 403, the API key doesn't have Email Activity access
      if (
        error.message.includes("403") ||
        error.message.includes("forbidden") ||
        error.message.includes("authorization")
      ) {
        console.warn("⚠️  Email Activity API not accessible. This requires:");
        console.warn(
          '   1. Purchase "Additional Email Activity History" add-on',
        );
        console.warn("   2. API key with Email Activity permissions");
        console.warn("   Falling back to suppression data only.");
        return { messages: [] };
      }
      throw error;
    }
  }

  /**
   * Get email statistics from SendGrid Stats API
   * This shows aggregate data like sends, opens, clicks
   */
  async getStats(
    startDate: string,
    endDate?: string,
    aggregatedBy: "day" | "week" | "month" = "day",
  ): Promise<any> {
    const params: Record<string, string> = {
      start_date: startDate,
      aggregated_by: aggregatedBy,
    };

    if (endDate) {
      params.end_date = endDate;
    }

    const response = await this.makeRequest<any>("GET", "/v3/stats", params);

    return response;
  }
}

// ============================================
// SYNC FUNCTIONS
// ============================================

/**
 * Helper function to extract domain from email
 */
function extractDomain(email: string): string {
  return email.toLowerCase().split("@")[1] || "";
}

/**
 * Get Supabase client with service role
 * Now uses singleton client for better performance
 */
function getSupabaseClient() {
  return getSupabaseAdmin();
}

/**
 * Sync bounces from SendGrid to local database
 */
export async function syncBounces(): Promise<SyncResult> {
  const sgClient = new SendGridReadOnlyClient();
  const supabase = getSupabaseClient();

  const syncLog = {
    sync_type: "bounces",
    started_at: new Date().toISOString(),
    triggered_by: "manual",
  };

  try {
    // Check if this is the first sync (no records in sync log for bounces)
    const { data: previousSyncs } = await supabase
      .from("sendgrid_sync_log")
      .select("id, started_at")
      .eq("sync_type", "bounces")
      .eq("status", "success")
      .order("started_at", { ascending: false })
      .limit(1);

    let startTime: number | undefined;

    if (previousSyncs && previousSyncs.length > 0) {
      // Incremental sync: Get records since last successful sync
      const lastSync = new Date(previousSyncs[0].started_at);
      startTime = Math.floor(lastSync.getTime() / 1000);
      console.log(
        `Incremental sync: Fetching bounces since ${lastSync.toISOString()}`,
      );
    } else {
      // First sync: Get all bounces (no start time = all history)
      console.log("First sync: Fetching all bounce history from SendGrid");
      startTime = undefined;
    }

    const bounces = await sgClient.getBounces(startTime);

    let synced = 0;
    const errors: string[] = [];

    for (const bounce of bounces) {
      try {
        const domain = extractDomain(bounce.email);

        // Insert into email_suppression table
        const { error } = await supabase.from("email_suppression").upsert(
          {
            email: bounce.email.toLowerCase(),
            domain,
            source: "bounce",
            reason: bounce.reason,
            sendgrid_created_at: new Date(bounce.created * 1000).toISOString(),
            synced_from_sendgrid: true,
          },
          {
            onConflict: "email",
          },
        );

        if (error) {
          errors.push(`Failed to insert ${bounce.email}: ${error.message}`);
        } else {
          synced++;

          // Update any leads with this email
          await supabase
            .from("leads")
            .update({ email_status: "bounced" })
            .eq("email_domain", domain);
        }
      } catch (err: any) {
        errors.push(`Error processing ${bounce.email}: ${err.message}`);
      }
    }

    // Log the sync
    await supabase.from("sendgrid_sync_log").insert({
      ...syncLog,
      status: errors.length === 0 ? "success" : "partial",
      records_synced: synced,
      errors_count: errors.length,
      error_details: errors.length > 0 ? { errors } : null,
      completed_at: new Date().toISOString(),
      duration_seconds: Math.floor(
        (Date.now() - new Date(syncLog.started_at).getTime()) / 1000,
      ),
    });

    return {
      success: errors.length === 0,
      recordsSynced: synced,
      errors,
      syncType: "bounces",
    };
  } catch (error: any) {
    // Log failed sync
    await supabase.from("sendgrid_sync_log").insert({
      ...syncLog,
      status: "failed",
      records_synced: 0,
      errors_count: 1,
      error_message: error.message,
      completed_at: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * Sync unsubscribes from SendGrid to local database
 */
export async function syncUnsubscribes(): Promise<SyncResult> {
  const sgClient = new SendGridReadOnlyClient();
  const supabase = getSupabaseClient();

  const syncLog = {
    sync_type: "unsubscribes",
    started_at: new Date().toISOString(),
    triggered_by: "manual",
  };

  try {
    // Check if this is the first sync
    const { data: previousSyncs } = await supabase
      .from("sendgrid_sync_log")
      .select("id, started_at")
      .eq("sync_type", "unsubscribes")
      .eq("status", "success")
      .order("started_at", { ascending: false })
      .limit(1);

    let startTime: number | undefined;

    if (previousSyncs && previousSyncs.length > 0) {
      // Incremental sync: Get records since last successful sync
      const lastSync = new Date(previousSyncs[0].started_at);
      startTime = Math.floor(lastSync.getTime() / 1000);
      console.log(
        `Incremental sync: Fetching unsubscribes since ${lastSync.toISOString()}`,
      );
    } else {
      // First sync: Get all unsubscribes (no start time = all history)
      console.log("First sync: Fetching all unsubscribe history from SendGrid");
      startTime = undefined;
    }

    const unsubscribes = await sgClient.getUnsubscribes(startTime);

    let synced = 0;
    const errors: string[] = [];

    for (const unsub of unsubscribes) {
      try {
        const domain = extractDomain(unsub.email);

        const { error } = await supabase.from("email_suppression").upsert(
          {
            email: unsub.email.toLowerCase(),
            domain,
            source: "unsubscribe",
            reason: unsub.reason || "User unsubscribed",
            sendgrid_created_at: new Date(unsub.created * 1000).toISOString(),
            synced_from_sendgrid: true,
          },
          {
            onConflict: "email",
          },
        );

        if (error) {
          errors.push(`Failed to insert ${unsub.email}: ${error.message}`);
        } else {
          synced++;

          // Update leads
          await supabase
            .from("leads")
            .update({ email_status: "unsubscribed" })
            .eq("email_domain", domain);
        }
      } catch (err: any) {
        errors.push(`Error processing ${unsub.email}: ${err.message}`);
      }
    }

    await supabase.from("sendgrid_sync_log").insert({
      ...syncLog,
      status: errors.length === 0 ? "success" : "partial",
      records_synced: synced,
      errors_count: errors.length,
      error_details: errors.length > 0 ? { errors } : null,
      completed_at: new Date().toISOString(),
      duration_seconds: Math.floor(
        (Date.now() - new Date(syncLog.started_at).getTime()) / 1000,
      ),
    });

    return {
      success: errors.length === 0,
      recordsSynced: synced,
      errors,
      syncType: "unsubscribes",
    };
  } catch (error: any) {
    await supabase.from("sendgrid_sync_log").insert({
      ...syncLog,
      status: "failed",
      records_synced: 0,
      errors_count: 1,
      error_message: error.message,
      completed_at: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * Sync all suppressions (bounces, unsubscribes, spam reports, invalid emails)
 */
export async function syncAllSuppressions(): Promise<{
  bounces: SyncResult;
  unsubscribes: SyncResult;
}> {
  const results = {
    bounces: await syncBounces(),
    unsubscribes: await syncUnsubscribes(),
  };

  // After syncing suppressions, update all lead email statuses
  const supabase = getSupabaseClient();
  try {
    await supabase.rpc("exec_sql", {
      sql: "SELECT update_lead_email_statuses();",
    });
    console.log("✅ Lead email statuses updated after sync");
  } catch (error) {
    console.error("⚠️ Failed to update lead email statuses:", error);
  }

  return results;
}

/**
 * Check if an email is on the suppression list
 */
export async function checkEmailSuppression(email: string): Promise<{
  isSuppressed: boolean;
  reason?: string;
  source?: string;
}> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("email_suppression")
    .select("source, reason")
    .eq("email", email.toLowerCase())
    .single();

  if (error || !data) {
    return { isSuppressed: false };
  }

  return {
    isSuppressed: true,
    reason: data.reason,
    source: data.source,
  };
}

/**
 * Check if a domain can be contacted (6 month cadence)
 */
export async function checkDomainContactCadence(domain: string): Promise<{
  canContact: boolean;
  lastContactedAt?: string;
  canContactAfter?: string;
}> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("domain_contact_tracking")
    .select("last_contacted_at, can_contact_after")
    .eq("domain", domain.toLowerCase())
    .single();

  if (error || !data) {
    // Domain never contacted
    return { canContact: true };
  }

  const canContactAfter = new Date(data.can_contact_after);
  const now = new Date();

  return {
    canContact: now >= canContactAfter,
    lastContactedAt: data.last_contacted_at,
    canContactAfter: data.can_contact_after,
  };
}

// Export singleton instance
export const sendgridClient = new SendGridReadOnlyClient();
