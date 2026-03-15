export type CommentStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface DiffFile {
	path: string;
	hunks: DiffHunk[];
	status: 'added' | 'modified' | 'deleted' | 'renamed';
	rawDiff: string;
}

export interface DiffHunk {
	id: string;
	header: string;
	content: string;
	oldStart: number;
	oldLines: number;
	newStart: number;
	newLines: number;
}

export interface Comment {
	id: string;
	hunkId: string;
	hunkContent: string;
	filePath: string;
	text: string;
	selectedText?: string;
	status: CommentStatus;
	result?: string;
	error?: string;
	executionTimeMs?: number;
	createdAt: number;
	updatedAt: number;
}

export interface AppSettings {
	repoPath: string;
	diffBase: string;
	diffTarget: string;
	commonInstructions: string;
	commonContext: string;
	parallelism: number;
}

export interface StatusEvent {
	type: 'status';
	commentId: string;
	status: CommentStatus;
	result?: string;
	error?: string;
	executionTimeMs?: number;
}

export interface GitBranch {
	name: string;
	current: boolean;
}

export interface HistoryEntry {
	repoPath: string;
	base: string;
	target: string;
	openedAt: number;
}
