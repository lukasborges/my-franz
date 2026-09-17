import appValues from '../../helpers/app-helpers';
import Request from '../../stores/lib/Request';
import { API, API_VERSION } from '../../environment';

const debug = require('debug')('Franz:feature:announcements:api');

export const announcementsApi = {
  async getCurrentVersion() {
    debug('getting current version of electron app');
    return Promise.resolve(appValues().version);
  },

  async getChangelog(version) {
    debug('changelog lookup disabled in self-built mode', version);
    return null;
  },

  async getAnnouncement(version) {
    debug('fetching release announcement from api');
    const url = `${API}/${API_VERSION}/announcements/${version}`;
    const response = await window.fetch(url, { method: 'GET' });
    if (!response.ok) return null;
    return response.json();
  },
};

export const getCurrentVersionRequest = new Request(announcementsApi, 'getCurrentVersion');
export const getChangelogRequest = new Request(announcementsApi, 'getChangelog');
export const getAnnouncementRequest = new Request(announcementsApi, 'getAnnouncement');
