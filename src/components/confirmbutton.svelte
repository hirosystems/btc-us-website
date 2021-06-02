<script>
	export let title = '';
	export let class_name = '';
	export let icon = false;
	
	import {createEventDispatcher} from 'svelte';
	import Modal from './modal.svelte';
	import {t} from '../lib/i18n';

	const dispatch = createEventDispatcher();
	let open = false;
</script>
<span class="{!icon?'button':''} {class_name}" on:click={() => open = true}>
	{#if !icon}{title || $t('components.button_confirm')}{/if}
</span>
{#if open}
	<Modal title={title} on:confirm={event => {open = false;dispatch(event.type)}} on:cancel={() => open = false} confirm={$t('components.button_confirm')} cancel={$t('components.button_cancel')}>
		<slot/>
	</Modal>
{/if}
