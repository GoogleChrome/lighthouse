/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ProcessedTrace} from '../../../../computed/processed-trace.js';
import {TraceEngineResult} from '../../../../computed/trace-engine-result.js';
import {PageDependencyGraph} from '../../../../lib/lantern/page-dependency-graph.js';
import {NetworkAnalyzer} from '../../../../lib/lantern/simulator/network-analyzer.js';
import {Simulator} from '../../../../lib/lantern/simulator/simulator.js';
import * as Lantern from '../../../../lib/lantern/types/lantern.js';
import {getURLArtifactFromDevtoolsLog} from '../../../test-utils.js';

/** @typedef {Lantern.NetworkRequest<import('@paulirish/trace_engine/models/trace/types/TraceEvents.js').SyntheticNetworkRequest>} NetworkRequest */
/** @typedef {import('@paulirish/trace_engine/models/trace/handlers/PageLoadMetricsHandler.js').MetricName} MetricName */
/** @typedef {import('@paulirish/trace_engine/models/trace/handlers/PageLoadMetricsHandler.js').MetricScore} MetricScore */

// TODO(15841): remove usage of Lighthouse code to create test data

/**
 * @param {LH.Artifacts.TraceEngineResult} traceEngineResult
 * @param {LH.Artifacts.URL} theURL
 * @param {LH.Trace} trace
 * @param {LH.Artifacts.ComputedContext} context
 */
async function createGraph(traceEngineResult, theURL, trace, context) {
  const {mainThreadEvents} = await ProcessedTrace.request(trace, context);
  return PageDependencyGraph.createGraphFromTrace(
    mainThreadEvents, trace, traceEngineResult, theURL);
}

/**
 * @param {LH.Artifacts.TraceEngineResult} traceEngineResult
 * @return {Lantern.Simulation.ProcessedNavigation}
 */
function createProcessedNavigation(traceEngineResult) {
  const Meta = traceEngineResult.data.Meta;
  const frameId = Meta.mainFrameId;
  const navigationId = Meta.mainFrameNavigations[0].args.data?.navigationId || '';
  const scores = traceEngineResult.data.PageLoadMetrics.metricScoresByFrameId.get(frameId)?.get(navigationId);
  /** @param {MetricScore=} metricScore */
  const getTimestampOrUndefined = metricScore => metricScore?.event ? metricScore.event.ts : undefined;
  /** @param {MetricScore=} metricScore */
  const getTimestamp = metricScore => {
    if (!metricScore?.event) {
      throw new Error('missing metric');
    }
    return metricScore.event.ts;
  };
  // TODO: should use `MetricName.LCP`, but it is a const enum.
  const FCP = /** @type {MetricName} */('FCP');
  const LCP = /** @type {MetricName} */('LCP');
  return {
    timestamps: {
      firstContentfulPaint: getTimestamp(scores?.get(FCP)),
      largestContentfulPaint: getTimestampOrUndefined(scores?.get(LCP)),
    },
  };
}

/**
 * @param {{trace: LH.Trace, devtoolsLog: LH.DevtoolsLog, settings?: LH.Config.Settings, URL?: LH.Artifacts.URL}} opts
 */
async function getComputationDataFromFixture({trace, devtoolsLog, settings, URL}) {
  settings = settings ?? /** @type {LH.Config.Settings} */({});
  if (!settings.throttlingMethod) settings.throttlingMethod = 'simulate';
  if (!URL) URL = getURLArtifactFromDevtoolsLog(devtoolsLog);

  const context = {settings, computedCache: new Map()};
  const traceEngineResult = await TraceEngineResult.request({trace}, context);
  const {graph, records} = await createGraph(traceEngineResult, URL, trace, context);
  const processedNavigation = createProcessedNavigation(traceEngineResult);
  const networkAnalysis = NetworkAnalyzer.analyze(records);
  const simulator = Simulator.createSimulator({...settings, networkAnalysis});

  return {simulator, graph, processedNavigation};
}

export {getComputationDataFromFixture};
