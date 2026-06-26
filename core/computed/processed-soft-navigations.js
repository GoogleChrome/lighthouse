/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from './computed-artifact.js';
import {ProcessedTrace} from './processed-trace.js';
import LHTraceProcessor from '../lib/lh-trace-processor.js';

class ProcessedSoftNavigations {
  /**
   * @param {LH.Trace} trace
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.ProcessedSoftNavigation[]>}
   */
  static async compute_(trace, context) {
    // TODO: consider implementing warnings for multiple navigations
    // Currently its expecting that but not really handling it
    const processedTrace = await ProcessedTrace.request(trace, context);
    return LHTraceProcessor.processSoftNavigations(processedTrace);
  }
}

const ProcessedSoftNavigationsComputed = makeComputedArtifact(ProcessedSoftNavigations, null);
export {ProcessedSoftNavigationsComputed as ProcessedSoftNavigations};
