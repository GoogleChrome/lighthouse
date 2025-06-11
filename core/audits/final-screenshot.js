/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import {LighthouseError} from '../lib/lh-error.js';
import {ProcessedTrace} from '../computed/processed-trace.js';
import {Screenshots} from '../computed/screenshots.js';

class FinalScreenshot extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'final-screenshot',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Final Screenshot',
      description: 'The last screenshot captured of the pageload.',
      requiredArtifacts: ['Trace', 'GatherContext'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.Trace;
    const processedTrace = await ProcessedTrace.request(trace, context);
    const screenshots = await Screenshots.request(trace, context);
    const {timeOrigin} = processedTrace.timestamps;
    const finalScreenshot = screenshots[screenshots.length - 1];

    if (!finalScreenshot) {
      // If a timespan didn't happen to contain frames, that's fine. Just mark not applicable.
      if (artifacts.GatherContext.gatherMode === 'timespan') return {notApplicable: true, score: 1};

      // If it was another mode, that's a fatal error.
      throw new LighthouseError(LighthouseError.errors.NO_SCREENSHOTS);
    }

    return {
      score: 1,
      details: {
        type: 'screenshot',
        timing: Math.round((finalScreenshot.timestamp - timeOrigin) / 1000),
        timestamp: finalScreenshot.timestamp,
        data: finalScreenshot.datauri,
      },
    };
  }
}

export default FinalScreenshot;
