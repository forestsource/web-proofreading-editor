import type { Comment, AppSettings, StatusEvent } from '$lib/types';

const comments = new Map<string, Comment>();

const settings: AppSettings = {
	repoPath: '',
	diffBase: '',
	diffTarget: '',
	commonInstructions: '',
	commonContext: '',
	parallelism: 3
};

type Listener = (event: StatusEvent) => void;
const listeners = new Set<Listener>();

export function getComments(): Comment[] {
	return Array.from(comments.values()).sort((a, b) => a.createdAt - b.createdAt);
}

export function getCommentsByHunk(hunkId: string): Comment[] {
	return getComments().filter((c) => c.hunkId === hunkId);
}

export function getCommentsByFile(filePath: string): Comment[] {
	return getComments().filter((c) => c.filePath === filePath);
}

export function getComment(id: string): Comment | undefined {
	return comments.get(id);
}

export function addComment(comment: Comment): void {
	comments.set(comment.id, comment);
}

export function updateComment(id: string, updates: Partial<Comment>): Comment | undefined {
	const existing = comments.get(id);
	if (!existing) return undefined;
	const updated = { ...existing, ...updates, updatedAt: Date.now() };
	comments.set(id, updated);
	return updated;
}

export function deleteComment(id: string): boolean {
	return comments.delete(id);
}

export function getSettings(): AppSettings {
	return { ...settings };
}

export function updateSettings(updates: Partial<AppSettings>): AppSettings {
	Object.assign(settings, updates);
	return { ...settings };
}

export function addListener(listener: Listener): void {
	listeners.add(listener);
}

export function removeListener(listener: Listener): void {
	listeners.delete(listener);
}

export function emitEvent(event: StatusEvent): void {
	for (const listener of listeners) {
		try {
			listener(event);
		} catch {
			// ignore listener errors
		}
	}
}
