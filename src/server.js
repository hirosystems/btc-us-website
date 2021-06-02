import sirv from 'sirv';
import polka from 'polka';
import compression from 'compression';
import * as sapper from '@sapper/server';

import {i18n_middleware} from './lib/i18n';

const {PORT,NODE_ENV} = process.env;
const dev = NODE_ENV === 'development';

polka()
	.use(
		compression({threshold: 0}),
		sirv('static',{dev}),
		i18n_middleware(),
		sapper.middleware()
	)
	.listen(PORT, err => err && console.log('error', err));
