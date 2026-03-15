<script lang="ts">
	let {
		initialText = '',
		onsubmit,
		oncancel,
		onjump
	}: {
		initialText?: string;
		onsubmit: (text: string) => void;
		oncancel?: () => void;
		onjump?: () => void;
	} = $props();

	let text = $state(initialText);

	function handleSubmit() {
		if (!text.trim()) return;
		onsubmit(text.trim());
		text = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			handleSubmit();
		}
		if (e.key === 'Escape' && oncancel) {
			oncancel();
		}
	}
</script>

<div class="comment-editor">
	<textarea
		bind:value={text}
		onkeydown={handleKeydown}
		placeholder="指摘内容を入力... (Ctrl+Enter で送信)"
		rows="3"
	></textarea>
	<div class="editor-actions">
		{#if onjump}
			<button class="btn-jump" onclick={onjump} title="対象箇所へジャンプ">⤴ Jump</button>
		{/if}
		<div class="actions-right">
			{#if oncancel}
				<button class="btn-cancel" onclick={oncancel}>キャンセル</button>
			{/if}
			<button class="btn-submit" onclick={handleSubmit} disabled={!text.trim()}>
				追加
			</button>
		</div>
	</div>
</div>

<style>
	.comment-editor {
		padding: 8px;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--bg-primary);
	}
	textarea {
		width: 100%;
		background: transparent;
		border: none;
		color: var(--text-primary);
		font-size: 13px;
		resize: vertical;
		outline: none;
		font-family: inherit;
	}
	.editor-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 6px;
	}
	.actions-right {
		margin-left: auto;
		display: flex;
		gap: 8px;
	}
	.btn-jump {
		background: none;
		border: 1px solid var(--border-color);
		color: var(--accent);
		padding: 4px 10px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 11px;
		font-weight: 600;
	}
	.btn-jump:hover {
		background: rgba(88, 166, 255, 0.1);
		border-color: var(--accent);
	}
	.btn-cancel {
		background: none;
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 4px 12px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 12px;
	}
	.btn-submit {
		background: var(--accent);
		border: none;
		color: #fff;
		padding: 4px 12px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 12px;
	}
	.btn-submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
