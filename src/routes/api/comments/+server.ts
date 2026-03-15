import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { nanoid } from 'nanoid';
import {
	getComments,
	getCommentsByHunk,
	getCommentsByFile,
	addComment,
	updateComment,
	deleteComment
} from '$lib/server/store';
import type { Comment } from '$lib/types';

export const GET: RequestHandler = async ({ url }) => {
	const hunkId = url.searchParams.get('hunkId');
	const filePath = url.searchParams.get('filePath');

	if (hunkId) return json({ comments: getCommentsByHunk(hunkId) });
	if (filePath) return json({ comments: getCommentsByFile(filePath) });
	return json({ comments: getComments() });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { hunkId, hunkContent, filePath, text, selectedText } = body;

	if (!hunkId || !filePath || !text) {
		return json({ error: 'hunkId, filePath, and text are required' }, { status: 400 });
	}

	const comment: Comment = {
		id: nanoid(),
		hunkId,
		hunkContent: hunkContent || '',
		filePath,
		text,
		...(selectedText ? { selectedText } : {}),
		status: 'pending',
		createdAt: Date.now(),
		updatedAt: Date.now()
	};

	addComment(comment);
	return json({ comment }, { status: 201 });
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { id, text } = body;

	if (!id) return json({ error: 'id is required' }, { status: 400 });

	const updated = updateComment(id, { text });
	if (!updated) return json({ error: 'Comment not found' }, { status: 404 });

	return json({ comment: updated });
};

export const DELETE: RequestHandler = async ({ url }) => {
	const id = url.searchParams.get('id');
	if (!id) return json({ error: 'id parameter required' }, { status: 400 });

	const deleted = deleteComment(id);
	if (!deleted) return json({ error: 'Comment not found' }, { status: 404 });

	return json({ success: true });
};
