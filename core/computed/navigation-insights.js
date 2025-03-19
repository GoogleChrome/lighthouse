/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from './computed-artifact.js';
import {ProcessedTrace} from './processed-trace.js';
import {TraceEngineResult} from './trace-engine-result.js';

/**
 * @fileoverview Gets insights from the shared trace engine for the navigation audited by Lighthouse.
 * Only usable in navigation mode.
 */
class NavigationInsights {
  /**
    * @param {{trace: LH.Trace, settings: LH.Audit.Context['settings'], SourceMaps: LH.Artifacts['SourceMaps']}} data
    * @param {LH.Artifacts.ComputedContext} context
   */
  static async compute_(data, context) {
    const {trace, settings, SourceMaps} = data;
    const processedTrace = await ProcessedTrace.request(trace, context);
    const traceEngineResult =
      await TraceEngineResult.request({trace, settings, SourceMaps}, context);

    const navigationId = processedTrace.timeOriginEvt.args.data?.navigationId;
    if (!navigationId) throw new Error('No navigationId found');

    const navInsights = traceEngineResult.insights.get(navigationId);
    if (!navInsights) throw new Error('No navigations insights found');

    return navInsights;
  }
}

const NavigationInsightsComputed =
  makeComputedArtifact(NavigationInsights, ['trace', 'settings', 'SourceMaps']);
export {NavigationInsightsComputed as NavigationInsights};
