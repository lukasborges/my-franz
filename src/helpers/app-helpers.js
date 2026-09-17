import { APP_VALUES } from '../ipcChannels';

const isRenderer = process.type === 'renderer';

let rendererCache = null;

/**
 * Read-only values from Electron's `app` object, in either process.
 *
 * The renderer fetches them once over a synchronous IPC call instead of
 * reaching into the main process with `@electron/remote`. The main process
 * reads them directly and never caches, because `config.js` rewrites the
 * userData path and the local API server picks its port after startup.
 */
export default function appValues() {
  if (isRenderer) {
    if (!rendererCache) {
      // eslint-disable-next-line global-require
      rendererCache = require('electron').ipcRenderer.sendSync(APP_VALUES);
    }

    return rendererCache;
  }

  // eslint-disable-next-line global-require
  const { app } = require('electron');

  return {
    version: app.getVersion(),
    locale: app.getLocale(),
    name: app.getName(),
    isPackaged: app.isPackaged,
    userData: app.getPath('userData'),
    appData: app.getPath('appData'),
    downloads: app.getPath('downloads'),
    localApi: process.env.FRANZ_LOCAL_API || null,
  };
}
