import { existsSync } from 'fs';
import simpleGit from 'simple-git';
import parseDiff from 'parse-diff';
import type { DiffFile, DiffHunk, GitBranch } from '$lib/types';

function validateRepoPath(repoPath: string): string {
	const trimmed = repoPath.trim();
	if (!trimmed) throw new Error('リポジトリパスが指定されていません');
	if (!existsSync(trimmed)) throw new Error(`ディレクトリが存在しません: ${trimmed}`);
	return trimmed;
}

function createGit(repoPath: string) {
	return simpleGit(repoPath).env('GIT_CONFIG_COUNT', '1')
		.env('GIT_CONFIG_KEY_0', 'core.quotepath')
		.env('GIT_CONFIG_VALUE_0', 'false');
}

export async function getDiff(
	repoPath: string,
	base?: string,
	target?: string
): Promise<{ files: DiffFile[]; raw: string }> {
	repoPath = validateRepoPath(repoPath);
	const git = createGit(repoPath);
	let raw: string;

	if (base && target) {
		raw = await git.diff([base, target]);
	} else if (base) {
		raw = await git.diff([base]);
	} else {
		// working tree changes (staged + unstaged)
		raw = await git.diff(['HEAD']);
	}

	// If no diff against HEAD, try unstaged changes
	if (!raw.trim()) {
		raw = await git.diff();
	}

	// Also include untracked/staged
	if (!raw.trim()) {
		raw = await git.diff(['--cached']);
	}

	const parsed = parseDiff(raw);
	const files: DiffFile[] = parsed.map((file) => {
		const filePath = file.to === '/dev/null' ? (file.from ?? '') : (file.to ?? '');

		let status: DiffFile['status'] = 'modified';
		if (file.new) status = 'added';
		else if (file.deleted) status = 'deleted';
		else if (file.from !== file.to) status = 'renamed';

		const hunks: DiffHunk[] = file.chunks.map((chunk, idx) => ({
			id: `${filePath}:${idx}`,
			header: chunk.content,
			content: chunk.changes.map((c) => c.content).join('\n'),
			oldStart: chunk.oldStart,
			oldLines: chunk.oldLines,
			newStart: chunk.newStart,
			newLines: chunk.newLines
		}));

		// Build raw diff for this file
		const fileRaw = raw
			.split(/(?=^diff --git)/m)
			.find((section) => section.includes(filePath)) ?? '';

		return { path: filePath, hunks, status, rawDiff: fileRaw };
	});

	return { files, raw };
}

export async function getChangedFiles(repoPath: string): Promise<string[]> {
	repoPath = validateRepoPath(repoPath);
	const git = createGit(repoPath);
	const status = await git.status();
	return [
		...status.modified,
		...status.created,
		...status.deleted,
		...status.renamed.map((r) => r.to),
		...status.not_added
	];
}

export async function getBranches(repoPath: string): Promise<GitBranch[]> {
	repoPath = validateRepoPath(repoPath);
	const git = createGit(repoPath);
	const result = await git.branchLocal();
	return result.all.map((name) => ({
		name,
		current: name === result.current
	}));
}

export async function readFileContent(repoPath: string, filePath: string): Promise<string> {
	repoPath = validateRepoPath(repoPath);
	const git = createGit(repoPath);
	try {
		return await git.show([`HEAD:${filePath}`]);
	} catch {
		// File might be new / untracked, read from disk
		const { readFile } = await import('fs/promises');
		const { join } = await import('path');
		return await readFile(join(repoPath, filePath), 'utf-8');
	}
}
