/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {LoadSimulator} from '../load-simulator.js';
import {PageDependencyGraph} from '../page-dependency-graph.js';
import {ProcessedNavigation} from '../processed-navigation.js';

/**
 * @param {LH.Artifacts.MetricComputationDataInput} data
 * @param {LH.Artifacts.ComputedContext} context
 */
async function getComputationDataParams(data, context) {
  if (data.gatherContext.gatherMode !== 'navigation') {
    throw new Error(`Lantern metrics can only be computed on navigations`);
  }

  const graph = await PageDependencyGraph.request(data, context);
  const processedNavigation = await ProcessedNavigation.request(data.trace, context);
  const simulator = data.simulator || (await LoadSimulator.request(data, context));

  return {simulator, graph, processedNavigation};
}

export {getComputationDataParams};
