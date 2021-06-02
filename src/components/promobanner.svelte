<style>
	#promo{
		font-size: 1rem;
		max-width: 620px;
		margin: -.5em auto 1em;
		padding: 1.5em;
		border-radius: 2em;
		background-color: var(--black);
		border: 2px solid var(--accent-3);
		display: block;
	}
	:global(.front) #promo{
		margin-bottom: 4em;
		margin-top: -4em;
	}
</style>
<script>
	let now = +new Date();
	let promo = now < 1623049140000; //  June 6th 23:59 GMT
</script>
{#if promo}
	<a id="promo" href="//launch.btc.us" target="_blank">
		Register a domain between <strong>June 2nd and June 6th</strong> for a chance to win
		<strong>$100</strong>. Click here for more information.
	</a>
{/if}