<script>
	export let class_name = '';
	export let hide_icon = false;
	import {stacks_connect_options} from '../session';	
	import {connect} from '../lib/connect';
</script>
<span class="button {class_name}" class:stacks_sign_in={!hide_icon} on:click={() => connect.showConnect(stacks_connect_options)}>
	<slot/>
</span>
