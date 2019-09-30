/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRecorder = require('../lib/network-recorder.js');
const emulation = require('../lib/emulation.js');
const Element = require('../lib/element.js');
const LHError = require('../lib/lh-error.js');
const NetworkRequest = require('../lib/network-request.js');
const EventEmitter = require('events').EventEmitter;
const URL = require('../lib/url-shim.js');
const constants = require('../config/constants.js');

const log = require('lighthouse-logger');
const DevtoolsLog = require('./devtools-log.js');

const pageFunctions = require('../lib/page-functions.js');

// Pulled in for Connection type checking.
// eslint-disable-next-line no-unused-vars
const Connection = require('./connections/connection.js');

// Controls how long to wait after onLoad before continuing
const DEFAULT_PAUSE_AFTER_LOAD = 0;
// Controls how long to wait between network requests before determining the network is quiet
const DEFAULT_NETWORK_QUIET_THRESHOLD = 5000;
// Controls how long to wait between longtasks before determining the CPU is idle, off by default
const DEFAULT_CPU_QUIET_THRESHOLD = 0;
// Controls how long to wait for a response after sending a DevTools protocol command.
const DEFAULT_PROTOCOL_TIMEOUT = 30000;

/**
 * @typedef {LH.Protocol.StrictEventEmitter<LH.CrdpEvents>} CrdpEventEmitter
 */

class Driver {
  /**
   * @param {Connection} connection
   */
  constructor(connection) {
    this._traceCategories = Driver.traceCategories;
    /**
     * An event emitter that enforces mapping between Crdp event names and payload types.
     */
    this._eventEmitter = /** @type {CrdpEventEmitter} */ (new EventEmitter());
    this._connection = connection;
    // Used to save network and lifecycle protocol traffic. Just Page and Network are needed.
    this._devtoolsLog = new DevtoolsLog(/^(Page|Network)\./);
    this.online = true;
    /** @type {Map<string, number>} */
    this._domainEnabledCounts = new Map();
    /** @type {number|undefined} */
    this._isolatedExecutionContextId = undefined;

    /**
     * Used for monitoring network status events during gotoURL.
     * @type {?NetworkRecorder}
     * @private
     */
    this._networkStatusMonitor = null;

    /**
     * Used for monitoring url redirects during gotoURL.
     * @type {?string}
     * @private
     */
    this._monitoredUrl = null;

    /**
     * Used for sending messages to subtargets. Each message needs a unique ID even if we don't bother
     * reading back the result of each command.
     *
     * @type {number}
     * @private
     */
    this._targetProxyMessageId = 0;

    this.on('Target.attachedToTarget', event => {
      this._handleTargetAttached(event, []).catch(this._handleEventError);
    });

    this.on('Target.receivedMessageFromTarget', event => {
      this._handleReceivedMessageFromTarget(event, []).catch(this._handleEventError);
    });

    // We use isolated execution contexts for `evaluateAsync` that can be destroyed through navigation
    // and other page actions. Cleanup our relevant bookkeeping as we see those events.
    this.on('Runtime.executionContextDestroyed', event => {
      if (event.executionContextId === this._isolatedExecutionContextId) {
        this._clearIsolatedContextId();
      }
    });

    this.on('Page.frameNavigated', () => this._clearIsolatedContextId());

    connection.on('protocolevent', this._handleProtocolEvent.bind(this));

    /**
     * @type {number}
     * @private
     */
    this._nextProtocolTimeout = DEFAULT_PROTOCOL_TIMEOUT;
  }

  static get traceCategories() {
    return [
      // Exclude default categories. We'll be selective to minimize trace size
      '-*',

      // Used instead of 'toplevel' in Chrome 71+
      'disabled-by-default-lighthouse',

      // All compile/execute events are captured by parent events in devtools.timeline..
      // But the v8 category provides some nice context for only <0.5% of the trace size
      'v8',
      // Same situation here. This category is there for RunMicrotasks only, but with other teams
      // accidentally excluding microtasks, we don't want to assume a parent event will always exist
      'v8.execute',

      // For extracting UserTiming marks/measures
      'blink.user_timing',

      // Not mandatory but not used much
      'blink.console',

      // Most the events we need come in on these two
      'devtools.timeline',
      'disabled-by-default-devtools.timeline',

      // Up to 450 (https://goo.gl/rBfhn4) JPGs added to the trace
      'disabled-by-default-devtools.screenshot',

      // This doesn't add its own events, but adds a `stackTrace` property to devtools.timeline events
      'disabled-by-default-devtools.timeline.stack',

      // CPU sampling profiler data only enabled for debugging purposes
      // 'disabled-by-default-v8.cpu_profiler',
      // 'disabled-by-default-v8.cpu_profiler.hires',
    ];
  }

  /**
   * @return {Promise<LH.Crdp.Browser.GetVersionResponse & {milestone: number}>}
   */
  async getBrowserVersion() {
    const status = {msg: 'Getting browser version', id: 'lh:gather:getVersion'};
    log.time(status, 'verbose');
    const version = await this.sendCommand('Browser.getVersion');
    const match = version.product.match(/\/(\d+)/); // eg 'Chrome/71.0.3577.0'
    const milestone = match ? parseInt(match[1]) : 0;
    log.timeEnd(status);
    return Object.assign(version, {milestone});
  }

  /**
   * Computes the ULTRADUMB™ benchmark index to get a rough estimate of device class.
   * @return {Promise<number>}
   */
  async getBenchmarkIndex() {
    const status = {msg: 'Benchmarking machine', id: 'lh:gather:getBenchmarkIndex'};
    log.time(status);
    const indexVal = await this.evaluateAsync(`(${pageFunctions.ultradumbBenchmarkString})()`);
    log.timeEnd(status);
    return indexVal;
  }

  /**
   * @return {Promise<void>}
   */
  async connect() {
    const status = {msg: 'Connecting to browser', id: 'lh:init:connect'};
    log.time(status);
    await this._connection.connect();
    log.timeEnd(status);
  }

  /**
   * @return {Promise<void>}
   */
  disconnect() {
    return this._connection.disconnect();
  }

  /**
   * Get the browser WebSocket endpoint for devtools protocol clients like Puppeteer.
   * Only works with WebSocket connection, not extension or devtools.
   * @return {Promise<string>}
   */
  wsEndpoint() {
    return this._connection.wsEndpoint();
  }

  /**
   * Bind listeners for protocol events.
   * @template {keyof LH.CrdpEvents} E
   * @param {E} eventName
   * @param {(...args: LH.CrdpEvents[E]) => void} cb
   */
  on(eventName, cb) {
    if (this._eventEmitter === null) {
      throw new Error('connect() must be called before attempting to listen to events.');
    }

    // log event listeners being bound
    log.formatProtocol('listen for event =>', {method: eventName}, 'verbose');
    this._eventEmitter.on(eventName, cb);
  }

