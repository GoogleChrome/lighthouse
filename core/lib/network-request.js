/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Fills most of the role of NetworkManager and NetworkRequest classes from DevTools.
 * @see https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/sdk/NetworkRequest.js
 * @see https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/sdk/NetworkManager.js

 A detailed overview of the Chromium networking layer can be found here:
    https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/docs/Network-Timings.svg

  Below is a simplified model.

  DevTools box-whisker

    |-------[xxxxxXXXXXX]-|
       (1)    (2)    (3) (4)

  (1) leading whisker

      Covers various stages:

      - Queuing (delta between renderer knowing about request and network manager knowing about it)
      - DNS
      - Connection setup cost (TCP, TLS, SSL, etc.)

      CDP: left whisker edge is Network.requestWillBeSent timestamp

  (2) light shaded region

      browser network manager has initiated the request, hasn't recieved any bytes back yet
      Note: even with early-hint response, only the "real" response is considered here

      CDP: Network.requestWillBeSentExtraInfo timing.requestTime + timing.sendStart

  (3) dark shaded region

      browser network manager has recieved the very first header byte

      CDP:   Network.requestWillBeSentExtraInfo timing.requestTime + timing.recievedHeadersEnd
      CDP:   (right edge of box) Network.finished/Network.failed timestamp
      Trace: ResourceFinish.finishedTime

  (4) trailing whisker

      Marks time when render process main thread is available to use the resource. Could be long
      if main thread is busy. Currently don't use this anywhere.

      Trace: ResourceFinish.ts
 */

import * as LH from '../../types/lh.js';
import * as Lantern from './lantern/lantern.js';
import UrlUtils from './url-utils.js';

// Lightrider X-Header names for timing information.
// See: _updateTransferSizeForLightrider and _updateTimingsForLightrider.
const HEADER_TCP = 'X-TCPMs'; // Note: this should have been called something like ConnectMs, as it includes SSL.
const HEADER_SSL = 'X-SSLMs';
const HEADER_REQ = 'X-RequestMs';
const HEADER_RES = 'X-ResponseMs';
const HEADER_TOTAL = 'X-TotalMs';
const HEADER_FETCHED_SIZE = 'X-TotalFetchedSize';
const HEADER_PROTOCOL_IS_H2 = 'X-ProtocolIsH2';

/**
 * @typedef HeaderEntry
 * @property {string} name
 * @property {string} value
 */

/**
 * @typedef ParsedURL
 * @property {string} scheme Equivalent to a `new URL(url).protocol` BUT w/o the trailing colon (:)
 * @property {string} host Equivalent to a `new URL(url).hostname`
 * @property {string} securityOrigin
 */

/**
 * @typedef LightriderStatistics
 * @property {number} endTimeDeltaMs The difference in networkEndTime between the observed Lighthouse networkEndTime and Lightrider's derived networkEndTime.
 * @property {number} TCPMs The time spent making a TCP connection (connect + SSL). Note: this is poorly named.
 * @property {number} requestMs The time spent requesting a resource from a remote server, we use this to approx RTT. Note: this is poorly names, it really should be "server response time".
 * @property {number} responseMs Time to receive the entire response payload starting the clock on receiving the first fragment (first non-header byte).
 */

/** @type {LH.Util.SelfMap<LH.Crdp.Network.ResourceType>} */
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
  Preflight: 'Preflight',
  CSPViolationReport: 'CSPViolationReport',
  Prefetch: 'Prefetch',
};

class NetworkRequest {
  constructor() {
    this.requestId = '';
    this.connectionId = 0;
    this.connectionReused = false;

    this.url = '';
    this.protocol = '';
    this.isSecure = false;
    this.isValid = false;
    this.parsedURL = /** @type {ParsedURL} */ ({scheme: ''});
    this.documentURL = '';

    /** When the renderer process initially discovers a network request, in milliseconds. */
    this.rendererStartTime = -1;
    /**
     * When the network service is about to handle a request, ie. just before going to the
     * HTTP cache or going to the network for DNS/connection setup, in milliseconds.
     */
    this.networkRequestTime = -1;
    /**
     * When the last byte of the response headers is received, in milliseconds.
     * Equal to networkRequestTime if no data is recieved over the
     * network (ex: cached requests or data urls).
     */
    this.responseHeadersEndTime = -1;
    /** When the last byte of the response body is received, in milliseconds. */
    this.networkEndTime = -1;

    // Go read the comment on _updateTransferSizeForLightrider.
    this.transferSize = 0;
    this.responseHeadersTransferSize = 0;
    this.resourceSize = 0;
    this.fromDiskCache = false;
    this.fromMemoryCache = false;
    this.fromPrefetchCache = false;

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

    /** @type {LH.Crdp.Network.Initiator} */
    this.initiator = {type: 'other'};
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
    /** @type {string|undefined} */
    this.sessionId = undefined;
    /** @type {LH.Protocol.TargetType|undefined} */
    this.sessionTargetType = undefined;
    this.fromWorker = false;
    this.isLinkPreload = false;
  }

