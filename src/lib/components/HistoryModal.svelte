<script lang="ts">
	import { history, removeHistory, loadDiff, saveSettings } from '$lib/stores';
	import type { HistoryEntry } from '$lib/types';

	let { open = $bindable(false) }: { open: boolean } = $props();

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) open = false;
	}

	async function handleSelect(entry: HistoryEntry) {
		open = false;
		await saveSettings({ repoPath: entry.repoPath, diffBase: entry.base, diffTarget: entry.target });
		await loadDiff(entry.repoPath, entry.base || undefined, entry.target || undefined);
	}

	function handleRemove(e: MouseEvent, entry: HistoryEntry) {
		e.stopPropagation();
		removeHistory(entry);
	}

	function formatDate(ts: number): string {
		const d = new Date(ts);
		const month = d.getMonth() + 1;
		const day = d.getDate();
		const hour = d.getHours().toString().padStart(2, '0');
		const min = d.getMinutes().toString().padStart(2, '0');
		return `${month}/${day} ${hour}:${min}`;
	}

	function repoName(repoPath: string): string {
		const parts = repoPath.replace(/\\/g, '/').split('/').filter(Boolean);
		return parts[parts.length - 1] || repoPath;
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={handleBackdrop} onkeydown={() => {}}>
		<div class="modal">
			<div class="modal-header">
				<h3>履歴</h3>
				<button class="btn-close" onclick={() => (open = false)}>✕</button>
			</div>
			<div class="modal-body">
				{#if $history.length === 0}
					<div class="empty">履歴はありません</div>
				{:else}
					<ul class="history-list">
						{#each $history as entry}
							<li class="history-row">
								<button class="history-item" onclick={() => handleSelect(entry)}>
									<div class="history-main">
										<span class="repo-name">{repoName(entry.repoPath)}</span>
										<span class="repo-path">{entry.repoPath}</span>
									</div>
									<div class="history-meta">
										<span class="branches">
											{entry.base || 'HEAD'}
											→
											{entry.target || 'Working Tree'}
										</span>
										<span class="date">{formatDate(entry.openedAt)}</span>
									</div>
								</button>
								<button
									class="btn-remove"
									onclick={(e) => handleRemove(e, entry)}
									title="削除"
								>✕</button>
							</li>
						{/each}
					</ul>
				{/if}
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
		width: 520px;
		max-height: 70vh;
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
		padding: 8px;
	}
	.empty {
		padding: 32px;
		text-align: center;
		color: var(--text-secondary);
		font-size: 14px;
	}
	.history-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.history-row {
		display: flex;
		align-items: center;
		border-radius: 6px;
	}
	.history-row:hover {
		background: var(--bg-tertiary);
	}
	.history-item {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
		min-width: 0;
		padding: 10px 12px;
		background: none;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		text-align: left;
		color: var(--text-primary);
		font-family: inherit;
	}
	.history-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.repo-name {
		font-size: 14px;
		font-weight: 600;
	}
	.repo-path {
		font-size: 11px;
		color: var(--text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.history-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
		flex-shrink: 0;
	}
	.branches {
		font-size: 11px;
		color: var(--accent);
		white-space: nowrap;
	}
	.date {
		font-size: 11px;
		color: var(--text-secondary);
	}
	.btn-remove {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 12px;
		padding: 4px 8px;
		border-radius: 4px;
		opacity: 0;
		transition: opacity 0.15s;
	}
	.history-row:hover .btn-remove {
		opacity: 1;
	}
	.btn-remove:hover {
		color: var(--danger);
		background: rgba(248, 81, 73, 0.1);
	}

	@media (max-width: 767px) {
		.modal {
			width: calc(100vw - 24px);
			max-height: 80vh;
			border-radius: 8px;
		}
		.modal-header {
			padding: 12px 16px;
		}
		.history-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 6px;
			padding: 10px;
		}
		.history-meta {
			align-items: flex-start;
			flex-direction: row;
			gap: 8px;
		}
		.btn-remove {
			opacity: 1;
		}
	}
</style>
