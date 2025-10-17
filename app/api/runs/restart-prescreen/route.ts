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

    // Verify the run belongs to the user and get business_type
    const { data: run } = await supabase
      .from('runs')
      .select('id, user_id, status, business_type')
      .eq('id', runId)
      .eq('user_id', user.id)
      .single();

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Get the business type for prescreening
    const businessType = run.business_type || 'business';

    // Trigger the prescreen event via Inngest
    await inngest.send({
      name: 'lead/prescreen.triggered',
      data: {
        runId,
        businessType,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Prescreening restarted successfully',
    });
  } catch (error) {
    console.error('Error restarting prescreening:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
