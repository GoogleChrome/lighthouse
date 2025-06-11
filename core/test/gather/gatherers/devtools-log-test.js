/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {DevtoolsMessageLog} from '../../../gather/gatherers/devtools-log.js';

describe('DevtoolsMessageLog', () => {
  let messageLog;
  const pageMsg = {method: 'Page.frameStartedLoading'};
  const networkMsg = {method: 'Network.requestWillBeSent'};
  const otherMsg = {method: 'Storage.cleared'};

  beforeEach(() => messageLog = new DevtoolsMessageLog(/^(Page|Network)/));

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

  it('ignores messages with Symbols', () => {
    messageLog.beginRecording();
    messageLog.record(pageMsg); // will record
    messageLog.record(networkMsg); // will record
    messageLog.record({method: Symbol('Network.requestWillBeSent')}); // won't record
    messageLog.endRecording();
    assert.equal(messageLog.messages.length, 2);
    assert.equal(messageLog.messages[0].method, pageMsg.method);
  });

  it('records everything when no filter provided', () => {
    messageLog = new DevtoolsMessageLog();
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
