/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');

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

module.exports = makeComputedArtifact(Screenshots);
