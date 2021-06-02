import * as connect from '@stacks/connect';
import {load_connect} from './lib/connect';
load_connect(connect);

import * as sapper from '@sapper/app';
import {check} from './session';
import {start_client} from './lib/i18n';

check();
start_client();
sapper.start({target: document.querySelector('#container')});
