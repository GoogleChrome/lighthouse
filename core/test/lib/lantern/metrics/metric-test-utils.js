/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {TraceEngineResult} from '../../../../computed/trace-engine-result.js';
import {NetworkAnalyzer} from '../../../../lib/lantern/simulator/network-analyzer.js';
import {Simulator} from '../../../../lib/lantern/simulator/simulator.js';
import * as TraceEngineComputationData from '../../../../lib/lantern/trace-engine-computation-data.js';
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
  const requests = TraceEngineComputationData.createNetworkRequests(trace, traceEngineResult);
  const networkAnalysis = NetworkAnalyzer.analyze(requests);

  return {
    simulator: Simulator.createSimulator({...settings, networkAnalysis}),
    graph: TraceEngineComputationData.createGraph(requests, trace, traceEngineResult, URL),
    processedNavigation: TraceEngineComputationData.createProcessedNavigation(traceEngineResult),
  };
}

export {getComputationDataFromFixture};
