import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDiff } from '$lib/server/git';

export const GET: RequestHandler = async ({ url }) => {
	const repo = url.searchParams.get('repo');
	if (!repo) return json({ error: 'repo parameter required' }, { status: 400 });

	const base = url.searchParams.get('base') || undefined;
	const target = url.searchParams.get('target') || undefined;

	try {
		const result = await getDiff(repo, base, target);
		return json(result);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return json({ error: msg }, { status: 500 });
	}
};
