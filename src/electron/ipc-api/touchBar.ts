import {
  BrowserWindow, ipcMain, TouchBar,
} from 'electron';
import { TOUCH_BAR_CLICK, TOUCH_BAR_SET } from '../../ipcChannels';

const { TouchBarButton, TouchBarSpacer } = TouchBar;

interface ITouchBarButton {
  id: string;
  label: string;
  backgroundColor?: string;
}

/**
 * Builds the macOS touch bar from a plain description sent by the renderer,
 * which keeps the click handlers and receives the id of whichever was pressed.
 */
export default ({ mainWindow }: { mainWindow: BrowserWindow }) => {
  ipcMain.on(TOUCH_BAR_SET, (event, buttons: ITouchBarButton[] | null) => {
    if (!buttons) {
      mainWindow.setTouchBar(null);
      return;
    }

    const items = buttons.flatMap(button => [
      new TouchBarButton({
        label: button.label,
        backgroundColor: button.backgroundColor,
        click: () => {
          if (!event.sender.isDestroyed()) {
            event.sender.send(TOUCH_BAR_CLICK, button.id);
          }
        },
      }),
      new TouchBarSpacer({ size: 'small' }),
    ]);

    mainWindow.setTouchBar(new TouchBar({ items }));
  });
};
