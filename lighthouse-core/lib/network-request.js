/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Fills most of the role of NetworkManager and NetworkRequest classes from DevTools.
 * @see https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/sdk/NetworkRequest.js
 * @see https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/sdk/NetworkManager.js
 */

const URL = require('./url-shim.js');

const SECURE_SCHEMES = ['data', 'https', 'wss', 'blob', 'chrome', 'chrome-extension', 'about'];

// Lightrider X-Header names for timing information.
// See: _updateTransferSizeForLightrider and _updateTimingsForLightrider.
const HEADER_TCP = 'X-TCPMs';
const HEADER_SSL = 'X-SSLMs';
const HEADER_REQ = 'X-RequestMs';
const HEADER_RES = 'X-ResponseMs';
const HEADER_TOTAL = 'X-TotalMs';
const HEADER_FETCHED_SIZE = 'X-TotalFetchedSize';

/**
 * @typedef HeaderEntry
 * @property {string} name
 * @property {string} value
 */

/**
 * @typedef ParsedURL
 * @property {string} scheme
 * @property {string} host
 * @property {string} securityOrigin
 */

/**
 * @typedef LightriderStatistics
 * The difference in endTime between the observed Lighthouse endTime and Lightrider's derived endTime.
 * @property {number} endTimeDeltaMs
 * The time spent making a TCP connection (connect + SSL).
 * @property {number} TCPMs
 * The time spent requesting a resource from a remote server, we use this to approx RTT.
 * @property {number} requestMs
 * The time spent transferring a resource from a remote server.
 * @property {number} responseMs
 */

/** @type {SelfMap<LH.Crdp.Network.ResourceType>} */
const RESOURCE_TYPES = {
  XHR: 'XHR',
  Fetch: 'Fetch',
  EventSource: 'EventSource',
  Script: 'Script',
  Stylesheet: 'Stylesheet',
  Image: 'Image',
  Media: 'Media',
  Font: 'Font',
  Document: 'Document',
  TextTrack: 'TextTrack',
  WebSocket: 'WebSocket',
  Other: 'Other',
  Manifest: 'Manifest',
  SignedExchange: 'SignedExchange',
  Ping: 'Ping',
  CSPViolationReport: 'CSPViolationReport',
};

class NetworkRequest {
  constructor() {
    this.requestId = '';
    this.connectionId = '0';
    this.connectionReused = false;

    this.url = '';
    this.protocol = '';
    this.isSecure = false;
    this.isValid = false;
    this.parsedURL = /** @type {ParsedURL} */ ({scheme: ''});
    this.documentURL = '';

    this.startTime = -1;
    /** @type {number} */
    this.endTime = -1;
    /** @type {number} */
    this.responseReceivedTime = -1;

    // Go read the comment on _updateTransferSizeForLightrider.
    this.transferSize = 0;
    this.resourceSize = 0;
    this.fromDiskCache = false;
    this.fromMemoryCache = false;

    /** @type {LightriderStatistics|undefined} Extra timing information available only when run in Lightrider. */
    this.lrStatistics = undefined;

    this.finished = false;
    this.requestMethod = '';
    this.statusCode = -1;
    /** @type {NetworkRequest|undefined} The network request that redirected to this one */
    this.redirectSource = undefined;
    /** @type {NetworkRequest|undefined} The network request that this one redirected to */
    this.redirectDestination = undefined;
    /** @type {NetworkRequest[]|undefined} The chain of network requests that redirected to this one */
    this.redirects = undefined;
    this.failed = false;
    this.localizedFailDescription = '';

    this.initiator = /** @type {LH.Crdp.Network.Initiator} */ ({type: 'other'});
    /** @type {LH.Crdp.Network.ResourceTiming|undefined} */
    this.timing = undefined;
    /** @type {LH.Crdp.Network.ResourceType|undefined} */
    this.resourceType = undefined;
    this.mimeType = '';
    /** @type {LH.Crdp.Network.ResourcePriority} */
    this.priority = 'Low';
    /** @type {NetworkRequest|undefined} */
    this.initiatorRequest = undefined;
    /** @type {HeaderEntry[]} */
    this.responseHeaders = [];
    /** @type {string} */
    this.responseHeadersText = '';

    this.fetchedViaServiceWorker = false;
    /** @type {string|undefined} */
    this.frameId = '';
    /**
     * @type {string|undefined}
     * Only set for child targets (OOPIFs). This is the sessionId of the protocol connection on
     * which this request was discovered. `undefined` means it came from the root.
     */
    this.sessionId = undefined;
    this.isLinkPreload = false;
  }

