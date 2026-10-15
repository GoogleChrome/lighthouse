/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import speedline from 'speedline-core';

import {makeComputedArtifact} from './computed-artifact.js';
import {LighthouseError} from '../lib/lh-error.js';
import {ProcessedTrace} from './processed-trace.js';

class Speedline {
  /**
   * @param {LH.Trace} trace
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.Speedline>}
   */
  static async compute_(trace, context) {
    // speedline() may throw without a promise, so we resolve immediately
    // to get in a promise chain.
    return ProcessedTrace.request(trace, context).then(processedTrace => {
      // Force use of timeOrigin as reference point for speedline
      // See https://github.com/GoogleChrome/lighthouse/issues/2095
      const timeOrigin = processedTrace.timestamps.timeOrigin;
      return speedline(trace.traceEvents, {
        timeOrigin,
        fastMode: true,
        include: 'speedIndex',
      });
    }).catch(err => {
      if (/No screenshots found in trace/.test(err.message)) {
        throw new LighthouseError(LighthouseError.errors.NO_SCREENSHOTS);
      }

      throw err;
    }).then(speedline => {
      if (speedline.frames.length === 0) {
        throw new LighthouseError(LighthouseError.errors.NO_SPEEDLINE_FRAMES);
      }

      if (speedline.speedIndex === 0) {
        throw new LighthouseError(LighthouseError.errors.SPEEDINDEX_OF_ZERO);
      }

      // Evict the ~1 MB per-frame decoded RGBA buffers and histograms cached inside
      // speedline-core's frame closures, keeping only the getters Lighthouse uses.
      // TODO(https://github.com/paulirish/speedline/issues/122): Upstream to speedline-core
      // so `frame()` in `lib/frame.js` does not cache `_parsedImage` on frame closures.
      const frames = speedline.frames.map(frame => {
        const imgBuff = frame.getImage();
        const timeStamp = frame.getTimeStamp();
        const isProgressInterpolated = frame.isProgressInterpolated();
        return {
          getImage: () => imgBuff,
          getTimeStamp: () => timeStamp,
          isProgressInterpolated: () => isProgressInterpolated,
        };
      });

      return {
        ...speedline,
        frames,
      };
    });
  }
}

const SpeedlineComputed = makeComputedArtifact(Speedline, null);
export {SpeedlineComputed as Speedline};
