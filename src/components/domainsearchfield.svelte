<script>
	import {createEventDispatcher} from 'svelte';
	import {slide} from 'svelte/transition';
	import {t} from '../lib/i18n';
	import {filter as name_filter,available as name_available,DOMAIN_MIN_LENGTH,DOMAIN_MAX_LENGTH} from '../lib/nameservice';
	import {debounce,domain_fiat_price} from '../lib/utils';
	export let value = '';
	export let small;
	export let transition_options = {};
	
	const dispatch = createEventDispatcher();
	
	let searching = false;
	let results = null;
	let do_submit = false;
	
	let search = debounce(() =>
		{
		if (!value.length)
			return;
		if (value.length < DOMAIN_MIN_LENGTH)
			{
			results = 'short';
			return;
			}
		searching = true;
		let current_value = value;
		name_available(current_value).then(result =>
			{
			if (!searching)
				return;
			results = result;
			searching = false;
			if (do_submit)
				dispatch('submit',{name:current_value,available:result});
			do_submit = false;
			});
		},750);
	
	function filter()
		{
		searching = false;
		do_submit = false;
		let caret = this.selectionStart;
		let length = this.value.length;
		this.value = value = name_filter(this.value);
		length !== this.value.length && this.setSelectionRange(caret-1,caret-1);
		!this.value.length && (results = null);
		this.value.length && search();
		}
		
	function submit()
		{
		search.now();
		do_submit = true;
		}
	
</script>
<style>
	div.domain_search{
		background-color: var(--black);
		border-radius: 1em;
		overflow: hidden;
	}
	
	form.search{
		display: flex;
		width: 100%;
		box-sizing: border-box;
		background: var(--white);
		padding: .1em .1em .1em 1.5em;
		border-radius: 999px;
		background-size: .7em;
		background-repeat: no-repeat;
		background-position: left .85em center;
		background-image: url('/input/glass_gray.svg');
	}
	
	form.search input{
		font-size: 1rem;
		padding: 1rem 2rem;
		box-sizing: border-box;
		flex-shrink: 0;
		white-space: nowrap;
		transition: opacity 200ms linear;
	}
	
	form.search input[type="text"]{
		flex-grow: 1;
		border: none;
		padding-left: 1.5rem;
		width: 0;
		min-width: 0;
		background-color: transparent;
	}
	
	div.results{
		padding: 1rem;
		font-size: 1rem;
		text-align: center;
	}
	
	div.domain_search.searching form.search,
	div.domain_search.searching.small form.search{
		background-image: url('/loading.svg') !important;
		background-size: .9em;
		background-position: left .75em center;
	}
	
	div.domain_search.searching.small form.search{
		background-position: right 2.4em center !important;
	}
	
	div.domain_search.available form.search,
	div.domain_search.available.small form.search{
		background-image: url('/input/tick.svg');
	}
	
	div.domain_search.unavailable form.search,
	div.domain_search.unavailable.small form.search{
		background-image: url('/input/cross.svg');
	}
	
	div.domain_search.available div.results{
		color: var(--success);
	}
	
	div.domain_search.unavailable form.search input[type="submit"]{
		opacity: .5;
	}
	
	div.domain_search.small form.search{
		background-image: none;
		background-position: right 2.5em center !important;
		padding-left: .1em;
	}
	
	div.domain_search.small .button{
		width: 3.5em;
		margin-right: .2em;
		padding: 0;
		box-sizing: border-box;
		background-size: 1.25em;
		background-repeat: no-repeat;
		background-position: center;
		background-image: url('/input/glass_white.svg');
	}
	</style>
<div class="domain_search {results !== null ? results && results!=='short'?'available':'unavailable' : ''}" class:searching class:small>
	<form class="search" on:submit|preventDefault={submit}>
		<input type="text" name="domain" on:input={filter} placeholder="{$t('components.domain_search_placeholder')}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" maxlength={DOMAIN_MAX_LENGTH}/>
		<input disabled={searching} type="submit" value="{small ? '' : $t('components.domain_search_button')}" class="button">
	</form>
	{#if results !== null}
		<div class="results" transition:slide|local={transition_options}>
			{#if results === 'short'}
				{$t('components.domain_too_short')}
			{:else if results}
				{$t('components.domain_available',{values:{domain_fiat_price:$domain_fiat_price}})}
			{:else}
				{$t('components.domain_unavailable')}
			{/if}
		</div>
	{/if}
</div>