import { BrowserWindow, ipcMain } from 'electron';

const debug = require('debug')('Franz:ipcApi:subscriptionWindow');

export default async ({ mainWindow }) => {
  let subscriptionWindow;
  ipcMain.handle('open-inline-subscription-window', async (event, { url }) => {
    debug('Opening subscription window with url', url);
    try {
      const windowBounds = mainWindow.getBounds();

      subscriptionWindow = new BrowserWindow({
        parent: mainWindow,
        modal: true,
        title: '🔒 My Franz Supporter License',
        width: 800,
        height: windowBounds.height - 100,
        maxWidth: 800,
        minWidth: 600,
        webPreferences: {
          nodeIntegration: true,
          webviewTag: true,
          contextIsolation: false,
        },
      });

      subscriptionWindow.loadURL(`file://${__dirname}/../../index.html#/payment/${encodeURIComponent(url)}`);

      return await new Promise((resolve) => {
        subscriptionWindow.on('closed', () => resolve('closed'));
      });
      // return isDND;
    } catch (e) {
      console.error(e);
    }
  });
};
