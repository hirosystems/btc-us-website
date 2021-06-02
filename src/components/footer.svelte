<script>
	import {t,locale,locales} from '../lib/i18n';
</script>
<style>
	footer{
		max-width: 1000px;
		margin: 4em auto 2em;
		padding: 1em;
		display: flex;
		flex-wrap: wrap;
	}
	
	footer>div{
		display: flex;
		align-items: flex-start;
	}
	
	footer>div:first-child{
		padding-right: 1em;
	}
	
	footer .spacer{
		flex-grow: 1;
	}
	
	footer a{
		margin: 0 .75em;
		flex-grow: 0;
	}
	
	footer a:first-of-type{
		margin-left: 0;
	}
	
	footer a:last-of-type{
		margin-right: 0;
	}
	
	footer .languages{
		flex-basis: 100%;
		padding-top: 1em;
	}
	
	footer .language{
		margin-right: 1em;
	}
	
	footer .language:last-of-type{
		margin-right: 0;
	}
	
	@media all and (max-width: 890px){
		footer>div{
			margin-top: .5em;
			flex-basis: 100%;
			justify-content: center;
		}
		footer>div:first-child{
			margin-bottom: 1em;
		}
		footer>div:first-child{
			padding-right: 0;
		}
	}
</style>
<footer>
	<div>
		<a class="flat" href="https://stacks.co">Powered by <strong>Bitcoin</strong> + <span class="stacks">Stacks</span></a>
	</div>
	<div>
		<a class="emphasis" href="https://www.hiro.so/p/terms-privacy" target="_blank">{$t('footer.terms_privacy')}</a>
		<a class="emphasis" href="/#support">{$t('footer.support')}</a>
	</div>
	<div class="spacer"></div>
	<div>
		<a class="emphasis" href="https://discord.gg/zrvWsQC" target="_blank">Discord</a>
		<a class="emphasis" href="https://github.com/hirosystems/btc-us-website" target="_blank">GitHub</a>
		<a class="emphasis" href="https://twitter.com/stacks" target="_blank">Twitter</a>
	</div>
	<div class="languages">
		{#each Object.entries(locales) as [locale_string,language]}
			<span class="language" on:click|preventDefault={() => locale.set(locale_string)}>{language}</span>
		{/each}
	</div>
</footer>