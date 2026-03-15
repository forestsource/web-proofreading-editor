<script lang="ts">
	import { settings, openFile } from '$lib/stores';

	let { open = $bindable(false) }: { open: boolean } = $props();
	let files = $state<string[]>([]);
	let query = $state('');
	let loadingFiles = $state(false);
	let errorMsg = $state('');
	let expandedDirs = $state<Set<string>>(new Set());

	interface TreeNode {
		name: string;
		path: string;
		isDir: boolean;
		children: TreeNode[];
	}

	function buildTree(paths: string[]): TreeNode[] {
		const root: TreeNode[] = [];
		const dirMap = new Map<string, TreeNode>();

		for (const filePath of paths) {
			const parts = filePath.split('/');
			let currentChildren = root;
			let currentPath = '';

			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				currentPath = currentPath ? currentPath + '/' + part : part;
				const isLast = i === parts.length - 1;

				if (isLast) {
					currentChildren.push({ name: part, path: filePath, isDir: false, children: [] });
				} else {
					let dirNode = dirMap.get(currentPath);
					if (!dirNode) {
						dirNode = { name: part, path: currentPath, isDir: true, children: [] };
						dirMap.set(currentPath, dirNode);
						currentChildren.push(dirNode);
					}
					currentChildren = dirNode.children;
				}
			}
		}

		sortTree(root);
		return root;
	}

	function sortTree(nodes: TreeNode[]) {
		nodes.sort((a, b) => {
			if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
			return a.name.localeCompare(b.name);
		});
		for (const n of nodes) {
			if (n.isDir) sortTree(n.children);
		}
	}

	let filtered = $derived.by(() => {
		if (!query.trim()) return files;
		const q = query.toLowerCase();
		return files.filter((f) => f.toLowerCase().includes(q));
	});

	let tree = $derived(buildTree(filtered));
	let isSearching = $derived(query.trim().length > 0);

	function isExpanded(path: string): boolean {
		if (isSearching) return true;
		return expandedDirs.has(path);
	}

	function toggleDir(path: string) {
		const next = new Set(expandedDirs);
		if (next.has(path)) {
			next.delete(path);
		} else {
			next.add(path);
		}
		expandedDirs = next;
	}

	$effect(() => {
		if (open && $settings.repoPath) {
			loadFiles();
		}
	});

	async function loadFiles() {
		loadingFiles = true;
		errorMsg = '';
		expandedDirs = new Set();
		query = '';
		try {
			const res = await fetch(`/api/repo/browse?repo=${encodeURIComponent($settings.repoPath)}`);
			const data = await res.json();
			if (data.error) throw new Error(data.error);
			files = data.files;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : String(err);
		} finally {
			loadingFiles = false;
		}
	}

	async function selectFile(path: string) {
		await openFile(path);
		open = false;
	}

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

{#snippet treeNodes(nodes: TreeNode[], depth: number)}
	{#each nodes as node}
		{#if node.isDir}
			<button
				class="tree-item dir"
				style="padding-left: {12 + depth * 16}px"
				onclick={() => toggleDir(node.path)}
			>
				<span class="tree-icon">{isExpanded(node.path) ? '▾' : '▸'}</span>
				<span class="dir-icon">📁</span>
				<span class="tree-name">{node.name}</span>
			</button>
			{#if isExpanded(node.path)}
				{@render treeNodes(node.children, depth + 1)}
			{/if}
		{:else}
			<button
				class="tree-item file"
				style="padding-left: {12 + depth * 16}px"
				onclick={() => selectFile(node.path)}
			>
				<span class="tree-icon-spacer"></span>
				<span class="file-icon">📄</span>
				<span class="tree-name">{node.name}</span>
			</button>
		{/if}
	{/each}
{/snippet}

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={handleBackdrop}>
		<div class="modal">
			<div class="modal-header">
				<h3>ファイルを開く</h3>
				<button class="btn-close" onclick={() => (open = false)}>✕</button>
			</div>
			<div class="search-bar">
				<input
					type="text"
					bind:value={query}
					placeholder="ファイル名で検索..."
					autofocus
				/>
			</div>
			<div class="file-list">
				{#if loadingFiles}
					<div class="status-msg">読み込み中...</div>
				{:else if errorMsg}
					<div class="status-msg error">{errorMsg}</div>
				{:else if filtered.length === 0}
					<div class="status-msg">
						{query ? '一致するファイルがありません' : 'ファイルが見つかりません'}
					</div>
				{:else}
					{@render treeNodes(tree, 0)}
					{#if filtered.length > 5000}
						<div class="status-msg">表示上限に達しました — 検索で絞り込んでください</div>
					{/if}
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
		align-items: flex-start;
		justify-content: center;
		padding-top: 10vh;
		z-index: 100;
	}
	.modal {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 10px;
		width: 600px;
		max-height: 70vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-color);
	}
	.modal-header h3 {
		margin: 0;
		font-size: 15px;
	}
	.btn-close {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 16px;
	}
	.search-bar {
		padding: 8px 12px;
		border-bottom: 1px solid var(--border-color);
	}
	.search-bar input {
		width: 100%;
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 8px 10px;
		border-radius: 6px;
		font-size: 13px;
		outline: none;
		font-family: inherit;
	}
	.search-bar input:focus {
		border-color: var(--accent);
	}
	.file-list {
		flex: 1;
		overflow-y: auto;
		padding: 4px 0;
	}
	.tree-item {
		display: flex;
		align-items: center;
		gap: 4px;
		width: 100%;
		padding-top: 4px;
		padding-bottom: 4px;
		padding-right: 12px;
		background: none;
		border: none;
		color: var(--text-primary);
		cursor: pointer;
		font-size: 13px;
		text-align: left;
		font-family: inherit;
	}
	.tree-item:hover {
		background: var(--bg-tertiary);
	}
	.tree-item.dir {
		font-weight: 500;
	}
	.tree-icon {
		width: 12px;
		font-size: 10px;
		text-align: center;
		flex-shrink: 0;
		color: var(--text-secondary);
	}
	.tree-icon-spacer {
		width: 12px;
		flex-shrink: 0;
	}
	.dir-icon, .file-icon {
		font-size: 14px;
		flex-shrink: 0;
		width: 18px;
		text-align: center;
	}
	.tree-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.status-msg {
		text-align: center;
		color: var(--text-secondary);
		padding: 20px 16px;
		font-size: 13px;
	}
	.status-msg.error {
		color: var(--danger);
	}

	@media (max-width: 767px) {
		.modal-backdrop {
			padding-top: 0;
			align-items: stretch;
		}
		.modal {
			width: 100%;
			max-height: 100vh;
			border-radius: 0;
			border: none;
		}
		.tree-item {
			padding-top: 8px;
			padding-bottom: 8px;
		}
	}
</style>
