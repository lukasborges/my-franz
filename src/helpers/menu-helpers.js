import { ipcRenderer } from 'electron';
import {
  APPLICATION_MENU_CLICK,
  APPLICATION_MENU_POPUP,
  APPLICATION_MENU_SET,
  DIALOG_MESSAGE_BOX,
  MENU_POPUP,
} from '../ipcChannels';

/**
 * Splits a menu template into data the main process can receive and the click
 * handlers that stay here. Functions cannot cross IPC, so each handler is
 * swapped for an id that comes back when its item is chosen.
 */
function serialise(template, handlers, prefix = 'item') {
  return template.map((item, index) => {
    const { click, submenu, ...rest } = item;
    const id = `${prefix}-${index}`;
    const serialised = { ...rest };

    if (click) {
      handlers[id] = click;
      serialised.clickId = id;
    }

    if (submenu) {
      serialised.submenu = serialise(submenu, handlers, id);
    }

    return serialised;
  });
}

/**
 * Shows a context menu owned by the main process and runs the handler of
 * whichever item was chosen.
 */
export async function popupMenu(template) {
  const handlers = {};
  const serialised = serialise(template, handlers);

  const clickedId = await ipcRenderer.invoke(MENU_POPUP, serialised);

  if (clickedId && handlers[clickedId]) {
    handlers[clickedId]();
  }

  return clickedId;
}

/**
 * Shows a modal message box and resolves with the index of the chosen button.
 * Replaces the synchronous `dialog.showMessageBoxSync`, so callers must await.
 */
export function showMessageBox(options) {
  return ipcRenderer.invoke(DIALOG_MESSAGE_BOX, options);
}

// Handlers of the application menu currently installed in the main process.
let applicationMenuHandlers = {};

ipcRenderer.on(APPLICATION_MENU_CLICK, (event, id) => {
  const handler = applicationMenuHandlers[id];

  if (handler) handler();
});

/**
 * Installs the application menu. The template is rebuilt often, so the handler
 * map is replaced wholesale on every call.
 */
export function setApplicationMenu(template) {
  const handlers = {};
  const serialised = serialise(template, handlers);

  applicationMenuHandlers = handlers;
  ipcRenderer.send(APPLICATION_MENU_SET, serialised);
}

/**
 * Installs the application menu and immediately opens it at the given point,
 * for the in-window menu button on Windows and Linux.
 */
export function popupApplicationMenu(template, { x, y } = {}) {
  const handlers = {};
  const serialised = serialise(template, handlers);

  applicationMenuHandlers = handlers;

  return ipcRenderer.invoke(APPLICATION_MENU_POPUP, { template: serialised, x, y });
}
