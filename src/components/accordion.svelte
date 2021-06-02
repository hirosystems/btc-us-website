<script>
	import {slide} from 'svelte/transition';
	export let title;
	export let class_name;
	export let open = false;
	export let transition_options = {};
	export let disabled = false;
	
	function keydown(event)
		{
		if (event.keyCode === 13 || event.keyCode === 32)
			{
			event.preventDefault();
			open = !open;
			}
		}
</script>
<div class={class_name} class:open={open}>
	<div class="title" tabindex="0" on:click={() => !disabled && (open = !open)} on:keydown={keydown}>
		{title}
	</div>
	{#if open}
		<div class="content" transition:slide|local={transition_options}>
			<slot/>
		</div>
	{/if}
</div>