import type { RequestHandler } from './$types';
import { addListener, removeListener } from '$lib/server/store';
import type { StatusEvent } from '$lib/types';

export const GET: RequestHandler = async () => {
	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();

			const listener = (event: StatusEvent) => {
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
				} catch {
					// Stream closed
					removeListener(listener);
				}
			};

			addListener(listener);

			// Send initial heartbeat
			controller.enqueue(encoder.encode(`: heartbeat\n\n`));
		},
		cancel() {
			// Cleanup handled by listener error catching
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
