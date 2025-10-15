import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { functions } from '@/lib/inngest/functions';

// Create the Inngest serve handler for Next.js App Router
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: functions,
});
