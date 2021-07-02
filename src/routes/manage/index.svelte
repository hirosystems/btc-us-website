<script>
	import {onMount,onDestroy} from 'svelte';
	import {writable} from 'svelte/store';
	import {goto} from '@sapper/app';
	import {session,stx_address} from '../../session';
	import {
		address_name,
		revoke,
		resolve,
		ZONEFILE_RECORD_TYPES,
		ZONEFILE_TEMPLATE,
		zonefile} from '../../lib/nameservice';
	import {
		domain_status as fetch_domain_status,
		domain_transfer,
		domain_status_from_tx_history,
		domain_update,
		update_domain_status} from '../../lib/client';
	import {t} from '../../lib/i18n';
	import {tx,completed} from '../../lib/transactions';
	import {get_address_stx_balance,cached_block_time,format_date,BLOCKSTACK_GENESIS_TIME} from '../../lib/utils';

	import BN from 'bn.js';
	import {makeZoneFile} from 'zone-file';

	import Loading from '../../components/loading.svelte';
	import ConfirmButton from '../../components/confirmbutton.svelte';
	import TransferDomainButton from '../../components/transferdomainbutton.svelte';
	import TransactionsTable from '../../components/transactionstable.svelte';

	let domains_fetched = false;
	let domains = writable([]);
	let selected = null;
	let finding_tx_history = false;
	let advanced = false;

	let domain_lease_info = {};
	let domain_zonefiles = {};
	let domain_transactions = {};

	let zonefile_changed = false;
	let selected_record_type = null;
	let filter_value = '';

	let low_balance = false;

	if (!$session.signed_in)
		process.browser && goto('/');

	let domain_transfer_out_tx_subscribers = {};

	function select_domain(domain)
		{
		selected = domain;
		if (!domain_lease_info[selected])
			domain_lease_info[selected] = resolve(domain);
		if (!domain_zonefiles[selected])
			domain_zonefiles[selected] = zonefile(selected);
		if (!domain_transactions[selected])
			domain_transactions[selected] = fetch_domain_status(selected);
		zonefile_changed = false;
		domain_zonefiles[selected].then(zonefile => simple_website_redirect(zonefile,true));
		domain_transactions[selected].then(status => status && status.transfer_out && !status.transfer_out.failed && monitor_transfer(selected));
		get_address_stx_balance(stx_address()).then(balance => low_balance = balance.lt(new BN('100000')));
		}

	async function find_tx_history(domain)
		{
		finding_tx_history = true;
		domain_transactions[domain] = await domain_status_from_tx_history(domain,stx_address());
		finding_tx_history = false;
		}

	async function monitor_transfer(domain)
		{
		if (!domain_transactions[domain])
			return;
		let status = await domain_transactions[domain];
		if (!status || !status.transfer_out)
			return;
		domain_transfer_out_tx_subscribers[domain] = completed(tx(status.transfer_out.txid)).subscribe(async (transactions) =>
			{
			if (!transactions.length)
				return;
			const [transaction] = transactions;
			if (transaction.tx_status === 'success')
				documment.location.reload();
			else
				{
				domain_transfer_out_tx_subscribers[domain]();
				delete domain_transfer_out_tx_subscribers[domain];
				status.transfer_out.failed = true;
				domain_transactions[domain] = status;
				update_domain_status(domain,status);
				}
			});
		}

	async function handle_transfer(event)
		{
		let {domain,address} = event.detail;
		if (domain_transfer_out_tx_subscribers[domain])
			return;
		let result = domain_transfer(domain,address);
		if (!await result)
			return alert('Something went wrong with the transfer'); //TODO- nice error message
		domain_transactions[domain] = result;
		monitor_transfer(domain);
		}

	async function update_zonefile(domain,zonefile)
		{
		const zonefile_text = makeZoneFile(zonefile,ZONEFILE_TEMPLATE);
		let result = domain_update(domain,zonefile_text);
		if (!await result)
			return alert('Something went wrong with the update'); //TODO- nice error message
		else
			zonefile_changed = false;
		domain_transactions[domain] = result;
		}

	async function block_height_timestamp(height)
		{
		let block_time = await cached_block_time();
		return new Date(BLOCKSTACK_GENESIS_TIME + height * block_time * 1000);
		}

	function delete_record(zonefile,type,entry_index)
		{
		const deleted = zonefile[type].splice(entry_index,1);
		if (!zonefile[type].length)
			delete zonefile[type];
		if ((deleted[0] && deleted[0]) === (zonefile.$_simple_redirect && zonefile.$_simple_redirect[0]))
			{
			delete zonefile.$_simple_redirect;
			zonefile.$_editing_redirect = false;
			}
		domain_zonefiles = domain_zonefiles;
		zonefile_changed = true;
		}

	function add_record(zonefile,type)
		{
		type = type || selected_record_type;
		if (!type || !ZONEFILE_RECORD_TYPES[type])
			return;
		if (!zonefile[type])
			zonefile[type] = [];
		let template = Object.assign({},ZONEFILE_RECORD_TYPES[type]);
		zonefile[type].push(template);
		domain_zonefiles = domain_zonefiles;
		}

	function add_profile_record(zonefile)
		{
		if (!zonefile.uri)
			zonefile.uri = [];
		const profile_url = $session.user_data.profile_url;
		zonefile.uri.push({name: '_http._tcp', priority: 10, target: profile_url, weight: 1});
		zonefile_changed = true;
		domain_zonefiles = domain_zonefiles;
		}

	async function simple_website_redirect(zonefile,check_only)
		{
		if (zonefile.$_simple_redirect)
			return;
		let uri_record;
		if (zonefile.uri && zonefile.uri.length)
			uri_record = zonefile.uri.reduce((a,c) => a || c.name === '_redirect' && c,undefined);
		if (!uri_record && !check_only)
			{
			uri_record = {name: '_redirect', priority: 10, target: "", weight: 1};
			if (!zonefile.uri)
				zonefile.uri = [];
			zonefile.uri.push(uri_record);
			}
		if (!check_only)
			zonefile.a = [{name: '@', ip: process.env.REDIRECT_SERVICE_IP}];
		if (uri_record)
			zonefile.$_simple_redirect = [uri_record];
		domain_zonefiles = domain_zonefiles;
		}

	onMount(async () =>
		{
		let domain = await address_name(stx_address());
		domains_fetched = true;
		domain && domains.update(domains =>
			{
			domains.push(domain);
			select_domain(domain);
			return domains;
			});
		});

	onDestroy(() => Object.values(domain_transfer_out_tx_subscribers).map(unsubscribe => unsubscribe()));
