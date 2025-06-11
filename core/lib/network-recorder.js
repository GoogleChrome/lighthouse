/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {EventEmitter} from 'events';

import log from 'lighthouse-logger';

import * as LH from '../../types/lh.js';
import * as Lantern from './lantern/lantern.js';
import {NetworkRequest} from './network-request.js';

/**
 * @typedef {{
 *   requeststarted: [NetworkRequest],
 *   requestfinished: [NetworkRequest],
 * }} NetworkRecorderEventMap
 */
/** @typedef {LH.Protocol.StrictEventEmitterClass<NetworkRecorderEventMap>} RequestEmitter */
const RequestEventEmitter = /** @type {RequestEmitter} */ (EventEmitter);

class NetworkRecorder extends RequestEventEmitter {
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
   * Returns the array of raw network request data without finalizing the initiator and
   * redirect chain.
   * @return {Array<NetworkRequest>}
   */
  getRawRecords() {
    return Array.from(this._records);
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
  }

  /**
   * Listener for the DevTools SDK NetworkManager's RequestFinished event, which includes
   * request finish, failure, and redirect, as well as the closing of web sockets.
   * @param {NetworkRequest} request
   * @private
   */
  onRequestFinished(request) {
    this.emit('requestfinished', request);
  }

  // The below methods proxy network data into the NetworkRequest object which mimics the
  // DevTools SDK network layer.

