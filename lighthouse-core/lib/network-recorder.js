/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRequest = require('./network-request.js');
const EventEmitter = require('events').EventEmitter;
const log = require('lighthouse-logger');

const IGNORED_NETWORK_SCHEMES = ['data', 'ws'];

/** @typedef {'requeststarted'|'requestloaded'|'network-2-idle'|'networkidle'|'networkbusy'|'network-2-busy'} NetworkRecorderEvent */

class NetworkRecorder extends EventEmitter {
  /**
   * Creates an instance of NetworkRecorder.
   */
  constructor() {
    super();

    /** @type {NetworkRequest[]} */
    this._records = [];
    /** @type {Map<string, NetworkRequest>} */
    this._recordsById = new Map();
  }

  /**
   * @return {Array<LH.Artifacts.NetworkRequest>}
   */
  getInflightRecords() {
    return this._records.filter(record => !record.finished);
  }

  getRecords() {
    return Array.from(this._records);
  }

  /**
   * @param {NetworkRecorderEvent} event
   * @param {*} listener
   */
  on(event, listener) {
    return super.on(event, listener);
  }

  /**
   * @param {NetworkRecorderEvent} event
   * @param {*} listener
   */
  once(event, listener) {
    return super.once(event, listener);
  }

  isIdle() {
    return this._isActiveIdlePeriod(0);
  }

  is2Idle() {
    return this._isActiveIdlePeriod(2);
  }

  /**
   * Returns whether the number of currently inflight requests is less than or
   * equal to the number of allowed concurrent requests.
   * @param {number} allowedRequests
   * @return {boolean}
   */
  _isActiveIdlePeriod(allowedRequests) {
    let inflightRequests = 0;

    for (let i = 0; i < this._records.length; i++) {
      const record = this._records[i];
      if (record.finished) continue;
      if (IGNORED_NETWORK_SCHEMES.includes(record.parsedURL.scheme)) continue;
      inflightRequests++;
    }

    return inflightRequests <= allowedRequests;
  }

  _emitNetworkStatus() {
    const zeroQuiet = this.isIdle();
    const twoQuiet = this.is2Idle();

    if (twoQuiet && zeroQuiet) {
      log.verbose('NetworkRecorder', 'network fully-quiet');
      this.emit('network-2-idle');
      this.emit('networkidle');
    } else if (twoQuiet && !zeroQuiet) {
      log.verbose('NetworkRecorder', 'network semi-quiet');
      this.emit('network-2-idle');
      this.emit('networkbusy');
    } else {
      log.verbose('NetworkRecorder', 'network busy');
      this.emit('network-2-busy');
      this.emit('networkbusy');
    }
  }

  /**
   * Finds all time periods where the number of inflight requests is less than or equal to the
   * number of allowed concurrent requests.
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {number} allowedConcurrentRequests
   * @param {number=} endTime
   * @return {Array<{start: number, end: number}>}
   */
  static findNetworkQuietPeriods(networkRecords, allowedConcurrentRequests, endTime = Infinity) {
    // First collect the timestamps of when requests start and end
    /** @type {Array<{time: number, isStart: boolean}>} */
    let timeBoundaries = [];
    networkRecords.forEach(record => {
      const scheme = record.parsedURL && record.parsedURL.scheme;
      if (IGNORED_NETWORK_SCHEMES.includes(scheme)) {
        return;
      }

      // convert the network record timestamp to ms
      timeBoundaries.push({time: record.startTime * 1000, isStart: true});
      if (record.finished) {
        timeBoundaries.push({time: record.endTime * 1000, isStart: false});
      }
    });

    timeBoundaries = timeBoundaries
      .filter(boundary => boundary.time <= endTime)
      .sort((a, b) => a.time - b.time);

    let numInflightRequests = 0;
    let quietPeriodStart = 0;
    /** @type {Array<{start: number, end: number}>} */
    const quietPeriods = [];
    timeBoundaries.forEach(boundary => {
      if (boundary.isStart) {
        // we've just started a new request. are we exiting a quiet period?
        if (numInflightRequests === allowedConcurrentRequests) {
          quietPeriods.push({start: quietPeriodStart, end: boundary.time});
        }
        numInflightRequests++;
      } else {
        numInflightRequests--;
        // we've just completed a request. are we entering a quiet period?
        if (numInflightRequests === allowedConcurrentRequests) {
          quietPeriodStart = boundary.time;
        }
      }
    });

    // Check we ended in a quiet period
    if (numInflightRequests <= allowedConcurrentRequests) {
      quietPeriods.push({start: quietPeriodStart, end: endTime});
    }

    return quietPeriods.filter(period => period.start !== period.end);
  }

