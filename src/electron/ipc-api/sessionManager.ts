import { ipcMain, session } from 'electron';
import {
  SESSION_CLEAR_CACHE,
  SESSION_CLEAR_STORAGE_DATA,
  SESSION_SET_PROXY,
} from '../../ipcChannels';

const debug = require('debug')('Franz:ipcApi:sessionManager');

const sessionFor = (partition?: string) => (
  partition ? session.fromPartition(partition) : session.defaultSession
);

export default () => {
  ipcMain.handle(SESSION_CLEAR_CACHE, (event, partition?: string) => {
    debug('Clearing cache for', partition || 'default session');

    return sessionFor(partition).clearCache();
  });

  ipcMain.handle(SESSION_CLEAR_STORAGE_DATA, (event, partition?: string) => {
    debug('Clearing storage data for', partition || 'default session');

    return sessionFor(partition).clearStorageData();
  });

  ipcMain.handle(SESSION_SET_PROXY, (event, { partition, proxyRules }: { partition: string, proxyRules: string }) => {
    debug('Setting proxy for', partition, 'to', proxyRules);

    return sessionFor(partition).setProxy({ proxyRules });
  });
};
