/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../types/lantern.js';
import {Metric} from '../metric.js';
// TODO(15841): don't use LighthouseError
import {LighthouseError} from '../../lh-error.js';
import {FirstContentfulPaint} from './first-contentful-paint.js';

/** @typedef {import('../base-node.js').Node} Node */

class FirstMeaningfulPaint extends Metric {
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
   * @param {Node} dependencyGraph
   * @param {LH.Artifacts.ProcessedNavigation} processedNavigation
   * @return {Node}
   */
  static getOptimisticGraph(dependencyGraph, processedNavigation) {
    const fmp = processedNavigation.timestamps.firstMeaningfulPaint;
    if (!fmp) {
      throw new LighthouseError(LighthouseError.errors.NO_FMP);
    }
    return FirstContentfulPaint.getFirstPaintBasedGraph(dependencyGraph, {
      cutoffTimestamp: fmp,
      // See FirstContentfulPaint's getOptimisticGraph implementation for a longer description
      // of why we exclude script initiated resources here.
      treatNodeAsRenderBlocking: node =>
        node.hasRenderBlockingPriority() && node.initiatorType !== 'script',
    });
  }

  /**
   * @param {Node} dependencyGraph
   * @param {LH.Artifacts.ProcessedNavigation} processedNavigation
   * @return {Node}
   */
  static getPessimisticGraph(dependencyGraph, processedNavigation) {
    const fmp = processedNavigation.timestamps.firstMeaningfulPaint;
    if (!fmp) {
      throw new LighthouseError(LighthouseError.errors.NO_FMP);
    }

    return FirstContentfulPaint.getFirstPaintBasedGraph(dependencyGraph, {
      cutoffTimestamp: fmp,
      treatNodeAsRenderBlocking: node => node.hasRenderBlockingPriority(),
      // For pessimistic FMP we'll include *all* layout nodes
      additionalCpuNodesToTreatAsRenderBlocking: node => node.didPerformLayout(),
    });
  }
}

export {FirstMeaningfulPaint};
