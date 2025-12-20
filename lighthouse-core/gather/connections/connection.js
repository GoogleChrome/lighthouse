/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const EventEmitter = require('events').EventEmitter;
const log = require('lighthouse-logger');
const LHError = require('../../lib/lh-error.js');

// TODO(bckenny): CommandCallback properties should be tied by command type after
// https://github.com/Microsoft/TypeScript/pull/22348. See driver.js TODO.
/**
 * @typedef {{'protocolevent': [LH.Protocol.RawEventMessage]}} ProtocolEventRecord
 * @typedef {LH.Protocol.StrictEventEmitter<ProtocolEventRecord>} CrdpEventMessageEmitter
 * @typedef {LH.CrdpCommands[keyof LH.CrdpCommands]} CommandInfo
 * @typedef {{resolve: function(Promise<CommandInfo['returnType']>): void, method: keyof LH.CrdpCommands}} CommandCallback
 */

class Connection {
  constructor() {
    this._lastCommandId = 0;
    /** @type {Map<number, CommandCallback>} */
    this._callbacks = new Map();

    this._eventEmitter = /** @type {?CrdpEventMessageEmitter} */ (new EventEmitter());
  }

  /**
   * @return {Promise<void>}
   */
  connect() {
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * @return {Promise<void>}
   */
  disconnect() {
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * @return {Promise<string>}
   */
  wsEndpoint() {
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Call protocol methods
   * @template {keyof LH.CrdpCommands} C
   * @param {C} method
   * @param {string|undefined} sessionId
   * @param {LH.CrdpCommands[C]['paramsType']} paramArgs,
   * @return {Promise<LH.CrdpCommands[C]['returnType']>}
   */
  sendCommand(method, sessionId, ...paramArgs) {
    // Reify params since we need it as a property so can't just spread again.
    const params = paramArgs.length ? paramArgs[0] : undefined;

    log.formatProtocol('method => browser', {method, params}, 'verbose');
    const id = ++this._lastCommandId;
    const message = JSON.stringify({id, sessionId, method, params});
    this.sendRawMessage(message);

    return new Promise(resolve => {
      this._callbacks.set(id, {method, resolve});
    });
  }

  /**
   * Bind listeners for connection events.
   * @param {'protocolevent'} eventName
   * @param {function(LH.Protocol.RawEventMessage): void} cb
   */
  on(eventName, cb) {
    if (eventName !== 'protocolevent') {
      throw new Error('Only supports "protocolevent" events');
    }

    if (!this._eventEmitter) {
      throw new Error('Attempted to add event listener after connection disposed.');
    }
    this._eventEmitter.on(eventName, cb);
  }

  /* eslint-disable no-unused-vars */

  /**
   * @param {string} message
   * @protected
   */
  sendRawMessage(message) {
    throw new Error('Not implemented');
  }

  /* eslint-enable no-unused-vars */

  /**
   * @param {string} message
   * @return {void}
   * @protected
   */
  handleRawMessage(message) {
    const object = /** @type {LH.Protocol.RawMessage} */(JSON.parse(message));

    // Responses to commands carry "id" property, while events do not.
    if (!('id' in object)) {
      log.formatProtocol('<= event',
          {method: object.method, params: object.params}, 'verbose');
      this.emitProtocolEvent(object);
      return;
    }

    const callback = this._callbacks.get(object.id);
    if (callback) {
      this._callbacks.delete(object.id);

      callback.resolve(Promise.resolve().then(_ => {
        if (object.error) {
          log.formatProtocol('method <= browser ERR', {method: callback.method}, 'error');
          throw LHError.fromProtocolMessage(callback.method, object.error);
        }

        log.formatProtocol('method <= browser OK',
          {method: callback.method, params: object.result}, 'verbose');
        return object.result;
      }));
    } else {
      // In DevTools we receive responses to commands we did not send which we cannot act on, so we
      // just log these occurrences.
      const error = object.error && object.error.message;
      log.formatProtocol(`disowned method <= browser ${error ? 'ERR' : 'OK'}`,
          {method: 'UNKNOWN', params: error || object.result}, 'verbose');
    }
  }

  /**
   * @param {LH.Protocol.RawEventMessage} eventMessage
   */
  emitProtocolEvent(eventMessage) {
    if (!this._eventEmitter) {
      throw new Error('Attempted to emit event after connection disposed.');
    }

    this._eventEmitter.emit('protocolevent', eventMessage);
  }

  /**
   * @protected
   */
  dispose() {
    if (this._eventEmitter) {
      this._eventEmitter.removeAllListeners();
      this._eventEmitter = null;
    }
  }
}

module.exports = Connection;
