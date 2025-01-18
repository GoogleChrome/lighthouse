/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview This class wires up the procotol to a network recorder and provides overall
 * status inspection state.
 */

import {EventEmitter} from 'events';

import log from 'lighthouse-logger';

import * as LH from '../../../types/lh.js';
import {NetworkRecorder} from '../../lib/network-recorder.js';
import {NetworkRequest} from '../../lib/network-request.js';
import UrlUtils from '../../lib/url-utils.js';

/** @typedef {import('../../lib/network-recorder.js').NetworkRecorderEventMap} NetworkRecorderEventMap */
/** @typedef {'network-2-idle'|'network-critical-idle'|'networkidle'|'networkbusy'|'network-critical-busy'|'network-2-busy'} NetworkMonitorEvent_ */
/** @typedef {Record<NetworkMonitorEvent_, []> & NetworkRecorderEventMap} NetworkMonitorEventMap */
/** @typedef {keyof NetworkMonitorEventMap} NetworkMonitorEvent */
/** @typedef {LH.Protocol.StrictEventEmitterClass<NetworkMonitorEventMap>} NetworkMonitorEmitter */
const NetworkMonitorEventEmitter = /** @type {NetworkMonitorEmitter} */ (EventEmitter);

class NetworkMonitor extends NetworkMonitorEventEmitter {
  /** @type {NetworkRecorder|undefined} */
  _networkRecorder = undefined;
  /** @type {Array<LH.Crdp.Page.Frame>} */
  _frameNavigations = [];

  /** @param {LH.Gatherer.Driver['targetManager']} targetManager */
  constructor(targetManager) {
    super();

    /** @type {LH.Gatherer.Driver['targetManager']} */
    this._targetManager = targetManager;

    /** @type {LH.Gatherer.ProtocolSession} */
    this._session = targetManager.rootSession();

    /** @param {LH.Crdp.Page.FrameNavigatedEvent} event */
    this._onFrameNavigated = event => this._frameNavigations.push(event.frame);

    /** @param {LH.Protocol.RawEventMessage} event */
    this._onProtocolMessage = event => {
      if (!this._networkRecorder) return;
      this._networkRecorder.dispatch(event);
    };
  }

  /**
   * @return {Promise<void>}
   */
  async enable() {
    if (this._networkRecorder) return;

    this._frameNavigations = [];
    this._networkRecorder = new NetworkRecorder();

    /**
     * Reemit the same network recorder events.
     * @param {keyof NetworkRecorderEventMap} event
     * @return {(r: NetworkRequest) => void}
     */
    const reEmit = event => r => {
      this.emit(event, r);
      this._emitNetworkStatus();
    };

    this._networkRecorder.on('requeststarted', reEmit('requeststarted'));
    this._networkRecorder.on('requestfinished', reEmit('requestfinished'));

    this._session.on('Page.frameNavigated', this._onFrameNavigated);
    this._targetManager.on('protocolevent', this._onProtocolMessage);
  }

  /**
   * @return {Promise<void>}
   */
  async disable() {
    if (!this._networkRecorder) return;

    this._session.off('Page.frameNavigated', this._onFrameNavigated);
    this._targetManager.off('protocolevent', this._onProtocolMessage);

    this._frameNavigations = [];
    this._networkRecorder = undefined;
  }

  /** @return {Promise<{requestedUrl?: string, mainDocumentUrl?: string}>} */
  async getNavigationUrls() {
    const frameNavigations = this._frameNavigations;
    if (!frameNavigations.length) return {};

    const mainFrameNavigations = frameNavigations.filter(frame => !frame.parentId);
    if (!mainFrameNavigations.length) log.warn('NetworkMonitor', 'No detected navigations');

    // The requested URL is the initiator request for the first frame navigation.
    /** @type {string|undefined} */
    let requestedUrl = mainFrameNavigations[0]?.url;
    if (this._networkRecorder) {
      const records = this._networkRecorder.getRawRecords();

      let initialUrlRequest = records.find(record => record.url === requestedUrl);
      while (initialUrlRequest?.redirectSource) {
        initialUrlRequest = initialUrlRequest.redirectSource;
        requestedUrl = initialUrlRequest.url;
      }
    }

    return {
      requestedUrl,
      mainDocumentUrl: mainFrameNavigations[mainFrameNavigations.length - 1]?.url,
    };
  }

