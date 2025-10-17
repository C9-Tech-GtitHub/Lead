import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    // Only allow pausing runs that are actively researching
    if (run.status !== 'researching') {
      return NextResponse.json(
        { error: `Can only pause runs that are actively researching. Current status: ${run.status}` },
        { status: 400 }
      );
    }

    if (run.is_paused) {
      return NextResponse.json(
        { error: 'Run is already paused' },
        { status: 400 }
      );
    }

    // Pause the run
    const { error } = await supabase
      .from('runs')
      .update({
        is_paused: true,
        paused_at: new Date().toISOString(),
      })
      .eq('id', runId);

    if (error) throw error;

    // Log the pause action
    await logProgress({
      runId,
      userId: user.id,
      eventType: 'run_paused',
      message: 'Research paused by user',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error pausing run:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
