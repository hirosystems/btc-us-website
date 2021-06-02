import {readable} from 'svelte/store';
import {createHash,randomBytes} from 'crypto';
import {DOMAIN_COST_STX} from './nameservice';
import {deserializeCV} from '@stacks/transactions';
import BN from 'bn.js';

const STX_FIAT_PRICE_API = 'https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd';
const MAINNET_NODE_API = 'https://stacks-node-api.mainnet.stacks.co';
const TESTNET_NODE_API = 'https://stacks-node-api.testnet.stacks.co';

export const BLOCKSTACK_GENESIS_TIME = 1610616504000; // new Date(Date.UTC(2021,0,14,9,28,24));

const NODE_API = process.env.NETWORK === 'testnet' ? TESTNET_NODE_API : MAINNET_NODE_API;

export function debounce(func,wait,immediate)
	{
	let timeout;
	let debounced = function()
		{
		let context = this;
		let args = arguments;
		let later = function()
			{
			timeout = null;
			!immediate && func.apply(context,args);
			};
		let now = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later,wait);
		now && func.apply(context,args);
		};
	debounced.now = function()
		{
		clearTimeout(timeout);
		func.apply(debounced,arguments);
		};
	return debounced;
	}

export function cached_call(time,call)
	{
	let last_ts = -Infinity;
	let last_result;
	return () =>
		{
		let ts = +new Date();
		if (ts-time >= last_ts)
			{
			last_ts = ts;
			last_result = call();
			}
		return last_result;
		};
	}

export function hash160(buffer)
	{
	return createHash('rmd160').update(createHash('sha256').update(buffer).digest()).digest();
	}

export function random_bytes(n)
	{
	return randomBytes(n);
	}

export function get_cookie(name,cookies)
	{
	if (!cookies)
		{
		if (typeof window === 'undefined')
			return undefined;
		cookies = document.cookie;
		}
	const kv = cookies.split(';').find((part) => part.trim().startsWith(name));
	if (kv)
		{
		let values = kv.split('=')[1];
		if (values)
			return decodeURIComponent(values.trim());
		}
	return undefined;
	}

export function set_cookie(name,value,options)
	{
	if (!options)
		options = {};
	if (options.expires instanceof Date)
		options.expires = options.expires.toUTCString();
	let new_cookie = {
		[encodeURIComponent(name)]: encodeURIComponent(value),
		sameSite: 'strict',
		...options,
		};
	document.cookie = Object.entries(new_cookie).map(kv => kv.join('=')).join(';');
	}
	
export const domain_fiat_price = readable('...',set =>
	{
	const refresh_rate = 900000; // 15 minutes
	if (typeof window === 'undefined')
		return () => {};
	let latest = {};
	try
		{
		latest = JSON.parse(localStorage.getItem('domain_fiat_price'));
		if (latest.price)
			set('US$'+(latest.price / 1000000 * DOMAIN_COST_STX).toFixed(2));
		}
	catch (error){}

	if (!latest)
		latest = {};

	let fetching = false;
	let interval = setInterval(() =>
		{
		if (!fetching && (!latest.date || latest.date > Date.now() - refresh_rate))
			{
			fetching = true;
			fetch(STX_FIAT_PRICE_API)
				.then(data => data.json())
				.then(json =>
					{
					if (json && json.blockstack && json.blockstack.usd)
						{
						latest = {date: Date.now(),price:json.blockstack.usd};
						set('US$'+(latest.price / 1000000 * DOMAIN_COST_STX).toFixed(2));
						localStorage.setItem('domain_fiat_price',JSON.stringify(latest));
						}
					})
				.catch(error => process.env.DEV && console.warn('Failed to update STX price, will try again later.',error))
				.finally(() => fetching = false);
			}
		},10000);
	
	return () => clearInterval(interval);
	});

export async function block_time()
	{
	try
		{
		let result = await fetch('https://stacks-node-api.mainnet.stacks.co/extended/v1/info/network_block_times');
		let json = await result.json();
		return process.env.NETWORK === 'mainnet' ? json.mainnet.target_block_time : json.testnet.target_block_time;
		}
	catch (error)
		{
		console.warn('Could not fetch block time');
		return 600;
		}
	}