  /**
   * Bind a one-time listener for protocol events. Listener is removed once it
   * has been called.
   * @template {keyof LH.CrdpEvents} E
   * @param {E} eventName
   * @param {(...args: LH.CrdpEvents[E]) => void} cb
   */
  once(eventName, cb) {
    if (this._eventEmitter === null) {
      throw new Error('connect() must be called before attempting to listen to events.');
    }
    // log event listeners being bound
    log.formatProtocol('listen once for event =>', {method: eventName}, 'verbose');
    this._eventEmitter.once(eventName, cb);
  }

  /**
   * Unbind event listener.
   * @template {keyof LH.CrdpEvents} E
   * @param {E} eventName
   * @param {Function} cb
   */
  off(eventName, cb) {
    if (this._eventEmitter === null) {
      throw new Error('connect() must be called before attempting to remove an event listener.');
    }

    this._eventEmitter.removeListener(eventName, cb);
  }

  /**
   * Debounce enabling or disabling domains to prevent driver users from
   * stomping on each other. Maintains an internal count of the times a domain
   * has been enabled. Returns false if the command would have no effect (domain
   * is already enabled or disabled), or if command would interfere with another
   * user of that domain (e.g. two gatherers have enabled a domain, both need to
   * disable it for it to be disabled). Returns true otherwise.
   * @param {string} domain
   * @param {boolean} enable
   * @return {boolean}
   * @private
   */
  _shouldToggleDomain(domain, enable) {
    const enabledCount = this._domainEnabledCounts.get(domain) || 0;
    const newCount = enabledCount + (enable ? 1 : -1);
    this._domainEnabledCounts.set(domain, Math.max(0, newCount));

    // Switching to enabled or disabled, respectively.
    if ((enable && newCount === 1) || (!enable && newCount === 0)) {
      log.verbose('Driver', `${domain}.${enable ? 'enable' : 'disable'}`);
      return true;
    } else {
      if (newCount < 0) {
        log.error('Driver', `Attempted to disable domain '${domain}' when already disabled.`);
      }
      return false;
    }
  }

  /**
   * timeout is used for the next call to 'sendCommand'.
   * NOTE: This can eventually be replaced when TypeScript
   * resolves https://github.com/Microsoft/TypeScript/issues/5453.
   * @param {number} timeout
   */
  setNextProtocolTimeout(timeout) {
    this._nextProtocolTimeout = timeout;
  }

  /**
   * @param {LH.Protocol.RawEventMessage} event
   */
  _handleProtocolEvent(event) {
    this._devtoolsLog.record(event);
    if (this._networkStatusMonitor) {
      this._networkStatusMonitor.dispatch(event);
    }

    // @ts-ignore TODO(bckenny): tsc can't type event.params correctly yet,
    // typing as property of union instead of narrowing from union of
    // properties. See https://github.com/Microsoft/TypeScript/pull/22348.
    this._eventEmitter.emit(event.method, event.params);
  }

  /**
   * @param {Error} error
   */
  _handleEventError(error) {
    log.error('Driver', 'Unhandled event error', error.message);
  }

  /**
   * @param {LH.Crdp.Target.ReceivedMessageFromTargetEvent} event
   * @param {string[]} parentSessionIds The list of session ids of the parents from youngest to oldest.
   */
  async _handleReceivedMessageFromTarget(event, parentSessionIds) {
    const {targetId, sessionId, message} = event;
    /** @type {LH.Protocol.RawMessage} */
    const protocolMessage = JSON.parse(message);

    // Message was a response to some command, not an event, so we'll ignore it.
    if ('id' in protocolMessage) return;

    // We receive messages from the outermost subtarget which wraps the messages from the inner subtargets.
    // We are recursively processing them from outside in, so build the list of parentSessionIds accordingly.
    const sessionIdPath = [sessionId, ...parentSessionIds];

    if (protocolMessage.method === 'Target.receivedMessageFromTarget') {
      // Unravel any messages from subtargets by recursively processing
      await this._handleReceivedMessageFromTarget(protocolMessage.params, sessionIdPath);
    }

    if (protocolMessage.method === 'Target.attachedToTarget') {
      // Process any attachedToTarget messages from subtargets
      await this._handleTargetAttached(protocolMessage.params, sessionIdPath);
    }

    if (protocolMessage.method.startsWith('Network')) {
      this._handleProtocolEvent({...protocolMessage, source: {targetId, sessionId}});
    }
  }

  /**
   * @param {LH.Crdp.Target.AttachedToTargetEvent} event
   * @param {string[]} parentSessionIds The list of session ids of the parents from youngest to oldest.
   */
  async _handleTargetAttached(event, parentSessionIds) {
    const sessionIdPath = [event.sessionId, ...parentSessionIds];

    // We're only interested in network requests from iframes for now as those are "part of the page".
    // If it's not an iframe, just resume it and move on.
    if (event.targetInfo.type !== 'iframe') {
      // We suspended the target when we auto-attached, so make sure it goes back to being normal.
      await this.sendMessageToTarget(sessionIdPath, 'Runtime.runIfWaitingForDebugger');
      return;
    }

    // Events from subtargets will be stringified and sent back on `Target.receivedMessageFromTarget`.
    // We want to receive information about network requests from iframes, so enable the Network domain.
    await this.sendMessageToTarget(sessionIdPath, 'Network.enable');
    // We also want to receive information about subtargets of subtargets, so make sure we autoattach recursively.
    await this.sendMessageToTarget(sessionIdPath, 'Target.setAutoAttach', {
      autoAttach: true,
      // Pause targets on startup so we don't miss anything
      waitForDebuggerOnStart: true,
    });

    // We suspended the target when we auto-attached, so make sure it goes back to being normal.
    await this.sendMessageToTarget(sessionIdPath, 'Runtime.runIfWaitingForDebugger');
  }

  /**
   * Send protocol commands to a subtarget, wraps the message in as many `Target.sendMessageToTarget`
   * commands as necessary.
   *
   * @template {keyof LH.CrdpCommands} C
   * @param {string[]} sessionIdPath List of session ids to send to, from youngest-oldest/inside-out.
   * @param {C} method
   * @param {LH.CrdpCommands[C]['paramsType']} params
   * @return {Promise<LH.CrdpCommands[C]['returnType']>}
   */
  sendMessageToTarget(sessionIdPath, method, ...params) {
    this._targetProxyMessageId++;
    /** @type {LH.Crdp.Target.SendMessageToTargetRequest} */
    let payload = {
      sessionId: sessionIdPath[0],
      message: JSON.stringify({id: this._targetProxyMessageId, method, params: params[0]}),
    };

    for (const sessionId of sessionIdPath.slice(1)) {
      this._targetProxyMessageId++;
      payload = {
        sessionId,
        message: JSON.stringify({
          id: this._targetProxyMessageId,
          method: 'Target.sendMessageToTarget',
          params: payload,
        }),
      };
    }

    return this.sendCommand('Target.sendMessageToTarget', payload);
  }

