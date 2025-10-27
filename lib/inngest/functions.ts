import { inngest } from "./client";
import { scrapeGoogleMaps } from "@/lib/scrapers/google-maps";
import { scrapeWebsite } from "@/lib/scrapers/website";
import { lightweightResearchLead } from "@/lib/ai/lightweight-researcher";
import { deepResearchLead } from "@/lib/ai/researcher";
import { prescreenLeadsBatch } from "@/lib/ai/prescreen";
import { createAdminClient } from "@/lib/supabase/admin";
import { logProgress } from "@/lib/utils/progress-logger";
import { findBusinessWebsite } from "@/lib/scrapers/google-search";
import { searchCity } from "@/lib/services/city-search";
import { getSuburbConfig, supportsSuburbSearch } from "@/lib/config/suburbs";

type RunDetails = {
  user_id: string;
  location: string | null;
  business_type: string | null;
};

// ============================================
// Main Lead Research Workflow
// ============================================
// This function orchestrates the complete lead research process
export const processLeadRun = inngest.createFunction(
  {
    id: "process-lead-run",
    name: "Process Lead Research Run",
    retries: 3,
  },
  { event: "lead/run.created" },
  async ({ event, step }) => {
    const { runId, userId, businessTypes, location, targetCount } = event.data;

    // For backward compatibility, handle both businessTypes (array) and businessType (string)
    const queries =
      businessTypes ||
      (event.data.businessType ? [event.data.businessType] : []);
    const businessTypeDisplay = queries.join(", ");

    // Step 1: Update run status to scraping
    await step.run("update-run-status-scraping", async () => {
      const supabase = createAdminClient();
      await supabase
        .from("runs")
        .update({
          status: "scraping",
          started_at: new Date().toISOString(),
        })
        .eq("id", runId);

      await logProgress({
        runId,
        userId,
        eventType: "run_started",
        message: `Started research run for ${businessTypeDisplay} in ${location}`,
        details: { targetCount, businessTypes: queries, location },
      });
    });

    // Step 2: Scrape Google Maps for businesses (with suburb support and multi-query)
    const businesses = await step.run("scrape-google-maps", async () => {
      await logProgress({
        runId,
        userId,
        eventType: "scraping_started",
        message: `Searching Google Maps for ${businessTypeDisplay} businesses in ${location}`,
        details: { queries: queries, queryCount: queries.length },
      });

      // Track unique businesses across all queries using place_id
      const seenPlaceIds = new Set<string>();
      const allResults: any[] = [];

      // Check if location supports multi-suburb search
      const suburbConfig = getSuburbConfig(location);

      // Calculate per-suburb limit
      const perSuburbLimit =
        targetCount >= 1500
          ? 80
          : targetCount >= 800
            ? 60
            : targetCount >= 300
              ? 45
              : targetCount >= 150
                ? 40
                : targetCount >= 100
                  ? 30
                  : 20;

      // Search for each query
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];

        await logProgress({
          runId,
          userId,
          eventType: "scraping_query",
          message: `Searching for "${query}" (${i + 1}/${queries.length})`,
          details: { query, queryIndex: i + 1, totalQueries: queries.length },
        });

        let queryResults;

        if (suburbConfig) {
          // Use city-search service for supported cities
          console.log(
            `[Process Run] Multi-suburb search for "${query}" in ${location}`,
          );

          await logProgress({
            runId,
            userId,
            eventType: "scraping_suburbs",
            message: `Searching ${suburbConfig.suburbs.length} suburbs for "${query}"`,
            details: {
              query,
              suburbCount: suburbConfig.suburbs.length,
              perSuburbLimit,
            },
          });

          queryResults = await searchCity({
            query: query,
            config: suburbConfig,
            limit: targetCount, // Allow each query to find up to target
            perSuburbLimit,
            mode: "hybrid",
          });
        } else {
          // Fall back to regular single-location search
          console.log(
            `[Process Run] Single-location search for "${query}" in ${location}`,
          );

          const rawResults = await scrapeGoogleMaps({
            query: query,
            location: location,
            limit: targetCount,
          });

          // Convert to SearchResult format for consistent deduplication
          queryResults = rawResults.map((r: any) => ({
            place_id:
              r.place_id || r.data_id || `coord_${r.latitude}_${r.longitude}`,
            name: r.name,
            address: r.address,
            phone: r.phone,
            website: r.website,
            latitude: r.latitude,
            longitude: r.longitude,
          }));
        }

        // Add only unique results from this query
        let newCount = 0;
        for (const result of queryResults) {
          const placeId =
            result.place_id || `coord_${result.latitude}_${result.longitude}`;

          if (placeId && !seenPlaceIds.has(placeId)) {
            seenPlaceIds.add(placeId);
            allResults.push(result);
            newCount++;

            // Stop if we've reached the target count
            if (allResults.length >= targetCount) break;
          }
        }

        console.log(
          `[Process Run] Query "${query}": Found ${newCount} new businesses (${queryResults.length} total, ${queryResults.length - newCount} duplicates)`,
        );

        await logProgress({
          runId,
          userId,
          eventType: "scraping_query_completed",
          message: `Query "${query}": ${newCount} new businesses (${queryResults.length - newCount} duplicates)`,
          details: {
            query,
            newCount,
            totalCount: queryResults.length,
            duplicateCount: queryResults.length - newCount,
            totalUnique: allResults.length,
          },
        });

        // Stop searching if we've reached the target
        if (allResults.length >= targetCount) {
          await logProgress({
            runId,
            userId,
            eventType: "scraping_target_reached",
            message: `Target of ${targetCount} leads reached after ${i + 1} queries`,
          });
          break;
        }
      }

      // Convert to GoogleMapsResult format
      const results = allResults.slice(0, targetCount).map((result) => ({
        name: result.name,
        address: result.address,
        phone: result.phone,
        website: result.website,
        latitude: result.latitude,
        longitude: result.longitude,
        url:
          result.latitude && result.longitude
            ? `https://www.google.com/maps/search/?api=1&query=${result.latitude},${result.longitude}`
            : undefined,
      }));

      await logProgress({
        runId,
        userId,
        eventType: "scraping_completed",
        message: `Found ${results.length} businesses on Google Maps`,
        details: { count: results.length },
      });

      return results;
    });

    // Step 3: Save leads to database
    await step.run("save-leads", async () => {
      const supabase = createAdminClient();

      const leadsToInsert = businesses.map((business) => ({
        run_id: runId,
        user_id: userId,
        name: business.name,
        address: business.address,
        phone: business.phone,
        website: business.website,
        google_maps_url: business.url,
        latitude: business.latitude,
        longitude: business.longitude,
        research_status: "pending",
      }));

      const { data, error } = await supabase
        .from("leads")
        .insert(leadsToInsert)
        .select();

      if (error) throw error;

      await logProgress({
        runId,
        userId,
        eventType: "lead_created",
        message: `Created ${data.length} leads in database`,
        details: { count: data.length },
      });

      return data;
    });

    // Step 3.5: Update status to prescreening
    await step.run("update-status-prescreening", async () => {
      const supabase = createAdminClient();
      await supabase
        .from("runs")
        .update({ status: "prescreening" })
        .eq("id", runId);
    });

    // Step 4: Prescreen leads to identify franchises
    const prescreenResults = await step.run("prescreen-leads", async () => {
      const supabase = createAdminClient();

      // Fetch run details with prescreen config
      const { data: run } = await supabase
        .from("runs")
        .select("prescreen_config")
        .eq("id", runId)
        .single();

      const prescreenConfig = run?.prescreen_config;

      await logProgress({
        runId,
        userId,
        eventType: "prescreening_started",
        message: `Pre-screening ${businesses.length} businesses to identify franchises...`,
      });

      // Get all leads for this run
      const { data: allLeads } = await supabase
        .from("leads")
        .select("id, name, address, website")
        .eq("run_id", runId);

      if (!allLeads || allLeads.length === 0) {
        return { skipped: 0, toResearch: 0 };
      }

      // Prescreen in batches
      const prescreenParams = allLeads.map((lead) => ({
        name: lead.name,
        address: lead.address || undefined,
        website: lead.website || undefined,
        businessType: businessTypeDisplay, // Use the display string with all business types
      }));

      const results = await prescreenLeadsBatch(
        prescreenParams,
        prescreenConfig,
      );

      let skippedCount = 0;
      let toResearchCount = 0;

      // Update leads with prescreen results
      for (const lead of allLeads) {
        const result = results.get(lead.name);
        if (!result) continue;

        if (result.shouldResearch) {
          toResearchCount++;
          await supabase
            .from("leads")
            .update({
              prescreened: true,
              prescreen_result: "research",
              prescreen_reason: result.reason,
              is_franchise: result.isFranchise,
              is_national_brand: result.isNationalBrand,
              prescreen_confidence: result.confidence,
              prescreened_at: new Date().toISOString(),
            })
            .eq("id", lead.id);
        } else {
          skippedCount++;
          await supabase
            .from("leads")
            .update({
              prescreened: true,
              prescreen_result: "skip",
              prescreen_reason: result.reason,
              is_franchise: result.isFranchise,
              is_national_brand: result.isNationalBrand,
              prescreen_confidence: result.confidence,
              research_status: "skipped",
              compatibility_grade: "F",
              grade_reasoning: `Skipped - ${result.reason}`,
              prescreened_at: new Date().toISOString(),
              researched_at: new Date().toISOString(),
            })
            .eq("id", lead.id);
        }
      }

      await logProgress({
        runId,
        userId,
        eventType: "prescreening_completed",
        message: `Pre-screening complete: ${toResearchCount} leads to research, ${skippedCount} franchises skipped`,
        details: { toResearch: toResearchCount, skipped: skippedCount },
      });

      return { skipped: skippedCount, toResearch: toResearchCount };
    });

    // Step 5: Mark run as ready for research (NOT auto-triggering research)
    await step.run("update-run-status-ready", async () => {
      const supabase = createAdminClient();

      const { count: leadsCount } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("run_id", runId)
        .eq("prescreen_result", "research");

      if (leadsCount && leadsCount > 0) {
        // Scraping complete, ready for manual research trigger
        await supabase.from("runs").update({ status: "ready" }).eq("id", runId);

        await logProgress({
          runId,
          userId,
          eventType: "scraping_completed",
          message: `Ready to research ${leadsCount} businesses (${prescreenResults.skipped} franchises excluded)`,
          details: {
            leadsToResearch: leadsCount,
            franchisesSkipped: prescreenResults.skipped,
          },
        });
      } else {
        // No leads to research - mark as completed
        await supabase
          .from("runs")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", runId);

        await logProgress({
          runId,
          userId,
          eventType: "run_completed",
          message: `Run completed - all ${prescreenResults.skipped} businesses were franchises`,
          details: { reason: "all-franchises" },
        });
      }
    });

    return {
      success: true,
      businessesFound: businesses.length,
      franchisesSkipped: prescreenResults.skipped,
      leadsToResearch: prescreenResults.toResearch,
      status: "ready", // Ready for manual research trigger
    };
  },
);

