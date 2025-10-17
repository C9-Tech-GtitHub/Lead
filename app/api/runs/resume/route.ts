import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { inngest } from '@/lib/inngest/client';
import { logProgress } from '@/lib/utils/progress-logger';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runId } = await request.json();

    if (!runId) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
    }

    // Verify the run belongs to the user
    const { data: run } = await supabase
      .from('runs')
      .select('id, user_id, status, is_paused')
      .eq('id', runId)
      .eq('user_id', user.id)
      .single();

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    if (!run.is_paused) {
      return NextResponse.json(
        { error: 'Run is not paused' },
        { status: 400 }
      );
    }

    // Resume the run
    const { error: updateError } = await supabase
      .from('runs')
      .update({
        is_paused: false,
        resumed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    if (updateError) throw updateError;

    // Log the resume action
    await logProgress({
      runId,
      userId: user.id,
      eventType: 'run_resumed',
      message: 'Research resumed by user',
    });

    // Get pending leads and retrigger them
    const adminSupabase = createAdminClient();
    const { data: pendingLeads } = await adminSupabase
      .from('leads')
      .select('id')
      .eq('run_id', runId)
      .eq('research_status', 'pending');

    if (pendingLeads && pendingLeads.length > 0) {
      // Send events in batches
      const BATCH_SIZE = 100;
      const batches = [];

      for (let i = 0; i < pendingLeads.length; i += BATCH_SIZE) {
        batches.push(pendingLeads.slice(i, i + BATCH_SIZE));
      }

      for (const batch of batches) {
        await inngest.send(
          batch.map((lead) => ({
            name: 'lead/research.triggered',
            data: {
              leadId: lead.id,
              runId: runId,
            },
          }))
        );
      }

      await logProgress({
        runId,
        userId: user.id,
        eventType: 'status_update',
        message: `Re-queued ${pendingLeads.length} pending leads for research`,
      });
    }

    return NextResponse.json({
      success: true,
      pendingLeadsTriggered: pendingLeads?.length || 0
    });
  } catch (error) {
    console.error('Error resuming run:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
