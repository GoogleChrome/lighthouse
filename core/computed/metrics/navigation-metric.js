/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileOverview Enforces that a metric can only be computed on navigations.
 */

import Metric from './metric.js';

class NavigationMetric extends Metric {
  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.LanternMetric|LH.Artifacts.Metric>}
   */
  static computeSimulatedMetric(data, context) { // eslint-disable-line no-unused-vars
    throw new Error('Unimplemented');
  }

  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static computeObservedMetric(data, context) { // eslint-disable-line no-unused-vars
    throw new Error('Unimplemented');
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.LanternMetric|LH.Artifacts.Metric>}
   */
  static async compute_(data, context) {
    if (data.gatherContext.gatherMode !== 'navigation') {
      throw new Error(`${this.name} can only be computed on navigations`);
    }

    return super.compute_(data, context);
  }
}

export {NavigationMetric};
