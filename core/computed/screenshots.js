/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from './computed-artifact.js';

const SCREENSHOT_TRACE_NAME = 'Screenshot';

class Screenshots {
  /**
   * @param {LH.Trace} trace
   * @return {Promise<Array<{timestamp: number, datauri: string}>>}
  */
  static async compute_(trace) {
    return trace.traceEvents
      .filter(evt => evt.name === SCREENSHOT_TRACE_NAME)
      .map(evt => {
        return {
          timestamp: evt.ts,
          datauri: `data:image/jpeg;base64,${evt.args.snapshot}`,
        };
      });
  }
}

const ScreenshotsComputed = makeComputedArtifact(Screenshots, null);
export {ScreenshotsComputed as Screenshots};
