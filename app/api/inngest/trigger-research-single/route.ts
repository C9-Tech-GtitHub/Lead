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

    const { leadId, runId } = await request.json();

    if (!leadId || !runId) {
      return NextResponse.json(
        { error: 'Missing leadId or runId' },
        { status: 400 }
      );
    }

    // Verify the lead belongs to a run owned by the user
    const { data: lead } = await supabase
      .from('leads')
      .select('id, run_id, research_status, runs!inner(user_id)')
      .eq('id', leadId)
      .eq('run_id', runId)
      .single();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Type assertion for the join
    const leadWithRun = lead as any;
    if (leadWithRun.runs?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if lead is pending
    if (lead.research_status !== 'pending') {
      return NextResponse.json(
        {
          error: `Lead is not pending. Current status: ${lead.research_status}`,
        },
        { status: 400 }
      );
    }

    // Trigger the Inngest function
    await inngest.send({
      name: 'lead/research.triggered',
      data: {
        leadId: leadId,
        runId: runId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error triggering single lead research:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
