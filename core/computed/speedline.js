/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jpeg from 'jpeg-js';
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

      // Evict the ~1 MB per-frame decoded RGBA buffers cached inside speedline-core's
      // frame closures while preserving the public frame interface.
      speedline.frames = speedline.frames.map(frame => {
        const imgBuff = frame.getImage();
        const timeStamp = frame.getTimeStamp();
        const histogram = frame.isProgressInterpolated() ? null : frame.getHistogram();
        let progress = frame.getProgress();
        let isProgressInterpolated = frame.isProgressInterpolated();
        let perceptualProgress = frame.getPerceptualProgress();
        let isPerceptualProgressInterpolated = frame.isPerceptualProgressInterpolated();
        return {
          getHistogram: () => histogram ?? [],
          getTimeStamp: () => timeStamp,
          getImage: () => imgBuff,
          getParsedImage: () => jpeg.decode(imgBuff),
          getProgress: () => progress,
          isProgressInterpolated: () => isProgressInterpolated,
          getPerceptualProgress: () => perceptualProgress,
          isPerceptualProgressInterpolated: () => isPerceptualProgressInterpolated,
          setProgress(val, isInterpolated) {
            progress = val;
            isProgressInterpolated = Boolean(isInterpolated);
          },
          setPerceptualProgress(val, isInterpolated) {
            perceptualProgress = val;
            isPerceptualProgressInterpolated = Boolean(isInterpolated);
          },
        };
      });

      return speedline;
    });
  }
}

const SpeedlineComputed = makeComputedArtifact(Speedline, null);
export {SpeedlineComputed as Speedline};
