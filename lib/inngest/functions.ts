import { inngest } from './client';
import { scrapeGoogleMaps } from '@/lib/scrapers/google-maps';
import { scrapeWebsite } from '@/lib/scrapers/website';
import { researchLead } from '@/lib/ai/researcher';
import { createAdminClient } from '@/lib/supabase/admin';
import { logProgress } from '@/lib/utils/progress-logger';
import { findBusinessWebsite } from '@/lib/scrapers/google-search';

// ============================================
// Main Lead Research Workflow
// ============================================
// This function orchestrates the complete lead research process
export const processLeadRun = inngest.createFunction(
  {
    id: 'process-lead-run',
    name: 'Process Lead Research Run',
    retries: 3,
  },
  { event: 'lead/run.created' },
  async ({ event, step }) => {
    const { runId, userId, businessType, location, targetCount } = event.data;

    // Step 1: Update run status to scraping
    await step.run('update-run-status-scraping', async () => {
      const supabase = createAdminClient();
      await supabase
        .from('runs')
        .update({
          status: 'scraping',
          started_at: new Date().toISOString()
        })
        .eq('id', runId);

      await logProgress({
        runId,
        userId,
        eventType: 'run_started',
        message: `Started research run for ${businessType} in ${location}`,
        details: { targetCount, businessType, location }
      });
    });

    // Step 2: Scrape Google Maps for businesses
    const businesses = await step.run('scrape-google-maps', async () => {
      await logProgress({
        runId,
        userId,
        eventType: 'scraping_started',
        message: `Searching Google Maps for ${businessType} businesses in ${location}`,
      });

      const results = await scrapeGoogleMaps({
        query: businessType,
        location: location,
        limit: targetCount
      });

      await logProgress({
        runId,
        userId,
        eventType: 'scraping_completed',
        message: `Found ${results.length} businesses on Google Maps`,
        details: { count: results.length }
      });

      return results;
    });

    // Step 3: Save leads to database
    await step.run('save-leads', async () => {
      const supabase = createAdminClient();

      const leadsToInsert = businesses.map(business => ({
        run_id: runId,
        user_id: userId,
        name: business.name,
        address: business.address,
        phone: business.phone,
        website: business.website,
        google_maps_url: business.url,
        research_status: 'pending'
      }));

      const { data, error } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select();

      if (error) throw error;

      await logProgress({
        runId,
        userId,
        eventType: 'lead_created',
        message: `Created ${data.length} leads in database`,
        details: { count: data.length }
      });

      return data;
    });

    // Step 4: Update run status to researching
    await step.run('update-run-status-researching', async () => {
      const supabase = createAdminClient();
      await supabase
        .from('runs')
        .update({ status: 'researching' })
        .eq('id', runId);

      await logProgress({
        runId,
        userId,
        eventType: 'status_update',
        message: 'Starting AI-powered lead research',
      });
    });

    // Step 5: Process each lead individually
    const leads = await step.run('fetch-leads', async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('leads')
        .select('id')
        .eq('run_id', runId);
      return data || [];
    });

    // Step 6: Fan out to individual lead processing
    if (leads.length > 0) {
      await step.sendEvent('trigger-lead-processing', leads.map(lead => ({
        name: 'lead/research.triggered',
        data: {
          leadId: lead.id,
          runId: runId
        }
      })));
    } else {
      // No leads to process - mark run as completed
      await step.run('mark-run-completed-no-leads', async () => {
        const supabase = createAdminClient();
        await supabase
          .from('runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', runId);

        await logProgress({
          runId,
          userId,
          eventType: 'run_completed',
          message: 'Run completed with no businesses found',
          details: { reason: 'no-results-from-scraper' }
        });
      });
    }

    return {
      success: true,
      businessesFound: businesses.length,
      leadsCreated: leads.length
    };
  }
);

