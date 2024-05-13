/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../../lib/lantern/types/lantern.js';
import {LanternError} from '../../lib/lantern/lantern-error.js';
import {PageDependencyGraph as LanternPageDependencyGraph} from '../../lib/lantern/page-dependency-graph.js';
import {LighthouseError} from '../../lib/lh-error.js';
import {LoadSimulator} from '../load-simulator.js';
import {ProcessedNavigation} from '../processed-navigation.js';
import {ProcessedTrace} from '../processed-trace.js';
import {TraceEngineResult} from '../trace-engine-result.js';
import {RESOURCE_TYPES} from '../../lib/network-request.js';
import {PageDependencyGraph} from '../page-dependency-graph.js';

/**
 * @param {LH.Artifacts.MetricComputationDataInput} data
 * @param {LH.Artifacts.ComputedContext} context
 */
async function getComputationDataParams(data, context) {
  if (data.gatherContext.gatherMode !== 'navigation') {
    throw new Error(`Lantern metrics can only be computed on navigations`);
  }

  const graph = await PageDependencyGraph.request(data, context);
  const processedNavigation = await ProcessedNavigation.request(data.trace, context);
  const simulator = data.simulator || (await LoadSimulator.request(data, context));

  return {simulator, graph, processedNavigation};
}


/**
 * @param {Lantern.NetworkRequest} record The record to find the initiator of
 * @param {Map<string, Lantern.NetworkRequest[]>} recordsByURL
 * @return {Lantern.NetworkRequest|null}
 */
function chooseInitiatorRequest(record, recordsByURL) {
  if (record.redirectSource) {
    return record.redirectSource;
  }

  const initiatorURL = LanternPageDependencyGraph.getNetworkInitiators(record)[0];
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
        cand => cand.resourceType !== RESOURCE_TYPES.Other);
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
      cand.resourceType === RESOURCE_TYPES.Document);
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

// TODO ! remove me
/**
 * @param {Lantern.NetworkRequest[]} lanternRequests
 */
function testingNormalizeRequests(lanternRequests) {
  for (const r of lanternRequests) {
    delete r.record;
    if (r.initiatorRequest) {
      r.initiatorRequest = {id: r.initiatorRequest.requestId};
    }
    if (r.redirectDestination) {
      r.redirectDestination = {id: r.redirectDestination.requestId};
    }
    if (r.redirectSource) {
      r.redirectSource = {id: r.redirectSource.requestId};
    }
    if (r.redirects) {
      r.redirects = r.redirects.map(r2 => r2.requestId);
    }
  }
  return lanternRequests.map(r => ({
    requestId: r.requestId,
    connectionId: r.connectionId,
    connectionReused: r.connectionReused,
    url: r.url,
    protocol: r.protocol,
    parsedURL: r.parsedURL,
    documentURL: r.documentURL,
    rendererStartTime: r.rendererStartTime,
    networkRequestTime: r.networkRequestTime,
    responseHeadersEndTime: r.responseHeadersEndTime,
    networkEndTime: r.networkEndTime,
    transferSize: r.transferSize,
    resourceSize: r.resourceSize,
    fromDiskCache: r.fromDiskCache,
    fromMemoryCache: r.fromMemoryCache,
    finished: r.finished,
    statusCode: r.statusCode,
    redirectSource: r.redirectSource,
    redirectDestination: r.redirectDestination,
    redirects: r.redirects,
    failed: r.failed,
    initiator: r.initiator,
    timing: r.timing ? {
      requestTime: r.timing.requestTime,
      proxyStart: r.timing.proxyStart,
      proxyEnd: r.timing.proxyEnd,
      dnsStart: r.timing.dnsStart,
      dnsEnd: r.timing.dnsEnd,
      connectStart: r.timing.connectStart,
      connectEnd: r.timing.connectEnd,
      sslStart: r.timing.sslStart,
      sslEnd: r.timing.sslEnd,
      workerStart: r.timing.workerStart,
      workerReady: r.timing.workerReady,
      workerFetchStart: r.timing.workerFetchStart,
      workerRespondWithSettled: r.timing.workerRespondWithSettled,
      sendStart: r.timing.sendStart,
      sendEnd: r.timing.sendEnd,
      pushStart: r.timing.pushStart,
      pushEnd: r.timing.pushEnd,
      receiveHeadersStart: r.timing.receiveHeadersStart,
      receiveHeadersEnd: r.timing.receiveHeadersEnd,
    } : r.timing,
    resourceType: r.resourceType,
    mimeType: r.mimeType,
    priority: r.priority,
    initiatorRequest: r.initiatorRequest,
    frameId: r.frameId,
    fromWorker: r.fromWorker,
    isLinkPreload: r.isLinkPreload,
    serverResponseTime: r.serverResponseTime,
  }));
}