  /**
   * Listener for the DevTools SDK NetworkManager's RequestStarted event, which includes both
   * web socket and normal request creation.
   * @param {NetworkRequest} request
   * @private
   */
  onRequestStarted(request) {
    this._records.push(request);
    this._recordsById.set(request.requestId, request);

    this.emit('requeststarted', request);
    this._emitNetworkStatus();
  }

  /**
   * Listener for the DevTools SDK NetworkManager's RequestFinished event, which includes
   * request finish, failure, and redirect, as well as the closing of web sockets.
   * @param {NetworkRequest} request
   * @private
   */
  onRequestFinished(request) {
    this.emit('requestloaded', request);
    this._emitNetworkStatus();
  }

  // The below methods proxy network data into the NetworkRequest object which mimics the
  // DevTools SDK network layer.

  /**
   * @param {{params: LH.Crdp.Network.RequestWillBeSentEvent, sessionId?: string}} event
   */
  onRequestWillBeSent(event) {
    const data = event.params;
    const originalRequest = this._findRealRequestAndSetSession(data.requestId, event.sessionId);
    // This is a simple new request, create the NetworkRequest object and finish.
    if (!originalRequest) {
      const request = new NetworkRequest();
      request.onRequestWillBeSent(data);
      request.sessionId = event.sessionId;
      this.onRequestStarted(request);
      return;
    }

    // TODO: beacon to Sentry, https://github.com/GoogleChrome/lighthouse/issues/7041
    if (!data.redirectResponse) {
      return;
    }

    // On redirect, another requestWillBeSent message is fired for the same requestId.
    // Update/finish the previous network request and create a new one for the redirect.
    const modifiedData = {
      ...data,
      // Copy over the initiator as well to match DevTools behavior
      initiator: originalRequest.initiator,
      requestId: `${originalRequest.requestId}:redirect`,
    };
    const redirectedRequest = new NetworkRequest();

    redirectedRequest.onRequestWillBeSent(modifiedData);
    originalRequest.onRedirectResponse(data);

    originalRequest.redirectDestination = redirectedRequest;
    redirectedRequest.redirectSource = originalRequest;

    // Start the redirect request before finishing the original so we don't get erroneous quiet periods
    this.onRequestStarted(redirectedRequest);
    this.onRequestFinished(originalRequest);
  }

  /**
   * @param {{params: LH.Crdp.Network.RequestServedFromCacheEvent, sessionId?: string}} event
   */
  onRequestServedFromCache(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(data.requestId, event.sessionId);
    if (!request) return;
    request.onRequestServedFromCache();
  }

  /**
   * @param {{params: LH.Crdp.Network.ResponseReceivedEvent, sessionId?: string}} event
   */
  onResponseReceived(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(data.requestId, event.sessionId);
    if (!request) return;
    request.onResponseReceived(data);
  }

  /**
   * @param {{params: LH.Crdp.Network.DataReceivedEvent, sessionId?: string}} event
   */
  onDataReceived(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(data.requestId, event.sessionId);
    if (!request) return;
    request.onDataReceived(data);
  }

  /**
   * @param {{params: LH.Crdp.Network.LoadingFinishedEvent, sessionId?: string}} event
   */
  onLoadingFinished(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(data.requestId, event.sessionId);
    if (!request) return;
    request.onLoadingFinished(data);
    this.onRequestFinished(request);
  }

  /**
   * @param {{params: LH.Crdp.Network.LoadingFailedEvent, sessionId?: string}} event
   */
  onLoadingFailed(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(data.requestId, event.sessionId);
    if (!request) return;
    request.onLoadingFailed(data);
    this.onRequestFinished(request);
  }

  /**
   * @param {{params: LH.Crdp.Network.ResourceChangedPriorityEvent, sessionId?: string}} event
   */
  onResourceChangedPriority(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(data.requestId, event.sessionId);
    if (!request) return;
    request.onResourceChangedPriority(data);
  }

