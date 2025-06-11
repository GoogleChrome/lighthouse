/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from './computed-artifact.js';
import LHTraceProcessor from '../lib/lh-trace-processor.js';

class ProcessedTrace {
  /**
    * @param {LH.Trace} trace
    * @return {Promise<LH.Artifacts.ProcessedTrace>}
   */
  static async compute_(trace) {
    return LHTraceProcessor.processTrace(trace);
  }
}

const ProcessedTraceComputed = makeComputedArtifact(ProcessedTrace, null);
export {ProcessedTraceComputed as ProcessedTrace};
