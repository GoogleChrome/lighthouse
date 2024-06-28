/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../../lib/lantern/lantern.js';
import {LighthouseError} from '../../lib/lh-error.js';
import {LoadSimulator} from '../load-simulator.js';
import {ProcessedNavigation} from '../processed-navigation.js';
import {PageDependencyGraph} from '../page-dependency-graph.js';
import {TraceEngineResult} from '../trace-engine-result.js';

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
 * @param {LH.Artifacts.MetricComputationDataInput} data
 * @param {LH.Artifacts.ComputedContext} context
 */
async function getComputationDataParamsFromTrace(data, context) {
  if (data.gatherContext.gatherMode !== 'navigation') {
    throw new Error(`Lantern metrics can only be computed on navigations`);
  }

  const graph = await PageDependencyGraph.request({...data, fromTrace: true}, context);
  const traceEngineResult = await TraceEngineResult.request(data, context);
  const processedNavigation =
    Lantern.TraceEngineComputationData.createProcessedNavigation(traceEngineResult.data);
  const simulator = data.simulator || (await LoadSimulator.request(data, context));

  return {simulator, graph, processedNavigation};
}

/**
 * @param {unknown} err
 * @return {never}
 */
function lanternErrorAdapter(err) {
  if (!(err instanceof Lantern.Core.LanternError)) {
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
  // TODO(15841): remove devtools impl when ready to make breaking change.
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
