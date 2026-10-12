/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import {LighthouseError} from '../lib/lh-error.js';
import {Speedline} from '../computed/speedline.js';

const NUMBER_OF_THUMBNAILS = 8;

/** @typedef {LH.Artifacts.Speedline['frames'][0]} SpeedlineFrame */

class ScreenshotThumbnails extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'screenshot-thumbnails',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Screenshot Thumbnails',
      description: 'This is what the load of your site looked like.',
      requiredArtifacts: ['Trace', 'GatherContext'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async _audit(artifacts, context) {
    const trace = artifacts.Trace;
    /** @type {Map<SpeedlineFrame, string>} */
    const cachedThumbnails = new Map();

    const speedline = await Speedline.request(trace, context);

    // Make the minimum time range 3s so sites that load super quickly don't get a single screenshot
    const minimumTimelineDuration = context.options.minimumTimelineDuration || 3000;
    const numberOfThumbnails = context.options.numberOfThumbnails || NUMBER_OF_THUMBNAILS;

    const thumbnails = [];
    const analyzedFrames = speedline.frames.filter(frame => !frame.isProgressInterpolated());
    const maxFrameTime =
      speedline.complete ||
      Math.max(...speedline.frames.map(frame => frame.getTimeStamp() - speedline.beginning));
    const timelineEnd = Math.max(maxFrameTime, minimumTimelineDuration);

    if (!analyzedFrames.length || !Number.isFinite(timelineEnd)) {
      throw new LighthouseError(LighthouseError.errors.INVALID_SPEEDLINE);
    }

    for (let i = 1; i <= numberOfThumbnails; i++) {
      const targetTimestamp = speedline.beginning + timelineEnd * i / numberOfThumbnails;

      /** @type {SpeedlineFrame} */
      // @ts-expect-error - there will always be at least one frame by this point. TODO: use nonnullable assertion in TS2.9
      let frameForTimestamp = null;
      if (i === numberOfThumbnails) {
        frameForTimestamp = analyzedFrames[analyzedFrames.length - 1];
      } else {
        analyzedFrames.forEach(frame => {
          if (frame.getTimeStamp() <= targetTimestamp) {
            frameForTimestamp = frame;
          }
        });
      }

      let base64Data;
      const cachedThumbnail = cachedThumbnails.get(frameForTimestamp);
      if (cachedThumbnail) {
        base64Data = cachedThumbnail;
      } else {
        base64Data = frameForTimestamp.getImage().toString('base64');
        cachedThumbnails.set(frameForTimestamp, base64Data);
      }
      thumbnails.push({
        timing: Math.round(targetTimestamp - speedline.beginning),
        timestamp: targetTimestamp * 1000,
        data: `data:image/jpeg;base64,${base64Data}`,
      });
    }

    return {
      score: 1,
      details: {
        type: 'filmstrip',
        scale: timelineEnd,
        items: thumbnails,
      },
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    try {
      return await this._audit(artifacts, context);
    } catch (err) {
      const noFramesErrors = new Set([
        LighthouseError.errors.NO_SCREENSHOTS.code,
        LighthouseError.errors.SPEEDINDEX_OF_ZERO.code,
        LighthouseError.errors.NO_SPEEDLINE_FRAMES.code,
        LighthouseError.errors.INVALID_SPEEDLINE.code,
      ]);

      // If a timespan didn't happen to contain frames, that's fine. Just mark not applicable.
      if (noFramesErrors.has(err.code) && artifacts.GatherContext.gatherMode === 'timespan') {
        return {notApplicable: true, score: 1};
      }

      throw err;
    }
  }
}

export default ScreenshotThumbnails;
