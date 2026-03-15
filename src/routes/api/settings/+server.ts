import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSettings, updateSettings } from '$lib/server/store';

export const GET: RequestHandler = async () => {
	return json(getSettings());
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const updated = updateSettings(body);
	return json(updated);
};
