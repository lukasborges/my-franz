import {
  app, BrowserWindow, ipcMain, nativeTheme, powerMonitor, screen,
} from 'electron';
import {
  APP_DOCK_BOUNCE,
  APP_GET_DISPLAYS,
  APP_GET_LOGIN_ITEM_SETTINGS,
  APP_SET_LOGIN_ITEM_SETTINGS,
  APP_SHOW_MAIN_WINDOW,
  NATIVE_THEME_UPDATED,
  POWER_MONITOR_EVENT,
} from '../../ipcChannels';

const debug = require('debug')('Franz:ipcApi:appControl');

export default ({ mainWindow }: { mainWindow: BrowserWindow }) => {
  ipcMain.handle(APP_GET_DISPLAYS, () => screen.getAllDisplays());

  ipcMain.handle(APP_GET_LOGIN_ITEM_SETTINGS, () => app.getLoginItemSettings());

  ipcMain.on(APP_SET_LOGIN_ITEM_SETTINGS, (event, settings) => {
    debug('Setting login item settings to', settings);
    app.setLoginItemSettings(settings);
  });

  ipcMain.on(APP_DOCK_BOUNCE, () => {
    if (app.dock) app.dock.bounce();
  });

  ipcMain.on(APP_SHOW_MAIN_WINDOW, () => {
    mainWindow.show();

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.focus();
  });

  const notify = (channel: string, payload: unknown) => {
    if (mainWindow.isDestroyed()) return;

    mainWindow.webContents.send(channel, payload);
  };

  powerMonitor.on('suspend', () => {
    debug('System suspended');
    notify(POWER_MONITOR_EVENT, 'suspend');
  });

  powerMonitor.on('resume', () => {
    debug('System resumed');
    notify(POWER_MONITOR_EVENT, 'resume');
  });

  nativeTheme.on('updated', () => {
    notify(NATIVE_THEME_UPDATED, nativeTheme.shouldUseDarkColors);
  });
};