export const cached_block_time = cached_call(86400000,block_time);

export function format_date(date)
	{
	let day = date.getDate();
	if (day < 10)
		day = '0'+day;
	let month = date.getMonth()+1;
	if (month < 10)
		month = '0'+month;
	return `${day}-${month}-${date.getFullYear()}`;
	}

export async function payment_api_call(endpoint,parameters)
	{
	const url = `${process.env.PAYMENT_API_URL}/v1/${endpoint}`;
	const options = {
		method: 'POST',
		mode: 'cors',
		cache: 'no-cache',
		headers: {
			'content-type': 'application/json'
			},
		body: JSON.stringify(parameters)
		};
	const response = await fetch(url,options);
	return await response.json();
	}

export async function start_stripe_session(domain_name,stx_address)
	{
	let result = await payment_api_call('new-stripe-session',{domain_name,stx_address,return_to:document.location.href});
	if (result.error)
		throw result;
	let stripe = Stripe(process.env.STRIPE_PUBLIC_KEY);
	let stripe_redirect = await stripe.redirectToCheckout({sessionId:result.session_id});
	if (stripe_redirect.error)
		console.error(stripe_redirect.error);
	return !!stripe_redirect.error;
	}

export async function start_coinbase_session(domain_name,stx_address)
	{
	let result = await payment_api_call('new-coinbase-session',{domain_name,stx_address,return_to:document.location.href});
	if (result.error)
		throw result;
		//return console.error(result.error);
	document.location.href = result.session_url || `https://commerce.coinbase.com/charges/${result.session_id}`;
	}

export async function fetch_api_domain_status(domain_name)
	{
	try
		{
		return await payment_api_call('domain-status',{domain_name});
		}
	catch (error)
		{
		console.error(error);
		return null;
		}
	}

export async function get_base_chain_block_hash(transaction_id)
	{
	const call1 = await fetch(`${NODE_API}/extended/v1/tx/${transaction_id}`);
	const json1 = await call1.json();
	if (!json1 || !json1.block_hash)
		return false;
	const call2 = await fetch(`${NODE_API}/extended/v1/block/${json1.block_hash}`);
	const json2 = await call2.json();
	return json2 && json2.burn_block_hash;
	}

export async function fetch_zonefile(name)
	{
	try
		{
		const body = await fetch(`${NODE_API}/v1/names/${name}/zonefile`);
		const json = await body.json();
		return json.zonefile || null;
		}
	catch (response)
		{
		if (response.status === 404)
			return null;
		throw response;
		}
	}

export async function tx_status(txid)
	{
	const body = await fetch(`${NODE_API}/extended/v1/tx/${txid}`);
	if (body.status >= 400 && body.status <= 599)
		return {tx_id: txid, tx_status: 'not_found'};
	try
		{
	 	return await body.json();
		}
	catch (error)
		{
		console.error(error);
		}
	return null;
	}

export async function get_address_transactions(address,limit,offset)
	{
	const body = await fetch(`${NODE_API}/extended/v1/address/${address}/transactions?limit=${limit || 30}&offset=${offset || 0}`);
	const json = await body.json();
	return (json && json.results) || [];
	}

export async function get_address_nft_events(address,limit,offset)
	{
	const body = await fetch(`${NODE_API}/extended/v1/address/${address}/nft_events?limit=${limit || 30}&offset=${offset || 0}`);
	const json = await body.json();
	return (json && json.nft_events) || [];
	}

export async function get_address_stx_balance(address)
	{
	const body = await fetch(`${NODE_API}/extended/v1/address/${address}/balances`);
	const json = await body.json();
	return (json && json.stx && new BN(json.stx.balance)) || new BN('0');
	}

export function deserializeCVHex(hex)
	{
	if (hex.length % 2 !== 0)
		throw new Error('String length must be a multiple of two.');
	if (!hex.length)
		return null;
	return deserializeCV(Buffer.from(hex[1] === 'x' ? hex.substr(2) : hex,'hex'));
	}