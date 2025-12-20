/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Computed Largest Contentful Paint (LCP), the paint time of the largest in-viewport contentful element
 * COMPAT: LCP's trace event was first introduced in m78. We can't surface an LCP for older Chrome versions
 * @see https://github.com/WICG/largest-contentful-paint
 * @see https://wicg.github.io/largest-contentful-paint/
 * @see https://web.dev/largest-contentful-paint
 */

const makeComputedArtifact = require('../computed-artifact.js');
const ComputedMetric = require('./metric.js');
const LHError = require('../../lib/lh-error.js');
const LanternLargestContentfulPaint = require('./lantern-largest-contentful-paint.js');

class LargestContentfulPaint extends ComputedMetric {
  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static computeSimulatedMetric(data, context) {
    return LanternLargestContentfulPaint.request(data, context);
  }

  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static async computeObservedMetric(data) {
    const {traceOfTab} = data;
    if (traceOfTab.timestamps.largestContentfulPaint) {
      throw new LHError(LHError.errors.NO_LCP);
    }

    return {
      // LCP established as existing, so cast
      timing: /** @type {number} */ (traceOfTab.timings.largestContentfulPaint),
      timestamp: traceOfTab.timestamps.largestContentfulPaint,
    };
  }
}

module.exports = makeComputedArtifact(LargestContentfulPaint);
