/**
 * Test streaming endpoint to verify SSE works
 */

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send immediate test message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message: 'Test started!' })}\n\n`));

      // Send a few more messages with delays
      let count = 0;
      const interval = setInterval(() => {
        count++;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message: `Message ${count}` })}\n\n`));

        if (count >= 5) {
          clearInterval(interval);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', message: 'Test complete!' })}\n\n`));
          controller.close();
        }
      }, 1000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}
