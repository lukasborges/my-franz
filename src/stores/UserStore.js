import { observable, computed, action } from 'mobx';
import moment from 'moment';
import jwt from 'jsonwebtoken';
import localStorage from 'mobx-localstorage';
import ms from 'ms';

import { ipcRenderer } from 'electron';
import Store from './lib/Store';
import Request from './lib/Request';
import CachedRequest from './lib/CachedRequest';
import { gaEvent } from '../lib/analytics';
import { sleep } from '../helpers/async-helpers';
import { getPlan } from '../helpers/plan-helpers';
import { PLANS } from '../config';
import { TODOS_PARTITION_ID } from '../features/todos';
import { SESSION_CLEAR_STORAGE_DATA, USER_LOGIN_STATUS } from '../ipcChannels';

const debug = require('debug')('Franz:UserStore');

// TODO: split stores into UserStore and AuthStore
export default class UserStore extends Store {
  BASE_ROUTE = '/auth';

  @observable loginRequest = new Request(this.api.user, 'login');

  @observable signupRequest = new Request(this.api.user, 'signup');

  @observable passwordRequest = new Request(this.api.user, 'password');

  @observable activateTrialRequest = new Request(this.api.user, 'activateTrial');

  @observable inviteRequest = new Request(this.api.user, 'invite');

  @observable getUserInfoRequest = new CachedRequest(this.api.user, 'getInfo');

  @observable updateUserInfoRequest = new Request(this.api.user, 'updateInfo');

  @observable getLegacyServicesRequest = new CachedRequest(this.api.user, 'getLegacyServices');

  @observable deleteAccountRequest = new CachedRequest(this.api.user, 'delete');

  @observable isImportLegacyServicesExecuting = false;

  @observable isImportLegacyServicesCompleted = false;

  @observable id;

  @observable authToken = localStorage.getItem('authToken') || null;

  @observable accountType;

  @observable hasCompletedSignup = false;

  @observable hasActivatedTrial = false;

  @observable userData = {};

  @observable actionStatus = [];

  logoutReasonTypes = {
    SERVER: 'SERVER',
  };

  @observable logoutReason = null;

  fetchUserInfoInterval = null;

  isAutoLoginRunning = false;

  constructor(...args) {
    super(...args);

    // Register action handlers
    this.actions.user.login.listen(this._login.bind(this));
    this.actions.user.retrievePassword.listen(this._retrievePassword.bind(this));
    this.actions.user.logout.listen(this._logout.bind(this));
    this.actions.user.signup.listen(this._signup.bind(this));
    this.actions.user.activateTrial.listen(this._activateTrial.bind(this));
    this.actions.user.invite.listen(this._invite.bind(this));
    this.actions.user.update.listen(this._update.bind(this));
    this.actions.user.resetStatus.listen(this._resetStatus.bind(this));
    this.actions.user.importLegacyServices.listen(this._importLegacyServices.bind(this));
    this.actions.user.delete.listen(this._delete.bind(this));

    // Reactions
    this.registerReactions([
      this._requireAuthenticatedUser,
      this._getUserData.bind(this),
      this._resetTrialActivationState.bind(this),
    ]);
  }

  setup() {
    // Data migration
    this._migrateUserLocale();
  }

  // Data
  @computed get isLoggedIn() {
    return Boolean(localStorage.getItem('authToken'));
  }

  @computed get isTokenExpired() {
    if (!this.authToken) return false;

    const { tokenExpiry } = this._parseToken(this.authToken);
    return this.authToken !== null && moment(tokenExpiry).isBefore(moment());
  }

  @computed get data() {
    if (!this.isLoggedIn) return {};

    return this.getUserInfoRequest.execute().result || {};
  }

  @computed get team() {
    return this.data.team || null;
  }

  @computed get isPremium() {
    return true;
  }

  @computed get isPremiumOverride() {
    return ((!this.team || !this.team.plan) && this.isPremium) || (this.team && this.team.state === 'expired' && this.isPremium);
  }

  @computed get isPersonal() {
    if (!this.team || !this.team.plan) return false;
    const plan = getPlan(this.team.plan);

    return plan === PLANS.PERSONAL;
  }

  @computed get isPro() {
    return true;
  }

  @computed get legacyServices() {
    return this.getLegacyServicesRequest.execute() || {};
  }

  // Actions
  @action async _login({ email, password }) {
    const authToken = await this.loginRequest.execute(email, password)._promise;
    this._setUserData(authToken);

    this.stores.router.push('/');

    gaEvent('User', 'login');
  }

  @action async _signup({
    firstname, lastname, email, password, accountType, company, plan, currency,
  }) {
    const authToken = await this.signupRequest.execute({
      firstname,
      lastname,
      email,
      password,
      accountType,
      company,
      locale: this.stores.app.locale,
      plan,
      currency,
    });

    this.hasCompletedSignup = false;

    this._setUserData(authToken);

    this.stores.router.push(this.SETUP_ROUTE);

    gaEvent('User', 'signup');
  }

