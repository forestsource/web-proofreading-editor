<script lang="ts">
	import { diffFiles, selectedFile, comments } from '$lib/stores';
	import type { DiffFile } from '$lib/types';

	const statusIcons: Record<DiffFile['status'], string> = {
		added: 'A',
		modified: 'M',
		deleted: 'D',
		renamed: 'R'
	};

	const statusColors: Record<DiffFile['status'], string> = {
		added: 'var(--success)',
		modified: 'var(--warning)',
		deleted: 'var(--danger)',
		renamed: 'var(--accent)'
	};

	function getCommentCount(filePath: string): number {
		return $comments.filter((c) => c.filePath === filePath).length;
	}

	function selectFile(path: string) {
		$selectedFile = path;
	}

	function fileName(path: string): string {
		return path.split('/').pop() ?? path;
	}

	function dirName(path: string): string {
		const parts = path.split('/');
		return parts.length > 1 ? parts.slice(0, -1).join('/') + '/' : '';
	}
</script>

<div class="file-tree">
	<div class="header">変更ファイル ({$diffFiles.length})</div>
	{#each $diffFiles as file}
		{@const count = getCommentCount(file.path)}
		<button
			class="file-item"
			class:selected={$selectedFile === file.path}
			onclick={() => selectFile(file.path)}
		>
			<span class="status-badge" style="color: {statusColors[file.status]}">
				{statusIcons[file.status]}
			</span>
			<span class="file-path">
				<span class="dir">{dirName(file.path)}</span>{fileName(file.path)}
			</span>
			{#if count > 0}
				<span class="comment-count">{count}</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.file-tree {
		border-bottom: 1px solid var(--border-color);
		max-height: 200px;
		overflow-y: auto;
	}
	.header {
		padding: 8px 12px;
		font-size: 11px;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-bottom: 1px solid var(--border-color);
		position: sticky;
		top: 0;
		background: var(--bg-secondary);
	}
	.file-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		width: 100%;
		border: none;
		background: none;
		color: var(--text-primary);
		cursor: pointer;
		font-size: 13px;
		text-align: left;
	}
	.file-item:hover {
		background: var(--bg-tertiary);
	}
	.file-item.selected {
		background: var(--bg-tertiary);
		border-left: 2px solid var(--accent);
	}
	.status-badge {
		font-family: monospace;
		font-size: 11px;
		font-weight: 700;
		flex-shrink: 0;
		width: 14px;
		text-align: center;
	}
	.file-path {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}
	.dir {
		color: var(--text-secondary);
	}
	.comment-count {
		background: var(--accent);
		color: #fff;
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 10px;
		flex-shrink: 0;
	}

	@media (max-width: 767px) {
		.file-tree {
			max-height: 150px;
		}
		.file-item {
			padding: 8px 10px;
			font-size: 12px;
		}
	}
</style>