  /**
   * Call protocol methods, with a timeout.
   * To configure the timeout for the next call, use 'setNextProtocolTimeout'.
   * @template {keyof LH.CrdpCommands} C
   * @param {C} method
   * @param {LH.CrdpCommands[C]['paramsType']} params
   * @return {Promise<LH.CrdpCommands[C]['returnType']>}
   */
  sendCommand(method, ...params) {
    const timeout = this._nextProtocolTimeout;
    this._nextProtocolTimeout = DEFAULT_PROTOCOL_TIMEOUT;
    return new Promise(async (resolve, reject) => {
      const asyncTimeout = setTimeout((() => {
        const err = new LHError(
          LHError.errors.PROTOCOL_TIMEOUT,
          {protocolMethod: method}
        );
        reject(err);
      }), timeout);
      try {
        const result = await this._innerSendCommand(method, ...params);
        resolve(result);
      } catch (err) {
        reject(err);
      } finally {
        clearTimeout(asyncTimeout);
      }
    });
  }

  /**
   * Call protocol methods.
   * @private
   * @template {keyof LH.CrdpCommands} C
   * @param {C} method
   * @param {LH.CrdpCommands[C]['paramsType']} params
   * @return {Promise<LH.CrdpCommands[C]['returnType']>}
   */
  _innerSendCommand(method, ...params) {
    const domainCommand = /^(\w+)\.(enable|disable)$/.exec(method);
    if (domainCommand) {
      const enable = domainCommand[2] === 'enable';
      if (!this._shouldToggleDomain(domainCommand[1], enable)) {
        return Promise.resolve();
      }
    }
    return this._connection.sendCommand(method, ...params);
  }

  /**
   * Returns whether a domain is currently enabled.
   * @param {string} domain
   * @return {boolean}
   */
  isDomainEnabled(domain) {
    // Defined, non-zero elements of the domains map are enabled.
    return !!this._domainEnabledCounts.get(domain);
  }

  /**
   * Add a script to run at load time of all future page loads.
   * @param {string} scriptSource
   * @return {Promise<LH.Crdp.Page.AddScriptToEvaluateOnLoadResponse>} Identifier of the added script.
   */
  evaluateScriptOnNewDocument(scriptSource) {
    return this.sendCommand('Page.addScriptToEvaluateOnLoad', {
      scriptSource,
    });
  }

  /**
   * Evaluate an expression in the context of the current page. If useIsolation is true, the expression
   * will be evaluated in a content script that has access to the page's DOM but whose JavaScript state
   * is completely separate.
   * Returns a promise that resolves on the expression's value.
   * @param {string} expression
   * @param {{useIsolation?: boolean}=} options
   * @return {Promise<*>}
   */
  async evaluateAsync(expression, options = {}) {
    const contextId = options.useIsolation ? await this._getOrCreateIsolatedContextId() : undefined;

    try {
      // `await` is not redundant here because we want to `catch` the async errors
      return await this._evaluateInContext(expression, contextId);
    } catch (err) {
      // If we were using isolation and the context disappeared on us, retry one more time.
      if (contextId && err.message.includes('Cannot find context')) {
        this._clearIsolatedContextId();
        const freshContextId = await this._getOrCreateIsolatedContextId();
        return this._evaluateInContext(expression, freshContextId);
      }

      throw err;
    }
  }

  /**
   * Evaluate an expression in the given execution context; an undefined contextId implies the main
   * page without isolation.
   * @param {string} expression
   * @param {number|undefined} contextId
   * @return {Promise<*>}
   */
  async _evaluateInContext(expression, contextId) {
    // Use a higher than default timeout if the user hasn't specified a specific timeout.
    // Otherwise, use whatever was requested.
    const timeout = this._nextProtocolTimeout === DEFAULT_PROTOCOL_TIMEOUT ?
      60000 : this._nextProtocolTimeout;
    const evaluationParams = {
      // We need to explicitly wrap the raw expression for several purposes:
      // 1. Ensure that the expression will be a native Promise and not a polyfill/non-Promise.
      // 2. Ensure that errors in the expression are captured by the Promise.
      // 3. Ensure that errors captured in the Promise are converted into plain-old JS Objects
      //    so that they can be serialized properly b/c JSON.stringify(new Error('foo')) === '{}'
      expression: `(function wrapInNativePromise() {
        const __nativePromise = window.__nativePromise || Promise;
        const URL = window.__nativeURL || window.URL;
        return new __nativePromise(function (resolve) {
          return __nativePromise.resolve()
            .then(_ => ${expression})
            .catch(${pageFunctions.wrapRuntimeEvalErrorInBrowserString})
            .then(resolve);
        });
      }())`,
      includeCommandLineAPI: true,
      awaitPromise: true,
      returnByValue: true,
      timeout,
      contextId,
    };

    this.setNextProtocolTimeout(timeout);
    const response = await this.sendCommand('Runtime.evaluate', evaluationParams);
    if (response.exceptionDetails) {
      // An error occurred before we could even create a Promise, should be *very* rare
      const errorMessage = response.exceptionDetails.exception ?
        response.exceptionDetails.exception.description :
        response.exceptionDetails.text;
      return Promise.reject(new Error(`Evaluation exception: ${errorMessage}`));
    }
    // Protocol should always return a 'result' object, but it is sometimes undefined.  See #6026.
    if (response.result === undefined) {
      return Promise.reject(
        new Error('Runtime.evaluate response did not contain a "result" object'));
    }
    const value = response.result.value;
    if (value && value.__failedInBrowser) {
      return Promise.reject(Object.assign(new Error(), value));
    } else {
      return value;
    }
  }

  /**
   * @return {Promise<{url: string, data: string}|null>}
   */
  async getAppManifest() {
    // In all environments but LR, Page.getAppManifest finishes very quickly.
    // In LR, there is a bug that causes this command to hang until outgoing
    // requests finish. This has been seen in long polling (where it will never
    // return) and when other requests take a long time to finish. We allow 10 seconds
    // for outgoing requests to finish. Anything more, and we continue the run without
    // a manifest.
    // Googlers, see: http://b/124008171
    this.setNextProtocolTimeout(10000);
    let response;
    try {
      response = await this.sendCommand('Page.getAppManifest');
    } catch (err) {
      if (err.code === 'PROTOCOL_TIMEOUT') {
        // LR will timeout fetching the app manifest in some cases, move on without one.
        // https://github.com/GoogleChrome/lighthouse/issues/7147#issuecomment-461210921
        log.error('Driver', 'Failed fetching manifest', err);
        return null;
      }

      throw err;
    }

    let data = response.data;

    // We're not reading `response.errors` however it may contain critical and noncritical
    // errors from Blink's manifest parser:
    //   https://chromedevtools.github.io/debugger-protocol-viewer/tot/Page/#type-AppManifestError
    if (!data) {
      // If the data is empty, the page had no manifest.
      return null;
    }

    const BOM_LENGTH = 3;
    const BOM_FIRSTCHAR = 65279;
    const isBomEncoded = data.charCodeAt(0) === BOM_FIRSTCHAR;

    if (isBomEncoded) {
      data = Buffer.from(data).slice(BOM_LENGTH).toString();
    }

    return {...response, data};
  }

