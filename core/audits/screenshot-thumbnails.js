/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jpeg from 'jpeg-js';

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
   * Scales down an image to THUMBNAIL_WIDTH using nearest neighbor for speed, maintains aspect
   * ratio of the original thumbnail.
   *
   * @param {ReturnType<SpeedlineFrame['getParsedImage']>} imageData
   * @param {number} scaledWidth
   * @return {{width: number, height: number, data: Uint8Array}}
   */
  static scaleImageToThumbnail(imageData, scaledWidth) {
    const scaleFactor = imageData.width / scaledWidth;
    const scaledHeight = Math.floor(imageData.height / scaleFactor);

    const outPixels = new Uint8Array(scaledWidth * scaledHeight * 4);

    for (let i = 0; i < scaledWidth; i++) {
      for (let j = 0; j < scaledHeight; j++) {
        const origX = Math.floor(i * scaleFactor);
        const origY = Math.floor(j * scaleFactor);

        const origPos = (origY * imageData.width + origX) * 4;
        const outPos = (j * scaledWidth + i) * 4;

        outPixels[outPos] = imageData.data[origPos];
        outPixels[outPos + 1] = imageData.data[origPos + 1];
        outPixels[outPos + 2] = imageData.data[origPos + 2];
        outPixels[outPos + 3] = imageData.data[origPos + 3];
      }
    }

    return {
      width: scaledWidth,
      height: scaledHeight,
      data: outPixels,
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
    const thumbnailWidth = context.options.thumbnailWidth || null;

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
      } else if (thumbnailWidth !== null) {
        const imageData = frameForTimestamp.getParsedImage();
        const thumbnailImageData =
          ScreenshotThumbnails.scaleImageToThumbnail(imageData, thumbnailWidth);
        base64Data = jpeg.encode(thumbnailImageData, 90).data.toString('base64');
        cachedThumbnails.set(frameForTimestamp, base64Data);
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
