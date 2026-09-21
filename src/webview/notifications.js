import { ipcRenderer } from 'electron';
import uuidV1 from 'uuid/v1';

const debug = require('debug')('Franz:Notifications');

class Notification {
  static permission = 'granted';

  constructor(title = '', options = {}) {
    debug('New notification', title, options);
    this.title = title;
    this.options = options;
    this.notificationId = uuidV1();

    ipcRenderer.send('notification', this.onNotify({
      title: this.title,
      options: this.options,
      notificationId: this.notificationId,
    }));

    ipcRenderer.once(`notification-onclick:${this.notificationId}`, () => {
      if (typeof this.onclick === 'function') {
        this.onclick();
      }
    });
  }

  static requestPermission(cb = null) {
    if (!cb) {
      return new Promise((resolve) => {
        resolve(Notification.permission);
      });
    }

    if (typeof (cb) === 'function') {
      return cb(Notification.permission);
    }

    return Notification.permission;
  }

  onNotify(data) {
    return data;
  }

  onClick() {}

  close() {}
}

window.Notification = Notification;

// Electron never displays persistent (service worker) notifications, and
// Google Chat, Gmail & co. fire theirs through
// `registration.showNotification()` from the page. Route those through the
// same IPC path as `new Notification()` so they reach the OS.
// Only keep options that are valid for a non-persistent notification
// (`actions` throws there) and that survive the IPC structured clone
// (`data` may hold arbitrary objects).
const NON_PERSISTENT_OPTION_KEYS = ['body', 'icon', 'image', 'badge', 'tag', 'lang', 'dir', 'silent', 'requireInteraction'];

const toNonPersistentOptions = (options = {}) => Object.fromEntries(
  NON_PERSISTENT_OPTION_KEYS
    .filter(key => options[key] !== undefined)
    .map(key => [key, options[key]]),
);

const { ServiceWorkerRegistration } = window;
if (ServiceWorkerRegistration) {
  ServiceWorkerRegistration.prototype.showNotification = function showNotification(title, options = {}) {
    debug('Intercepted service worker showNotification', title, options);
    // eslint-disable-next-line no-new
    new Notification(title, toNonPersistentOptions(options));
    return Promise.resolve();
  };

  ServiceWorkerRegistration.prototype.getNotifications = () => Promise.resolve([]);
}
