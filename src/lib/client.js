import {
	available,
	clean_check_domain,
	generate_zonefile_stub,
	preorder_name_hash,
	preorder,
	register,
	update,
	owns,
	BNS_CONTRACT_ADDRESS,
	BNS_CONTRACT_NAME,
	DOMAIN_NAMESPACE,
	transfer} from './nameservice';
import {json, json_safe, delete_file_safe, stacks_session} from '../session';
import {
	random_bytes,
	fetch_api_domain_status,
	get_base_chain_block_hash as get_base_chain_block_hash_util,
	get_address_transactions,
	get_address_nft_events,
	deserializeCVHex
	} from './utils';

export const STATUS_NEW = 0;
export const STATUS_PREORDER = 1;
export const STATUS_REGISTER = 2;
export const STATUS_TRANSFER_OUT = 3;

const PREORDER_EXPIRY = 86400000;

let domains_cache = null;

const tx_block_hash_cache = {};
export async function get_base_chain_block_hash(transaction_id)
	{
	if (!tx_block_hash_cache[transaction_id])
		{
		tx_block_hash_cache[transaction_id] = await json_safe(`base_block_hash_${transaction_id}`);
		if (!tx_block_hash_cache[transaction_id])
			{
			tx_block_hash_cache[transaction_id] = await get_base_chain_block_hash_util(transaction_id);
			if (tx_block_hash_cache[transaction_id])
				json_safe(`base_block_hash_${transaction_id}`,tx_block_hash_cache[transaction_id]);
			}
		}
	return tx_block_hash_cache[transaction_id];
	}

function status_file_name(domain)
	{
	return `status_${domain}.json`;
	}

export async function domain_status(domain)
	{
	domain = clean_check_domain(domain);
	const file = status_file_name(domain);
	let status = await json_safe(file);
	if (!status)
		{
		let api_status = await fetch_api_domain_status(domain);
		if (api_status && api_status.domain)
			{
			status = {
				preorder: {txid: api_status.preorder_txid},
				register: {txid: api_status.register_txid},
				transfer: {txid: api_status.transfer_txid},
				_api: true
				};
			if (status.transfer.txid)
				json_safe(file,status);
			}
		else
			return null;
		}
	return status;
	}

export async function domain_status_from_tx_history_chunk(domain,address,limit,offset,status)
	{
	domain = clean_check_domain(domain);
	const transactions = await get_address_transactions(address,limit,offset);
	if (!transactions.length)
		return false;
	if (!status)
		status = {};
	const bns_contract = `${BNS_CONTRACT_ADDRESS}.${BNS_CONTRACT_NAME}`;
	for (let i = 0 ; i < transactions.length ; ++i)
		{
		const tx = transactions[i];
		if (tx.tx_status !== 'success' || tx.tx_type !== 'contract_call' || tx.contract_call.contract_id !== bns_contract)
			continue;
		if (!status.register && tx.contract_call.function_name === 'name-register')
			{
			const [namespace_arg,name_arg,salt_arg] = tx.contract_call.function_args;
			const namespace = Buffer.from(namespace_arg.repr.substr(2),'hex').toString('ascii');
			const name = Buffer.from(name_arg.repr.substr(2),'hex').toString('ascii');
			if (`${name}.${namespace}` !== `${domain}.${DOMAIN_NAMESPACE}`)
				continue;
			status.register = {txid: tx.tx_id};
			status.salt = Buffer.from(salt_arg.repr.substr(2),'hex').toString('binary');
			}
		if (status.register && !status.preorder && tx.contract_call.function_name === 'name-preorder') // find the first successful name-preorder after name-register.
			{
			const hash = Buffer.from(tx.contract_call.function_args[0].repr.substr(2),'hex');
			const expected_hash = await preorder_name_hash(`${domain}.${DOMAIN_NAMESPACE}`,Buffer.from(status.salt,'binary'));
			if (!hash.equals(expected_hash))
				continue;
			status.preorder = {txid: tx.tx_id};
			}
		const ts = tx.burn_block_time * 1000;
		if (!status.ts || status.ts > ts)
			status.ts = ts;
		if (status.preorder && status.register)
			break;
		}
	return status;
	}

