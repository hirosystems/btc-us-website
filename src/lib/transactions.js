import {readable,derived,get} from 'svelte/store';
import {tx_status} from './utils';

const refresh_interval = 10000; // 10 sec
const cache_delete_interval = 300000; // 5 min
const tx_track_timers = {};
const transaction_stores = {};

async function tx_track_update(set,txid)
	{
	clearTimeout(tx_track_timers[txid]); // this is to clear the cache delete timeout (if it exists).
	const status = get(transaction_stores[txid]);
	if (!status || status.tx_status === 'pending' || status.tx_status === 'not_found')
		{
		const new_status = await tx_status(txid);
		if (new_status && ((status && status.tx_status) !== new_status.tx_status))
			set(new_status);
		if (!new_status || new_status.tx_status === 'pending' || new_status.tx_status === 'not_found')
			tx_track_timers[txid] = setTimeout(() => tx_track_update(set,txid),refresh_interval);
		}
	else
		delete tx_track_timers[txid];
	}

function tx_track_stop(txid)
	{
	clearTimeout(tx_track_timers[txid]);
	tx_track_timers[txid] = setTimeout(() =>
		{
		// delete this tx store if it is not resubscribed to within a specified amount of time.
		delete transaction_stores[txid];
		delete tx_track_timers[txid];
		},cache_delete_interval);
	}

function tx_track_start(set,txid)
	{
	tx_track_update(set,txid);
	return () => tx_track_stop(txid);
	}

export function transaction(txid)
	{
	if (!transaction_stores[txid])
		transaction_stores[txid] = readable(undefined,set => tx_track_start(set,txid));
	return transaction_stores[txid];
	}

export function filter(stores,callback)
	{
	return derived(Array.isArray(stores) ? stores : [stores],set => set.filter(callback));
	}

export function pending(stores)
	{
	return filter(stores,$tx => $tx && $tx.tx_status.includes('pending'));
	}

export function completed(stores)
	{
	return filter(stores,$tx => $tx && !$tx.tx_status.includes('pending'));
	}

export function succeeded(stores)
	{
	return filter(stores,$tx => $tx && $tx.tx_status.includes('success'));
	}

export function failed(stores)
	{
	return filter(stores,$tx => $tx && ($tx.tx_status.includes('abort') || $tx.tx_status === 'not_found' || $tx.tx_status === 'dropped_stale_garbage_collect'));
	}

export {transaction as tx};
