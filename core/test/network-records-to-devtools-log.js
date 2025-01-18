// @ts-nocheck
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {NetworkRecorder} from '../../core/lib/network-recorder.js';

/** @typedef {import('../../core/lib/network-request.js').NetworkRequest} NetworkRequest */

const idBase = '127122';
const exampleUrl = 'https://testingurl.com/';
const redirectSuffix = ':redirect';
// Default networkRequestTime if none provided. Do not use 0 due to guard against
// bad network records starting at 0. See https://github.com/GoogleChrome/lighthouse/pull/6780
const defaultStart = 1000;
const defaultTimingOffset = 1000;

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
 * Returns true if the time is defined, false if the time is `undefined` (not
 * provided) or `-1` (default prop value in `NetworkRequest`).
 * @param {number|undefined} time
 * @return {boolean}
 */
function timeDefined(time) {
  return time !== undefined && time !== -1;
}

/**
 * Asserts that any value in the object is less than or equal to any later
 * values (in object enumeration order). `undefined` or `-1` values are ignored.
 * Keys of the object are used for better error logging.
 * @param {Record<string, number|undefined>} values
 */
function assertTimingIncreases(values) {
  const keys = Object.keys(values);
  for (let i = 0; i < keys.length - 1; i++) {
    const step = keys[i];
    if (!timeDefined(values[step])) continue;

    for (let j = i + 1; j < keys.length; j++) {
      const comparison = keys[j];
      if (!timeDefined(values[comparison])) continue;
      assert(values[step] <= values[comparison], `'${step}' (${values[step]}) exceeds '${comparison}' (${values[comparison]}) in test network record`); // eslint-disable-line max-len
    }
  }
}

/**
 * Extract any timings found in `networkRecord` and assert that they're
 * consistent with each other.
 * @param {Partial<NetworkRequest>} networkRecord
 */
function extractPartialTiming(networkRecord) {
  const {
    // In seconds.
    requestTime: requestTimeS,
    // Other values are relative to requestTime.
    ...relativeTimes
  } = networkRecord.timing ?? {};
  const relativeValues = Object.values(relativeTimes).filter(timeDefined);
  const relativeTimingMax = relativeValues.length ? Math.max(...relativeValues) : 0;

  const {
    rendererStartTime,
    networkRequestTime,
    responseHeadersEndTime,
    networkEndTime,
    redirectResponseTimestamp, // Generated timestamp added in addRedirectResponseIfNeeded; only used as backup start time.
    responseTimestamp, // Time of response event from CDP, not from the netstack.
  } = networkRecord;

  const requestTime = timeDefined(requestTimeS) ? requestTimeS * 1000 : undefined;
  const absoluteTimes = {rendererStartTime, networkRequestTime, requestTime, responseHeadersEndTime,
    networkEndTime};
  assertTimingIncreases(absoluteTimes);

  // `requestTime` and `networkRequestTime` must be equal if both are defined.
  if (timeDefined(networkRequestTime) && timeDefined(requestTime)) {
    assert.equal(networkRequestTime, requestTime, `'networkRequestTime' (${networkRequestTime}) is not equal to 'timing.requestTime' (${requestTimeS} seconds) in test network record`); // eslint-disable-line max-len
  }

  // Start of request + relative timing must be <= responseHeadersEndTime and networkEndTime.
  const startTimes = [rendererStartTime, networkRequestTime, requestTime];
  let maxStart = Math.max(...startTimes.filter(timeDefined));
  maxStart = Number.isFinite(maxStart) ? maxStart : redirectResponseTimestamp; // Use redirectResponseTimestamp only as fallback.
  if (timeDefined(maxStart)) {
    if (timeDefined(responseHeadersEndTime)) {
      assert(maxStart + relativeTimingMax <= responseHeadersEndTime, `request start (${maxStart}) plus relative 'timing' value (${relativeTimingMax}) exceeds 'responseHeadersEndTime' (${responseHeadersEndTime}) in test network record`); // eslint-disable-line max-len
    }
    if (timeDefined(networkEndTime)) {
      assert(maxStart + relativeTimingMax <= networkEndTime, `request start (${maxStart}) plus relative 'timing' value (${relativeTimingMax}) exceeds 'networkEndTime' (${networkEndTime}) in test network record`); // eslint-disable-line max-len
    }
  }

  // If all are defined, requestTime + receiveHeadersEnd === responseHeadersEndTime.
  const {receiveHeadersEnd} = networkRecord.timing ?? {};
  const start = timeDefined(networkRequestTime) ? networkRequestTime : requestTime;
  if (timeDefined(start) && timeDefined(receiveHeadersEnd) && timeDefined(responseHeadersEndTime)) {
    assert.equal(start + receiveHeadersEnd, responseHeadersEndTime, `request start (${start}) plus 'receiveHeadersEnd' (${receiveHeadersEnd}) does not equal 'responseHeadersEndTime' (${responseHeadersEndTime}) in test network record`); // eslint-disable-line max-len
  }

  return {
    redirectResponseTimestamp,
    responseTimestamp,
    rendererStartTime,
    networkRequestTime,
    requestTime,
    receiveHeadersEnd,
    responseHeadersEndTime,
    networkEndTime,
    relativeTimingMax,
  };
}

