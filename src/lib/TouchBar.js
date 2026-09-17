import os from 'os';
import semver from 'semver';
import { ipcRenderer } from 'electron';
import { autorun } from 'mobx';

import { isMac } from '../environment';
import { TOUCH_BAR_CLICK, TOUCH_BAR_SET } from '../ipcChannels';

export default class FranzTouchBar {
  constructor(stores, actions) {
    this.stores = stores;
    this.actions = actions;
    this.serviceIdByButton = {};

    ipcRenderer.on(TOUCH_BAR_CLICK, (event, buttonId) => {
      const serviceId = this.serviceIdByButton[buttonId];

      if (serviceId) {
        this.actions.service.setActive({ serviceId });
      }
    });

    // Temporary fix for https://github.com/electron/electron/issues/10442
    // TODO: remove when we upgrade to electron 1.8.2 or later
    try {
      if (isMac && semver.gt(os.release(), '16.6.0')) {
        this.build = autorun(this._build.bind(this));
      }
    } catch (err) {
      console.error(err);
    }
  }

  _build() {
    if (this.stores.router.location.pathname.startsWith('/payment/')) {
      return;
    }

    if (!this.stores.user.isLoggedIn) {
      ipcRenderer.send(TOUCH_BAR_SET, null);
      return;
    }

    this.serviceIdByButton = {};

    const buttons = this.stores.services.allDisplayed.map((service) => {
      const id = `service-${service.id}`;
      this.serviceIdByButton[id] = service.id;

      return {
        id,
        label: `${service.name}${service.unreadDirectMessageCount > 0
          ? ' 🔴' : ''} ${service.unreadDirectMessageCount === 0
            && service.unreadIndirectMessageCount > 0
          ? ' ⚪️' : ''}`,
        backgroundColor: service.isActive ? '#3498DB' : undefined,
      };
    });

    ipcRenderer.send(TOUCH_BAR_SET, buttons);
  }
}
