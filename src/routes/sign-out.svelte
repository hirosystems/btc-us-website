<script>
	import {goto} from '@sapper/app';
	import {sign_out} from '../session';
	if (typeof window !== 'undefined')
		{
		sign_out();
		goto('/');
		}
</script>