import {
	uintCV,
	bufferCVFromString,
	bufferCV,
	someCV,
	callReadOnlyFunction,
	makeStandardSTXPostCondition,
	makeStandardNonFungiblePostCondition,
	FungibleConditionCode,
	NonFungibleConditionCode,
	createAssetInfo,
	PostConditionMode,
	cvToJSON,
	hash160,
	standardPrincipalCV,
	tupleCV
	} from '@stacks/transactions';
import {StacksMainnet,StacksTestnet,StacksMocknet} from '@stacks/network';
import BN from 'bn.js';
import {makeZoneFile,parseZoneFile} from 'zone-file';
import {payment_api_call, fetch_zonefile, random_bytes} from './utils';
import {stx_address,stacks_session,stacks_connect_options} from '../session';

export const DOMAIN_CHARACTER_REGEX = /[^0-9a-z_+-]/;
export const DOMAIN_VALIDITY_REGEX = /[0-9a-z_+-]{3,32}\.btc/;
export const DOMAIN_NAMESPACE = 'btc';

export const DOMAIN_MIN_LENGTH = 3;
export const DOMAIN_MAX_LENGTH = 32;
export const DOMAIN_RENEWAL_PERIOD_YEARS = 5;

export let BNS_CONTRACT_ADDRESS = process.env.NETWORK === 'mainnet' ? 'SP000000000000000000002Q6VF78' : 'ST000000000000000000002AMW42H';
export const BNS_CONTRACT_NAME = 'bns';
export const DOMAIN_COST_STX = 2000000; // 2 STX

const networks = {mainnet: StacksMainnet, testnet: StacksTestnet, mocknet: StacksMocknet};
export const NETWORK = new networks[process.env.NETWORK]();

import {connect} from '../lib/connect';

//TODO- alias support
export const ZONEFILE_TEMPLATE = "{$origin}\n{$ttl}\n{uri}\n{a}\n{aaaa}\n{cname}\n{mx}\n{srv}\n{txt}\n";

export const ZONEFILE_RECORD_TYPES = {
	uri: {name:'',priority:10,weight:1,target:''},
	a: {name:'',ip:''},
	aaaa: {name:'',ip:''},
	cname: {name:'',alias:''},
	// We can bring these back over time:
//	alias: {name:'',alias:''},
//	mx: {name:'',preference:0,host:''},
//	srv: {name:'',priority:10,weight:1,port:8080,target:''},
//	txt: {name:'',txt:''} // See https://github.com/blockstack/stacks-blockchain-api/issues/582
};

export function valid(domain)
	{
	return DOMAIN_VALIDITY_REGEX.test(domain);
	}

export function filter(domain)
	{
	return domain.replace(DOMAIN_CHARACTER_REGEX,'').substr(0,DOMAIN_MAX_LENGTH);
	}
	
export async function generate_salt()
	{
	return random_bytes(128);
	}

export async function preorder_name_hash(name,salt)
	{
	return hash160(Buffer.concat([Buffer.from(name),typeof salt !== 'string' ? salt : Buffer.from(salt)]));
	}
	
async function zonefile_hash(zonefile)
	{
	return hash160(Buffer.from(zonefile));
	}
	
export function clean_check_domain(domain)
	{
	if (typeof domain !== 'string')
		throw new Error('Domain is not a string');
	domain = domain.toLowerCase();
	if (domain.substr(-4) === '.' + DOMAIN_NAMESPACE)
		domain = domain.substr(0,domain.length-DOMAIN_NAMESPACE.length-1);
	if (!DOMAIN_VALIDITY_REGEX.test(domain+'.'+DOMAIN_NAMESPACE))
		throw new Error('Domain is invalid');
	return domain;
	}
	
async function contract_write(func,args,post_conditions,attachment)
	{
	let address = stx_address();
	if (!address)
		throw Error('Not signed in');
	if (!Array.isArray(post_conditions))
		post_conditions = (typeof post_conditions === 'number' && post_conditions > 0) && [makeStandardSTXPostCondition(address,FungibleConditionCode.Equal,new BN(post_conditions))];
	return new Promise((resolve,reject) =>
		{
		connect.openContractCall(
			{
			//userSession: stacks_session,
			stxAddress: address,
			contractAddress: BNS_CONTRACT_ADDRESS,
			contractName: BNS_CONTRACT_NAME,
			functionName: func,
			functionArgs: args,
			validateWithAbi: true,
			network: NETWORK,
			postConditions: post_conditions,
			attachment: attachment ? Buffer.from(attachment,'binary').toString('hex') : undefined,
			appDetails: stacks_connect_options.appDetails,
			onFinish: resolve,
			//TODO- Uncomment this once onCancel is implemented in Connect. This is
			// removed for now because different places in the app might not expect
			// this behaviour. (There is currently no way to tell if the popup closed,
			// so it is leaving dangling promises for now.)
			//onCancel: reject
			});
		});
	}

async function contract_read(func,args)
	{
	// cvToValue() not exported?
	return cvToJSON(await callReadOnlyFunction({
		userSession: stacks_session,
		contractAddress: BNS_CONTRACT_ADDRESS,
		contractName: BNS_CONTRACT_NAME,
		functionName: func,
		functionArgs: args,
		validateWithAbi: true,
		network: NETWORK,
		senderAddress: BNS_CONTRACT_ADDRESS
		})).value.value;
	}

