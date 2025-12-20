/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @param {{protocolGetVersionResponse: LH.CrdpCommands['Browser.getVersion']['returnType']}} param0
 */
function makeFakeDriver({protocolGetVersionResponse}) {
  let scrollPosition = {x: 0, y: 0};

  return {
    get fetcher() {
      return {
        disableRequestInterception: () => Promise.resolve(),
      };
    },
    getBrowserVersion() {
      return Promise.resolve(Object.assign({}, protocolGetVersionResponse, {milestone: 71}));
    },
    getBenchmarkIndex() {
      return Promise.resolve(125.2);
    },
    getAppManifest() {
      return Promise.resolve(null);
    },
    connect() {
      return Promise.resolve();
    },
    disconnect() {
      return Promise.resolve();
    },
    /** @param {string} url */
    gotoURL(url) {
      return Promise.resolve({finalUrl: url, timedOut: false});
    },
    beginEmulation() {
      return Promise.resolve();
    },
    setThrottling() {
      return Promise.resolve();
    },
    dismissJavaScriptDialogs() {
      return Promise.resolve();
    },
    assertNoSameOriginServiceWorkerClients() {
      return Promise.resolve();
    },
    reloadForCleanStateIfNeeded() {
      return Promise.resolve();
    },
    enableRuntimeEvents() {
      return Promise.resolve();
    },
    enableAsyncStacks() {
      return Promise.resolve();
    },
    evaluateScriptOnLoad() {
      return Promise.resolve();
    },
    cleanBrowserCaches() {},
    clearDataForOrigin() {},
    cacheNatives() {
      return Promise.resolve();
    },
    evaluateAsync() {
      return Promise.resolve({});
    },
    /** @param {{x: number, y: number}} position */
    scrollTo(position) {
      scrollPosition = position;
      return Promise.resolve();
    },
    getScrollPosition() {
      return Promise.resolve(scrollPosition);
    },
    registerPerformanceObserver() {
      return Promise.resolve();
    },
    beginTrace() {
      return Promise.resolve();
    },
    endTrace() {
      // Minimal indirection so TypeScript doesn't crash trying to infer a type.
      const modulePath = '../fixtures/traces/progressive-app.json';
      return Promise.resolve(require(modulePath));
    },
    beginDevtoolsLog() {},
    endDevtoolsLog() {
      // Minimal indirection so TypeScript doesn't crash trying to infer a type.
      const modulePath = '../fixtures/artifacts/perflog/defaultPass.devtoolslog.json';
      return require(modulePath);
    },
    blockUrlPatterns() {
      return Promise.resolve();
    },
    setExtraHTTPHeaders() {
      return Promise.resolve();
    },
  };
}

// https://chromedevtools.github.io/devtools-protocol/tot/Browser#method-getVersion
const protocolGetVersionResponse = {
  protocolVersion: '1.3',
  product: 'Chrome/71.0.3577.0',
  revision: '@fc334a55a70eec12fc77853c53979f81e8496c21',
  // eslint-disable-next-line max-len
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3577.0 Safari/537.36',
  jsVersion: '7.1.314',
};
const fakeDriver = makeFakeDriver({protocolGetVersionResponse});

const fakeDriverUsingRealMobileDevice = makeFakeDriver({
  protocolGetVersionResponse: {
    ...protocolGetVersionResponse,
    // eslint-disable-next-line max-len
    userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MRA58N) AppleWebKit/537.36(KHTML, like Gecko) Chrome/69.0.3464.0 Mobile Safari/537.36',
  },
});

module.exports = {
  ...fakeDriver,
  fakeDriverUsingRealMobileDevice,
  protocolGetVersionResponse,
};
