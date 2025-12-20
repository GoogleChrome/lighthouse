/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Connection = require('./connection.js');

/* eslint-disable no-unused-vars */

/**
 * @typedef {object} Port
 * @property {(eventName: 'message'|'close', cb: ((arg: string) => void) | (() => void)) => void} on
 * @property {(message: string) => void} send
 * @property {() => void} close
 */

/* eslint-enable no-unused-vars */

class RawConnection extends Connection {
  /**
   * @param {Port} port
   */
  constructor(port) {
    super();
    this._port = port;
    this._port.on('message', this.handleRawMessage.bind(this));
    this._port.on('close', this.dispose.bind(this));
  }

  /**
   * @override
   * @return {Promise<void>}
   */
  connect() {
    return Promise.resolve();
  }

  /**
   * @return {Promise<void>}
   */
  disconnect() {
    this._port.close();
    return Promise.resolve();
  }

  /**
   * @override
   * @param {string} message
   * @protected
   */
  sendRawMessage(message) {
    this._port.send(message);
  }
}

module.exports = RawConnection;
