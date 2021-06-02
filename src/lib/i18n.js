import {writable,derived} from 'svelte/store';
import {set_cookie,get_cookie} from './utils';

export const default_locale = 'en-us';
export const locale = writable(null);
export const is_loading = writable(true);
export const dictionary = writable({});

import locales from '../../messages/locales.json';
export {locales};

let current_locale = null;

let locale_cache = {};
import en from '../../messages/en-us.json';
locale_cache[default_locale] = en;

const locale_set = locale.set;
locale.set = function(locale)
	{
	locale = locale.toLowerCase();
	if (!locales[locale])
		locale = default_locale;
	return locale_set(locale);
	};

locale.subscribe(async value =>
	{
	if (!value)
		return;
	if (typeof window !== 'undefined')
		set_cookie('locale',value);
	if (!locale_cache[value])
		{
		is_loading.set(true);
		locale_cache[value] = await import(`../../messages/${value}.json`);
		}
	current_locale = value;
	dictionary.set(locale_cache[value]);
	is_loading.set(false);
	});
	
export function start_client()
	{
	locale.set(get_cookie('locale') || navigator.language);
	}
	
export function i18n_middleware()
	{	
	return (request,response,next) =>
		{
		let client_locale = get_cookie('locale',request.headers.cookie);
		if (!client_locale)
			{
			if (request.headers['accept-language'])
				{
				const lang = request.headers['accept-language'].split(',')[0].trim();
				if (lang.length > 1)
					client_locale = lang;
				}
			else
				client_locale = default_locale;
			}
		if (client_locale !== current_locale)
			locale.set(client_locale);
		next();
		};
	}

export function wait_locale()
	{
	return new Promise(resolve => 
		{
		let unsubscribe;
		let cb = loading => {!loading && resolve(), unsubscribe && unsubscribe()};
		unsubscribe = is_loading.subscribe(cb);
		});
	}

export function format(str,values)
	{
	return str.replace(/{([\$a-zA-Z0-9_-]+)}/g,(match,group) => values[group] || match);
	}

export function lookup(key,options)
	{
	if (!current_locale)
		throw new Error('No locale set');
	if (!options)
		options = {};
	let warning = false;
	let result = key.split('.').reduce((obj,i) => (obj && obj[i]) || null,locale_cache[current_locale]);
	if (result === null && current_locale !== default_locale)
		{
		result = key.split('.').reduce((obj,i) => (obj && obj[i]) || null,locale_cache[default_locale]);
		warning = true;
		}
	if (result === null || warning)
		process.env.DEV && console.warn(`[i18n] no translation for '${key}' in ${current_locale}${current_locale !== default_locale && !result ? ' or '+default_locale : ''}`);
	return (result && options.values ? format(result,options.values) : result) || options.default || key;
	}

export const translate = derived([dictionary],() => lookup);
export {translate as t};