  @action async _retrievePassword({ email }) {
    const request = this.passwordRequest.execute(email);

    await request._promise;
    this.actionStatus = request.result.status || [];

    gaEvent('User', 'retrievePassword');
  }

  @action async _activateTrial({ planId }) {
    debug('activate trial', planId);

    this.activateTrialRequest.execute({
      plan: planId,
    });

    await this.activateTrialRequest._promise;

    this.hasActivatedTrial = true;

    this.stores.features.featuresRequest.invalidate({ immediately: true });
    this.stores.user.getUserInfoRequest.invalidate({ immediately: true });


    gaEvent('User', 'activateTrial');
  }

  @action async _invite({ invites }) {
    const data = invites.filter(invite => invite.email !== '');

    const response = await this.inviteRequest.execute(data)._promise;

    this.actionStatus = response.status || [];

    // we do not wait for a server response before redirecting the user ONLY DURING SIGNUP
    if (this.stores.router.location.pathname.includes(this.INVITE_ROUTE)) {
      this.stores.router.push('/');
    }

    gaEvent('User', 'inviteUsers');
  }

  @action async _update({ userData }) {
    if (!this.isLoggedIn) return;

    const response = await this.updateUserInfoRequest.execute(userData)._promise;

    this.getUserInfoRequest.patch(() => response.data);
    this.actionStatus = response.status || [];

    gaEvent('User', 'update');
  }

  @action _resetStatus() {
    this.actionStatus = [];
  }

  @action _logout() {
    // workaround mobx issue
    localStorage.removeItem('authToken');
    window.localStorage.removeItem('authToken');

    this.getUserInfoRequest.invalidate().reset();
    this.authToken = null;

    this.stores.services.allServicesRequest.invalidate().reset();

    if (this.stores.todos.isTodosEnabled) {
      ipcRenderer.invoke(SESSION_CLEAR_STORAGE_DATA, TODOS_PARTITION_ID);
    }
  }

  @action async _importLegacyServices({ services }) {
    this.isImportLegacyServicesExecuting = true;

    // Reduces recipe duplicates
    const recipes = services.filter((obj, pos, arr) => arr.map(mapObj => mapObj.recipe.id).indexOf(obj.recipe.id) === pos).map(s => s.recipe.id);

    // Install recipes
    for (const recipe of recipes) {
      // eslint-disable-next-line
      await this.stores.recipes._install({ recipeId: recipe });
    }

    for (const service of services) {
      this.actions.service.createFromLegacyService({
        data: service,
      });
      await this.stores.services.createServiceRequest._promise; // eslint-disable-line
    }

    this.isImportLegacyServicesExecuting = false;
    this.isImportLegacyServicesCompleted = true;
  }

  @action async _delete() {
    this.deleteAccountRequest.execute();
  }

  // This is a mobx autorun which forces the user to login if not authenticated
  _requireAuthenticatedUser = () => {
    if (this.isTokenExpired) {
      this._logout();
    }

    ipcRenderer.send(USER_LOGIN_STATUS, this.isLoggedIn);

    if (!this.isLoggedIn) {
      // Self-built: no Franz account needed, sign in to the embedded local server
      if (!this.isAutoLoginRunning) {
        this.isAutoLoginRunning = true;
        this._login({ email: 'franz@localhost', password: 'local' })
          .finally(() => { this.isAutoLoginRunning = false; });
      }
    }
  };

  // Reactions
  async _getUserData() {
    if (this.isLoggedIn) {
      const data = await this.getUserInfoRequest.execute()._promise;

      // We need to set the beta flag for the SettingsStore
      this.actions.settings.update({
        type: 'app',
        data: {
          beta: data.beta,
          locale: data.locale,
        },
      });
    }
  }

  async _resetTrialActivationState() {
    if (this.hasActivatedTrial) {
      await sleep(ms('12s'));

      this.hasActivatedTrial = false;
    }
  }

  // Helpers
  _parseToken(authToken) {
    try {
      const decoded = jwt.decode(authToken);

      return ({
        id: decoded.userId,
        tokenExpiry: moment.unix(decoded.exp).toISOString(),
        authToken,
      });
    } catch (err) {
      this._logout();
      return false;
    }
  }

  _setUserData(authToken) {
    const data = this._parseToken(authToken);
    if (data.authToken) {
      localStorage.setItem('authToken', data.authToken);

      this.authToken = data.authToken;
      this.id = data.id;
    } else {
      this.authToken = null;
      this.id = null;
    }
  }

  getAuthURL(url) {
    const parsedUrl = new URL(url);
    const params = new URLSearchParams(parsedUrl.search.slice(1));

    params.append('authToken', this.authToken);

    return `${parsedUrl.origin}${parsedUrl.pathname}?${params.toString()}`;
  }

  async _migrateUserLocale() {
    await this.getUserInfoRequest._promise;

    if (!this.data.locale) {
      debug('Migrate "locale" to user data');
      this.actions.user.update({
        userData: {
          locale: this.stores.app.locale,
        },
      });
    }
  }
}
