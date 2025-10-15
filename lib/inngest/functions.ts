import { inngest } from './client';
import { scrapeGoogleMaps } from '@/lib/scrapers/google-maps';
import { scrapeWebsite } from '@/lib/scrapers/website';
import { researchLead } from '@/lib/ai/researcher';
import { createClient } from '@/lib/supabase/server';

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
      const supabase = await createClient();
      await supabase
        .from('runs')
        .update({
          status: 'scraping',
          started_at: new Date().toISOString()
        })
        .eq('id', runId);
    });

    // Step 2: Scrape Google Maps for businesses
    const businesses = await step.run('scrape-google-maps', async () => {
      return await scrapeGoogleMaps({
        query: businessType,
        location: location,
        limit: targetCount
      });
    });

    // Step 3: Save leads to database
    await step.run('save-leads', async () => {
      const supabase = await createClient();

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
      return data;
    });

    // Step 4: Update run status to researching
    await step.run('update-run-status-researching', async () => {
      const supabase = await createClient();
      await supabase
        .from('runs')
        .update({ status: 'researching' })
        .eq('id', runId);
    });

    // Step 5: Process each lead individually
    const leads = await step.run('fetch-leads', async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from('leads')
        .select('id')
        .eq('run_id', runId);
      return data || [];
    });

    // Step 6: Fan out to individual lead processing
    await step.sendEvent('trigger-lead-processing', leads.map(lead => ({
      name: 'lead/research.triggered',
      data: {
        leadId: lead.id,
        runId: runId
      }
    })));

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
      const supabase = await createClient();
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();
      return data;
    });

    if (!lead || !lead.website) {
      // Mark as failed if no website
      await step.run('mark-no-website', async () => {
        const supabase = await createClient();
        await supabase
          .from('leads')
          .update({
            research_status: 'failed',
            error_message: 'No website available for scraping',
            compatibility_grade: 'F',
            grade_reasoning: 'Cannot assess without website presence'
          })
          .eq('id', leadId);
      });
      return { success: false, reason: 'no-website' };
    }

    // Step 2: Update status to scraping
    await step.run('update-status-scraping', async () => {
      const supabase = await createClient();
      await supabase
        .from('leads')
        .update({ research_status: 'scraping' })
        .eq('id', leadId);
    });

    // Step 3: Scrape website content
    const websiteData = await step.run('scrape-website', async () => {
      return await scrapeWebsite(lead.website);
    });

    // Step 4: Update status to analyzing
    await step.run('update-status-analyzing', async () => {
      const supabase = await createClient();
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
        website: lead.website,
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
      const supabase = await createClient();
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
    });

    // Step 7: Check if run is complete
    await step.run('check-run-completion', async () => {
      const supabase = await createClient();

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
