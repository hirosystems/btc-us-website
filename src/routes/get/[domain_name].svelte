<script>
	import {stores,goto} from '@sapper/app';
	import {get} from 'svelte/store';
	
	import {address_name,available as name_available,DOMAIN_NAMESPACE,DOMAIN_COST_STX,DOMAIN_RENEWAL_PERIOD_YEARS} from '../../lib/nameservice';
	import {
		domain_purchase_prepare,
		domain_purchase_preorder,
		domain_purchase_register,
		delete_domain_status,
		domain_status} from '../../lib/client';
	import {session,username,stx_address,sign_out} from '../../session';
	import {start_stripe_session,start_coinbase_session,domain_fiat_price} from '../../lib/utils';
	import {t} from '../../lib/i18n';
	import {tx,pending,failed, succeeded} from '../../lib/transactions';
	
	import ConnectButton from '../../components/connectbutton.svelte';
	import Loading from '../../components/loading.svelte';
	import TransactionHash from '../../components/transactionhash.svelte';
	import Accordion from '../../components/accordion.svelte';
	
	const {page} = stores();
	let domain_name = get(page).params.domain_name.toLowerCase();
	if (domain_name.slice(-DOMAIN_NAMESPACE.length-1) !== `.${DOMAIN_NAMESPACE}`)
		domain_name += `.${DOMAIN_NAMESPACE}`;
	
	let step = 0;
	let payment_method = 'stx';
	let purchase_status;
	let transactions_pending, transactions_failed, transactions_succeeded;
	
	const payment_options = {
		btc: start_coinbase_session,
		usd: start_stripe_session,
		stx: domain_purchase_prepare,
	};

	async function try_again()
		{
		if (await delete_domain_status(domain_name) === null)
			return alert('Something went wrong, please try again'); //TODO- better error message
		step = 2;
		}

	async function confirm(method)
		{
		step = 3;
		if (typeof method === 'string')
			payment_method = method;
		let status;
		try
			{
			if (payment_method !== 'stx')
				localStorage.setItem('fiat_pending',domain_name);
			purchase_status = payment_options[payment_method](domain_name,stx_address());
			status = await purchase_status;
			}
		catch (error)
			{
			console.error(error);
			if (error && error.error === 8)
				{
				step = -2;
				return;
				}
			alert('Something went wrong while processing your request, please try again later.'); //TODO- show better error on screen
			step = 2;
			return;
			}
		}

	async function send_purchase_tx(func,domain)
		{
		// Glue function because onCancel is not yet implemented in Connect.
		const status = func(domain);
		await status;
		purchase_status =  status;
		}

	async function determine_step()
		{
		if (step !== 0 && step !== 1)
			return;
		if (username())
			step = -1;
		const existing_name = await address_name(stx_address());
		if (existing_name)
			step = -1;
		else
			{
			const pending_status = await domain_status(domain_name);
			if (pending_status && pending_status.preorder && !pending_status._api)
				confirm('stx');
			else
				{
				const available = await name_available(domain_name);
				if (available)
					step = 2;
				else
					step = -3;
				}
			}
		}

	$: if ($session.signed_in)
		determine_step();
	else if ($session.signed_in === false && step === 0) // null when pending
		step = 1;

	$: purchase_status && purchase_status.then(status =>
		{
		if (!status || !status.preorder || !status.register)
			return;
		let transactions = [tx(status.preorder.txid),tx(status.register.txid)];
		transactions_pending = pending(transactions);
		transactions_failed = failed(transactions);
		transactions_succeeded = succeeded(transactions);
		});
