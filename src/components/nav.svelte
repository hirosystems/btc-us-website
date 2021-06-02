<script>
	import {t} from '../lib/i18n';
	import {session} from '../session';
	import ConnectButton from '../components/connectbutton.svelte';
	export let segment;
	segment = segment;
</script>
<nav class="main solid">
	<a href="/" class="home"><span>btc.us</span></a>{process.env.NETWORK !== 'mainnet' ? ' '+process.env.NETWORK : ''}
	<span class="spacer"></span>
	<a href="/web-bridge" class="em">Web Bridge</a>
	<a href="/#faq" class="hide_mobile">{$t('nav.faq')}</a>
	<a href="/#support" class="hide_mobile">{$t('nav.support')}</a>
	{#if $session.signed_in}
		<a href="/manage">{$t('nav.account')}</a>
	{:else}
		<ConnectButton hide_icon={true}>{$t('nav.sign_in')}</ConnectButton>
	{/if}
</nav>