/**
 * Takes partial network timing and fills in the missing values to at least
 * ensure time is linear (if not realistic). The main timing properties on
 * `NetworkRequest`, and `requestTime` and `receiveHeadersEnd` on
 * `NetworkRequest['timing']` will be generated. The other `timing` properties
 * will not be automatically generated, but will be copied if provided, so it's
 * up to the caller to make them correctly ordered with each other.
 * If no absolute times are provided at all:
 * - request will start at `defaultStart`
 * - finish receiving headers `defaultTimingOffset` ms later
 * - then end `defaultTimingOffset` ms after that
 * Throws an error if conditions appear impossible to satisfy.
 * @param {Partial<NetworkRequest>} values
 * @return {NormalizedRequestTime}
 */
function getNormalizedRequestTiming(networkRecord) {
  const extractedTimes = extractPartialTiming(networkRecord);

  const possibleStarts = [
    extractedTimes.networkRequestTime,
    extractedTimes.requestTime,
    extractedTimes.rendererStartTime,
    // Note: since redirectResponseTimestamp (aka the redirect's networkEndTime) is
    // used as a last resort, some redirected requests may start before the
    // redirect ends. Up to the caller to override if this matters.
    extractedTimes.redirectResponseTimestamp,
  ];
  const networkRequestTime = possibleStarts.find(timeDefined) ?? defaultStart;

  const rendererStartTime = timeDefined(extractedTimes.rendererStartTime) ?
      extractedTimes.rendererStartTime :
      // Because `rendererStartTime` was added much later, several tests assume
      // requests start at `networkRequestTime`, so default to the same timestamp.
      networkRequestTime;

  // `networkRequestTime` and `requestTime` are the same.
  const requestTime = networkRequestTime;

  // `receiveHeadersEnd` is milliseconds after `requestTime`.
  let {receiveHeadersEnd} = extractedTimes;
  if (!timeDefined(receiveHeadersEnd)) {
    if (timeDefined(extractedTimes.responseHeadersEndTime)) {
      receiveHeadersEnd = extractedTimes.responseHeadersEndTime - requestTime;
    } else if (timeDefined(extractedTimes.networkEndTime)) {
      // Pick a time between last defined `timing` (may just be `requestTime`) and `networkEndTime`.
      receiveHeadersEnd = (extractedTimes.relativeTimingMax +
          (extractedTimes.networkEndTime - requestTime)) / 2;
    } else {
      receiveHeadersEnd = Math.max(extractedTimes.relativeTimingMax, defaultTimingOffset);
    }
  }

  // Equivalent to responseHeadersEndTime if provided due to `receiveHeadersEnd` construction above.
  const responseHeadersEndTime = requestTime + receiveHeadersEnd;

  // networkEndTime is allowed to be -1, e.g. for incomplete requests.
  const networkEndTime = extractedTimes.networkEndTime ??
      (responseHeadersEndTime + defaultTimingOffset);

  const responseTimestamp = extractedTimes.responseTimestamp ?? requestTime + receiveHeadersEnd;

  return {
    rendererStartTime,
    networkRequestTime,
    responseHeadersEndTime,
    networkEndTime,
    responseTimestamp,
    timing: {
      // TODO: other `timing` properties could have default values.
      ...networkRecord.timing,
      requestTime: Math.round(requestTime * 1_000) / 1_000_000, // Convert back to seconds.
      receiveHeadersEnd,
    },
  };
}

