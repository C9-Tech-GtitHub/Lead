import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { inngest } from '@/lib/inngest/client';
import { logProgress } from '@/lib/utils/progress-logger';

/**
 * Force Restart Research
 *
 * This endpoint ONLY works with leads already in the database (no new scraping).
 * It finds unfinished leads and triggers prescreening + research for them.
 *
 * Use this when:
 * - Run not found / database disconnected
 * - Inngest events got stuck
 * - Research needs to be restarted from existing data
 *
 * Note: This does NOT scrape new leads - only processes what's already in the database.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error('[Force Restart] No authenticated user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runId } = await request.json();

    if (!runId) {
      console.error('[Force Restart] Missing runId');
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
    }

    console.log(`[Force Restart] User ${user.id} requesting restart for run ${runId}`);

    // Use admin client to bypass RLS issues (we'll verify ownership separately)
    const adminSupabase = createAdminClient();

    // Fetch the run using admin client to avoid RLS issues
    const { data: run, error: runError } = await adminSupabase
      .from('runs')
      .select('id, user_id, status, is_paused')
      .eq('id', runId)
      .single();

    if (runError || !run) {
      console.error('[Force Restart] Run not found in database:', runError);

      // Check if there are orphaned leads for this run (no user_id filter - team access)
      const { count: orphanedCount } = await adminSupabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('run_id', runId);

      if (orphanedCount && orphanedCount > 0) {
        console.log(`[Force Restart] Found ${orphanedCount} orphaned leads for deleted run`);
        return NextResponse.json({
          error: 'Run not found',
          message: `Run was deleted but ${orphanedCount} leads still exist in database. These orphaned leads cannot be restarted - please create a new run.`,
          orphanedLeads: orphanedCount,
        }, { status: 404 });
      }

      return NextResponse.json({
        error: 'Run not found',
        details: runError?.message || 'Run does not exist in database'
      }, { status: 404 });
    }

    // Note: No ownership check needed - team access allows all users to manage all runs
    console.log(`[Force Restart] Run found: status=${run.status}, is_paused=${run.is_paused}`);

    // Find ALL leads that already exist in the database (from previous scraping)
    // that haven't been fully processed yet
    const { data: allLeads, error: leadsError } = await adminSupabase
      .from('leads')
      .select('id, name, research_status, compatibility_grade, prescreen_result, prescreen_status')
      .eq('run_id', runId);

    if (leadsError) {
      console.error('[Force Restart] Error fetching leads:', leadsError);
      return NextResponse.json({
        error: 'Failed to fetch leads',
        details: leadsError.message
      }, { status: 500 });
    }

    console.log(`[Force Restart] Found ${allLeads?.length || 0} total leads in database`);

    if (!allLeads || allLeads.length === 0) {
      console.log('[Force Restart] No leads found in database - cannot restart');
      return NextResponse.json(
        {
          error: 'No leads found',
          message: 'No leads exist in the database for this run. Use "Create New Run" to scrape fresh leads.',
        },
        { status: 404 }
      );
    }

    // Filter to leads that need prescreening or research:
    // 1. Not yet prescreened (prescreen_status = null or 'pending')
    // 2. Prescreened but not skipped (prescreen_result != 'skip')
    // 3. Research not completed (research_status != 'completed' and != 'failed')
    const leadsNeedingWork = allLeads.filter(
      (lead) =>
        // Not already skipped during prescreening
        lead.prescreen_result !== 'skip' &&
        // Research not finished
        lead.research_status !== 'completed' &&
        lead.research_status !== 'failed' &&
        // Not already graded as F
        lead.compatibility_grade !== 'F'
    );

    console.log(`[Force Restart] Found ${leadsNeedingWork.length} leads needing work`);

    if (leadsNeedingWork.length === 0) {
      console.log('[Force Restart] All leads already processed - nothing to restart');
      return NextResponse.json(
        {
          success: true,
          message: 'All leads already processed',
          leadsRestarted: 0,
          totalLeadsInDatabase: allLeads.length,
        },
        { status: 200 }
      );
    }

    // Separate leads by what they need:
    // - Leads needing prescreening (prescreen_status is null/pending)
    // - Leads needing research (prescreen_result is 'research', research pending/stuck)
    const leadsNeedingPrescreen = leadsNeedingWork.filter(
      (lead) => !lead.prescreen_status || lead.prescreen_status === 'pending'
    );

    const leadsNeedingResearch = leadsNeedingWork.filter(
      (lead) => (lead.prescreen_result === 'research' || lead.prescreen_result === 'pass') &&
                (lead.research_status === 'pending' ||
                 lead.research_status === 'scraping' ||
                 lead.research_status === 'analyzing')
    );

    console.log(`[Force Restart] Breakdown:`);
    console.log(`  - Needs prescreening: ${leadsNeedingPrescreen.length}`);
    console.log(`  - Needs research: ${leadsNeedingResearch.length}`);

    // Reset stuck leads (scraping/analyzing) back to pending
    const stuckLeads = leadsNeedingWork.filter(
      (lead) => lead.research_status === 'scraping' || lead.research_status === 'analyzing'
    );

    if (stuckLeads.length > 0) {
      console.log(`[Force Restart] Resetting ${stuckLeads.length} stuck leads`);
      const { error: resetError } = await adminSupabase
        .from('leads')
        .update({
          research_status: 'pending',
          error_message: null,
        })
        .in('id', stuckLeads.map((l) => l.id));

      if (resetError) {
        console.error('[Force Restart] Error resetting stuck leads:', resetError);
      }

      await logProgress({
        runId,
        userId: run.user_id,
        eventType: 'status_update',
        message: `Reset ${stuckLeads.length} stuck leads back to pending`,
      });
    }

    // Clear pause state if set
    if (run.is_paused) {
      await adminSupabase
        .from('runs')
        .update({
          is_paused: false,
          resumed_at: new Date().toISOString(),
        })
        .eq('id', runId);
    }

    // Update run status
    const newStatus = leadsNeedingPrescreen.length > 0 ? 'prescreening' : 'researching';
    await adminSupabase
      .from('runs')
      .update({
        status: newStatus,
      })
      .eq('id', runId);

    await logProgress({
      runId,
      userId: user.id,
      eventType: 'run_restarted',
      message: `Restarting: ${leadsNeedingPrescreen.length} to prescreen, ${leadsNeedingResearch.length} to research`,
      details: {
        totalLeads: leadsNeedingWork.length,
        needsPrescreen: leadsNeedingPrescreen.length,
        needsResearch: leadsNeedingResearch.length,
        stuckLeads: stuckLeads.length,
      },
    });

    // Send prescreening events first
    let totalTriggered = 0;
    if (leadsNeedingPrescreen.length > 0) {
      const BATCH_SIZE = 100;
      const prescreenBatches = [];
      for (let i = 0; i < leadsNeedingPrescreen.length; i += BATCH_SIZE) {
        prescreenBatches.push(leadsNeedingPrescreen.slice(i, i + BATCH_SIZE));
      }

      for (let i = 0; i < prescreenBatches.length; i++) {
        const batch = prescreenBatches[i];
        try {
          console.log(`[Force Restart] Sending prescreen batch ${i + 1}/${prescreenBatches.length}`);
          await inngest.send(
            batch.map((lead) => ({
              name: 'lead/prescreen.triggered',
              data: {
                leadId: lead.id,
                runId: runId,
              },
            }))
          );
          totalTriggered += batch.length;
        } catch (error) {
          console.error(`[Force Restart] Error sending prescreen batch ${i + 1}:`, error);
        }
      }
    }

    // Send research events for leads that already passed prescreening
    if (leadsNeedingResearch.length > 0) {
      const BATCH_SIZE = 100;
      const researchBatches = [];
      for (let i = 0; i < leadsNeedingResearch.length; i += BATCH_SIZE) {
        researchBatches.push(leadsNeedingResearch.slice(i, i + BATCH_SIZE));
      }

      for (let i = 0; i < researchBatches.length; i++) {
        const batch = researchBatches[i];
        try {
          console.log(`[Force Restart] Sending research batch ${i + 1}/${researchBatches.length}`);
          await inngest.send(
            batch.map((lead) => ({
              name: 'lead/research.triggered',
              data: {
                leadId: lead.id,
                runId: runId,
              },
            }))
          );
          totalTriggered += batch.length;
        } catch (error) {
          console.error(`[Force Restart] Error sending research batch ${i + 1}:`, error);
        }
      }
    }

    console.log(`[Force Restart] Total leads triggered: ${totalTriggered}`);

    await logProgress({
      runId,
      userId: run.user_id,
      eventType: 'status_update',
      message: `Successfully queued ${totalTriggered} leads (${leadsNeedingPrescreen.length} prescreening, ${leadsNeedingResearch.length} research)`,
    });

    return NextResponse.json({
      success: true,
      message: `Restarted ${totalTriggered} leads from existing database records`,
      leadsRestarted: totalTriggered,
      leadsNeedingPrescreen: leadsNeedingPrescreen.length,
      leadsNeedingResearch: leadsNeedingResearch.length,
      stuckLeadsReset: stuckLeads.length,
      totalLeadsInDatabase: allLeads.length,
    });
  } catch (error) {
    console.error('[Force Restart] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
