require('dotenv').config();
const webpack = require('webpack');
const WebpackModules = require('webpack-modules');
const path = require('path');
const config = require('sapper/config/webpack.js');
const pkg = require('./package.json');
const { networkInterfaces } = require('os');

const mode = process.env.NODE_ENV;
const dev = mode === 'development';

const NETWORK = process.env.NETWORK || (dev ? 'testnet' : 'mainnet');

if (NETWORK !== 'mainnet' && NETWORK !== 'testnet' && NETWORK !== 'mocknet')
	throw new Error('NETWORK should be "mainnet", "testnet", or "mocknet"');

if (!process.env.PAYMENT_API_URL)
	throw new Error('PAYMENT_API_URL not set');

const alias = {svelte: path.resolve('node_modules', 'svelte')};
const extensions = ['.mjs', '.js', '.json', '.svelte', '.html'];
const mainFields = ['svelte', 'module', 'browser', 'main'];
const fileLoaderRule = {
	test: /\.(png|jpe?g|gif)$/i,
	use: [
		'file-loader',
	]
};

module.exports = {
	client: {
		entry: config.client.entry(),
		output: config.client.output(),
		resolve: { alias, extensions, mainFields },
		module: {
			rules: [
				{
					test: /\.(svelte|html)$/,
					use: {
						loader: 'svelte-loader',
						options: {
							dev,
							hydratable: true,
							hotReload: false // pending https://github.com/sveltejs/svelte/issues/2377
						}
					}
				},
				fileLoaderRule
			]
		},
		mode,
		plugins: [
			// pending https://github.com/sveltejs/svelte/issues/2377
			// dev && new webpack.HotModuleReplacementPlugin(),
			new webpack.DefinePlugin({
				'process.browser': true,
				'process.env.DEV': dev,
				'process.env.NETWORK': JSON.stringify(NETWORK),
				'process.env.REDIRECT_SERVICE_IP': JSON.stringify(process.env.REDIRECT_SERVICE_IP),
				'process.env.PAYMENT_API_URL': JSON.stringify(process.env.PAYMENT_API_URL),
				'process.env.STRIPE_PUBLIC_KEY': JSON.stringify(process.env.STRIPE_PUBLIC_KEY),
				'process.env.NODE_ENV': JSON.stringify(mode)
			}),
		].filter(Boolean),
		devtool: dev && 'inline-source-map'
	},

	server: {
		entry: config.server.entry(),
		output: config.server.output(),
		target: 'node',
		resolve: { alias, extensions, mainFields },
		externals: Object.keys(pkg.dependencies).concat('encoding'),
		module: {
			rules: [
				{
					test: /\.(svelte|html)$/,
					use: {
						loader: 'svelte-loader',
						options: {
							css: false,
							generate: 'ssr',
							hydratable: true,
							dev
						}
					}
				},
				fileLoaderRule
			]
		},
		mode,
		plugins: [
			new webpack.DefinePlugin({
				'process.browser': false,
				'process.env.DEV': dev,
				'process.env.NETWORK': JSON.stringify(NETWORK),
				'process.env.REDIRECT_SERVICE_IP': JSON.stringify(process.env.REDIRECT_SERVICE_IP),
				'process.env.PAYMENT_API_URL': JSON.stringify(process.env.PAYMENT_API_URL),
				'process.env.STRIPE_PUBLIC_KEY': JSON.stringify(process.env.STRIPE_PUBLIC_KEY),
				'process.env.NODE_ENV': JSON.stringify(mode)
			}),
			new WebpackModules()
		],
		performance: {
			hints: false // it doesn't matter if server.js is large
		}
	}
};