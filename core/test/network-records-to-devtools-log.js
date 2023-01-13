// @ts-nocheck
/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {NetworkRecorder} from '../../core/lib/network-recorder.js';

/** @typedef {import('../../core/lib/network-request.js').NetworkRequest} NetworkRequest */

const idBase = '127122';
const exampleUrl = 'https://testingurl.com/';
const redirectSuffix = ':redirect';

/**
 * Extract requestId without any `:redirect` strings.
 * @param {Partial<NetworkRequest>} record
 */
function getBaseRequestId(record) {
  if (!record.requestId) return;

  const match = /^([\w.]+)(?::redirect)*$/.exec(record.requestId);
  return match?.[1];
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
  let initiator = {type: 'other'};
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
      timestamp:
        (networkRecord.redirectResponseTimestamp || networkRecord.rendererStartTime || 0) / 1000,
      wallTime: 0,
      initiator,
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
function getRequestServedFromCacheEvent(networkRecord, index) {
  return {
    method: 'Network.requestServedFromCache',
    params: {
      requestId: getBaseRequestId(networkRecord) || `${idBase}.${index}`,
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
  } else {
    // If the record explicitly does not having a timing object, only create one
    // if we absolutely need it. See _recomputeTimesWithResourceTiming.
    const netReqTime = networkRecord.networkRequestTime;
    const willNeedTimingObject =
      (netReqTime !== undefined && netReqTime !== networkRecord.rendererStartTime) ||
      (networkRecord.responseHeadersEndTime !== undefined);
    if (willNeedTimingObject) timing = {};
  }

  // Set timing.requestTime and timing.receiveHeadersEnd to be values that
  // NetworkRequest will pull from for networkRequestTime and responseHeadersEndTime,
  // so this roundtrips correctly. Unless, of course, timing values are explicitly set
  // already.
  if (timing) {
    if (timing.requestTime === undefined) {
      timing.requestTime = networkRecord.networkRequestTime / 1000 || 0;
    }
    if (timing.receiveHeadersEnd === undefined) {
      timing.receiveHeadersEnd =
        (networkRecord.responseHeadersEndTime - networkRecord.networkRequestTime) || 0;
    }
  }

  return {
    method: 'Network.responseReceived',
    params: {
      requestId: getBaseRequestId(networkRecord) || `${idBase}.${index}`,
      timestamp: networkRecord.responseHeadersEndTime / 1000 || 1,
      type: networkRecord.resourceType || undefined,
      response: {
        url: networkRecord.url || exampleUrl,
        status: networkRecord.statusCode || 200,
        headers,
        mimeType: typeof networkRecord.mimeType === 'string' ? networkRecord.mimeType : 'text/html',
        connectionReused: networkRecord.connectionReused || false,
        connectionId: networkRecord.connectionId || 140,
        fromDiskCache: networkRecord.fromDiskCache || false,
        fromServiceWorker: networkRecord.fetchedViaServiceWorker || false,
        encodedDataLength: networkRecord.transferSize === undefined ?
          0 : networkRecord.transferSize,
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
      encodedDataLength: networkRecord.transferSize === undefined ?
        0 : networkRecord.transferSize,
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
      timestamp: networkRecord.networkEndTime / 1000 || 3,
      encodedDataLength: networkRecord.transferSize === undefined ?
        0 : networkRecord.transferSize,
    },
  };
}

/**
 * @param {Partial<NetworkRequest>} networkRecord
 * @return {LH.Protocol.RawEventMessage}
 */
function getLoadingFailedEvent(networkRecord, index) {
  return {
    method: 'Network.loadingFailed',
    params: {
      requestId: getBaseRequestId(networkRecord) || `${idBase}.${index}`,
      timestamp: networkRecord.networkEndTime / 1000 || 3,
      errorText: networkRecord.localizedFailDescription || 'Request failed',
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
  return {
    ...record,
    redirectResponseTimestamp: originalRecord.networkEndTime,
    redirectResponse: originalResponse,
  };
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
  networkRecords.forEach((record, index) => {
    // Temporary code while we transition away from startTime and endTime.
    // This allows us to defer changes to test files.
    // TODO: remove after timing refactor is done
    // See https://github.com/GoogleChrome/lighthouse/pull/14311
    if (record.constructor === Object) {
      record = networkRecords[index] = JSON.parse(JSON.stringify(record));

      if (record.startTime !== undefined) {
        record.networkRequestTime = record.startTime;
        // Old tests never distinguished between these two.
        record.rendererStartTime = record.startTime;
      }
      if (record.endTime !== undefined) {
        record.networkEndTime = record.endTime;
      }
      if (record.responseReceivedTime !== undefined) {
        record.responseHeadersEndTime = record.responseReceivedTime;
      }
    }

    record = addRedirectResponseIfNeeded(networkRecords, record);
    devtoolsLog.push(getRequestWillBeSentEvent(record, index));

    if (willBeRedirected(networkRecords, record)) {
      // If record is going to redirect, only issue the first event.
      return;
    }

    if (record.fromMemoryCache) {
      devtoolsLog.push(getRequestServedFromCacheEvent(record, index));
    }

    if (record.failed) {
      devtoolsLog.push(getLoadingFailedEvent(record, index));
      return;
    }

    devtoolsLog.push(getResponseReceivedEvent(record, index));
    devtoolsLog.push(getDataReceivedEvent(record, index));
    devtoolsLog.push(getLoadingFinishedEvent(record, index));
  });

  // If in a test, assert that the log will turn into an equivalent networkRecords.
  if (global.expect && !options.skipVerification) {
    const roundTrippedNetworkRecords = NetworkRecorder.recordsFromLogs(devtoolsLog);
    expect(roundTrippedNetworkRecords).toMatchObject(networkRecords);
  }

  return devtoolsLog;
}

export {networkRecordsToDevtoolsLog};
