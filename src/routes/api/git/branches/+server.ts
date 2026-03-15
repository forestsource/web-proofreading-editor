import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBranches } from '$lib/server/git';

export const GET: RequestHandler = async ({ url }) => {
	const repo = url.searchParams.get('repo');
	if (!repo) return json({ error: 'repo parameter required' }, { status: 400 });

	try {
		const branches = await getBranches(repo);
		return json({ branches });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return json({ error: msg }, { status: 500 });
	}
};
