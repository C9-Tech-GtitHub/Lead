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

    const { leadId, runId } = await request.json();

    if (!leadId || !runId) {
      return NextResponse.json(
        { error: 'leadId and runId are required' },
        { status: 400 }
      );
    }

    // Verify the lead belongs to the user
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, name, research_status, research_depth')
      .eq('id', leadId)
      .eq('user_id', user.id)
      .eq('run_id', runId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found or access denied' },
        { status: 404 }
      );
    }

    // Check if lead has been researched
    if (lead.research_status !== 'completed') {
      return NextResponse.json(
        { error: 'Lead must be researched before deep research can be performed' },
        { status: 400 }
      );
    }

    // Trigger the deep research event
    await inngest.send({
      name: 'lead/deep-research.triggered',
      data: {
        leadId,
        runId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Deep research started for ${lead.name}`,
      leadId,
    });
  } catch (error) {
    console.error('Error triggering deep research:', error);
    return NextResponse.json(
      { error: 'Failed to trigger deep research' },
      { status: 500 }
    );
  }
}
