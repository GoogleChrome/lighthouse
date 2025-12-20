/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('../computed-artifact.js');
const MetricArtifact = require('./metric.js');
const LanternMaxPotentialFID = require('./lantern-max-potential-fid.js');
const LHError = require('../../lib/lh-error.js');
const TracingProcessor = require('../../lib/tracehouse/trace-processor.js');

class MaxPotentialFID extends MetricArtifact {
  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static computeSimulatedMetric(data, context) {
    return LanternMaxPotentialFID.request(data, context);
  }

  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static computeObservedMetric(data) {
    const {firstContentfulPaint} = data.traceOfTab.timings;
    if (!firstContentfulPaint) {
      throw new LHError(LHError.errors.NO_FCP);
    }

    const events = TracingProcessor.getMainThreadTopLevelEvents(
      data.traceOfTab,
      firstContentfulPaint
    ).filter(evt => evt.duration >= 1);

    return Promise.resolve({
      timing: Math.max(...events.map(evt => evt.duration), 16),
    });
  }
}

module.exports = makeComputedArtifact(MaxPotentialFID);
