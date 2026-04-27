/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Capture WebMCP support status
 */

import BaseGatherer from '../base-gatherer.js';

class WebMcpStatus extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['navigation', 'snapshot'],
  };

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Artifacts['WebMCPStatus']>}
   */
  async getArtifact(context) {
    const isSupported = await context.driver.executionContext.evaluate(
      // @ts-expect-error - modelContext is not in types
      () => typeof navigator.modelContext !== 'undefined',
      {args: [], useIsolation: true}
    );

    return {isSupported};
  }
}

export default WebMcpStatus;