  /**
   * @return {Promise<LH.Crdp.ServiceWorker.WorkerVersionUpdatedEvent>}
   */
  getServiceWorkerVersions() {
    return new Promise((resolve, reject) => {
      /**
       * @param {LH.Crdp.ServiceWorker.WorkerVersionUpdatedEvent} data
       */
      const versionUpdatedListener = data => {
        // find a service worker with runningStatus that looks like active
        // on slow connections the serviceworker might still be installing
        const activateCandidates = data.versions.filter(sw => {
          return sw.status !== 'redundant';
        });
        const hasActiveServiceWorker = activateCandidates.find(sw => {
          return sw.status === 'activated';
        });

        if (!activateCandidates.length || hasActiveServiceWorker) {
          this.off('ServiceWorker.workerVersionUpdated', versionUpdatedListener);
          this.sendCommand('ServiceWorker.disable')
            .then(_ => resolve(data), reject);
        }
      };

      this.on('ServiceWorker.workerVersionUpdated', versionUpdatedListener);

      this.sendCommand('ServiceWorker.enable').catch(reject);
    });
  }

  /**
   * @return {Promise<LH.Crdp.ServiceWorker.WorkerRegistrationUpdatedEvent>}
   */
  getServiceWorkerRegistrations() {
    return new Promise((resolve, reject) => {
      this.once('ServiceWorker.workerRegistrationUpdated', data => {
        this.sendCommand('ServiceWorker.disable')
          .then(_ => resolve(data), reject);
      });

      this.sendCommand('ServiceWorker.enable').catch(reject);
    });
  }

  /**
   * Rejects if any open tabs would share a service worker with the target URL.
   * This includes the target tab, so navigation to something like about:blank
   * should be done before calling.
   * @param {string} pageUrl
   * @return {Promise<void>}
   */
  assertNoSameOriginServiceWorkerClients(pageUrl) {
    /** @type {Array<LH.Crdp.ServiceWorker.ServiceWorkerRegistration>} */
    let registrations;
    /** @type {Array<LH.Crdp.ServiceWorker.ServiceWorkerVersion>} */
    let versions;

    return this.getServiceWorkerRegistrations().then(data => {
      registrations = data.registrations;
    }).then(_ => this.getServiceWorkerVersions()).then(data => {
      versions = data.versions;
    }).then(_ => {
      const origin = new URL(pageUrl).origin;

      registrations
        .filter(reg => {
          const swOrigin = new URL(reg.scopeURL).origin;

          return origin === swOrigin;
        })
        .forEach(reg => {
          versions.forEach(ver => {
            // Ignore workers unaffiliated with this registration
            if (ver.registrationId !== reg.registrationId) {
              return;
            }

            // Throw if service worker for this origin has active controlledClients.
            if (ver.controlledClients && ver.controlledClients.length > 0) {
              throw new Error('You probably have multiple tabs open to the same origin.');
            }
          });
        });
    });
  }

  /**
   * Returns a promise that resolves immediately.
   * Used for placeholder conditions that we don't want to start waiting for just yet, but still want
   * to satisfy the same interface.
   * @return {{promise: Promise<void>, cancel: function(): void}}
   */
  _waitForNothing() {
    return {promise: Promise.resolve(), cancel() {}};
  }

  /**
   * Returns a promise that resolve when a frame has been navigated.
   * Used for detecting that our about:blank reset has been completed.
   */
  _waitForFrameNavigated() {
    return new Promise(resolve => {
      this.once('Page.frameNavigated', resolve);
    });
  }

  /**
   * Returns a promise that resolve when a frame has a FCP.
   * @param {number} maxWaitForFCPMs
   * @return {{promise: Promise<void>, cancel: function(): void}}
   */
  _waitForFCP(maxWaitForFCPMs) {
    /** @type {(() => void)} */
    let cancel = () => {
      throw new Error('_waitForFCP.cancel() called before it was defined');
    };

    const promise = new Promise((resolve, reject) => {
      const maxWaitTimeout = setTimeout(() => {
        reject(new LHError(LHError.errors.NO_FCP));
      }, maxWaitForFCPMs);

      /** @param {LH.Crdp.Page.LifecycleEventEvent} e */
      const lifecycleListener = e => {
        if (e.name === 'firstContentfulPaint') {
          resolve();
          cancel();
        }
      };

      this.on('Page.lifecycleEvent', lifecycleListener);

      let canceled = false;
      cancel = () => {
        if (canceled) return;
        canceled = true;
        this.off('Page.lifecycleEvent', lifecycleListener);
        maxWaitTimeout && clearTimeout(maxWaitTimeout);
        reject(new Error('Wait for FCP canceled'));
      };
    });

    return {
      promise,
      cancel,
    };
  }

  /**
   * Returns a promise that resolves when the network has been idle (after DCL) for
   * `networkQuietThresholdMs` ms and a method to cancel internal network listeners/timeout.
   * @param {number} networkQuietThresholdMs
   * @return {{promise: Promise<void>, cancel: function(): void}}
   * @private
   */
  _waitForNetworkIdle(networkQuietThresholdMs) {
    let hasDCLFired = false;
    /** @type {NodeJS.Timer|undefined} */
    let idleTimeout;
    /** @type {(() => void)} */
    let cancel = () => {
      throw new Error('_waitForNetworkIdle.cancel() called before it was defined');
    };

    // Check here for _networkStatusMonitor to satisfy type checker. Any further race condition
    // will be caught at runtime on calls to it.
    if (!this._networkStatusMonitor) {
      throw new Error('Driver._waitForNetworkIdle called with no networkStatusMonitor');
    }
    const networkStatusMonitor = this._networkStatusMonitor;

    const promise = new Promise((resolve, reject) => {
      const onIdle = () => {
        // eslint-disable-next-line no-use-before-define
        networkStatusMonitor.once('network-2-busy', onBusy);
        idleTimeout = setTimeout(_ => {
          cancel();
          resolve();
        }, networkQuietThresholdMs);
      };

      const onBusy = () => {
        networkStatusMonitor.once('network-2-idle', onIdle);
        idleTimeout && clearTimeout(idleTimeout);
      };

      const domContentLoadedListener = () => {
        hasDCLFired = true;
        if (networkStatusMonitor.is2Idle()) {
          onIdle();
        } else {
          onBusy();
        }
      };

      // We frequently need to debug why LH is still waiting for the page.
      // This listener is added to all network events to verbosely log what URLs we're waiting on.
      const logStatus = () => {
        if (!hasDCLFired) {
          log.verbose('Driver', 'Waiting on DomContentLoaded');
          return;
        }

        const inflightRecords = networkStatusMonitor.getInflightRecords();
        // If there are more than 20 inflight requests, load is still in full swing.
        // Wait until it calms down a bit to be a little less spammy.
        if (inflightRecords.length < 20) {
          for (const record of inflightRecords) {
            log.verbose('Driver', `Waiting on ${record.url.slice(0, 120)} to finish`);
          }
        }
      };

      networkStatusMonitor.on('requeststarted', logStatus);
      networkStatusMonitor.on('requestloaded', logStatus);
      networkStatusMonitor.on('network-2-busy', logStatus);

      this.once('Page.domContentEventFired', domContentLoadedListener);
      let canceled = false;
      cancel = () => {
        if (canceled) return;
        canceled = true;
        idleTimeout && clearTimeout(idleTimeout);
        this.off('Page.domContentEventFired', domContentLoadedListener);
        networkStatusMonitor.removeListener('network-2-busy', onBusy);
        networkStatusMonitor.removeListener('network-2-idle', onIdle);
        networkStatusMonitor.removeListener('requeststarted', logStatus);
        networkStatusMonitor.removeListener('requestloaded', logStatus);
        networkStatusMonitor.removeListener('network-2-busy', logStatus);
      };
    });

    return {
      promise,
      cancel,
    };
  }

