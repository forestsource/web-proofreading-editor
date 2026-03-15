<script lang="ts">
	import { settings, loadDiff, saveSettings } from '$lib/stores';
	import type { GitBranch } from '$lib/types';

	let repoPath = $state('');
	let branches = $state<GitBranch[]>([]);
	let base = $state('');
	let target = $state('');
	let loadingBranches = $state(false);

	async function fetchBranches() {
		if (!repoPath) return;
		loadingBranches = true;
		try {
			const res = await fetch(`/api/git/branches?repo=${encodeURIComponent(repoPath)}`);
			const data = await res.json();
			if (data.branches) {
				branches = data.branches;
				const current = branches.find((b) => b.current);
				if (current && !base) base = current.name;
			}
		} catch {
			branches = [];
		} finally {
			loadingBranches = false;
		}
	}

	async function handleLoad() {
		if (!repoPath) return;
		await saveSettings({ repoPath, diffBase: base, diffTarget: target });
		await loadDiff(repoPath, base || undefined, target || undefined);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleLoad();
	}
</script>

<div class="repo-selector">
	<div class="input-group">
		<label for="repo-path">リポジトリ</label>
		<input
			id="repo-path"
			type="text"
			bind:value={repoPath}
			onkeydown={handleKeydown}
			onblur={fetchBranches}
			placeholder="G:\path\to\repo"
		/>
	</div>

	{#if branches.length > 0}
		<div class="input-group small">
			<label for="base-branch">Base</label>
			<select id="base-branch" bind:value={base}>
				<option value="">HEAD</option>
				{#each branches as branch}
					<option value={branch.name}>{branch.name}</option>
				{/each}
			</select>
		</div>

		<div class="input-group small">
			<label for="target-branch">Target</label>
			<select id="target-branch" bind:value={target}>
				<option value="">Working Tree</option>
				{#each branches as branch}
					<option value={branch.name}>{branch.name}</option>
				{/each}
			</select>
		</div>
	{/if}

	<button class="btn-primary" onclick={handleLoad} disabled={!repoPath}>
		{#if loadingBranches}
			読込中...
		{:else}
			差分を読み込む
		{/if}
	</button>
</div>

<style>
	.repo-selector {
		display: flex;
		align-items: flex-end;
		gap: 12px;
		padding: 12px 16px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-color);
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
	}
	.input-group.small {
		flex: 0 0 140px;
	}

	label {
		font-size: 11px;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	input, select {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 6px 10px;
		border-radius: 6px;
		font-size: 13px;
		outline: none;
	}
	input:focus, select:focus {
		border-color: var(--accent);
	}

	.btn-primary {
		background: var(--accent);
		color: #fff;
		border: none;
		padding: 6px 16px;
		border-radius: 6px;
		cursor: pointer;
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
		height: fit-content;
	}
	.btn-primary:hover {
		opacity: 0.9;
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 767px) {
		.repo-selector {
			flex-wrap: wrap;
			gap: 8px;
			padding: 10px 12px;
		}
		.input-group {
			flex: 1 1 100%;
		}
		.input-group.small {
			flex: 1 1 calc(50% - 4px);
		}
		.btn-primary {
			width: 100%;
			padding: 10px 16px;
		}
	}
</style>
