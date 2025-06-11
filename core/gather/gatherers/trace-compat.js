/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview
 * This gatherer remaps the result of the Trace gatherer for compatibility with legacy Lighthouse
 * when devtools logs and traces were special-cased.
 */

import TraceGatherer from './trace.js';
import BaseGatherer from '../base-gatherer.js';

/** @implements {LH.Gatherer.GathererInstance<'Trace'>} */
class TraceCompat extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'Trace'>} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
    dependencies: {Trace: TraceGatherer.symbol},
  };

  /**
   * @param {LH.Gatherer.Context<'Trace'>} passContext
   * @return {Promise<LH.Artifacts['traces']>}
   */
  async getArtifact(passContext) {
    return {
      defaultPass: passContext.dependencies.Trace,
    };
  }
}

export default TraceCompat;