  /**
   * @return {boolean}
   */
  hasErrorStatusCode() {
    return this.statusCode >= 400;
  }

  /**
   * @param {NetworkRequest} initiatorRequest
   */
  setInitiatorRequest(initiatorRequest) {
    this.initiatorRequest = initiatorRequest;
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
    this.isSecure = UrlUtils.isSecureScheme(this.parsedURL.scheme);

    this.rendererStartTime = data.timestamp * 1000;
    // These are expected to be overridden with better value in `_recomputeTimesWithResourceTiming`.
    this.networkRequestTime = this.rendererStartTime;
    this.responseHeadersEndTime = this.rendererStartTime;

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
    this._updateProtocolForLightrider();
    this.frameId = data.frameId;
  }

  /**
   * @param {LH.Crdp.Network.ResponseReceivedExtraInfoEvent} data
   */
  onResponseReceivedExtraInfo(data) {
    this.responseHeadersText = data.headersText || '';
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
    this.networkEndTime = data.timestamp * 1000;
    if (data.encodedDataLength >= 0) {
      this.transferSize = data.encodedDataLength;
    }

    this._updateResponseHeadersEndTimeIfNecessary();
    this._backfillReceiveHeaderStartTiming();
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
    this.networkEndTime = data.timestamp * 1000;

    this.failed = true;
    this.resourceType = data.type && RESOURCE_TYPES[data.type];
    this.localizedFailDescription = data.errorText;

    this._updateResponseHeadersEndTimeIfNecessary();
    this._backfillReceiveHeaderStartTiming();
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
    this.networkEndTime = data.timestamp * 1000;

    this._updateResponseHeadersEndTimeIfNecessary();
    this._backfillReceiveHeaderStartTiming();
  }

  /**
   * @param {string|undefined} sessionId
   */
  setSession(sessionId) {
    this.sessionId = sessionId;
  }

  get isOutOfProcessIframe() {
    return this.sessionTargetType === 'iframe';
  }

  /**
   * @param {LH.Crdp.Network.Response} response
   * @param {number} timestamp in seconds
   * @param {LH.Crdp.Network.ResponseReceivedEvent['type']=} resourceType
   */
  _onResponse(response, timestamp, resourceType) {
    this.url = response.url;

    this.connectionId = response.connectionId;
    this.connectionReused = response.connectionReused;

    if (response.protocol) this.protocol = response.protocol;

    this.responseTimestamp = timestamp * 1000;

    this.transferSize = response.encodedDataLength;
    this.responseHeadersTransferSize = response.encodedDataLength;
    if (typeof response.fromDiskCache === 'boolean') this.fromDiskCache = response.fromDiskCache;
    if (typeof response.fromPrefetchCache === 'boolean') {
      this.fromPrefetchCache = response.fromPrefetchCache;
    }

    this.statusCode = response.status;

    this.timing = response.timing;
    if (resourceType) this.resourceType = RESOURCE_TYPES[resourceType];
    this.mimeType = response.mimeType;
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
    if (timing.requestTime === -1 || timing.receiveHeadersEnd === -1) return;

    // Take networkRequestTime and responseHeadersEndTime from timing data for better accuracy.
    // Before this, networkRequestTime and responseHeadersEndTime were set to bogus values based on
    // CDP event timestamps, though they should be somewhat close to the network timings.
    // Note: requests served from cache never run this function, so they use the "bogus" values.

    // Timing's requestTime is a baseline in seconds, rest of the numbers there are ticks in millis.
    // See https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/docs/Network-Timings.svg
    this.networkRequestTime = timing.requestTime * 1000;
    const headersReceivedTime = this.networkRequestTime + timing.receiveHeadersEnd;

    // Update this.responseHeadersEndTime. All timing values from the netstack (timing) are well-ordered, and
    // so are the timestamps from CDP (which this.responseHeadersEndTime belongs to). It shouldn't be possible
    // that this timing from the netstack is greater than the onResponse timestamp, but just to ensure proper order
    // is maintained we bound the new timing by the network request time and the response timestamp.
    this.responseHeadersEndTime = headersReceivedTime;
    if (this.responseTimestamp !== undefined) {
      this.responseHeadersEndTime = Math.min(this.responseHeadersEndTime, this.responseTimestamp);
    }
    this.responseHeadersEndTime = Math.max(this.responseHeadersEndTime, this.networkRequestTime);

    // We're only at responseReceived (_onResponse) at this point.
    // This networkEndTime may be redefined again after onLoading is done.
    this.networkEndTime = Math.max(this.networkEndTime, this.responseHeadersEndTime);
  }