// ============================================
// Individual Lead Research Function
// ============================================
// Processes a single lead: scrapes website, analyzes with GPT-5
export const researchIndividualLead = inngest.createFunction(
  {
    id: "research-individual-lead",
    name: "Research Individual Lead",
    retries: 2,
    concurrency: {
      limit: 5, // Process 5 leads at a time (matches Inngest plan limit)
    },
    // Rate limiting removed - concurrency control is sufficient
    // The 5 concurrent limit naturally throttles requests without dropping events
  },
  { event: "lead/research.triggered" },
  async ({ event, step }) => {
    const { leadId, runId, config } = event.data;

    try {
      // Step 0: Check if run is paused
      const isPaused = await step.run("check-if-paused", async () => {
        const supabase = createAdminClient();
        const { data: run } = await supabase
          .from("runs")
          .select("is_paused")
          .eq("id", runId)
          .single();
        return run?.is_paused ?? false;
      });

      if (isPaused) {
        console.log(
          `[Research] Run ${runId} is paused, skipping lead ${leadId}`,
        );
        return { success: false, reason: "run-paused" };
      }

      // Step 1: Fetch lead details
      const lead = await step.run("fetch-lead", async () => {
        const supabase = createAdminClient();
        const { data } = await supabase
          .from("leads")
          .select("*")
          .eq("id", leadId)
          .single();
        return data;
      });

      if (!lead) {
        return { success: false, reason: "lead-not-found" };
      }

      const runDetails = await step.run("fetch-run-details", async () => {
        const supabase = createAdminClient();
        const { data } = await supabase
          .from("runs")
          .select("user_id, location, business_type")
          .eq("id", runId)
          .single();
        return data as RunDetails | null;
      });

      if (!runDetails) {
        return { success: false, reason: "run-not-found" };
      }

      // Step 1.5: If no website, try to find one via Google Search
      let websiteUrl = lead.website;
      if (!websiteUrl) {
        websiteUrl = await step.run("search-for-website", async () => {
          await logProgress({
            runId,
            userId: runDetails.user_id,
            eventType: "lead_research_started",
            message: `${lead.name} - Searching Google for website...`,
            details: { leadName: lead.name },
          });

          // Try to find website via Google Search
          const foundWebsite = await findBusinessWebsite(
            lead.name,
            lead.address || runDetails.location || "",
          );

          if (foundWebsite) {
            // Update the lead with the found website
            await createAdminClient()
              .from("leads")
              .update({ website: foundWebsite })
              .eq("id", leadId);

            await logProgress({
              runId,
              userId: runDetails.user_id,
              eventType: "lead_research_started",
              message: `${lead.name} - Found website via Google: ${foundWebsite}`,
              details: { leadName: lead.name, website: foundWebsite },
            });
          }

          return foundWebsite;
        });
      }

      // Step 2: If still no website after search, mark as completed with F grade
      if (!websiteUrl) {
        await step.run("mark-no-website", async () => {
          const supabase = createAdminClient();
          await supabase
            .from("leads")
            .update({
              research_status: "completed",
              error_message:
                "No website found via Google Maps or Google Search",
              compatibility_grade: "F",
              grade_reasoning:
                "Cannot assess compatibility without an online presence. Business lacks a discoverable website.",
              researched_at: new Date().toISOString(),
            })
            .eq("id", leadId);

          await logProgress({
            runId,
            userId: runDetails.user_id,
            eventType: "lead_research_completed",
            message: `Completed research for ${lead.name} - Grade: F`,
            details: { leadName: lead.name, grade: "F", reason: "no-website" },
          });
        });
        return { success: false, reason: "no-website" };
      }

      // Step 3: Update status to scraping
      await step.run("update-status-scraping", async () => {
        const supabase = createAdminClient();
        await supabase
          .from("leads")
          .update({ research_status: "scraping" })
          .eq("id", leadId);

        await logProgress({
          runId,
          userId: runDetails.user_id,
          eventType: "lead_research_started",
          message: `Researching ${lead.name}`,
          details: { leadName: lead.name, website: websiteUrl },
        });
      });

      // Step 4: Scrape website content (with timeout protection)
      const websiteData = await step.run("scrape-website", async () => {
        try {
          // Add timeout protection for scraping (30 seconds max)
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Website scraping timeout")),
              30000,
            ),
          );

          const scrapePromise = scrapeWebsite(websiteUrl);

          return (await Promise.race([
            scrapePromise,
            timeoutPromise,
          ])) as Awaited<ReturnType<typeof scrapeWebsite>>;
        } catch (error) {
          console.error(`[Research] Scraping failed for ${lead.name}:`, error);
          // Return minimal data if scraping fails
          return {
            mainContent: "",
            aboutContent: null,
            teamContent: null,
            hasMultipleLocations: false,
            teamSize: null,
            abn: null,
            abnData: null,
          };
        }
      });

      // Step 4: Update status to analyzing
      await step.run("update-status-analyzing", async () => {
        const supabase = createAdminClient();
        await supabase
          .from("leads")
          .update({
            research_status: "analyzing",
            website_content: websiteData.mainContent,
            about_content: websiteData.aboutContent,
            team_content: websiteData.teamContent,
            has_multiple_locations: websiteData.hasMultipleLocations,
            team_size: websiteData.teamSize,
            abn: websiteData.abn,
            abn_entity_name: websiteData.abnData?.entityName,
            abn_status: websiteData.abnData?.abnStatus,
            abn_registered_date: websiteData.abnData?.abnStatusEffectiveFrom,
            business_age_years: websiteData.abnData?.businessAge,
          })
          .eq("id", leadId);
      });

      // Step 5: Analyze with GPT-5 (LIGHTWEIGHT - no web search)
      const analysis = await step.run("ai-analysis-lightweight", async () => {
        try {
          return await lightweightResearchLead({
            name: lead.name,
            website: websiteUrl,
            websiteContent: websiteData.mainContent,
            aboutContent: websiteData.aboutContent ?? undefined,
            teamContent: websiteData.teamContent ?? undefined,
            hasMultipleLocations: websiteData.hasMultipleLocations,
            teamSize: websiteData.teamSize ?? undefined,
            businessType: runDetails.business_type ?? lead.business_type ?? "",
            config: config || undefined,
          });
        } catch (error) {
          console.error(
            `[Research] AI analysis failed for ${lead.name}:`,
            error,
          );
          // If AI analysis fails, return a default F grade
          return {
            report: "AI analysis failed. Unable to assess compatibility.",
            grade: "F" as const,
            gradeReasoning: `AI analysis error: ${error instanceof Error ? error.message : "Unknown error"}`,
            suggestedHooks: [],
            painPoints: [],
            opportunities: [],
          };
        }
      });

      // Step 6: Save AI analysis results
      await step.run("save-analysis", async () => {
        const supabase = createAdminClient();

        console.log(
          `[Research] Saving analysis for ${lead.name} - Grade: ${analysis.grade}`,
        );

        const { data, error } = await supabase
          .from("leads")
          .update({
            research_status: "completed",
            research_depth: "lightweight",
            ai_report: analysis.report,
            compatibility_grade: analysis.grade,
            grade_reasoning: analysis.gradeReasoning,
            suggested_hooks: analysis.suggestedHooks,
            pain_points: analysis.painPoints,
            opportunities: analysis.opportunities,
            researched_at: new Date().toISOString(),
          })
          .eq("id", leadId)
          .select();

        if (error) {
          console.error(
            `[Research] Error saving analysis for ${lead.name}:`,
            error,
          );
          throw new Error(`Failed to save analysis: ${error.message}`);
        }

        console.log(
          `[Research] Successfully saved analysis for ${lead.name}`,
          data,
        );

        await logProgress({
          runId,
          userId: runDetails.user_id,
          eventType: "lead_research_completed",
          message: `Completed research for ${lead.name} - Grade: ${analysis.grade}`,
          details: { leadName: lead.name, grade: analysis.grade },
        });
      });

      // Step 7: Check if run is complete
      await step.run("check-run-completion", async () => {
        const supabase = createAdminClient();

        // Get total leads count (actual scraped, not target)
        const { count: totalLeads } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("run_id", runId);

        const { count: completedCount } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("run_id", runId)
          .in("research_status", ["completed", "failed", "skipped"]);

        // If all leads processed, mark run as completed
        if (completedCount && totalLeads && completedCount >= totalLeads) {
          await supabase
            .from("runs")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", runId);

          const { data: runData } = await supabase
            .from("runs")
            .select("user_id, total_leads, grade_a_count, grade_b_count")
            .eq("id", runId)
            .single();

          if (runData) {
            await logProgress({
              runId,
              userId: runData.user_id,
              eventType: "run_completed",
              message: `Research run completed! Analyzed ${runData.total_leads} leads`,
              details: {
                totalLeads: runData.total_leads,
                gradeA: runData.grade_a_count,
                gradeB: runData.grade_b_count,
              },
            });
          }
        }
      });

      return { success: true, leadId, grade: analysis.grade };
    } catch (error) {
      // Catch any unhandled errors and mark lead as failed
      console.error(`[Research] Unexpected error for lead ${leadId}:`, error);

      await step.run("mark-as-failed", async () => {
        const supabase = createAdminClient();

        // Get run details for logging
        const { data: run } = await supabase
          .from("runs")
          .select("user_id")
          .eq("id", runId)
          .single();

        // Get lead name for error message
        const { data: lead } = await supabase
          .from("leads")
          .select("name")
          .eq("id", leadId)
          .single();

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown error during research";

        await supabase
          .from("leads")
          .update({
            research_status: "failed",
            error_message: errorMessage,
            compatibility_grade: "F",
            grade_reasoning: `Research failed: ${errorMessage}`,
            researched_at: new Date().toISOString(),
          })
          .eq("id", leadId);

        if (run && lead) {
          await logProgress({
            runId,
            userId: run.user_id,
            eventType: "lead_research_failed",
            message: `Research failed for ${lead.name}: ${errorMessage}`,
            details: { leadName: lead.name, error: errorMessage },
          });
        }
      });

      return {
        success: false,
        reason: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
);

// ============================================
// Trigger Research for All Leads in a Run
// ============================================
// Manual trigger to start research for all leads in a run
export const triggerResearchAll = inngest.createFunction(
  {
    id: "trigger-research-all",
    name: "Trigger Research for All Leads",
    retries: 1,
  },
  { event: "lead/research-all.triggered" },
  async ({ event, step }) => {
    const { runId, config } = event.data;

    // Step 1: Update run status to researching
    await step.run("update-run-status-researching", async () => {
      const supabase = createAdminClient();
      await supabase
        .from("runs")
        .update({ status: "researching" })
        .eq("id", runId);

      const { data: run } = await supabase
        .from("runs")
        .select("user_id")
        .eq("id", runId)
        .single();

      if (run) {
        await logProgress({
          runId,
          userId: run.user_id,
          eventType: "status_update",
          message: "Starting AI-powered research for all leads...",
        });
      }
    });

    // Step 2: Fetch all pending leads (excluding prescreened franchises)
    const leads = await step.run("fetch-pending-leads", async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("leads")
        .select("id")
        .eq("run_id", runId)
        .eq("research_status", "pending")
        .or("prescreen_result.is.null,prescreen_result.neq.skip"); // Include NULL and non-skip leads
      return data || [];
    });

    // Step 3: Fan out to individual lead processing
    // For large batches (200+), send events in smaller chunks to avoid timeouts
    if (leads.length > 0) {
      const BATCH_SIZE = 100; // Send 100 events at a time
      const batches = [];

      for (let i = 0; i < leads.length; i += BATCH_SIZE) {
        batches.push(leads.slice(i, i + BATCH_SIZE));
      }

      // Send batches sequentially to avoid overwhelming the system
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        await step.sendEvent(
          `trigger-lead-research-batch-${i + 1}`,
          batch.map((lead) => ({
            name: "lead/research.triggered",
            data: {
              leadId: lead.id,
              runId: runId,
              config: config || null,
            },
          })),
        );

        // Log progress for large batches
        if (leads.length > 50) {
          const supabase = createAdminClient();
          const { data: run } = await supabase
            .from("runs")
            .select("user_id")
            .eq("id", runId)
            .single();

          if (run) {
            await logProgress({
              runId,
              userId: run.user_id,
              eventType: "status_update",
              message: `Queued ${Math.min((i + 1) * BATCH_SIZE, leads.length)}/${leads.length} leads for research...`,
            });
          }
        }
      }

      return {
        success: true,
        leadsTriggered: leads.length,
        batches: batches.length,
      };
    } else {
      return { success: false, reason: "no-pending-leads", leadsTriggered: 0 };
    }
  },
);

