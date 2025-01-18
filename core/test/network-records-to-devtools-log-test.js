/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {NetworkRecorder} from '../../core/lib/network-recorder.js';
import {networkRecordsToDevtoolsLog} from './network-records-to-devtools-log.js';
import {readJson} from './test-utils.js';

const lcpDevtoolsLog = readJson('./fixtures/artifacts/paul/devtoolslog.json', import.meta);

describe('networkRecordsToDevtoolsLog', () => {
  it('should generate the four messages per request', () => {
    const records = [{url: 'http://example.com'}];
    const log = networkRecordsToDevtoolsLog(records);
    expect(log).toMatchObject([
      {method: 'Network.requestWillBeSent', params: {request: {url: 'http://example.com'}}},
      {method: 'Network.responseReceived', params: {response: {url: 'http://example.com'}}},
      {method: 'Network.dataReceived'},
      {method: 'Network.loadingFinished'},
    ]);
  });

  it('should set resource and transfer sizes', () => {
    const records = [{url: 'http://example.com', resourceSize: 1024, transferSize: 2048}];
    const log = networkRecordsToDevtoolsLog(records);
    expect(log).toMatchObject([
      {method: 'Network.requestWillBeSent', params: {request: {url: 'http://example.com'}}},
      {method: 'Network.responseReceived', params: {response: {url: 'http://example.com'}}},
      {method: 'Network.dataReceived', params: {dataLength: 1024, encodedDataLength: 2048}},
      {method: 'Network.loadingFinished', params: {encodedDataLength: 2048}},
    ]);
  });

  it('should handle redirects', () => {
    const records = [
      {requestId: '0', url: 'http://example.com/'},
      {requestId: '0:redirect', url: 'http://www.example.com/'},
    ];

    const log = networkRecordsToDevtoolsLog(records);
    expect(log).toMatchObject([
      {method: 'Network.requestWillBeSent', params: {request: {url: 'http://example.com/'}}},
      {method: 'Network.requestWillBeSent', params: {request: {url: 'http://www.example.com/'}}},
      {method: 'Network.responseReceived', params: {response: {url: 'http://www.example.com/'}}},
      {method: 'Network.dataReceived'},
      {method: 'Network.loadingFinished'},
    ]);
  });

  it('should roundtrip a real devtools log properly', () => {
    const records = NetworkRecorder.recordsFromLogs(lcpDevtoolsLog);

    // Skip verification in the method because we have circular references.
    // We'll do our own stricter verification.
    const roundTripLogs = networkRecordsToDevtoolsLog(records, {skipVerification: true});
    const roundTripRecords = NetworkRecorder.recordsFromLogs(roundTripLogs);

    // First compare element-wise, as doing all at once results in too verbose an error message.
    const len = Math.min(roundTripRecords.length, records.length);
    for (let i = 0; i < len; i++) {
      expect(roundTripRecords[i]).toEqual(records[i]);
    }
    expect(roundTripRecords.length).toEqual(records.length);
  });

  it('should roundtrip fake network records multiple times', () => {
    const records = [
      {requestId: '0', url: 'http://example.com/'},
      {requestId: '0:redirect', url: 'https://www.example.com/'},
      {url: 'https://example.com/img.png', rendererStartTime: 14, networkRequestTime: 15, networkEndTime: 15.5},
      {url: 'https://example.com/style.css', timing: {receiveHeadersEnd: 400, sendEnd: 200}},
      {url: 'https://example.com/0.js', rendererStartTime: 10000},
      {url: 'https://example.com/1.js', networkRequestTime: 2000, responseHeadersEndTime: 3250},
      {url: 'https://example.com/2.js', timing: {requestTime: 5}},
      {url: 'https://example.com/3.js', networkEndTime: -1},
      {url: 'https://example.com/4.js', timing: {sendEnd: 1200}},
      {url: 'https://example.com/5.js', failed: true},
      {},
    ];

    const devtoolsLog = networkRecordsToDevtoolsLog(records);
    const roundTripRecords = NetworkRecorder.recordsFromLogs(devtoolsLog);

    const devtoolsLog2 = networkRecordsToDevtoolsLog(roundTripRecords);
    const roundTripRecords2 = NetworkRecorder.recordsFromLogs(devtoolsLog2);
    expect(roundTripRecords2).toMatchObject(roundTripRecords);

    const devtoolsLog3 = networkRecordsToDevtoolsLog(roundTripRecords2);
    const roundTripRecords3 = NetworkRecorder.recordsFromLogs(devtoolsLog3);
    expect(roundTripRecords3).toMatchObject(roundTripRecords2);
    expect(roundTripRecords3).toMatchObject(roundTripRecords);
    expect(roundTripRecords3).toMatchObject(records);
  });

  it('should throw on impossible network requests', () => {
    expect(() => networkRecordsToDevtoolsLog([{rendererStartTime: 5, networkRequestTime: 1}]))
      .toThrow(`'rendererStartTime' (5) exceeds 'networkRequestTime' (1)`);
    expect(() => networkRecordsToDevtoolsLog([{rendererStartTime: 5, networkEndTime: 1}]))
      .toThrow(`'rendererStartTime' (5) exceeds 'networkEndTime' (1)`);

    /* eslint-disable max-len */
    expect(() => networkRecordsToDevtoolsLog([{networkRequestTime: 1000, timing: {requestTime: 2}}]))
      .toThrow(`'networkRequestTime' (1000) is not equal to 'timing.requestTime' (2 seconds)`);

    expect(() => networkRecordsToDevtoolsLog([{networkRequestTime: 1000, responseHeadersEndTime: 2000, timing: {sendEnd: 1200}}]))
      .toThrow(`request start (1000) plus relative 'timing' value (1200) exceeds 'responseHeadersEndTime' (2000)`);
    expect(() => networkRecordsToDevtoolsLog([{rendererStartTime: 1000, responseHeadersEndTime: 2000, timing: {sendEnd: 1200}}]))
      .toThrow(`request start (1000) plus relative 'timing' value (1200) exceeds 'responseHeadersEndTime' (2000)`);
    expect(() => networkRecordsToDevtoolsLog([{responseHeadersEndTime: 2000, timing: {requestTime: 1, sendEnd: 1200}}]))
      .toThrow(`request start (1000) plus relative 'timing' value (1200) exceeds 'responseHeadersEndTime' (2000)`);

    expect(() => networkRecordsToDevtoolsLog([{networkRequestTime: 500, networkEndTime: 2000, timing: {connectStart: 2200}}]))
      .toThrow(`request start (500) plus relative 'timing' value (2200) exceeds 'networkEndTime' (2000)`);
    expect(() => networkRecordsToDevtoolsLog([{rendererStartTime: 500, networkEndTime: 2000, timing: {connectStart: 2200}}]))
      .toThrow(`request start (500) plus relative 'timing' value (2200) exceeds 'networkEndTime' (2000)`);
    expect(() => networkRecordsToDevtoolsLog([{networkEndTime: 2000, timing: {requestTime: 0.5, connectStart: 2200}}]))
      .toThrow(`request start (500) plus relative 'timing' value (2200) exceeds 'networkEndTime' (2000)`);

    expect(() => networkRecordsToDevtoolsLog([{networkRequestTime: 500, responseHeadersEndTime: 2000, timing: {receiveHeadersEnd: 500}}]))
      .toThrow(`request start (500) plus 'receiveHeadersEnd' (500) does not equal 'responseHeadersEndTime' (2000)`);
    expect(() => networkRecordsToDevtoolsLog([{responseHeadersEndTime: 2000, timing: {requestTime: 0.5, receiveHeadersEnd: 500}}]))
      .toThrow(`request start (500) plus 'receiveHeadersEnd' (500) does not equal 'responseHeadersEndTime' (2000)`);
    /* eslint-enable max-len */
  });
});
