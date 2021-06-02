<script>
	import {t} from '../lib/i18n';
	import {tx} from '../lib/transactions';
	
	export let tx_hash;
	export let chain = 'stx';
	export let network = process.env.NETWORK || 'mainnet';
	export let status = true;
	if (chain === 'btc' && tx_hash.length > 1 && tx_hash[1] === 'x')
		tx_hash = tx_hash.substr(2);

	let explorer;
	$: explorer = $t(`explorers.${chain}_${network}`,{values:{tx_hash,block_hash:tx_hash},default:false});

	const tx_status = (status && chain === 'stx') ? tx(tx_hash) : undefined;
</script>
<style>
	.hash::before{
		content: attr(title);
		font-size: .5em;
		opacity: .5;
		position: absolute;
		bottom: 100%;
		left: 0;
		text-transform: uppercase;
	}
	.hash{
		margin-top: .6em;
		font-size: .8em;
		padding: .15em 0;
		display: block;
		max-width: 100%;
		height: 1em;
		position: relative;
	}
	.hash a,
	.hash span.txid{
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
	}
	.hash span.status{
		user-select: none;
		font-size: .5em;
		font-weight: bold;
		padding: 0 1em .1em 2.2em;
		position: absolute;
		bottom: 100%;
		right: 0;
		background-color: #000;
		border-radius: 99px;	
		background-size: 1em;
		background-position: .75em center;
		background-repeat: no-repeat;
		color: var(--danger);
		background-image: url('/input/cross.svg');
	}
	.hash span.status.pending{
		color: var(--white);
		background-image: url('/loading_white.svg');
	}
	.hash span.status.success{
		color: var(--success);
		background-image: url('/input/tick.svg');
	}
</style>
<span class="hash {chain}" title="{$t('components.transaction_id',{values:{symbol:chain.toUpperCase()}})}">
	{#if tx_status && $tx_status}
		<span class="status {$tx_status.tx_status === 'not_found'? 'pending': $tx_status.tx_status}">{$t(`tx_status.${$tx_status.tx_status === 'not_found'? 'pending': $tx_status.tx_status}`)}</span>
	{/if}
	{#if explorer}
		<a target="_blank" href="{explorer}">{tx_hash}</a>
	{:else}
		<span class="txid">{tx_hash}</span>
	{/if}
</span>