// ============================================
// Manual Prescreen Trigger
// ============================================
// Allows manual triggering of prescreen for existing leads
export const triggerPrescreen = inngest.createFunction(
  {
    id: "trigger-prescreen",
    name: "Trigger Manual Prescreen",
    retries: 1,
  },
  { event: "lead/prescreen.triggered" },
  async ({ event, step }) => {
    const { runId, businessType } = event.data;

    // Step 1: Update run status to prescreening
    await step.run("update-run-status-prescreening", async () => {
      const supabase = createAdminClient();
      await supabase
        .from("runs")
        .update({ status: "scraping" }) // Use 'scraping' to show activity
        .eq("id", runId);

      const { data: run } = await supabase
        .from("runs")
        .select("user_id")
        .eq("id", runId)
        .single();

      if (run) {
        await logProgress({
          runId,
          userId: run.user_id,
          eventType: "status_update",
          message: "Starting prescreening to identify franchises...",
        });
      }
    });

    // Step 2: Fetch leads that haven't been prescreened
    const leads = await step.run("fetch-leads-to-prescreen", async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("leads")
        .select("id, name, address, website")
        .eq("run_id", runId)
        .or("prescreened.is.null,prescreened.eq.false");
      return data || [];
    });

    if (leads.length === 0) {
      await step.run("no-leads-to-prescreen", async () => {
        const supabase = createAdminClient();
        await supabase.from("runs").update({ status: "ready" }).eq("id", runId);

        const { data: run } = await supabase
          .from("runs")
          .select("user_id")
          .eq("id", runId)
          .single();

        if (run) {
          await logProgress({
            runId,
            userId: run.user_id,
            eventType: "status_update",
            message: "All leads already prescreened",
          });
        }
      });

      return { success: false, reason: "no-leads-to-prescreen" };
    }

    // Step 3: Run prescreen
    const prescreenResults = await step.run("prescreen-leads", async () => {
      const supabase = createAdminClient();

      const { data: run } = await supabase
        .from("runs")
        .select("user_id, prescreen_config")
        .eq("id", runId)
        .single();

      if (!run) {
        throw new Error("Run not found");
      }

      const prescreenConfig = run.prescreen_config;

      await logProgress({
        runId,
        userId: run.user_id,
        eventType: "prescreening_started",
        message: `Pre-screening ${leads.length} businesses to identify franchises...`,
      });

      // Prescreen in batches
      const prescreenParams = leads.map((lead) => ({
        name: lead.name,
        address: lead.address || undefined,
        website: lead.website || undefined,
        businessType: businessType,
      }));

      const results = await prescreenLeadsBatch(
        prescreenParams,
        prescreenConfig,
      );

      let skippedCount = 0;
      let toResearchCount = 0;

      // Update leads with prescreen results
      for (const lead of leads) {
        const result = results.get(lead.name);
        if (!result) continue;

        if (result.shouldResearch) {
          toResearchCount++;
          await supabase
            .from("leads")
            .update({
              prescreened: true,
              prescreen_result: "research",
              prescreen_reason: result.reason,
              is_franchise: result.isFranchise,
              is_national_brand: result.isNationalBrand,
              prescreen_confidence: result.confidence,
              prescreened_at: new Date().toISOString(),
            })
            .eq("id", lead.id);
        } else {
          skippedCount++;
          await supabase
            .from("leads")
            .update({
              prescreened: true,
              prescreen_result: "skip",
              prescreen_reason: result.reason,
              is_franchise: result.isFranchise,
              is_national_brand: result.isNationalBrand,
              prescreen_confidence: result.confidence,
              research_status: "skipped",
              compatibility_grade: "F",
              grade_reasoning: `Skipped - ${result.reason}`,
              prescreened_at: new Date().toISOString(),
              researched_at: new Date().toISOString(),
            })
            .eq("id", lead.id);
        }
      }

      await logProgress({
        runId,
        userId: run.user_id,
        eventType: "prescreening_completed",
        message: `Pre-screening complete: ${toResearchCount} leads to research, ${skippedCount} franchises skipped`,
        details: { toResearch: toResearchCount, skipped: skippedCount },
      });

      return { skipped: skippedCount, toResearch: toResearchCount };
    });

    // Step 4: Update run status back to ready
    await step.run("update-run-status-ready", async () => {
      const supabase = createAdminClient();
      await supabase.from("runs").update({ status: "ready" }).eq("id", runId);

      const { data: run } = await supabase
        .from("runs")
        .select("user_id")
        .eq("id", runId)
        .single();

      if (run) {
        await logProgress({
          runId,
          userId: run.user_id,
          eventType: "prescreening_completed",
          message: `Ready to research ${prescreenResults.toResearch} businesses (${prescreenResults.skipped} franchises excluded)`,
          details: {
            leadsToResearch: prescreenResults.toResearch,
            franchisesSkipped: prescreenResults.skipped,
          },
        });
      }
    });

    return {
      success: true,
      franchisesSkipped: prescreenResults.skipped,
      leadsToResearch: prescreenResults.toResearch,
    };
  },
);

