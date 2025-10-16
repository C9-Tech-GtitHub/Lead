import { inngest } from "./client";
import { scrapeGoogleMaps } from "@/lib/scrapers/google-maps";
import { scrapeWebsite } from "@/lib/scrapers/website";
import { researchLead } from "@/lib/ai/researcher";
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
    const { runId, userId, businessType, location, targetCount } = event.data;

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
        message: `Started research run for ${businessType} in ${location}`,
        details: { targetCount, businessType, location },
      });
    });

    // Step 2: Scrape Google Maps for businesses (with suburb support)
    const businesses = await step.run("scrape-google-maps", async () => {
      await logProgress({
        runId,
        userId,
        eventType: "scraping_started",
        message: `Searching Google Maps for ${businessType} businesses in ${location}`,
      });

      let results;

      // Check if location supports multi-suburb search
      const suburbConfig = getSuburbConfig(location);

      if (suburbConfig) {
        // Use city-search service for supported cities
        console.log(`[Process Run] Using multi-suburb search for ${location}`);

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

        await logProgress({
          runId,
          userId,
          eventType: "scraping_started",
          message: `Using multi-suburb search across ${suburbConfig.suburbs.length} suburbs in ${location}`,
          details: {
            suburbCount: suburbConfig.suburbs.length,
            perSuburbLimit,
            targetCount,
          },
        });

        const searchResults = await searchCity({
          query: businessType,
          config: suburbConfig,
          limit: targetCount,
          perSuburbLimit,
          mode: "hybrid", // City-wide + suburbs for best coverage
        });

        // Convert to GoogleMapsResult format
        results = searchResults.map((result) => ({
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
      } else {
        // Fall back to regular single-location search
        console.log(
          `[Process Run] Using single-location search for ${location}`,
        );
        results = await scrapeGoogleMaps({
          query: businessType,
          location: location,
          limit: targetCount,
        });
      }

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

    // Step 4: Prescreen leads to identify franchises
    const prescreenResults = await step.run("prescreen-leads", async () => {
      const supabase = createAdminClient();

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
        businessType: businessType,
      }));

      const results = await prescreenLeadsBatch(prescreenParams, 10);

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
      limit: 5, // Process 5 leads at a time
    },
  },
  { event: "lead/research.triggered" },
  async ({ event, step }) => {
    const { leadId, runId } = event.data;

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
            error_message: "No website found via Google Maps or Google Search",
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

    // Step 4: Scrape website content
    const websiteData = await step.run("scrape-website", async () => {
      return await scrapeWebsite(websiteUrl);
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

    // Step 5: Analyze with GPT-5
    const analysis = await step.run("ai-analysis", async () => {
      return await researchLead({
        name: lead.name,
        website: websiteUrl,
        websiteContent: websiteData.mainContent,
        aboutContent: websiteData.aboutContent,
        teamContent: websiteData.teamContent,
        hasMultipleLocations: websiteData.hasMultipleLocations,
        teamSize: websiteData.teamSize,
        businessType: runDetails.business_type ?? lead.business_type ?? "",
      });
    });

    // Step 6: Save AI analysis results
    await step.run("save-analysis", async () => {
      const supabase = createAdminClient();
      await supabase
        .from("leads")
        .update({
          research_status: "completed",
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
        eventType: "lead_research_completed",
        message: `Completed research for ${lead.name} - Grade: ${analysis.grade}`,
        details: { leadName: lead.name, grade: analysis.grade },
      });
    });

    // Step 7: Check if run is complete
    await step.run("check-run-completion", async () => {
      const supabase = createAdminClient();

      // Get total and completed counts
      const { data: run } = await supabase
        .from("runs")
        .select("target_count")
        .eq("id", runId)
        .single();

      const { count: completedCount } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("run_id", runId)
        .in("research_status", ["completed", "failed"]);

      // If all leads processed, mark run as completed
      if (completedCount && run && completedCount >= run.target_count) {
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
    const { runId } = event.data;

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
        .neq("prescreen_result", "skip"); // Exclude franchises
      return data || [];
    });

    // Step 3: Fan out to individual lead processing
    if (leads.length > 0) {
      await step.sendEvent(
        "trigger-lead-research",
        leads.map((lead) => ({
          name: "lead/research.triggered",
          data: {
            leadId: lead.id,
            runId: runId,
          },
        })),
      );

      return { success: true, leadsTriggered: leads.length };
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
        .select("user_id")
        .eq("id", runId)
        .single();

      if (!run) {
        throw new Error("Run not found");
      }

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

      const results = await prescreenLeadsBatch(prescreenParams, 10);

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

// Export all functions
export const functions = [
  processLeadRun,
  researchIndividualLead,
  triggerResearchAll,
  triggerPrescreen,
];