</script>
<style>
	.steps{
		display: flex;
		width: 100%;
		margin: 0 auto;
		justify-content: space-between;
		counter-reset: steps;
		text-align: center;
		position: relative;
	}
	.steps::before{
		content: '';
		display: block;
		height: .2em;
		background-color: var(--white);
		position: absolute;
		top: 1.6em;
		left: 3em;
		right: 3em;
		z-index: -1;
	}
	.steps>div::before{
		box-sizing: border-box;
		border: .2em solid var(--black);
		counter-increment: steps;
		content: counter(steps);
		display: block;
		margin: 0 auto .5em;
		border-radius: 999px;
		text-align: center;
		font-size: 1.2em;
		width: 2.8em;
		height: 2.8em;
		line-height: 2.5em;
		color: var(--black);
		background-color: var(--white);
		font-weight: bold;
	}
	.steps>div{
		width: 8em;
	}
	.steps>div.active{
		font-weight: bold;
		color: var(--accent-1);
	}
	.steps>div.active::before{
		background-color: var(--accent-1);
		color: var(--white);
	}
	.cart{
		background-color: #000;
		flex-grow: 1;
		flex-shrink: 0;
		max-width: 20rem;
		min-width: 20rem;
		align-self: flex-start;
		padding: 1em;
	}
	.columns{
		display: flex;
		justify-content: space-between;
	}
	.columns>div:first-child{
		padding-right: 1em;
	}
	.columns>div:last-child{
		text-align: right;
	}
	.divider{
		border-bottom: 1px solid var(--white);
		padding-bottom: 1.4em;
		margin-bottom: 1.4em;
	}
	h2 span{
		font-weight: normal;
		opacity: .5;
		font-size: .75em;
		padding-left: 1em;
	}
	.small{
		font-size: .6em;
	}
	.note{
		font-size: .75em;
	}
	.center_text{
		margin-bottom: 1em;
	}
	.user{
		margin-bottom: 2em;
	}
	.user p:first-child{
		margin-bottom: 0;
	}
	.confirm{
		margin-bottom: 2em;
	}
	.payment_methods{
		margin-bottom: 2em;
		display: flex;
		justify-content: center;
	}
	.payment_methods > label{
		width: 6em;
		padding: 5.75em .75em .75em .75em;
		background-size: 55%;
		background-position: center .75em;
		background-repeat: no-repeat;
		text-align: center;
		font-size: .8em;
		opacity: .6;
		margin: 0 1px;
		border: 2px solid transparent;
		cursor: pointer;
	}
	.payment_methods > label input{
		display: none;
	}
	.payment_methods > label.stx{
		background-image: url('/nexus_white.svg');
		background-size: 45%;
		background-position: center .85em;
	}
	.payment_methods > label.btc{
		background-image: url('/bitcoin.svg');
	}
	.payment_methods > label.usd{
		background-image: url('/usd.svg');
		background-size: 50%;
	}
	.payment_methods > label:hover{
		opacity: 1;
	}
	.payment_methods > label.selected{
		opacity: 1;
		border: 2px solid var(--accent-3);
		border-radius: 1em;
	}
	.payment_methods .cost{
		padding-top: .2em;
		font-size: .8em;
	}
	.button{
		margin-bottom: 2em;
	}
	.button:last-child{
		margin-bottom: 0;
	}
	.button.end{
		margin-top: 1em;
	}
	:global(.hash){
		margin-bottom: 1.5em;
	}
	article :global(.loading){
		margin-bottom: 1em;
	}
	:global(.accordion){
		font-size: .75em;
		margin-bottom: 2.25em;
	}
</style>
<svelte:head>
	<title>{$t('title.get',{values:{domain_name}})}</title>
</svelte:head>
<article>
	<section>
		<div class="steps">
			<div class:active={step <= 1}>{$t('page.get.step1')}</div>
			<div class:active={step === 2} on:click={() => step === 3 && (step = 2)}>{$t('page.get.step2')}</div>
			<div class:active={step === 3}>{$t('page.get.step3')}</div>
		</div>
	</section>