/**
 * @param {LH.TraceEvent[]} mainThreadEvents
 * @param {LH.Artifacts.TraceEngineResult} traceEngineResult
 * @param {LH.Artifacts.URL} theURL
 */
function createGraph(mainThreadEvents, traceEngineResult, theURL) {
  /** @type {Lantern.NetworkRequest[]} */
  const lanternRequests = [];

  for (const request of traceEngineResult.data.NetworkRequests.byTime) {
    if (request.args.data.connectionId === undefined ||
        request.args.data.connectionReused === undefined) {
      throw new Error('Trace is too old');
    }

    // TODO: is this possible?
    if (request.args.data.timing === undefined) {
      continue;
    }

    let url;
    try {
      url = new URL(request.args.data.url);
    } catch (e) {
      continue;
    }

    const parsedURL = {
      scheme: url.protocol.split(':')[0],
      // Intentional, DevTools uses different terminology
      host: url.hostname,
      securityOrigin: url.origin,
    };

    let fromWorker = false;
    // TODO: should also check pid
    if (traceEngineResult.data.Workers.workerIdByThread.has(request.tid)) {
      fromWorker = true;
    }

    // `initiator` in the trace does not contain the stack trace for JS-initiated
    // requests. Instead, that is stored in the `stackTrace` property of the SyntheticNetworkRequest.
    // There are some minor differences in the fields, accounted for here.
    // Most importantly, there seems to be fewer frames in the trace than the equivalent
    // events over the CDP. This results in less accuracy in determining the initiator request,
    // which means less edges in the graph, which mean worse results. Should fix.
    /** @type {Lantern.NetworkRequest['initiator']} */
    const initiator = request.args.data.initiator ?? {type: 'other'};
    if (request.args.data.stackTrace) {
      const callFrames = request.args.data.stackTrace.map(f => {
        return {
          scriptId: String(f.scriptId),
          url: f.url,
          lineNumber: f.lineNumber - 1,
          columnNumber: f.columnNumber - 1,
          functionName: f.functionName,
        };
      });
      initiator.stack = {callFrames};
    }

    let resourceType = request.args.data.resourceType;
    if (request.args.data.initiator?.fetchType === 'xmlhttprequest') {
      // @ts-expect-error yes XHR is a valid ResourceType. TypeScript const enums are so unhelpful.
      resourceType = 'XHR';
    }

    lanternRequests.push({
      requestId: request.args.data.requestId,
      connectionId: request.args.data.connectionId,
      connectionReused: request.args.data.connectionReused,
      url: request.args.data.url,
      protocol: request.args.data.protocol,
      parsedURL,
      documentURL: request.args.data.requestingFrameUrl,
      // TODO i haven't confirmed these, just guessing
      rendererStartTime: request.ts / 1000,
      networkRequestTime: request.args.data.syntheticData.sendStartTime / 1000,
      responseHeadersEndTime: request.args.data.syntheticData.downloadStart / 1000,
      networkEndTime: request.args.data.syntheticData.finishTime / 1000,
      // TODO ----
      transferSize: request.args.data.encodedDataLength,
      resourceSize: request.args.data.decodedBodyLength,
      fromDiskCache: request.args.data.syntheticData.isDiskCached,
      fromMemoryCache: request.args.data.syntheticData.isMemoryCached,
      isLinkPreload: request.args.data.isLinkPreload,
      finished: request.args.data.finished,
      failed: request.args.data.failed,
      statusCode: request.args.data.statusCode,
      initiator,
      timing: {
        ...request.args.data.timing,
        workerFetchStart: -1,
        workerRespondWithSettled: -1,
      },
      resourceType,
      mimeType: request.args.data.mimeType,
      priority: request.args.data.priority,
      frameId: request.args.data.frame,
      fromWorker,
      record: request,
      // Set below.
      redirects: undefined,
      redirectSource: undefined,
      redirectDestination: undefined,
      initiatorRequest: undefined,
    });
  }

  // TraceEngine consolidates all redirects into a single request object, but lantern needs
  // an entry for each redirected request.
  for (const request of [...lanternRequests]) {
    if (!request.record) continue;

    const redirects = request.record.args.data.redirects;
    if (!redirects.length) continue;

    const redirectsAsLanternRequests = [];
    for (const redirect of redirects) {
      const redirectedRequest = structuredClone(request);
      redirectsAsLanternRequests.push(structuredClone(request));
      redirectedRequest.networkEndTime = redirect.ts * 1000;
      lanternRequests.push(redirectedRequest);
    }
    request.redirects = redirectsAsLanternRequests;

    for (let i = 0; i < redirects.length; i++) {
      const redirectedRequest = redirectsAsLanternRequests[i];
      redirectedRequest.redirectDestination = i === redirects.length - 1 ?
        request :
        redirectsAsLanternRequests[i + 1];
      if (i > 0) {
        redirectsAsLanternRequests[i - 1].redirectSource = redirectedRequest;
      } else {
        redirectedRequest.redirectSource = request;
      }
    }
    request.redirectDestination = redirectsAsLanternRequests[0];

    // Apply the `:redirect` requestId convention: only redirects[0].requestId is the actual
    // requestId, all the rest have n occurences of `:redirect` as a suffix.
    for (let i = 1; i < redirects.length; i++) {
      redirectsAsLanternRequests[i].requestId = `${redirectsAsLanternRequests[i - 1]}:redirect`;
    }
    const lastRedirect = redirectsAsLanternRequests[redirectsAsLanternRequests.length - 1];
    request.requestId = `${lastRedirect.requestId}:redirect`;
  }

  /** @type {Map<string, Lantern.NetworkRequest[]>} */
  const requestsByURL = new Map();
  for (const request of lanternRequests) {
    const requests = requestsByURL.get(request.url) || [];
    requests.push(request);
    requestsByURL.set(request.url, requests);
  }

  for (const request of lanternRequests) {
    const initiatorRequest = chooseInitiatorRequest(request, requestsByURL);
    if (initiatorRequest) {
      request.initiatorRequest = initiatorRequest;
    }
  }

  const debug = testingNormalizeRequests(lanternRequests);
  return LanternPageDependencyGraph.createGraph(mainThreadEvents, lanternRequests, theURL);
}

