import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import PropTypes from 'prop-types';

import { autorun, observable } from 'mobx';
import { invokeWebContents, watchNavigation } from '../../../helpers/webContents-helpers';
import WebControls from '../components/WebControls';
import ServicesStore from '../../../stores/ServicesStore';
import Service from '../../../models/Service';

@inject('stores', 'actions') @observer
class WebControlsScreen extends Component {
  @observable url = '';

  @observable canGoBack = false;

  @observable canGoForward = false;

  webContents = null;

  autorunDisposer = null;

  navigationWatcher = null;

  componentDidMount() {
    const { service } = this.props;

    this.autorunDisposer = autorun(() => {
      if (!service.isAttached || this.webContents === service.webContentsId) return;

      if (this.navigationWatcher) this.navigationWatcher.stop();

      this.webContents = service.webContentsId;

      this.navigationWatcher = watchNavigation(this.webContents, ({ url, canGoBack, canGoForward }) => {
        this.url = url;
        this.canGoBack = canGoBack;
        this.canGoForward = canGoForward;
      });

      this.navigationWatcher.ready.then((url) => { if (url) this.url = url; });
    });
  }

  componentWillUnmount() {
    this.autorunDisposer();

    if (this.navigationWatcher) this.navigationWatcher.stop();
  }

  goHome() {
    const { reloadActive } = this.props.actions.service;

    if (!this.webContents) return;

    reloadActive();
  }

  reload() {
    if (!this.webContents) return;

    invokeWebContents(this.webContents, 'reload');
  }

  goBack() {
    if (!this.webContents) return;

    invokeWebContents(this.webContents, 'goBack');
  }

  goForward() {
    if (!this.webContents) return;

    invokeWebContents(this.webContents, 'goForward');
  }

  navigate(newUrl) {
    if (!this.webContents) return;

    let url = newUrl;

    try {
      url = new URL(url).toString();
    } catch (err) {
      // eslint-disable-next-line no-useless-escape
      if (url.match(/^((?!-))(xn--)?[a-z0-9][a-z0-9-_]{0,61}[a-z0-9]{0,1}\.(xn--)?([a-z0-9\-]{1,61}|[a-z0-9-]{1,30}\.[a-z]{2,})$/)) {
        url = `https://${url}`;
      } else {
        url = `https://www.google.com/search?query=${url}`;
      }
    }

    invokeWebContents(this.webContents, 'loadURL', url);
    this.url = url;
  }

  openInBrowser() {
    const { openExternalUrl } = this.props.actions.app;

    if (!this.webContents) return;

    openExternalUrl({ url: this.url });
  }

  render() {
    return (
      <WebControls
        goHome={() => this.goHome()}
        reload={() => this.reload()}
        openInBrowser={() => this.openInBrowser()}
        canGoBack={this.canGoBack}
        goBack={() => this.goBack()}
        canGoForward={this.canGoForward}
        goForward={() => this.goForward()}
        navigate={url => this.navigate(url)}
        url={this.url}
      />
    );
  }
}

export default WebControlsScreen;

WebControlsScreen.wrappedComponent.propTypes = {
  service: PropTypes.instanceOf(Service).isRequired,
  stores: PropTypes.shape({
    services: PropTypes.instanceOf(ServicesStore).isRequired,
  }).isRequired,
  actions: PropTypes.shape({
    app: PropTypes.shape({
      openExternalUrl: PropTypes.func.isRequired,
    }).isRequired,
    service: PropTypes.shape({
      reloadActive: PropTypes.func.isRequired,
    }).isRequired,
  }).isRequired,
};
