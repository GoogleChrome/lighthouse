// @ts-nocheck
/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRecorder = require('../../lighthouse-core/lib/network-recorder.js');
/** @typedef {import('../../lighthouse-core/lib/network-request.js')} NetworkRequest */

const idBase = '127122';
const exampleUrl = 'https://testingurl.com/';
const redirectSuffix = ':redirect';

/* eslint-env jest */

/**
 * Extract requestId without any `:redirect` strings.
 * @param {Partial<NetworkRequest>} record
 */
function getBaseRequestId(record) {
  if (!record.requestId) return;

  const match = /^([\w.]+)(?::redirect)*$/.exec(record.requestId);
  return match && match[1];
}

/**
 * @param {Array<HeaderEntry>=} headersArray
 * @return {LH.Crdp.Network.Headers}
 */
function headersArrayToHeadersDict(headersArray = []) {
  const headersDict = {};
  headersArray.forEach(headerItem => {
    const value = headersDict[headerItem.name] !== undefined ?
        headersDict[headerItem.name] + '\n' : '';
    headersDict[headerItem.name] = value + headerItem.value;
  });

  return headersDict;
}

/**
 * @param {Partial<NetworkRequest>} networkRecord
 * @return {LH.Protocol.RawEventMessage}
 */
function getRequestWillBeSentEvent(networkRecord, index) {
  let initiator;
  if (networkRecord.initiator) {
    initiator = {...networkRecord.initiator};
  }

  return {
    method: 'Network.requestWillBeSent',
    params: {
      requestId: getBaseRequestId(networkRecord) || `${idBase}.${index}`,
      documentURL: networkRecord.documentURL || exampleUrl,
      request: {
        url: networkRecord.url || exampleUrl,
        method: networkRecord.requestMethod || 'GET',
        headers: {},
        initialPriority: networkRecord.priority || 'Low',
        isLinkPreload: networkRecord.isLinkPreload,
      },
      timestamp: networkRecord.startTime || 0,
      wallTime: 0,
      initiator: initiator || {type: 'other'},
      type: networkRecord.resourceType || 'Document',
      frameId: networkRecord.frameId || `${idBase}.1`,
      redirectResponse: networkRecord.redirectResponse,
    },
  };
}

/**
 * @param {Partial<NetworkRequest>} networkRecord
 * @return {LH.Protocol.RawEventMessage}
 */
function getResponseReceivedEvent(networkRecord, index) {
  const headers = headersArrayToHeadersDict(networkRecord.responseHeaders);
  let timing;
  if (networkRecord.timing) {
    timing = {...networkRecord.timing};
    if (timing.requestTime === undefined) {
      timing.requestTime = networkRecord.startTime || 0;
    }
  }

  return {
    method: 'Network.responseReceived',
    params: {
      requestId: getBaseRequestId(networkRecord) || `${idBase}.${index}`,
      timestamp: networkRecord.responseReceivedTime || 1,
      type: networkRecord.resourceType || undefined,
      response: {
        url: networkRecord.url || exampleUrl,
        status: networkRecord.statusCode || 200,
        headers,
        mimeType: networkRecord.mimeType || 'text/html',
        connectionReused: networkRecord.connectionReused || false,
        connectionId: networkRecord.connectionId || 140,
        fromDiskCache: networkRecord.fromDiskCache || undefined,
        fromServiceWorker: networkRecord.fetchedViaServiceWorker || undefined,
        encodedDataLength: networkRecord.transferSize || 0,
        timing,
        protocol: networkRecord.protocol || 'http/1.1',
      },
      frameId: networkRecord.frameId || `${idBase}.1`,
    },
  };
}

/**
 * @param {Partial<NetworkRequest>} networkRecord
 * @return {LH.Protocol.RawEventMessage}
 */
function getDataReceivedEvent(networkRecord, index) {
  return {
    method: 'Network.dataReceived',
    params: {
      requestId: getBaseRequestId(networkRecord) || `${idBase}.${index}`,
      dataLength: networkRecord.resourceSize || 0,
      encodedDataLength: networkRecord.transferSize || 0,
    },
  };
}

/**
 * @param {Partial<NetworkRequest>} networkRecord
 * @return {LH.Protocol.RawEventMessage}
 */
function getLoadingFinishedEvent(networkRecord, index) {
  return {
    method: 'Network.loadingFinished',
    params: {
      requestId: getBaseRequestId(networkRecord) || `${idBase}.${index}`,
      timestamp: networkRecord.endTime || 3,
      encodedDataLength: networkRecord.transferSize || 0,
    },
  };
}

/**
 * Returns true if `record` is redirected by another record.
 * @param {Array<Partial<NetworkRequest>>} networkRecords
 * @param {Partial<NetworkRequest>} record
 * @return {boolean}
 */
function willBeRedirected(networkRecords, record) {
  if (!record.requestId) {
    return false;
  }

  const redirectId = record.requestId + redirectSuffix;
  return networkRecords.some(otherRecord => otherRecord.requestId === redirectId);
}

/**
 * If `record` is a redirect of another record, create a fake redirect respose
 * to keep the original request defined correctly.
 * @param {Array<Partial<NetworkRequest>>} networkRecords
 * @param {Partial<NetworkRequest>} record
 * @return {Partial<NetworkRequest>}
 */
function addRedirectResponseIfNeeded(networkRecords, record) {
  if (!record.requestId || !record.requestId.endsWith(redirectSuffix)) {
    return record;
  }

  const originalId = record.requestId.slice(0, -redirectSuffix.length);
  const originalRecord = networkRecords.find(record => record.requestId === originalId);
  if (!originalRecord) {
    throw new Error(`redirect with id ${record.requestId} has no original request`);
  }

  // populate `redirectResponse` with original's data, more or less.
  const originalResponse = getResponseReceivedEvent(originalRecord).params.response;
  originalResponse.status = originalRecord.statusCode || 302;
  return Object.assign({}, record, {redirectResponse: originalResponse});
}

/**
 * Generate a devtoolsLog that can regenerate the passed-in `networkRecords`.
 * Generally best at replicating artificial or pruned networkRecords used for
 * testing. If run from a test runner, verifies that everything in
 * `networkRecords` will be in any network records generated from the output
 * (use `skipVerification` to manually skip this assertion).
 * @param {Array<Partial<NetworkRequest>>} networkRecords
 * @param {{skipVerification?: boolean}=} options
 * @return {LH.DevtoolsLog}
 */
function networkRecordsToDevtoolsLog(networkRecords, options = {}) {
  const devtoolsLog = [];
  networkRecords.forEach((networkRecord, index) => {
    networkRecord = addRedirectResponseIfNeeded(networkRecords, networkRecord);
    devtoolsLog.push(getRequestWillBeSentEvent(networkRecord, index));

    if (willBeRedirected(networkRecords, networkRecord)) {
      // If record is going to redirect, only issue the first event.
      return;
    }

    devtoolsLog.push(getResponseReceivedEvent(networkRecord, index));
    devtoolsLog.push(getDataReceivedEvent(networkRecord, index));
    devtoolsLog.push(getLoadingFinishedEvent(networkRecord, index));
  });

  // If in a test, assert that the log will turn into an equivalent networkRecords.
  if (global.expect && !options.skipVerification) {
    const roundTrippedNetworkRecords = NetworkRecorder.recordsFromLogs(devtoolsLog);
    expect(roundTrippedNetworkRecords).toMatchObject(networkRecords);
  }

  return devtoolsLog;
}

module.exports = networkRecordsToDevtoolsLog;
