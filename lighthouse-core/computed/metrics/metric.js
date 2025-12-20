/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TracingProcessor = require('../../lib/tracehouse/trace-processor.js');
const TraceOfTab = require('../trace-of-tab.js');
const NetworkRecords = require('../network-records.js');

/**
 * @fileOverview Encapsulates logic for choosing the correct metric computation method based on the
 * specified throttling settings, supporting simulated and observed metric types.
 *
 * To implement a fully supported metric:
 *     - Override the computeObservedMetric method with the observed-mode implementation.
 *     - Override the computeSimulatedMetric method with the simulated-mode implementation (which
 *       may call another computed artifact with the name LanternMyMetricName).
 */
class ComputedMetric {
  constructor() {}

  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static computeSimulatedMetric(data, context) { // eslint-disable-line no-unused-vars
    throw new Error('Unimplemented');
  }

  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static computeObservedMetric(data, context) { // eslint-disable-line no-unused-vars
    throw new Error('Unimplemented');
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.LanternMetric|LH.Artifacts.Metric>}
   */
  static async compute_(data, context) {
    const {trace, devtoolsLog, settings} = data;
    if (!trace || !devtoolsLog || !settings) {
      throw new Error('Did not provide necessary metric computation data');
    }

    const augmentedData = Object.assign({
      networkRecords: await NetworkRecords.request(devtoolsLog, context),
      traceOfTab: await TraceOfTab.request(trace, context),
    }, data);

    TracingProcessor.assertHasToplevelEvents(augmentedData.traceOfTab.mainThreadEvents);

    switch (settings.throttlingMethod) {
      case 'simulate':
        return this.computeSimulatedMetric(augmentedData, context);
      case 'provided':
      case 'devtools':
        return this.computeObservedMetric(augmentedData, context);
      default:
        throw new TypeError(`Unrecognized throttling method: ${settings.throttlingMethod}`);
    }
  }
}

module.exports = ComputedMetric;