  /**
   * Update responseHeadersEndTime to the networkEndTime if networkEndTime is earlier.
   * A response can't be received after the entire request finished.
   */
  _updateResponseHeadersEndTimeIfNecessary() {
    this.responseHeadersEndTime = Math.min(this.networkEndTime, this.responseHeadersEndTime);
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
   * LR loses protocol information.
   */
  _updateProtocolForLightrider() {
    // Bail if we aren't in Lightrider.
    if (!global.isLightrider) return;

    if (this.responseHeaders.some(item => item.name === HEADER_PROTOCOL_IS_H2)) {
      this.protocol = 'h2';
    }
  }

  /**
   * TODO(compat): remove M116.
   * `timing.receiveHeadersStart` was added recently, and will be in M116. Until then,
   * set it to receiveHeadersEnd, which is close enough, to allow consumers of NetworkRequest
   * to use the new field without accounting for this backcompat.
   */
  _backfillReceiveHeaderStartTiming() {
    // Do nothing if a value is already present!
    if (!this.timing || this.timing.receiveHeadersStart !== undefined) return;

    this.timing.receiveHeadersStart = this.timing.receiveHeadersEnd;
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

    let totalMs = parseInt(totalHeader.value);
    const TCPMsHeader = this.responseHeaders.find(item => item.name === HEADER_TCP);
    const SSLMsHeader = this.responseHeaders.find(item => item.name === HEADER_SSL);
    const requestMsHeader = this.responseHeaders.find(item => item.name === HEADER_REQ);
    const responseMsHeader = this.responseHeaders.find(item => item.name === HEADER_RES);

    // Make sure all times are initialized and are non-negative.
    const TCPMs = TCPMsHeader ? Math.max(0, parseInt(TCPMsHeader.value)) : 0;
    // This is missing for h2 requests, but present for h1. See b/283843975
    const SSLMs = SSLMsHeader ? Math.max(0, parseInt(SSLMsHeader.value)) : 0;
    const requestMs = requestMsHeader ? Math.max(0, parseInt(requestMsHeader.value)) : 0;
    const responseMs = responseMsHeader ? Math.max(0, parseInt(responseMsHeader.value)) : 0;

    if (Number.isNaN(TCPMs + requestMs + responseMs + totalMs)) {
      return;
    }

    // If things don't add up, tweak the total a bit.
    if (TCPMs + requestMs + responseMs !== totalMs) {
      const delta = Math.abs(TCPMs + requestMs + responseMs - totalMs);
      // We didn't see total being more than 5ms less than the total of the components.
      // Allow some discrepancy in the timing, but not too much.
      if (delta >= 25) return;

      totalMs = TCPMs + requestMs + responseMs;
    }

    // Bail if SSL time is > TCP time.
    if (SSLMs > TCPMs) {
      return;
    }

    this.lrStatistics = {
      endTimeDeltaMs: this.networkEndTime - (this.networkRequestTime + totalMs),
      TCPMs: TCPMs,
      requestMs: requestMs,
      responseMs: responseMs,
    };
    this.serverResponseTime = responseMs;
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

  /**
   * @param {NetworkRequest} record
   * @return {Lantern.Types.NetworkRequest<NetworkRequest>}
   */
  static asLanternNetworkRequest(record) {
    // In LR, network records are missing connection timing, but we've smuggled it in via headers.
    let timing = record.timing;
    let serverResponseTime;
    if (global.isLightrider && record.lrStatistics) {
      if (record.protocol.startsWith('h3')) {
        // @ts-expect-error We don't need all the properties set.
        timing = {
          connectStart: 0,
          connectEnd: record.lrStatistics.TCPMs,
        };
      } else {
        // @ts-expect-error We don't need all the properties set.
        timing = {
          connectStart: 0,
          sslStart: record.lrStatistics.TCPMs / 2,
          connectEnd: record.lrStatistics.TCPMs,
          sslEnd: record.lrStatistics.TCPMs,
        };

        // Lightrider does not have timings for sendEnd, but we do have this timing which should be
        // close to the response time.
        serverResponseTime = record.lrStatistics.requestMs;
      }
    }

    record.fromWorker = record.sessionTargetType === 'worker';

    return {
      rawRequest: record,
      ...record,
      timing,
      serverResponseTime,
    };
  }

  /**
   * @param {Pick<NetworkRequest, 'protocol'|'parsedURL'>} record
   * @return {boolean}
   */
  static isNonNetworkRequest(record) {
    // The 'protocol' field in devtools a string more like a `scheme`
    return UrlUtils.isNonNetworkProtocol(record.protocol) ||
      // But `protocol` can fail to be populated if the request fails, so fallback to scheme.
      UrlUtils.isNonNetworkProtocol(record.parsedURL.scheme);
  }

  /**
   * Technically there's not alignment on URLs that create "secure connections" vs "secure contexts"
   * https://github.com/GoogleChrome/lighthouse/pull/11766#discussion_r582340683
   * But for our purposes, we don't need to worry too much.
   * @param {NetworkRequest} record
   * @return {boolean}
   */
  static isSecureRequest(record) {
    return UrlUtils.isSecureScheme(record.parsedURL.scheme) ||
        UrlUtils.isSecureScheme(record.protocol) ||
        UrlUtils.isLikeLocalhost(record.parsedURL.host) ||
        NetworkRequest.isHstsRequest(record);
  }

  /**
   * Returns whether the network request was an HSTS redirect request.
   * @param {NetworkRequest} record
   * @return {boolean}
   */
  static isHstsRequest(record) {
    const destination = record.redirectDestination;
    if (!destination) return false;

    const reasonHeader = record.responseHeaders
      .find(header => header.name === 'Non-Authoritative-Reason');
    const reason = reasonHeader?.value;
    return reason === 'HSTS' && NetworkRequest.isSecureRequest(destination);
  }

  /**
   * Returns whether the network request was sent encoded.
   * @param {NetworkRequest} record
   * @return {boolean}
   */
  static isContentEncoded(record) {
    // FYI: older devtools logs (like our test fixtures) seems to be lower case, while modern logs
    // are Cased-Like-This.
    const patterns = global.isLightrider ? [
      /^x-original-content-encoding$/i,
    ] : [
      /^content-encoding$/i,
      /^x-content-encoding-over-network$/i,
    ];
    const compressionTypes = ['gzip', 'br', 'deflate', 'zstd'];
    return record.responseHeaders.some(header =>
      patterns.some(p => header.name.match(p)) && compressionTypes.includes(header.value)
    );
  }

  /**
   * Resource size is almost always the right one to be using because of the below:
   *     `transferSize = resourceSize + headers.length`.
   * HOWEVER, there are some cases where an image is compressed again over the network and transfer size
   * is smaller (see https://github.com/GoogleChrome/lighthouse/pull/4968).
   * Use the min of the two numbers to be safe.
   * `tranferSize` of cached records is 0
   * @param {NetworkRequest} networkRecord
   * @return {number}
   */
  static getResourceSizeOnNetwork(networkRecord) {
    return Math.min(networkRecord.resourceSize || 0, networkRecord.transferSize || Infinity);
  }
}

NetworkRequest.HEADER_TCP = HEADER_TCP;
NetworkRequest.HEADER_SSL = HEADER_SSL;
NetworkRequest.HEADER_REQ = HEADER_REQ;
NetworkRequest.HEADER_RES = HEADER_RES;
NetworkRequest.HEADER_TOTAL = HEADER_TOTAL;
NetworkRequest.HEADER_FETCHED_SIZE = HEADER_FETCHED_SIZE;
NetworkRequest.HEADER_PROTOCOL_IS_H2 = HEADER_PROTOCOL_IS_H2;

export {NetworkRequest, RESOURCE_TYPES};