</article>
<article class="columns">
	<section>
		{#if step === -3}
			<p>{$t('page.get.no_longer_available')}</p>
		{:else if step === -2}
			<p>{$t('page.get.already_processing')}</p>
			<p><a href="/sign-out" class="button right" on:click|preventDefault={() => {sign_out();step = 1;}}>{$t('page.get.sign_out')}</a></p>
		{:else if step === -1}
			<p>{$t('page.get.already_associated')}</p>
			<p><a href="/sign-out" class="button right" on:click|preventDefault={() => {sign_out();step = 1;}}>{$t('page.get.sign_out')}</a></p>
		{:else if step === 0}
			<Loading/>
		{:else if step === 1}
			<p>{$t('page.get.sign_in_required')}</p>
			<div class="center_text">
				<ConnectButton class_name="big">{$t('page.get.sign_in')}</ConnectButton>
			</div>
			<p class="note">
				{$t('page.get.stacks_privacy_note')} <a href="https://stacks2.com/about" target="_blank">{$t('page.get.learn_more')}</a>.
			</p>
		{:else if step === 2}
			<div class="user">
				{#if $session.user_data.username}
					<p>{$t('page.get.signed_in_as')} <strong>{$session.user_data.username}</strong></p>
					<p class="small">(ID-{stx_address()})</p>
					<p class="small">{$t('page.get.wrong_account')} <a class="emphasis" href="/sign-out" on:click|preventDefault={() => {sign_out(); goto('/')}}>{$t('page.get.sign_out')}</a></p>
				{:else}
					<p>{$t('page.get.signed_in_as')} ID-{stx_address()}</p>
				{/if}
			</div>
			<div class="confirm">
				<p>{$t('page.get.purchase_confirmation')}</p>
				<p>{$t('page.get.select_payment_method')}</p>
			</div>
			<div class="payment_methods">
				{#each Object.keys(payment_options).filter(option => option === 'stx') as option}
					<label class="{option}" class:selected={payment_method === option}>
						<input type="radio" bind:group={payment_method} value={option}/>
						{$t(`components.${option}`)}
						<div class="cost">({#if option !== 'usd'}&asymp; {/if}{#if option === 'stx' && 0}{$domain_fiat_price}{:else}US$5.00{/if})</div>
					</label>
				{/each}
			</div>
			<p>Fiat and BTC payment options temporarily disabled, get <a target="_blank" href="https://coinmarketcap.com/currencies/stacks/markets/">Stacks</a>.</p>
			<div class="button" on:click={confirm}>{$t('page.get.confirm')}</div>
		{:else if step === 3}
			{#await purchase_status}
				<Loading/>
			{:then status}
				<p>
					{$t('page.get.send_two_tx')}
				</p>
				<Accordion title={$t('page.get.read_more')} class_name="accordion">
					{@html $t('page.get.send_two_tx_why')}
				</Accordion>
				<h2>1. {$t('page.get.preorder')} <span>{$t('page.get.preorder_does')}</span></h2>
				{#if !status.preorder}
					<div class="button" on:click={() => {send_purchase_tx(domain_purchase_preorder,domain_name)}}>Send</div>
				{:else}
					<TransactionHash tx_hash={status.preorder.txid} chain="stx"/>
				{/if}
				<h2>2. {$t('page.get.register')} <span>{$t('page.get.register_does')}</span></h2>
				{#if !status.register}
					<div class="button" class:disabled={!status.preorder} on:click={() => {if (status.preorder) send_purchase_tx(domain_purchase_register,domain_name)}}>Send</div>
				{:else}
					<TransactionHash tx_hash={status.register.txid} chain="stx"/>
				{/if}
			{/await}
			{#if transactions_pending}
				{#if $transactions_pending.length}
					<p>{$t('page.get.wait_for_confirmation')}</p>
				{:else if $transactions_failed.length}
					<p>{$t('page.get.transactions_failed')}</p>
					<div class="button end" on:click={try_again}>{$t('page.get.try_again')}</div>
				{:else if $transactions_succeeded.length == 2}
					<p>{$t('page.get.purchase_successful')}</p>
				{/if}
			{/if}
		{/if}
	</section>
	<section class="cart">
		<div class="columns">
			<div>{domain_name}</div>
			<div>{DOMAIN_COST_STX/1000000} STX</div>
		</div>
		<div class="columns small">
			<div>{$t('page.get.domain_registration')}</div>
		</div>
		<div class="small divider">{$t('page.get.renewal_period_years',{values:{years:DOMAIN_RENEWAL_PERIOD_YEARS}})}</div>
		<div class="small">{$t('page.get.renews_at_price',{values:{stx_price:DOMAIN_COST_STX/1000000,years:DOMAIN_RENEWAL_PERIOD_YEARS}})}</div>
	</section>
</article>