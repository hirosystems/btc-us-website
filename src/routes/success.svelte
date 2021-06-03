<script>
	import {onMount} from 'svelte';
	import {t} from '../lib/i18n';
	import {domain_status} from '../lib/client';
	import TransactionHash from '../components/transactionhash.svelte';
	import Loading from '../components/loading.svelte';

	let pending_domain;
	let status;

	async function fetch_status()
		{
		if (!pending_domain)
			return;
		status = await domain_status(pending_domain);
		if (!status || !!status.transfer || !status.transfer.txid)
			setTimeout(fetch_status,15000);
		}

	onMount(() =>
		{
		pending_domain = localStorage.getItem('fiat_pending');
		if (!pending_domain)
			return;
		fetch_status();
		});
</script>
<style>
	h2{
		margin-top: 2em;
		margin-bottom: 1.5em;
	}
	.pending :global(.loading){
		float: left;
		margin-right: .5em;
		line-height: 1em;
		vertical-align: middle;
	}
</style>
<svelte:head>
	<title>{$t('title.success')}</title>
</svelte:head>
<article>
	<section>
		<h1>{$t('title.success')}</h1>
		<p>{$t('page.success.body')}</p>
		{#if !status}
			<div class="pending"><Loading/> <p>Please wait for the transactions to appear.</p></div>
		{:else}
			{#if status}
				{#each Object.entries(status).filter(([key]) => ['preorder','register','transfer'].includes(key)) as [key,value]}
					<h2>{$t(`components.${key}`)}</h2>
					{#if value.txid}
						<TransactionHash tx_hash={value.txid}/>
					{:else}
						<Loading/>
					{/if}
				{/each}
			{/if}
		{/if}
	</section>
</article>