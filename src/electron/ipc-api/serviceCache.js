import { ipcMain } from 'electron';

const debug = require('debug')('Franz:ipcApi:serviceCache');

export default () => {
  ipcMain.handle('clearServiceCache', ({ sender: webContents }, targets) => {
    const storages = targets?.storages?.length
      ? targets.storages
      : ['appcache', 'serviceworkers', 'cachestorage', 'websql', 'indexdb'];
    debug('Clearing storage for service', storages);
    const { session } = webContents;

    session.flushStorageData();
    return session.clearStorageData({ storages });
  });
};