</script>
<style>
	#manager{
		display: flex;
		align-items: flex-start;
	}
	.domains{
		flex-shrink: 0;
		width: 15rem;
	}
	.domains .domain{
		user-select: none;
	}
	.domains :global(.loading){
		margin: 2em;
	}
	.settings{
		background-color: #000;
		padding: 2em;
		flex-grow: 1;
		align-self: stretch;
	}
	.domains .domain{
		padding: .5em;
		word-break: break-all;
		cursor: pointer;
	}
	.domains .domain.selected{
		background-color: #000;
		font-weight: 600;
	}
	.options{
		display: flex;
		margin-bottom: 3em;
	}
	.options div{
		flex-grow: 1;
		flex-basis: 0;
		text-align: center;
		font-weight: bold;
		opacity: .5;
		cursor: pointer;
		user-select: none;
	}
	.options div.selected{
		opacity: 1;
	}
	table,
	table+.button.update,
	table+p+.button.update{
		margin-bottom: 2em;
	}
	table tr{
		border-bottom: 1px solid var(--black);
	}
	table tbody tr:last-of-type{
		border-bottom: none;
	}
	table:last-child{
		margin-bottom: 0;
	}
	.transactions{
		margin-bottom: 2rem;
	}
	.transactions p{
		margin-bottom: 1em;
	}
	.transactions h3,
	.danger h3{
		margin-bottom: 1rem;
	}
	.button.right{
		float: right;
	}
	.status.active{
		color: var(--success);
	}
	.low_balance{
		margin-bottom: 1em;
		font-size: .7em;
		background-color: var(--danger);
		padding: 1em;
	}
	:global(.low_balance a){
		font-weight: bold;
		color: var(--white);
		text-decoration: underline;
	}
	table.simple{
		margin-bottom: .5em;
	}
	table.simple tr th{
		width: 10em;
		font-size: .7em;
		opacity: .6;
		font-weight: bold;
	}
	table.details{
		font-size: .75em;
	}
	table label{
		display: flex;
		align-items: center;
	}
	table label span{
		font-weight: bold;
		flex-shrink: 0;
		width: 6em;
	}
	table label:first-of-type:last-of-type span{
		display: none;
	}
	table label input{
		flex-grow: 1;
		display: inline;
		word-break: break-all;
		border: none;
		background-color: transparent;
		font: inherit;
		color: inherit;
		border: 1px solid transparent;
	}
	table tr.editing label input,
	label.editing input{
		background-color: var(--white);
		color: var(--black);
		border: 1px solid var(--black);
	}
	:global(.action){
		width: 1em;
		height: 1em;
		display: inline-block;
		cursor: pointer;
		user-select: none;
		background-repeat: no-repeat;
		background-position: center;
		background-size: 90%;
	}
	.action.edit{
		background-image: url('/input/edit.svg');
	}
	:global(.action.delete){
		background-image: url('/input/delete.svg');
		background-size: 80%;
	}
	.filter{
		margin-bottom: .5em;
		font-size: .75em;
		display: flex;
		justify-content: space-between;
	}
	.filter input, .filter select{
		border: none;
		background-color: var(--white);
		padding: .5em;
		font: inherit;
		flex-grow: 1;
	}
	.filter select{
		flex-grow: 0;
		margin-left: 1em;
	}
	.filter .button{
		flex-shrink: 0;
		margin-left: 1em;
	}
	.danger :global(.button),
	.transactions :global(.button),
	.button.update{
		font-size: .75em;
	}
	h1{
		text-align: left;
		margin-bottom: .2em;
	}
	h2{
		font-size: .75rem;
		opacity: .5;
	}
	:global(.hash){
		margin-bottom: 1.5em;
	}
	:global(.hash:last-of-type){
		margin-bottom: 0;
	}
	.others{
		font-size: .6em;
		padding: .8em;
		opacity: .5;
	}
	.footnote{
		font-size: .5em;
		margin-bottom: 3em;
	}
	@media all and (max-width: 900px){
		#manager{
			flex-direction: column;
		}
		#manager .domains{
			display: flex;
			width: 100%;
			overflow: auto;
		}
		#manager .domains .domain{
			word-break: keep-all;
			flex-shrink: 0;
			padding: .5em 1em;
		}
		.filter{
			flex-direction: column-reverse;
		}
		.filter input{
			margin-top: 1em;
		}
		.filter .button{
			flex-grow: 0;
			align-self: flex-end;
		}
		.button.right{
			float: none;
			margin-bottom: 1em;
		}
		article section:first-child{
			text-align: right;
		}
	}
	.promo{
		font-size: .75rem;
		margin: -.5em auto 1em;
		padding: 1.5em;
		border-radius: 2em;
		background-color: var(--black);
		border: 2px solid var(--accent-3);
		display: block;
	}
