import { ipcRenderer } from 'electron';
import {
  WEB_CONTENTS_CLOSE_WINDOW,
  WEB_CONTENTS_INVOKE,
  WEB_CONTENTS_NAVIGATION_EVENT,
  WEB_CONTENTS_SEND,
  WEB_CONTENTS_WATCH_NAVIGATION,
} from '../ipcChannels';

/**
 * Drives a webContents living in the main process.
 *
 * Every call is asynchronous, unlike the synchronous proxies `@electron/remote`
 * used to hand out, so callers must not expect a return value inline.
 */
export function invokeWebContents(id, method, ...args) {
  if (id === null || id === undefined) return Promise.resolve(null);

  return ipcRenderer.invoke(WEB_CONTENTS_INVOKE, { id, method, args });
}

export function sendToWebContents(id, channel, args) {
  if (id === null || id === undefined) return;

  ipcRenderer.send(WEB_CONTENTS_SEND, { id, channel, args });
}

export function closeWindowOf(id) {
  if (id === null || id === undefined) return;

  ipcRenderer.send(WEB_CONTENTS_CLOSE_WINDOW, id);
}

/**
 * Reports navigation of the given webContents. Resolves with its current URL
 * and calls `onNavigate` with `{ url, canGoBack, canGoForward }` on every move.
 * Returns a function that stops listening.
 */
export function watchNavigation(id, onNavigate) {
  const listener = (event, payload) => {
    if (payload.id !== id) return;

    onNavigate(payload);
  };

  ipcRenderer.on(WEB_CONTENTS_NAVIGATION_EVENT, listener);

  const ready = ipcRenderer.invoke(WEB_CONTENTS_WATCH_NAVIGATION, id);

  return {
    ready,
    stop: () => ipcRenderer.removeListener(WEB_CONTENTS_NAVIGATION_EVENT, listener),
  };
}
