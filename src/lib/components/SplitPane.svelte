<script lang="ts">
	import type { Snippet } from 'svelte';

	let { left, right, leftWidth = $bindable(60) }: { left: Snippet; right: Snippet; leftWidth?: number } = $props();
	let dragging = $state(false);
	let containerRef: HTMLDivElement | undefined = $state();
	let activePane = $state<'left' | 'right'>('left');
	let isMobile = $state(false);

	function checkMobile() {
		isMobile = window.innerWidth < 768;
	}

	$effect(() => {
		checkMobile();
		const handler = () => checkMobile();
		window.addEventListener('resize', handler);
		return () => window.removeEventListener('resize', handler);
	});

	function onMouseDown() {
		dragging = true;
	}

	function onMouseMove(e: MouseEvent) {
		if (!dragging || !containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		const pct = ((e.clientX - rect.left) / rect.width) * 100;
		leftWidth = Math.max(20, Math.min(80, pct));
	}

	function onMouseUp() {
		dragging = false;
	}

	function onTouchStart(e: TouchEvent) {
		dragging = true;
	}

	function onTouchMove(e: TouchEvent) {
		if (!dragging || !containerRef) return;
		const touch = e.touches[0];
		const rect = containerRef.getBoundingClientRect();
		const pct = ((touch.clientX - rect.left) / rect.width) * 100;
		leftWidth = Math.max(20, Math.min(80, pct));
	}

	function onTouchEnd() {
		dragging = false;
	}
</script>

<svelte:window onmousemove={onMouseMove} onmouseup={onMouseUp} ontouchmove={onTouchMove} ontouchend={onTouchEnd} />

{#if isMobile}
	<div class="mobile-pane">
		<div class="mobile-tabs">
			<button class="mobile-tab" class:active={activePane === 'left'} onclick={() => (activePane = 'left')}>
				コード
			</button>
			<button class="mobile-tab" class:active={activePane === 'right'} onclick={() => (activePane = 'right')}>
				コメント
			</button>
		</div>
		<div class="mobile-content">
			{#if activePane === 'left'}
				<div class="mobile-panel">
					{@render left()}
				</div>
			{:else}
				<div class="mobile-panel">
					{@render right()}
				</div>
			{/if}
		</div>
	</div>
{:else}
	<div class="split-pane" bind:this={containerRef} style="--left-width: {leftWidth}%">
		<div class="split-left">
			{@render left()}
		</div>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="split-divider" onmousedown={onMouseDown} ontouchstart={onTouchStart} role="separator" tabindex="-1"></div>
		<div class="split-right">
			{@render right()}
		</div>
	</div>
{/if}

<style>
	.split-pane {
		display: flex;
		height: 100%;
		overflow: hidden;
	}
	.split-left {
		width: var(--left-width);
		overflow: auto;
		flex-shrink: 0;
	}
	.split-right {
		flex: 1;
		overflow: auto;
	}
	.split-divider {
		width: 4px;
		cursor: col-resize;
		background: var(--border-color);
		flex-shrink: 0;
		transition: background 0.15s;
		touch-action: none;
	}
	.split-divider:hover {
		background: var(--accent);
	}

	/* Mobile tabs layout */
	.mobile-pane {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}
	.mobile-tabs {
		display: flex;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-color);
		flex-shrink: 0;
	}
	.mobile-tab {
		flex: 1;
		padding: 10px 0;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		transition: color 0.15s, border-color 0.15s;
	}
	.mobile-tab.active {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}
	.mobile-content {
		flex: 1;
		overflow: hidden;
	}
	.mobile-panel {
		height: 100%;
		overflow: auto;
	}
</style>
