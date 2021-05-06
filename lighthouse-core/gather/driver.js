/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Fetcher = require('./fetcher.js');
const ExecutionContext = require('./driver/execution-context.js');
const LHError = require('../lib/lh-error.js');
const NetworkRequest = require('../lib/network-request.js');
const EventEmitter = require('events').EventEmitter;

const log = require('lighthouse-logger');
const DevtoolsLog = require('./devtools-log.js');
const TraceGatherer = require('./gatherers/trace.js');

const pageFunctions = require('../lib/page-functions.js');

// Pulled in for Connection type checking.
// eslint-disable-next-line no-unused-vars
const Connection = require('./connections/connection.js');
const {getBrowserVersion} = require('./driver/environment.js');

// Controls how long to wait for a response after sending a DevTools protocol command.
const DEFAULT_PROTOCOL_TIMEOUT = 30000;

/**
 * @typedef {LH.Protocol.StrictEventEmitter<LH.CrdpEvents>} CrdpEventEmitter
 */

/**
 * @implements {LH.Gatherer.FRTransitionalDriver}
 */
class Driver {
  /**
   * @pri_vate (This should be private, but that makes our tests harder).
   * An event emitter that enforces mapping between Crdp event names and payload types.
   */
  _eventEmitter = /** @type {CrdpEventEmitter} */ (new EventEmitter());

  /**
   * @private
   * Used to save network and lifecycle protocol traffic. Just Page and Network are needed.
   */
  _devtoolsLog = new DevtoolsLog(/^(Page|Network)\./);

  /**
   * @private
   * @type {Map<string, number>}
   */
  _domainEnabledCounts = new Map();

  /**
   * @type {number}
   * @private
   */
  _nextProtocolTimeout = DEFAULT_PROTOCOL_TIMEOUT;

  online = true;

  // eslint-disable-next-line no-invalid-this
  executionContext = new ExecutionContext(this);

  // eslint-disable-next-line no-invalid-this
  defaultSession = this;

  // eslint-disable-next-line no-invalid-this
  fetcher = new Fetcher(this.defaultSession, this.executionContext);

  /**
   * @param {Connection} connection
   */
  constructor(connection) {
    this._connection = connection;

    this.on('Target.attachedToTarget', event => {
      this._handleTargetAttached(event).catch(this._handleEventError);
    });

    this.on('Page.frameNavigated', event => {
      // We're only interested in setting autoattach on the root via this method.
      // `_handleTargetAttached` takes care of the recursive piece.
      if (event.frame.parentId) return;

      // Enable auto-attaching to subtargets so we receive iframe information.
      this.sendCommand('Target.setAutoAttach', {
        flatten: true,
        autoAttach: true,
        // Pause targets on startup so we don't miss anything
        waitForDebuggerOnStart: true,
      }).catch(this._handleEventError);
    });

    connection.on('protocolevent', this._handleProtocolEvent.bind(this));

    /** @private @deprecated Only available for plugin backcompat. */
    this.evaluate = this.executionContext.evaluate.bind(this.executionContext);
    /** @private @deprecated Only available for plugin backcompat. */
    this.evaluateAsync = this.executionContext.evaluateAsync.bind(this.executionContext);
  }

  /** @deprecated - Not available on Fraggle Rock driver. */
  static get traceCategories() {
    return TraceGatherer.getDefaultTraceCategories();
  }

