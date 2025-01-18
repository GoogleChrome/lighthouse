/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {TraceProcessor} from '../../lib/tracehouse/trace-processor.js';
import {ProcessedTrace} from '../processed-trace.js';
import {ProcessedNavigation} from '../processed-navigation.js';
import {NetworkRecords} from '../network-records.js';

/**
 * @fileOverview Encapsulates logic for choosing the correct metric computation method based on the
 * specified throttling settings, supporting simulated and observed metric types.
 *
 * To implement a fully supported metric:
 *     - Override the computeObservedMetric method with the observed-mode implementation.
 *     - Override the computeSimulatedMetric method with the simulated-mode implementation (which
 *       may call another computed artifact with the name LanternMyMetricName).
 */
class Metric {
  constructor() {}

  /**
   * Narrows the metric computation data to the input so child metric requests can be cached.
   *
   * @param {LH.Artifacts.MetricComputationData} data
   * @return {LH.Artifacts.MetricComputationDataInput}
   */
  static getMetricComputationInput(data) {
    return {
      trace: data.trace,
      devtoolsLog: data.devtoolsLog,
      gatherContext: data.gatherContext,
      settings: data.settings,
      URL: data.URL,
    };
  }

  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.LanternMetric|LH.Artifacts.Metric>}
   */
  static computeSimulatedMetric(data, context) { // eslint-disable-line no-unused-vars
    throw new Error('Unimplemented');
  }

  /**
   * @param {LH.Artifacts.MetricComputationData} data
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
    const {trace, devtoolsLog, settings, gatherContext} = data;
    if (!trace || !devtoolsLog || !settings) {
      throw new Error('Did not provide necessary metric computation data');
    }

    const processedTrace = await ProcessedTrace.request(trace, context);
    const processedNavigation = gatherContext.gatherMode === 'timespan' ?
      undefined : await ProcessedNavigation.request(trace, context);

    const augmentedData = Object.assign({
      networkRecords: await NetworkRecords.request(devtoolsLog, context),
      gatherContext,
      processedTrace,
      processedNavigation,
    }, data);

    TraceProcessor.assertHasToplevelEvents(augmentedData.processedTrace.mainThreadEvents);

    switch (settings.throttlingMethod) {
      case 'simulate':
        if (gatherContext.gatherMode !== 'navigation') {
          throw new Error(`${gatherContext.gatherMode} does not support throttlingMethod simulate`);
        }

        return this.computeSimulatedMetric(augmentedData, context);
      case 'provided':
      case 'devtools':
        return this.computeObservedMetric(augmentedData, context);
      default:
        throw new TypeError(`Unrecognized throttling method: ${settings.throttlingMethod}`);
    }
  }
}

export default Metric;
