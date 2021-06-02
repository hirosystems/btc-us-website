<script>
	import {t} from '../lib/i18n';
	export let status;
	export let error;

	const dev = process.env.NODE_ENV === 'development';
</script>
<svelte:head>
	<title>{$t('title.'+(status||'error'),{default:status})}</title>
</svelte:head>
<article>
	<section>
	<h1>{$t('title.'+(status||'error'),{default:status})}</h1>
	<p>{$t('error.'+status,{default:''})}</p>
	{#if dev && error.stack}
		<p>{status} - {error.message}</p>
		<pre>{error.stack}</pre>
	{/if}
	</section>
</article>
