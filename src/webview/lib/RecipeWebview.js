import { ipcRenderer } from 'electron';
import fs from 'fs-extra';

const debug = require('debug')('Franz:Plugin:RecipeWebview');

class RecipeWebview {
  constructor() {
    this.countCache = {
      direct: 0,
      indirect: 0,
    };

    ipcRenderer.on('poll', () => {
      this.loopFunc();

      debug('Poll event');
    });

    window.FranzAPI = {
      clearCache: RecipeWebview.clearCache,
    };
  }

  loopFunc = () => null;

  /**
   * Initialize the loop
   *
   * @param {Function}        Function that will be executed
   */
  loop(fn) {
    this.loopFunc = fn;
  }

  /**
   * Set the unread message badge
   *
   * @param {int} direct      Set the count of direct messages
   *                          eg. Slack direct mentions, or a
   *                          message to @channel
   * @param {int} indirect    Set a badge that defines there are
   *                          new messages but they do not involve
   *                          me directly to me eg. in a channel
   */
  setBadge(direct = 0, indirect = 0) {
    if (this.countCache.direct === direct
      && this.countCache.indirect === indirect) return;

    const count = {
      direct: direct > 0 ? direct : 0,
      indirect: indirect > 0 ? indirect : 0,
    };


    ipcRenderer.send('messages', count);
    Object.assign(this.countCache, count);

    debug('Sending badge count to host', count);
  }

  /**
   * Injects the contents of a CSS file into the current webview
   *
   * @param {Array} files     CSS files that should be injected. This must
   *                          be an absolute path to the file
   */
  injectCSS(...files) {
    files.forEach((file) => {
      const data = fs.readFileSync(file);
      const styles = document.createElement('style');
      styles.innerHTML = data.toString();

      document.querySelector('head').appendChild(styles);

      debug('Append styles', styles);
    });
  }

  /**
   * Set the thumbnail for the service
   *
   * @param {int} direct      Set the count of direct messages
   *                          eg. Slack direct mentions, or a
   *                          message to @channel
   * @param {int} indirect    Set a badge that defines there are
   *                          new messages but they do not involve
   *                          me directly to me eg. in a channel
   */
  setServiceIcon(url) {
    ipcRenderer.send('avatar', url);

    debug('Sending avatar url to host', url);
  }

  onNotify(fn) {
    if (typeof fn === 'function') {
      window.Notification.prototype.onNotify = fn;
    }
  }

  initialize(fn) {
    if (typeof fn === 'function') {
      fn();
    }
  }

  static clearCache() {
    ipcRenderer.invoke('clearServiceCache');
  }

  // --- Ferdium recipe API compatibility -----------------------------------

  safeParseInt(text) {
    if (text === undefined || text === null) return 0;
    const parsed = Number.parseInt(text.toString().replace(/[^\d]/g, ''), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  isImage(link) {
    if (!link) return false;
    const { role } = link.dataset || {};
    if (role !== undefined) return role === 'img';
    const url = link.getAttribute('href') || '';
    return /\.(jpg|jpeg|png|webp|avif|gif|svg)($|\?|:)/.test(url.split(/[#?]/)[0]);
  }

  handleDarkMode(handler) {
    if (typeof handler === 'function') {
      this.darkModeHandler = handler;
    }
  }

  clearStorageData() {
    RecipeWebview.clearCache();
  }

  openNewWindow(url) {
    window.open(url);
  }
}

module.exports = RecipeWebview;
