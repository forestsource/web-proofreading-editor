<script lang="ts">
	import {
		comments,
		diffFiles,
		selectedFile,
		selectedHunkId,
		selectedText,
		addCommentAPI,
		executeCommentsAPI,
		settings,
		focusedCommentId,
		jumpHighlightActive,
		openedFileContent
	} from '$lib/stores';
	import CommentCard from './CommentCard.svelte';
	import CommentEditor from './CommentEditor.svelte';

	let showEditor = $state(false);
	let showProcessed = $state(false);

	// Auto-open editor when text is selected from DiffViewer
	$effect(() => {
		if ($selectedText) {
			showEditor = true;
		}
	});

	// Auto-open processed section when something is running
	$effect(() => {
		if ($comments.some((c) => c.status === 'running')) {
			showProcessed = true;
		}
	});

	// Comments for the selected hunk, or all comments for the file — pending only
	let activeComments = $derived.by(() => {
		let base: typeof $comments;
		if ($selectedHunkId) {
			base = $comments.filter((c) => c.hunkId === $selectedHunkId);
		} else if ($selectedFile) {
			base = $comments.filter((c) => c.filePath === $selectedFile);
		} else {
			base = $comments;
		}
		return base.filter((c) => c.status === 'pending');
	});

	// Running / completed / failed — across all comments (not filtered by hunk)
	let processedComments = $derived(
		$comments.filter((c) => c.status === 'running' || c.status === 'completed' || c.status === 'failed')
	);

	let pendingComments = $derived(
		$comments.filter((c) => c.status === 'pending')
	);

	function getHunkContent(hunkId: string): string {
		// For opened files (non-diff), use the file content directly
		if (hunkId.startsWith('file:') && $openedFileContent) {
			return $openedFileContent;
		}
		for (const file of $diffFiles) {
			const hunk = file.hunks.find((h) => h.id === hunkId);
			if (hunk) return hunk.content;
		}
		return '';
	}

	async function handleAddComment(text: string) {
		if (!$selectedFile || !$selectedHunkId) return;
		const hunkContent = getHunkContent($selectedHunkId);
		const selText = $selectedText ?? undefined;
		await addCommentAPI($selectedHunkId, hunkContent, $selectedFile, text, selText);
		$selectedText = null;
		showEditor = false;
	}

	async function handleExecuteAll() {
		const ids = pendingComments.map((c) => c.id);
		if (ids.length === 0) return;
		await executeCommentsAPI(ids);
	}

	function jumpToHunk(hunkId: string) {
		$selectedHunkId = hunkId;
		$focusedCommentId = null;
		$jumpHighlightActive = true;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				// Try both DiffViewer and FileViewer focused lines
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

	async function handleExecuteAllComments() {
		const all = $comments.filter((c) => c.status === 'pending' || c.status === 'failed');
		if (all.length === 0) return;
		await executeCommentsAPI(all.map((c) => c.id));
	}
</script>

<div class="comment-panel">
	<div class="panel-header">
		<div class="panel-title">
			{#if $selectedHunkId}
				コメント - Hunk
			{:else if $selectedFile}
				コメント - {$selectedFile?.split('/').pop()}
			{:else}
				コメント
			{/if}
		</div>
		<div class="panel-actions">
			{#if pendingComments.length > 0}
				<button class="btn-execute" onclick={handleExecuteAll}>
					▶ 実行 ({pendingComments.length})
				</button>
			{/if}
			{#if $comments.length > 0}
				<button class="btn-execute-all" onclick={handleExecuteAllComments}>
					全て実行
				</button>
			{/if}
		</div>
	</div>

	<div class="panel-info">
		<span>並列度: {$settings.parallelism}</span>
		{#if $comments.filter(c => c.status === 'running').length > 0}
			<span class="running-count">
				実行中: {$comments.filter(c => c.status === 'running').length}
			</span>
		{/if}
	</div>

	<div class="comments-list">
		{#if activeComments.length === 0 && !showEditor}
			<div class="empty-state">
				{#if $selectedHunkId}
					このHunkにコメントはありません。<br />下のボタンで追加できます。
				{:else}
					左のDiffでHunkをクリックしてコメントを追加
				{/if}
			</div>
		{/if}

		{#each activeComments as comment (comment.id)}
			<CommentCard {comment} />
		{/each}

		{#if showEditor && $selectedHunkId}
			{#if $selectedText}
				<div class="selected-preview">
					<div class="selected-preview-label">選択範囲:</div>
					<pre class="selected-preview-code">{$selectedText}</pre>
					<button class="btn-clear-selection" onclick={() => ($selectedText = null)}>選択解除</button>
				</div>
			{/if}
			<CommentEditor onsubmit={handleAddComment} oncancel={() => { showEditor = false; $selectedText = null; }} onjump={() => jumpToHunk($selectedHunkId!)} />
		{:else if $selectedHunkId}
			<button class="btn-add" onclick={() => (showEditor = true)}>
				+ コメントを追加
			</button>
		{/if}
	</div>

	{#if processedComments.length > 0}
		<div class="processed-section">
			<button class="processed-toggle" onclick={() => (showProcessed = !showProcessed)}>
				<span class="toggle-icon" class:open={showProcessed}>{showProcessed ? '▾' : '▸'}</span>
				実行済み ({processedComments.length})
				{#if processedComments.some(c => c.status === 'running')}
					<span class="running-badge">実行中 {processedComments.filter(c => c.status === 'running').length}</span>
				{/if}
			</button>
			{#if showProcessed}
				<div class="processed-list">
					{#each processedComments as comment (comment.id)}
						<CommentCard {comment} collapsible />
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.comment-panel {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary);
	}
	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		border-bottom: 1px solid var(--border-color);
		background: var(--bg-secondary);
	}
	.panel-title {
		font-weight: 600;
		font-size: 13px;
	}
	.panel-actions {
		display: flex;
		gap: 6px;
	}
	.panel-info {
		display: flex;
		gap: 12px;
		padding: 6px 12px;
		font-size: 11px;
		color: var(--text-secondary);
		border-bottom: 1px solid var(--border-color);
	}
	.running-count {
		color: var(--warning);
	}
	.btn-execute {
		background: var(--success);
		color: #fff;
		border: none;
		padding: 3px 10px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 11px;
	}
	.btn-execute-all {
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		padding: 3px 10px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 11px;
	}
	.comments-list {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.empty-state {
		text-align: center;
		color: var(--text-secondary);
		padding: 32px 16px;
		font-size: 13px;
		line-height: 1.6;
	}
	.btn-add {
		background: none;
		border: 1px dashed var(--border-color);
		color: var(--text-secondary);
		padding: 8px;
		border-radius: 6px;
		cursor: pointer;
		font-size: 12px;
	}
	.btn-add:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
	.selected-preview {
		border: 1px solid rgba(88, 166, 255, 0.3);
		background: rgba(88, 166, 255, 0.08);
		border-radius: 6px;
		padding: 8px;
	}
	.selected-preview-label {
		font-size: 11px;
		color: var(--accent);
		margin-bottom: 4px;
		font-weight: 600;
	}
	.selected-preview-code {
		font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
		font-size: 11px;
		color: var(--text-primary);
		margin: 0;
		max-height: 120px;
		overflow-y: auto;
		white-space: pre-wrap;
		word-break: break-all;
	}
	.btn-clear-selection {
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 11px;
		cursor: pointer;
		margin-top: 4px;
		padding: 0;
	}
	.btn-clear-selection:hover {
		color: var(--accent);
	}
	.processed-section {
		border-top: 1px solid var(--border-color);
		flex-shrink: 0;
	}
	.processed-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 8px 12px;
		background: var(--bg-secondary);
		border: none;
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		text-align: left;
	}
	.processed-toggle:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}
	.toggle-icon {
		font-size: 10px;
		width: 12px;
		text-align: center;
	}
	.running-badge {
		margin-left: auto;
		font-size: 10px;
		color: var(--warning);
		font-weight: 600;
	}
	.processed-list {
		max-height: 300px;
		overflow-y: auto;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	@media (max-width: 767px) {
		.panel-header {
			padding: 8px 10px;
			flex-wrap: wrap;
			gap: 6px;
		}
		.panel-title {
			font-size: 12px;
		}
		.panel-info {
			padding: 6px 10px;
		}
		.comments-list {
			padding: 6px;
			gap: 6px;
		}
		.btn-execute, .btn-execute-all {
			font-size: 11px;
			padding: 6px 10px;
		}
	}
</style>
