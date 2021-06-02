import {writable,get} from 'svelte/store';
import {AppConfig,UserSession} from '@stacks/auth';
import {Storage} from '@stacks/storage';
import {decodeToken} from 'jsontokens';

export const app_config = new AppConfig(['store_write']);
export const stacks_session = new UserSession({appConfig:app_config});
const gaia_storage = new Storage({userSession:stacks_session});

export const session = writable({signed_in:null});

export function session_get()
	{
	return get(session);
	}

export function identity_address()
	{
	let session = session_get();
	return session && session.user_data && session.user_data.identityAddress;
	}

export function stx_address()
	{
	let session = session_get();
	return session
		&& session.user_data
		&& session.user_data.profile
		&& session.user_data.profile.stxAddress
		&& (process.env.NETWORK === 'mainnet'
			? session.user_data.profile.stxAddress.mainnet
			: session.user_data.profile.stxAddress.testnet)
		|| '';
	}

export function username()
	{
	let session = session_get();
	return session && session.user_data && session.user_data.username;
	}

export function gaia()
	{
	return gaia_storage;
	}

export async function file(path,type,update)
	{
	if (typeof window === 'undefined')
		return;
	if (update)
		{
		switch (type)
			{
			case 'application/json':
				update = JSON.stringify(update);
				break;
			default:
				console.warn(`Unknown data type ${type}`);
			}
		return await gaia_storage.putFile(path,update);
		}
	let content = await gaia_storage.getFile(path);
	switch (type)
		{
		case 'application/json':
			return JSON.parse(content);
		}
	return content;
	}

export async function file_safe(path,type,update)
	{
	try
		{
		return await file(path,type,update);
		}
	catch (error)
		{
		return null;
		}
	}

export async function json(path,update)
	{
	return await file(path,'application/json',update);
	}

export async function json_safe(path,update)
	{
	return await file_safe(path,'application/json',update);
	}

export async function delete_file(path)
	{
	return await gaia_storage.deleteFile(path);
	}

export async function file_url(path)
	{
	return await gaia_storage.getFileUrl(path);
	}

export async function delete_file_safe(path)
	{
	try
		{
		return await gaia_storage.deleteFile(path);
		}
	catch (error)
		{
		return null;
		}
	}

export async function check()
	{
	if (stacks_session.isSignInPending())
		stacks_session.user_data = await stacks_session.handlePendingSignIn();
	else if (stacks_session.isUserSignedIn())
		stacks_session.user_data = stacks_session.loadUserData() || {};
	stacks_session.signed_in = !!stacks_session.user_data;
	if (stacks_session.signed_in)
		{
		if (!stacks_session.user_data.username)
			stacks_session.user_data.username = '';
		if (stacks_session.user_data.authResponseToken)
			{
			const token = decodeToken(stacks_session.user_data.authResponseToken);
			stacks_session.user_data.profile_url = token && token.payload && token.payload.profile_url;
			}
		}
	stacks_session.gaia = gaia_storage;
	session.set(stacks_session);
	}
	
export function sign_out()
	{
	if (typeof window === 'undefined')
		return;
	session.set({signed_in:false});
	if (stacks_session)
		stacks_session.store.deleteSessionData();
	else
		localStorage.removeItem('blockstack-session');
	}

export const stacks_connect_options = 
	{
	appDetails:
		{
		name: 'btc.us',
		icon: (process.browser ? document.location.origin : '')+'/favicon.svg'
		},
	userSession: stacks_session,
	onFinish: () =>
		{
		stacks_session.user_data = stacks_session.loadUserData();
		const token = decodeToken(stacks_session.user_data.authResponseToken);
		stacks_session.user_data.profile_url = token && token.payload && token.payload.profile_url;
		stacks_session.signed_in = true;
		if (!stacks_session.user_data)
			stacks_session.user_data = {};
		stacks_session.gaia = gaia_storage;
		session.set(stacks_session);
		}
	};