  /**
   * @return {boolean}
   */
  hasErrorStatusCode() {
    return this.statusCode >= 400;
  }

  /**
   * @param {NetworkRequest} initiator
   */
  setInitiatorRequest(initiator) {
    this.initiatorRequest = initiator;
  }

  /**
   * @param {LH.Crdp.Network.RequestWillBeSentEvent} data
   */
  onRequestWillBeSent(data) {
    this.requestId = data.requestId;
    let url;
    try {
      // try to construct the url and fill in request
      url = new URL(data.request.url);
    } catch (e) {
      // isValid left false, all other data is blank
      return;
    }
    this.url = data.request.url;
    this.documentURL = data.documentURL;
    this.parsedURL = {
      scheme: url.protocol.split(':')[0],
      // Intentional, DevTools uses different terminology
      host: url.hostname,
      securityOrigin: url.origin,
    };
    this.isSecure = SECURE_SCHEMES.includes(this.parsedURL.scheme);

    this.startTime = data.timestamp;

    this.requestMethod = data.request.method;

    this.initiator = data.initiator;
    this.resourceType = data.type && RESOURCE_TYPES[data.type];
    this.priority = data.request.initialPriority;

    this.frameId = data.frameId;
    this.isLinkPreload = data.initiator.type === 'preload' || !!data.request.isLinkPreload;
    this.isValid = true;
  }

  onRequestServedFromCache() {
    this.fromMemoryCache = true;
  }

  /**
   * @param {LH.Crdp.Network.ResponseReceivedEvent} data
   */
  onResponseReceived(data) {
    this._onResponse(data.response, data.timestamp, data.type);
    this.frameId = data.frameId;
  }

  /**
   * @param {LH.Crdp.Network.DataReceivedEvent} data
   */
  onDataReceived(data) {
    this.resourceSize += data.dataLength;
    if (data.encodedDataLength !== -1) {
      this.transferSize += data.encodedDataLength;
    }
  }

  /**
   * @param {LH.Crdp.Network.LoadingFinishedEvent} data
   */
  onLoadingFinished(data) {
    // On some requests DevTools can send duplicate events, prefer the first one for best timing data
    if (this.finished) return;

    this.finished = true;
    this.endTime = data.timestamp;
    if (data.encodedDataLength >= 0) {
      this.transferSize = data.encodedDataLength;
    }

    this._updateResponseReceivedTimeIfNecessary();
    this._updateTransferSizeForLightrider();
    this._updateTimingsForLightrider();
  }

  /**
   * @param {LH.Crdp.Network.LoadingFailedEvent} data
   */
  onLoadingFailed(data) {
    // On some requests DevTools can send duplicate events, prefer the first one for best timing data
    if (this.finished) return;

    this.finished = true;
    this.endTime = data.timestamp;

    this.failed = true;
    this.resourceType = data.type && RESOURCE_TYPES[data.type];
    this.localizedFailDescription = data.errorText;

    this._updateResponseReceivedTimeIfNecessary();
    this._updateTransferSizeForLightrider();
    this._updateTimingsForLightrider();
  }

  /**
   * @param {LH.Crdp.Network.ResourceChangedPriorityEvent} data
   */
  onResourceChangedPriority(data) {
    this.priority = data.newPriority;
  }

  /**
   * @param {LH.Crdp.Network.RequestWillBeSentEvent} data
   */
  onRedirectResponse(data) {
    if (!data.redirectResponse) throw new Error('Missing redirectResponse data');
    this._onResponse(data.redirectResponse, data.timestamp, data.type);
    this.resourceType = undefined;
    this.finished = true;
    this.endTime = data.timestamp;

    this._updateResponseReceivedTimeIfNecessary();
  }

  /**
   * @param {string=} sessionId
   */
  setSession(sessionId) {
    this.sessionId = sessionId;
  }

