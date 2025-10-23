/**
 * SendGrid Streaming Sync API Route
 *
 * Streams real-time progress updates during SendGrid sync
 * READ-ONLY: Only syncs data, never sends emails
 */

import { NextRequest, NextResponse } from "next/server";
import client from "@sendgrid/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin-client";
import { requireAuth } from "@/lib/auth/api-auth";

// Initialize SendGrid client
function initSendGridClient() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY environment variable is not set");
  }
  client.setApiKey(apiKey);
}

// Get Supabase client (using singleton)
function getSupabaseClient() {
  return getSupabaseAdmin();
}

// Helper to extract domain from email
function extractDomain(email: string): string {
  return email.toLowerCase().split("@")[1] || "";
}

interface SendGridBounce {
  created: number;
  email: string;
  reason: string;
  status: string;
}

interface SendGridSuppression {
  created: number;
  email: string;
  reason?: string;
}

interface SendGridASMGroup {
  id: number;
  name: string;
  description: string;
  is_default: boolean;
  unsubscribes?: number;
}

export async function POST(request: NextRequest) {
  // Authentication check
  const authResult = await requireAuth();
  if ("error" in authResult) {
    return authResult.error;
  }

  const encoder = new TextEncoder();

  // Check if this is a full sync request
  const body = await request.json().catch(() => ({}));
  const isFullSync = body.fullSync === true;

  const stream = new ReadableStream({
    async start(controller) {
      const sendMessage = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Send immediate connection confirmation
        sendMessage({ type: "log", message: "🔌 Connected to sync stream..." });
        sendMessage({ type: "log", message: "Starting SendGrid sync..." });

        if (isFullSync) {
          sendMessage({
            type: "log",
            message: "🔄 FULL SYNC MODE: Fetching ALL historical data",
          });
        } else {
          sendMessage({
            type: "log",
            message: "📊 INCREMENTAL SYNC MODE: Fetching new data only",
          });
        }

        sendMessage({
          type: "log",
          message: "Initializing SendGrid client...",
        });
        initSendGridClient();
        sendMessage({ type: "log", message: "✓ SendGrid client ready" });

        sendMessage({
          type: "log",
          message: "Connecting to database...",
        });
        const supabase = getSupabaseClient();
        sendMessage({ type: "log", message: "✓ Database connected" });

        // Get total lead count for context
        const { count: totalLeads } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true });

        sendMessage({
          type: "log",
          message: `Total leads in database: ${totalLeads?.toLocaleString() || 0}`,
        });

        // ===== SYNC BOUNCES =====
        sendMessage({ type: "log", message: "\n=== Syncing Bounces ===" });

        let bounceStartTime: number | undefined;

        if (isFullSync) {
          // Full sync: ignore previous sync logs and fetch all history
          sendMessage({
            type: "log",
            message: "Full sync: Fetching ALL bounce history from SendGrid",
          });
          bounceStartTime = undefined;
        } else {
          // Check for previous sync
          const { data: previousBounceSyncs } = await supabase
            .from("sendgrid_sync_log")
            .select("id, started_at")
            .eq("sync_type", "bounces")
            .eq("status", "success")
            .order("started_at", { ascending: false })
            .limit(1);

          if (previousBounceSyncs && previousBounceSyncs.length > 0) {
            const lastSync = new Date(previousBounceSyncs[0].started_at);
            bounceStartTime = Math.floor(lastSync.getTime() / 1000);
            sendMessage({
              type: "log",
              message: `Incremental sync: Fetching bounces since ${lastSync.toISOString()}`,
            });
          } else {
            sendMessage({
              type: "log",
              message: "First sync: Fetching ALL bounce history from SendGrid",
            });
          }
        }

        sendMessage({
          type: "log",
          message: "Fetching bounces from SendGrid API (paginated)...",
        });

        // Fetch all bounces with pagination
        const bounces: SendGridBounce[] = [];
        let offset = 0;
        const limit = 500; // Max per page

        while (true) {
          const params: Record<string, number> = { limit, offset };
          if (bounceStartTime) params.start_time = bounceStartTime;

          const [bounceResponse] = await client.request({
            method: "GET",
            url: "/v3/suppression/bounces",
            qs: params,
          });

          const page = bounceResponse.body as SendGridBounce[];
          bounces.push(...page);

          sendMessage({
            type: "log",
            message: `Fetched ${page.length} bounces (total: ${bounces.length})`,
          });

          // If we got less than the limit, we've reached the end
          if (page.length < limit) {
            break;
          }

          offset += limit;
        }

        sendMessage({
          type: "log",
          message: `✓ Received ${bounces.length} total bounces from SendGrid`,
        });

        let bounceSynced = 0;
        const bounceErrors: string[] = [];
        const bounceBatchSize = 500;
        const bounceDomains = new Set<string>();

        // Process bounces in batches
        for (let i = 0; i < bounces.length; i += bounceBatchSize) {
          const batch = bounces.slice(i, i + bounceBatchSize);

          try {
            const batchRecords = batch.map((bounce) => {
              const domain = extractDomain(bounce.email);
              bounceDomains.add(domain);

              return {
                email: bounce.email.toLowerCase(),
                domain,
                source: "bounce",
                reason: bounce.reason,
                sendgrid_created_at: new Date(
                  bounce.created * 1000,
                ).toISOString(),
                synced_from_sendgrid: true,
              };
            });

            const { error } = await supabase
              .from("email_suppression")
              .upsert(batchRecords, { onConflict: "email" });

            if (error) {
              bounceErrors.push(`Batch insert error: ${error.message}`);
            } else {
              bounceSynced += batch.length;
            }

            // Send progress after each batch
            sendMessage({
              type: "progress",
              syncType: "bounces",
              processed: Math.min(i + bounceBatchSize, bounces.length),
              total: bounces.length,
              synced: bounceSynced,
              errors: bounceErrors.length,
            });
          } catch (err: any) {
            bounceErrors.push(`Batch processing error: ${err.message}`);
          }
        }

        // Update leads for all bounce domains in one SQL query
        if (bounceDomains.size > 0) {
          sendMessage({
            type: "log",
            message: `Updating leads for ${bounceDomains.size} bounced domains...`,
          });

          const domainArray = Array.from(bounceDomains);
          await supabase
            .from("leads")
            .update({ email_status: "bounced" })
            .in("email_domain", domainArray);

          sendMessage({
            type: "log",
            message: `✓ Lead updates complete`,
          });
        }

        sendMessage({
          type: "progress",
          syncType: "bounces",
          processed: bounces.length,
          total: bounces.length,
          synced: bounceSynced,
          errors: bounceErrors.length,
        });

        sendMessage({
          type: "log",
          message: `✅ Bounces complete: ${bounceSynced} synced, ${bounceErrors.length} errors`,
        });

        // ===== SYNC UNSUBSCRIBES =====
        sendMessage({ type: "log", message: "\n=== Syncing Unsubscribes ===" });

        let unsubStartTime: number | undefined;

        if (isFullSync) {
          // Full sync: ignore previous sync logs and fetch all history
          sendMessage({
            type: "log",
            message:
              "Full sync: Fetching ALL unsubscribe history from SendGrid",
          });
          unsubStartTime = undefined;
        } else {
          const { data: previousUnsubSyncs } = await supabase
            .from("sendgrid_sync_log")
            .select("id, started_at")
            .eq("sync_type", "unsubscribes")
            .eq("status", "success")
            .order("started_at", { ascending: false })
            .limit(1);

          if (previousUnsubSyncs && previousUnsubSyncs.length > 0) {
            const lastSync = new Date(previousUnsubSyncs[0].started_at);
            unsubStartTime = Math.floor(lastSync.getTime() / 1000);
            sendMessage({
              type: "log",
              message: `Incremental sync: Fetching unsubscribes since ${lastSync.toISOString()}`,
            });
          } else {
            sendMessage({
              type: "log",
              message:
                "First sync: Fetching ALL unsubscribe history from SendGrid",
            });
          }
        }

        sendMessage({
          type: "log",
          message: "Fetching unsubscribes from SendGrid API (paginated)...",
        });

        // Fetch all unsubscribes with pagination
        const unsubscribes: SendGridSuppression[] = [];
        let unsubOffset = 0;
        const unsubLimit = 500; // Max per page

        while (true) {
          const unsubParams: Record<string, number> = {
            limit: unsubLimit,
            offset: unsubOffset,
          };
          if (unsubStartTime) unsubParams.start_time = unsubStartTime;

          const [unsubResponse] = await client.request({
            method: "GET",
            url: "/v3/suppression/unsubscribes",
            qs: unsubParams,
          });

          const page = unsubResponse.body as SendGridSuppression[];
          unsubscribes.push(...page);

          sendMessage({
            type: "log",
            message: `Fetched ${page.length} unsubscribes (total: ${unsubscribes.length})`,
          });

          // If we got less than the limit, we've reached the end
          if (page.length < unsubLimit) {
            break;
          }

          unsubOffset += unsubLimit;
        }

        sendMessage({
          type: "log",
          message: `✓ Received ${unsubscribes.length} total unsubscribes from SendGrid`,
        });

        let unsubSynced = 0;
        const unsubErrors: string[] = [];
        const unsubBatchSize = 500;
        const unsubDomains = new Set<string>();

        // Process unsubscribes in batches
        for (let i = 0; i < unsubscribes.length; i += unsubBatchSize) {
          const batch = unsubscribes.slice(i, i + unsubBatchSize);

          try {
            const batchRecords = batch.map((unsub) => {
              const domain = extractDomain(unsub.email);
              unsubDomains.add(domain);

              return {
                email: unsub.email.toLowerCase(),
                domain,
                source: "unsubscribe",
                reason: unsub.reason || "User unsubscribed",
                sendgrid_created_at: new Date(
                  unsub.created * 1000,
                ).toISOString(),
                synced_from_sendgrid: true,
              };
            });

            const { error } = await supabase
              .from("email_suppression")
              .upsert(batchRecords, { onConflict: "email" });

            if (error) {
              unsubErrors.push(`Batch insert error: ${error.message}`);
            } else {
              unsubSynced += batch.length;
            }

            // Send progress after each batch
            sendMessage({
              type: "progress",
              syncType: "unsubscribes",
              processed: Math.min(i + unsubBatchSize, unsubscribes.length),
              total: unsubscribes.length,
              synced: unsubSynced,
              errors: unsubErrors.length,
            });
          } catch (err: any) {
            unsubErrors.push(`Batch processing error: ${err.message}`);
          }
        }

        // Update leads for all unsubscribed domains in one SQL query
        if (unsubDomains.size > 0) {
          sendMessage({
            type: "log",
            message: `Updating leads for ${unsubDomains.size} unsubscribed domains...`,
          });

          const domainArray = Array.from(unsubDomains);
          await supabase
            .from("leads")
            .update({ email_status: "unsubscribed" })
            .in("email_domain", domainArray);

          sendMessage({
            type: "log",
            message: `✓ Lead updates complete`,
          });
        }

        sendMessage({
          type: "progress",
          syncType: "unsubscribes",
          processed: unsubscribes.length,
          total: unsubscribes.length,
          synced: unsubSynced,
          errors: unsubErrors.length,
        });

        sendMessage({
          type: "log",
          message: `✅ Unsubscribes complete: ${unsubSynced} synced, ${unsubErrors.length} errors`,
        });

        // ===== SYNC ASM GROUPS =====
        sendMessage({
          type: "log",
          message: "\n=== Syncing ASM Group Suppressions ===",
        });

        // Fetch all ASM groups
        sendMessage({
          type: "log",
          message: "Fetching ASM unsubscribe groups...",
        });

        const [groupsResponse] = await client.request({
          method: "GET",
          url: "/v3/asm/groups",
        });

        const asmGroups = groupsResponse.body as SendGridASMGroup[];

        sendMessage({
          type: "log",
          message: `✓ Found ${asmGroups.length} ASM groups`,
        });

        let asmSynced = 0;
        const asmErrors: string[] = [];

        // Sync each group's suppressions
        for (const group of asmGroups) {
          sendMessage({
            type: "log",
            message: `\nProcessing group: ${group.name} (ID: ${group.id})`,
          });

          try {
            // Fetch all suppressions for this group (they return as simple string array of emails)
            const [groupSuppressionsResponse] = await client.request({
              method: "GET",
              url: `/v3/asm/groups/${group.id}/suppressions`,
            });

            const groupEmails = groupSuppressionsResponse.body as string[];

            sendMessage({
              type: "log",
              message: `  Found ${groupEmails.length} suppressions in ${group.name}`,
            });

            // SMART OPTIMIZATION: Use database to find only NEW emails
            // Instead of upserting all 16K emails, let PostgreSQL tell us what's new
            const normalizedEmails = groupEmails.map((e) => e.toLowerCase());

            sendMessage({
              type: "log",
              message: `  Checking database for existing suppressions...`,
            });

            // Query existing emails for this group in the junction table
            const { data: existingInJunction } = await supabase
              .from("email_asm_groups")
              .select("email")
              .eq("asm_group_id", group.id);

            const existingInGroupSet = new Set(
              existingInJunction?.map((row) => row.email) || [],
            );

            // Also check if emails exist in email_suppression table
            const { data: allExistingEmails } = await supabase
              .from("email_suppression")
              .select("email")
              .in("email", normalizedEmails);

            const existingInSuppressionTable = new Set(
              allExistingEmails?.map((row) => row.email) || [],
            );

            // Find emails new to this specific ASM group
            const newEmailsForGroup = normalizedEmails.filter(
              (email) => !existingInGroupSet.has(email),
            );

            const willCreateNewSuppressionRecords = newEmailsForGroup.filter(
              (email) => !existingInSuppressionTable.has(email),
            ).length;

            sendMessage({
              type: "log",
              message: `  ${existingInGroupSet.size} already in this group, ${newEmailsForGroup.length} to process (${willCreateNewSuppressionRecords} will create new suppression records)`,
            });

            if (newEmailsForGroup.length === 0) {
              sendMessage({
                type: "log",
                message: `  ✓ No new suppressions for ${group.name}`,
              });
              continue;
            }

            // Process only NEW emails in batches
            const batchSize = 400; // Reduced to prevent fetch timeout errors
            const uniqueDomains = new Set<string>();

            for (let i = 0; i < newEmailsForGroup.length; i += batchSize) {
              const batch = newEmailsForGroup.slice(i, i + batchSize);

              try {
                // Prepare batch records for email_suppression table
                const suppressionRecords = batch.map((email) => {
                  const domain = extractDomain(email);
                  uniqueDomains.add(domain);

                  return {
                    email: email,
                    domain,
                    source: "asm_group",
                    reason: `Unsubscribed from: ${group.name}`,
                    asm_group_id: group.id,
                    asm_group_name: group.name,
                    synced_from_sendgrid: true,
                  };
                });

                // Prepare batch records for junction table
                const junctionRecords = batch.map((email) => ({
                  email: email,
                  asm_group_id: group.id,
                  asm_group_name: group.name,
                  synced_at: new Date().toISOString(),
                }));

                // Insert into email_suppression table (upsert to handle emails from other sources)
                const { error: suppressionError } = await supabase
                  .from("email_suppression")
                  .upsert(suppressionRecords, {
                    onConflict: "email",
                    ignoreDuplicates: false,
                  });

                if (suppressionError) {
                  sendMessage({
                    type: "log",
                    message: `  ❌ Suppression insert error: ${suppressionError.message}`,
                  });
                  asmErrors.push(
                    `Suppression insert error: ${suppressionError.message}`,
                  );
                  continue;
                }

                // Insert into junction table (this is the source of truth for ASM groups)
                const { error: junctionError } = await supabase
                  .from("email_asm_groups")
                  .upsert(junctionRecords, {
                    onConflict: "email,asm_group_id",
                    ignoreDuplicates: true,
                  });

                if (junctionError) {
                  sendMessage({
                    type: "log",
                    message: `  ❌ Junction insert error: ${junctionError.message}`,
                  });
                  asmErrors.push(
                    `Junction insert error: ${junctionError.message}`,
                  );
                } else {
                  asmSynced += batch.length;
                  sendMessage({
                    type: "log",
                    message: `  ✓ Inserted ${batch.length} emails into group`,
                  });
                }

                // Send progress after each batch
                sendMessage({
                  type: "progress",
                  syncType: "asm_groups",
                  processed: Math.min(i + batchSize, newEmailsForGroup.length),
                  total: newEmailsForGroup.length,
                  synced: asmSynced,
                  errors: asmErrors.length,
                  groupName: group.name,
                });
              } catch (err: any) {
                asmErrors.push(`Batch processing error: ${err.message}`);
              }
            }

            // Update leads in bulk for all domains in one SQL query
            if (uniqueDomains.size > 0) {
              sendMessage({
                type: "log",
                message: `  Updating leads for ${uniqueDomains.size} domains...`,
              });

              const domainArray = Array.from(uniqueDomains);
              await supabase
                .from("leads")
                .update({ email_status: "unsubscribed" })
                .in("email_domain", domainArray);

              sendMessage({
                type: "log",
                message: `  ✓ Lead updates complete`,
              });
            }

            sendMessage({
              type: "log",
              message: `  ✓ Completed ${group.name}: ${groupEmails.length} processed`,
            });
          } catch (err: any) {
            sendMessage({
              type: "log",
              message: `  ❌ Error fetching group ${group.name}: ${err.message}`,
            });
            asmErrors.push(`Group ${group.id} error: ${err.message}`);
          }
        }

        sendMessage({
          type: "log",
          message: `\n✅ ASM Groups complete: ${asmSynced} synced, ${asmErrors.length} errors`,
        });

        // ===== FINAL SUMMARY =====
        const total = bounceSynced + unsubSynced + asmSynced;

        // Calculate suppressed leads (actual leads affected)
        const { count: suppressedLeadsCount } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .in("email_status", ["bounced", "unsubscribed", "suppressed"]);

        // Calculate unique suppressed domains for context
        const { data: uniqueDomainsData } = await supabase
          .from("email_suppression")
          .select("domain", { count: "exact", head: false })
          .not("domain", "is", null);

        const uniqueSuppressedDomains = new Set(
          uniqueDomainsData?.map((row) => row.domain) || [],
        ).size;

        // Get unique lead domains for accurate comparison
        const { data: leadDomainsData } = await supabase
          .from("leads")
          .select("email_domain", { count: "exact", head: false })
          .not("email_domain", "is", null);

        const uniqueLeadDomains = new Set(
          leadDomainsData?.map((row) => row.email_domain) || [],
        ).size;

        const leadsAffectedPercentage = totalLeads
          ? (((suppressedLeadsCount || 0) / totalLeads) * 100).toFixed(1)
          : "0.0";

        const domainsAffectedPercentage =
          uniqueLeadDomains > 0
            ? ((uniqueSuppressedDomains / uniqueLeadDomains) * 100).toFixed(1)
            : "0.0";

        sendMessage({ type: "log", message: "\n=== Sync Complete ===" });
        sendMessage({
          type: "log",
          message: `Total Emails Synced: ${total.toLocaleString()} | Bounces: ${bounceSynced.toLocaleString()} | Global Unsubscribes: ${unsubSynced.toLocaleString()} | ASM Groups: ${asmSynced.toLocaleString()}`,
        });
        sendMessage({
          type: "log",
          message: `Leads Affected: ${(suppressedLeadsCount || 0).toLocaleString()} / ${totalLeads?.toLocaleString() || 0} (${leadsAffectedPercentage}%)`,
        });
        sendMessage({
          type: "log",
          message: `Suppressed Domains: ${uniqueSuppressedDomains.toLocaleString()} / ${uniqueLeadDomains.toLocaleString()} unique lead domains (${domainsAffectedPercentage}%)`,
        });

        sendMessage({
          type: "complete",
          total,
          bounces: bounceSynced,
          unsubscribes: unsubSynced,
          asmGroups: asmSynced,
          totalLeads,
          suppressedLeads: suppressedLeadsCount || 0,
          leadsAffectedPercentage,
          uniqueSuppressedDomains,
          uniqueLeadDomains,
          domainsAffectedPercentage,
        });

        controller.close();
      } catch (error: any) {
        sendMessage({
          type: "error",
          message: `Error: ${error.message}`,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
