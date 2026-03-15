<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import RepoSelector from '$lib/components/RepoSelector.svelte';
	import FileTree from '$lib/components/FileTree.svelte';
	import DiffViewer from '$lib/components/DiffViewer.svelte';
	import FileViewer from '$lib/components/FileViewer.svelte';
	import CommentPanel from '$lib/components/CommentPanel.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import SplitPane from '$lib/components/SplitPane.svelte';
	import FileBrowserModal from '$lib/components/FileBrowserModal.svelte';
	import { diffFiles, loading, error, connectSSE, disconnectSSE, loadComments, history, loadDiff, saveSettings, removeHistory, openedFilePath, settings } from '$lib/stores';
	import HistoryModal from '$lib/components/HistoryModal.svelte';
	import type { HistoryEntry } from '$lib/types';

	let settingsOpen = $state(false);
	let historyOpen = $state(false);
	let fileBrowserOpen = $state(false);

	async function handleHistorySelect(entry: HistoryEntry) {
		await saveSettings({ repoPath: entry.repoPath, diffBase: entry.base, diffTarget: entry.target });
		await loadDiff(entry.repoPath, entry.base || undefined, entry.target || undefined);
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

	onMount(() => {
		connectSSE();
		loadComments();
	});

	onDestroy(() => {
		disconnectSSE();
	});
</script>

<svelte:head>
	<title>Proofreading Copilot</title>
</svelte:head>

<div class="top-bar">
	<div class="app-title">Proofreading Copilot</div>
	<div class="top-bar-actions">
		<button class="btn-icon" onclick={() => (fileBrowserOpen = true)} title="ファイルを開く" disabled={!$settings.repoPath}>
			📂
		</button>
		<button class="btn-icon" onclick={() => (historyOpen = true)} title="履歴">
			🕐
		</button>
		<button class="btn-icon" onclick={() => (settingsOpen = true)} title="設定">
			⚙
		</button>
	</div>
</div>

<RepoSelector />

{#if $error}
	<div class="error-bar">{$error}</div>
{/if}

{#if $loading}
	<div class="loading-bar">読み込み中...</div>
{/if}

<div class="main-content">
	{#if $diffFiles.length > 0 || $openedFilePath}
		<SplitPane>
			{#snippet left()}
				<div class="left-panel">
					{#if $openedFilePath}
						<FileViewer />
					{:else}
						<FileTree />
						<DiffViewer />
					{/if}
				</div>
			{/snippet}
			{#snippet right()}
				<CommentPanel />
			{/snippet}
		</SplitPane>
	{:else if !$loading}
		<div class="welcome">
			<div class="welcome-content">
				<h2>Proofreading Copilot</h2>
				<p>Gitリポジトリのパスを入力して差分を読み込んでください。</p>
				<p>差分の各セクションにコメントを追加し、Claude Codeで自動修正できます。</p>

				{#if $history.length > 0}
					<div class="history-section">
						<h3>最近開いたリポジトリ</h3>
						<ul class="history-list">
							{#each $history as entry}
								<li class="history-row">
									<button class="history-item" onclick={() => handleHistorySelect(entry)}>
										<div class="history-main">
											<span class="hist-repo-name">{repoName(entry.repoPath)}</span>
											<span class="hist-repo-path">{entry.repoPath}</span>
										</div>
										<div class="history-meta">
											<span class="hist-branches">
												{entry.base || 'HEAD'} → {entry.target || 'Working Tree'}
											</span>
											<span class="hist-date">{formatDate(entry.openedAt)}</span>
										</div>
									</button>
									<button
										class="btn-remove"
										onclick={(e) => { e.stopPropagation(); removeHistory(entry); }}
										title="削除"
									>✕</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<SettingsModal bind:open={settingsOpen} />
<HistoryModal bind:open={historyOpen} />
<FileBrowserModal bind:open={fileBrowserOpen} />

<style>
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-color);
	}
	.app-title {
		font-weight: 700;
		font-size: 15px;
		letter-spacing: -0.3px;
	}
	.top-bar-actions {
		display: flex;
		gap: 6px;
	}
	.btn-icon {
		background: none;
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		padding: 4px 8px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 16px;
	}
	.btn-icon:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}
	.error-bar {
		padding: 8px 16px;
		background: rgba(248, 81, 73, 0.1);
		color: var(--danger);
		font-size: 13px;
		border-bottom: 1px solid var(--danger);
	}
	.loading-bar {
		padding: 6px 16px;
		background: rgba(88, 166, 255, 0.1);
		color: var(--accent);
		font-size: 12px;
		border-bottom: 1px solid var(--accent);
		animation: pulse 1.5s ease-in-out infinite;
	}
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
	.main-content {
		flex: 1;
		overflow: hidden;
	}
	.left-panel {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
	.welcome {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}
	.welcome-content {
		text-align: center;
		color: var(--text-secondary);
	}
	.welcome-content h2 {
		color: var(--text-primary);
		margin-bottom: 12px;
	}
	.welcome-content p {
		margin: 4px 0;
		font-size: 14px;
	}
	.history-section {
		margin-top: 24px;
		text-align: left;
		max-width: 480px;
		margin-left: auto;
		margin-right: auto;
	}
	.history-section h3 {
		font-size: 13px;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 8px;
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
		border: 1px solid transparent;
	}
	.history-row:hover {
		background: var(--bg-tertiary);
		border-color: var(--border-color);
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
	.hist-repo-name {
		font-size: 14px;
		font-weight: 600;
	}
	.hist-repo-path {
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
	.hist-branches {
		font-size: 11px;
		color: var(--accent);
		white-space: nowrap;
	}
	.hist-date {
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
		.top-bar {
			padding: 8px 12px;
		}
		.app-title {
			font-size: 13px;
		}
		.btn-icon {
			font-size: 14px;
			padding: 6px;
		}
		.welcome-content {
			padding: 16px;
		}
		.welcome-content p {
			font-size: 13px;
		}
		.history-section {
			max-width: 100%;
			padding: 0 4px;
		}
		.history-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 6px;
		}
		.history-meta {
			flex-direction: row;
			align-items: center;
			gap: 8px;
		}
		.btn-remove {
			opacity: 1;
		}
	}
</style>
