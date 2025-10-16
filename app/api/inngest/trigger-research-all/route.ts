import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';

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
      .select('id, user_id, status')
      .eq('id', runId)
      .eq('user_id', user.id)
      .single();

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Check if run is in 'ready' status
    if (run.status !== 'ready') {
      return NextResponse.json(
        { error: `Run is not ready for research. Current status: ${run.status}` },
        { status: 400 }
      );
    }

    // Trigger the Inngest function
    await inngest.send({
      name: 'lead/research-all.triggered',
      data: {
        runId: runId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error triggering research all:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
