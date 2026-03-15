<script lang="ts">
	import { openedFilePath, openedFileContent, selectedHunkId, selectedText, comments, focusedCommentId, jumpHighlightActive, closeFile } from '$lib/stores';

	let selecting = $state(false);
	let selectionStartIdx = $state<number>(-1);
	let selectionEndIdx = $state<number>(-1);
	let showTooltip = $state(false);
	let tooltipTop = $state(0);
	let tooltipRight = $state(0);
	let viewerEl = $state<HTMLElement | null>(null);

	let lines = $derived(($openedFileContent ?? '').split('\n'));
	let hunkId = $derived($openedFilePath ? `file:${$openedFilePath}:0` : null);

	function getSelectionRange(): [number, number] {
		const start = Math.min(selectionStartIdx, selectionEndIdx);
		const end = Math.max(selectionStartIdx, selectionEndIdx);
		return [start, end];
	}

	function isLineSelected(lineIdx: number): boolean {
		if (selectionStartIdx < 0 || selectionEndIdx < 0) return false;
		const [start, end] = getSelectionRange();
		return lineIdx >= start && lineIdx <= end;
	}

	// Focused comment highlight
	let focusedComment = $derived.by(() => {
		if (!$focusedCommentId) return null;
		return $comments.find((c) => c.id === $focusedCommentId) ?? null;
	});

	function isFocusedLine(lineIdx: number): boolean {
		if (!focusedComment || !hunkId) return false;
		if (focusedComment.hunkId !== hunkId) return false;
		if (!focusedComment.selectedText) return true;

		const selectedLines = focusedComment.selectedText.split('\n');
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

	function isJumpTargetLine(lineIdx: number): boolean {
		if (focusedComment) return false;
		if (!$jumpHighlightActive || !hunkId) return false;
		if ($selectedHunkId !== hunkId) return false;

		if ($selectedText) {
			const selectedLines = $selectedText.split('\n');
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
		return true;
	}

	function handleMouseDown(e: MouseEvent, lineIdx: number) {
		if (e.button !== 0) return;
		e.preventDefault();
		selecting = true;
		selectionStartIdx = lineIdx;
		selectionEndIdx = lineIdx;
		showTooltip = false;
	}

	function handleMouseOver(lineIdx: number) {
		if (!selecting) return;
		selectionEndIdx = lineIdx;
	}

	function handleMouseUp(e: MouseEvent) {
		if (!selecting) return;
		selecting = false;
		if (selectionStartIdx < 0 || selectionEndIdx < 0) return;
		showTooltip = true;

		const [startIdx] = getSelectionRange();
		const contentEl = (e.target as HTMLElement).closest('.file-content');
		if (contentEl) {
			const lineEls = contentEl.querySelectorAll('.file-line');
			const startLineEl = lineEls[startIdx];
			if (startLineEl && viewerEl) {
				const lineRect = startLineEl.getBoundingClientRect();
				const viewerRect = viewerEl.getBoundingClientRect();
				tooltipTop = lineRect.top - viewerRect.top + viewerEl.scrollTop - 30;
				tooltipRight = 8;
			}
		}
	}

	function handleAddCommentFromSelection() {
		if (!hunkId) return;
		const [start, end] = getSelectionRange();
		const text = lines.slice(start, end + 1).join('\n');
		$selectedText = text;
		$selectedHunkId = hunkId;
		clearSelection();
	}

	function clearSelection() {
		selectionStartIdx = -1;
		selectionEndIdx = -1;
		showTooltip = false;
	}

	function handleGlobalClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.selection-tooltip') && !target.closest('.file-line')) {
			clearSelection();
		}
	}

	// Auto-scroll to focused line
	$effect(() => {
		if (focusedComment) {
			const el = document.querySelector('.file-line.line-focused');
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
	});

	// Auto-clear jump highlight
	$effect(() => {
		if ($jumpHighlightActive) {
			const timer = setTimeout(() => {
				$jumpHighlightActive = false;
			}, 1500);
			return () => clearTimeout(timer);
		}
	});
</script>

<svelte:window onmouseup={handleMouseUp} onclick={handleGlobalClick} />

<div class="file-viewer" bind:this={viewerEl}>
	{#if $openedFilePath}
		<div class="file-header">
			<span class="file-badge">FILE</span>
			<span class="file-path">{$openedFilePath}</span>
			<button class="btn-close-file" onclick={closeFile} title="ファイルを閉じる">✕</button>
		</div>
		<div class="file-content">
			{#each lines as line, lineIdx}
				{@const lineFocused = isFocusedLine(lineIdx)}
				{@const lineJumpTarget = isJumpTargetLine(lineIdx)}
				<div
					class="file-line"
					class:line-selected={isLineSelected(lineIdx)}
					class:line-focused={lineFocused || lineJumpTarget}
					class:jump-highlight={(lineFocused || lineJumpTarget) && $jumpHighlightActive}
					role="presentation"
					onmousedown={(e) => handleMouseDown(e, lineIdx)}
					onmouseover={() => handleMouseOver(lineIdx)}
				>
					<span class="line-number">{lineIdx + 1}</span>
					<span class="line-text">{line}</span>
				</div>
			{/each}
		</div>

		{#if showTooltip}
			<div class="selection-tooltip" style="top: {tooltipTop}px; right: {tooltipRight}px;">
				<button class="tooltip-btn" onclick={handleAddCommentFromSelection}>
					+ コメント
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.file-viewer {
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
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.file-badge {
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 3px;
		background: var(--accent);
		color: #fff;
		font-weight: 700;
		letter-spacing: 0.5px;
		flex-shrink: 0;
	}
	.file-path {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.btn-close-file {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 14px;
		padding: 2px 6px;
		border-radius: 3px;
		flex-shrink: 0;
	}
	.btn-close-file:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}
	.file-content {
		padding: 0;
		user-select: none;
	}
	.file-line {
		padding: 1px 16px 1px 0;
		white-space: pre-wrap;
		word-break: break-all;
		display: flex;
		align-items: baseline;
		cursor: text;
	}
	.file-line:hover {
		background: rgba(255, 255, 255, 0.03);
	}
	.file-line.line-selected {
		background: rgba(88, 166, 255, 0.25) !important;
		outline: 1px solid rgba(88, 166, 255, 0.4);
	}
	.file-line.line-focused {
		border-left: 3px solid var(--warning) !important;
		background: rgba(227, 179, 65, 0.12) !important;
	}
	.file-line.jump-highlight {
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
		width: 48px;
		min-width: 48px;
		text-align: right;
		padding-right: 12px;
		color: var(--text-secondary);
		opacity: 0.5;
		font-size: 11px;
		user-select: none;
		pointer-events: none;
	}
	.line-text {
		display: inline;
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
		.file-viewer {
			font-size: 11px;
		}
		.file-header {
			padding: 6px 10px;
			font-size: 12px;
		}
		.file-line {
			padding: 1px 8px 1px 0;
		}
		.line-number {
			width: 32px;
			min-width: 32px;
			padding-right: 6px;
			font-size: 10px;
		}
		.tooltip-btn {
			padding: 8px 14px;
			font-size: 13px;
		}
	}
</style>
