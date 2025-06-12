/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Tracks unused CSS rules.
 */

import BaseGatherer from '../base-gatherer.js';

class CSSUsage extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Artifacts['CSSUsage']>}
   */
  async getArtifact(context) {
    const session = context.driver.defaultSession;
    const executionContext = context.driver.executionContext;

    await session.sendCommand('DOM.enable');
    await session.sendCommand('CSS.enable');
    await session.sendCommand('CSS.startRuleUsageTracking');

    // Force style to recompute.
    // Doesn't appear to be necessary in newer versions of Chrome.
    await executionContext.evaluate(() => window.getComputedStyle(document.body), {
      args: [],
    });

    const {ruleUsage} = await session.sendCommand('CSS.stopRuleUsageTracking');
    await session.sendCommand('CSS.disable');
    await session.sendCommand('DOM.disable');

    return ruleUsage;
  }
}

export default CSSUsage;
