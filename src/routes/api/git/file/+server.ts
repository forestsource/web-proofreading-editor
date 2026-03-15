import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFileContent } from '$lib/server/git';

export const GET: RequestHandler = async ({ url }) => {
	const repo = url.searchParams.get('repo');
	const path = url.searchParams.get('path');
	if (!repo || !path) return json({ error: 'repo and path parameters required' }, { status: 400 });

	try {
		const content = await readFileContent(repo, path);
		return json({ content });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return json({ error: msg }, { status: 500 });
	}
};
