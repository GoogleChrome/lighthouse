/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview
 * This gatherer remaps the result of the DevtoolsLog gatherer for compatibility with legacy Lighthouse
 * when devtools logs and traces were special-cased.
 */

import DevtoolsLogGatherer from './devtools-log.js';
import BaseGatherer from '../base-gatherer.js';

/** @implements {LH.Gatherer.GathererInstance<'DevtoolsLog'>} */
class DevtoolsLogCompat extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
    dependencies: {DevtoolsLog: DevtoolsLogGatherer.symbol},
  };

  /**
   * @param {LH.Gatherer.Context<'DevtoolsLog'>} passContext
   * @return {Promise<LH.Artifacts['devtoolsLogs']>}
   */
  async getArtifact(passContext) {
    return {
      defaultPass: passContext.dependencies.DevtoolsLog,
    };
  }
}

export default DevtoolsLogCompat;
