/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview This class saves all protocol messages whose method match a particular
 *    regex filter. Used when saving assets for later analysis by another tool such as
 *    Webpagetest.
 */
class DevtoolsLog {
  /**
   * @param {RegExp=} regexFilter
   */
  constructor(regexFilter) {
    this._filter = regexFilter;

    /** @type {LH.DevtoolsLog} */
    this._messages = [];
    this._isRecording = false;
  }

  /**
   * @return {LH.DevtoolsLog}
   */
  get messages() {
    return this._messages;
  }

  reset() {
    this._messages = [];
  }

  beginRecording() {
    this._isRecording = true;
  }

  endRecording() {
    this._isRecording = false;
  }

  /**
   * Records a message if method matches filter and recording has been started.
   * @param {LH.Protocol.RawEventMessage} message
   */
  record(message) {
    if (this._isRecording && (!this._filter || this._filter.test(message.method))) {
      this._messages.push(message);
    }
  }
}

module.exports = DevtoolsLog;