export async function domain_transfer_status_from_nft_events(domain,address,limit,offset,status)
	{
	domain = clean_check_domain(domain);
	const events = await get_address_nft_events(address,limit,offset);
	if (!events)
		return false;
	if (!status)
		status = {};
	const asset_identifier = `${BNS_CONTRACT_ADDRESS}.${BNS_CONTRACT_NAME}::names`;
	for (let i = 0 ; i < events.length ; ++i)
		{
		const event = events[i];
		if (event.recipient === address && event.asset_identifier === asset_identifier)
			{
			const tuple = deserializeCVHex(event.value.hex);
			if (tuple && tuple.data.name.buffer.toString('ascii') === domain && tuple.data.namespace.buffer.toString('ascii') === DOMAIN_NAMESPACE)
				{
				status.transfer = {txid: event.tx_id};
				break;
				}
			}
		}
	return status;
	}

export async function domain_status_from_tx_history(domain,address)
	{
	domain = clean_check_domain(domain);
	const limit = 50;
	let status = (await domain_status(domain)) || {};
	for (let offset = 0 ; !status.preorder || !status.register ; ++offset)
		{
		let chunk = await domain_status_from_tx_history_chunk(domain,address,limit,offset*limit,status);
		if (!chunk)
			break;
		status = chunk;
		++offset;
		}
	if (!Object.keys(status).length)
		{
		for (let offset = 0 ; !status.transfer ; ++offset)
			{
			let chunk = await domain_transfer_status_from_nft_events(domain,address,limit,offset*limit,status);
			if (!chunk)
				break;
			status = chunk;
			}
		}
	if (Object.keys(status).length)
		json_safe(status_file_name(domain),status);
	return status;
	}

export async function domain_purchase_prepare(domain)
	{
	domain = clean_check_domain(domain);
	if (!await available(domain))
		return false;
	const status_file = status_file_name(domain);
	let status = await json_safe(status_file);
	if (!status || (status.step === STATUS_NEW && status.ts <= (+new Date())-PREORDER_EXPIRY))
		{
		status = {step: STATUS_NEW,salt: Array.from(random_bytes(20)), ts: +new Date()};
		await json(status_file,status);
		}
	return status;
	}

export async function domain_purchase_preorder(domain)
	{
	domain = clean_check_domain(domain);
	const status_file = status_file_name(domain);
	let status = await json_safe(status_file);
	if (status && status.step === STATUS_NEW)
		{
		let tx_peorder = await preorder(domain,status.salt);
		if (!tx_peorder)
			return status;
		status.preorder = {txid: tx_peorder.txId};
		status.step = STATUS_PREORDER;
		await json(status_file,status);
		}
	return status;
	}

export async function domain_purchase_register(domain)
	{
	domain = clean_check_domain(domain);
	const status_file = status_file_name(domain);
	let status = await json_safe(status_file);
	if (status.step === STATUS_PREORDER)
		{
		const zonefile = generate_zonefile_stub(domain,stacks_session && stacks_session.user_data && stacks_session.user_data.profile_url);
		let tx_register = await register(domain,status.salt,zonefile);
		if (!tx_register)
			return status;
		status.register = {txid: tx_register.txId};
		status.step = STATUS_REGISTER;
		await json(status_file,status);
		}
	return status;
	}

export async function domain_transfer(domain,new_owner)
	{
	domain = clean_check_domain(domain);
	if (!(await owns(domain)))
		return false;
	const status = (await domain_status(domain)) || {};
	let tx_transfer = await transfer(domain,new_owner);
	if (!tx_transfer)
		return false;
	status.transfer_out = {txid: tx_transfer.txId};
	status.step = STATUS_TRANSFER_OUT;
	await json(status_file_name(domain),status);
	return status;
	}

export async function domain_update(domain,zonefile)
	{
	domain = clean_check_domain(domain);
	if (!(await owns(domain)))
		return false;
	const status = (await domain_status(domain)) || {};
	let tx_update = await update(domain,zonefile);
	if (!tx_update)
		return false;
	status.update = {txid: tx_update.txId};
	await json(status_file_name(domain),status);
	return status;
	}

export async function delete_domain_status(domain)
	{
	return await delete_file_safe(status_file_name(clean_check_domain(domain)));
	}

export async function update_domain_status(domain,status)
	{
	return await json(status_file_name(clean_check_domain(domain)),status);
	}
