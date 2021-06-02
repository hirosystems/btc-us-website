<script>
	import {t} from '../lib/i18n';
	import DomainVisitField from '../components/domainvisitfield.svelte';
</script>
<svelte:head>
	<title>{$t('title.web_bridge')}</title>
</svelte:head>
<style>
	h1:first-of-type{
		margin-top: 1em;
	}
</style>
<article>
	<section>
		<DomainVisitField/>
		<h1>{$t('title.web_bridge')}</h1>
		<p>{$t('page.web_bridge.intro')}</p>
		<h1>{$t('page.web_bridge.how_to_use')}</h1>

		<h2>{$t('page.web_bridge.method1')}</h2>
		{@html $t('page.web_bridge.method1_body')}

		<h2>{$t('page.web_bridge.method2')}</h2>
		{@html $t('page.web_bridge.method2_body')}

		<h2>{$t('page.web_bridge.method3')}</h2>
		{@html $t('page.web_bridge.method3_body')}

		<h1>{$t('page.web_bridge.how_it_works')}</h1>
		{@html $t('page.web_bridge.how_it_works_body')}
	</section>
</article>