/**
 * @param {LH.Artifacts.MetricComputationDataInput} data
 * @param {LH.Artifacts.ComputedContext} context
 */
async function getComputationDataParamsFromTrace(data, context) {
  if (data.gatherContext.gatherMode !== 'navigation') {
    throw new Error(`Lantern metrics can only be computed on navigations`);
  }

  const {trace, URL} = data;
  const processedTrace = await ProcessedTrace.request(trace, context);
  const traceEngineResult = await TraceEngineResult.request({trace}, context);
  const graph = createGraph(processedTrace.mainThreadEvents, traceEngineResult, URL);
  const processedNavigation = await ProcessedNavigation.request(data.trace, context);
  const simulator = data.simulator || (await LoadSimulator.request(data, context));

  return {simulator, graph, processedNavigation};
}

/**
 * @param {unknown} err
 * @return {never}
 */
function lanternErrorAdapter(err) {
  if (!(err instanceof LanternError)) {
    throw err;
  }

  const code = /** @type {keyof LighthouseError.errors} */ (err.message);
  if (LighthouseError.errors[code]) {
    throw new LighthouseError(LighthouseError.errors[code]);
  }

  throw err;
}

export {
  // getComputationDataParams,
  getComputationDataParamsFromTrace as getComputationDataParams,
  lanternErrorAdapter,
  testingNormalizeRequests,
};
