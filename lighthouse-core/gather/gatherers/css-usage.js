/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FRGatherer = require('../../fraggle-rock/gather/base-gatherer.js');

/**
 * @fileoverview Tracks unused CSS rules.
 */
class CSSUsage extends FRGatherer {
  constructor() {
    super();
    /** @type {Array<LH.Crdp.CSS.StyleSheetAddedEvent>} */
    this._stylesheets = [];
    /** @param {LH.Crdp.CSS.StyleSheetAddedEvent} sheet */
    this._onStylesheetAdded = sheet => this._stylesheets.push(sheet);
    /**
     * Initialize as undefined so we can assert results are fetched.
     * @type {LH.Crdp.CSS.RuleUsage[]|undefined}
     */
    this._ruleUsage = undefined;
  }

  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'timespan', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async startCSSUsageTracking(context) {
    const session = context.driver.defaultSession;
    session.on('CSS.styleSheetAdded', this._onStylesheetAdded);

    await session.sendCommand('DOM.enable');
    await session.sendCommand('CSS.enable');
    await session.sendCommand('CSS.startRuleUsageTracking');
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async startInstrumentation(context) {
    if (context.gatherMode !== 'timespan') return;
    await this.startCSSUsageTracking(context);
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async stopCSSUsageTracking(context) {
    const session = context.driver.defaultSession;
    const coverageResponse = await session.sendCommand('CSS.stopRuleUsageTracking');
    this._ruleUsage = coverageResponse.ruleUsage;
    session.off('CSS.styleSheetAdded', this._onStylesheetAdded);
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async stopInstrumentation(context) {
    if (context.gatherMode !== 'timespan') return;
    await this.stopCSSUsageTracking(context);
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   * @return {Promise<LH.Artifacts['CSSUsage']>}
   */
  async getArtifact(context) {
    const session = context.driver.defaultSession;
    const executionContext = context.driver.executionContext;

    // TODO(FR-COMPAT): Do this only for snapshot once legacy runner is deprecated.
    if (context.gatherMode !== 'timespan') {
      await this.startCSSUsageTracking(context);

      // Force style to recompute.
      // Doesn't appear to be necessary in newer versions of Chrome.
      await executionContext.evaluateAsync('getComputedStyle(document.body)');

      await this.stopCSSUsageTracking(context);
    }

    // Fetch style sheet content in parallel.
    const promises = this._stylesheets.map(sheet => {
      const styleSheetId = sheet.header.styleSheetId;
      return session.sendCommand('CSS.getStyleSheetText', {styleSheetId}).then(content => {
        return {
          header: sheet.header,
          content: content.text,
        };
      });
    });
    const styleSheetInfo = await Promise.all(promises);

    await session.sendCommand('CSS.disable');
    await session.sendCommand('DOM.disable');

    const dedupedStylesheets = new Map(styleSheetInfo.map(sheet => {
      return [sheet.content, sheet];
    }));

    if (!this._ruleUsage) throw new Error('Issue collecting rule usages');

    return {
      rules: this._ruleUsage,
      stylesheets: Array.from(dedupedStylesheets.values()),
    };
  }
}

module.exports = CSSUsage;
