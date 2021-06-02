<script>
	import {onMount} from 'svelte';
	import {goto} from '@sapper/app';
	onMount(() => goto('/'));
</script>
<a href="/">index</a>
<a href="/get">get</a>
<a href="/404.html">404</a>
<a href="/manage">Manage</a>
<a href="/success">Success</a>
<a href="/early-access">Early access</a>
<a href="/sign-out">Sign out</a>