  /**
   * @param {LH.Crdp.Network.Response} response
   * @param {number} timestamp
   * @param {LH.Crdp.Network.ResponseReceivedEvent['type']=} resourceType
   */
  _onResponse(response, timestamp, resourceType) {
    this.url = response.url;

    this.connectionId = String(response.connectionId);
    this.connectionReused = response.connectionReused;

    if (response.protocol) this.protocol = response.protocol;

    this.responseReceivedTime = timestamp;

    this.transferSize = response.encodedDataLength;
    if (typeof response.fromDiskCache === 'boolean') this.fromDiskCache = response.fromDiskCache;

    this.statusCode = response.status;

    this.timing = response.timing;
    if (resourceType) this.resourceType = RESOURCE_TYPES[resourceType];
    this.mimeType = response.mimeType;
    this.responseHeadersText = response.headersText || '';
    this.responseHeaders = NetworkRequest._headersDictToHeadersArray(response.headers);

    this.fetchedViaServiceWorker = !!response.fromServiceWorker;

    if (this.fromMemoryCache) this.timing = undefined;
    if (this.timing) this._recomputeTimesWithResourceTiming(this.timing);
  }

  /**
   * Resolve differences between conflicting timing signals. Based on the property setters in DevTools.
   * @see https://github.com/ChromeDevTools/devtools-frontend/blob/56a99365197b85c24b732ac92b0ac70feed80179/front_end/sdk/NetworkRequest.js#L485-L502
   * @param {LH.Crdp.Network.ResourceTiming} timing
   */
  _recomputeTimesWithResourceTiming(timing) {
    // Don't recompute times if the data is invalid. RequestTime should always be a thread timestamp.
    // If we don't have receiveHeadersEnd, we really don't have more accurate data.
    if (timing.requestTime === 0 || timing.receiveHeadersEnd === -1) return;
    // Take startTime and responseReceivedTime from timing data for better accuracy.
    // Timing's requestTime is a baseline in seconds, rest of the numbers there are ticks in millis.
    this.startTime = timing.requestTime;
    const headersReceivedTime = timing.requestTime + timing.receiveHeadersEnd / 1000;
    if (!this.responseReceivedTime || this.responseReceivedTime < 0) {
      this.responseReceivedTime = headersReceivedTime;
    }

    this.responseReceivedTime = Math.min(this.responseReceivedTime, headersReceivedTime);
    this.responseReceivedTime = Math.max(this.responseReceivedTime, this.startTime);
    // We're only at responseReceived (_onResponse) at this point.
    // This endTime may be redefined again after onLoading is done.
    this.endTime = Math.max(this.endTime, this.responseReceivedTime);
  }

  /**
   * Update responseReceivedTime to the endTime if endTime is earlier.
   * A response can't be received after the entire request finished.
   */
  _updateResponseReceivedTimeIfNecessary() {
    this.responseReceivedTime = Math.min(this.endTime, this.responseReceivedTime);
  }

  /**
   * LR loses transfer size information, but passes it in the 'X-TotalFetchedSize' header.
   * 'X-TotalFetchedSize' is the canonical transfer size in LR. Nothing should supersede it.
   *
   * The total length of the encoded data is spread out among multiple events. The sum of the
   * values in onResponseReceived and all the onDataReceived events typically equals the value
   * seen on the onLoadingFinished event. In <1% of cases we see the values differ. As we process
   * onResponseReceived and onDataReceived we accumulate the total encodedDataLength. When we
   * process onLoadingFinished, we override the accumulated total. We do this so that if the
   * request is aborted or fails, we still get a value via the accumulation.
   *
   * In Lightrider, due to instrumentation limitations, our values for encodedDataLength are bogus
   * and not valid. However the resource's true encodedDataLength/transferSize is shared via a
   * special response header, X-TotalFetchedSize. In this situation, we read this value from
   * responseReceived, use it for the transferSize and ignore the encodedDataLength values in
   * both dataReceived and loadingFinished.
   */
  _updateTransferSizeForLightrider() {
    // Bail if we aren't in Lightrider.
    if (!global.isLightrider) return;

    const totalFetchedSize = this.responseHeaders.find(item => item.name === HEADER_FETCHED_SIZE);
    // Bail if the header was missing.
    if (!totalFetchedSize) return;
    const floatValue = parseFloat(totalFetchedSize.value);
    // Bail if the header cannot be parsed.
    if (isNaN(floatValue)) return;
    this.transferSize = floatValue;
  }

