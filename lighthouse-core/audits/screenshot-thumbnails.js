/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const LHError = require('../lib/lh-error.js');
const jpeg = require('jpeg-js');
const Speedline = require('../computed/speedline.js');
const Interactive = require('../computed/metrics/interactive.js');

const NUMBER_OF_THUMBNAILS = 10;
const THUMBNAIL_WIDTH = 120;

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
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * Scales down an image to THUMBNAIL_WIDTH using nearest neighbor for speed, maintains aspect
   * ratio of the original thumbnail.
   *
   * @param {ReturnType<SpeedlineFrame['getParsedImage']>} imageData
   * @return {{width: number, height: number, data: Uint8Array}}
   */
  static scaleImageToThumbnail(imageData) {
    const scaledWidth = THUMBNAIL_WIDTH;
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
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    /** @type {Map<SpeedlineFrame, string>} */
    const cachedThumbnails = new Map();

    const speedline = await Speedline.request(trace, context);

    // Make the minimum time range 3s so sites that load super quickly don't get a single screenshot
    let minimumTimelineDuration = context.options.minimumTimelineDuration || 3000;
    // Ensure thumbnails cover the full range of the trace (TTI can be later than visually complete)
    if (context.settings.throttlingMethod !== 'simulate') {
      const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
      const metricComputationData = {trace, devtoolsLog, settings: context.settings};
      const tti = Interactive.request(metricComputationData, context);
      try {
        minimumTimelineDuration = Math.max((await tti).timing, minimumTimelineDuration);
      } catch (_) {}
    }

    const thumbnails = [];
    const analyzedFrames = speedline.frames.filter(frame => !frame.isProgressInterpolated());
    const maxFrameTime =
      speedline.complete ||
      Math.max(...speedline.frames.map(frame => frame.getTimeStamp() - speedline.beginning));
    const timelineEnd = Math.max(maxFrameTime, minimumTimelineDuration);

    if (!analyzedFrames.length || !Number.isFinite(timelineEnd)) {
      throw new LHError(LHError.errors.INVALID_SPEEDLINE);
    }

    for (let i = 1; i <= NUMBER_OF_THUMBNAILS; i++) {
      const targetTimestamp = speedline.beginning + timelineEnd * i / NUMBER_OF_THUMBNAILS;

      /** @type {SpeedlineFrame} */
      // @ts-ignore - there will always be at least one frame by this point. TODO: use nonnullable assertion in TS2.9
      let frameForTimestamp = null;
      if (i === NUMBER_OF_THUMBNAILS) {
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
        const imageData = frameForTimestamp.getParsedImage();
        const thumbnailImageData = ScreenshotThumbnails.scaleImageToThumbnail(imageData);
        base64Data = jpeg.encode(thumbnailImageData, 90).data.toString('base64');
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
}

module.exports = ScreenshotThumbnails;
