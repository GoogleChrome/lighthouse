/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {TraceEngineResult} from '../../../../computed/trace-engine-result.js';
import {createProcessedNavigation} from '../../../../lib/lantern/lantern.js';
import {PageDependencyGraph} from '../../../../lib/lantern/page-dependency-graph.js';
import {NetworkAnalyzer} from '../../../../lib/lantern/simulator/network-analyzer.js';
import {Simulator} from '../../../../lib/lantern/simulator/simulator.js';
import * as Lantern from '../../../../lib/lantern/types/lantern.js';

/** @typedef {Lantern.NetworkRequest<import('@paulirish/trace_engine/models/trace/types/TraceEvents.js').SyntheticNetworkRequest>} NetworkRequest */

// TODO(15841): remove usage of Lighthouse code to create test data

/**
 * @param {{trace: LH.Trace, settings?: LH.Config.Settings, URL?: LH.Artifacts.URL}} opts
 */
async function getComputationDataFromFixture({trace, settings, URL}) {
  settings = settings ?? /** @type {LH.Config.Settings} */({});
  if (!settings.throttlingMethod) settings.throttlingMethod = 'simulate';

  const context = {settings, computedCache: new Map()};
  const traceEngineResult = await TraceEngineResult.request({trace}, context);
  const {graph, requests} =
    await PageDependencyGraph.createGraphFromTrace(trace, traceEngineResult, URL);
  const processedNavigation = createProcessedNavigation(traceEngineResult);
  const networkAnalysis = NetworkAnalyzer.analyze(requests);
  const simulator = Simulator.createSimulator({...settings, networkAnalysis});

  return {simulator, graph, processedNavigation};
}

export {getComputationDataFromFixture};
