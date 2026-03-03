/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';
import Trace from './trace.js';

class BaselineFeatureUsage extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'Trace'>} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
    dependencies: {Trace: Trace.symbol},
  };

  /**
   * @param {LH.Gatherer.Context<'Trace'>} context
   * @return {Promise<LH.Artifacts.BaselineFeatureUsage[]}
   */
  async getArtifact(context) {
    const trace = context.dependencies.Trace;
    const {traceEvents} = trace;

    /** @type {Array<LH.Artifacts.BaselineFeatureUsage>} */
    const features = [];

    // Filter for WebDXFeatureUsage events
    for (const event of traceEvents) {
      if (
        event.cat === 'blink.webdx_feature_usage' &&
        event.name === 'WebDXFeatureUsage' &&
        event.args?.feature
      ) {
        // @ts-expect-error - feature usage events have these props
        const {feature, url, lineNumber, columnNumber} = event.args;
        features.push({
          featureId: feature,
          location: {
            url: url || '',
            // Trace events are often 1-indexed for lines, but let's keep it raw for now
            // or normalize if we know for sure. The sample showed lineNumber: 1.
            line: lineNumber === -1 ? undefined : lineNumber,
            col: columnNumber === -1 ? undefined : columnNumber,
          },
        });
      }
    }

    return features;
  }
}

export default BaselineFeatureUsage;
