import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runId, filterGrade, leadIds } = await request.json();

    if (!runId) {
      return NextResponse.json(
        { error: 'runId is required' },
        { status: 400 }
      );
    }

    // Verify the run belongs to the user
    const { data: run, error: runError } = await supabase
      .from('runs')
      .select('id, business_type')
      .eq('id', runId)
      .eq('user_id', user.id)
      .single();

    if (runError || !run) {
      return NextResponse.json(
        { error: 'Run not found or access denied' },
        { status: 404 }
      );
    }

    // Validate filterGrade if provided
    const validGrades = ['all', 'A', 'B', 'C', 'D', 'F'];
    if (filterGrade && !validGrades.includes(filterGrade)) {
      return NextResponse.json(
        { error: 'Invalid filterGrade. Must be one of: all, A, B, C, D, F' },
        { status: 400 }
      );
    }

    // Trigger the deep research event for multiple leads
    await inngest.send({
      name: 'lead/deep-research-multiple.triggered',
      data: {
        runId,
        filterGrade: filterGrade || 'all',
        leadIds: leadIds || undefined,
      },
    });

    const message = leadIds
      ? `Deep research started for ${leadIds.length} selected leads`
      : filterGrade && filterGrade !== 'all'
        ? `Deep research started for all grade ${filterGrade} leads`
        : 'Deep research started for all leads';

    return NextResponse.json({
      success: true,
      message,
      runId,
    });
  } catch (error) {
    console.error('Error triggering deep research:', error);
    return NextResponse.json(
      { error: 'Failed to trigger deep research' },
      { status: 500 }
    );
  }
}