  /**
   * @return {Promise<LH.Crdp.Browser.GetVersionResponse & {milestone: number}>}
   */
  async getBrowserVersion() {
    return getBrowserVersion(this);
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
    log.formatProtocol('listen for event =>', {method: eventName}, 'debug');
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
    log.formatProtocol('listen once for event =>', {method: eventName}, 'debug');
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
   * Bind to *any* protocol event.
   * @param {(payload: LH.Protocol.RawEventMessage) => void} callback
   */
  addProtocolMessageListener(callback) {
    this._connection.on('protocolevent', callback);
  }

  /**
   * Unbind to *any* protocol event.
   * @param {(payload: LH.Protocol.RawEventMessage) => void} callback
   */
  removeProtocolMessageListener(callback) {
    this._connection.off('protocolevent', callback);
  }

  /**
   * Debounce enabling or disabling domains to prevent driver users from
   * stomping on each other. Maintains an internal count of the times a domain
   * has been enabled. Returns false if the command would have no effect (domain
   * is already enabled or disabled), or if command would interfere with another
   * user of that domain (e.g. two gatherers have enabled a domain, both need to
   * disable it for it to be disabled). Returns true otherwise.
   * @param {string} domain
   * @param {string|undefined} sessionId
   * @param {boolean} enable
   * @return {boolean}
   * @private
   */
  _shouldToggleDomain(domain, sessionId, enable) {
    const key = domain + (sessionId || '');
    const enabledCount = this._domainEnabledCounts.get(key) || 0;
    const newCount = enabledCount + (enable ? 1 : -1);
    this._domainEnabledCounts.set(key, Math.max(0, newCount));

    // Switching to enabled or disabled, respectively.
    if ((enable && newCount === 1) || (!enable && newCount === 0)) {
      log.debug('Driver', `${domain}.${enable ? 'enable' : 'disable'}`);
      return true;
    } else {
      if (newCount < 0) {
        log.error('Driver', `Attempted to disable domain '${domain}' when already disabled.`);
      }
      return false;
    }
  }

  /**
   * @return {boolean}
   */
  hasNextProtocolTimeout() {
    return this._nextProtocolTimeout !== DEFAULT_PROTOCOL_TIMEOUT;
  }

  /**
   * @return {number}
   */
  getNextProtocolTimeout() {
    return this._nextProtocolTimeout;
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

    // @ts-expect-error TODO(bckenny): tsc can't type event.params correctly yet,
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
   * @param {LH.Crdp.Target.AttachedToTargetEvent} event
   */
  async _handleTargetAttached(event) {
    // We're only interested in network requests from iframes for now as those are "part of the page".
    // If it's not an iframe, just resume it and move on.
    if (event.targetInfo.type !== 'iframe') {
      // We suspended the target when we auto-attached, so make sure it goes back to being normal.
      await this.sendCommandToSession('Runtime.runIfWaitingForDebugger', event.sessionId);
      return;
    }

    // Events from subtargets will be stringified and sent back on `Target.receivedMessageFromTarget`.
    // We want to receive information about network requests from iframes, so enable the Network domain.
    await this.sendCommandToSession('Network.enable', event.sessionId);

    // We also want to receive information about subtargets of subtargets, so make sure we autoattach recursively.
    await this.sendCommandToSession('Target.setAutoAttach', event.sessionId, {
      autoAttach: true,
      flatten: true,
      // Pause targets on startup so we don't miss anything
      waitForDebuggerOnStart: true,
    });

    // We suspended the target when we auto-attached, so make sure it goes back to being normal.
    await this.sendCommandToSession('Runtime.runIfWaitingForDebugger', event.sessionId);
  }

  /**
   * Call protocol methods, with a timeout.
   * To configure the timeout for the next call, use 'setNextProtocolTimeout'.
   * If 'sessionId' is undefined, the message is sent to the main session.
   * @template {keyof LH.CrdpCommands} C
   * @param {C} method
   * @param {string|undefined} sessionId
   * @param {LH.CrdpCommands[C]['paramsType']} params
   * @return {Promise<LH.CrdpCommands[C]['returnType']>}
   */
  sendCommandToSession(method, sessionId, ...params) {
    const timeout = this._nextProtocolTimeout;
    this._nextProtocolTimeout = DEFAULT_PROTOCOL_TIMEOUT;

    /** @type {NodeJS.Timer|undefined} */
    let asyncTimeout;
    const timeoutPromise = new Promise((resolve, reject) => {
      if (timeout === Infinity) return;
      asyncTimeout = setTimeout((() => {
        const err = new LHError(
          LHError.errors.PROTOCOL_TIMEOUT,
          {protocolMethod: method}
        );
        reject(err);
      }), timeout);
    });

    return Promise.race([
      this._innerSendCommand(method, sessionId, ...params),
      timeoutPromise,
    ]).finally(() => {
      asyncTimeout && clearTimeout(asyncTimeout);
    });
  }

  /**
   * Alias for 'sendCommandToSession(method, undefined, ...params)'
   * @template {keyof LH.CrdpCommands} C
   * @param {C} method
   * @param {LH.CrdpCommands[C]['paramsType']} params
   * @return {Promise<LH.CrdpCommands[C]['returnType']>}
   */
  sendCommand(method, ...params) {
    return this.sendCommandToSession(method, undefined, ...params);
  }

  /**
   * Call protocol methods.
   * @private
   * @template {keyof LH.CrdpCommands} C
   * @param {C} method
   * @param {string|undefined} sessionId
   * @param {LH.CrdpCommands[C]['paramsType']} params
   * @return {Promise<LH.CrdpCommands[C]['returnType']>}
   */
  _innerSendCommand(method, sessionId, ...params) {
    const domainCommand = /^(\w+)\.(enable|disable)$/.exec(method);
    if (domainCommand) {
      const enable = domainCommand[2] === 'enable';
      if (!this._shouldToggleDomain(domainCommand[1], sessionId, enable)) {
        return Promise.resolve();
      }
    }
    return this._connection.sendCommand(method, sessionId, ...params);
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
   * @param {{x: number, y: number}} position
   * @return {Promise<void>}
   */
  scrollTo(position) {
    const scrollExpression = `window.scrollTo(${position.x}, ${position.y})`;
    return this.executionContext.evaluateAsync(scrollExpression, {useIsolation: true});
  }

  /**
   * @return {Promise<{x: number, y: number}>}
   */
  getScrollPosition() {
    return this.executionContext.evaluateAsync(`({x: window.scrollX, y: window.scrollY})`,
      {useIsolation: true});
  }

  /**
   * @param {{additionalTraceCategories?: string|null}=} settings
   * @return {Promise<void>}
   */
  async beginTrace(settings) {
    const additionalCategories = (settings && settings.additionalTraceCategories &&
        settings.additionalTraceCategories.split(',')) || [];
    const traceCategories = TraceGatherer.getDefaultTraceCategories().concat(additionalCategories);

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
    return TraceGatherer.endTraceAndCollectEvents(this.defaultSession);
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
   * Use a RequestIdleCallback shim for tests run with simulated throttling, so that the deadline can be used without
   * a penalty
   * @param {LH.Config.Settings} settings
   * @return {Promise<void>}
   */
  async registerRequestIdleCallbackWrap(settings) {
    if (settings.throttlingMethod === 'simulate') {
      await this.executionContext.evaluateOnNewDocument(
        pageFunctions.wrapRequestIdleCallback,
        {args: [settings.throttling.cpuSlowdownMultiplier]}
      );
    }
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
