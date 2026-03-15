import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { executeComments } from '$lib/server/executor';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { commentIds } = body;

	if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
		return json({ error: 'commentIds array required' }, { status: 400 });
	}

	// Fire and forget - status updates come via SSE
	executeComments(commentIds).catch((err) => {
		console.error('Execution error:', err);
	});

	return json({ started: true, count: commentIds.length });
};
