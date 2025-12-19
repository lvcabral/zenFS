import { fs as _fs, bindContext } from '@lvcabral/zenfs';
import { copySync, data } from '../setup.js';

_fs.mkdirSync('/new_root');

export const { fs } = bindContext({ root: '/new_root' });

copySync(data, fs);
