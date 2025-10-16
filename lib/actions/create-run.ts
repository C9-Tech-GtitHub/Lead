'use server';

import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';

interface CreateRunParams {
  businessType: string;
  location: string;
  targetCount: number;
}

export async function createRun({ businessType, location, targetCount }: CreateRunParams) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  // Create the run in the database
  const { data: run, error: createError } = await supabase
    .from('runs')
    .insert({
      user_id: user.id,
      business_type: businessType,
      location: location,
      target_count: targetCount,
      status: 'pending',
    })
    .select()
    .single();

  if (createError) throw createError;

  // Trigger the Inngest workflow using inngest.send()
  await inngest.send({
    name: 'lead/run.created',
    data: {
      runId: run.id,
      userId: user.id,
      businessType,
      location,
      targetCount,
    },
  });

  return { runId: run.id };
}
