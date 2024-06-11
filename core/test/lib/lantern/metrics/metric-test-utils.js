/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as TraceEngine from '@paulirish/trace_engine';

import * as Lantern from '../../../../lib/lantern/types/lantern.js';
import {NetworkAnalyzer} from '../../../../lib/lantern/simulator/network-analyzer.js';
import {Simulator} from '../../../../lib/lantern/simulator/simulator.js';
import * as TraceEngineComputationData from '../../../../lib/lantern/trace-engine-computation-data.js';
import {polyfillDOMRect} from '../../../../lib/polyfill-dom-rect.js';

polyfillDOMRect();

/**
 * @param {TraceEngine.Types.TraceEvents.TraceEventData[]} traceEvents
 */
async function runTraceEngine(traceEvents) {
  const processor = TraceEngine.Processor.TraceProcessor.createWithAllHandlers();
  await processor.parse(traceEvents);
  if (!processor.traceParsedData) throw new Error('No data');
  return processor.traceParsedData;
}

/**
 * @param {{trace: Lantern.Trace, settings?: Lantern.Simulation.Settings, URL?: Lantern.Simulation.URL}} opts
 */
async function getComputationDataFromFixture({trace, settings, URL}) {
  settings = settings ?? /** @type {Lantern.Simulation.Settings} */({});
  if (!settings.throttlingMethod) settings.throttlingMethod = 'simulate';
  const traceEngineData = await runTraceEngine(
    /** @type {TraceEngine.Types.TraceEvents.TraceEventData[]} */ (trace.traceEvents)
  );
  const requests = TraceEngineComputationData.createNetworkRequests(trace, traceEngineData);
  const networkAnalysis = NetworkAnalyzer.analyze(requests);

  return {
    simulator: Simulator.createSimulator({...settings, networkAnalysis}),
    graph: TraceEngineComputationData.createGraph(requests, trace, traceEngineData, URL),
    processedNavigation: TraceEngineComputationData.createProcessedNavigation(traceEngineData),
  };
}

export {
  getComputationDataFromFixture,
  runTraceEngine,
};