// ============================================
// Deep Research for Individual Lead
// ============================================
// Re-research a lead with comprehensive web search analysis
export const deepResearchIndividualLead = inngest.createFunction(
  {
    id: "deep-research-individual-lead",
    name: "Deep Research Individual Lead",
    retries: 2,
  },
  { event: "lead/deep-research.triggered" },
  async ({ event, step }) => {
    const { leadId, runId } = event.data;

    // Step 1: Get lead and run details
    const { lead, runDetails, websiteData } = await step.run(
      "get-lead-details",
      async () => {
        const supabase = createAdminClient();

        const { data: lead } = await supabase
          .from("leads")
          .select("*")
          .eq("id", leadId)
          .single();

        if (!lead) throw new Error(`Lead ${leadId} not found`);

        const { data: run } = await supabase
          .from("runs")
          .select("user_id, business_type, location")
          .eq("id", runId)
          .single();

        if (!run) throw new Error(`Run ${runId} not found`);

        // Check if we have website content already
        if (!lead.website_content) {
          throw new Error(
            "Lead must be scraped before deep research. Run regular research first.",
          );
        }

        return {
          lead,
          runDetails: run as RunDetails,
          websiteData: {
            mainContent: lead.website_content || "",
            aboutContent: lead.about_content || undefined,
            teamContent: lead.team_content || undefined,
            hasMultipleLocations: lead.has_multiple_locations || false,
            teamSize: lead.team_size || undefined,
          },
        };
      },
    );

    // Step 2: Update status to analyzing
    await step.run("update-status-analyzing", async () => {
      const supabase = createAdminClient();
      await supabase
        .from("leads")
        .update({ research_status: "analyzing" })
        .eq("id", leadId);
    });

    // Step 3: Deep analysis with GPT-5 + web search
    const analysis = await step.run("ai-deep-analysis", async () => {
      return await deepResearchLead({
        name: lead.name,
        website: lead.website || "",
        websiteContent: websiteData.mainContent,
        aboutContent: websiteData.aboutContent,
        teamContent: websiteData.teamContent,
        hasMultipleLocations: websiteData.hasMultipleLocations,
        teamSize: websiteData.teamSize,
        businessType: runDetails.business_type ?? lead.business_type ?? "",
      });
    });

    // Step 4: Save deep analysis results
    await step.run("save-deep-analysis", async () => {
      const supabase = createAdminClient();
      await supabase
        .from("leads")
        .update({
          research_status: "completed",
          research_depth: "deep",
          ai_report: analysis.report,
          compatibility_grade: analysis.grade,
          grade_reasoning: analysis.gradeReasoning,
          suggested_hooks: analysis.suggestedHooks,
          pain_points: analysis.painPoints,
          opportunities: analysis.opportunities,
          researched_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      await logProgress({
        runId,
        userId: runDetails.user_id,
        eventType: "lead_deep_research_completed",
        message: `Deep research completed for ${lead.name} - Grade: ${analysis.grade}`,
        details: { leadName: lead.name, grade: analysis.grade },
      });
    });

    // Step 5: Find emails using Tomba.io (primary) with Hunter.io fallback
    await step.run("find-emails", async () => {
      if (!lead.website) {
        console.log(`[Email Finder] Skipping ${lead.name} - no website`);
        return;
      }

      // Extract domain from website
      const domain = lead.website
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .split("/")[0];

      console.log(
        `[Email Finder] Searching for emails at ${domain} for ${lead.name}`,
      );

      const supabase = createAdminClient();

      // Try Tomba.io first (50 free requests/month)
      try {
        const tombaApiKey = process.env.TOMBA_API_KEY;
        if (tombaApiKey) {
          const tombaUrl = `https://api.tomba.io/v1/domain-search?domain=${encodeURIComponent(domain)}`;
          const tombaResponse = await fetch(tombaUrl, {
            headers: {
              "X-Tomba-Key": tombaApiKey,
              "Content-Type": "application/json",
            },
          });

          if (tombaResponse.ok) {
            const tombaData = await tombaResponse.json();
            const emails = tombaData.data?.emails || [];

            console.log(
              `[Email Finder] Tomba found ${emails.length} emails for ${domain}`,
            );

            // Update lead metadata
            await supabase
              .from("leads")
              .update({
                tomba_searched_at: new Date().toISOString(),
                tomba_organization: tombaData.data?.organization,
                tomba_email_pattern: tombaData.data?.pattern,
                tomba_total_emails: tombaData.meta?.total || 0,
              })
              .eq("id", leadId);

            // Save emails
            if (emails.length > 0) {
              const emailRecords = emails.map((email: any) => ({
                lead_id: leadId,
                user_id: runDetails.user_id,
                email: email.email,
                type: email.type === "generic" ? "generic" : "personal",
                confidence: email.score || 0,
                first_name: email.first_name,
                last_name: email.last_name,
                position: email.position,
                department: email.department,
                seniority: email.seniority,
                verification_status: email.verification?.status || "unknown",
                verification_date: email.verification?.date || null,
                sources: email.sources || [],
                provider: "tomba",
              }));

              await supabase.from("lead_emails").insert(emailRecords);

              await logProgress({
                runId,
                userId: runDetails.user_id,
                eventType: "emails_found",
                message: `Found ${emails.length} email(s) for ${lead.name} via Tomba.io`,
                details: {
                  leadName: lead.name,
                  emailsFound: emails.length,
                  provider: "tomba",
                },
              });

              return;
            }
          }
        }
      } catch (error) {
        console.error("[Email Finder] Tomba.io error:", error);
      }

      // Fallback to Hunter.io (25 free requests/month)
      try {
        const hunterApiKey = process.env.HUNTER_API_KEY;
        if (hunterApiKey) {
          const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${hunterApiKey}`;
          const hunterResponse = await fetch(hunterUrl);

          if (hunterResponse.ok) {
            const hunterData = await hunterResponse.json();
            const emails = hunterData.data?.emails || [];

            console.log(
              `[Email Finder] Hunter found ${emails.length} emails for ${domain}`,
            );

            // Update lead metadata
            await supabase
              .from("leads")
              .update({
                hunter_io_searched_at: new Date().toISOString(),
                hunter_organization: hunterData.data?.organization,
                hunter_email_pattern: hunterData.data?.pattern,
                hunter_total_emails: hunterData.meta?.results || 0,
              })
              .eq("id", leadId);

            // Save emails
            if (emails.length > 0) {
              const emailRecords = emails.map((email: any) => ({
                lead_id: leadId,
                user_id: runDetails.user_id,
                email: email.value,
                type: email.type,
                confidence: email.confidence,
                first_name: email.first_name,
                last_name: email.last_name,
                position: email.position,
                department: email.department,
                seniority: email.seniority,
                verification_status: email.verification?.status || "unknown",
                verification_date: email.verification?.date || null,
                sources: email.sources || [],
                provider: "hunter",
              }));

              await supabase.from("lead_emails").insert(emailRecords);

              await logProgress({
                runId,
                userId: runDetails.user_id,
                eventType: "emails_found",
                message: `Found ${emails.length} email(s) for ${lead.name} via Hunter.io`,
                details: {
                  leadName: lead.name,
                  emailsFound: emails.length,
                  provider: "hunter",
                },
              });
            }
          }
        }
      } catch (error) {
        console.error("[Email Finder] Hunter.io error:", error);
      }
    });

    return { success: true, leadId, grade: analysis.grade };
  },
);

// ============================================
// Deep Research for Multiple Leads
// ============================================
// Trigger deep research for multiple leads (all, by grade, etc.)
export const deepResearchMultipleLeads = inngest.createFunction(
  {
    id: "deep-research-multiple-leads",
    name: "Deep Research Multiple Leads",
    retries: 1,
  },
  { event: "lead/deep-research-multiple.triggered" },
  async ({ event, step }) => {
    const { runId, leadIds, filterGrade } = event.data;

    // Step 1: Get leads to deep research
    const leads = await step.run("get-leads", async () => {
      const supabase = createAdminClient();

      let query = supabase
        .from("leads")
        .select("id, name, run_id")
        .eq("run_id", runId)
        .eq("research_status", "completed"); // Only deep research already-researched leads

      // Filter by specific lead IDs if provided
      if (leadIds && leadIds.length > 0) {
        query = query.in("id", leadIds);
      }
      // Or filter by grade
      else if (filterGrade && filterGrade !== "all") {
        query = query.eq("compatibility_grade", filterGrade);
      }

      const { data: leads } = await query;
      return leads || [];
    });

    if (leads.length === 0) {
      return { success: true, message: "No leads to deep research", count: 0 };
    }

    // Step 2: Trigger individual deep research for each lead
    await step.run("trigger-deep-research-events", async () => {
      const supabase = createAdminClient();

      for (const lead of leads) {
        await inngest.send({
          name: "lead/deep-research.triggered",
          data: {
            leadId: lead.id,
            runId: lead.run_id,
          },
        });
      }

      const { data: run } = await supabase
        .from("runs")
        .select("user_id")
        .eq("id", runId)
        .single();

      if (run) {
        await logProgress({
          runId,
          userId: run.user_id,
          eventType: "deep_research_batch_started",
          message: `Started deep research for ${leads.length} leads${filterGrade && filterGrade !== "all" ? ` (Grade ${filterGrade})` : ""}`,
          details: { count: leads.length, filterGrade },
        });
      }
    });

    return { success: true, count: leads.length };
  },
);

// Export all functions
// ============================================
// SendGrid Daily Sync
// ============================================
// Scheduled function to sync SendGrid suppressions daily
export const dailySendGridSync = inngest.createFunction(
  {
    id: "daily-sendgrid-sync",
    name: "Daily SendGrid Suppression Sync",
    retries: 2,
  },
  { cron: "0 2 * * *" }, // Run daily at 2 AM UTC
  async ({ step }) => {
    const supabase = createAdminClient();

    await step.run("sync-sendgrid-data", async () => {
      console.log("Starting scheduled SendGrid sync...");

      // Import the sync functions
      const { default: client } = await import("@sendgrid/client");

      // Initialize SendGrid client
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        throw new Error("SENDGRID_API_KEY not configured");
      }
      client.setApiKey(apiKey);

      // Helper function to extract domain from email
      const extractDomain = (email: string): string => {
        return email.toLowerCase().split("@")[1] || "";
      };

      let totalSynced = 0;

      // Sync Bounces
      console.log("Syncing bounces...");
      const { data: lastBounceSync } = await supabase
        .from("sendgrid_sync_log")
        .select("started_at")
        .eq("sync_type", "bounces")
        .eq("status", "success")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      const bounceStartTime = lastBounceSync
        ? Math.floor(new Date(lastBounceSync.started_at).getTime() / 1000)
        : undefined;

      const [bounceResponse] = await client.request({
        method: "GET",
        url: "/v3/suppression/bounces",
        qs: bounceStartTime ? { start_time: bounceStartTime } : {},
      });

      const bounces = bounceResponse.body as any[];

      if (bounces.length > 0) {
        const bounceRecords = bounces.map((b: any) => ({
          email: b.email.toLowerCase(),
          domain: extractDomain(b.email),
          source: "bounce",
          reason: b.reason,
          sendgrid_created_at: new Date(b.created * 1000).toISOString(),
          synced_from_sendgrid: true,
        }));

        await supabase.from("email_suppression").upsert(bounceRecords, {
          onConflict: "email",
        });

        // Update leads
        const domainSet = new Set(bounceRecords.map((r) => r.domain));
        const domains = Array.from(domainSet);
        await supabase
          .from("leads")
          .update({ email_status: "bounced" })
          .in("email_domain", domains);

        totalSynced += bounces.length;
        console.log(`Synced ${bounces.length} bounces`);
      }

      // Sync Unsubscribes
      console.log("Syncing unsubscribes...");
      const { data: lastUnsubSync } = await supabase
        .from("sendgrid_sync_log")
        .select("started_at")
        .eq("sync_type", "unsubscribes")
        .eq("status", "success")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      const unsubStartTime = lastUnsubSync
        ? Math.floor(new Date(lastUnsubSync.started_at).getTime() / 1000)
        : undefined;

      const [unsubResponse] = await client.request({
        method: "GET",
        url: "/v3/suppression/unsubscribes",
        qs: unsubStartTime ? { start_time: unsubStartTime } : {},
      });

      const unsubscribes = unsubResponse.body as any[];

      if (unsubscribes.length > 0) {
        const unsubRecords = unsubscribes.map((u: any) => ({
          email: u.email.toLowerCase(),
          domain: extractDomain(u.email),
          source: "unsubscribe",
          reason: u.reason || "User unsubscribed",
          sendgrid_created_at: new Date(u.created * 1000).toISOString(),
          synced_from_sendgrid: true,
        }));

        await supabase.from("email_suppression").upsert(unsubRecords, {
          onConflict: "email",
        });

        // Update leads
        const domainSet = new Set(unsubRecords.map((r) => r.domain));
        const domains = Array.from(domainSet);
        await supabase
          .from("leads")
          .update({ email_status: "unsubscribed" })
          .in("email_domain", domains);

        totalSynced += unsubscribes.length;
        console.log(`Synced ${unsubscribes.length} unsubscribes`);
      }

      // Sync ASM Group Suppressions
      console.log("Syncing ASM groups...");
      const [groupsResponse] = await client.request({
        method: "GET",
        url: "/v3/asm/groups",
      });

      const asmGroups = groupsResponse.body as any[];
      let asmSynced = 0;

      for (const group of asmGroups) {
        const [suppressionsResponse] = await client.request({
          method: "GET",
          url: `/v3/asm/groups/${group.id}/suppressions`,
        });

        const emails = suppressionsResponse.body as string[];

        if (emails.length === 0) continue;

        console.log(
          `Processing ASM group ${group.name}: ${emails.length} total suppressions`,
        );

        // SMART OPTIMIZATION: Only sync NEW emails
        const normalizedEmails = emails.map((e: string) => e.toLowerCase());

        // Query existing emails for this group
        const { data: existingEmails } = await supabase
          .from("email_suppression")
          .select("email")
          .eq("asm_group_id", group.id);

        const existingSet = new Set(
          existingEmails?.map((row) => row.email) || [],
        );

        // Find only NEW emails
        const newEmails = normalizedEmails.filter(
          (email: string) => !existingSet.has(email),
        );

        console.log(
          `  ${existingSet.size} already in DB, ${newEmails.length} new to sync`,
        );

        if (newEmails.length === 0) {
          console.log(`  No new suppressions for ${group.name}`);
          continue;
        }

        // Insert only new emails
        const asmRecords = newEmails.map((email: string) => ({
          email: email,
          domain: extractDomain(email),
          source: "asm_group",
          reason: `Unsubscribed from: ${group.name}`,
          asm_group_id: group.id,
          asm_group_name: group.name,
          synced_from_sendgrid: true,
        }));

        await supabase.from("email_suppression").insert(asmRecords);

        // Update leads
        const domainSet = new Set(asmRecords.map((r) => r.domain));
        const domains = Array.from(domainSet);
        await supabase
          .from("leads")
          .update({ email_status: "unsubscribed" })
          .in("email_domain", domains);

        asmSynced += newEmails.length;
      }

      totalSynced += asmSynced;
      console.log(`Synced ${asmSynced} ASM group suppressions`);

      // Log the sync
      await supabase.from("sendgrid_sync_log").insert({
        sync_type: "scheduled_full",
        status: "success",
        records_synced: totalSynced,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        triggered_by: "cron",
      });

      console.log(`Daily SendGrid sync complete: ${totalSynced} total records`);
      return {
        totalSynced,
        bounces: bounces.length,
        unsubscribes: unsubscribes.length,
        asmGroups: asmSynced,
      };
    });
  },
);

export const functions = [
  processLeadRun,
  researchIndividualLead,
  triggerResearchAll,
  deepResearchIndividualLead,
  deepResearchMultipleLeads,
  triggerPrescreen,
  dailySendGridSync,
];
