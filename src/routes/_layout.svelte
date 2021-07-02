<script context="module">
	import {wait_locale} from '../lib/i18n';
	
	export async function preload()
		{
		return await wait_locale();
		}
</script>
<script>
	import {stores} from '@sapper/app';
	import Nav from '../components/nav.svelte';
	import Footer from '../components/footer.svelte';
	import {locale,t} from '../lib/i18n';
	export let segment;
	
	const {page} = stores();
	$: typeof document !== 'undefined' && (document.dir = $t('direction',{default:'ltr'}), document.documentElement.lang = $locale);
</script>
<Nav {segment}/>
<svelte:head>
	<title>{$t('title.'+(segment||'index'),{default:''})}</title>
</svelte:head>
<main class:front={!segment && !$page.error}>
	<slot/>
</main>
<Footer/>
