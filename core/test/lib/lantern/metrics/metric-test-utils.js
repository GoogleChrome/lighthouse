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

// TODO(15841): remove usage of Lighthouse code to create test data

/**
 * @param {LH.TraceEvent[]} mainThreadEvents
 * @param {LH.Artifacts.TraceEngineResult} traceEngineResult
 * @param {LH.Artifacts.URL} theURL
 */
function createGraph(mainThreadEvents, traceEngineResult, theURL) {
  /** @type {Lantern.NetworkRequest<import('@paulirish/trace_engine/models/trace/types/TraceEvents.js').SyntheticNetworkRequest>[]} */
  const lanternRequests = [];

  for (const request of traceEngineResult.data.NetworkRequests.byTime) {
    if (request.args.data.connectionId === undefined ||
        request.args.data.connectionReused === undefined ||
        request.args.data.initiator === undefined) {
      throw new Error('Trace is too old');
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
      // rendererStartTime: 0,
      // networkRequestTime: 0,
      // responseHeadersEndTime: 0,
      // networkEndTime: 0,
      transferSize: request.args.data.encodedDataLength,
      resourceSize: request.args.data.decodedBodyLength,
      fromDiskCache: request.args.data.syntheticData.isDiskCached,
      fromMemoryCache: request.args.data.syntheticData.isMemoryCached,
      // @ts-expect-error TODO upstream
      finished: request.args.data.finished,
      // @ts-expect-error TODO upstream
      failed: request.args.data.failed,
      statusCode: request.args.data.statusCode,
      // redirectDestination: undefined,
      initiator: request.args.data.initiator,
      // redirects: undefined,
      timing: request.args.data.timing,
      resourceType: request.args.data.resourceType,
      mimeType: request.args.data.mimeType,
      // @ts-expect-error TODO types are wrong in TE
      priority: request.args.data.priority,
      frameId: request.args.data.frame,
      fromWorker,
      record: request,
    });
  }

  for (const request of lanternRequests) {
    // TODO _chooseInitiatorRequest
    request.initiatorRequest = undefined;
  }

  for (const request of [...lanternRequests]) {
    if (!request.record) continue;

    const redirects = request.record.args.data.redirects;
    if (!redirects.length) continue;

    //
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
