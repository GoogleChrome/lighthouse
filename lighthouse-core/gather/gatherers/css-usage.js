/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');

/**
 * @fileoverview Tracks unused CSS rules.
 */
class CSSUsage extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['CSSUsage']>}
   */
  async afterPass(passContext) {
    const driver = passContext.driver;

    /** @type {Array<LH.Crdp.CSS.StyleSheetAddedEvent>} */
    const stylesheets = [];
    /** @param {LH.Crdp.CSS.StyleSheetAddedEvent} sheet */
    const onStylesheetAdded = sheet => stylesheets.push(sheet);
    driver.on('CSS.styleSheetAdded', onStylesheetAdded);

    await driver.sendCommand('DOM.enable');
    await driver.sendCommand('CSS.enable');
    await driver.sendCommand('CSS.startRuleUsageTracking');
    await driver.evaluateAsync('getComputedStyle(document.body)');
    driver.off('CSS.styleSheetAdded', onStylesheetAdded);

    // Fetch style sheet content in parallel.
    const promises = stylesheets.map(sheet => {
      const styleSheetId = sheet.header.styleSheetId;
      return driver.sendCommand('CSS.getStyleSheetText', {styleSheetId}).then(content => {
        return {
          header: sheet.header,
          content: content.text,
        };
      });
    });
    const styleSheetInfo = await Promise.all(promises);

    const ruleUsageResponse = await driver.sendCommand('CSS.stopRuleUsageTracking');
    await driver.sendCommand('CSS.disable');
    await driver.sendCommand('DOM.disable');

    const dedupedStylesheets = new Map(styleSheetInfo.map(sheet => {
      return /** @type {[string, LH.Artifacts.CSSStyleSheetInfo]} */ ([sheet.content, sheet]);
    }));
    return {
      rules: ruleUsageResponse.ruleUsage,
      stylesheets: Array.from(dedupedStylesheets.values()),
    };
  }
}

module.exports = CSSUsage;
