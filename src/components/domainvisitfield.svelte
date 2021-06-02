<script>
	import {t} from '../lib/i18n';
	import {filter as name_filter,DOMAIN_MAX_LENGTH} from '../lib/nameservice';
	export let value = '';

	function filter()
		{
		let caret = this.selectionStart;
		let length = this.value.length;
		this.value = value = name_filter(this.value);
		length !== this.value.length && this.setSelectionRange(caret-1,caret-1);
		}
		
	function submit()
		{
		window.open(`http://${value}.btc.us`);
		}
</script>
<style>
	form{
		display: flex;
		width: 100%;
		box-sizing: border-box;
		background: var(--white);
		padding: .1em;
		border-radius: 999px;
	}
	
	form input{
		font-size: 1rem;
		padding: 1rem 2rem;
		box-sizing: border-box;
		flex-shrink: 0;
		white-space: nowrap;
		transition: opacity 200ms linear;
	}
	
	form input[type="text"]{
		flex-grow: 1;
		border: none;
		padding-left: 1.5rem;
		width: 0;
		min-width: 0;
		background-color: transparent;
	}
</style>
<form class="search" on:submit|preventDefault={submit}>
	<input type="text" name="domain" on:input={filter} placeholder="{$t('components.domain_visit_placeholder')}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" maxlength={DOMAIN_MAX_LENGTH}/>
	<input type="submit" value="{$t('components.domain_visit_button')}" class="button">
</form>