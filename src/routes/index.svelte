<script>
	import {goto} from '@sapper/app';
	import DomainSearchField from '../components/domainsearchfield.svelte';
	import Accordion from '../components/accordion.svelte';
	import {t,format} from '../lib/i18n';
	import {domain_fiat_price} from '../lib/utils';
	import {media} from '../lib/media';
	let width_705 = media('(max-width: 705px)');
</script>
<style>
	.display_columns{
		display: flex;
	}
	
	.display_columns p{
		margin-bottom: 1em;
	}
	
	.display_columns>*{
		flex-basis: 0;
		flex-grow: 1;
		flex-shrink: 0;
		padding: 1em;
	}
	
	.display_columns.social_columns{
		justify-content: center;
	}
	
	.display_columns.social_columns>*{
		flex-grow: 0;
		margin: 0 .5em;
	}
	
	.display_columns.register_steps{
		margin: 4em -1em;
	}
	
	.display_columns.register_steps>div img{
		margin-top: .9em;
		margin-bottom: 1.3em;
	}
	
	.display_columns.register_steps>div:nth-child(2) img{
		margin-top: .8em;
		margin-bottom: 2.2em;
	}
	
	.display_columns.register_steps>div:nth-child(3) img{
		margin-top: 0;
		margin-bottom: 2.2em;
	}
	
	.display_columns.social_columns a{
		padding-top: 3.5em;
		color: var(--white);
		background-size: 2.5em;
		background-repeat: no-repeat;
		background-position: top .2em center;
		transition: background-position 200ms ease-in-out;
	}
	
	.display_columns.social_columns a:hover{
		background-position: top 0em center;
	}
	
	.display_columns.social_columns a.discord{
		background-image: url('/social/discord.svg');
	}
	.display_columns.social_columns a.github{
		background-image: url('/social/github.svg');
		background-size: 2.55em;
	}
	.display_columns.social_columns a.twitter{
		background-image: url('/social/twitter.svg');
		background-size: 2.6em;
	}
	
	@media all and (max-width: 840px){		
		.display_columns{
			flex-direction: column;
			text-align: center;
		}
		
		.display_columns.social_columns a{
			margin-top: .5em;
		}
	}
</style>
<svelte:head>
	<title>btc.us</title>
</svelte:head>
<header>
	<div>
		<h1>{$t('page.index.heading')}</h1>
		<DomainSearchField small={$width_705} on:submit={result => result.detail.available && goto('/get/'+result.detail.name+'.btc')}/>
		<p>{@html $t('page.index.sub_heading')}</p>
	</div>
</header>
<article>
	<section>
		<h1>{$t('page.index.steps_title')}</h1>
		<div class="display_columns register_steps">
			<div>
				<img alt="" src="/graphics/graphic_search@2x.png" srcset="/graphics/graphic_search.png, /graphics/graphic_search@2x.png 2x"/>
				<p><strong>{$t('page.index.step1')}</strong></p>
				<p>{$t('page.index.step1_text')}</p>
			</div>
			<div>
				<img alt="" src="/graphics/graphic_register@2x.png" srcset="/graphics/graphic_register.png, /graphics/graphic_register@2x.png 2x"/>
				<p><strong>{$t('page.index.step2')}</strong></p>
				<p>{$t('page.index.step2_text')}</p>
			</div>
			<div>
				<img alt="" src="/graphics/graphic_manage@2x.png" srcset="/graphics/graphic_manage.png, /graphics/graphic_manage@2x.png 2x"/>
				<p><strong>{$t('page.index.step3')}</strong></p>
				<p>{$t('page.index.step3_text')}</p>
			</div>
		</div>
	</section>
</article>
<div class="wrapper">
	<article class="filled">
		<section>
			<h1>{$t('page.index.block_title')}</h1>
			<p class="intro">{$t('page.index.block_intro')}</p>
			<p>{$t('page.index.block_text')}</p>
			<p>
				<a class="emphasis" href="https://stacks.co/" target="_blank">{$t('page.index.block_link_text')}</a>
			</p>
		</section>
	</article>
</div>
<article class="metaverse tucked">
	<section>
		<h1>{$t('page.index.metaverse_title')}</h1>
		<p>{$t('page.index.metaverse_text')}</p>
	</section>
</article>
<article id="faq" class="anchor_offset">
	<section>
		<h1>{$t('page.index.faq_title')}</h1>
		{#each $t('page.index.faq') as {question,answer}}
			<Accordion title={question} class_name="fancy_accordion">{format(answer,{domain_fiat_price:$domain_fiat_price})}</Accordion>
		{/each}
	</section>
</article>
<div class="wrapper">
	<article class="metaverse text_centered" id="support">
		<section>
			<h1>{$t('page.index.community_title')}</h1>
			<div class="display_columns social_columns">
				<a class="discord" href="https://discord.gg/zrvWsQC" target="_blank">Discord</a>
				<a class="github" href="https://github.com/hirosystems/btc-us-website" target="_blank">GitHub</a>
				<a class="twitter" href="https://twitter.com/stacks" target="_blank">Twitter</a>
			</div>
		</section>
	</article>
</div>