// ============================================
// Individual Lead Research Function
// ============================================
// Processes a single lead: scrapes website, analyzes with GPT-5
export const researchIndividualLead = inngest.createFunction(
  {
    id: 'research-individual-lead',
    name: 'Research Individual Lead',
    retries: 2,
    concurrency: {
      limit: 5, // Process 5 leads at a time
    }
  },
  { event: 'lead/research.triggered' },
  async ({ event, step }) => {
    const { leadId, runId } = event.data;

    // Step 1: Fetch lead details
    const lead = await step.run('fetch-lead', async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();
      return data;
    });

    if (!lead) {
      return { success: false, reason: 'lead-not-found' };
    }

    // Step 1.5: If no website, try to find one via Google Search
    let websiteUrl = lead.website;
    if (!websiteUrl) {
      websiteUrl = await step.run('search-for-website', async () => {
        const { data: run } = await createAdminClient()
          .from('runs')
          .select('user_id, location')
          .eq('id', runId)
          .single();

        if (run) {
          await logProgress({
            runId,
            userId: run.user_id,
            eventType: 'lead_research_started',
            message: `${lead.name} - Searching Google for website...`,
            details: { leadName: lead.name }
          });
        }

        // Try to find website via Google Search
        const foundWebsite = await findBusinessWebsite(lead.name, lead.address || run?.location || '');

        if (foundWebsite) {
          // Update the lead with the found website
          await createAdminClient()
            .from('leads')
            .update({ website: foundWebsite })
            .eq('id', leadId);

          if (run) {
            await logProgress({
              runId,
              userId: run.user_id,
              eventType: 'lead_research_started',
              message: `${lead.name} - Found website via Google: ${foundWebsite}`,
              details: { leadName: lead.name, website: foundWebsite }
            });
          }
        }

        return foundWebsite;
      });
    }

    // Step 2: If still no website after search, mark as failed
    if (!websiteUrl) {
      await step.run('mark-no-website', async () => {
        const supabase = createAdminClient();
        await supabase
          .from('leads')
          .update({
            research_status: 'failed',
            error_message: 'No website found via Google Maps or Google Search',
            compatibility_grade: 'F',
            grade_reasoning: 'Cannot assess without website presence'
          })
          .eq('id', leadId);

        const { data: run } = await supabase
          .from('runs')
          .select('user_id')
          .eq('id', runId)
          .single();

        if (run) {
          await logProgress({
            runId,
            userId: run.user_id,
            eventType: 'lead_failed',
            message: `${lead.name} - No website found after Google search`,
            details: { leadName: lead.name, reason: 'no-website' }
          });
        }
      });
      return { success: false, reason: 'no-website' };
    }

    // Step 3: Update status to scraping
    await step.run('update-status-scraping', async () => {
      const supabase = createAdminClient();
      await supabase
        .from('leads')
        .update({ research_status: 'scraping' })
        .eq('id', leadId);

      const { data: run } = await supabase
        .from('runs')
        .select('user_id')
        .eq('id', runId)
        .single();

      if (run) {
        await logProgress({
          runId,
          userId: run.user_id,
          eventType: 'lead_research_started',
          message: `Researching ${lead.name}`,
          details: { leadName: lead.name, website: websiteUrl }
        });
      }
    });

    // Step 4: Scrape website content
    const websiteData = await step.run('scrape-website', async () => {
      return await scrapeWebsite(websiteUrl);
    });

    // Step 4: Update status to analyzing
    await step.run('update-status-analyzing', async () => {
      const supabase = createAdminClient();
      await supabase
        .from('leads')
        .update({
          research_status: 'analyzing',
          website_content: websiteData.mainContent,
          about_content: websiteData.aboutContent,
          team_content: websiteData.teamContent,
          has_multiple_locations: websiteData.hasMultipleLocations,
          team_size: websiteData.teamSize
        })
        .eq('id', leadId);
    });

    // Step 5: Analyze with GPT-5
    const analysis = await step.run('ai-analysis', async () => {
      return await researchLead({
        name: lead.name,
        website: websiteUrl,
        websiteContent: websiteData.mainContent,
        aboutContent: websiteData.aboutContent,
        teamContent: websiteData.teamContent,
        hasMultipleLocations: websiteData.hasMultipleLocations,
        teamSize: websiteData.teamSize,
        businessType: lead.business_type
      });
    });

    // Step 6: Save AI analysis results
    await step.run('save-analysis', async () => {
      const supabase = createAdminClient();
      await supabase
        .from('leads')
        .update({
          research_status: 'completed',
          ai_report: analysis.report,
          compatibility_grade: analysis.grade,
          grade_reasoning: analysis.gradeReasoning,
          suggested_hooks: analysis.suggestedHooks,
          pain_points: analysis.painPoints,
          opportunities: analysis.opportunities,
          researched_at: new Date().toISOString()
        })
        .eq('id', leadId);

      const { data: run } = await supabase
        .from('runs')
        .select('user_id')
        .eq('id', runId)
        .single();

      if (run) {
        await logProgress({
          runId,
          userId: run.user_id,
          eventType: 'lead_research_completed',
          message: `Completed research for ${lead.name} - Grade: ${analysis.grade}`,
          details: { leadName: lead.name, grade: analysis.grade }
        });
      }
    });

    // Step 7: Check if run is complete
    await step.run('check-run-completion', async () => {
      const supabase = createAdminClient();

      // Get total and completed counts
      const { data: run } = await supabase
        .from('runs')
        .select('target_count')
        .eq('id', runId)
        .single();

      const { count: completedCount } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('run_id', runId)
        .in('research_status', ['completed', 'failed']);

      // If all leads processed, mark run as completed
      if (completedCount && run && completedCount >= run.target_count) {
        await supabase
          .from('runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', runId);

        const { data: runData } = await supabase
          .from('runs')
          .select('user_id, total_leads, grade_a_count, grade_b_count')
          .eq('id', runId)
          .single();

        if (runData) {
          await logProgress({
            runId,
            userId: runData.user_id,
            eventType: 'run_completed',
            message: `Research run completed! Analyzed ${runData.total_leads} leads`,
            details: {
              totalLeads: runData.total_leads,
              gradeA: runData.grade_a_count,
              gradeB: runData.grade_b_count
            }
          });
        }
      }
    });

    return { success: true, leadId, grade: analysis.grade };
  }
);

// Export all functions
export const functions = [
  processLeadRun,
  researchIndividualLead
];