  /**
   * Routes network events to their handlers, so we can construct networkRecords
   * @param {LH.Protocol.RawEventMessage} event
   */
  dispatch(event) {
    switch (event.method) {
      case 'Network.requestWillBeSent': return this.onRequestWillBeSent(event);
      case 'Network.requestServedFromCache': return this.onRequestServedFromCache(event);
      case 'Network.responseReceived': return this.onResponseReceived(event);
      case 'Network.dataReceived': return this.onDataReceived(event);
      case 'Network.loadingFinished': return this.onLoadingFinished(event);
      case 'Network.loadingFailed': return this.onLoadingFailed(event);
      case 'Network.resourceChangedPriority': return this.onResourceChangedPriority(event);
      default: return;
    }
  }

  /**
   * Redirected requests all have identical requestIds over the protocol. Once a request has been
   * redirected all future messages referrencing that requestId are about the new destination, not
   * the original. This method is a helper for finding the real request object to which the current
   * message is referring.
   *
   * @param {string} requestId
   * @param {string|undefined} sessionId
   * @return {NetworkRequest|undefined}
   */
  _findRealRequestAndSetSession(requestId, sessionId) {
    let request = this._recordsById.get(requestId);
    if (!request || !request.isValid) return undefined;

    while (request.redirectDestination) {
      request = request.redirectDestination;
    }

    request.setSession(sessionId);

    return request;
  }

  /**
   * @param {NetworkRequest} record The record to find the initiator of
   * @param {Map<string, NetworkRequest[]>} recordsByURL
   * @return {NetworkRequest|null}
   * @private
   */
  static _chooseInitiator(record, recordsByURL) {
    if (record.redirectSource) {
      return record.redirectSource;
    }
    const stackFrames = (record.initiator.stack && record.initiator.stack.callFrames) || [];
    const initiatorURL = record.initiator.url || (stackFrames[0] && stackFrames[0].url);

    let candidates = recordsByURL.get(initiatorURL) || [];
    // The initiator must come before the initiated request.
    candidates = candidates.filter(cand => cand.responseReceivedTime <= record.startTime);
    if (candidates.length > 1) {
      // Disambiguate based on resource type. Prefetch requests have type 'Other' and cannot
      // initiate requests, so we drop them here.
      const nonPrefetchCandidates = candidates.filter(
          cand => cand.resourceType !== NetworkRequest.TYPES.Other);
      if (nonPrefetchCandidates.length) {
        candidates = nonPrefetchCandidates;
      }
    }
    if (candidates.length > 1) {
      // Disambiguate based on frame. It's likely that the initiator comes from the same frame.
      const sameFrameCandidates = candidates.filter(cand => cand.frameId === record.frameId);
      if (sameFrameCandidates.length) {
        candidates = sameFrameCandidates;
      }
    }

    return candidates.length ? candidates[0] : null;
  }

  /**
   * Construct network records from a log of devtools protocol messages.
   * @param {LH.DevtoolsLog} devtoolsLog
   * @return {Array<LH.Artifacts.NetworkRequest>}
   */
  static recordsFromLogs(devtoolsLog) {
    const networkRecorder = new NetworkRecorder();
    // playback all the devtools messages to recreate network records
    devtoolsLog.forEach(message => networkRecorder.dispatch(message));

    // get out the list of records & filter out invalid records
    const records = networkRecorder.getRecords().filter(record => record.isValid);

    /** @type {Map<string, NetworkRequest[]>} */
    const recordsByURL = new Map();
    for (const record of records) {
      const records = recordsByURL.get(record.url) || [];
      records.push(record);
      recordsByURL.set(record.url, records);
    }

    // set the initiator and redirects array
    for (const record of records) {
      const initiator = NetworkRecorder._chooseInitiator(record, recordsByURL);
      if (initiator) {
        record.setInitiatorRequest(initiator);
      }

      let finalRecord = record;
      while (finalRecord.redirectDestination) finalRecord = finalRecord.redirectDestination;
      if (finalRecord === record || finalRecord.redirects) continue;

      const redirects = [];
      for (
        let redirect = finalRecord.redirectSource;
        redirect;
        redirect = redirect.redirectSource
      ) {
        redirects.unshift(redirect);
      }

      finalRecord.redirects = redirects;
    }

    return records;
  }
}

module.exports = NetworkRecorder;
