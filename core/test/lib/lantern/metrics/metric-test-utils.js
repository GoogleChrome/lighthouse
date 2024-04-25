/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../../../../lib/lantern/types/lantern.js';
import {LoadSimulator} from '../../../../computed/load-simulator.js';
import {ProcessedNavigation} from '../../../../computed/processed-navigation.js';
import {ProcessedTrace} from '../../../../computed/processed-trace.js';
import {TraceEngineResult} from '../../../../computed/trace-engine-result.js';
import {PageDependencyGraph} from '../../../../lib/lantern/page-dependency-graph.js';
import {getURLArtifactFromDevtoolsLog} from '../../../test-utils.js';
import {RESOURCE_TYPES} from '../../../../lib/network-request.js';

/** @typedef {Lantern.NetworkRequest<import('@paulirish/trace_engine/models/trace/types/TraceEvents.js').SyntheticNetworkRequest>} NetworkRequest */

// TODO(15841): remove usage of Lighthouse code to create test data

/**
 * @param {NetworkRequest} record The record to find the initiator of
 * @param {Map<string, NetworkRequest[]>} recordsByURL
 * @return {NetworkRequest|null}
 */
function chooseInitiatorRequest(record, recordsByURL) {
  if (record.redirectSource) {
    return record.redirectSource;
  }

  const initiatorURL = PageDependencyGraph.getNetworkInitiators(record)[0];
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

/**
 * @param {LH.TraceEvent[]} mainThreadEvents
 * @param {LH.Artifacts.TraceEngineResult} traceEngineResult
 * @param {LH.Artifacts.URL} theURL
 */
function createGraph(mainThreadEvents, traceEngineResult, theURL) {
  /** @type {NetworkRequest[]} */
  const lanternRequests = [];

  for (const request of traceEngineResult.data.NetworkRequests.byTime) {
    if (request.args.data.connectionId === undefined ||
        request.args.data.connectionReused === undefined ||
        request.args.data.initiator === undefined) {
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

    lanternRequests.push({
      requestId: request.args.data.requestId,
      connectionId: request.args.data.connectionId,
      connectionReused: request.args.data.connectionReused,
      url: request.args.data.url,
      protocol: request.args.data.protocol,
      parsedURL,
      documentURL: request.args.data.requestingFrameUrl,
      // TODO i haven't confirmed these, just guessing
      rendererStartTime: request.ts,
      networkRequestTime: request.args.data.syntheticData.sendStartTime,
      responseHeadersEndTime: request.args.data.syntheticData.downloadStart,
      networkEndTime: request.args.data.syntheticData.finishTime,
      // TODO ----
      transferSize: request.args.data.encodedDataLength,
      resourceSize: request.args.data.decodedBodyLength,
      fromDiskCache: request.args.data.syntheticData.isDiskCached,
      fromMemoryCache: request.args.data.syntheticData.isMemoryCached,
      isLinkPreload: request.args.data.isLinkPreload,
      // @ts-expect-error TODO upstream
      finished: request.args.data.finished,
      // @ts-expect-error TODO upstream
      failed: request.args.data.failed,
      statusCode: request.args.data.statusCode,
      initiator: request.args.data.initiator,
      timing: {
        ...request.args.data.timing,
        workerFetchStart: -1,
        workerRespondWithSettled: -1,
      },
      resourceType: request.args.data.resourceType,
      mimeType: request.args.data.mimeType,
      // @ts-expect-error TODO types are wrong in TE
      priority: request.args.data.priority,
      frameId: request.args.data.frame,
      fromWorker,
      record: request,
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

  /** @type {Map<string, NetworkRequest[]>} */
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

  return PageDependencyGraph.createGraph(mainThreadEvents, lanternRequests, theURL);
}

/**
 * @param {LH.Artifacts.MetricComputationDataInput} data
 * @param {LH.Artifacts.ComputedContext} context
 */
async function getComputationDataParams(data, context) {
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
 * @param {{trace: LH.Trace, devtoolsLog: LH.DevtoolsLog, settings?: LH.Audit.Context['settings'], URL?: LH.Artifacts.URL}} opts
 */
function getComputationDataFromFixture({trace, devtoolsLog, settings, URL}) {
  // @ts-ignore
  settings = settings || {};
  URL = URL || getURLArtifactFromDevtoolsLog(devtoolsLog);
  const gatherContext = {gatherMode: 'navigation'};
  const context = {settings, computedCache: new Map()};
  // @ts-ignore
  return getComputationDataParams({trace, devtoolsLog, gatherContext, settings, URL}, context);
}

export {getComputationDataFromFixture};