  /**
   * Resolves when there have been no long tasks for at least waitForCPUQuiet ms.
   * @param {number} waitForCPUQuiet
   * @return {{promise: Promise<void>, cancel: function(): void}}
   */
  _waitForCPUIdle(waitForCPUQuiet) {
    if (!waitForCPUQuiet) {
      return {
        promise: Promise.resolve(),
        cancel: () => undefined,
      };
    }

    /** @type {NodeJS.Timer|undefined} */
    let lastTimeout;
    let canceled = false;

    const checkForQuietExpression = `(${pageFunctions.checkTimeSinceLastLongTaskString})()`;
    /**
     * @param {Driver} driver
     * @param {() => void} resolve
     * @return {Promise<void>}
     */
    async function checkForQuiet(driver, resolve) {
      if (canceled) return;
      const timeSinceLongTask = await driver.evaluateAsync(checkForQuietExpression);
      if (canceled) return;

      if (typeof timeSinceLongTask === 'number') {
        if (timeSinceLongTask >= waitForCPUQuiet) {
          log.verbose('Driver', `CPU has been idle for ${timeSinceLongTask} ms`);
          resolve();
        } else {
          log.verbose('Driver', `CPU has been idle for ${timeSinceLongTask} ms`);
          const timeToWait = waitForCPUQuiet - timeSinceLongTask;
          lastTimeout = setTimeout(() => checkForQuiet(driver, resolve), timeToWait);
        }
      }
    }

    /** @type {(() => void)} */
    let cancel = () => {
      throw new Error('_waitForCPUIdle.cancel() called before it was defined');
    };
    const promise = new Promise((resolve, reject) => {
      checkForQuiet(this, resolve).catch(reject);
      cancel = () => {
        if (canceled) return;
        canceled = true;
        if (lastTimeout) clearTimeout(lastTimeout);
        reject(new Error('Wait for CPU idle canceled'));
      };
    });

    return {
      promise,
      cancel,
    };
  }

  /**
   * Return a promise that resolves `pauseAfterLoadMs` after the load event
   * fires and a method to cancel internal listeners and timeout.
   * @param {number} pauseAfterLoadMs
   * @return {{promise: Promise<void>, cancel: function(): void}}
   * @private
   */
  _waitForLoadEvent(pauseAfterLoadMs) {
    /** @type {(() => void)} */
    let cancel = () => {
      throw new Error('_waitForLoadEvent.cancel() called before it was defined');
    };

    const promise = new Promise((resolve, reject) => {
      /** @type {NodeJS.Timer|undefined} */
      let loadTimeout;
      const loadListener = function() {
        loadTimeout = setTimeout(resolve, pauseAfterLoadMs);
      };
      this.once('Page.loadEventFired', loadListener);

      let canceled = false;
      cancel = () => {
        if (canceled) return;
        canceled = true;
        this.off('Page.loadEventFired', loadListener);
        loadTimeout && clearTimeout(loadTimeout);
      };
    });

    return {
      promise,
      cancel,
    };
  }

  /**
   * Returns whether the page appears to be hung.
   * @return {Promise<boolean>}
   */
  async isPageHung() {
    try {
      this.setNextProtocolTimeout(1000);
      await this.sendCommand('Runtime.evaluate', {
        expression: '"ping"',
        returnByValue: true,
        timeout: 1000,
      });

      return false;
    } catch (err) {
      return true;
    }
  }

  /**
   * Returns a promise that resolves when:
   * - All of the following conditions have been met:
   *    - page has no security issues
   *    - pauseAfterLoadMs milliseconds have passed since the load event.
   *    - networkQuietThresholdMs milliseconds have passed since the last network request that exceeded
   *      2 inflight requests (network-2-quiet has been reached).
   *    - cpuQuietThresholdMs have passed since the last long task after network-2-quiet.
   * - maxWaitForLoadedMs milliseconds have passed.
   * See https://github.com/GoogleChrome/lighthouse/issues/627 for more.
   * @param {number} pauseAfterLoadMs
   * @param {number} networkQuietThresholdMs
   * @param {number} cpuQuietThresholdMs
   * @param {number} maxWaitForLoadedMs
   * @param {number=} maxWaitForFCPMs
   * @return {Promise<void>}
   * @private
   */
  async _waitForFullyLoaded(pauseAfterLoadMs, networkQuietThresholdMs, cpuQuietThresholdMs,
      maxWaitForLoadedMs, maxWaitForFCPMs) {
    /** @type {NodeJS.Timer|undefined} */
    let maxTimeoutHandle;

    // Listener for onload. Resolves on first FCP event.
    const waitForFCP = maxWaitForFCPMs ? this._waitForFCP(maxWaitForFCPMs) : this._waitForNothing();
    // Listener for onload. Resolves pauseAfterLoadMs ms after load.
    const waitForLoadEvent = this._waitForLoadEvent(pauseAfterLoadMs);
    // Network listener. Resolves when the network has been idle for networkQuietThresholdMs.
    const waitForNetworkIdle = this._waitForNetworkIdle(networkQuietThresholdMs);
    // CPU listener. Resolves when the CPU has been idle for cpuQuietThresholdMs after network idle.
    let waitForCPUIdle = this._waitForNothing();

    // Wait for both load promises. Resolves on cleanup function the clears load
    // timeout timer.
    const loadPromise = Promise.all([
      waitForFCP.promise,
      waitForLoadEvent.promise,
      waitForNetworkIdle.promise,
    ]).then(() => {
      waitForCPUIdle = this._waitForCPUIdle(cpuQuietThresholdMs);
      return waitForCPUIdle.promise;
    }).then(() => {
      return function() {
        log.verbose('Driver', 'loadEventFired and network considered idle');
      };
    }).catch(err => {
      // Throw the error in the cleanupFn so we still cleanup all our handlers.
      return function() {
        throw err;
      };
    });

    // Last resort timeout. Resolves maxWaitForLoadedMs ms from now on
    // cleanup function that removes loadEvent and network idle listeners.
    const maxTimeoutPromise = new Promise((resolve, reject) => {
      maxTimeoutHandle = setTimeout(resolve, maxWaitForLoadedMs);
    }).then(_ => {
      return async () => {
        log.warn('Driver', 'Timed out waiting for page load. Checking if page is hung...');
        if (await this.isPageHung()) {
          log.warn('Driver', 'Page appears to be hung, killing JavaScript...');
          await this.sendCommand('Emulation.setScriptExecutionDisabled', {value: true});
          await this.sendCommand('Runtime.terminateExecution');
          throw new LHError(LHError.errors.PAGE_HUNG);
        }
      };
    });

    // Wait for load or timeout and run the cleanup function the winner returns.
    const cleanupFn = await Promise.race([
      loadPromise,
      maxTimeoutPromise,
    ]);

    maxTimeoutHandle && clearTimeout(maxTimeoutHandle);
    waitForFCP.cancel();
    waitForLoadEvent.cancel();
    waitForNetworkIdle.cancel();
    waitForCPUIdle.cancel();

    await cleanupFn();
  }

