/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lantern.js';
import UrlUtils from '../../url-utils.js';

const INITIAL_CWD = 14 * 1024;

// Assume that 40% of TTFB was server response time by default for static assets
const DEFAULT_SERVER_RESPONSE_PERCENTAGE = 0.4;

/**
 * For certain resource types, server response time takes up a greater percentage of TTFB (dynamic
 * assets like HTML documents, XHR/API calls, etc)
 * @type {Partial<Record<Lantern.ResourceType, number>>}
 */
const SERVER_RESPONSE_PERCENTAGE_OF_TTFB = {
  Document: 0.9,
  XHR: 0.9,
  Fetch: 0.9,
};

class NetworkAnalyzer {
  /**
   * @return {string}
   */
  static get SUMMARY() {
    return '__SUMMARY__';
  }

  /**
   * @param {Lantern.NetworkRequest[]} records
   * @return {Map<string, Lantern.NetworkRequest[]>}
   */
  static groupByOrigin(records) {
    const grouped = new Map();
    records.forEach(item => {
      const key = item.parsedURL.securityOrigin;
      const group = grouped.get(key) || [];
      group.push(item);
      grouped.set(key, group);
    });
    return grouped;
  }

  /**
   * @param {number[]} values
   * @return {Summary}
   */
  static getSummary(values) {
    values.sort((a, b) => a - b);

    let median;
    if (values.length === 0) {
      median = values[0];
    } else if (values.length % 2 === 0) {
      const a = values[Math.floor((values.length - 1) / 2)];
      const b = values[Math.floor((values.length - 1) / 2) + 1];
      median = (a + b) / 2;
    } else {
      median = values[Math.floor((values.length - 1) / 2)];
    }

    return {
      min: values[0],
      max: values[values.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      median,
    };
  }

  /**
   * @param {Map<string,number[]>} values
   * @return {Map<string, Summary>}
   */
  static summarize(values) {
    const summaryByKey = new Map();
    const allEstimates = [];
    for (const [key, estimates] of values) {
      summaryByKey.set(key, NetworkAnalyzer.getSummary(estimates));
      allEstimates.push(...estimates);
    }

    summaryByKey.set(NetworkAnalyzer.SUMMARY, NetworkAnalyzer.getSummary(allEstimates));
    return summaryByKey;
  }

  /** @typedef {{request: Lantern.NetworkRequest, timing: Lantern.ResourceTiming, connectionReused?: boolean}} RequestInfo */

  /**
   * @param {Lantern.NetworkRequest[]} requests
   * @param {(e: RequestInfo) => number | number[] | undefined} iteratee
   * @return {Map<string, number[]>}
   */
  static _estimateValueByOrigin(requests, iteratee) {
    const connectionWasReused = NetworkAnalyzer.estimateIfConnectionWasReused(requests);
    const groupedByOrigin = NetworkAnalyzer.groupByOrigin(requests);

    const estimates = new Map();
    for (const [origin, originRequests] of groupedByOrigin.entries()) {
      /** @type {number[]} */
      let originEstimates = [];

      for (const request of originRequests) {
        const timing = request.timing;
        if (!timing) continue;

        const value = iteratee({
          request,
          timing,
          connectionReused: connectionWasReused.get(request.requestId),
        });
        if (typeof value !== 'undefined') {
          originEstimates = originEstimates.concat(value);
        }
      }

      if (!originEstimates.length) continue;
      estimates.set(origin, originEstimates);
    }

    return estimates;
  }

  /**
   * Estimates the observed RTT to each origin based on how long the connection setup.
   * For h1 and h2, this could includes two estimates - one for the TCP handshake, another for
   * SSL negotiation.
   * For h3, we get only one estimate since QUIC establishes a secure connection in a
   * single handshake.
   * This is the most accurate and preferred method of measurement when the data is available.
   *
   * @param {RequestInfo} info
   * @return {number[]|number|undefined}
   */
  static _estimateRTTViaConnectionTiming(info) {
    const {timing, connectionReused, request} = info;
    if (connectionReused) return;

    const {connectStart, sslStart, sslEnd, connectEnd} = timing;
    if (connectEnd >= 0 && connectStart >= 0 && request.protocol.startsWith('h3')) {
      // These values are equal to sslStart and sslEnd for h3.
      return connectEnd - connectStart;
    } else if (sslStart >= 0 && sslEnd >= 0 && sslStart !== connectStart) {
      // SSL can also be more than 1 RT but assume False Start was used.
      return [connectEnd - sslStart, sslStart - connectStart];
    } else if (connectStart >= 0 && connectEnd >= 0) {
      return connectEnd - connectStart;
    }
  }

  /**
   * Estimates the observed RTT to each origin based on how long a download took on a fresh connection.
   * NOTE: this will tend to overestimate the actual RTT quite significantly as the download can be
   * slow for other reasons as well such as bandwidth constraints.
   *
   * @param {RequestInfo} info
   * @return {number|undefined}
   */
  static _estimateRTTViaDownloadTiming(info) {
    const {timing, connectionReused, request} = info;
    if (connectionReused) return;

    // Only look at downloads that went past the initial congestion window
    if (request.transferSize <= INITIAL_CWD) return;
    if (!Number.isFinite(timing.receiveHeadersEnd) || timing.receiveHeadersEnd < 0) return;

    // Compute the amount of time downloading everything after the first congestion window took
    const totalTime = request.networkEndTime - request.networkRequestTime;
    const downloadTimeAfterFirstByte = totalTime - timing.receiveHeadersEnd;
    const numberOfRoundTrips = Math.log2(request.transferSize / INITIAL_CWD);

    // Ignore requests that required a high number of round trips since bandwidth starts to play
    // a larger role than latency
    if (numberOfRoundTrips > 5) return;

    return downloadTimeAfterFirstByte / numberOfRoundTrips;
  }

  /**
   * Estimates the observed RTT to each origin based on how long it took until Chrome could
   * start sending the actual request when a new connection was required.
   * NOTE: this will tend to overestimate the actual RTT as the request can be delayed for other
   * reasons as well such as more SSL handshakes if TLS False Start is not enabled.
   *
   * @param {RequestInfo} info
   * @return {number|undefined}
   */
  static _estimateRTTViaSendStartTiming(info) {
    const {timing, connectionReused, request} = info;
    if (connectionReused) return;

    if (!Number.isFinite(timing.sendStart) || timing.sendStart < 0) return;

    // Assume everything before sendStart was just DNS + (SSL)? + TCP handshake
    // 1 RT for DNS, 1 RT (maybe) for SSL, 1 RT for TCP
    let roundTrips = 1;
    if (!request.protocol.startsWith('h3')) roundTrips += 1; // TCP
    if (request.parsedURL.scheme === 'https') roundTrips += 1;
    return timing.sendStart / roundTrips;
  }

  /**
   * Estimates the observed RTT to each origin based on how long it took until Chrome received the
   * headers of the response (~TTFB).
   * NOTE: this is the most inaccurate way to estimate the RTT, but in some environments it's all
   * we have access to :(
   *
   * @param {RequestInfo} info
   * @return {number|undefined}
   */
  static _estimateRTTViaHeadersEndTiming(info) {
    const {timing, connectionReused, request} = info;
    if (!Number.isFinite(timing.receiveHeadersEnd) || timing.receiveHeadersEnd < 0) return;
    if (!request.resourceType) return;

    const serverResponseTimePercentage =
      SERVER_RESPONSE_PERCENTAGE_OF_TTFB[request.resourceType] ||
      DEFAULT_SERVER_RESPONSE_PERCENTAGE;
    const estimatedServerResponseTime = timing.receiveHeadersEnd * serverResponseTimePercentage;

    // When connection was reused...
    // TTFB = 1 RT for request + server response time
    let roundTrips = 1;

    // When connection was fresh...
    // TTFB = DNS + (SSL)? + TCP handshake + 1 RT for request + server response time
    if (!connectionReused) {
      roundTrips += 1; // DNS
      if (!request.protocol.startsWith('h3')) roundTrips += 1; // TCP
      if (request.parsedURL.scheme === 'https') roundTrips += 1; // SSL
    }

    // subtract out our estimated server response time
    return Math.max((timing.receiveHeadersEnd - estimatedServerResponseTime) / roundTrips, 3);
  }

  /**
   * Given the RTT to each origin, estimates the observed server response times.
   *
   * @param {Lantern.NetworkRequest[]} records
   * @param {Map<string, number>} rttByOrigin
   * @return {Map<string, number[]>}
   */
  static _estimateResponseTimeByOrigin(records, rttByOrigin) {
    return NetworkAnalyzer._estimateValueByOrigin(records, ({request, timing}) => {
      if (request.serverResponseTime !== undefined) return request.serverResponseTime;

      if (!Number.isFinite(timing.receiveHeadersEnd) || timing.receiveHeadersEnd < 0) return;
      if (!Number.isFinite(timing.sendEnd) || timing.sendEnd < 0) return;

      const ttfb = timing.receiveHeadersEnd - timing.sendEnd;
      const origin = request.parsedURL.securityOrigin;
      const rtt = rttByOrigin.get(origin) || rttByOrigin.get(NetworkAnalyzer.SUMMARY) || 0;
      return Math.max(ttfb - rtt, 0);
    });
  }

  /**
   * @param {Lantern.NetworkRequest[]} requests
   * @return {boolean}
   */
  static canTrustConnectionInformation(requests) {
    const connectionIdWasStarted = new Map();
    for (const request of requests) {
      const started = connectionIdWasStarted.get(request.connectionId) || !request.connectionReused;
      connectionIdWasStarted.set(request.connectionId, started);
    }

    // We probably can't trust the network information if all the connection IDs were the same
    if (connectionIdWasStarted.size <= 1) return false;
    // Or if there were connections that were always reused (a connection had to have started at some point)
    return Array.from(connectionIdWasStarted.values()).every(started => started);
  }

  /**
   * Returns a map of requestId -> connectionReused, estimating the information if the information
   * available in the records themselves appears untrustworthy.
   *
   * @param {Lantern.NetworkRequest[]} records
   * @param {{forceCoarseEstimates: boolean}} [options]
   * @return {Map<string, boolean>}
   */
  static estimateIfConnectionWasReused(records, options) {
    const {forceCoarseEstimates = false} = options || {};

    // Check if we can trust the connection information coming from the protocol
    if (!forceCoarseEstimates && NetworkAnalyzer.canTrustConnectionInformation(records)) {
      return new Map(records.map(request => [request.requestId, !!request.connectionReused]));
    }

    // Otherwise we're on our own, a request may not have needed a fresh connection if...
    //   - It was not the first request to the domain
    //   - It was H2
    //   - It was after the first request to the domain ended
    const connectionWasReused = new Map();
    const groupedByOrigin = NetworkAnalyzer.groupByOrigin(records);
    for (const [_, originRecords] of groupedByOrigin.entries()) {
      const earliestReusePossible = originRecords
        .map(request => request.networkEndTime)
        .reduce((a, b) => Math.min(a, b), Infinity);

      for (const request of originRecords) {
        connectionWasReused.set(
          request.requestId,
          request.networkRequestTime >= earliestReusePossible || request.protocol === 'h2'
        );
      }

      const firstRecord = originRecords.reduce((a, b) => {
        return a.networkRequestTime > b.networkRequestTime ? b : a;
      });
      connectionWasReused.set(firstRecord.requestId, false);
    }

    return connectionWasReused;
  }

  /**
   * Estimates the RTT to each origin by examining observed network timing information.
   * Attempts to use the most accurate information first and falls back to coarser estimates when it
   * is unavailable.
   *
   * @param {Lantern.NetworkRequest[]} records
   * @param {RTTEstimateOptions} [options]
   * @return {Map<string, Summary>}
   */
  static estimateRTTByOrigin(records, options) {
    const {
      forceCoarseEstimates = false,
      // coarse estimates include lots of extra time and noise
      // multiply by some factor to deflate the estimates a bit.
      coarseEstimateMultiplier = 0.3,
      useDownloadEstimates = true,
      useSendStartEstimates = true,
      useHeadersEndEstimates = true,
    } = options || {};

    const connectionWasReused = NetworkAnalyzer.estimateIfConnectionWasReused(records);
    const groupedByOrigin = NetworkAnalyzer.groupByOrigin(records);

    const estimatesByOrigin = new Map();
    for (const [origin, originRequests] of groupedByOrigin.entries()) {
      /** @type {number[]} */
      const originEstimates = [];

      /**
       * @param {(e: RequestInfo) => number[]|number|undefined} estimator
       */
      // eslint-disable-next-line no-inner-declarations
      function collectEstimates(estimator, multiplier = 1) {
        for (const request of originRequests) {
          const timing = request.timing;
          if (!timing) continue;

          const estimates = estimator({
            request,
            timing,
            connectionReused: connectionWasReused.get(request.requestId),
          });
          if (estimates === undefined) continue;

          if (!Array.isArray(estimates)) {
            originEstimates.push(estimates * multiplier);
          } else {
            originEstimates.push(...estimates.map(e => e * multiplier));
          }
        }
      }

      if (!forceCoarseEstimates) {
        collectEstimates(this._estimateRTTViaConnectionTiming);
      }

      // Connection timing can be missing for a few reasons:
      // - Origin was preconnected, which we don't have instrumentation for.
      // - Trace began recording after a connection has already been established (for example, in timespan mode)
      // - Perhaps Chrome established a connection already in the background (service worker? Just guessing here)
      // - Not provided in LR netstack.
      if (!originEstimates.length) {
        if (useDownloadEstimates) {
          collectEstimates(this._estimateRTTViaDownloadTiming, coarseEstimateMultiplier);
        }
        if (useSendStartEstimates) {
          collectEstimates(this._estimateRTTViaSendStartTiming, coarseEstimateMultiplier);
        }
        if (useHeadersEndEstimates) {
          collectEstimates(this._estimateRTTViaHeadersEndTiming, coarseEstimateMultiplier);
        }
      }

      if (originEstimates.length) {
        estimatesByOrigin.set(origin, originEstimates);
      }
    }

    if (!estimatesByOrigin.size) throw new Error('No timing information available');
    return NetworkAnalyzer.summarize(estimatesByOrigin);
  }

  /**
   * Estimates the server response time of each origin. RTT times can be passed in or will be
   * estimated automatically if not provided.
   *
   * @param {Lantern.NetworkRequest[]} records
   * @param {RTTEstimateOptions & {rttByOrigin?: Map<string, number>}} [options]
   * @return {Map<string, Summary>}
   */
  static estimateServerResponseTimeByOrigin(records, options) {
    let rttByOrigin = (options || {}).rttByOrigin;
    if (!rttByOrigin) {
      /** @type {Map<string, number>} */
      rttByOrigin = new Map();

      const rttSummaryByOrigin = NetworkAnalyzer.estimateRTTByOrigin(records, options);
      for (const [origin, summary] of rttSummaryByOrigin.entries()) {
        rttByOrigin.set(origin, summary.min);
      }
    }

    const estimatesByOrigin = NetworkAnalyzer._estimateResponseTimeByOrigin(records, rttByOrigin);
    return NetworkAnalyzer.summarize(estimatesByOrigin);
  }


  /**
   * Computes the average throughput for the given requests in bits/second.
   * Excludes data URI, failed or otherwise incomplete, and cached requests.
   * Returns Infinity if there were no analyzable network requests.
   *
   * @param {Lantern.NetworkRequest[]} records
   * @return {number}
   */
  static estimateThroughput(records) {
    let totalBytes = 0;

    // We will measure throughput by summing the total bytes downloaded by the total time spent
    // downloading those bytes. We slice up all the network requests into start/end boundaries, so
    // it's easier to deal with the gaps in downloading.
    const timeBoundaries = records.reduce((boundaries, request) => {
      const scheme = request.parsedURL?.scheme;
      // Requests whose bodies didn't come over the network or didn't completely finish will mess
      // with the computation, just skip over them.
      if (scheme === 'data' || request.failed || !request.finished ||
          request.statusCode > 300 || !request.transferSize) {
        return boundaries;
      }

      // If we've made it this far, all the times we need should be valid (i.e. not undefined/-1).
      totalBytes += request.transferSize;
      boundaries.push({time: request.responseHeadersEndTime / 1000, isStart: true});
      boundaries.push({time: request.networkEndTime / 1000, isStart: false});
      return boundaries;
    }, /** @type {Array<{time: number, isStart: boolean}>} */([])).sort((a, b) => a.time - b.time);

    if (!timeBoundaries.length) {
      return Infinity;
    }

    let inflight = 0;
    let currentStart = 0;
    let totalDuration = 0;

    timeBoundaries.forEach(boundary => {
      if (boundary.isStart) {
        if (inflight === 0) {
          // We just ended a quiet period, keep track of when the download period started
          currentStart = boundary.time;
        }
        inflight++;
      } else {
        inflight--;
        if (inflight === 0) {
          // We just entered a quiet period, update our duration with the time we spent downloading
          totalDuration += boundary.time - currentStart;
        }
      }
    });

    return totalBytes * 8 / totalDuration;
  }

  /**
   * @param {Lantern.NetworkRequest[]} records
   */
  static computeRTTAndServerResponseTime(records) {
    // First pass compute the estimated observed RTT to each origin's servers.
    /** @type {Map<string, number>} */
    const rttByOrigin = new Map();
    for (const [origin, summary] of NetworkAnalyzer.estimateRTTByOrigin(records).entries()) {
      rttByOrigin.set(origin, summary.min);
    }

    // We'll use the minimum RTT as the assumed connection latency since we care about how much addt'l
    // latency each origin introduces as Lantern will be simulating with its own connection latency.
    const minimumRtt = Math.min(...Array.from(rttByOrigin.values()));
    // We'll use the observed RTT information to help estimate the server response time
    const responseTimeSummaries = NetworkAnalyzer.estimateServerResponseTimeByOrigin(records, {
      rttByOrigin,
    });

    /** @type {Map<string, number>} */
    const additionalRttByOrigin = new Map();
    /** @type {Map<string, number>} */
    const serverResponseTimeByOrigin = new Map();
    for (const [origin, summary] of responseTimeSummaries.entries()) {
      // Not all origins have usable timing data, we'll default to using no additional latency.
      const rttForOrigin = rttByOrigin.get(origin) || minimumRtt;
      additionalRttByOrigin.set(origin, rttForOrigin - minimumRtt);
      serverResponseTimeByOrigin.set(origin, summary.median);
    }

    return {
      rtt: minimumRtt,
      additionalRttByOrigin,
      serverResponseTimeByOrigin,
    };
  }

  /**
   * @param {Lantern.NetworkRequest[]} records
   * @return {Lantern.Simulation.Settings['networkAnalysis']}
   */
  static analyze(records) {
    const throughput = NetworkAnalyzer.estimateThroughput(records);
    return {
      throughput,
      ...NetworkAnalyzer.computeRTTAndServerResponseTime(records),
    };
  }

  /**
   * @template {Lantern.NetworkRequest} T
   * @param {Array<T>} records
   * @param {string} resourceUrl
   * @return {T|undefined}
   */
  static findResourceForUrl(records, resourceUrl) {
    // equalWithExcludedFragments is expensive, so check that the resourceUrl starts with the request url first
    return records.find(request =>
      resourceUrl.startsWith(request.url) &&
      UrlUtils.equalWithExcludedFragments(request.url, resourceUrl)
    );
  }

  /**
   * @template {Lantern.NetworkRequest} T
   * @param {Array<T>} records
   * @param {string} resourceUrl
   * @return {T|undefined}
   */
  static findLastDocumentForUrl(records, resourceUrl) {
    // equalWithExcludedFragments is expensive, so check that the resourceUrl starts with the request url first
    const matchingRequests = records.filter(request =>
      request.resourceType === 'Document' &&
      // Note: `request.url` should never have a fragment, else this optimization gives wrong results.
      resourceUrl.startsWith(request.url) &&
      UrlUtils.equalWithExcludedFragments(request.url, resourceUrl)
    );
    return matchingRequests[matchingRequests.length - 1];
  }

  /**
   * Resolves redirect chain given a main document.
   * See: {@link NetworkAnalyzer.findLastDocumentForUrl}) for how to retrieve main document.
   *
   * @template {Lantern.NetworkRequest} T
   * @param {T} request
   * @return {T}
   */
  static resolveRedirects(request) {
    while (request.redirectDestination) request = /** @type {T} */(request.redirectDestination);
    return request;
  }
}

export {NetworkAnalyzer};

/**
 * @typedef Summary
 * @property {number} min
 * @property {number} max
 * @property {number} avg
 * @property {number} median
 */

/**
 * @typedef RTTEstimateOptions
 * @property {boolean} [forceCoarseEstimates] TCP connection handshake information will be used when available, but in some circumstances this data can be unreliable. This flag exposes an option to ignore the handshake data and use the coarse download/TTFB timing data.
 * @property {number} [coarseEstimateMultiplier] Coarse estimates include lots of extra time and noise multiply by some factor to deflate the estimates a bit.
 * @property {boolean} [useDownloadEstimates] Useful for testing to isolate the different methods of estimation.
 * @property {boolean} [useSendStartEstimates] Useful for testing to isolate the different methods of estimation.
 * @property {boolean} [useHeadersEndEstimates] Useful for testing to isolate the different methods of estimation.
 */
