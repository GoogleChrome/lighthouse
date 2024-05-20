/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ProcessedNavigation} from '../../../../computed/processed-navigation.js';
import {ProcessedTrace} from '../../../../computed/processed-trace.js';
import {TraceEngineResult} from '../../../../computed/trace-engine-result.js';
import {PageDependencyGraph} from '../../../../lib/lantern/page-dependency-graph.js';
import {NetworkAnalyzer} from '../../../../lib/lantern/simulator/network-analyzer.js';
import {Simulator} from '../../../../lib/lantern/simulator/simulator.js';
import * as Lantern from '../../../../lib/lantern/types/lantern.js';
import {getURLArtifactFromDevtoolsLog} from '../../../test-utils.js';

/** @typedef {Lantern.NetworkRequest<import('@paulirish/trace_engine/models/trace/types/TraceEvents.js').SyntheticNetworkRequest>} NetworkRequest */

// TODO(15841): remove usage of Lighthouse code to create test data

/**
 * @param {LH.Artifacts.URL} theURL
 * @param {LH.Trace} trace
 * @param {LH.Artifacts.ComputedContext} context
 */
async function createGraph(theURL, trace, context) {
  const {mainThreadEvents} = await ProcessedTrace.request(trace, context);
  const traceEngineResult = await TraceEngineResult.request({trace}, context);
  return PageDependencyGraph.createGraphFromTrace(
    mainThreadEvents, trace, traceEngineResult, theURL);
}

/**
 * @param {{trace: LH.Trace, devtoolsLog: LH.DevtoolsLog, settings?: LH.Config.Settings, URL?: LH.Artifacts.URL}} opts
 */
async function getComputationDataFromFixture({trace, devtoolsLog, settings, URL}) {
  settings = settings ?? /** @type {LH.Config.Settings} */({});
  settings.internalUseTraceForLantern = true;
  if (!settings.throttlingMethod) settings.throttlingMethod = 'simulate';
  if (!URL) URL = getURLArtifactFromDevtoolsLog(devtoolsLog);

  const context = {settings, computedCache: new Map()};
  const {graph, records} = await createGraph(URL, trace, context);
  const processedNavigation = await ProcessedNavigation.request(trace, context);
  const networkAnalysis = NetworkAnalyzer.analyze(records);
  const simulator = Simulator.createSimulator({...settings, networkAnalysis});

  return {simulator, graph, processedNavigation};
}

export {getComputationDataFromFixture};