  /**
   * @return {Array<NetworkRequest>}
   */
  getInflightRequests() {
    if (!this._networkRecorder) return [];
    return this._networkRecorder.getRawRecords().filter(request => !request.finished);
  }

  /**
   * Returns whether the network is completely idle (i.e. there are 0 inflight network requests).
   */
  isIdle() {
    return this._isIdlePeriod(0);
  }

  /**
   * Returns whether any important resources for the page are in progress.
   * Above-the-fold images and XHRs should be included.
   * Tracking pixels, low priority images, and cross frame requests should be excluded.
   * @return {boolean}
   */
  isCriticalIdle() {
    if (!this._networkRecorder) return false;
    const requests = this._networkRecorder.getRawRecords();
    const rootFrameRequest = requests.find(r => r.resourceType === 'Document');
    const rootFrameId = rootFrameRequest?.frameId;

    return this._isIdlePeriod(
      0,
      // Return true if it should be a candidate for critical.
      request =>
        request.frameId === rootFrameId &&
        // WebSocket and Server-sent Events are typically long-lived and shouldn't be considered critical.
        request.resourceType !== 'WebSocket' && request.resourceType !== 'EventSource' &&
        (request.priority === 'VeryHigh' || request.priority === 'High')
    );
  }

  /**
   * Returns whether the network is semi-idle (i.e. there are 2 or fewer inflight network requests).
   */
  is2Idle() {
    return this._isIdlePeriod(2);
  }

  /**
   * Returns whether the number of currently inflight requests is less than or
   * equal to the number of allowed concurrent requests.
   * @param {number} allowedRequests
   * @param {(request: NetworkRequest) => boolean} [requestFilter]
   * @return {boolean}
   */
  _isIdlePeriod(allowedRequests, requestFilter) {
    if (!this._networkRecorder) return false;
    const requests = this._networkRecorder.getRawRecords();
    let inflightRequests = 0;

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      if (request.finished) continue;
      if (requestFilter?.(request) === false) continue;
      if (NetworkRequest.isNonNetworkRequest(request)) continue;
      inflightRequests++;
    }

    return inflightRequests <= allowedRequests;
  }

  /**
   * Emits the appropriate network status event.
   */
  _emitNetworkStatus() {
    const zeroQuiet = this.isIdle();
    const twoQuiet = this.is2Idle();
    const criticalQuiet = this.isCriticalIdle();

    this.emit(zeroQuiet ? 'networkidle' : 'networkbusy');
    this.emit(twoQuiet ? 'network-2-idle' : 'network-2-busy');
    this.emit(criticalQuiet ? 'network-critical-idle' : 'network-critical-busy');

    if (twoQuiet && zeroQuiet) log.verbose('NetworkRecorder', 'network fully-quiet');
    else if (twoQuiet && !zeroQuiet) log.verbose('NetworkRecorder', 'network semi-quiet');
    else log.verbose('NetworkRecorder', 'network busy');
  }

  /**
   * Finds all time periods where the number of inflight requests is less than or equal to the
   * number of allowed concurrent requests.
   * The time periods returned are in ms.
   * @param {Array<LH.Artifacts.NetworkRequest>} requests
   * @param {number} allowedConcurrentRequests
   * @param {number=} endTime In ms
   * @return {Array<{start: number, end: number}>}
   */
  static findNetworkQuietPeriods(requests, allowedConcurrentRequests, endTime = Infinity) {
    // First collect the timestamps of when requests start and end
    /** @type {Array<{time: number, isStart: boolean}>} */
    let timeBoundaries = [];
    requests.forEach(request => {
      if (UrlUtils.isNonNetworkProtocol(request.protocol)) return;
      if (request.protocol === 'ws' || request.protocol === 'wss') return;

      timeBoundaries.push({time: request.networkRequestTime, isStart: true});
      if (request.finished) {
        timeBoundaries.push({time: request.networkEndTime, isStart: false});
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
}

export {NetworkMonitor};
