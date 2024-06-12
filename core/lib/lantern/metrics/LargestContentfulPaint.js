/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lantern.js';

/** @typedef {import('../BaseNode.js').Node} Node */

class LargestContentfulPaint extends Lantern.Metric {
  /**
   * @return {Lantern.Simulation.MetricCoefficients}
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
    const isImage = node.request.resourceType === 'Image';
    const isLowPriority = node.request.priority === 'Low' || node.request.priority === 'VeryLow';
    return !isImage || !isLowPriority;
  }

  /**
   * @param {Node} dependencyGraph
   * @param {Lantern.Simulation.ProcessedNavigation} processedNavigation
   * @return {Node}
   */
  static getOptimisticGraph(dependencyGraph, processedNavigation) {
    const lcp = processedNavigation.timestamps.largestContentfulPaint;
    if (!lcp) {
      throw new Lantern.Error('NO_LCP');
    }

    return Lantern.Metrics.FirstContentfulPaint.getFirstPaintBasedGraph(dependencyGraph, {
      cutoffTimestamp: lcp,
      treatNodeAsRenderBlocking: LargestContentfulPaint.isNotLowPriorityImageNode,
    });
  }

  /**
   * @param {Node} dependencyGraph
   * @param {Lantern.Simulation.ProcessedNavigation} processedNavigation
   * @return {Node}
   */
  static getPessimisticGraph(dependencyGraph, processedNavigation) {
    const lcp = processedNavigation.timestamps.largestContentfulPaint;
    if (!lcp) {
      throw new Lantern.Error('NO_LCP');
    }

    return Lantern.Metrics.FirstContentfulPaint.getFirstPaintBasedGraph(dependencyGraph, {
      cutoffTimestamp: lcp,
      treatNodeAsRenderBlocking: _ => true,
      // For pessimistic LCP we'll include *all* layout nodes
      additionalCpuNodesToTreatAsRenderBlocking: node => node.didPerformLayout(),
    });
  }

  /**
   * @param {Lantern.Simulation.Result} simulationResult
   * @return {Lantern.Simulation.Result}
   */
  static getEstimateFromSimulation(simulationResult) {
    const nodeTimesNotOffscreenImages = Array.from(simulationResult.nodeTimings.entries())
      .filter(entry => LargestContentfulPaint.isNotLowPriorityImageNode(entry[0]))
      .map(entry => entry[1].endTime);

    return {
      timeInMs: Math.max(...nodeTimesNotOffscreenImages),
      nodeTimings: simulationResult.nodeTimings,
    };
  }

  /**
   * @param {Lantern.Simulation.MetricComputationDataInput} data
   * @param {Omit<import('../Metric.js').Extras, 'optimistic'>=} extras
   * @return {Promise<Lantern.Metrics.Result>}
   */
  static async compute(data, extras) {
    const fcpResult = extras?.fcpResult;
    if (!fcpResult) {
      throw new Error('FCP is required to calculate the LCP metric');
    }

    const metricResult = await super.compute(data, extras);
    metricResult.timing = Math.max(metricResult.timing, fcpResult.timing);
    return metricResult;
  }
}

export {LargestContentfulPaint};
