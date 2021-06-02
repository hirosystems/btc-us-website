import {readable} from 'svelte/store';

const queries = {};

export function media(query)
	{
	if (typeof window === 'undefined')
		return readable(false,() => false);
	if (!queries[query])
		{
		let mql = window.matchMedia(query);
		queries[query] = readable(mql.matches,set =>
			{
			let listener = () => set(mql.matches);
			mql.addEventListener
				? mql.addEventListener('change',listener)
				: mql.addListener(listener);
			return () =>
				{
				mql.removeEventListener
					? mql.removeEventListener('change',listener)
					: mql.removeListener('change',listener);
				delete queries[query];
				};
			});
		}
	return queries[query];
	}
