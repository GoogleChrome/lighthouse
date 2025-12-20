/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');
const TraceOfTab = require('./trace-of-tab.js');

/** @typedef {{name: string, isMark: true, args: LH.TraceEvent['args'], startTime: number}} MarkEvent */
/** @typedef {{name: string, isMark: false, args: LH.TraceEvent['args'], startTime: number, endTime: number, duration: number}} MeasureEvent */

class UserTimings {
  /**
   * @param {LH.Trace} trace
   * @param {LH.Audit.Context} context
   * @return {Promise<Array<MarkEvent|MeasureEvent>>}
   */
  static async compute_(trace, context) {
    const traceOfTab = await TraceOfTab.request(trace, context);
    /** @type {Array<MarkEvent|MeasureEvent>} */
    const userTimings = [];
    /** @type {Record<string, number>} */
    const measuresStartTimes = {};

    // Get all blink.user_timing events
    // The event phases we are interested in are mark and instant events (R, i, I)
    // and duration events which correspond to measures (B, b, E, e).
    // @see https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview#
    traceOfTab.processEvents.filter(evt => {
      if (!evt.cat.includes('blink.user_timing')) {
        return false;
      }

      // reject these "userTiming" events that aren't really UserTiming, by nuking ones with frame data (or requestStart)
      // https://cs.chromium.org/search/?q=trace_event.*?user_timing&sq=package:chromium&type=cs
      return evt.name !== 'requestStart' &&
          evt.name !== 'navigationStart' &&
          evt.name !== 'paintNonDefaultBackgroundColor' &&
          evt.args.frame === undefined;
    })
    .forEach(ut => {
      // Mark events fall under phases R and I (or i)
      if (ut.ph === 'R' || ut.ph.toUpperCase() === 'I') {
        userTimings.push({
          name: ut.name,
          isMark: true,
          args: ut.args,
          startTime: ut.ts,
        });

      // Beginning of measure event, keep track of this events start time
      } else if (ut.ph.toLowerCase() === 'b') {
        measuresStartTimes[ut.name] = ut.ts;

      // End of measure event
      } else if (ut.ph.toLowerCase() === 'e') {
        userTimings.push({
          name: ut.name,
          isMark: false,
          args: ut.args,
          startTime: measuresStartTimes[ut.name],
          endTime: ut.ts,
          duration: ut.ts - measuresStartTimes[ut.name],
        });
      }
    });

    // baseline the timestamps against navStart, and translate to milliseconds
    userTimings.forEach(ut => {
      ut.startTime = (ut.startTime - traceOfTab.navigationStartEvt.ts) / 1000;
      if (!ut.isMark) {
        ut.endTime = (ut.endTime - traceOfTab.navigationStartEvt.ts) / 1000;
        ut.duration = ut.duration / 1000;
      }
    });

    return userTimings;
  }
}

module.exports = makeComputedArtifact(UserTimings);
