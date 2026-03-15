<script lang="ts">
	import type { Comment } from '$lib/types';
	import { deleteCommentAPI, updateCommentAPI, executeCommentsAPI, focusedCommentId, selectedHunkId, selectedFile, jumpHighlightActive, diffFiles, openFile } from '$lib/stores';
	import CommentEditor from './CommentEditor.svelte';

	let { comment, collapsible = false }: { comment: Comment; collapsible?: boolean } = $props();
	let editing = $state(false);
	let collapsed = $state(true);

	const statusLabels: Record<string, string> = {
		pending: '待機',
		running: '実行中',
		completed: '完了',
		failed: '失敗'
	};

	const statusColors: Record<string, string> = {
		pending: 'var(--text-secondary)',
		running: 'var(--warning)',
		completed: 'var(--success)',
		failed: 'var(--danger)'
	};

	function formatTime(ms?: number): string {
		if (!ms) return '';
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}

	async function handleEdit(text: string) {
		await updateCommentAPI(comment.id, text);
		editing = false;
	}

	async function handleDelete() {
		await deleteCommentAPI(comment.id);
	}

	async function handleExecute() {
		await executeCommentsAPI([comment.id]);
	}

	function resolveHunkId(): string {
		// Check if the comment's hunkId still exists in current diff
		const file = $diffFiles.find((f) => f.path === comment.filePath);
		if (!file) return comment.hunkId;

		const exactMatch = file.hunks.find((h) => h.id === comment.hunkId);
		if (exactMatch) return comment.hunkId;

		// hunkId no longer valid (diff changed after execution) — find by content match
		const searchText = comment.selectedText ?? comment.hunkContent;
		if (searchText) {
			const found = file.hunks.find((h) => h.content.includes(searchText));
			if (found) return found.id;
		}

		// Fallback: try partial match with first line of hunkContent
		if (comment.hunkContent) {
			const firstLine = comment.hunkContent.split('\n')[0];
			if (firstLine) {
				const found = file.hunks.find((h) => h.content.includes(firstLine));
				if (found) return found.id;
			}
		}

		return comment.hunkId;
	}

	async function handleJump() {
		// If comment is on a file: hunkId, open the file first
		if (comment.hunkId.startsWith('file:')) {
			await openFile(comment.filePath);
		}
		$selectedFile = comment.filePath;
		const hunkId = resolveHunkId();
		$selectedHunkId = hunkId;
		$focusedCommentId = comment.id;
		$jumpHighlightActive = true;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const el = document.querySelector('.diff-line.line-focused, .file-line.line-focused');
				if (el) {
					el.scrollIntoView({ behavior: 'smooth', block: 'center' });
				} else {
					const hunkEl = document.querySelector('.hunk.selected');
					if (hunkEl) {
						hunkEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
					}
				}
			});
		});
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="comment-card"
	class:running={comment.status === 'running'}
	class:focused={$focusedCommentId === comment.id}
	class:collapsible
	onclick={collapsible ? undefined : handleJump}
	onmouseenter={() => ($focusedCommentId = comment.id)}
	onmouseleave={() => { if ($focusedCommentId === comment.id) $focusedCommentId = null; }}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="card-header" onclick={collapsible ? () => (collapsed = !collapsed) : undefined}>
		{#if collapsible}
			<span class="btn-collapse">
				{collapsed ? '▸' : '▾'}
			</span>
		{/if}
		<span class="status" style="color: {statusColors[comment.status]}">
			{#if comment.status === 'running'}
				<span class="spinner"></span>
			{/if}
			{statusLabels[comment.status]}
		</span>
		{#if comment.executionTimeMs}
			<span class="exec-time">{formatTime(comment.executionTimeMs)}</span>
		{/if}
		{#if collapsible}
			<span class="card-summary" class:truncated={collapsed}>{comment.text}</span>
		{/if}
		<div class="card-actions">
			{#if collapsible && !editing}
				<button class="btn-icon jump" onclick={(e) => { e.stopPropagation(); handleJump(); }} title="ジャンプ">⤴</button>
			{/if}
			<button class="btn-icon" onclick={(e) => { e.stopPropagation(); editing = !editing; collapsed = false; }} title="編集">✎</button>
			<button class="btn-icon" onclick={(e) => { e.stopPropagation(); handleExecute(); }} title="実行" disabled={comment.status === 'running'}>▶</button>
			<button class="btn-icon danger" onclick={(e) => { e.stopPropagation(); handleDelete(); }} title="削除">✕</button>
		</div>
	</div>

	{#if !collapsible || !collapsed}
		{#if comment.selectedText}
			<div class="card-selection">
				<div class="selection-label">対象箇所:</div>
				<pre class="selection-code">{comment.selectedText}</pre>
			</div>
		{/if}

		{#if editing}
			<CommentEditor initialText={comment.text} onsubmit={handleEdit} oncancel={() => (editing = false)} onjump={handleJump} />
		{:else}
			<div class="card-body">{comment.text}</div>
		{/if}

		{#if comment.result}
			<div class="card-result">
				<div class="result-label">結果:</div>
				<pre class="result-text">{comment.result}</pre>
			</div>
		{/if}

		{#if comment.error}
			<div class="card-error">
				<pre class="error-text">{comment.error}</pre>
			</div>
		{/if}
	{/if}
</div>

<style>
	.comment-card {
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--bg-secondary);
		overflow: hidden;
	}
	.comment-card.running {
		border-color: var(--warning);
	}
	.comment-card.focused {
		border-color: var(--warning);
		box-shadow: 0 0 0 1px var(--warning);
	}
	.card-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border-bottom: 1px solid var(--border-color);
		font-size: 11px;
	}
	.status {
		display: flex;
		align-items: center;
		gap: 4px;
		font-weight: 600;
	}
	.exec-time {
		color: var(--text-secondary);
		font-size: 10px;
	}
	.btn-collapse {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0 2px;
		font-size: 10px;
		line-height: 1;
		flex-shrink: 0;
	}
	.btn-collapse:hover {
		color: var(--text-primary);
	}
	.card-summary {
		font-size: 11px;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
		flex: 1;
	}
	.card-summary.truncated {
		max-width: 150px;
	}
	.card-actions {
		margin-left: auto;
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}
	.btn-icon {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 2px 4px;
		border-radius: 3px;
		font-size: 12px;
	}
	.btn-icon:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}
	.btn-icon.jump:hover {
		color: var(--accent);
	}
	.btn-icon.danger:hover {
		color: var(--danger);
	}
	.collapsible .card-header {
		cursor: pointer;
	}
	.btn-icon:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.card-selection {
		padding: 6px 10px;
		border-bottom: 1px solid var(--border-color);
		background: rgba(88, 166, 255, 0.05);
	}
	.selection-label {
		font-size: 10px;
		color: var(--accent);
		margin-bottom: 2px;
		font-weight: 600;
	}
	.selection-code {
		font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
		font-size: 11px;
		color: var(--text-secondary);
		margin: 0;
		max-height: 80px;
		overflow-y: auto;
		white-space: pre-wrap;
		word-break: break-all;
	}
	.card-body {
		padding: 8px 10px;
		font-size: 13px;
		white-space: pre-wrap;
	}
	.card-result {
		border-top: 1px solid var(--border-color);
		padding: 6px 10px;
		background: rgba(63, 185, 80, 0.05);
	}
	.result-label {
		font-size: 10px;
		color: var(--success);
		margin-bottom: 4px;
	}
	.result-text {
		font-size: 12px;
		margin: 0;
		white-space: pre-wrap;
		color: var(--text-secondary);
		max-height: 150px;
		overflow-y: auto;
	}
	.card-error {
		border-top: 1px solid var(--border-color);
		padding: 6px 10px;
		background: rgba(248, 81, 73, 0.05);
	}
	.error-text {
		font-size: 12px;
		margin: 0;
		white-space: pre-wrap;
		color: var(--danger);
		max-height: 100px;
		overflow-y: auto;
	}
	.spinner {
		display: inline-block;
		width: 10px;
		height: 10px;
		border: 2px solid var(--warning);
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
