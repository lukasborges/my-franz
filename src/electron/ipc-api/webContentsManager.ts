import { ipcMain, webContents, BrowserWindow } from 'electron';
import {
  WEB_CONTENTS_CLOSE_WINDOW,
  WEB_CONTENTS_INVOKE,
  WEB_CONTENTS_NAVIGATION_EVENT,
  WEB_CONTENTS_SEND,
  WEB_CONTENTS_WATCH_NAVIGATION,
} from '../../ipcChannels';

const debug = require('debug')('Franz:ipcApi:webContentsManager');

// Only these may be driven from the renderer. Anything else is refused so that
// the channel cannot be turned into arbitrary main-process access.
const ALLOWED_METHODS = new Set([
  'canGoBack',
  'canGoForward',
  'getURL',
  'goBack',
  'goForward',
  'loadURL',
  'reload',
  'setAudioMuted',
]);

// Keyed by "<watcher id>:<target id>" so a re-render cannot stack up listeners.
const watchers = new Set<string>();

export default () => {
  ipcMain.handle(WEB_CONTENTS_INVOKE, (event, { id, method, args = [] }) => {
    if (!ALLOWED_METHODS.has(method)) {
      throw new Error(`webContents method not allowed: ${method}`);
    }

    const contents = webContents.fromId(id);
    if (!contents || contents.isDestroyed()) return null;

    return contents[method](...args);
  });

  ipcMain.on(WEB_CONTENTS_SEND, (event, { id, channel, args }) => {
    const contents = webContents.fromId(id);
    if (!contents || contents.isDestroyed()) return;

    contents.send(channel, args);
  });

  ipcMain.handle(WEB_CONTENTS_WATCH_NAVIGATION, (event, id: number) => {
    const key = `${event.sender.id}:${id}`;
    if (watchers.has(key)) return null;

    const contents = webContents.fromId(id);
    if (!contents || contents.isDestroyed()) return null;

    watchers.add(key);
    debug('Watching navigation of', id, 'for', event.sender.id);

    const forward = (_e, url: string) => {
      if (event.sender.isDestroyed()) return;

      event.sender.send(WEB_CONTENTS_NAVIGATION_EVENT, {
        id,
        url,
        canGoBack: contents.navigationHistory.canGoBack(),
        canGoForward: contents.navigationHistory.canGoForward(),
      });
    };

    contents.on('will-navigate', forward);
    contents.on('did-navigate', forward);
    contents.on('did-navigate-in-page', forward);
    contents.once('destroyed', () => watchers.delete(key));

    return contents.getURL();
  });

  ipcMain.on(WEB_CONTENTS_CLOSE_WINDOW, (event, id: number) => {
    const contents = webContents.fromId(id);
    if (!contents || contents.isDestroyed()) return;

    BrowserWindow.fromWebContents(contents)?.close();
  });
};
