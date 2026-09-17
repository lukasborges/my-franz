import {
  DEV_API,
  DEV_API_WEBSITE,
  GA_ID_DEV,
  GA_ID_PROD,
  LIVE_API,
  LIVE_API_WEBSITE,
  LOCAL_API,
  LOCAL_API_WEBSITE,
} from './config';

import appValues from './helpers/app-helpers';

export const isDevMode = !appValues().isPackaged;
export const useLiveAPI = process.env.LIVE_API;
export const useLocalAPI = process.env.LOCAL_API;

let { platform } = process;
if (process.env.OS_PLATFORM) {
  platform = process.env.OS_PLATFORM;
}

export const isMac = platform === 'darwin';
export const isWindows = platform === 'win32';
export const isLinux = platform === 'linux';

export const ctrlKey = isMac ? '⌘' : 'Ctrl';
export const cmdKey = isMac ? 'Cmd' : 'Ctrl';

let api;
let web;
if (!isDevMode || (isDevMode && useLiveAPI)) {
  api = LIVE_API;
  web = LIVE_API_WEBSITE;
} else if (isDevMode && useLocalAPI) {
  api = LOCAL_API;
  web = LOCAL_API_WEBSITE;
} else {
  api = DEV_API;
  web = DEV_API_WEBSITE;
}

// Self-built: every API call goes to the embedded local server started by the
// main process (src/electron/localServer.js). The URL is handed over via env.
const localServerUrl = appValues().localApi;

export const API = localServerUrl || api;
export const API_VERSION = 'v1';
export const WEBSITE = web;

export const GA_ID = !isDevMode ? GA_ID_PROD : GA_ID_DEV;
