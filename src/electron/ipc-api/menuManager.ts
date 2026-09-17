import {
  BrowserWindow, dialog, ipcMain, Menu, MenuItemConstructorOptions,
} from 'electron';
import { DIALOG_MESSAGE_BOX, MENU_POPUP } from '../../ipcChannels';

const debug = require('debug')('Franz:ipcApi:menuManager');

interface ISerialisableMenuItem extends Omit<MenuItemConstructorOptions, 'click' | 'submenu'> {
  // Set by the renderer for every item that had a click handler.
  clickId?: string;
  submenu?: ISerialisableMenuItem[];
}

/**
 * Rebuilds a template that crossed the IPC boundary, where click handlers were
 * replaced by ids. Clicking records the id so the renderer can run its own
 * handler once the menu closes.
 */
const withClickHandlers = (
  template: ISerialisableMenuItem[],
  onClick: (id: string) => void,
): MenuItemConstructorOptions[] => template.map((item) => {
  const { clickId, submenu, ...rest } = item;
  const built: MenuItemConstructorOptions = { ...rest };

  if (submenu) {
    built.submenu = withClickHandlers(submenu, onClick);
  }

  if (clickId) {
    built.click = () => onClick(clickId);
  }

  return built;
});

export default () => {
  ipcMain.handle(MENU_POPUP, (event, template: ISerialisableMenuItem[]) => new Promise((resolve) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    let clicked: string | null = null;

    const menu = Menu.buildFromTemplate(withClickHandlers(template, (id) => { clicked = id; }));

    // The click handler runs after this event, so resolve on the next tick.
    menu.once('menu-will-close', () => setTimeout(() => {
      debug('Menu closed, selected', clicked);
      resolve(clicked);
    }, 0));

    menu.popup(window ? { window } : {});
  }));

  ipcMain.handle(DIALOG_MESSAGE_BOX, async (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = window
      ? await dialog.showMessageBox(window, options)
      : await dialog.showMessageBox(options);

    return result.response;
  });
};
