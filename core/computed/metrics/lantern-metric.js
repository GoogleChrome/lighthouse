/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {LanternError} from '../../lib/lantern/lantern-error.js';
import {PageDependencyGraph as LanternPageDependencyGraph} from '../../lib/lantern/page-dependency-graph.js';
import {LighthouseError} from '../../lib/lh-error.js';
import {LoadSimulator} from '../load-simulator.js';
import {ProcessedNavigation} from '../processed-navigation.js';
import {ProcessedTrace} from '../processed-trace.js';
import {TraceEngineResult} from '../trace-engine-result.js';
import {PageDependencyGraph} from '../page-dependency-graph.js';

// TODO: we need to update all test traces (that use lantern) before this can be removed
/**
 * @param {LH.Artifacts.MetricComputationDataInput} data
 * @param {LH.Artifacts.ComputedContext} context
 */
async function getComputationDataParamsFromDevtoolsLog(data, context) {
  if (data.gatherContext.gatherMode !== 'navigation') {
    throw new Error(`Lantern metrics can only be computed on navigations`);
  }

  const graph = await PageDependencyGraph.request(data, context);
  const processedNavigation = await ProcessedNavigation.request(data.trace, context);
  const simulator = data.simulator || (await LoadSimulator.request(data, context));

  return {simulator, graph, processedNavigation};
}

/**
 * @param {LH.Artifacts.URL} theURL
 * @param {LH.Trace} trace
 * @param {LH.Artifacts.ComputedContext} context
 */
async function createGraphFromTrace(theURL, trace, context) {
  const {mainThreadEvents} = await ProcessedTrace.request(trace, context);
  const traceEngineResult = await TraceEngineResult.request({trace}, context);
  return LanternPageDependencyGraph.createGraphFromTrace(
    mainThreadEvents, trace, traceEngineResult, theURL);
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
  const {graph} = await createGraphFromTrace(URL, trace, context);
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

/**
 * @param {LH.Artifacts.MetricComputationDataInput} data
 * @param {LH.Artifacts.ComputedContext} context
 */
function getComputationDataParams(data, context) {
  // TODO(15841): remove when all tests use the trace, and we want to remove CDT graph impl.
  if (process.env.INTERNAL_LANTERN_USE_TRACE !== undefined) {
    return getComputationDataParamsFromTrace(data, context);
  } else {
    // This is the default behavior.
    return getComputationDataParamsFromDevtoolsLog(data, context);
  }
}

export {
  getComputationDataParamsFromTrace,
  getComputationDataParamsFromDevtoolsLog,
  getComputationDataParams,
  lanternErrorAdapter,
};