  /**
   * LR gets additional, accurate timing information from its underlying fetch infrastructure.  This
   * is passed in via X-Headers similar to 'X-TotalFetchedSize'.
   */
  _updateTimingsForLightrider() {
    // Bail if we aren't in Lightrider.
    if (!global.isLightrider) return;

    // For more info on timing nomenclature: https://www.w3.org/TR/resource-timing-2/#processing-model

    //    StartTime
    //    | ConnectStart
    //    | |     SSLStart  SSLEnd
    //    | |     |         | ConnectEnd
    //    | |     |         | | SendStart/End   ReceiveHeadersEnd
    //    | |     |         | | |               |                EndTime
    //    ▼ ▼     ▼         ▼ ▼ ▼               ▼                ▼
    //    [ [TCP  [   SSL   ] ] [   Request   ] [   Response   ] ]
    //    ▲ ▲     ▲         ▲ ▲ ▲             ▲ ▲              ▲ ▲
    //    | |     '-SSLMs---' | '-requestMs---' '-responseMs---' |
    //    | '----TCPMs--------'                                  |
    //    |                                                      |
    //    '------------------------TotalMs-----------------------'

    const totalHeader = this.responseHeaders.find(item => item.name === HEADER_TOTAL);
    // Bail if there was no totalTime.
    if (!totalHeader) return;

    const totalMs = parseInt(totalHeader.value);
    const TCPMsHeader = this.responseHeaders.find(item => item.name === HEADER_TCP);
    const SSLMsHeader = this.responseHeaders.find(item => item.name === HEADER_SSL);
    const requestMsHeader = this.responseHeaders.find(item => item.name === HEADER_REQ);
    const responseMsHeader = this.responseHeaders.find(item => item.name === HEADER_RES);

    // Make sure all times are initialized and are non-negative.
    const TCPMs = TCPMsHeader ? Math.max(0, parseInt(TCPMsHeader.value)) : 0;
    const SSLMs = SSLMsHeader ? Math.max(0, parseInt(SSLMsHeader.value)) : 0;
    const requestMs = requestMsHeader ? Math.max(0, parseInt(requestMsHeader.value)) : 0;
    const responseMs = responseMsHeader ? Math.max(0, parseInt(responseMsHeader.value)) : 0;

    // Bail if the timings don't add up.
    if (TCPMs + requestMs + responseMs !== totalMs) {
      return;
    }

    // Bail if SSL time is > TCP time.
    if (SSLMs > TCPMs) {
      return;
    }

    this.lrStatistics = {
      endTimeDeltaMs: (this.endTime - (this.startTime + (totalMs / 1000))) * 1000,
      TCPMs: TCPMs,
      requestMs: requestMs,
      responseMs: responseMs,
    };
  }

  /**
   * Convert the requestId to backend-version by removing the `:redirect` portion
   *
   * @param {string} requestId
   * @return {string}
   */
  static getRequestIdForBackend(requestId) {
    return requestId.replace(/(:redirect)+$/, '');
  }

  /**
   * Based on DevTools NetworkManager.
   * @see https://github.com/ChromeDevTools/devtools-frontend/blob/3415ee28e86a3f4bcc2e15b652d22069938df3a6/front_end/sdk/NetworkManager.js#L285-L297
   * @param {LH.Crdp.Network.Headers} headersDict
   * @return {Array<HeaderEntry>}
   */
  static _headersDictToHeadersArray(headersDict) {
    const result = [];
    for (const name of Object.keys(headersDict)) {
      const values = headersDict[name].split('\n');
      for (let i = 0; i < values.length; ++i) {
        result.push({name: name, value: values[i]});
      }
    }
    return result;
  }

  static get TYPES() {
    return RESOURCE_TYPES;
  }
}

NetworkRequest.HEADER_TCP = HEADER_TCP;
NetworkRequest.HEADER_SSL = HEADER_SSL;
NetworkRequest.HEADER_REQ = HEADER_REQ;
NetworkRequest.HEADER_RES = HEADER_RES;
NetworkRequest.HEADER_TOTAL = HEADER_TOTAL;
NetworkRequest.HEADER_FETCHED_SIZE = HEADER_FETCHED_SIZE;

module.exports = NetworkRequest;
