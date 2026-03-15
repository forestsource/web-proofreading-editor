<script lang="ts">
	import { settings, saveSettings } from '$lib/stores';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let commonInstructions = $state($settings.commonInstructions);
	let commonContext = $state($settings.commonContext);
	let parallelism = $state($settings.parallelism);

	async function handleSave() {
		await saveSettings({ commonInstructions, commonContext, parallelism });
		open = false;
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) open = false;
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={handleBackdrop} onkeydown={() => {}}>
		<div class="modal">
			<div class="modal-header">
				<h3>設定</h3>
				<button class="btn-close" onclick={() => (open = false)}>✕</button>
			</div>
			<div class="modal-body">
				<div class="field">
					<label for="common-instructions">共通命令 (system prompt)</label>
					<textarea
						id="common-instructions"
						bind:value={commonInstructions}
						placeholder="全てのClaude実行に共通で渡す命令を入力..."
						rows="4"
					></textarea>
					<span class="hint">Claude Codeの--system-promptに渡されます</span>
				</div>

				<div class="field">
					<label for="common-context">共通コンテキスト</label>
					<textarea
						id="common-context"
						bind:value={commonContext}
						placeholder="全てのClaude実行に共通で渡すコンテキスト情報..."
						rows="4"
					></textarea>
					<span class="hint">プロンプト内にコンテキストとして含まれます</span>
				</div>

				<div class="field">
					<label for="parallelism">並列度: {parallelism}</label>
					<input
						id="parallelism"
						type="range"
						min="1"
						max="10"
						bind:value={parallelism}
					/>
					<span class="hint">同時に実行するClaude Codeのプロセス数</span>
				</div>
			</div>
			<div class="modal-footer">
				<button class="btn-cancel" onclick={() => (open = false)}>キャンセル</button>
				<button class="btn-save" onclick={handleSave}>保存</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.modal {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 10px;
		width: 560px;
		max-height: 80vh;
		overflow-y: auto;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color);
	}
	.modal-header h3 {
		margin: 0;
		font-size: 16px;
	}
	.btn-close {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 16px;
	}
	.modal-body {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.field label {
		font-size: 13px;
		font-weight: 500;
	}
	textarea {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 8px 10px;
		border-radius: 6px;
		font-size: 13px;
		font-family: inherit;
		resize: vertical;
		outline: none;
	}
	textarea:focus {
		border-color: var(--accent);
	}
	input[type="range"] {
		accent-color: var(--accent);
	}
	.hint {
		font-size: 11px;
		color: var(--text-secondary);
	}
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 20px;
		border-top: 1px solid var(--border-color);
	}
	.btn-cancel {
		background: none;
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 6px 14px;
		border-radius: 6px;
		cursor: pointer;
	}
	.btn-save {
		background: var(--accent);
		color: #fff;
		border: none;
		padding: 6px 14px;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
	}

	@media (max-width: 767px) {
		.modal {
			width: calc(100vw - 24px);
			border-radius: 8px;
		}
		.modal-header {
			padding: 12px 16px;
		}
		.modal-body {
			padding: 16px;
		}
		.modal-footer {
			padding: 10px 16px;
		}
	}
</style>