  /**
   * Set up listener for network quiet events and URL redirects. Passed in URL
   * will be monitored for redirects, with the final loaded URL passed back in
   * _endNetworkStatusMonitoring.
   * @param {string} startingUrl
   * @return {Promise<void>}
   * @private
   */
  _beginNetworkStatusMonitoring(startingUrl) {
    this._networkStatusMonitor = new NetworkRecorder();

    // Update startingUrl if it's ever redirected.
    this._monitoredUrl = startingUrl;
    /** @param {LH.Artifacts.NetworkRequest} redirectRequest */
    const requestLoadedListener = redirectRequest => {
      // Ignore if this is not a redirected request.
      if (!redirectRequest.redirectSource) {
        return;
      }
      const earlierRequest = redirectRequest.redirectSource;
      if (earlierRequest.url === this._monitoredUrl) {
        this._monitoredUrl = redirectRequest.url;
      }
    };
    this._networkStatusMonitor.on('requestloaded', requestLoadedListener);

    return this.sendCommand('Network.enable');
  }

  /**
   * End network status listening. Returns the final, possibly redirected,
   * loaded URL starting with the one passed into _endNetworkStatusMonitoring.
   * @return {string}
   * @private
   */
  _endNetworkStatusMonitoring() {
    this._networkStatusMonitor = null;
    const finalUrl = this._monitoredUrl;
    this._monitoredUrl = null;

    if (!finalUrl) {
      throw new Error('Network Status Monitoring ended with an undefined finalUrl');
    }

    return finalUrl;
  }

  /**
   * Returns the cached isolated execution context ID or creates a new execution context for the main
   * frame. The cached execution context is cleared on every gotoURL invocation, so a new one will
   * always be created on the first call on a new page.
   * @return {Promise<number>}
   */
  async _getOrCreateIsolatedContextId() {
    if (typeof this._isolatedExecutionContextId === 'number') {
      return this._isolatedExecutionContextId;
    }

    const resourceTreeResponse = await this.sendCommand('Page.getResourceTree');
    const mainFrameId = resourceTreeResponse.frameTree.frame.id;

    const isolatedWorldResponse = await this.sendCommand('Page.createIsolatedWorld', {
      frameId: mainFrameId,
      worldName: 'lighthouse_isolated_context',
    });

    this._isolatedExecutionContextId = isolatedWorldResponse.executionContextId;
    return isolatedWorldResponse.executionContextId;
  }

  _clearIsolatedContextId() {
    this._isolatedExecutionContextId = undefined;
  }

  /**
   * Navigate to the given URL. Direct use of this method isn't advised: if
   * the current page is already at the given URL, navigation will not occur and
   * so the returned promise will only resolve after the MAX_WAIT_FOR_FULLY_LOADED
   * timeout. See https://github.com/GoogleChrome/lighthouse/pull/185 for one
   * possible workaround.
   * Resolves on the url of the loaded page, taking into account any redirects.
   * @param {string} url
   * @param {{waitForFCP?: boolean, waitForLoad?: boolean, waitForNavigated?: boolean, passContext?: LH.Gatherer.PassContext}} options
   * @return {Promise<string>}
   */
  async gotoURL(url, options = {}) {
    const waitForFCP = options.waitForFCP || false;
    const waitForNavigated = options.waitForNavigated || false;
    const waitForLoad = options.waitForLoad || false;
    const passContext = /** @type {Partial<LH.Gatherer.PassContext>} */ (options.passContext || {});
    const disableJS = passContext.disableJavaScript || false;

    if (waitForNavigated && (waitForFCP || waitForLoad)) {
      throw new Error('Cannot use both waitForNavigated and another event, pick just one');
    }

    await this._beginNetworkStatusMonitoring(url);
    await this._clearIsolatedContextId();

    // Enable auto-attaching to subtargets so we receive iframe information
    await this.sendCommand('Target.setAutoAttach', {
      autoAttach: true,
      // Pause targets on startup so we don't miss anything
      waitForDebuggerOnStart: true,
    });

    await this.sendCommand('Page.enable');
    await this.sendCommand('Page.setLifecycleEventsEnabled', {enabled: true});
    await this.sendCommand('Emulation.setScriptExecutionDisabled', {value: disableJS});
    // No timeout needed for Page.navigate. See https://github.com/GoogleChrome/lighthouse/pull/6413.
    const waitforPageNavigateCmd = this._innerSendCommand('Page.navigate', {url});

    if (waitForNavigated) {
      await this._waitForFrameNavigated();
    } else if (waitForLoad) {
      const passConfig = /** @type {Partial<LH.Config.Pass>} */ (passContext.passConfig || {});
      let {pauseAfterLoadMs, networkQuietThresholdMs, cpuQuietThresholdMs} = passConfig;
      let maxWaitMs = passContext.settings && passContext.settings.maxWaitForLoad;
      let maxFCPMs = passContext.settings && passContext.settings.maxWaitForFcp;

      /* eslint-disable max-len */
      if (typeof pauseAfterLoadMs !== 'number') pauseAfterLoadMs = DEFAULT_PAUSE_AFTER_LOAD;
      if (typeof networkQuietThresholdMs !== 'number') networkQuietThresholdMs = DEFAULT_NETWORK_QUIET_THRESHOLD;
      if (typeof cpuQuietThresholdMs !== 'number') cpuQuietThresholdMs = DEFAULT_CPU_QUIET_THRESHOLD;
      if (typeof maxWaitMs !== 'number') maxWaitMs = constants.defaultSettings.maxWaitForLoad;
      if (typeof maxFCPMs !== 'number') maxFCPMs = constants.defaultSettings.maxWaitForFcp;
      /* eslint-enable max-len */

      if (!waitForFCP) maxFCPMs = undefined;
      await this._waitForFullyLoaded(pauseAfterLoadMs, networkQuietThresholdMs, cpuQuietThresholdMs,
          maxWaitMs, maxFCPMs);
    }

    // Bring `Page.navigate` errors back into the promise chain. See https://github.com/GoogleChrome/lighthouse/pull/6739.
    await waitforPageNavigateCmd;

    return this._endNetworkStatusMonitoring();
  }

