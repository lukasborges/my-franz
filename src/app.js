import { webFrame } from 'electron';

import { Provider } from 'mobx-react';
import { RouterStore, syncHistoryWithStore } from 'mobx-react-router';
import { render } from 'react-dom';
import {
  hashHistory,
  IndexRedirect,
  Route,
  Router,
} from 'react-router';

import '@babel/polyfill';
import smoothScroll from 'smoothscroll-polyfill';

import actions from './actions';
import apiFactory from './api';
import LocalApi from './api/server/LocalApi';
import ServerApi from './api/server/ServerApi';
import MenuFactory from './lib/Menu';
import TouchBarFactory from './lib/TouchBar';
import * as analytics from './lib/analytics';
import storeFactory from './stores';

import I18N from './I18n';
import AppLayoutContainer from './containers/layout/AppLayoutContainer';
import EditServiceScreen from './containers/settings/EditServiceScreen';
import EditSettingsScreen from './containers/settings/EditSettingsScreen';
import RecipesScreen from './containers/settings/RecipesScreen';
import ServicesScreen from './containers/settings/ServicesScreen';
import SettingsWindow from './containers/settings/SettingsWindow';
import SubscriptionPopupScreen from './containers/subscription/SubscriptionPopupScreen';
import { isMac } from './environment';
import { ANNOUNCEMENTS_ROUTES } from './features/announcements';
import AnnouncementScreen from './features/announcements/components/AnnouncementScreen';
import { WORKSPACES_ROUTES } from './features/workspaces';
import EditWorkspaceScreen from './features/workspaces/containers/EditWorkspaceScreen';
import WorkspacesScreen from './features/workspaces/containers/WorkspacesScreen';

// Add Polyfills
smoothScroll.polyfill();

// Basic electron Setup
webFrame.setVisualZoomLevelLimits(1, 1);

window.addEventListener('load', () => {
  const api = apiFactory(new ServerApi(), new LocalApi());
  const router = new RouterStore();
  const history = syncHistoryWithStore(hashHistory, router);
  const stores = storeFactory(api, actions, router);
  const menu = isMac ? new MenuFactory(stores, actions) : null;
  const touchBar = new TouchBarFactory(stores, actions);

  window.franz = {
    stores,
    actions,
    api,
    menu,
    touchBar,
    analytics,
    features: {},
    render() {
      const preparedApp = (
        <Provider stores={stores} actions={actions}>
          <I18N>
            <Router history={history}>
              <Route path="/" component={AppLayoutContainer}>
                <Route path={ANNOUNCEMENTS_ROUTES.TARGET} component={AnnouncementScreen} />
                <Route path="/settings" component={SettingsWindow}>
                  <IndexRedirect to="/settings/recipes" />
                  <Route path="/settings/recipes" component={RecipesScreen} />
                  <Route path="/settings/recipes/:filter" component={RecipesScreen} />
                  <Route path="/settings/services" component={ServicesScreen} />
                  <Route path="/settings/services/:action/:id" component={EditServiceScreen} />
                  <Route path={WORKSPACES_ROUTES.ROOT} component={WorkspacesScreen} />
                  <Route path={WORKSPACES_ROUTES.EDIT} component={EditWorkspaceScreen} />
                  <Route path="/settings/app" component={EditSettingsScreen} />
                  <Route path="/announcements/*" component={null} />
                </Route>
              </Route>
              <Route path="/payment/:url" component={SubscriptionPopupScreen} />
              <Route path="*">
                <IndexRedirect to="/" />
              </Route>
            </Router>
          </I18N>
        </Provider>
      );
      render(preparedApp, document.getElementById('root'));
    },
  };
  window.franz.render();
});

// Prevent drag and drop into window from redirecting
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());
window.addEventListener('dragover', event => event.stopPropagation());
window.addEventListener('drop', event => event.stopPropagation());