/**
 * @param {Partial<NetworkRequest>} networkRecord
 * @param {number} index
 * @param {NormalizedRequestTime} normalizedTiming
 * @return {LH.Protocol.RawEventMessage}
 */
function getRequestWillBeSentEvent(networkRecord, index, normalizedTiming) {
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
      timestamp: normalizedTiming.rendererStartTime / 1000,
      wallTime: 0,
      initiator,
      type: networkRecord.resourceType || 'Document',
      frameId: networkRecord.frameId,
      redirectResponse: networkRecord.redirectResponse,
    },
    targetType: 'sessionTargetType' in networkRecord ? networkRecord.sessionTargetType : 'page',
    sessionId: networkRecord.sessionId,
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
    targetType: 'sessionTargetType' in networkRecord ? networkRecord.sessionTargetType : 'page',
    sessionId: networkRecord.sessionId,
  };
}

/**
 * @param {Partial<NetworkRequest>} networkRecord
 * @param {number} index
 * @param {NormalizedRequestTime} normalizedTiming
 * @return {LH.Protocol.RawEventMessage}
 */
function getResponseReceivedEvent(networkRecord, index, normalizedTiming) {
  const headers = headersArrayToHeadersDict(networkRecord.responseHeaders);

  return {
    method: 'Network.responseReceived',
    params: {
      requestId: getBaseRequestId(networkRecord) || `${idBase}.${index}`,
      timestamp: normalizedTiming.responseTimestamp / 1000,
      type: networkRecord.resourceType || undefined,
      response: {
        url: networkRecord.url || exampleUrl,
        status: networkRecord.statusCode || 200,
        headers,
        mimeType: typeof networkRecord.mimeType === 'string' ? networkRecord.mimeType : 'text/html',
        connectionReused: networkRecord.connectionReused ?? false,
        connectionId: networkRecord.connectionId ?? 140,
        fromDiskCache: networkRecord.fromDiskCache ?? false,
        fromServiceWorker: networkRecord.fetchedViaServiceWorker ?? false,
        encodedDataLength: networkRecord.responseHeadersTransferSize ?? 0,
        timing: {...normalizedTiming.timing},
        protocol: networkRecord.protocol ?? 'http/1.1',
      },
      frameId: networkRecord.frameId,
    },
    targetType: 'sessionTargetType' in networkRecord ? networkRecord.sessionTargetType : 'page',
    sessionId: networkRecord.sessionId,
  };
}

/**
 * @param {Partial<NetworkRequest>} networkRecord
 * @param {number} index
 * @return {LH.Protocol.RawEventMessage}
 */
function getResponseReceivedExtraInfoEvent(networkRecord, index) {
  const headers = headersArrayToHeadersDict(networkRecord.responseHeaders);

  return {
    method: 'Network.responseReceivedExtraInfo',
    params: {
      requestId: getBaseRequestId(networkRecord) || `${idBase}.${index}`,
      statusCode: networkRecord.statusCode || 200,
      headers,
      headersText: networkRecord.responseHeadersText,
    },
    targetType: 'sessionTargetType' in networkRecord ? networkRecord.sessionTargetType : 'page',
    sessionId: networkRecord.sessionId,
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
    targetType: 'sessionTargetType' in networkRecord ? networkRecord.sessionTargetType : 'page',
    sessionId: networkRecord.sessionId,
  };
}