export async function available(domain)
	{
	const available = await contract_read('can-name-be-registered',[bufferCVFromString(DOMAIN_NAMESPACE),bufferCVFromString(clean_check_domain(domain))]);
	if (available && process.env.PAYMENT_API_URL)
		{
		try
			{
			const backend_status = await payment_api_call('domain-status',{domain_name:domain});
			if (backend_status && backend_status.hasOwnProperty('status'))
				return false;
			}
		catch (error)
			{
			console.error(error);
			// If the payment payment goes down, then let us assume the name is available.
			// 1. If the payment processor had actually queued the domain for purchase, but now went down,
			//    then it is still available and someone else can purchase it directly using STX.
			// 2. If the payment processor has already sent the purchase TX but it has not yet been mined,
			//    then the user buying the domain later with STX might get his/her TX reverted. 
			return true;
			}
		}
	return available;
	}

export async function owner(domain)
	{
	let result = await resolve(domain);
	return result && result.owner && result.owner.value;
	}
	
export async function owns(domain)
	{
	return stx_address() === (await owner(domain));
	}

export async function resolve(domain)
	{
	let result = await contract_read('name-resolve',[bufferCVFromString(DOMAIN_NAMESPACE),bufferCVFromString(clean_check_domain(domain))]);
	return result !== 2013 ? result : false;
	}

export async function address_name(address)
	{
	let result = await contract_read('resolve-principal',[standardPrincipalCV(address)]);
	if (!result || !result.name || !result.name.value)
		return false;
	return Buffer.from(result.name.value.substr(2),'hex').toString('ascii') + '.' + Buffer.from(result.namespace.value.substr(2),'hex').toString('ascii');
	}

export async function zonefile(domain)
	{
	const zonefile = await fetch_zonefile(domain);
	let zone_object = (zonefile && parseZoneFile(zonefile)) || {};
	if (!zone_object['$origin'])
		zone_object['$origin'] = `${domain}.`;
	if (!zone_object['$ttl'])
		zone_object['$ttl'] = 3600;
	return zone_object;
	}

export async function address_has_name(address)
	{
	let result = await address_name(address);
	return !!(result && result.name && result.name.value);
	}

export async function preorder(domain,salt)
	{
	let length = salt.length || salt.byteLength;
	if (length !== 20)
		throw new Error('Salt should be 20 bytes.');
	salt = Buffer.from(salt,'binary');
	domain = clean_check_domain(domain);
	let domain_hash = await preorder_name_hash(`${domain}.${DOMAIN_NAMESPACE}`,salt);
	return await contract_write('name-preorder',[bufferCVFromString(domain_hash),uintCV(DOMAIN_COST_STX)],DOMAIN_COST_STX); // + NAME_PREORDER_TX_FEE
	}

export async function register(domain,salt,zonefile)
	{
	let length = salt.length || salt.byteLength;
	if (length !== 20)
		throw new Error('Salt should be 20 bytes.');
	salt = Buffer.from(salt,'binary');
	if (typeof zonefile === 'object')
		zonefile = makeZoneFile(zonefile,ZONEFILE_TEMPLATE);
	let hash = await zonefile_hash(zonefile);
	return await contract_write('name-register',[bufferCVFromString(DOMAIN_NAMESPACE),bufferCVFromString(clean_check_domain(domain)),bufferCV(Buffer.from(salt,'binary')),bufferCVFromString(hash)],null,zonefile);
	}
	
export async function update(domain,zonefile)
	{
	//TODO- validate zonefile
	if (typeof zonefile === 'object')
		zonefile = makeZoneFile(zonefile,ZONEFILE_TEMPLATE);
	let hash = await zonefile_hash(zonefile);
	return await contract_write('name-update',[bufferCVFromString(DOMAIN_NAMESPACE),bufferCVFromString(clean_check_domain(domain)),bufferCV(hash)],null,zonefile);
	}

export async function revoke(domain)
	{
	return await contract_write('name-revoke',[bufferCVFromString(DOMAIN_NAMESPACE),bufferCVFromString(clean_check_domain(domain))]);
	}
	
export async function transfer(domain,new_owner,zonefile)
	{
	let address = stx_address();
	if (!address)
		throw Error('Not signed in');
	domain = clean_check_domain(domain);
	if (!zonefile)
		zonefile = '';
	let hash = await zonefile_hash(zonefile);
	let asset_name = tupleCV({name: bufferCVFromString(domain),namespace: bufferCVFromString(DOMAIN_NAMESPACE)});
	let asset = createAssetInfo(BNS_CONTRACT_ADDRESS,BNS_CONTRACT_NAME,'names');
	return await contract_write(
		'name-transfer',
		[bufferCVFromString(DOMAIN_NAMESPACE),bufferCVFromString(domain),standardPrincipalCV(new_owner),someCV(bufferCVFromString(hash))],
		[makeStandardNonFungiblePostCondition(address,NonFungibleConditionCode.DoesNotOwn,asset,asset_name)],
		zonefile
		);
	}
	
export async function renew(domain)
	{
	return await contract_write('name-renewal',[bufferCVFromString(DOMAIN_NAMESPACE),bufferCVFromString(clean_check_domain(domain)),uintCV(DOMAIN_COST_STX)],DOMAIN_COST_STX,sender.public_key);
	}

export function generate_zonefile_stub(domain,profile_url)
	{
	domain = clean_check_domain(domain);
	const zone_object = {$origin: `${domain}.${DOMAIN_NAMESPACE}.`, $ttl: 3600};
	if (profile_url)
		zone_object.uri = [{name: "_http._tcp", priority: 10, weight: 1, target: profile_url}];
	return zone_object;
	}
