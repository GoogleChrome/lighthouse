/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('../computed-artifact.js');
const LanternMetric = require('./lantern-metric.js');
const LHError = require('../../lib/lh-error.js');
const LanternFirstContentfulPaint = require('./lantern-first-contentful-paint.js');

/** @typedef {import('../../lib/dependency-graph/base-node.js').Node} Node */

class LanternLargestContentfulPaint extends LanternMetric {
  /**
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
   */
  static get COEFFICIENTS() {
    return {
      intercept: 0,
      optimistic: 0.5,
      pessimistic: 0.5,
    };
  }

  /**
   * Low priority image nodes are usually offscreen and very unlikely to be the
   * resource that is required for LCP. Our LCP graphs include everything except for these images.
   *
   * @param {Node} node
   * @return {boolean}
   */
  static isNotLowPriorityImageNode(node) {
    if (node.type !== 'network') return true;

    const isImage = node.record.resourceType === 'Image';
    const isLowPriority = node.record.priority === 'Low' || node.record.priority === 'VeryLow';
    return !isImage || !isLowPriority;
  }

  /**
   * @param {Node} dependencyGraph
   * @param {LH.Artifacts.TraceOfTab} traceOfTab
   * @return {Node}
   */
  static getOptimisticGraph(dependencyGraph, traceOfTab) {
    const lcp = traceOfTab.timestamps.largestContentfulPaint;
    if (!lcp) {
      throw new LHError(LHError.errors.NO_LCP);
    }

    return LanternFirstContentfulPaint.getFirstPaintBasedGraph(
      dependencyGraph,
      lcp,
      LanternLargestContentfulPaint.isNotLowPriorityImageNode
    );
  }

  /**
   * @param {Node} dependencyGraph
   * @param {LH.Artifacts.TraceOfTab} traceOfTab
   * @return {Node}
   */
  static getPessimisticGraph(dependencyGraph, traceOfTab) {
    const lcp = traceOfTab.timestamps.largestContentfulPaint;
    if (!lcp) {
      throw new LHError(LHError.errors.NO_LCP);
    }

    return LanternFirstContentfulPaint.getFirstPaintBasedGraph(
      dependencyGraph,
      lcp,
      _ => true,
      // For pessimistic LCP we'll include *all* layout nodes
      node => node.didPerformLayout()
    );
  }

  /**
   * @param {LH.Gatherer.Simulation.Result} simulationResult
   * @return {LH.Gatherer.Simulation.Result}
   */
  static getEstimateFromSimulation(simulationResult) {
    const nodeTimesNotOffscreenImages = Array.from(simulationResult.nodeTimings.entries())
      .filter(entry => LanternLargestContentfulPaint.isNotLowPriorityImageNode(entry[0]))
      .map(entry => entry[1].endTime);

    return {
      timeInMs: Math.max(...nodeTimesNotOffscreenImages),
      nodeTimings: simulationResult.nodeTimings,
    };
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static async compute_(data, context) {
    const fcpResult = await LanternFirstContentfulPaint.request(data, context);
    const metricResult = await this.computeMetricWithGraphs(data, context);
    metricResult.timing = Math.max(metricResult.timing, fcpResult.timing);
    return metricResult;
  }
}

module.exports = makeComputedArtifact(LanternLargestContentfulPaint);