  /**
   * @param {{params: LH.Crdp.Network.RequestWillBeSentEvent, targetType: LH.Protocol.TargetType, sessionId?: string}} event
   */
  onRequestWillBeSent(event) {
    const data = event.params;
    const originalRequest = this._findRealRequestAndSetSession(
      data.requestId, event.targetType, event.sessionId);
    // This is a simple new request, create the NetworkRequest object and finish.
    if (!originalRequest) {
      const request = new NetworkRequest();
      request.onRequestWillBeSent(data);
      request.sessionId = event.sessionId;
      request.sessionTargetType = event.targetType;
      this.onRequestStarted(request);
      log.verbose('network', `request will be sent to ${request.url}`);
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
    log.verbose('network', `${originalRequest.url} redirected to ${redirectedRequest.url}`);

    originalRequest.redirectDestination = redirectedRequest;
    redirectedRequest.redirectSource = originalRequest;

    // Start the redirect request before finishing the original so we don't get erroneous quiet periods
    this.onRequestStarted(redirectedRequest);
    this.onRequestFinished(originalRequest);
  }

  /**
   * @param {{params: LH.Crdp.Network.RequestServedFromCacheEvent, targetType: LH.Protocol.TargetType, sessionId?: string}} event
   */
  onRequestServedFromCache(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(
      data.requestId, event.targetType, event.sessionId);
    if (!request) return;
    log.verbose('network', `${request.url} served from cache`);
    request.onRequestServedFromCache();
  }

  /**
   * @param {{params: LH.Crdp.Network.ResponseReceivedEvent, targetType: LH.Protocol.TargetType, sessionId?: string}} event
   */
  onResponseReceived(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(
      data.requestId, event.targetType, event.sessionId);
    if (!request) return;
    log.verbose('network', `${request.url} response received`);
    request.onResponseReceived(data);
  }

  /**
   * @param {{params: LH.Crdp.Network.ResponseReceivedExtraInfoEvent, targetType: LH.Protocol.TargetType, sessionId?: string}} event
   */
  onResponseReceivedExtraInfo(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(
      data.requestId, event.targetType, event.sessionId);
    if (!request) return;
    log.verbose('network', `${request.url} response received extra info`);
    request.onResponseReceivedExtraInfo(data);
  }

  /**
   * @param {{params: LH.Crdp.Network.DataReceivedEvent, targetType: LH.Protocol.TargetType, sessionId?: string}} event
   */
  onDataReceived(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(
      data.requestId, event.targetType, event.sessionId);
    if (!request) return;
    log.verbose('network', `${request.url} data received`);
    request.onDataReceived(data);
  }

  /**
   * @param {{params: LH.Crdp.Network.LoadingFinishedEvent, targetType: LH.Protocol.TargetType, sessionId?: string}} event
   */
  onLoadingFinished(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(
      data.requestId, event.targetType, event.sessionId);
    if (!request) return;
    log.verbose('network', `${request.url} loading finished`);
    request.onLoadingFinished(data);
    this.onRequestFinished(request);
  }

  /**
   * @param {{params: LH.Crdp.Network.LoadingFailedEvent, targetType: LH.Protocol.TargetType, sessionId?: string}} event
   */
  onLoadingFailed(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(
      data.requestId, event.targetType, event.sessionId);
    if (!request) return;
    log.verbose('network', `${request.url} loading failed`);
    request.onLoadingFailed(data);
    this.onRequestFinished(request);
  }

  /**
   * @param {{params: LH.Crdp.Network.ResourceChangedPriorityEvent, targetType: LH.Protocol.TargetType, sessionId?: string}} event
   */
  onResourceChangedPriority(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(
      data.requestId, event.targetType, event.sessionId);
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
      case 'Network.responseReceivedExtraInfo': return this.onResponseReceivedExtraInfo(event);
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
   * @param {LH.Protocol.TargetType} targetType
   * @param {string|undefined} sessionId
   * @return {NetworkRequest|undefined}
   */
  _findRealRequestAndSetSession(requestId, targetType, sessionId) {
    let request = this._recordsById.get(requestId);
    if (!request || !request.isValid) return undefined;

    while (request.redirectDestination) {
      request = request.redirectDestination;
    }

    request.setSession(sessionId);
    request.sessionTargetType = targetType;

    return request;
  }

  /**
   * @param {NetworkRequest} record The record to find the initiator of
   * @param {Map<string, NetworkRequest[]>} recordsByURL
   * @return {NetworkRequest|null}
   * @private
   */
  static _chooseInitiatorRequest(record, recordsByURL) {
    if (record.redirectSource) {
      return record.redirectSource;
    }

    const initiatorURL = Lantern.Graph.PageDependencyGraph.getNetworkInitiators(record)[0];
    let candidates = recordsByURL.get(initiatorURL) || [];
    // The (valid) initiator must come before the initiated request.
    candidates = candidates.filter(c => {
      return c.responseHeadersEndTime <= record.rendererStartTime &&
          c.finished && !c.failed;
    });
    if (candidates.length > 1) {
      // Disambiguate based on prefetch. Prefetch requests have type 'Other' and cannot
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
    if (candidates.length > 1 && record.initiator.type === 'parser') {
      // Filter to just Documents when initiator type is parser.
      const documentCandidates = candidates.filter(cand =>
        cand.resourceType === NetworkRequest.TYPES.Document);
      if (documentCandidates.length) {
        candidates = documentCandidates;
      }
    }
    if (candidates.length > 1) {
      // If all real loads came from successful preloads (url preloaded and
      // loads came from the cache), filter to link rel=preload request(s).
      const linkPreloadCandidates = candidates.filter(c => c.isLinkPreload);
      if (linkPreloadCandidates.length) {
        const nonPreloadCandidates = candidates.filter(c => !c.isLinkPreload);
        const allPreloaded = nonPreloadCandidates.every(c => c.fromDiskCache || c.fromMemoryCache);
        if (nonPreloadCandidates.length && allPreloaded) {
          candidates = linkPreloadCandidates;
        }
      }
    }

    // Only return an initiator if the result is unambiguous.
    return candidates.length === 1 ? candidates[0] : null;
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
    const records = networkRecorder.getRawRecords().filter(record => record.isValid);

    /** @type {Map<string, NetworkRequest[]>} */
    const recordsByURL = new Map();
    for (const record of records) {
      const records = recordsByURL.get(record.url) || [];
      records.push(record);
      recordsByURL.set(record.url, records);
    }

    // set the initiatorRequest and redirects array
    for (const record of records) {
      const initiatorRequest = NetworkRecorder._chooseInitiatorRequest(record, recordsByURL);
      if (initiatorRequest) {
        record.setInitiatorRequest(initiatorRequest);
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

export {NetworkRecorder};
