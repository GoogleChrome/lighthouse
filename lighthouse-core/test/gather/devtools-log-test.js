/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const assert = require('assert').strict;
const DevtoolsLog = require('../../gather/devtools-log.js');

describe('DevtoolsLog', () => {
  let messageLog;
  const pageMsg = {method: 'Page.frameStartedLoading'};
  const networkMsg = {method: 'Network.requestWillBeSent'};
  const otherMsg = {method: 'Storage.cleared'};

  beforeEach(() => messageLog = new DevtoolsLog(/^(Page|Network)/));

  it('returns an array', () => {
    assert.deepEqual(messageLog.messages, []);
  });

  it('records only when requested', () => {
    messageLog.record(pageMsg); // will not record
    messageLog.beginRecording();
    messageLog.record(networkMsg); // will record
    messageLog.endRecording();
    messageLog.record(pageMsg); // will not record
    assert.equal(messageLog.messages.length, 1);
    assert.equal(messageLog.messages[0].method, networkMsg.method);
  });

  it('does not record non-matching events', () => {
    messageLog.beginRecording();
    messageLog.record(pageMsg); // will record
    messageLog.record(networkMsg); // will record
    messageLog.record(otherMsg); // won't record
    messageLog.endRecording();
    assert.equal(messageLog.messages.length, 2);
    assert.equal(messageLog.messages[0].method, pageMsg.method);
  });

  it('records everything when no filter provided', () => {
    messageLog = new DevtoolsLog();
    messageLog.beginRecording();
    messageLog.record(pageMsg);
    messageLog.record(networkMsg);
    messageLog.record(otherMsg);
    assert.equal(messageLog.messages.length, 3);
  });

  it('resets properly', () => {
    messageLog.beginRecording();
    messageLog.record(pageMsg);
    messageLog.record(pageMsg);
    messageLog.endRecording();
    messageLog.reset();

    messageLog.beginRecording();
    messageLog.record(pageMsg);
    messageLog.endRecording();
    assert.equal(messageLog.messages.length, 1);
  });
});
