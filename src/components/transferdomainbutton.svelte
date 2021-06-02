<script>
	export let domain;
	export let class_name = '';
	
	import {createEventDispatcher} from 'svelte';
	import Modal from './modal.svelte';
	import {stx_address} from '../session';
	import {t} from '../lib/i18n';

	import {validateStacksAddress} from '@stacks/transactions';

	const dispatch = createEventDispatcher();
	let open = false;

	let address = '';
	let valid_address = false;
	const current_address = stx_address();
	const mainnet = process.env.NETWORK === 'mainnet';

	function validate_address(address)
		{
		return validateStacksAddress(address) && address !== current_address && (address.substr(0,2) !== 'ST' || !mainnet);
		}

	function confirm(event)
		{
		if (validate_address(address))
			{
			open = false;
			dispatch(event.type,{domain,address});
			}
		}
</script>
<style>
	p{
		margin-bottom: 1em;
	}
	input{
		background-color: var(--white);
		border-radius: 999px;
		font-size: .75em;
		padding: 1em 1em 1em 3.5em;
		width: 100%;
		box-sizing: border-box;
		background-size: 1.25em;
		background-repeat: no-repeat;
		background-position: left 1.25em center;
		border: none;
	}
	input.valid{
		background-image: url('/input/tick.svg');
	}
	input.invalid{
		background-image: url('/input/cross.svg');
	}
</style>
<span class="button {class_name}" on:click={() => open = true}>
	{$t('components.button_transfer_domain')}
</span>
{#if open}
	<Modal
		title={$t('components.button_transfer_domain')}
		on:confirm={confirm}
		on:cancel={() => open = false}
		confirm={$t('components.button_transfer')}
		cancel={$t('components.button_cancel')}>
		<p>
			{$t('components.transfer_domain_info',{values:{domain}})}
		</p>
		<input type="text" placeholder={$t('components.stx_address')} class:valid={valid_address} class:invalid={!valid_address && address} bind:value={address} on:input={event => valid_address = validate_address(event.target.value)} />
	</Modal>
{/if}
