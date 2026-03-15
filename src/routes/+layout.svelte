<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="app-layout">
	{@render children()}
</div>

<style>
	.app-layout {
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