  /**
   * @param {string} objectId Object ID for the resolved DOM node
   * @param {string} propName Name of the property
   * @return {Promise<string|null>} The property value, or null, if property not found
  */
  async getObjectProperty(objectId, propName) {
    const propertiesResponse = await this.sendCommand('Runtime.getProperties', {
      objectId,
      accessorPropertiesOnly: true,
      generatePreview: false,
      ownProperties: false,
    });

    const propertyForName = propertiesResponse.result
        .find(property => property.name === propName);

    if (propertyForName && propertyForName.value) {
      return propertyForName.value.value;
    } else {
      return null;
    }
  }

  /**
   * Return the body of the response with the given ID. Rejects if getting the
   * body times out.
   * @param {string} requestId
   * @param {number} [timeout]
   * @return {Promise<string>}
   */
  async getRequestContent(requestId, timeout = 1000) {
    requestId = NetworkRequest.getRequestIdForBackend(requestId);

    // Encoding issues may lead to hanging getResponseBody calls: https://github.com/GoogleChrome/lighthouse/pull/4718
    // driver.sendCommand will handle timeout after 1s.
    this.setNextProtocolTimeout(timeout);
    const result = await this.sendCommand('Network.getResponseBody', {requestId});
    return result.body;
  }

  /**
   * @param {string} name The name of API whose permission you wish to query
   * @return {Promise<string>} The state of permissions, resolved in a promise.
   *    See https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query.
   */
  queryPermissionState(name) {
    const expressionToEval = `
      navigator.permissions.query({name: '${name}'}).then(result => {
        return result.state;
      })
    `;

    return this.evaluateAsync(expressionToEval);
  }

  /**
   * @param {string} selector Selector to find in the DOM
   * @return {Promise<Element|null>} The found element, or null, resolved in a promise
   */
  async querySelector(selector) {
    const documentResponse = await this.sendCommand('DOM.getDocument');
    const rootNodeId = documentResponse.root.nodeId;

    const targetNode = await this.sendCommand('DOM.querySelector', {
      nodeId: rootNodeId,
      selector,
    });

    if (targetNode.nodeId === 0) {
      return null;
    }
    return new Element(targetNode, this);
  }

  /**
   * @param {string} selector Selector to find in the DOM
   * @return {Promise<Array<Element>>} The found elements, or [], resolved in a promise
   */
  async querySelectorAll(selector) {
    const documentResponse = await this.sendCommand('DOM.getDocument');
    const rootNodeId = documentResponse.root.nodeId;

    const targetNodeList = await this.sendCommand('DOM.querySelectorAll', {
      nodeId: rootNodeId,
      selector,
    });

    /** @type {Array<Element>} */
    const elementList = [];
    targetNodeList.nodeIds.forEach(nodeId => {
      if (nodeId !== 0) {
        elementList.push(new Element({nodeId}, this));
      }
    });
    return elementList;
  }

  /**
   * Returns the flattened list of all DOM elements within the document.
   * @param {boolean=} pierce Whether to pierce through shadow trees and iframes.
   *     True by default.
   * @return {Promise<Array<Element>>} The found elements, or [], resolved in a promise
   */
  getElementsInDocument(pierce = true) {
    return this.getNodesInDocument(pierce)
      .then(nodes => nodes
        .filter(node => node.nodeType === 1)
        .map(node => new Element({nodeId: node.nodeId}, this))
      );
  }

  /**
   * Returns the flattened list of all DOM nodes within the document.
   * @param {boolean=} pierce Whether to pierce through shadow trees and iframes.
   *     True by default.
   * @return {Promise<Array<LH.Crdp.DOM.Node>>} The found nodes, or [], resolved in a promise
   */
  async getNodesInDocument(pierce = true) {
    const flattenedDocument = await this.sendCommand('DOM.getFlattenedDocument',
        {depth: -1, pierce});

    return flattenedDocument.nodes ? flattenedDocument.nodes : [];
  }

  /**
   * @param {{x: number, y: number}} position
   * @return {Promise<void>}
   */
  scrollTo(position) {
    const scrollExpression = `window.scrollTo(${position.x}, ${position.y})`;
    return this.evaluateAsync(scrollExpression, {useIsolation: true});
  }

  /**
   * @return {Promise<{x: number, y: number}>}
   */
  getScrollPosition() {
    return this.evaluateAsync(`({x: window.scrollX, y: window.scrollY})`, {useIsolation: true});
  }

  /**
   * @param {{additionalTraceCategories?: string|null}=} settings
   * @return {Promise<void>}
   */
  async beginTrace(settings) {
    const additionalCategories = (settings && settings.additionalTraceCategories &&
        settings.additionalTraceCategories.split(',')) || [];
    const traceCategories = this._traceCategories.concat(additionalCategories);

    // In Chrome <71, gotta use the chatty 'toplevel' cat instead of our own.
    // TODO(COMPAT): Once m71 ships to stable, drop this section
    const milestone = (await this.getBrowserVersion()).milestone;
    if (milestone < 71) {
      const toplevelIndex = traceCategories.indexOf('disabled-by-default-lighthouse');
      traceCategories[toplevelIndex] = 'toplevel';
    }

    const uniqueCategories = Array.from(new Set(traceCategories));

    // Check any domains that could interfere with or add overhead to the trace.
    if (this.isDomainEnabled('CSS')) {
      throw new Error('CSS domain enabled when starting trace');
    }
    if (this.isDomainEnabled('DOM')) {
      throw new Error('DOM domain enabled when starting trace');
    }

    // Enable Page domain to wait for Page.loadEventFired
    return this.sendCommand('Page.enable')
      .then(_ => this.sendCommand('Tracing.start', {
        categories: uniqueCategories.join(','),
        options: 'sampling-frequency=10000', // 1000 is default and too slow.
      }));
  }

  /**
   * @return {Promise<LH.Trace>}
   */
  endTrace() {
    /** @type {Array<LH.TraceEvent>} */
    const traceEvents = [];

    /**
     * Listener for when dataCollected events fire for each trace chunk
     * @param {LH.Crdp.Tracing.DataCollectedEvent} data
     */
    const dataListener = function(data) {
      traceEvents.push(...data.value);
    };
    this.on('Tracing.dataCollected', dataListener);

    return new Promise((resolve, reject) => {
      this.once('Tracing.tracingComplete', _ => {
        this.off('Tracing.dataCollected', dataListener);
        resolve({traceEvents});
      });

      this.sendCommand('Tracing.end').catch(reject);
    });
  }

