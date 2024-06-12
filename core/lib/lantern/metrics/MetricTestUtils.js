/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as TraceEngine from '@paulirish/trace_engine';

import * as Lantern from '../lantern.js';
import {polyfillDOMRect} from '../../polyfill-dom-rect.js';

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
  const requests =
    Lantern.TraceEngineComputationData.createNetworkRequests(trace, traceEngineData);
  const networkAnalysis = Lantern.Simulation.NetworkAnalyzer.analyze(requests);

  return {
    simulator: Lantern.Simulation.Simulator.createSimulator({...settings, networkAnalysis}),
    graph: Lantern.TraceEngineComputationData.createGraph(requests, trace, traceEngineData, URL),
    processedNavigation:
      Lantern.TraceEngineComputationData.createProcessedNavigation(traceEngineData),
  };
}

export {
  runTraceEngine,
  getComputationDataFromFixture,
};