</style>
<article>
	<section>
		<a href="/sign-out" class="button right">{$t('page.manage.sign_out')}</a>
		<h1>{$t('page.manage.account')}</h1>
		<h2>{stx_address()}</h2>
	</section>
	<div id="manager">
		<div class="domains">
			{#if domains_fetched}
				{#each $domains as domain}
					<div class="domain" class:selected={domain === selected} on:click={() => select_domain(domain)}>{domain}</div>
					<p class="others">{$t('page.manage.other_domains')}</p>
				{/each}
			{:else}
				<Loading/>
			{/if}
		</div>
		<div class="settings">
			{#if !$domains.length && domains_fetched}
				<p>{$t('page.manage.no_domains')}</p>
			{:else if !selected}
				<Loading/>
			{:else}
				{#if !domain_transfer_out_tx_subscribers[selected]}
					<div class="options">
						<div class:selected={!advanced} on:click={() => advanced = false}>{$t('page.manage.simple')}</div>
						<div class:selected={advanced} on:click={() => advanced = true}>{$t('page.manage.advanced')}</div>
					</div>
				{/if}
				{#if domain_transfer_out_tx_subscribers[selected]}
					<div class="transactions">
						<p>{$t('page.manage.domain_transferring')}</p>
						{#await domain_transactions[selected]}
							<Loading/>
						{:then status}
							<h3>{$t('page.manage.transactions')}</h3>
							<TransactionsTable entries={status && Object.entries(status).filter(([,entry]) => entry && entry.txid)}/>
						{/await}
					</div>
				{:else if !advanced}
					{#if low_balance}
						<p class="low_balance">{@html $t('page.manage.low_balance')}</p>
					{/if}
					<table class="simple">
						<tr>
							<th>{$t('page.manage.status')}</th>
							<td>
								{#await domain_lease_info[selected]}
									<Loading/>
								{:then resolve}
									<span class="status active">{$t('page.manage.active')}</span>
									{#await block_height_timestamp(resolve['lease-ending-at'].value.value) then timestamp}
										{$t('page.manage.active_until',{values:{date:format_date(timestamp)}})}
									{/await}
								{/await}
							</td>
							<td></td>
						</tr>
						{#await domain_zonefiles[selected]}
							<tr>
								<th>{$t('page.manage.domain_redirect')}</th>
								<td><Loading/></td>
							</tr>
						{:then zonefile}
							<tr>
								<th>{$t('page.manage.domain_redirect')}</th>
								<td>
									{#if zonefile.$_simple_redirect}
										{#each zonefile.$_simple_redirect as uri_record}
											<label class:editing={zonefile.$_editing_redirect}>
												<input type="text" disabled={!zonefile.$_editing_redirect} name="redirect" bind:value={uri_record.target} on:input={() => zonefile_changed  = true} autocomplete="off"/>
											</label>
										{/each}
									{:else}
										{$t('components.none')}
									{/if}
								</td>
								<td>
									<span title="{$t('page.manage.edit')}" class="action edit" on:click={() =>
										{
										simple_website_redirect(zonefile);
										zonefile.$_editing_redirect = !zonefile.$_editing_redirect;
										}
									}></span>
								</td>
							</tr>
						{/await}
					</table>
					<p class="footnote">
						{$t('page.manage.domain_redirect_footnote')}
					</p>
					{#if zonefile_changed}
						{#await domain_zonefiles[selected] then zonefile}
							<span class="button update" on:click={() => update_zonefile(selected,zonefile)}>{$t('page.manage.save_changes')}</span>
						{/await}
					{/if}
					<div class="transactions">
						<h3>{$t('page.manage.transactions')}</h3>
						{#await domain_transactions[selected]}
							<Loading/>
						{:then status}
							<TransactionsTable entries={status && Object.entries(status).filter(([,entry]) => entry && entry.txid)}/>
							{#if !status || (!status.register && !status.transfer)}
								<p>{$t('page.manage.transaction_history_missing')}</p>
								{#if finding_tx_history}
									<Loading/>
								{:else}
									<span class="button" on:click={() => find_tx_history(selected)}>{$t('page.manage.find')}</span>
								{/if}
							{/if}
						{:catch}
							<p>{$t('page.manage.transaction_history_missing')}</p>
							{#if finding_tx_history}
								<Loading/>
							{:else}
								<span class="button" on:click={() => find_tx_history(selected)}>{$t('page.manage.find')}</span>
							{/if}
						{/await}
					</div>
					<div class="danger">
						<h3>{$t('page.manage.danger_zone')}</h3>
						<TransferDomainButton domain={selected} on:confirm={handle_transfer}/>
						<ConfirmButton class_name="danger" title={$t('page.manage.delete_domain')} on:confirm={() => revoke(selected)}>
							<p>{$t('page.manage.delete_domain_confirmation',{values:{domain:selected}})}</p>
						</ConfirmButton>
					</div>
				{:else}
					{#if low_balance}
						<p class="low_balance">{@html $t('page.manage.low_balance')}</p>
					{/if}
					{#await domain_zonefiles[selected]}
						<Loading/>
					{:then zonefile}
					<div class="filter">
						<input type="text" bind:value={filter_value} name="filter_input" placeholder="{$t('page.manage.advanced_filter')}" autocomplete="off"/>
						<select bind:value={selected_record_type}>
							<option disabled selected>Select</option>
							{#each Object.keys(ZONEFILE_RECORD_TYPES) as type}
								<option value={type}>{type.toUpperCase()}</option>
							{/each}
						</select>
						<span class="button" on:click={() => add_record(zonefile)}>{$t('page.manage.add_record')}</span>
					</div>
					<table class="details">
						<thead>
							<tr>
								<th>{$t('page.manage.name')}</th>
								<th>{$t('page.manage.type')}</th>
								<th>{$t('page.manage.record')}</th>
								<th></th>
							</tr>
						</thead>
							{#each Object.keys(zonefile).filter(a => a[0] !== '$').sort((a,b) => a.localeCompare(b)) as type}
								{#each zonefile[type] as entry, entry_index}
									{#if !filter_value || entry.name.indexOf(filter_value) !== -1}
										<tr class:editing={entry._editing}>
											<td>
												<label>
													<input type="text" disabled={!entry._editing} name="name" bind:value={entry.name} on:input={() => zonefile_changed  = true} autocomplete="off"/>
												</label>
											</td>
											<td>{type.toUpperCase()}</td>
											<td>
												{#each Object.keys(entry) as key}
													{#if key !== 'name' && key !== '_editing'}
														<label>
															<span>{key}: </span><input type="text" disabled={!entry._editing} name={key} bind:value={entry[key]} on:input={() => zonefile_changed  = true} autocomplete="off"/>
														</label>
													{/if}
												{/each}
											</td>
											<td>
												<span title="{$t('page.manage.edit')}" class="action edit" on:click={() => entry._editing = !entry._editing}></span>
												<ConfirmButton title={$t('page.manage.delete')} class_name="action delete" icon={true} on:confirm={() => delete_record(zonefile,type,entry_index)}>
												{$t('page.manage.delete_record_confirm')}
												</ConfirmButton>
											</td>
										</tr>
									{/if}
								{/each}
							{:else}
								<tr>
									<td colspan="4">{$t('page.manage.no_records')}</td>
								</tr>
							{/each}
						</table>
						{#if !zonefile.uri || !zonefile.uri.reduce((a,c) => a || c.name === '_http._tcp',false)}
							<span class="button update" on:click={() => add_profile_record(zonefile)}>{$t('page.manage.add_profile_record')}</span>
						{/if}
						{#if zonefile_changed}
							<span class="button update" on:click={() => update_zonefile(selected,zonefile)}>{$t('page.manage.save_changes')}</span>
						{/if}
					{/await}
				{/if}
			{/if}
		</div>
	</div>
</article>
