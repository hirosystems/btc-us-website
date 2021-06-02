<script>
	import {t} from '../lib/i18n';
	import {get_base_chain_block_hash} from '../lib/client';
	import TransactionHash from './transactionhash.svelte';

	export let entries = [];
</script>
<style>
	table tr th{
		width: 10em;
		font-size: .7em;
		opacity: .6;
		font-weight: bold;
	}
</style>
<table class="transactions_table">
	{#if entries && Array.isArray(entries) && entries.length}
		{#each entries as [key, entry] (key)}
			<tr>
				<th>{$t(`components.${key}`)}</th>
				<td>
					<TransactionHash tx_hash={entry.txid} chain="stx" />
					{#await get_base_chain_block_hash(entry.txid) then block_hash}
						{#if block_hash}<TransactionHash tx_hash={block_hash} chain="btc" />{/if}
					{/await}
				</td>
			</tr>
		{/each}
	{/if}
</table>