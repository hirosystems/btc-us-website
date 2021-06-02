<script>
	export let title = '';
	export let confirm = '';
	export let cancel = '';
	import {createEventDispatcher} from 'svelte';
	const dispatch = createEventDispatcher();
</script>
<style>
	#modal{
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		background-color: rgba(0,0,0,.5);
		z-index: 1000;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: auto;
	}
	#modal>div{
		background-color: var(--black);
		padding: 2em;
		margin: 1em;
		width: 100%;
		box-sizing: border-box;
		max-width: 30em;
		box-shadow: 0px 0px 1em #000;
	}
	#modal .text{
		margin-bottom: 2em;
	}
	#modal .buttons span{
		margin-right: .5em;
	}
</style>
<div id="modal">
	<div>
		{#if title}
			<h1>{title}</h1>
		{/if}
		<div class="text">
			<slot/>
		</div>
		<div class="buttons">
			{#if confirm}
				<span class="button" on:click={() => dispatch('confirm')}>{confirm}</span>
			{/if}
			{#if cancel}
				<span class="button danger" on:click={() => dispatch('cancel')}>{cancel}</span>
			{/if}
		</div>
	</div>
</div>