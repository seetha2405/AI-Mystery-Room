import { getGenerationJob } from '@/lib/jobs';

export async function GET(request: Request, context: RouteContext<'/api/cases/jobs/[jobId]/stream'>) {
  const { jobId } = await context.params;
  const job = getGenerationJob(jobId);
  if (!job) {
    return Response.json({ error: { code: 'JOB_NOT_FOUND', message: 'This generation job was not found.' } }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let nextEvent = 0;
      const sendAvailableEvents = () => {
        while (nextEvent < job.events.length) {
          const event = job.events[nextEvent++];
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        if (job.finished) {
          clearInterval(timer);
          controller.close();
        }
      };

      controller.enqueue(encoder.encode(': connected\n\n'));
      const timer = setInterval(sendAvailableEvents, 100);
      sendAvailableEvents();
      request.signal.addEventListener('abort', () => {
        clearInterval(timer);
        try { controller.close(); } catch { /* Stream already closed. */ }
      }, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}