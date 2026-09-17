import { ipcRenderer } from 'electron';
import du from 'du';
import { SESSION_CLEAR_CACHE } from '../../ipcChannels';

import { getServicePartitionsDirectory } from '../../helpers/service-helpers.js';

const debug = require('debug')('Franz:LocalApi');

export default class LocalApi {
  // Settings
  getAppSettings(type) {
    return new Promise((resolve) => {
      ipcRenderer.once('appSettings', (event, resp) => {
        debug('LocalApi::getAppSettings resolves', resp.type, resp.data);
        resolve(resp);
      });

      ipcRenderer.send('getAppSettings', type);
    });
  }

  async updateAppSettings(type, data) {
    debug('LocalApi::updateAppSettings resolves', type, data);
    ipcRenderer.send('updateAppSettings', {
      type,
      data,
    });
  }

  // Services
  async getAppCacheSize() {
    const partitionsDir = getServicePartitionsDirectory();
    return new Promise((resolve, reject) => {
      du(partitionsDir, (err, size) => {
        if (err) reject(err);

        debug('LocalApi::getAppCacheSize resolves', size);
        resolve(size);
      });
    });
  }

  async clearCache(serviceId) {
    debug('LocalApi::clearCache resolves', serviceId);
    return ipcRenderer.invoke(SESSION_CLEAR_CACHE, `persist:service-${serviceId}`);
  }

  async clearAppCache() {
    debug('LocalApi::clearCache clearAppCache');
    return ipcRenderer.invoke(SESSION_CLEAR_CACHE);
  }
}