  /**
   * Begin recording devtools protocol messages.
   */
  beginDevtoolsLog() {
    this._devtoolsLog.reset();
    this._devtoolsLog.beginRecording();
  }

  /**
   * Stop recording to devtoolsLog and return log contents.
   * @return {LH.DevtoolsLog}
   */
  endDevtoolsLog() {
    this._devtoolsLog.endRecording();
    return this._devtoolsLog.messages;
  }

  /**
   * @return {Promise<void>}
   */
  enableRuntimeEvents() {
    return this.sendCommand('Runtime.enable');
  }

  /**
   * Enables `Debugger` domain to receive async stacktrace information on network request initiators.
   * This is critical for tracing certain performance simulation situations.
   *
   * @return {Promise<void>}
   */
  async enableAsyncStacks() {
    await this.sendCommand('Debugger.enable');
    await this.sendCommand('Debugger.setSkipAllPauses', {skip: true});
    await this.sendCommand('Debugger.setAsyncCallStackDepth', {maxDepth: 8});
  }

  /**
   * @param {LH.Config.Settings} settings
   * @return {Promise<void>}
   */
  async beginEmulation(settings) {
    if (settings.emulatedFormFactor === 'mobile') {
      await emulation.enableNexus5X(this);
    } else if (settings.emulatedFormFactor === 'desktop') {
      await emulation.enableDesktop(this);
    }

    await this.setThrottling(settings, {useThrottling: true});
  }

  /**
   * @param {LH.Config.Settings} settings
   * @param {{useThrottling?: boolean}} passConfig
   * @return {Promise<void>}
   */
  async setThrottling(settings, passConfig) {
    if (settings.throttlingMethod !== 'devtools') {
      return emulation.clearAllNetworkEmulation(this);
    }

    const cpuPromise = passConfig.useThrottling ?
        emulation.enableCPUThrottling(this, settings.throttling) :
        emulation.disableCPUThrottling(this);
    const networkPromise = passConfig.useThrottling ?
        emulation.enableNetworkThrottling(this, settings.throttling) :
        emulation.clearAllNetworkEmulation(this);

    await Promise.all([cpuPromise, networkPromise]);
  }

  /**
   * Emulate internet disconnection.
   * @return {Promise<void>}
   */
  async goOffline() {
    await this.sendCommand('Network.enable');
    await emulation.goOffline(this);
    this.online = false;
  }

  /**
   * Enable internet connection, using emulated mobile settings if applicable.
   * @param {{settings: LH.Config.Settings, passConfig: LH.Config.Pass}} options
   * @return {Promise<void>}
   */
  async goOnline(options) {
    await this.setThrottling(options.settings, options.passConfig);
    this.online = true;
  }

  /**
   * Clear the network cache on disk and in memory.
   * @return {Promise<void>}
   */
  async cleanBrowserCaches() {
    const status = {msg: 'Cleaning browser cache', id: 'lh:driver:cleanBrowserCaches'};
    log.time(status);

    // Wipe entire disk cache
    await this.sendCommand('Network.clearBrowserCache');
    // Toggle 'Disable Cache' to evict the memory cache
    await this.sendCommand('Network.setCacheDisabled', {cacheDisabled: true});
    await this.sendCommand('Network.setCacheDisabled', {cacheDisabled: false});

    log.timeEnd(status);
  }

  /**
   * @param {LH.Crdp.Network.Headers|null} headers key/value pairs of HTTP Headers.
   * @return {Promise<void>}
   */
  async setExtraHTTPHeaders(headers) {
    if (!headers) {
      return;
    }

    return this.sendCommand('Network.setExtraHTTPHeaders', {headers});
  }

  /**
   * @param {string} url
   * @return {Promise<void>}
   */
  async clearDataForOrigin(url) {
    const origin = new URL(url).origin;

    // Clear all types of storage except cookies, so the user isn't logged out.
    //   https://chromedevtools.github.io/debugger-protocol-viewer/tot/Storage/#type-StorageType
    const typesToClear = [
      'appcache',
      // 'cookies',
      'file_systems',
      'indexeddb',
      'local_storage',
      'shader_cache',
      'websql',
      'service_workers',
      'cache_storage',
    ].join(',');

    // `Storage.clearDataForOrigin` is one of our PROTOCOL_TIMEOUT culprits and this command is also
    // run in the context of PAGE_HUNG to cleanup. We'll keep the timeout low and just warn if it fails.
    this.setNextProtocolTimeout(5000);

    try {
      await this.sendCommand('Storage.clearDataForOrigin', {
        origin: origin,
        storageTypes: typesToClear,
      });
    } catch (err) {
      if (/** @type {LH.LighthouseError} */(err).code === 'PROTOCOL_TIMEOUT') {
        log.warn('Driver', 'clearDataForOrigin timed out');
      } else {
        throw err;
      }
    }
  }

  /**
   * Cache native functions/objects inside window
   * so we are sure polyfills do not overwrite the native implementations
   * @return {Promise<void>}
   */
  async cacheNatives() {
    await this.evaluateScriptOnNewDocument(`
        window.__nativePromise = Promise;
        window.__nativeError = Error;
        window.__nativeURL = URL;
        window.__ElementMatches = Element.prototype.matches;
        window.__perfNow = performance.now.bind(performance);
    `);
  }

  /**
   * Install a performance observer that watches longtask timestamps for waitForCPUIdle.
   * @return {Promise<void>}
   */
  async registerPerformanceObserver() {
    const scriptStr = `(${pageFunctions.registerPerformanceObserverInPageString})()`;
    await this.evaluateScriptOnNewDocument(scriptStr);
  }

  /**
   * @param {Array<string>} urls URL patterns to block. Wildcards ('*') are allowed.
   * @return {Promise<void>}
   */
  blockUrlPatterns(urls) {
    return this.sendCommand('Network.setBlockedURLs', {urls})
      .catch(err => {
        // TODO: remove this handler once m59 hits stable
        if (!/wasn't found/.test(err.message)) {
          throw err;
        }
      });
  }

  /**
   * Dismiss JavaScript dialogs (alert, confirm, prompt), providing a
   * generic promptText in case the dialog is a prompt.
   * @return {Promise<void>}
   */
  async dismissJavaScriptDialogs() {
    this.on('Page.javascriptDialogOpening', data => {
      log.warn('Driver', `${data.type} dialog opened by the page automatically suppressed.`);

      this.sendCommand('Page.handleJavaScriptDialog', {
        accept: true,
        promptText: 'Lighthouse prompt response',
      }).catch(err => log.warn('Driver', err));
    });

    await this.sendCommand('Page.enable');
  }
}

module.exports = Driver;
