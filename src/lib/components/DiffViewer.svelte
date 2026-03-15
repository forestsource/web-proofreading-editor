<script lang="ts">
	import { selectedFileData, selectedHunkId, selectedText, comments, focusedCommentId, jumpHighlightActive, selectedFile } from '$lib/stores';
	import type { DiffHunk, Comment } from '$lib/types';

	// Line selection state
	let selecting = $state(false);
	let selectionHunkId = $state<string | null>(null);
	let selectionStartIdx = $state<number>(-1);
	let selectionEndIdx = $state<number>(-1);
	let showTooltip = $state(false);
	let tooltipTop = $state(0);
	let tooltipRight = $state(0);

	function selectHunk(hunkId: string) {
		$selectedHunkId = hunkId;
	}

	function getHunkCommentCount(hunkId: string): number {
		return $comments.filter((c) => c.hunkId === hunkId).length;
	}

	function formatLine(line: string): { type: 'add' | 'del' | 'context'; text: string } {
		if (line.startsWith('+')) return { type: 'add', text: line };
		if (line.startsWith('-')) return { type: 'del', text: line };
		return { type: 'context', text: line };
	}

	function getSelectionRange(): [number, number] {
		const start = Math.min(selectionStartIdx, selectionEndIdx);
		const end = Math.max(selectionStartIdx, selectionEndIdx);
		return [start, end];
	}

	function isLineSelected(hunkId: string, lineIdx: number): boolean {
		if (selectionHunkId !== hunkId) return false;
		if (selectionStartIdx < 0 || selectionEndIdx < 0) return false;
		const [start, end] = getSelectionRange();
		return lineIdx >= start && lineIdx <= end;
	}

	function handleMouseDown(e: MouseEvent, hunkId: string, lineIdx: number) {
		// Only left button
		if (e.button !== 0) return;
		e.preventDefault();
		selecting = true;
		selectionHunkId = hunkId;
		selectionStartIdx = lineIdx;
		selectionEndIdx = lineIdx;
		showTooltip = false;
		selectHunk(hunkId);
	}

	function handleMouseOver(hunkId: string, lineIdx: number) {
		if (!selecting) return;
		if (hunkId !== selectionHunkId) return;
		selectionEndIdx = lineIdx;
	}

	function handleMouseUp(e: MouseEvent) {
		if (!selecting) return;
		selecting = false;
		if (selectionStartIdx < 0 || selectionEndIdx < 0) return;
		showTooltip = true;

		// Position tooltip at top-right of selection start line
		const [startIdx] = getSelectionRange();
		const hunkEl = (e.target as HTMLElement).closest('.hunk');
		if (hunkEl) {
			const lineEls = hunkEl.querySelectorAll('.diff-line');
			const startLineEl = lineEls[startIdx];
			if (startLineEl && viewerEl) {
				const lineRect = startLineEl.getBoundingClientRect();
				const viewerRect = viewerEl.getBoundingClientRect();
				tooltipTop = lineRect.top - viewerRect.top + viewerEl.scrollTop - 30;
				tooltipRight = 8;
			}
		}
	}

	function getSelectedLinesText(hunk: DiffHunk): string {
		const lines = hunk.content.split('\n');
		const [start, end] = getSelectionRange();
		return lines.slice(start, end + 1).join('\n');
	}

	function handleAddCommentFromSelection() {
		if (!selectionHunkId || !$selectedFileData) return;
		const hunk = $selectedFileData.hunks.find((h) => h.id === selectionHunkId);
		if (!hunk) return;

		const text = getSelectedLinesText(hunk);
		$selectedText = text;
		$selectedHunkId = selectionHunkId;
		clearSelection();
	}

	function clearSelection() {
		selectionHunkId = null;
		selectionStartIdx = -1;
		selectionEndIdx = -1;
		showTooltip = false;
	}

	// Focused comment highlight: determine which lines in which hunk to mark
	let focusedComment = $derived.by(() => {
		if (!$focusedCommentId) return null;
		return $comments.find((c) => c.id === $focusedCommentId) ?? null;
	});

	function matchSelectedLines(hunkContent: string, selText: string, lineIdx: number): boolean {
		const lines = hunkContent.split('\n');
		const selectedLines = selText.split('\n');
		if (selectedLines.length === 0) return false;

		for (let i = 0; i <= lines.length - selectedLines.length; i++) {
			let match = true;
			for (let j = 0; j < selectedLines.length; j++) {
				if (lines[i + j] !== selectedLines[j]) {
					match = false;
					break;
				}
			}
			if (match) {
				return lineIdx >= i && lineIdx < i + selectedLines.length;
			}
		}
		return false;
	}

	function isHunkMatchForComment(hunkId: string, hunkContent: string): boolean {
		if (!focusedComment) return false;

		// Exact hunkId match
		if (focusedComment.hunkId === hunkId) return true;

		// hunkId changed after execution — check if this hunk is selected and content matches
		if ($selectedHunkId !== hunkId) return false;

		const searchText = focusedComment.selectedText ?? focusedComment.hunkContent;
		if (searchText && hunkContent.includes(searchText)) return true;

		// Partial match: first line of original hunkContent
		if (focusedComment.hunkContent) {
			const firstLine = focusedComment.hunkContent.split('\n')[0];
			if (firstLine && hunkContent.includes(firstLine)) return true;
		}

		return false;
	}

	function isFocusedLine(hunkId: string, lineIdx: number, hunkContent: string): boolean {
		if (!focusedComment) return false;
		if (!isHunkMatchForComment(hunkId, hunkContent)) return false;

		// If no selectedText, highlight entire hunk
		if (!focusedComment.selectedText) return true;

		return matchSelectedLines(hunkContent, focusedComment.selectedText, lineIdx);
	}

	function isJumpTargetLine(hunkId: string, lineIdx: number, hunkContent: string): boolean {
		if (focusedComment) return false;
		if (!$jumpHighlightActive) return false;
		if ($selectedHunkId !== hunkId) return false;

		// If selectedText exists, only highlight those lines
		if ($selectedText) {
			return matchSelectedLines(hunkContent, $selectedText, lineIdx);
		}

		// No selectedText: highlight entire hunk
		return true;
	}

	// Auto-scroll to focused comment's lines
	$effect(() => {
		if (focusedComment) {
			const el = document.querySelector(`.diff-line.line-focused`);
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
	});

	// Auto-clear jump highlight after animation
	$effect(() => {
		if ($jumpHighlightActive) {
			const timer = setTimeout(() => {
				$jumpHighlightActive = false;
			}, 1500);
			return () => clearTimeout(timer);
		}
	});

	// Preserve scroll position when diff data updates
	let viewerEl = $state<HTMLElement | null>(null);
	let savedScrollTop = $state(0);

	$effect.pre(() => {
		// Access selectedFileData to track it; save scroll before re-render
		void $selectedFileData;
		if (viewerEl) {
			savedScrollTop = viewerEl.scrollTop;
		}
	});

	$effect(() => {
		// Restore scroll after re-render
		void $selectedFileData;
		if (viewerEl && savedScrollTop > 0) {
			// Use tick-like delay to wait for DOM update
			requestAnimationFrame(() => {
				if (viewerEl) {
					viewerEl.scrollTop = savedScrollTop;
				}
			});
		}
	});

	function handleGlobalClick(e: MouseEvent) {
		// Clear selection if clicking outside tooltip and diff lines
		const target = e.target as HTMLElement;
		if (!target.closest('.selection-tooltip') && !target.closest('.diff-line')) {
			clearSelection();
		}
	}
</script>

<svelte:window onmouseup={handleMouseUp} onclick={handleGlobalClick} />

<div class="diff-viewer" bind:this={viewerEl}>
	{#if $selectedFileData}
		<div class="file-header">{$selectedFileData.path}</div>
		{#each $selectedFileData.hunks as hunk}
			{@const count = getHunkCommentCount(hunk.id)}
			{@const lines = hunk.content.split('\n')}
			<div
				class="hunk"
				class:selected={$selectedHunkId === hunk.id}
				role="button"
				tabindex="0"
				onclick={() => selectHunk(hunk.id)}
				onkeydown={(e) => e.key === 'Enter' && selectHunk(hunk.id)}
			>
				<div class="hunk-header">
					<span class="hunk-range">{hunk.header}</span>
					{#if count > 0}
						<span class="hunk-comments">{count} コメント</span>
					{/if}
					<button
						class="btn-add-comment"
						onclick={(e) => { e.stopPropagation(); selectHunk(hunk.id); }}
						title="コメントを追加"
					>+</button>
				</div>
				<div class="hunk-content">
					{#each lines as line, lineIdx}
						{@const parsed = formatLine(line)}
						{@const lineSelected = isLineSelected(hunk.id, lineIdx)}
						{@const lineFocused = isFocusedLine(hunk.id, lineIdx, hunk.content)}
						{@const lineJumpTarget = isJumpTargetLine(hunk.id, lineIdx, hunk.content)}
						<div
							class="diff-line {parsed.type}"
							class:line-selected={lineSelected}
							class:line-focused={lineFocused || lineJumpTarget}
							class:jump-highlight={(lineFocused || lineJumpTarget) && $jumpHighlightActive}
							role="presentation"
							onmousedown={(e) => handleMouseDown(e, hunk.id, lineIdx)}
							onmouseover={() => handleMouseOver(hunk.id, lineIdx)}
						>
							<span class="line-number">{lineIdx + 1}</span>
							<span class="line-text">{parsed.text}</span>
						</div>
					{/each}
				</div>

				</div>
		{/each}

		<!-- Selection tooltip positioned at top-right of selection -->
		{#if showTooltip}
			<div class="selection-tooltip" style="top: {tooltipTop}px; right: {tooltipRight}px;">
				<button class="tooltip-btn" onclick={handleAddCommentFromSelection}>
					+ コメント
				</button>
			</div>
		{/if}
	{:else}
		<div class="empty-state">
			ファイルを選択してください
		</div>
	{/if}
</div>

<style>
	.diff-viewer {
		height: 100%;
		overflow-y: auto;
		font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
		font-size: 13px;
		position: relative;
	}
	.file-header {
		padding: 8px 16px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-color);
		font-weight: 600;
		position: sticky;
		top: 0;
		z-index: 1;
	}
	.hunk {
		border-bottom: 1px solid var(--border-color);
		cursor: pointer;
		transition: background 0.1s;
		position: relative;
	}
	.hunk:hover {
		outline: 1px solid var(--border-color);
	}
	.hunk.selected {
		outline: 2px solid var(--accent);
	}
	.hunk-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 16px;
		background: rgba(88, 166, 255, 0.1);
		color: var(--text-secondary);
		font-size: 12px;
	}
	.hunk-range {
		flex: 1;
	}
	.hunk-comments {
		font-size: 11px;
		color: var(--accent);
	}
	.btn-add-comment {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		color: var(--accent);
		width: 22px;
		height: 22px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.btn-add-comment:hover {
		background: var(--accent);
		color: #fff;
	}
	.hunk-content {
		padding: 0;
		user-select: none;
	}
	.diff-line {
		padding: 1px 16px 1px 0;
		white-space: pre-wrap;
		word-break: break-all;
		display: flex;
		align-items: baseline;
		cursor: text;
	}
	.diff-line.add {
		background: var(--diff-add-bg);
	}
	.diff-line.del {
		background: var(--diff-del-bg);
	}
	.diff-line.context {
		color: var(--text-secondary);
	}
	.diff-line.line-selected {
		background: rgba(88, 166, 255, 0.25) !important;
		outline: 1px solid rgba(88, 166, 255, 0.4);
	}
	.diff-line.line-focused {
		border-left: 3px solid var(--warning) !important;
		background: rgba(227, 179, 65, 0.12) !important;
	}
	.diff-line.jump-highlight {
		animation: jump-flash 1.5s ease-out;
		background: rgba(227, 179, 65, 0.12) !important;
	}
	@keyframes jump-flash {
		0% { outline: 2px solid rgba(255, 230, 0, 0.8); outline-offset: -2px; }
		30% { outline: 2px solid rgba(255, 230, 0, 0.5); outline-offset: -2px; }
		100% { outline: none; }
	}
	.line-number {
		display: inline-block;
		width: 40px;
		min-width: 40px;
		text-align: right;
		padding-right: 8px;
		color: var(--text-secondary);
		opacity: 0.5;
		font-size: 11px;
		user-select: none;
		pointer-events: none;
	}
	.line-text {
		display: inline;
	}
	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--text-secondary);
		font-family: sans-serif;
	}
	.selection-tooltip {
		position: absolute;
		z-index: 10;
	}
	.tooltip-btn {
		background: var(--accent);
		color: #fff;
		border: none;
		padding: 4px 10px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 11px;
		font-weight: 600;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
		transition: background 0.15s;
		white-space: nowrap;
	}
	.tooltip-btn:hover {
		background: #79b8ff;
	}

	@media (max-width: 767px) {
		.diff-viewer {
			font-size: 11px;
		}
		.file-header {
			padding: 6px 10px;
			font-size: 12px;
		}
		.hunk-header {
			padding: 4px 10px;
			font-size: 11px;
		}
		.diff-line {
			padding: 1px 8px 1px 0;
		}
		.line-number {
			width: 28px;
			min-width: 28px;
			padding-right: 4px;
			font-size: 10px;
		}
		.tooltip-btn {
			padding: 8px 14px;
			font-size: 13px;
		}
	}
</style>
