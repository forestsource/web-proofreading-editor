import { writable, derived } from 'svelte/store';
import type { DiffFile, Comment, AppSettings, StatusEvent, HistoryEntry } from '$lib/types';

export const diffFiles = writable<DiffFile[]>([]);
export const rawDiff = writable<string>('');
export const comments = writable<Comment[]>([]);
export const selectedFile = writable<string | null>(null);
export const selectedHunkId = writable<string | null>(null);
export const selectedText = writable<string | null>(null);
export const focusedCommentId = writable<string | null>(null);
export const jumpHighlightActive = writable(false);
export const loading = writable(false);
export const error = writable<string | null>(null);

// Opened file (non-diff file viewer)
export const openedFilePath = writable<string | null>(null);
export const openedFileContent = writable<string | null>(null);

// History
const HISTORY_KEY = 'proofreading-copilot-history';
const MAX_HISTORY = 20;

function loadHistory(): HistoryEntry[] {
	try {
		const raw = localStorage.getItem(HISTORY_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function saveHistoryToStorage(entries: HistoryEntry[]) {
	localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

export const history = writable<HistoryEntry[]>(typeof window !== 'undefined' ? loadHistory() : []);

export function addHistory(repoPath: string, base: string, target: string) {
	history.update((list) => {
		const filtered = list.filter(
			(e) => !(e.repoPath === repoPath && e.base === base && e.target === target)
		);
		const entry: HistoryEntry = { repoPath, base, target, openedAt: Date.now() };
		const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
		saveHistoryToStorage(updated);
		return updated;
	});
}

export function removeHistory(entry: HistoryEntry) {
	history.update((list) => {
		const updated = list.filter(
			(e) => !(e.repoPath === entry.repoPath && e.base === entry.base && e.target === entry.target)
		);
		saveHistoryToStorage(updated);
		return updated;
	});
}

export const settings = writable<AppSettings>({
	repoPath: '',
	diffBase: '',
	diffTarget: '',
	commonInstructions: '',
	commonContext: '',
	parallelism: 3
});

export const selectedFileData = derived([diffFiles, selectedFile], ([$diffFiles, $selectedFile]) => {
	if (!$selectedFile) return null;
	return $diffFiles.find((f) => f.path === $selectedFile) ?? null;
});

export const fileComments = derived([comments, selectedFile], ([$comments, $selectedFile]) => {
	if (!$selectedFile) return [];
	return $comments.filter((c) => c.filePath === $selectedFile);
});

// SSE connection
let eventSource: EventSource | null = null;

export function connectSSE() {
	if (eventSource) return;
	eventSource = new EventSource('/api/execute/stream');
	eventSource.onmessage = (e) => {
		const event: StatusEvent = JSON.parse(e.data);
		comments.update((list) =>
			list.map((c) => {
				if (c.id !== event.commentId) return c;
				return {
					...c,
					status: event.status,
					result: event.result ?? c.result,
					error: event.error ?? c.error,
					executionTimeMs: event.executionTimeMs ?? c.executionTimeMs,
					updatedAt: Date.now()
				};
			})
		);

		// Reload diff when a comment execution completes (file may have changed)
		if (event.status === 'completed' || event.status === 'failed') {
			reloadDiff();
		}
	};
}

export function disconnectSSE() {
	eventSource?.close();
	eventSource = null;
}

// API helpers
export async function loadDiff(repoPath: string, base?: string, target?: string) {
	loading.set(true);
	error.set(null);
	try {
		const params = new URLSearchParams({ repo: repoPath });
		if (base) params.set('base', base);
		if (target) params.set('target', target);

		const res = await fetch(`/api/git/diff?${params}`);
		const data = await res.json();
		if (data.error) throw new Error(data.error);

		diffFiles.set(data.files);
		rawDiff.set(data.raw);

		if (data.files.length > 0) {
			selectedFile.set(data.files[0].path);
		}

		addHistory(repoPath, base ?? '', target ?? '');
	} catch (err) {
		error.set(err instanceof Error ? err.message : String(err));
	} finally {
		loading.set(false);
	}
}

// Reload diff without changing selected file or scroll position
export async function reloadDiff() {
	let currentSettings: AppSettings | undefined;
	settings.subscribe((s) => (currentSettings = s))();
	if (!currentSettings?.repoPath) return;

	let currentFile: string | null = null;
	selectedFile.subscribe((f) => (currentFile = f))();

	try {
		const params = new URLSearchParams({ repo: currentSettings.repoPath });
		if (currentSettings.diffBase) params.set('base', currentSettings.diffBase);
		if (currentSettings.diffTarget) params.set('target', currentSettings.diffTarget);

		const res = await fetch(`/api/git/diff?${params}`);
		const data = await res.json();
		if (data.error) return;

		diffFiles.set(data.files);
		rawDiff.set(data.raw);

		// Preserve selected file if it still exists
		if (currentFile && data.files.some((f: DiffFile) => f.path === currentFile)) {
			selectedFile.set(currentFile);
		} else if (data.files.length > 0) {
			selectedFile.set(data.files[0].path);
		}
	} catch {
		// silently fail for background reload
	}
}

export async function loadComments() {
	try {
		const res = await fetch('/api/comments');
		const data = await res.json();
		comments.set(data.comments);
	} catch {
		// silently fail
	}
}

export async function addCommentAPI(hunkId: string, hunkContent: string, filePath: string, text: string, selText?: string) {
	const res = await fetch('/api/comments', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ hunkId, hunkContent, filePath, text, selectedText: selText })
	});
	const data = await res.json();
	if (data.comment) {
		comments.update((list) => [...list, data.comment]);
	}
	return data.comment;
}

export async function updateCommentAPI(id: string, text: string) {
	const res = await fetch('/api/comments', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ id, text })
	});
	const data = await res.json();
	if (data.comment) {
		comments.update((list) => list.map((c) => (c.id === id ? data.comment : c)));
	}
}

export async function deleteCommentAPI(id: string) {
	await fetch(`/api/comments?id=${id}`, { method: 'DELETE' });
	comments.update((list) => list.filter((c) => c.id !== id));
}

export async function executeCommentsAPI(commentIds: string[]) {
	await fetch('/api/execute', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ commentIds })
	});
}

export async function openFile(filePath: string) {
	let currentSettings: AppSettings | undefined;
	settings.subscribe((s) => (currentSettings = s))();
	if (!currentSettings?.repoPath) return;

	try {
		const params = new URLSearchParams({ repo: currentSettings.repoPath, path: filePath });
		const res = await fetch(`/api/git/file?${params}`);
		const data = await res.json();
		if (data.error) throw new Error(data.error);
		openedFilePath.set(filePath);
		openedFileContent.set(data.content);
		selectedFile.set(filePath);
		selectedHunkId.set(`file:${filePath}:0`);
	} catch (err) {
		error.set(err instanceof Error ? err.message : String(err));
	}
}

export function closeFile() {
	openedFilePath.set(null);
	openedFileContent.set(null);
}

export async function saveSettings(s: Partial<AppSettings>) {
	const res = await fetch('/api/settings', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(s)
	});
	const data = await res.json();
	settings.set(data);
}
