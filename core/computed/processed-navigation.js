/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from './computed-artifact.js';
import {ProcessedTrace} from './processed-trace.js';
import LHTraceProcessor from '../lib/lh-trace-processor.js';

class ProcessedNavigation {
  /**
   * @param {LH.Trace | LH.Artifacts.ProcessedTrace} traceOrProcessedTrace
   * @return {traceOrProcessedTrace is LH.Artifacts.ProcessedTrace}
   */
  static isProcessedTrace(traceOrProcessedTrace) {
    return 'timeOriginEvt' in traceOrProcessedTrace;
  }

  /**
   * @param {LH.Trace | LH.Artifacts.ProcessedTrace} traceOrProcessedTrace
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.ProcessedNavigation>}
   */
  static async compute_(traceOrProcessedTrace, context) {
    // TODO: Remove this backport once pubads passes in a raw trace.
    if (this.isProcessedTrace(traceOrProcessedTrace)) {
      return LHTraceProcessor.processNavigation(traceOrProcessedTrace);
    }

    const processedTrace = await ProcessedTrace.request(traceOrProcessedTrace, context);
    return LHTraceProcessor.processNavigation(processedTrace);
  }
}

const ProcessedNavigationComputed = makeComputedArtifact(ProcessedNavigation, null);
export {ProcessedNavigationComputed as ProcessedNavigation};