/**
 * @param {Partial<NetworkRequest>} networkRecord
 * @param {number} index
 * @param {NormalizedRequestTime} normalizedTiming
 * @return {LH.Protocol.RawEventMessage}
 */
function getLoadingFinishedEvent(networkRecord, index, normalizedTiming) {
  return {
    method: 'Network.loadingFinished',
    params: {
      requestId: getBaseRequestId(networkRecord) || `${idBase}.${index}`,
      timestamp: normalizedTiming.networkEndTime / 1000,
      encodedDataLength: networkRecord.transferSize === undefined ?
        0 : networkRecord.transferSize,
    },
    targetType: 'sessionTargetType' in networkRecord ? networkRecord.sessionTargetType : 'page',
    sessionId: networkRecord.sessionId,
  };
}

/**
 * @param {Partial<NetworkRequest>} networkRecord
 * @param {number} index
 * @param {NormalizedRequestTime} normalizedTiming
 * @return {LH.Protocol.RawEventMessage}
 */
function getLoadingFailedEvent(networkRecord, index, normalizedTiming) {
  return {
    method: 'Network.loadingFailed',
    params: {
      requestId: getBaseRequestId(networkRecord) || `${idBase}.${index}`,
      timestamp: normalizedTiming.networkEndTime / 1000,
      type: networkRecord.resourceType || undefined,
      errorText: networkRecord.localizedFailDescription || 'Request failed',
    },
    targetType: 'sessionTargetType' in networkRecord ? networkRecord.sessionTargetType : 'page',
    sessionId: networkRecord.sessionId,
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
  const originalTiming = getNormalizedRequestTiming(originalRecord);
  const originalResponseEvent = getResponseReceivedEvent(originalRecord, -1, originalTiming);
  const originalResponse = originalResponseEvent.params.response;
  originalResponse.status = originalRecord.statusCode || 302;
  return {
    ...record,
    redirectResponseTimestamp: originalTiming.networkEndTime,
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
  networkRecords.forEach((networkRecord, index) => {
    if (networkRecord.url && new URL(networkRecord.url).hash) {
      throw new Error(`Network records should not have hashes: ${networkRecord.url}`);
    }

    networkRecord = addRedirectResponseIfNeeded(networkRecords, networkRecord);

    const normalizedTiming = getNormalizedRequestTiming(networkRecord);
    devtoolsLog.push(getRequestWillBeSentEvent(networkRecord, index, normalizedTiming));

    if (willBeRedirected(networkRecords, networkRecord)) {
      // If record is going to redirect, only issue the first event.
      return;
    }

    if (networkRecord.fromMemoryCache) {
      devtoolsLog.push(getRequestServedFromCacheEvent(networkRecord, index));
    }

    if (networkRecord.failed) {
      devtoolsLog.push(getLoadingFailedEvent(networkRecord, index, normalizedTiming));
      return;
    }

    devtoolsLog.push(getResponseReceivedEvent(networkRecord, index, normalizedTiming));
    if (networkRecord.responseHeadersText) {
      devtoolsLog.push(getResponseReceivedExtraInfoEvent(networkRecord, index));
    }
    devtoolsLog.push(getDataReceivedEvent(networkRecord, index));

    if (networkRecord.finished !== false) {
      devtoolsLog.push(getLoadingFinishedEvent(networkRecord, index, normalizedTiming));
    }
  });

  // If in a test, assert that the log will turn into an equivalent networkRecords.
  if (global.expect && !options.skipVerification) {
    const roundTrippedNetworkRecords = NetworkRecorder.recordsFromLogs(devtoolsLog);
    expect(roundTrippedNetworkRecords).toMatchObject(networkRecords);
  }

  return devtoolsLog;
}

export {
  networkRecordsToDevtoolsLog,
  getNormalizedRequestTiming,
};
